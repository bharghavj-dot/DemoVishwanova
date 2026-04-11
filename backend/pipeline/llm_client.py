"""
Trilens Pipeline — LLM Question Generator Client
==================================================
Wraps the llm_question_gen module for the FastAPI backend.
Handles API key resolution, provider selection, and enriches
questions with UI metadata (why_asking, clinical_insight).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Add ml_modules to path
_ML_DIR = str(Path(__file__).resolve().parent.parent.parent / "ml_modules")
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

from llm_question_gen import generate_questions, DISPLAY_NAMES


# ── Clinical insight metadata (shown in Q&A sidebar) ─────────────────────────

_WHY_ASKING: dict[str, str] = {
    "anaemia": "This helps our AI differentiate between chronic fatigue patterns and red blood cell deficiency indicators.",
    "cyanosis": "This helps our AI assess peripheral oxygen saturation and cardiovascular function markers.",
    "diabetes": "This helps our AI distinguish between metabolic sugar regulation issues and other endocrine conditions.",
    "hypothyroidism": "This helps our AI evaluate thyroid hormone deficiency patterns against other metabolic disorders.",
    "iron_deficiency": "This helps our AI differentiate between dietary iron absorption issues and systemic iron storage disorders.",
    "jaundice": "This helps our AI assess bilirubin metabolism and hepatobiliary function indicators.",
    "liver_disease": "This helps our AI evaluate hepatic function markers and distinguish viral from metabolic liver conditions.",
    "psoriasis": "This helps our AI differentiate between autoimmune skin conditions and environmental dermatitis.",
    "healthy": "This helps our AI confirm the absence of clinical indicators and validate your baseline health status.",
}


async def generate_qa_questions(
    top3: list[tuple[str, float]],
) -> list[dict]:
    """
    Generate 9 clinical Q&A questions (3 per disease) for a diagnostic session.

    Parameters
    ----------
    top3 : list of (disease_label, probability)
        From XGBoost classifier output.

    Returns
    -------
    list[dict] — 9 question dicts enriched with UI metadata.
    """
    # Resolve provider and API key from environment
    provider = os.environ.get("LLM_PROVIDER", "offline")
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    if provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")

    # Generate questions via the ML module
    questions = generate_questions(
        top3=top3,
        provider=provider,
        api_key=api_key,
        verbose=True,
    )

    # Enrich with UI metadata for the Q&A page sidebar
    enriched = []
    for i, q in enumerate(questions):
        disease = q.get("primary_disease", "")
        display_name = DISPLAY_NAMES.get(disease, disease.replace("_", " ").title())

        q_enriched = {
            **q,
            "index": i,
            "why_asking": _WHY_ASKING.get(disease, f"This helps refine the diagnostic accuracy for {display_name}."),
            "clinical_insight": f"Symptom correlation analysis for {display_name}",
        }
        enriched.append(q_enriched)

    return enriched
