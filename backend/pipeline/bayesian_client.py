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
