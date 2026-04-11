# VisualDiagnose — Architecture 1
### Sorted Arrays · Hackathon Build Document

---

## Overview

A three-stage diagnostic pipeline that takes close-up images of the tongue, eyes, and nails
as input and outputs a ranked disease probability with an interactive Bayesian refinement
layer driven by an LLM.

```
Input Images
    │
    ├── Tongue extractor
    ├── Eye extractor        →  Feature merger (27 columns)  →  XGBoost  →  Top 3 diseases
    └── Nail extractor
                                                                               │
                                                          ┌────────────────────┘
                                                          │
                                                   Bayesian Updater
                                                   + LLM Question Layer
                                                          │
                                                   Final diagnosis output
```

---

## Stage 1 — Feature Extraction

Three independent OpenCV extractors run on CPU. Each image is captured separately
(tongue photograph, eye close-up, nail close-up). All values are normalised to `[0, 1]`.

### Tongue extractor — 6 active features

| Feature | Method |
|---|---|
| `tongue_color_r/g/b` | Mean BGR of segmented tongue ROI |
| `tongue_pallor` | `1 - mean HSV saturation` inside ROI |
| `tongue_coating_thickness` | Fraction of low-S, high-V pixels inside ROI |
| `tongue_surface_smoothness` | `1 - Laplacian variance / (variance + 500)` |

Stripped features output as `0.0` to preserve the 27-column schema:
`tongue_moisture`, `tongue_crack_density`, `tongue_fur_color`

### Eye extractor — 5 active features

| Feature | Method |
|---|---|
| `eye_sclera_redness` | Mean `R − G` in sclera ring mask |
| `eye_sclera_yellow` | `1 - mean Cb` in YCrCb sclera region |
| `eye_conjunctiva_pallor` | `1 - saturation` of lower-iris strip |
| `eye_pupil_symmetry` | Ratio of two HoughCircle radii (or ellipse fit) |
| `eye_cornea_clarity` | Laplacian sharpness inside iris circle |

Stripped: `eye_lid_color`, `eye_discharge_present`

### Nail extractor — 8 active features

| Feature | Method |
|---|---|
| `nail_color_r/g/b` | Mean BGR of segmented nail ROI |
| `nail_pallor` | `1 - mean HSV saturation` inside ROI |
| `nail_discoloration` | Hue deviation from healthy pink (~10° in OpenCV scale) |
| `nail_ridge_score` | Mean Gabor bank response (4 orientations) |
| `nail_shape_abnormality` | `1 - IoU(contour, fitted ellipse)` |
| `nail_lunula_visibility` | White-crescent fraction in proximal 20% of nail |

Stripped: `nail_clubbing_ratio`, `nail_pitting_count`, `nail_brittleness`

### Feature merger

`feature_merger.py` calls all three extractors and assembles a single-row DataFrame
in the exact training column order. Output is a `(1, 27)` numpy array passed directly
to the XGBoost model.

```python
X = get_numpy_vector("tongue.jpg", "eye.jpg", "nail.jpg")   # shape (1, 27)
```

---

## Stage 2 — XGBoost Classification

A single XGBoost classifier trained on the full 27-feature vector predicts disease
probabilities across all classes (including `healthy`).

### Getting top 3 probabilities

```python
probs_array = model.predict_proba(X)[0]          # shape: (n_classes,)
top3_idx    = probs_array.argsort()[::-1][:3]

top3 = [
    (model.classes_[i], float(probs_array[i]))
    for i in top3_idx
]
# → [("anaemia", 0.72), ("diabetes", 0.43), ("liver_disease", 0.31)]
```

The top 3 `(disease, probability)` pairs are the sole input to Stage 3.
The healthy label participates equally — if it appears in the top 3 it enters
the Bayesian verification path (see Fix 3 below).

---

## Stage 3 — Bayesian Updater + LLM Question Layer

### 3.1 Question generation  *(Fix 2 applied)*

