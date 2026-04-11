"""
bayesian_updater.py
-------------------
Complete Bayesian update layer for VisualDiagnose — Sorted Arrays.

Responsibilities:
  - Holds the update weight tables (disease + healthy)
  - Runs the Bayesian update + renormalisation after every answer
  - Drives the question loop with early-exit for ruled-out diseases
  - Formats the final output string

All four architectural fixes are applied:
  Fix 1 — renormalisation after every update       (bayesian_update)
  Fix 2 — no duplicate questions                   (handled in llm_questions.py,
                                                    consumed here via run_session)
  Fix 3 — inverted weights for healthy path        (get_likelihood)
  Fix 4 — early exit for ruled-out diseases        (run_session)

Relevance weight strategy — 2-tier deterministic:
  - Primary disease (the one the question is about) → full answer weight
  - All other diseases → fixed neutral/coasting weight
  - Healthy → inverted weight table
  This avoids relying on LLM-assigned relevance weights which can be
  wildly inconsistent. The Bayesian priors (from XGBoost) already encode
  the relative ranking — the per-question update just needs to discriminate
  the primary disease from the rest.
"""

from __future__ import annotations

import json
import textwrap
from typing import Callable


# ── supported disease labels ──────────────────────────────────────────────────

SUPPORTED_DISEASES = [
    "anaemia",
    "cyanosis",
    "diabetes",
    "hypothyroidism",
    "iron_deficiency",
    "jaundice",
    "liver_disease",
    "psoriasis",
    "healthy",
]

# ── update weight tables (compressed to prevent one-shot kills) ───────────────
#
# Old weights (0.40 / 0.00) were too extreme — a single "key_symptom" answer
# with skewed priors could rule out both other diseases instantly.
#
# New weights use a compressed range [0.08, 0.30] so:
#   - Max ratio between best and worst answer = 0.30/0.08 = 3.75×
#   - No answer ever zeros out a disease (floor = 0.08)
#   - Gradual convergence over 5–7 questions instead of 1–2

PRIMARY_WEIGHTS: dict[str, float] = {
    "key_symptom":      0.30,   # strong positive evidence for this disease
    "moderate_symptom": 0.22,   # moderate positive evidence
    "possible_reason":  0.15,   # weak / indirect evidence
    "not_relevant":     0.08,   # evidence AGAINST — but never zero
}

HEALTHY_WEIGHTS: dict[str, float] = {
    "key_symptom":      0.08,   # symptom confirmed → healthy very unlikely
    "moderate_symptom": 0.15,   # moderate symptom → slightly less healthy
    "possible_reason":  0.22,   # vague symptom → minor healthy penalty
    "not_relevant":     0.30,   # no symptom → supports healthy label
}

# Non-primary diseases get this constant weight regardless of answer.
# They "coast" while others are being tested. The Bayesian priors
# already rank them — we don't need the question to re-rank.
NON_PRIMARY_WEIGHT = 0.15

ANSWER_TYPES = list(PRIMARY_WEIGHTS.keys())   # canonical order for display

# Probability below this → disease is ruled out, skip remaining questions.
# Lowered from 0.08 to 0.05 to give diseases more chances to survive.
RULING_OUT_CUTOFF = 0.05

LOW_SEVERITY = {"None", "Low", "Mild"}


# ── weight selector ───────────────────────────────────────────────────────────

def get_primary_likelihood(answer_type: str) -> float:
    """
    Returns the likelihood multiplier for the PRIMARY disease given one answer.

    Parameters
    ----------
    answer_type : str
        One of: "key_symptom", "moderate_symptom", "possible_reason", "not_relevant"

    Returns
    -------
    float in [0.08, 0.30]
    """
    if answer_type not in PRIMARY_WEIGHTS:
        raise ValueError(
            f"Unknown answer_type '{answer_type}'. "
            f"Must be one of: {ANSWER_TYPES}"
        )
    return PRIMARY_WEIGHTS[answer_type]


def get_healthy_likelihood(answer_type: str) -> float:
    """
    Returns the likelihood multiplier for the HEALTHY label given one answer.
    Uses inverted weights — confirming symptoms decreases healthy probability.
    """
    if answer_type not in HEALTHY_WEIGHTS:
        raise ValueError(
            f"Unknown answer_type '{answer_type}'. "
            f"Must be one of: {ANSWER_TYPES}"
        )
    return HEALTHY_WEIGHTS[answer_type]


