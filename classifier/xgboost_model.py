"""
VisualDiagnose — XGBoost Classifier
====================================
Responsibility : YOUR WORK
Input          : 27 float features from Person B's feature_merger.py
                 (get_numpy_vector → shape (1, 27))
Output         : top-3 (disease, prior_probability) tuples consumed by
                 Person B's bayesian_updater.py and llm_questions.py

Label contract
--------------
All disease labels emitted by predict_top3() are normalised to the
canonical names in SUPPORTED_DISEASES (architecture §3.1).  The CSV
trains with raw labels (e.g. "anemia"); the normalisation map converts
them to the spec labels (e.g. "anaemia") at inference time so the LLM
prompt builder and Bayesian updater always receive the correct strings.

Usage
-----
Train once:
    python xgboost_model.py --train --data Updated_synthetic.csv

Load in FastAPI / pipeline orchestrator:
    from classifier.xgboost_model import VisualDiagnoseClassifier, SUPPORTED_DISEASES
    clf = VisualDiagnoseClassifier.load()
    top3      = clf.predict_top3(feature_dict)    # → list[dict]
    top3_tuples = clf.predict_top3_tuples(feature_dict)  # → list[tuple]
"""

from __future__ import annotations

import argparse
import json
import os
import pickle
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.class_weight import compute_sample_weight

try:
    from imblearn.over_sampling import SMOTE
    _HAS_SMOTE = True
except ImportError:
    _HAS_SMOTE = False
    print("[warn] imbalanced-learn not installed — SMOTE disabled. "
          "Install with: pip install imbalanced-learn")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Architecture §file-structure: model lives in  model/xgboost_model.pkl
# We save BOTH formats:
#   model/xgboost_model.json  — native XGBoost (fast load, cross-platform)
#   model/xgboost_model.pkl   — pickle wrapper  (matches predict.py import)
MODEL_DIR = Path(__file__).parent / "model"
MODEL_PATH_JSON = MODEL_DIR / "xgboost_model.json"
MODEL_PATH_PKL  = MODEL_DIR / "xgboost_model.pkl"
ENCODER_PATH    = MODEL_DIR / "label_encoder.pkl"
FEATURE_META_PATH = MODEL_DIR / "feature_meta.json"

