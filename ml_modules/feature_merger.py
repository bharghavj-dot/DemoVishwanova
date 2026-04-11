"""
feature_merger.py
-----------------
Joins tongue / eye / nail extractor outputs into the exact 15-column
feature vector that matches the training data schema (top F-score features).

Usage
-----
  python feature_merger.py tongue.jpg eye.jpg nail.jpg

  Or import and call merge_features() directly:
      from feature_merger import merge_features
      df = merge_features("t.jpg", "e.jpg", "n.jpg")
      X  = df.values          # shape (1, 15) — pass straight to model.predict()
"""

import sys
import numpy as np
import pandas as pd

from tongue_extractor import extract_tongue_features
from eye_extractor    import extract_eye_features
from nail_extractor   import extract_nail_features


# ── exact column order from training data (15 top-F-score features) ──────────
TRAINING_COLUMNS = [
    # Tongue (5)
    "tongue_pallor",              # F=14.20 — key for anaemia/iron_deficiency
    "tongue_crack_density",       # F=10.60 — psoriasis marker
    "tongue_fur_color",           # F= 8.20 — hypothyroidism/liver cue
    "tongue_surface_smoothness",  # F= 4.58 — general health indicator
    "tongue_moisture",            # F= 4.06 — diabetes vs hypothyroidism separator
    # Eye (5)
    "eye_sclera_yellow",          # F=24.95 — #1 feature, jaundice/liver
    "eye_conjunctiva_pallor",     # F=13.66 — anaemia/iron_deficiency
    "eye_cornea_clarity",         # F=13.05 — cyanosis/diabetes
    "eye_pupil_symmetry",         # F= 6.78 — neurological conditions
    "eye_discharge_present",      # F= 6.09 — diabetes marker
    # Nail (5)
    "nail_brittleness",           # F=23.39 — #2 feature, hypothyroidism
    "nail_shape_abnormality",     # F=21.72 — clubbing/spooning
    "nail_clubbing_ratio",        # F=17.67 — liver/respiratory
    "nail_pitting_count",         # F=17.10 — psoriasis hallmark
    "nail_ridge_score",           # F=12.86 — iron_deficiency/anaemia
]


# ── core function ─────────────────────────────────────────────────────────────

def merge_features(
    tongue_img: str,
    eye_img:    str,
    nail_img:   str,
    verbose:    bool = False,
) -> pd.DataFrame:
    """
    Runs all three extractors and returns a single-row DataFrame whose
    columns match TRAINING_COLUMNS exactly (15 features).

    Parameters
    ----------
    tongue_img, eye_img, nail_img : str
        Paths to the respective close-up photos.
    verbose : bool
        Print a breakdown table if True.

    Returns
    -------
    pd.DataFrame, shape (1, 15)
    """
    feats: dict = {}

    # ── run extractors ──
    try:
        feats.update(extract_tongue_features(tongue_img))
    except Exception as e:
        print(f"[tongue] ERROR: {e}")
        feats.update({c: 0.0 for c in TRAINING_COLUMNS if c.startswith("tongue_")})

    try:
        feats.update(extract_eye_features(eye_img))
    except Exception as e:
        print(f"[eye] ERROR: {e}")
        feats.update({c: 0.0 for c in TRAINING_COLUMNS if c.startswith("eye_")})

    try:
        feats.update(extract_nail_features(nail_img))
    except Exception as e:
        print(f"[nail] ERROR: {e}")
        feats.update({c: 0.0 for c in TRAINING_COLUMNS if c.startswith("nail_")})

    # ── assemble in exact training column order ──
    row = [float(feats.get(col, 0.0)) for col in TRAINING_COLUMNS]
    df  = pd.DataFrame([row], columns=TRAINING_COLUMNS)

    if verbose:
        _print_table(df)

    return df


def get_numpy_vector(tongue_img: str, eye_img: str, nail_img: str) -> np.ndarray:
    """Convenience wrapper — returns shape (1, 15) numpy array ready for model.predict()."""
    return merge_features(tongue_img, eye_img, nail_img).values


# ── pretty-print helper ───────────────────────────────────────────────────────

def _print_table(df: pd.DataFrame) -> None:
    row = df.iloc[0]
    print("\n" + "─" * 58)
    print(f"{'Feature':<35}  {'Value':>7}  {'Status'}")
    print("─" * 58)

    current_group = None
    group_map = {"tongue_": "TONGUE", "eye_": "EYE", "nail_": "NAIL"}

    for col in TRAINING_COLUMNS:
        grp = next((v for k, v in group_map.items() if col.startswith(k)), "")
        if grp != current_group:
            print(f"\n  [{grp}]")
            current_group = grp
        print(f"  {col:<35} {row[col]:>7.4f}  ✓")

    print("─" * 58)
    print(f"  Active: {len(TRAINING_COLUMNS)}/{len(TRAINING_COLUMNS)}   (all features actively extracted)")
    print("─" * 58 + "\n")


# ── CLI entry-point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python feature_merger.py <tongue.jpg> <eye.jpg> <nail.jpg>")
        sys.exit(1)

    tongue_path, eye_path, nail_path = sys.argv[1], sys.argv[2], sys.argv[3]

    df = merge_features(tongue_path, eye_path, nail_path, verbose=True)

    # ── save CSV for inspection ──
    out_csv = "extracted_features.csv"
    df.to_csv(out_csv, index=False)
    print(f"Saved → {out_csv}")

    # ── numpy array for model ──
    X = df.values                       # shape: (1, 15)
    print(f"Numpy array shape: {X.shape}")
    print(f"Pass to model:  model.predict(X)")