# ── core update function ──────────────────────────────────────────────────────

def bayesian_update(
    probs:       dict[str, float],
    likelihoods: dict[str, float],
) -> dict[str, float]:
    """
    Multiply each prior probability by its likelihood then renormalise.

    Fix 1: always renormalises so the returned values sum to 1.0.

    Parameters
    ----------
    probs : dict
        Current probability for each disease. Must sum to ~1.0.
    likelihoods : dict
        Per-disease likelihood multiplier for this answer.
        Keys must match probs keys exactly.

    Returns
    -------
    dict — updated and renormalised probabilities, always sums to 1.0.
    """
    if set(probs.keys()) != set(likelihoods.keys()):
        raise ValueError(
            "probs and likelihoods must have identical keys. "
            f"probs={set(probs)}, likelihoods={set(likelihoods)}"
        )

    updated = {d: probs[d] * likelihoods[d] for d in probs}
    total   = sum(updated.values())

    if total == 0.0:
        # All likelihoods were 0.0 — should never happen with compressed weights
        # Guard: return the unchanged priors rather than dividing by zero.
        return dict(probs)

    return {d: p / total for d, p in updated.items()}


# ── per-answer dispatcher (2-tier: primary vs coasting) ───────────────────────

def process_answer(
    probs:       dict[str, float],
    question:    dict,
    answer_type: str,
) -> dict[str, float]:
    """
    Given one answered question, build the 2-tier likelihood vector and
    return updated + renormalised probabilities.

    2-tier strategy:
      - Primary disease → full answer weight from PRIMARY_WEIGHTS
      - Non-primary diseases → fixed NON_PRIMARY_WEIGHT (coasting)
      - Healthy label → inverted weight from HEALTHY_WEIGHTS

    The `relevance_to` field in the question dict is intentionally IGNORED.
    All discrimination comes from the `primary_disease` field which the LLM
    assigns reliably (it's just a label, not a continuous value).

    Parameters
    ----------
    probs       : current probability dict
    question    : question object from LLM JSON
    answer_type : which MCQ option the user picked

    Returns
    -------
    Updated and renormalised probability dict.
    """
    primary = question["primary_disease"]
    primary_weight = get_primary_likelihood(answer_type)

    likelihoods: dict[str, float] = {}
    for disease in probs:
        if disease == "healthy":
            # Healthy always uses its own inverted logic
            likelihoods[disease] = get_healthy_likelihood(answer_type)
        elif disease == primary:
            # This question is ABOUT this disease — apply full weight
            likelihoods[disease] = primary_weight
        else:
            # This question is about a different disease — coast
            likelihoods[disease] = NON_PRIMARY_WEIGHT

    return bayesian_update(probs, likelihoods)


# ── main session runner ───────────────────────────────────────────────────────

def run_session(
    top3:             list[tuple[str, float]],
    questions:        list[dict],
    presenter:        Callable[[dict, int, int], str],
    verbose:          bool = True,
) -> dict[str, float]:
    """
    Drives the full question loop for one diagnostic session.

    Fix 2: duplicate-free questions are expected from llm_questions.py.
    Fix 4: diseases that fall below RULING_OUT_CUTOFF are skipped early.

    Parameters
    ----------
    top3 : list of (disease, probability) tuples from XGBoost
        e.g. [("anaemia", 0.72), ("diabetes", 0.43), ("jaundice", 0.31)]

    questions : list of question dicts from llm_questions.generate_questions()
        Expected: 9 dicts following the LLM JSON schema.

    presenter : callable(question_dict, question_number, total) -> answer_type str
        Your UI layer. Receives the question dict, displays it to the user,
        returns one of: "key_symptom" | "moderate_symptom" |
                        "possible_reason" | "not_relevant"

        For CLI testing use the built-in cli_presenter below.
        For FastAPI / frontend swap in your own function.

    verbose : bool
        Print probability table after each answer if True.

    Returns
    -------
    Final renormalised probability dict after all questions.
    """
    # Initialise priors from XGBoost output
    # Renormalise immediately in case XGBoost probabilities don't sum to 1.0
    raw_total = sum(p for _, p in top3)
    probs: dict[str, float] = {
        d: p / raw_total for d, p in top3
    }

    active_diseases: set[str] = set(probs.keys())
    total_q = sum(
        1 for q in questions
        if q["primary_disease"] in active_diseases
    )
    asked = 0

    if verbose:
        _print_prob_table(probs, label="Initial probabilities (from XGBoost)")

    for question in questions:
        # Fix 4: skip questions whose primary disease has been ruled out
        if question["primary_disease"] not in active_diseases:
            if verbose:
                print(
                    f"  [skip] '{question['question'][:60]}...' "
                    f"— {question['primary_disease']} already ruled out"
                )
            continue

        asked += 1
        answer_type = presenter(question, asked, total_q)

        if answer_type not in ANSWER_TYPES:
            print(f"  [warn] Unknown answer '{answer_type}', treating as not_relevant")
            answer_type = "not_relevant"

        # Fix 1 + Fix 3: update with renormalisation + healthy-aware weights
        probs = process_answer(probs, question, answer_type)

        if verbose:
            _print_prob_table(
                probs,
                label=f"After Q{asked}: \"{question['question'][:55]}...\""
            )

        # Fix 4: rule out diseases that have dropped below the cutoff
        newly_ruled = {d for d, p in probs.items() if p < RULING_OUT_CUTOFF}
        for d in newly_ruled:
            if d in active_diseases:
                active_diseases.discard(d)
                if verbose:
                    print(f"  [ruled out] {d} dropped below {RULING_OUT_CUTOFF:.0%} threshold\n")

        # If only one disease remains there is nothing left to discriminate
        if len(active_diseases) <= 1:
            if verbose:
                print("  [early exit] Only one disease remains active.\n")
            break

    return probs


