"""
Trilens Pipeline — Orchestrator
================================
Full pipeline orchestration: extract → merge → classify → generate questions.
Coordinates the ML modules into a cohesive diagnostic flow.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add ml_modules and classifier to path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ML_DIR = str(_PROJECT_ROOT / "ml_modules")
_CLF_DIR = str(_PROJECT_ROOT / "classifier")

for _dir in [_ML_DIR, _CLF_DIR]:
    if _dir not in sys.path:
        sys.path.insert(0, _dir)

from xgboost_model import (
    FEATURE_COLUMNS,
    SUPPORTED_DISEASES,
    VisualDiagnoseClassifier,
    run_classifier_pipeline,
    validate_extractor_output,
)

# Display names for diseases (matching the frontend)
DISPLAY_NAMES: dict[str, str] = {
    "anaemia":          "Anaemia",
    "cyanosis":         "Cyanosis",
    "diabetes":         "Diabetes",
    "hypothyroidism":   "Hypothyroidism",
    "iron_deficiency":  "Iron Deficiency",
    "jaundice":         "Jaundice",
    "liver_disease":    "Liver Disease",
    "psoriasis":        "Psoriasis",
    "healthy":          "Healthy",
}

# Severity notes for the Report page
SEVERITY_NOTES: dict[str, str] = {
    "None":      "No clinical action required",
    "Low":       "Monitor and maintain healthy habits",
    "Mild":      "Immediate attention not required",
    "Moderate":  "Consult a healthcare professional",
    "High":      "Professional consultation is recommended within 48 hours",
    "Emergency": "Seek immediate medical attention",
}

# Singleton classifier instance (loaded once at startup)
_classifier: VisualDiagnoseClassifier | None = None


def get_classifier() -> VisualDiagnoseClassifier:
    """Get or load the singleton classifier instance."""
    global _classifier
    if _classifier is None:
        _classifier = VisualDiagnoseClassifier.load()
    return _classifier


def merge_and_classify(features: dict[str, float]) -> dict:
    """
    Takes merged features from all 3 extractors and runs XGBoost classification.

    Parameters
    ----------
    features : dict[str, float]
        15-key dict with all tongue/eye/nail features.

    Returns
    -------
    dict with:
        - top3: list[dict] — [{disease, probability}, ...]
        - top3_tuples: list[tuple] — [(disease, prob), ...]
        - priors: dict — {disease: prob}
        - disease_names: list[str]
    """
    # Validate features
    is_valid, errors = validate_extractor_output(features)
    if not is_valid:
        print(f"[orchestrator] Feature validation warnings: {errors}")

    # Run classifier
    clf = get_classifier()
    result = run_classifier_pipeline(features, classifier=clf)

    # Enrich with display names
    for entry in result["top3"]:
        entry["display_name"] = DISPLAY_NAMES.get(
            entry["disease"],
            entry["disease"].replace("_", " ").title()
        )

    return result
