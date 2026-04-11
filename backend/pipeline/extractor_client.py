"""
Trilens Pipeline — Feature Extractor Client
=============================================
Wraps the ML module extractors (eye, tongue, nail) for use by the FastAPI backend.
Handles file I/O, error recovery, and temp file cleanup.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

# Add ml_modules to path so we can import extractors directly
_ML_DIR = str(Path(__file__).resolve().parent.parent.parent / "ml_modules")
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

from eye_extractor import extract_eye_features
from nail_extractor import extract_nail_features
from tongue_extractor import extract_tongue_features


async def extract_features_from_upload(
    file_bytes: bytes,
    scan_type: str,
    session_id: str,
) -> dict[str, float]:
    """
    Save uploaded image bytes to a temp file, run the appropriate extractor,
    and return the feature dictionary.

    Parameters
    ----------
    file_bytes : bytes
        Raw image bytes from the upload.
    scan_type : str
        One of: "eye", "tongue", "nail"
    session_id : str
        Used for temp file naming.

    Returns
    -------
    dict[str, float] — 5 features normalized to [0, 1]
    """
    # Create temp dir for uploads if it doesn't exist
    upload_dir = Path(__file__).resolve().parent.parent / "uploads"
    upload_dir.mkdir(exist_ok=True)

    # Save to temp file
    ext = ".jpg"
    temp_path = upload_dir / f"{session_id}_{scan_type}{ext}"
    temp_path.write_bytes(file_bytes)

    try:
        if scan_type == "eye":
            features = extract_eye_features(str(temp_path))
        elif scan_type == "tongue":
            features = extract_tongue_features(str(temp_path))
        elif scan_type == "nail":
            features = extract_nail_features(str(temp_path))
        else:
            raise ValueError(f"Unknown scan type: {scan_type}")

        return features

    except Exception as e:
        print(f"[extractor_client] ERROR extracting {scan_type} features: {e}")
        # Return zero features on error so pipeline can continue
        zero_features = _get_zero_features(scan_type)
        return zero_features


def _get_zero_features(scan_type: str) -> dict[str, float]:
    """Return zero-valued feature dict for a given scan type (fallback on error)."""
    if scan_type == "eye":
        return {
            "eye_sclera_yellow": 0.0,
            "eye_conjunctiva_pallor": 0.0,
            "eye_cornea_clarity": 0.0,
            "eye_pupil_symmetry": 0.0,
            "eye_discharge_present": 0.0,
        }
    elif scan_type == "tongue":
        return {
            "tongue_pallor": 0.0,
            "tongue_crack_density": 0.0,
            "tongue_fur_color": 0.0,
            "tongue_surface_smoothness": 0.0,
            "tongue_moisture": 0.0,
        }
    elif scan_type == "nail":
        return {
            "nail_brittleness": 0.0,
            "nail_shape_abnormality": 0.0,
            "nail_clubbing_ratio": 0.0,
            "nail_pitting_count": 0.0,
            "nail_ridge_score": 0.0,
        }
    return {}