# ── medical knowledge base ──────────────────────────────────────────────────

_DISEASE_KB = {
    "anaemia": {
        "severity": "Moderate",
        "precautions": ["Include iron-rich foods in diet (spinach, red meat, lentils)", "Avoid drinking tea/coffee with meals (inhibits iron absorption)"],
        "medications": ["Iron supplements (Consult Doctor)", "Vitamin C (helps iron absorption)"],
        "escalation_flags": ["Severe fatigue", "Shortness of breath on mild exertion", "Chest pain or rapid heartbeat"],
        "see_doctor_flag": True
    },
    "cyanosis": {
        "severity": "High/Emergency",
        "precautions": ["Keep warm", "Avoid smoking or passive smoke", "Do not ignore symptoms"],
        "medications": ["Oxygen therapy (Medical administration only)", "Treatment of underlying cause"],
        "escalation_flags": ["Difficulty breathing", "Sudden onset of blue lips/face", "Chest pain or confusion"],
        "see_doctor_flag": True
    },
    "diabetes": {
        "severity": "Moderate to High",
        "precautions": ["Monitor blood sugar levels", "Maintain a balanced, low-sugar diet", "Exercise regularly"],
        "medications": ["Insulin (if prescribed)", "Metformin or other antidiabetic drugs (Consult Doctor)"],
        "escalation_flags": ["Fruity breath odor", "Extreme thirst or frequent urination", "Confusion or fainting"],
        "see_doctor_flag": True
    },
    "hypothyroidism": {
        "severity": "Moderate",
        "precautions": ["Maintain a balanced diet with adequate iodine", "Get regular exercise to boost metabolism"],
        "medications": ["Levothyroxine (Prescription only)"],
        "escalation_flags": ["Extreme cold intolerance", "Severe depression", "Unexplained weight gain despite diet control"],
        "see_doctor_flag": True
    },
    "iron_deficiency": {
        "severity": "Mild to Moderate",
        "precautions": ["Eat iron-fortified cereals", "Cook with cast-iron pots", "Consume Vitamin C with iron sources"],
        "medications": ["Iron pills (Ferrous sulfate) (Consult Doctor)"],
        "escalation_flags": ["Fainting spells", "Craving non-food items (pica)", "Heart palpitations"],
        "see_doctor_flag": True
    },
    "jaundice": {
        "severity": "High",
        "precautions": ["Avoid alcohol completely", "Drink plenty of water", "Avoid fatty or processed foods"],
        "medications": ["Depends entirely on underlying cause (Hepatitis, gallstones, etc. - Consult Doctor)"],
        "escalation_flags": ["Severe abdominal pain", "Vomiting blood", "High fever or confusion"],
        "see_doctor_flag": True
    },
    "liver_disease": {
        "severity": "High",
        "precautions": ["Stop alcohol consumption", "Maintain a low-sodium diet", "Avoid unprescribed supplements"],
        "medications": ["Diuretics (if prescribed)", "Specific liver disease meds (Consult Doctor)"],
        "escalation_flags": ["Yellowing of eyes/skin", "Swollen abdomen or legs", "Dark urine or pale stools"],
        "see_doctor_flag": True
    },
    "psoriasis": {
        "severity": "Mild to Moderate",
        "precautions": ["Use heavy moisturizers", "Avoid harsh soaps and hot showers", "Manage stress triggers"],
        "medications": ["Topical corticosteroids", "Salicylic acid treatments", "Emollients"],
        "escalation_flags": ["Joint pain (Psoriatic arthritis)", "Signs of skin infection (pus, extreme redness)", "Widespread flare-ups"],
        "see_doctor_flag": True
    },
    "healthy": {
        "severity": "None",
        "precautions": ["Maintain a balanced diet", "Exercise regularly", "Stay hydrated"],
        "medications": ["None required"],
        "escalation_flags": ["If you develop any sudden or concerning symptoms, consult a doctor."],
        "see_doctor_flag": False
    }
}