# Architecture §3.1 — canonical disease label list used by LLM prompt builder
# and Bayesian updater. Import this constant in llm_questions.py and
# bayesian_updater.py to keep a single source of truth.
SUPPORTED_DISEASES: list[str] = [
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

# CSV training labels → canonical architecture labels.
# The CSV uses US/variant spellings; the architecture spec and LLM prompts
# use the labels in SUPPORTED_DISEASES. Add entries here if the CSV ever changes.
_LABEL_NORMALISE: dict[str, str] = {
    "anemia":        "anaemia",       # US → British (architecture spec)
    "liver disease": "liver_disease", # space → underscore fallback
    "iron deficiency": "iron_deficiency",
    # All other labels are already canonical — no entry needed.
}

FEATURE_COLUMNS: list[str] = [
    # Top-15 features — ANOVA F-stat + per-class discriminative power
    # Tongue (5) — strongest tongue discriminators
    "tongue_pallor",              # F=14.20 — key for anaemia/iron_deficiency
    "tongue_crack_density",       # F=10.60 — psoriasis marker
    "tongue_fur_color",           # F= 8.20 — hypothyroidism/liver cue
    "tongue_surface_smoothness",  # F= 4.58 — general health indicator
    "tongue_moisture",            # F= 4.06 — diabetes vs hypothyroidism separator
    # Eye (5) — all highly discriminative
    "eye_sclera_yellow",          # F=24.95 — #1 feature, jaundice/liver
    "eye_conjunctiva_pallor",     # F=13.66 — anaemia/iron_deficiency
    "eye_cornea_clarity",         # F=13.05 — cyanosis/diabetes
    "eye_pupil_symmetry",         # F= 6.78 — neurological conditions
    "eye_discharge_present",      # F= 6.09 — diabetes marker (0.72 vs 0.50 others)
    # Nail (5) — rich diagnostic signal
    "nail_brittleness",           # F=23.39 — #2 feature, hypothyroidism
    "nail_shape_abnormality",     # F=21.72 — clubbing/spooning
    "nail_clubbing_ratio",        # F=17.67 — liver/respiratory
    "nail_pitting_count",         # F=17.10 — psoriasis hallmark
    "nail_ridge_score",           # F=12.86 — iron_deficiency/anaemia
]

TARGET_COLUMN = "disease_label"

# XGBoost hyper-parameters — re-tuned for small 9-class dataset (200 rows)
# Key changes vs original: shallower trees + more boosting rounds + stronger
# regularisation to prevent overfitting on ~22 samples per class.
XGB_PARAMS: dict = {
    "objective": "multi:softprob",
    "num_class": 9,                 # updated dynamically from data
    "n_estimators": 500,            # more rounds (was 300) — compensates shallower trees
    "max_depth": 3,                 # ↓ from 5 — prevents memorising small classes
    "learning_rate": 0.03,          # ↓ from 0.05 — slower, more stable convergence
    "subsample": 0.7,              # ↓ from 0.8 — adds row-level regularisation
    "colsample_bytree": 0.7,       # ↓ from 0.8 — feature bagging per tree
    "colsample_bylevel": 0.7,      # ↓ from 0.8 — feature bagging per level
    "min_child_weight": 2,          # ↓ from 3 — allow slightly smaller leaf nodes
    "gamma": 0.2,                   # ↑ from 0.1 — prune weak splits more aggressively
    "reg_alpha": 0.3,               # ↑ from 0.1 — stronger L1 sparsity
    "reg_lambda": 2.0,              # ↑ from 1.0 — stronger L2 ridge penalty
    "eval_metric": "mlogloss",
    "random_state": 42,
    "n_jobs": -1,
}

EARLY_STOPPING_ROUNDS = 30  # used only when eval_set is provided


# ---------------------------------------------------------------------------
# Feature engineering — interaction features for better class separation
# ---------------------------------------------------------------------------

# Column indices in FEATURE_COLUMNS for building interaction features
_IDX = {name: i for i, name in enumerate(FEATURE_COLUMNS)}

def _add_engineered_features(X: np.ndarray) -> np.ndarray:
    """
    Append derived interaction features to the raw feature matrix.

    These interaction terms capture cross-feature patterns that help
    separate diabetes from hypothyroidism and cyanosis (classes with
    overlapping single-feature distributions).

    Added columns (3):
        - nail_brittleness * eye_discharge_present
            Diabetes: 0.785 * 0.722 = 0.567 (high)
            Hypothyroidism: 0.710 * 0.512 = 0.364 (lower)
        - eye_cornea_clarity * tongue_moisture
            Diabetes: 0.301 * 0.439 = 0.132 (unique low)
            Others: typically 0.25-0.35
        - nail_clubbing_ratio * tongue_moisture
            Diabetes: 0.580 * 0.439 = 0.255
            Hypothyroidism: 0.456 * 0.208 = 0.095 (very different)
    """
    feat1 = (X[:, _IDX["nail_brittleness"]] *
             X[:, _IDX["eye_discharge_present"]]).reshape(-1, 1)
    feat2 = (X[:, _IDX["eye_cornea_clarity"]] *
             X[:, _IDX["tongue_moisture"]]).reshape(-1, 1)
    feat3 = (X[:, _IDX["nail_clubbing_ratio"]] *
             X[:, _IDX["tongue_moisture"]]).reshape(-1, 1)
    return np.hstack([X, feat1, feat2, feat3]).astype(np.float32)


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train(data_path: str, evaluate: bool = True) -> None:
    """
    Train an XGBoost multi-class classifier and persist the artifacts.

    Artifacts saved to  model/  (architecture §file-structure):
        model/xgboost_model.json  — XGBoost native format (used by load())
        model/xgboost_model.pkl   — pickle wrapper (used by predict.py)
        model/label_encoder.pkl   — sklearn LabelEncoder (normalised labels)
        model/feature_meta.json   — feature list + canonical class names
    """
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # 1. Load data + normalise labels to canonical names
    # ------------------------------------------------------------------
    df = pd.read_csv(data_path)
    _validate_dataframe(df)

    X = df[FEATURE_COLUMNS].values.astype(np.float32)

    # ------------------------------------------------------------------
    # 1b. Engineered interaction features for better class separation
    #     These help diabetes (which overlaps with hypothyroidism/cyanosis
    #     on individual features but has unique cross-feature patterns).
    # ------------------------------------------------------------------
    X = _add_engineered_features(X)

    y_raw = df[TARGET_COLUMN].values

    # Normalise CSV labels -> canonical SUPPORTED_DISEASES names
    y_normalised = np.array([_LABEL_NORMALISE.get(lbl, lbl) for lbl in y_raw])

    # Warn about any labels not in the canonical list
    unknown = set(y_normalised) - set(SUPPORTED_DISEASES)
    if unknown:
        print(f"[train] WARNING — unknown labels not in SUPPORTED_DISEASES: {unknown}")

    le = LabelEncoder()
    y = le.fit_transform(y_normalised)

    num_classes = len(le.classes_)
    print(f"[train] {len(y)} samples · {X.shape[1]} features ({len(FEATURE_COLUMNS)} base + {X.shape[1]-len(FEATURE_COLUMNS)} engineered) · {num_classes} classes")
    print(f"[train] Canonical classes: {list(le.classes_)}")

    # ------------------------------------------------------------------
    # 2. Cross-validation sanity check
    # ------------------------------------------------------------------
    if evaluate:
        params = {**XGB_PARAMS, "num_class": num_classes}
        cv_model = xgb.XGBClassifier(**params)
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(cv_model, X, y, cv=skf, scoring="f1_macro")
        print(f"[train] 5-fold macro-F1: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

    # ------------------------------------------------------------------
    # 3. Train / test split — averaged over multiple seeds for stability
    #    (only 4 diabetes test samples per split, so single seed unreliable)
    # ------------------------------------------------------------------
    EVAL_SEEDS = [42, 123, 7]
    best_model, best_f1 = None, -1

    for seed in EVAL_SEEDS:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=seed, stratify=y
        )

        # SMOTE oversample the training set to help minority classes
        if _HAS_SMOTE:
            smote = SMOTE(random_state=seed, k_neighbors=3)
            X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
            if seed == EVAL_SEEDS[0]:
                print(f"[train] SMOTE: {len(y_train)} -> {len(y_train_res)} training samples")
        else:
            X_train_res, y_train_res = X_train, y_train

        # Compute balanced sample weights
        sw_train = compute_sample_weight("balanced", y_train_res)

        params = {**XGB_PARAMS, "num_class": num_classes}
        model = xgb.XGBClassifier(**params)
        model.set_params(early_stopping_rounds=EARLY_STOPPING_ROUNDS)
        model.fit(
            X_train_res, y_train_res,
            sample_weight=sw_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )

        if evaluate:
            y_pred = model.predict(X_test)
            from sklearn.metrics import f1_score
            macro_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
            print(f"\n[train] Test-set report (seed={seed}, macro-F1={macro_f1:.2f}):")
            print(classification_report(y_test, y_pred, target_names=le.classes_, zero_division=0))

        # Keep the best-performing model
        if evaluate:
            if macro_f1 > best_f1:
                best_f1 = macro_f1
                best_model = model
        else:
            best_model = model

    # ------------------------------------------------------------------
    # 4. Retrain on full data before saving (no early stopping — no val set)
    # ------------------------------------------------------------------
    if _HAS_SMOTE:
        X_full_res, y_full_res = SMOTE(random_state=42, k_neighbors=3).fit_resample(X, y)
    else:
        X_full_res, y_full_res = X, y

    sw_full = compute_sample_weight("balanced", y_full_res)
    final_params = {**XGB_PARAMS, "num_class": num_classes}
    final_model = xgb.XGBClassifier(**final_params)
    final_model.fit(X_full_res, y_full_res, sample_weight=sw_full, verbose=False)
    model = final_model  # use the fully-trained model for saving

    # ------------------------------------------------------------------
    # 5. Persist artifacts — both formats (architecture §file-structure)
    # ------------------------------------------------------------------
    # Native JSON (fast, used by VisualDiagnoseClassifier.load())
    model.save_model(str(MODEL_PATH_JSON))

    # Pickle wrapper (matches predict.py: `model = pickle.load(...)`)
    with open(MODEL_PATH_PKL, "wb") as f:
        pickle.dump(model, f)

    with open(ENCODER_PATH, "wb") as f:
        pickle.dump(le, f)

    meta = {
        "feature_columns": FEATURE_COLUMNS,
        "classes": list(le.classes_),       # canonical names
        "num_classes": num_classes,
        "supported_diseases": SUPPORTED_DISEASES,
    }
    with open(FEATURE_META_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n[train] Artifacts saved to {MODEL_DIR}/")
    print(f"        {MODEL_PATH_JSON.name}")
    print(f"        {MODEL_PATH_PKL.name}")
    print(f"        {ENCODER_PATH.name}")
    print(f"        {FEATURE_META_PATH.name}")


# ---------------------------------------------------------------------------
# Inference wrapper
# ---------------------------------------------------------------------------

class VisualDiagnoseClassifier:
    """
    Thin wrapper around the saved XGBoost model.

    The integration layer (FastAPI / pipeline orchestrator) calls:

        clf = VisualDiagnoseClassifier.load()
        top3 = clf.predict_top3(features)

    where `features` is either:
        • dict  — {"tongue_color_r": 0.34, "eye_sclera_yellow": 0.12, ...}
        • list  — 27 floats in FEATURE_COLUMNS order
        • np.ndarray — shape (27,) or (1, 27)

    Returns
    -------
    list[dict]  — length 3, sorted descending by probability, e.g.:
        [
            {"disease": "anemia",    "probability": 0.54},
            {"disease": "jaundice",  "probability": 0.28},
            {"disease": "diabetes",  "probability": 0.10},
        ]

    These probabilities are used directly as Bayesian priors by
    Person B's bayesian_update() — they already sum to 1.0 because
    they are drawn from a softmax output.

    Note: only top-3 are returned, which means the remaining probability
    mass (~8%) is discarded. If you want the full distribution, call
    predict_proba_full() instead.
    """

    def __init__(self, model: xgb.XGBClassifier, le: LabelEncoder) -> None:
        self._model = model
        self._le = le

    # ------------------------------------------------------------------
    @classmethod
    def load(cls, model_dir: Optional[Path] = None) -> "VisualDiagnoseClassifier":
        """Load persisted artifacts and return a ready classifier."""
        base = Path(model_dir) if model_dir else MODEL_DIR
        model_path   = base / "xgboost_model.json"
        encoder_path = base / "label_encoder.pkl"

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {model_path}. "
                "Run `python xgboost_model.py --train --data <csv>` first."
            )

        model = xgb.XGBClassifier()
        model.load_model(str(model_path))

        with open(encoder_path, "rb") as f:
            le = pickle.load(f)

        print(f"[load] Model loaded from {model_path}")
        return cls(model, le)

    # ------------------------------------------------------------------
    def predict_top3(self, features: dict | list | np.ndarray) -> list[dict]:
        """
        Return top disease candidates with the 'healthy' label included.

        Returns 3 or 4 items depending on the prediction:
        - If 'healthy' is NOT in XGBoost's top 3 → inject it at 0.05 probability (returns 4 items).
        - If 'healthy' IS in XGBoost's top 3 → keep it and only return the top 3 items.

        All probabilities are re-normalised to sum to 1.0.

        Returns list[dict] — consumed by run_classifier_pipeline() and
        the FastAPI response schema.
        """
        x = self._to_array(features)
        proba = self._model.predict_proba(x)[0]           # shape (num_classes,)

        sorted_idx = np.argsort(proba)[::-1]               # all classes, descending

        # Collect top 3 predictions
        top3_idx   = sorted_idx[:3]
        top3_proba = proba[top3_idx]
        top3_proba = top3_proba / top3_proba.sum()         # re-normalise top-3

        results = [
            {
                "disease": self._le.inverse_transform([idx])[0],
                "probability": float(prob),
            }
            for idx, prob in zip(top3_idx, top3_proba)
        ]

        has_healthy = any(r["disease"] == "healthy" for r in results)

        if not has_healthy:
            # Healthy NOT in top 3 → inject it at 0.05
            results.append({"disease": "healthy", "probability": 0.05})

        # Re-normalise so all items sum to 1.0
        total_prob = sum(r["probability"] for r in results)
        for r in results:
            r["probability"] = r["probability"] / total_prob

        # Round to 6 decimal places
        for r in results:
            r["probability"] = float(round(r["probability"], 6))

        return results

    def predict_top3_tuples(
        self, features: dict | list | np.ndarray
    ) -> list[tuple[str, float]]:
        """
        Architecture §Stage 2 tuple format — consumed directly by
        Person B's build_question_prompt() in llm_questions.py:

            top3 = clf.predict_top3_tuples(X)
            # → [("anaemia", 0.72), ("diabetes", 0.43), ("jaundice", 0.31)]

            system_prompt, user_msg = build_question_prompt(top3)

        Also used to initialise the Bayesian prior dict (§3.5):
            probs = {disease: prob for disease, prob in top3}
        """
        return [
            (entry["disease"], entry["probability"])
            for entry in self.predict_top3(features)
        ]

    def predict_proba_full(self, features: dict | list | np.ndarray) -> dict[str, float]:
        """Return the full probability distribution over all 9 classes."""
        x = self._to_array(features)
        proba = self._model.predict_proba(x)[0]
        return {
            cls: float(round(p, 6))
            for cls, p in zip(self._le.classes_, proba)
        }

    def predict_label(self, features: dict | list | np.ndarray) -> str:
        """Return the single most-likely disease label."""
        x = self._to_array(features)
        idx = self._model.predict(x)[0]
        return self._le.inverse_transform([idx])[0]

    # ------------------------------------------------------------------
    def feature_importances(self) -> dict[str, float]:
        """Return per-feature importance scores (gain-based)."""
        scores = self._model.get_booster().get_score(importance_type="gain")
        total = sum(scores.values())
        return {k: round(v / total, 4) for k, v in
                sorted(scores.items(), key=lambda x: x[1], reverse=True)}

    # ------------------------------------------------------------------
    def _to_array(self, features: dict | list | np.ndarray) -> np.ndarray:
        if isinstance(features, dict):
            missing = [c for c in FEATURE_COLUMNS if c not in features]
            if missing:
                raise ValueError(f"Missing features: {missing}")
            arr = np.array([features[c] for c in FEATURE_COLUMNS], dtype=np.float32)
        elif isinstance(features, (list, np.ndarray)):
            arr = np.asarray(features, dtype=np.float32).flatten()
            if arr.shape[0] != len(FEATURE_COLUMNS):
                raise ValueError(
                    f"Expected {len(FEATURE_COLUMNS)} features, got {arr.shape[0]}"
                )
        else:
            raise TypeError(f"Unsupported feature type: {type(features)}")
        # Apply the same engineered features used during training
        arr_2d = _add_engineered_features(arr.reshape(1, -1))
        return arr_2d


# ---------------------------------------------------------------------------
# Integration contract — called by the FastAPI backend
# ---------------------------------------------------------------------------

def run_classifier_pipeline(
    raw_features: dict,
    classifier: Optional[VisualDiagnoseClassifier] = None,
) -> dict:
    """
    Entry point for the FastAPI backend (backend/pipeline/orchestrator.py).

    Parameters
    ----------
    raw_features : dict
        15-key dict from feature_merger.py (get_numpy_vector output
        converted to dict).  Keys must match FEATURE_COLUMNS exactly.

    classifier : VisualDiagnoseClassifier, optional
        Pass a pre-loaded instance to avoid re-loading on every request.
        If None, loads from disk (slow — use dependency injection in FastAPI).

    Returns
    -------
    dict with shape:
        {
            "top3": [
                {"disease": "anaemia",  "probability": 0.54},
                {"disease": "jaundice", "probability": 0.28},
                {"disease": "diabetes", "probability": 0.10},
            ],
            "top3_tuples": [("anaemia", 0.54), ("jaundice", 0.28), ("diabetes", 0.10)],
            "disease_names": ["anaemia", "jaundice", "diabetes"],
            "priors": {"anaemia": 0.54, "jaundice": 0.28, "diabetes": 0.10},
        }

    Downstream consumers:
        top3_tuples → build_question_prompt(top3)  in llm_questions.py  (§3.1)
        priors      → bayesian_update(probs, ...)  in bayesian_updater.py (§3.3)
    """
    clf = classifier or VisualDiagnoseClassifier.load()
    top3        = clf.predict_top3(raw_features)
    top3_tuples = clf.predict_top3_tuples(raw_features)

    return {
        "top3": top3,
        "top3_tuples": top3_tuples,
        "disease_names": [entry["disease"] for entry in top3],
        "priors": {entry["disease"]: entry["probability"] for entry in top3},
    }


def run_image_pipeline(
    tongue_img: str,
    eye_img: str,
    nail_img: str,
    classifier: Optional[VisualDiagnoseClassifier] = None,
    verbose: bool = True,
) -> dict:
    """
    End-to-end pipeline: images -> feature extraction -> XGBoost prediction.

    Parameters
    ----------
    tongue_img, eye_img, nail_img : str
        Paths to close-up photos of tongue, eye, and nail respectively.
    classifier : VisualDiagnoseClassifier, optional
        Pre-loaded classifier. Loads from disk if None.
    verbose : bool
        Print extracted features and predictions.

    Returns
    -------
    dict with shape:
        {
            "features": {"tongue_pallor": 0.72, ...},
            "top3": [{"disease": "anaemia", "probability": 0.54}, ...],
            "top3_tuples": [("anaemia", 0.54), ...],
            "disease_names": ["anaemia", ...],
            "priors": {"anaemia": 0.54, ...},
        }
    """
    import sys as _sys
    _ml_dir = str(Path(__file__).resolve().parent.parent / "ml_modules")
    if _ml_dir not in _sys.path:
        _sys.path.insert(0, _ml_dir)

    from tongue_extractor import extract_tongue_features
    from eye_extractor import extract_eye_features
    from nail_extractor import extract_nail_features

    # --- Step 1: Extract features from images ---
    features: dict = {}

    print("\n[pipeline] Extracting tongue features...") if verbose else None
    try:
        tongue_feats = extract_tongue_features(tongue_img)
        features.update(tongue_feats)
        if verbose:
            for k, v in tongue_feats.items():
                print(f"  {k:<35} {v:.4f}")
    except Exception as e:
        print(f"[pipeline] ERROR (tongue): {e}")
        for c in FEATURE_COLUMNS:
            if c.startswith("tongue_"):
                features[c] = 0.0

    print("\n[pipeline] Extracting eye features...") if verbose else None
    try:
        eye_feats = extract_eye_features(eye_img)
        features.update(eye_feats)
        if verbose:
            for k, v in eye_feats.items():
                print(f"  {k:<35} {v:.4f}")
    except Exception as e:
        print(f"[pipeline] ERROR (eye): {e}")
        for c in FEATURE_COLUMNS:
            if c.startswith("eye_"):
                features[c] = 0.0

    print("\n[pipeline] Extracting nail features...") if verbose else None
    try:
        nail_feats = extract_nail_features(nail_img)
        features.update(nail_feats)
        if verbose:
            for k, v in nail_feats.items():
                print(f"  {k:<35} {v:.4f}")
    except Exception as e:
        print(f"[pipeline] ERROR (nail): {e}")
        for c in FEATURE_COLUMNS:
            if c.startswith("nail_"):
                features[c] = 0.0

    # --- Step 2: Validate ---
    is_valid, errors = validate_extractor_output(features)
    if not is_valid:
        print(f"[pipeline] Validation warnings: {errors}")

    # --- Step 3: Classify ---
    clf = classifier or VisualDiagnoseClassifier.load()
    top3 = clf.predict_top3(features)
    top3_tuples = clf.predict_top3_tuples(features)

    if verbose:
        print("\n" + "=" * 55)
        print("  PREDICTION RESULTS")
        print("=" * 55)
        for i, entry in enumerate(top3, 1):
            bar = "#" * int(entry["probability"] * 30)
            print(f"  #{i}  {entry['disease']:<20} {entry['probability']:.4f}  {bar}")
        print("=" * 55)

    return {
        "features": features,
        "top3": top3,
        "top3_tuples": top3_tuples,
        "disease_names": [entry["disease"] for entry in top3],
        "priors": {entry["disease"]: entry["probability"] for entry in top3},
    }


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _validate_dataframe(df: pd.DataFrame) -> None:
    missing_cols = [c for c in FEATURE_COLUMNS + [TARGET_COLUMN] if c not in df.columns]
    if missing_cols:
        raise ValueError(f"CSV missing columns: {missing_cols}")
    null_count = df[FEATURE_COLUMNS].isnull().sum().sum()
    if null_count > 0:
        raise ValueError(f"CSV has {null_count} null values in feature columns.")


def validate_extractor_output(features: dict) -> tuple[bool, list[str]]:
    """
    Call this in the backend before passing extractor output to the classifier.
    Returns (is_valid, list_of_errors).
    """
    errors: list[str] = []
    for col in FEATURE_COLUMNS:
        if col not in features:
            errors.append(f"Missing: {col}")
        elif not isinstance(features[col], (int, float)):
            errors.append(f"Non-numeric: {col} = {features[col]!r}")
        elif not (0.0 <= float(features[col]) <= 1.0):
            errors.append(f"Out of [0,1] range: {col} = {features[col]}")
    return (len(errors) == 0, errors)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VisualDiagnose XGBoost trainer")
    parser.add_argument("--train", action="store_true", help="Train and save the model")
    parser.add_argument("--data", type=str, default="Updated_synthetic.csv",
                        help="Path to training CSV")
    parser.add_argument("--demo", action="store_true",
                        help="Run a demo prediction after loading saved model")
    parser.add_argument("--no-eval", action="store_true",
                        help="Skip cross-validation (faster training)")
    parser.add_argument("--predict", action="store_true",
                        help="Run end-to-end prediction from images")
    parser.add_argument("--tongue", type=str, default=None,
                        help="Path to tongue image (for --predict)")
    parser.add_argument("--eye", type=str, default=None,
                        help="Path to eye image (for --predict)")
    parser.add_argument("--nail", type=str, default=None,
                        help="Path to nail image (for --predict)")
    args = parser.parse_args()

    if args.train:
        train(args.data, evaluate=not args.no_eval)

    if args.demo:
        clf = VisualDiagnoseClassifier.load()
        demo_features = {col: np.random.uniform(0, 1) for col in FEATURE_COLUMNS}
        result = run_classifier_pipeline(demo_features, clf)
        print("\n[demo] Pipeline output (dict format):")
        print(json.dumps(result["top3"], indent=2))
        print("\n[demo] Tuple format (-> build_question_prompt):")
        print(result["top3_tuples"])
        print("\n[demo] Priors (-> bayesian_update):")
        print(result["priors"])
        print("\n[demo] Feature importances (top-10):")
        fi = clf.feature_importances()
        for feat, score in list(fi.items())[:10]:
            print(f"  {feat:<35} {score:.4f}")

    if args.predict:
        # Default to sample images in ml_modules/
        ml_dir = Path(__file__).resolve().parent.parent / "ml_modules"
        tongue_path = args.tongue or str(ml_dir / "tongue.jpeg")
        eye_path    = args.eye    or str(ml_dir / "eye.jpeg")
        nail_path   = args.nail   or str(ml_dir / "nail.jpeg")

        print(f"\n[predict] Tongue: {tongue_path}")
        print(f"[predict] Eye:    {eye_path}")
        print(f"[predict] Nail:   {nail_path}")

        result = run_image_pipeline(tongue_path, eye_path, nail_path)

        print("\n[predict] Full result dict:")
        print(json.dumps(result["top3"], indent=2))