All questions are generated in a **single LLM call** that receives all three disease
names simultaneously. The prompt enforces a uniqueness rule so no symptom appears
in more than one question. Each question carries a relevance weight for all three
diseases so a single user answer updates all three probabilities at once.

The `relevance_to` block and `primary_disease` field are always built dynamically
from whatever top 3 diseases XGBoost returns — they are never hardcoded. The full
set of diseases the model can output is:

| Label | Disease |
|---|---|
| `anaemia` | Anaemia |
| `cyanosis` | Cyanosis |
| `diabetes` | Diabetes |
| `hypothyroidism` | Hypothyroidism |
| `iron_deficiency` | Iron deficiency |
| `jaundice` | Jaundice |
| `liver_disease` | Liver disease |
| `psoriasis` | Psoriasis (eye manifestation) |
| `healthy` | Healthy |

```python
SUPPORTED_DISEASES = [
    "anaemia", "cyanosis", "diabetes", "hypothyroidism",
    "iron_deficiency", "jaundice", "liver_disease", "psoriasis", "healthy",
]

def build_question_prompt(top3: list[tuple[str, float]]) -> tuple[str, str]:
    """
    top3 : [("anaemia", 0.72), ("diabetes", 0.43), ("jaundice", 0.31)]
    Returns (system_prompt, user_msg) ready to send to the LLM.
    """
    d1, d2, d3 = [d for d, _ in top3]

    # relevance_to template is injected with the actual top-3 names at runtime
    relevance_template = (
        f'"{d1}": <0.0–0.40>,\n'
        f'        "{d2}": <0.0–0.40>,\n'
        f'        "{d3}": <0.0–0.40>'
    )

    system_prompt = f"""
You are a medical diagnostic assistant.
The patient's visual scan has flagged these three conditions as most likely:
  1. {d1}
  2. {d2}
  3. {d3}

Generate exactly 9 MCQ questions to refine this diagnosis.

RULES:
- No two questions may ask about the same symptom or body system.
- If a symptom overlaps multiple conditions assign it to the most specific one.
- Cover all three conditions (3 questions each as a starting allocation).
- Return JSON only — no preamble, no markdown fences.

JSON schema (repeat the object 9 times inside the array):
{{
  "questions": [
    {{
      "question": "<question text>",
      "primary_disease": "<{d1} | {d2} | {d3}>",
      "answers": {{
        "key_symptom":      {{"text": "<answer text>", "weight": 0.40}},
        "moderate_symptom": {{"text": "<answer text>", "weight": 0.30}},
        "possible_reason":  {{"text": "<answer text>", "weight": 0.15}},
        "not_relevant":     {{"text": "<answer text>", "weight": 0.00}}
      }},
      "relevance_to": {{
        {relevance_template}
      }}
    }}
  ]
}}
"""
    user_msg = (
        f"Patient top-3 conditions: {d1}, {d2}, {d3}. "
        "Generate 9 unique non-overlapping diagnostic questions."
    )
    return system_prompt, user_msg
```

Calling it:

```python
system_prompt, user_msg = build_question_prompt(top3)
# top3 is whatever XGBoost returned — no disease names are ever hardcoded here
```

### 3.2 Update weight tables  *(Fix 3 applied)*

Two separate weight tables are defined. The correct table is selected per disease label
at update time. The healthy label uses the inverted table because confirming a symptom
should decrease the healthy probability, not increase it.

```python
DISEASE_WEIGHTS = {
    "key_symptom":      0.40,
    "moderate_symptom": 0.30,
    "possible_reason":  0.15,
    "not_relevant":     0.00,
}

HEALTHY_WEIGHTS = {
    "key_symptom":      0.00,   # symptom confirmed → healthy less likely
    "moderate_symptom": 0.15,
    "possible_reason":  0.30,
    "not_relevant":     0.40,   # no symptom → healthy more likely
}

def get_likelihood(answer_type: str, disease: str) -> float:
    if disease == "healthy":
        return HEALTHY_WEIGHTS[answer_type]
    return DISEASE_WEIGHTS[answer_type]
```