# Tier upgrade threshold — same value everywhere
_HIGH_CONF   = 0.65   # posterior ≥ this → upper tier
_LOW_CONF    = 0.65   # same threshold, so the rule is symmetric

def _resolve_severity(kb_severity: str, top_prob: float) -> str:
    """Collapse compound severity strings using posterior confidence.
    
    Threshold: 0.65 uniformly — upper tier if confident, lower tier if not.
    Rationale: with 3 diseases and compressed Bayesian weights, a posterior
    above 0.65 represents a decisive winner. Below it, the diagnosis is
    still uncertain enough to report the safer (lower) tier.
    """
    if kb_severity == "Mild to Moderate":
        return "Moderate" if top_prob >= 0.65 else "Mild"
    if kb_severity == "Moderate to High":
        return "High"     if top_prob >= 0.65 else "Moderate"
    if kb_severity == "High/Emergency":
        return "Emergency" if top_prob >= 0.65 else "High"
    return kb_severity


def format_output(probs: dict[str, float]) -> dict:
    """
    Produces the final diagnosis structured report as requested by the UI.

    Returns
    -------
    dict with keys:
        - final_report: str (The formatted text report of probabilities)
        - severity: str
        - precautions: list[str]
        - medications: list[str]
        - escalation_flags: list[str]
        - see_doctor_flag: bool
    """
    DISPLAY_NAMES = {
        "anaemia":          "Anaemia",
        "cyanosis":         "Cyanosis",
        "diabetes":         "Diabetes",
        "hypothyroidism":   "Hypothyroidism",
        "iron_deficiency":  "Iron deficiency",
        "jaundice":         "Jaundice",
        "liver_disease":    "Liver disease",
        "psoriasis":        "Psoriasis",
        "healthy":          "Healthy",
    }

    ranked = sorted(probs.items(), key=lambda x: x[1], reverse=True)
    top_disease, top_prob = ranked[0]
    top_name = DISPLAY_NAMES.get(top_disease, top_disease.replace("_", " ").title())

    if top_disease == "healthy":
        headline = f"You appear to be healthy — {top_prob:.0%}"
        sub = "Your visual indicators and responses show no strong signs of the screened conditions."
    else:
        headline = f"{top_name} — {top_prob:.0%}"
        sub = ""

    others = []
    for d, p in ranked[1:]:
        name  = DISPLAY_NAMES.get(d, d.replace("_", " ").title())
        flag  = "  (low confidence)" if p < RULING_OUT_CUTOFF else ""
        others.append(f"    {name:<20} —  {p:.0%}{flag}")

    lines = [
        "",
        "Based on your scan and responses, the most likely condition is:",
        "",
        f"    {headline}",
    ]
    if sub:
        lines.append(f"    {sub}")
    if others:
        lines += ["", "Other considerations:"] + others
    lines += [
        "",
        "Note: This is a screening tool only. Please consult a medical",
        "professional for a confirmed diagnosis.",
        "",
    ]
    
    final_report = "\n".join(lines)
    kb_info = _DISEASE_KB.get(top_disease, _DISEASE_KB["healthy"])
    resolved_severity = _resolve_severity(kb_info["severity"], top_prob)
    see_doctor = resolved_severity not in LOW_SEVERITY 
    
    return {
        "final_report": final_report,
        "severity": resolved_severity,
        "precautions": kb_info["precautions"],
        "medications": kb_info["medications"],
        "escalation_flags": kb_info["escalation_flags"],
        "see_doctor_flag": see_doctor
    }


