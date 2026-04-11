"""
llm_questions.py
----------------
LLM-powered question generation for VisualDiagnose — Sorted Arrays.

Generates 9 deduplicated diagnostic questions (3 per disease) in a single
LLM API call. Output is a list of question dicts that plug directly into
BayesianUpdater.run_session().

Supports:
  - Google Gemini (default)
  - OpenAI GPT-4o / GPT-4o-mini
  - Offline fallback (hardcoded question bank for all 9 diseases)

Usage
-----
    from llm_questions import generate_questions

    questions = generate_questions(
        top3=[("anaemia", 0.72), ("diabetes", 0.43), ("jaundice", 0.31)],
        provider="gemini",          # or "openai" or "offline"
        api_key="your-key-here",
    )

    # questions is a list[dict] ready for BayesianUpdater.run_session()
"""

from __future__ import annotations

import json
import os
import re
import textwrap
from typing import Optional


# ── supported diseases (must match BayesianUpdater.SUPPORTED_DISEASES) ────────

SUPPORTED_DISEASES = [
    "anaemia", "cyanosis", "diabetes", "hypothyroidism",
    "iron_deficiency", "jaundice", "liver_disease", "psoriasis", "healthy",
]

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


# ── prompt template ──────────────────────────────────────────────────────────

_SYSTEM_PROMPT = textwrap.dedent("""\
    You are a medical screening assistant for a visual diagnostic tool.
    You generate symptom-check questions to help narrow down a differential
    diagnosis. Your tone is professional, clear, and compassionate.

    RULES:
    1. Generate EXACTLY 3 questions per disease (9 total).
    2. Each question must target ONE primary disease.
    3. NO symptom may appear in more than one question — enforce uniqueness.
    4. Each question has 4 answer options corresponding to these severity levels:
       - key_symptom:      Strong "yes" — the patient clearly has this symptom
       - moderate_symptom: Moderate — sometimes or partially present
       - possible_reason:  Weak / indirect — rarely or vaguely present
       - not_relevant:     "No" — the patient does not have this symptom
    5. Use simple, patient-friendly language (no jargon).
    6. Frame questions as yes/no symptom checks, NOT as medical knowledge tests.
    7. For the "healthy" label, frame questions as symptom ABSENCE checks.
""")


def _build_user_prompt(top3: list[tuple[str, float]]) -> str:
    """Build the user-facing prompt with the top 3 diseases."""

    disease_list = "\n".join(
        f"  {i+1}. {DISPLAY_NAMES.get(d, d)} (label: \"{d}\", probability: {p:.0%})"
        for i, (d, p) in enumerate(top3)
    )

    return textwrap.dedent(f"""\
        The patient's top 3 suspected conditions from image analysis are:

        {disease_list}

        Generate exactly 9 symptom-check questions (3 per disease).
        Return ONLY a JSON array with this exact schema — no markdown, no explanation:

        [
          {{
            "question": "Do you often feel unusually tired even after a full night's sleep?",
            "primary_disease": "anaemia",
            "answers": {{
              "key_symptom":      {{"text": "Yes, constantly fatigued"}},
              "moderate_symptom": {{"text": "Sometimes, a few times a week"}},
              "possible_reason":  {{"text": "Occasionally, but rarely"}},
              "not_relevant":     {{"text": "No, my energy levels are normal"}}
            }}
          }},
          ... (8 more)
        ]

        IMPORTANT:
        - Each disease must get EXACTLY 3 questions.
        - The "primary_disease" field must use the exact label string shown above.
        - No two questions should ask about the same symptom.
        - Answer texts should be natural and specific to the question.
    """)


# ── LLM API callers ──────────────────────────────────────────────────────────

