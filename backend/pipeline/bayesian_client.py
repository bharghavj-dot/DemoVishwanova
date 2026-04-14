"""
Trilens Pipeline — Bayesian Updater Client
============================================
Wraps bayesian_updater.py for stateful Q&A sessions in the FastAPI backend.
Manages per-session probability state and incremental Bayesian updates.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add ml_modules to path
_ML_DIR = str(Path(__file__).resolve().parent.parent.parent / "ml_modules")
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

from bayesian_updater import (
    ANSWER_TYPES,
    RULING_OUT_CUTOFF,
    format_output,
    process_answer,
)


def apply_bayesian_update(
    current_probs: dict[str, float],
    question: dict,
    answer_type: str,
) -> tuple[dict[str, float], list[str]]:
    """
    Apply a single Bayesian update for one answered question.

    Parameters
    ----------
    current_probs : dict[str, float]
        Current posterior probabilities for each disease.
    question : dict
        The question dict (must have 'primary_disease' key).
    answer_type : str
        One of: "key_symptom", "moderate_symptom", "possible_reason", "not_relevant"

    Returns
    -------
    tuple of:
        - updated_probs : dict[str, float] — renormalised posteriors
        - ruled_out : list[str] — diseases that dropped below cutoff
    """
    if answer_type not in ANSWER_TYPES:
        print(f"[bayesian_client] Unknown answer type '{answer_type}', defaulting to not_relevant")
        answer_type = "not_relevant"

    # Apply Bayesian update with renormalization
    updated_probs = process_answer(current_probs, question, answer_type)

    # Check for ruled-out diseases
    ruled_out = [
        disease for disease, prob in updated_probs.items()
        if prob < RULING_OUT_CUTOFF
    ]

    return updated_probs, ruled_out


def generate_final_output(probs: dict[str, float]) -> dict:
    """
    Generate the final diagnostic output after Q&A completion.

    Parameters
    ----------
    probs : dict[str, float]
        Final posterior probabilities after all Q&A updates.

    Returns
    -------
    dict with keys:
        - final_report: str
        - severity: str
        - precautions: list[str]
        - medications: list[str]
        - escalation_flags: list[str]
        - see_doctor_flag: bool
    """
    return format_output(probs)


def apply_voice_update(
    current_probs: dict[str, float],
    voice_analysis: dict,
) -> dict[str, float]:
    """
    Apply the Voice LLM's probability adjustments after the phone call.

    The voice_analysis dict contains 'adjusted_probabilities' with the LLM's
    recommended changes based on the conversation (e.g., patient denied
    right-quadrant pain → liver_disease probability decreases).

    We blend these with current Bayesian posteriors using a weighted average
    to prevent the LLM from overriding the statistical model entirely.

    Parameters
    ----------
    current_probs : dict[str, float]
        Current posterior probabilities from MCQ Bayesian updates.
    voice_analysis : dict
        Post-call analysis from the Voice LLM, must contain
        'adjusted_probabilities' key.

    Returns
    -------
    dict[str, float] — Blended and renormalized posteriors.
    """
    adjustments = voice_analysis.get("adjusted_probabilities", {})
    if not adjustments:
        return current_probs

    VOICE_WEIGHT = 0.3  # 30% voice LLM influence, 70% Bayesian

    blended = {}
    for disease, prob in current_probs.items():
        if disease in adjustments:
            blended[disease] = (1 - VOICE_WEIGHT) * prob + VOICE_WEIGHT * adjustments[disease]
        else:
            blended[disease] = prob

    # Renormalize to ensure probabilities sum to 1.0
    total = sum(blended.values())
    if total > 0:
        blended = {d: p / total for d, p in blended.items()}

    print(f"[bayesian_client] Voice update applied (weight={VOICE_WEIGHT})")
    for d in sorted(blended, key=blended.get, reverse=True)[:3]:
        old = current_probs.get(d, 0)
        new = blended[d]
        delta = new - old
        print(f"    {d}: {old:.1%} → {new:.1%} ({'+' if delta >= 0 else ''}{delta:.1%})")

    return blended