# ── built-in CLI presenter (for testing without a UI) ─────────────────────────

def cli_presenter(question: dict, q_num: int, total: int) -> str:
    """
    Prints the question + 4 MCQ options to the terminal and reads user input.
    Swap this out for your FastAPI endpoint / frontend handler in production.
    """
    print(f"\n── Question {q_num}/{total} ──────────────────────────────")
    print(f"  {question['question']}\n")

    options = {
        "1": "key_symptom",
        "2": "moderate_symptom",
        "3": "possible_reason",
        "4": "not_relevant",
    }
    labels = {
        "key_symptom":      "Key symptom / strong yes",
        "moderate_symptom": "Moderate symptom",
        "possible_reason":  "Possible / indirect reason",
        "not_relevant":     "Not relevant / no",
    }
    answer_data = question["answers"]
    for key, answer_type in options.items():
        text = answer_data[answer_type]["text"]
        print(f"  [{key}] {text}")
        print(f"       ({labels[answer_type]})")

    while True:
        choice = input("\n  Enter 1 / 2 / 3 / 4: ").strip()
        if choice in options:
            return options[choice]
        print("  Please enter 1, 2, 3, or 4.")


# ── probability table printer ─────────────────────────────────────────────────

def _print_prob_table(probs: dict[str, float], label: str = "") -> None:
    if label:
        print(f"\n  {label}")
    print(f"  {'Disease':<22} {'Probability':>12}  {'Bar'}")
    print(f"  {'─'*22}  {'─'*11}  {'─'*20}")
    for d, p in sorted(probs.items(), key=lambda x: x[1], reverse=True):
        bar   = "█" * int(p * 20)
        flag  = " ← ruled out" if p < RULING_OUT_CUTOFF else ""
        print(f"  {d:<22} {p:>11.1%}  {bar}{flag}")
    print()


# ── entry point for quick CLI testing ────────────────────────────────────────

if __name__ == "__main__":
    import sys

    # ── mock data — replace with real XGBoost output and LLM questions ────────
    mock_top3 = [
        ("anaemia",          0.72),
        ("iron_deficiency",  0.43),
        ("diabetes",         0.31),
    ]

    mock_questions = [
        {
            "question": "Do you often feel unusually tired even after a full night's sleep?",
            "primary_disease": "anaemia",
            "answers": {
                "key_symptom":      {"text": "Yes, constantly fatigued",          "weight": 0.30},
                "moderate_symptom": {"text": "Sometimes, a few times a week",     "weight": 0.22},
                "possible_reason":  {"text": "Occasionally, but rarely",          "weight": 0.15},
                "not_relevant":     {"text": "No, my energy levels are normal",   "weight": 0.08},
            },
        },
        {
            "question": "Have you noticed increased thirst or frequent urination recently?",
            "primary_disease": "diabetes",
            "answers": {
                "key_symptom":      {"text": "Yes, both significantly",           "weight": 0.30},
                "moderate_symptom": {"text": "Mild increase in thirst only",      "weight": 0.22},
                "possible_reason":  {"text": "Occasionally drink more water",     "weight": 0.15},
                "not_relevant":     {"text": "No change at all",                  "weight": 0.08},
            },
        },
        {
            "question": "Do you crave or chew ice, dirt, or other non-food items?",
            "primary_disease": "iron_deficiency",
            "answers": {
                "key_symptom":      {"text": "Yes, frequently crave ice/non-food", "weight": 0.30},
                "moderate_symptom": {"text": "Sometimes crave ice",                "weight": 0.22},
                "possible_reason":  {"text": "Rarely, maybe once or twice",        "weight": 0.15},
                "not_relevant":     {"text": "Never experienced this",             "weight": 0.08},
            },
        },
    ]

    print("\n" + "═" * 54)
    print("  VisualDiagnose — Bayesian Updater (CLI test mode)")
    print("═" * 54)
    print("  Using mock top-3 from XGBoost and 3 sample questions.")
    print("  In production pass real top3 + LLM-generated questions.\n")

    final_probs = run_session(
        top3      = mock_top3,
        questions = mock_questions,
        presenter = cli_presenter,
        verbose   = True,
    )

    print("═" * 54)
    output_dict = format_output(final_probs)
    print(json.dumps(output_dict, indent=2))
    print("═" * 54)