### 3.3 Bayesian update with renormalisation  *(Fix 1 applied)*

After every single answer the updated probabilities are divided by their sum.
This guarantees the three values always sum to 1.0 and can be reported to the
user as valid percentages.

```python
def bayesian_update(probs: dict, likelihoods: dict) -> dict:
    updated = {d: probs[d] * likelihoods[d] for d in probs}
    total   = sum(updated.values())
    if total == 0:
        return probs                             # guard: keep old probs on zero
    return {d: p / total for d, p in updated.items()}
```

### 3.4 Early exit for ruled-out diseases  *(Fix 4 applied)*

After each Bayesian update, any disease whose probability has fallen below the
cutoff threshold is removed from the active question pool. Its remaining questions
are silently skipped. This keeps the demo interaction at 5–7 questions instead
of a fixed 9.

```python
CUTOFF = 0.08

active_diseases = set(probs.keys())

for question in questions:
    if question["primary_disease"] not in active_diseases:
        continue

    answer_type = present_question_to_user(question)

    likelihoods = {
        d: get_likelihood(answer_type, d)
        for d in probs
    }
    probs = bayesian_update(probs, likelihoods)

    for d, p in list(probs.items()):
        if p < CUTOFF:
            active_diseases.discard(d)
```

### 3.5 Full question loop

```python
# initialise from XGBoost output
probs = {disease: prob for disease, prob in top3}

# generate all questions in one LLM call
questions = generate_deduplicated_questions(top3, llm_client)

active_diseases = set(probs.keys())

for question in questions:
    if question["primary_disease"] not in active_diseases:
        continue

    answer_type = present_question_to_user(question)

    likelihoods = {d: get_likelihood(answer_type, d) for d in probs}
    probs = bayesian_update(probs, likelihoods)

    for d, p in list(probs.items()):
        if p < CUTOFF:
            active_diseases.discard(d)

# final output
top_disease = max(probs, key=probs.get)
print(f"Most likely diagnosis: {top_disease} ({probs[top_disease]:.0%})")
```

---

## Healthy label — special path

The `healthy` label is treated as a first-class class by XGBoost and can appear in
the top 3 output. When it does, the Bayesian layer enters verification mode:

- Questions are framed as symptom checks ("Do you experience X?")
- The `HEALTHY_WEIGHTS` table is used for the healthy label
- `DISEASE_WEIGHTS` is used for any co-occurring disease labels as normal
- If healthy survives with the highest probability after all questions, the output
  confirms the user is healthy with a recommendation to maintain current habits

---

## Output format

```
Based on your images and responses, the most likely condition is:

  Anaemia — 74%

Other considerations:
  Diabetes      — 16%
  Liver disease —  9%  (ruled out early)

Note: This is a screening tool only. Please consult a medical professional
for a confirmed diagnosis.
```

---

## Flaw fix summary

| # | Flaw | Where fixed |
|---|------|-------------|
| 1 | Probabilities not renormalised → exceed 1.0 | `bayesian_update()` — divide by sum after every step |
| 2 | Duplicate symptom questions across diseases | Single LLM call with uniqueness constraint in prompt |
| 3 | Healthy path uses disease-positive weights | `HEALTHY_WEIGHTS` table + `get_likelihood()` selector |
| 4 | Eliminated diseases still receive questions | Early-exit threshold check after each update |

No new pipeline stage, model, or external service was introduced for any fix.

---

## File structure

```
visualdiagnose/
├── tongue_extractor.py      # Stage 1 — tongue features
├── eye_extractor.py         # Stage 1 — eye features
├── nail_extractor.py        # Stage 1 — nail features
├── feature_merger.py        # Stage 1 — assembles 27-column vector
├── predict.py               # Stage 2 — XGBoost inference
├── bayesian_updater.py      # Stage 3 — update + renormalise + early exit
├── llm_questions.py         # Stage 3 — single-call question generation
├── main.py                  # Entry point — orchestrates all stages
└── model/
    └── xgboost_model.pkl    # Trained classifier
```