def _call_gemini(
    system_prompt: str,
    user_prompt: str,
    api_key: str,
    model: str = "gemini-2.0-flash",
) -> str:
    """Call Google Gemini API and return the raw text response."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError(
            "google-generativeai is required for Gemini provider.\n"
            "Install: pip install google-generativeai"
        )

    genai.configure(api_key=api_key)
    llm = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt,
    )

    response = llm.generate_content(
        user_prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,         # low temp for consistent JSON
            max_output_tokens=4096,
        ),
    )
    return response.text


def _call_openai(
    system_prompt: str,
    user_prompt: str,
    api_key: str,
    model: str = "gpt-4o-mini",
) -> str:
    """Call OpenAI API and return the raw text response."""
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError(
            "openai is required for OpenAI provider.\n"
            "Install: pip install openai"
        )

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        temperature=0.3,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
    )
    return response.choices[0].message.content


# ── JSON parsing with recovery ───────────────────────────────────────────────

def _extract_json_from_response(raw: str) -> list[dict]:
    """
    Parse the LLM response into a list of question dicts.
    Handles common LLM quirks: markdown fences, trailing commas, prose.
    """
    text = raw.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
        text = text.strip()

    # Try direct parse first
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    # Try to find a JSON array in the text
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

    # Last resort: try fixing trailing commas
    if match:
        fixed = re.sub(r",\s*([}\]])", r"\1", match.group())
        try:
            parsed = json.loads(fixed)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Failed to parse LLM response as JSON array.\n"
        f"Raw response (first 500 chars):\n{raw[:500]}"
    )


# ── validation ────────────────────────────────────────────────────────────────

_REQUIRED_ANSWER_KEYS = {"key_symptom", "moderate_symptom", "possible_reason", "not_relevant"}


def _validate_questions(
    questions: list[dict],
    top3: list[tuple[str, float]],
) -> list[dict]:
    """
    Validate and sanitise the LLM-generated questions.
    Raises ValueError if the output is fundamentally broken.
    Returns the cleaned list.
    """
    valid_diseases = {d for d, _ in top3}

    validated = []
    for i, q in enumerate(questions):
        # Must have required fields
        if "question" not in q or "primary_disease" not in q or "answers" not in q:
            print(f"  [warn] Question {i} missing required fields, skipping")
            continue

        # primary_disease must be one of the top 3
        if q["primary_disease"] not in valid_diseases:
            print(
                f"  [warn] Question {i} targets '{q['primary_disease']}' "
                f"which is not in top 3 {valid_diseases}, skipping"
            )
            continue

        # answers must have all 4 keys
        if not isinstance(q["answers"], dict):
            print(f"  [warn] Question {i} 'answers' is not a dict, skipping")
            continue

        missing = _REQUIRED_ANSWER_KEYS - set(q["answers"].keys())
        if missing:
            print(f"  [warn] Question {i} missing answer keys {missing}, skipping")
            continue

        # Ensure each answer has a "text" field
        for key in _REQUIRED_ANSWER_KEYS:
            ans = q["answers"][key]
            if isinstance(ans, str):
                # LLM returned a plain string instead of {"text": "..."}
                q["answers"][key] = {"text": ans}
            elif isinstance(ans, dict) and "text" not in ans:
                q["answers"][key] = {"text": str(ans)}

        validated.append(q)

    if len(validated) < 3:
        raise ValueError(
            f"Only {len(validated)} valid questions after validation. "
            f"Need at least 3. LLM output was likely malformed."
        )

    return validated


# ── offline fallback question bank ────────────────────────────────────────────

_FALLBACK_QUESTIONS: dict[str, list[dict]] = {
    "anaemia": [
        {
            "question": "Do you often feel unusually tired even after a full night's sleep?",
            "primary_disease": "anaemia",
            "answers": {
                "key_symptom":      {"text": "Yes, I'm constantly exhausted"},
                "moderate_symptom": {"text": "Sometimes, a few times a week"},
                "possible_reason":  {"text": "Occasionally, but it's rare"},
                "not_relevant":     {"text": "No, my energy levels are normal"},
            },
        },
        {
            "question": "Have you noticed your skin looking unusually pale recently?",
            "primary_disease": "anaemia",
            "answers": {
                "key_symptom":      {"text": "Yes, noticeably paler than usual"},
                "moderate_symptom": {"text": "Slightly paler in some areas"},
                "possible_reason":  {"text": "Maybe, I'm not sure"},
                "not_relevant":     {"text": "No, my skin colour is normal"},
            },
        },
        {
            "question": "Do you experience dizziness or lightheadedness when standing up?",
            "primary_disease": "anaemia",
            "answers": {
                "key_symptom":      {"text": "Yes, frequently when I stand"},
                "moderate_symptom": {"text": "Sometimes, especially if I stand quickly"},
                "possible_reason":  {"text": "Rarely, only once or twice"},
                "not_relevant":     {"text": "No, never experience this"},
            },
        },
    ],
    "cyanosis": [
        {
            "question": "Have you noticed a bluish tint to your lips or fingertips?",
            "primary_disease": "cyanosis",
            "answers": {
                "key_symptom":      {"text": "Yes, clearly bluish or purplish"},
                "moderate_symptom": {"text": "Slight discolouration at times"},
                "possible_reason":  {"text": "Only in cold weather"},
                "not_relevant":     {"text": "No, they look normal"},
            },
        },
        {
            "question": "Do you experience shortness of breath during daily activities?",
            "primary_disease": "cyanosis",
            "answers": {
                "key_symptom":      {"text": "Yes, even during light activity"},
                "moderate_symptom": {"text": "Sometimes with moderate exertion"},
                "possible_reason":  {"text": "Only during heavy exercise"},
                "not_relevant":     {"text": "No breathing difficulties"},
            },
        },
        {
            "question": "Do your hands or feet feel cold even in warm environments?",
            "primary_disease": "cyanosis",
            "answers": {
                "key_symptom":      {"text": "Yes, always cold extremities"},
                "moderate_symptom": {"text": "Often cold, but not always"},
                "possible_reason":  {"text": "Only occasionally"},
                "not_relevant":     {"text": "No, they stay warm"},
            },
        },
    ],
    "diabetes": [
        {
            "question": "Have you noticed increased thirst or frequent urination recently?",
            "primary_disease": "diabetes",
            "answers": {
                "key_symptom":      {"text": "Yes, both significantly increased"},
                "moderate_symptom": {"text": "Mild increase in thirst only"},
                "possible_reason":  {"text": "Occasionally drink more water"},
                "not_relevant":     {"text": "No change at all"},
            },
        },
        {
            "question": "Have you experienced unexplained weight loss in the past few months?",
            "primary_disease": "diabetes",
            "answers": {
                "key_symptom":      {"text": "Yes, noticeable weight loss without trying"},
                "moderate_symptom": {"text": "Some weight loss, maybe a few pounds"},
                "possible_reason":  {"text": "Not sure, haven't been tracking"},
                "not_relevant":     {"text": "No, my weight has been stable"},
            },
        },
        {
            "question": "Do cuts or wounds take longer than usual to heal?",
            "primary_disease": "diabetes",
            "answers": {
                "key_symptom":      {"text": "Yes, noticeably slower healing"},
                "moderate_symptom": {"text": "Sometimes seems slower"},
                "possible_reason":  {"text": "Maybe, hard to tell"},
                "not_relevant":     {"text": "No, wounds heal normally"},
            },
        },
    ],
    "hypothyroidism": [
        {
            "question": "Have you been feeling more sensitive to cold temperatures than usual?",
            "primary_disease": "hypothyroidism",
            "answers": {
                "key_symptom":      {"text": "Yes, I'm constantly cold"},
                "moderate_symptom": {"text": "More than before, but manageable"},
                "possible_reason":  {"text": "Slightly, not very noticeable"},
                "not_relevant":     {"text": "No, my temperature tolerance is normal"},
            },
        },
        {
            "question": "Have you noticed your hair becoming thinner or falling out more?",
            "primary_disease": "hypothyroidism",
            "answers": {
                "key_symptom":      {"text": "Yes, significant hair thinning or loss"},
                "moderate_symptom": {"text": "Some extra hair fall lately"},
                "possible_reason":  {"text": "Maybe a little, not sure"},
                "not_relevant":     {"text": "No, my hair is normal"},
            },
        },
        {
            "question": "Do you feel mentally foggy or have difficulty concentrating?",
            "primary_disease": "hypothyroidism",
            "answers": {
                "key_symptom":      {"text": "Yes, frequent brain fog and poor focus"},
                "moderate_symptom": {"text": "Sometimes hard to concentrate"},
                "possible_reason":  {"text": "Only when I'm very tired"},
                "not_relevant":     {"text": "No, I feel mentally sharp"},
            },
        },
    ],
    "iron_deficiency": [
        {
            "question": "Do you crave or chew ice, dirt, or other non-food items?",
            "primary_disease": "iron_deficiency",
            "answers": {
                "key_symptom":      {"text": "Yes, frequently crave ice or non-food items"},
                "moderate_symptom": {"text": "Sometimes crave ice"},
                "possible_reason":  {"text": "Rarely, maybe once or twice"},
                "not_relevant":     {"text": "Never experienced this"},
            },
        },
        {
            "question": "Do you get headaches frequently, especially during physical activity?",
            "primary_disease": "iron_deficiency",
            "answers": {
                "key_symptom":      {"text": "Yes, frequent headaches with activity"},
                "moderate_symptom": {"text": "Occasional headaches"},
                "possible_reason":  {"text": "Rarely, only with intense exercise"},
                "not_relevant":     {"text": "No frequent headaches"},
            },
        },
        {
            "question": "Have you noticed your nails becoming brittle, spoon-shaped, or ridged?",
            "primary_disease": "iron_deficiency",
            "answers": {
                "key_symptom":      {"text": "Yes, clearly misshapen or very brittle"},
                "moderate_symptom": {"text": "Some brittleness or ridging"},
                "possible_reason":  {"text": "Slightly more brittle than usual"},
                "not_relevant":     {"text": "No, my nails are normal"},
            },
        },
    ],
    "jaundice": [
        {
            "question": "Have you noticed a yellowish tint to your skin or the whites of your eyes?",
            "primary_disease": "jaundice",
            "answers": {
                "key_symptom":      {"text": "Yes, clearly yellow skin or eyes"},
                "moderate_symptom": {"text": "Slight yellowish tinge"},
                "possible_reason":  {"text": "Others have mentioned it, but I'm unsure"},
                "not_relevant":     {"text": "No yellow discolouration"},
            },
        },
        {
            "question": "Have you noticed unusually dark urine or pale-coloured stools?",
            "primary_disease": "jaundice",
            "answers": {
                "key_symptom":      {"text": "Yes, both dark urine and pale stools"},
                "moderate_symptom": {"text": "Darker urine than usual"},
                "possible_reason":  {"text": "Maybe slightly, not sure"},
                "not_relevant":     {"text": "No, both are normal"},
            },
        },
        {
            "question": "Do you experience pain or discomfort in the upper right side of your abdomen?",
            "primary_disease": "jaundice",
            "answers": {
                "key_symptom":      {"text": "Yes, persistent pain in that area"},
                "moderate_symptom": {"text": "Occasional discomfort there"},
                "possible_reason":  {"text": "Mild, only after eating"},
                "not_relevant":     {"text": "No abdominal pain"},
            },
        },
    ],
    "liver_disease": [
        {
            "question": "Have you noticed swelling in your abdomen or legs?",
            "primary_disease": "liver_disease",
            "answers": {
                "key_symptom":      {"text": "Yes, noticeable swelling or bloating"},
                "moderate_symptom": {"text": "Some puffiness in legs or ankles"},
                "possible_reason":  {"text": "Slight bloating sometimes"},
                "not_relevant":     {"text": "No swelling at all"},
            },
        },
        {
            "question": "Do you feel nauseous or have you lost your appetite recently?",
            "primary_disease": "liver_disease",
            "answers": {
                "key_symptom":      {"text": "Yes, frequent nausea and appetite loss"},
                "moderate_symptom": {"text": "Occasional nausea or reduced appetite"},
                "possible_reason":  {"text": "Mild, only after certain meals"},
                "not_relevant":     {"text": "No, appetite and digestion are normal"},
            },
        },
        {
            "question": "Do you bruise more easily than you used to?",
            "primary_disease": "liver_disease",
            "answers": {
                "key_symptom":      {"text": "Yes, bruises appear from minor bumps"},
                "moderate_symptom": {"text": "Seems to bruise a bit easier"},
                "possible_reason":  {"text": "Maybe, haven't paid attention"},
                "not_relevant":     {"text": "No, I bruise normally"},
            },
        },
    ],
    "psoriasis": [
        {
            "question": "Do you have patches of red, scaly, or flaky skin anywhere on your body?",
            "primary_disease": "psoriasis",
            "answers": {
                "key_symptom":      {"text": "Yes, clearly visible red scaly patches"},
                "moderate_symptom": {"text": "Some dry, flaky areas"},
                "possible_reason":  {"text": "Mild dryness in a small area"},
                "not_relevant":     {"text": "No skin patches or scaling"},
            },
        },
        {
            "question": "Do you experience itching or burning sensations on your skin?",
            "primary_disease": "psoriasis",
            "answers": {
                "key_symptom":      {"text": "Yes, persistent itching or burning"},
                "moderate_symptom": {"text": "Occasional itching in certain areas"},
                "possible_reason":  {"text": "Mild, only in very dry weather"},
                "not_relevant":     {"text": "No itching or burning"},
            },
        },
        {
            "question": "Have you noticed changes in your nails — pitting, discolouration, or separation?",
            "primary_disease": "psoriasis",
            "answers": {
                "key_symptom":      {"text": "Yes, clear pitting or nail changes"},
                "moderate_symptom": {"text": "Some discolouration or roughness"},
                "possible_reason":  {"text": "Minor changes, hard to tell"},
                "not_relevant":     {"text": "No nail changes"},
            },
        },
    ],
    "healthy": [
        {
            "question": "Do you generally feel energetic and well-rested?",
            "primary_disease": "healthy",
            "answers": {
                "key_symptom":      {"text": "No, I often feel tired or unwell"},
                "moderate_symptom": {"text": "Sometimes tired, but mostly okay"},
                "possible_reason":  {"text": "Usually fine, occasional off days"},
                "not_relevant":     {"text": "Yes, I feel great most of the time"},
            },
        },
        {
            "question": "Have you experienced any unusual symptoms in the past month?",
            "primary_disease": "healthy",
            "answers": {
                "key_symptom":      {"text": "Yes, several concerning symptoms"},
                "moderate_symptom": {"text": "A few minor issues"},
                "possible_reason":  {"text": "Maybe one or two small things"},
                "not_relevant":     {"text": "No, I've been feeling perfectly fine"},
            },
        },
        {
            "question": "Do you have any ongoing pain, discomfort, or health concerns?",
            "primary_disease": "healthy",
            "answers": {
                "key_symptom":      {"text": "Yes, persistent pain or concerns"},
                "moderate_symptom": {"text": "Some mild ongoing discomfort"},
                "possible_reason":  {"text": "Minor aches, nothing serious"},
                "not_relevant":     {"text": "No, I'm in good health"},
            },
        },
    ],
}


def _get_fallback_questions(top3: list[tuple[str, float]]) -> list[dict]:
    """Return hardcoded questions for the top 3 diseases."""
    questions = []
    for disease, _ in top3:
        if disease in _FALLBACK_QUESTIONS:
            questions.extend(_FALLBACK_QUESTIONS[disease])
        else:
            print(f"  [warn] No fallback questions for '{disease}'")
    return questions


# ── main public function ─────────────────────────────────────────────────────

def generate_questions(
    top3:       list[tuple[str, float]],
    provider:   str = "gemini",
    api_key:    Optional[str] = None,
    model:      Optional[str] = None,
    verbose:    bool = True,
) -> list[dict]:
    """
    Generate 9 deduplicated diagnostic questions for the given top 3 diseases.

    Parameters
    ----------
    top3 : list of (disease_label, probability)
        e.g. [("anaemia", 0.72), ("diabetes", 0.43), ("jaundice", 0.31)]

    provider : str
        "gemini"  — Google Gemini API (default)
        "openai"  — OpenAI ChatCompletion API
        "offline" — Use hardcoded fallback question bank (no API call)

    api_key : str or None
        API key. If None, reads from environment:
          Gemini  → GEMINI_API_KEY or GOOGLE_API_KEY
          OpenAI  → OPENAI_API_KEY

    model : str or None
        Override the default model name.
          Gemini default  → "gemini-2.0-flash"
          OpenAI default  → "gpt-4o-mini"

    verbose : bool
        Print status messages.

    Returns
    -------
    list[dict] — 9 question dicts ready for BayesianUpdater.run_session().

    Each dict has:
        {
            "question": str,
            "primary_disease": str,
            "answers": {
                "key_symptom":      {"text": str},
                "moderate_symptom": {"text": str},
                "possible_reason":  {"text": str},
                "not_relevant":     {"text": str},
            }
        }
    """
    # ── Validate input ──
    if len(top3) < 1 or len(top3) > 5:
        raise ValueError(f"top3 must have 1-5 entries, got {len(top3)}")

    for d, p in top3:
        if d not in SUPPORTED_DISEASES:
            raise ValueError(
                f"Unknown disease '{d}'. Must be one of: {SUPPORTED_DISEASES}"
            )

    # ── Offline mode: no API call ──
    if provider == "offline":
        if verbose:
            print("[llm_questions] Using offline fallback question bank")
        return _get_fallback_questions(top3)

    # ── Resolve API key ──
    if api_key is None:
        if provider == "gemini":
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        elif provider == "openai":
            api_key = os.environ.get("OPENAI_API_KEY")

    if not api_key:
        if verbose:
            print(
                f"[llm_questions] No API key for '{provider}'. "
                f"Falling back to offline question bank."
            )
        return _get_fallback_questions(top3)

    # ── Build prompts ──
    system_prompt = _SYSTEM_PROMPT
    user_prompt   = _build_user_prompt(top3)

    # ── Call LLM ──
    if verbose:
        print(f"[llm_questions] Calling {provider} API for question generation...")

    try:
        if provider == "gemini":
            raw = _call_gemini(
                system_prompt, user_prompt, api_key,
                model=model or "gemini-2.0-flash",
            )
        elif provider == "openai":
            raw = _call_openai(
                system_prompt, user_prompt, api_key,
                model=model or "gpt-4o-mini",
            )
        else:
            raise ValueError(f"Unknown provider '{provider}'. Use 'gemini', 'openai', or 'offline'.")

        if verbose:
            print(f"[llm_questions] Received response ({len(raw)} chars), parsing JSON...")

        # ── Parse and validate ──
        questions = _extract_json_from_response(raw)
        questions = _validate_questions(questions, top3)

        if verbose:
            print(f"[llm_questions] ✓ {len(questions)} valid questions generated")
            for q in questions:
                print(f"    [{q['primary_disease']}] {q['question'][:70]}...")

        return questions

    except Exception as e:
        print(f"[llm_questions] ERROR: {e}")
        print(f"[llm_questions] Falling back to offline question bank")
        return _get_fallback_questions(top3)


# ── CLI testing ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    # Default test: offline mode with mock top 3
    test_top3 = [
        ("anaemia",          0.72),
        ("iron_deficiency",  0.43),
        ("diabetes",         0.31),
    ]

    # Check for --provider flag
    provider = "offline"
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg.startswith("--provider="):
            provider = arg.split("=", 1)[1]

    print("\n" + "=" * 60)
    print("  LLM Question Generator -- Test Mode")
    print("=" * 60)
    print(f"  Provider: {provider}")
    print(f"  Top 3: {test_top3}\n")

    questions = generate_questions(test_top3, provider=provider, verbose=True)

    print(f"\n{'-' * 60}")
    print(f"  Generated {len(questions)} questions:\n")
    for i, q in enumerate(questions, 1):
        print(f"  Q{i}. [{q['primary_disease']}] {q['question']}")
        for key in ["key_symptom", "moderate_symptom", "possible_reason", "not_relevant"]:
            print(f"       {key}: {q['answers'][key]['text']}")
        print()

    print("=" * 60)
    print("  These questions are ready for BayesianUpdater.run_session()")
    print("=" * 60)
