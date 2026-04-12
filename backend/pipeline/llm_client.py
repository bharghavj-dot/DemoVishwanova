"""
Trilens Pipeline — Gemini-Powered Q&A Question Generator
==========================================================
Calls Google Gemini (gemini-2.5-flash) to generate 9 clinical MCQ
questions based on the diagnosed disease. Falls back to offline
question bank if Gemini is unavailable or fails.

The generated questions are formatted to be directly compatible with
the existing Bayesian updater and QA router schemas.
"""

from __future__ import annotations

import json
import os
import re
import sys
import traceback
from pathlib import Path
from typing import Optional

# Add ml_modules to path (for offline fallback + DISPLAY_NAMES)
_ML_DIR = str(Path(__file__).resolve().parent.parent.parent / "ml_modules")
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

from llm_question_gen import _get_fallback_questions, DISPLAY_NAMES


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


# ── Gemini prompt ────────────────────────────────────────────────────────────

_GEMINI_SYSTEM_PROMPT = """\
You are a clinical diagnostic assistant. Based on the \
primary diagnosed condition, generate exactly 9 multiple \
choice questions to refine the diagnosis using Bayesian \
probability updating.

Rules:
- Each question must have exactly 4 options
- Options must map to these severity levels:
    A: key_symptom      (strongly confirms diagnosis)
    B: moderate_symptom (moderately confirms)
    C: possible_reason  (weakly related)
    D: not_relevant     (unrelated)
- Questions must cover: current symptoms, duration, \
family history, lifestyle, medication history, \
pain levels, sleep patterns, diet, recent changes
- Keep language simple, patient-friendly
- Return ONLY valid JSON, no markdown, no explanation

Return this exact JSON structure:
{
  "questions": [
    {
      "question_index": 0,
      "question_text": "How long have you been experiencing fatigue?",
      "options": [
        { "label": "A", "text": "More than 3 months continuously", "answer_type": "key_symptom" },
        { "label": "B", "text": "1-3 months occasionally", "answer_type": "moderate_symptom" },
        { "label": "C", "text": "Less than a month", "answer_type": "possible_reason" },
        { "label": "D", "text": "I have not experienced fatigue", "answer_type": "not_relevant" }
      ]
    }
  ]
}
"""


def _build_gemini_prompt(disease_name: str, confidence: float) -> str:
    """Build the user-facing Gemini prompt with disease context."""
    display = DISPLAY_NAMES.get(disease_name, disease_name.replace("_", " ").title())
    return (
        f"{_GEMINI_SYSTEM_PROMPT}\n"
        f"Primary diagnosed condition: {display}\n"
        f"Confidence score: {confidence:.2f}\n"
    )


# ── Gemini API call ──────────────────────────────────────────────────────────

def _call_gemini_api(prompt: str, session_id: str = "") -> str:
    """
    Call Google Gemini API and return the raw text response.
    Uses gemini-2.5-flash with 10 second timeout.
    """
    import google.generativeai as genai

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set in environment")

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
    )

    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=4096,
        ),
        request_options={"timeout": 10},
    )

    return response.text


# ── JSON parsing ─────────────────────────────────────────────────────────────

def _parse_gemini_response(raw: str) -> list[dict]:
    """
    Parse Gemini's JSON response into the list of question dicts.
    Handles markdown fences, trailing commas, and other LLM quirks.
    """
    text = raw.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
        text = text.strip()

    # Try direct parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "questions" in parsed:
            return parsed["questions"]
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    # Try to find a JSON object with "questions" key
    match = re.search(r"\{.*\"questions\".*\}", text, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, dict) and "questions" in parsed:
                return parsed["questions"]
        except json.JSONDecodeError:
            pass

    # Try to find a JSON array
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            # Try fixing trailing commas
            fixed = re.sub(r",\s*([}\]])", r"\1", match.group())
            try:
                parsed = json.loads(fixed)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass

    raise ValueError(
        f"Failed to parse Gemini response as JSON.\n"
        f"Raw response (first 500 chars):\n{raw[:500]}"
    )


# ── Format converter ─────────────────────────────────────────────────────────

def _convert_gemini_to_internal(
    gemini_questions: list[dict],
    disease_name: str,
) -> list[dict]:
    """
    Convert Gemini's question format to the internal format expected by
    the Bayesian updater and QA router schemas.

    Gemini format:
        {question_index, question_text, options: [{label, text, answer_type}]}

    Internal format:
        {question, primary_disease, answers: {key_symptom: {text}, ...}}
    """
    converted = []
    for q in gemini_questions:
        # Extract question text
        question_text = q.get("question_text", q.get("question", ""))

        # Convert options array → answers dict
        answers = {}
        options = q.get("options", [])
        for opt in options:
            answer_type = opt.get("answer_type", "")
            if answer_type in ("key_symptom", "moderate_symptom", "possible_reason", "not_relevant"):
                answers[answer_type] = {"text": opt.get("text", "")}

        # Ensure all 4 answer types exist
        for at in ("key_symptom", "moderate_symptom", "possible_reason", "not_relevant"):
            if at not in answers:
                answers[at] = {"text": ""}

        converted.append({
            "question": question_text,
            "primary_disease": disease_name,
            "answers": answers,
        })

    return converted


# ── Main public function ─────────────────────────────────────────────────────

async def generate_qa_questions(
    top3: list[tuple[str, float]],
) -> list[dict]:
    """
    Generate 9 clinical Q&A questions using Google Gemini AI.

    Uses the primary (top-1) disease from the XGBoost classification
    to generate disease-specific questions via Gemini 2.5 Flash.

    Falls back to offline question bank if Gemini is unavailable.

    Parameters
    ----------
    top3 : list of (disease_label, probability)
        From XGBoost classifier output.

    Returns
    -------
    list[dict] — 9 question dicts enriched with UI metadata.
    """
    if not top3:
        raise ValueError("top3 is empty — no classification results")

    # Primary disease = highest probability
    disease_name = top3[0][0]
    confidence = top3[0][1]
    display_name = DISPLAY_NAMES.get(disease_name, disease_name.replace("_", " ").title())

    # Check if Gemini key is available
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[llm_client] No GEMINI_API_KEY set. Using offline fallback.")
        return _enrich_questions(_get_fallback_questions(top3), disease_name)

    # Build prompt
    prompt = _build_gemini_prompt(disease_name, confidence)

    # Try Gemini with one automatic retry on malformed JSON
    max_attempts = 2
    for attempt in range(1, max_attempts + 1):
        try:
            print(f"[llm_client] Calling Gemini API for disease='{display_name}' "
                  f"confidence={confidence:.2f} (attempt {attempt}/{max_attempts})")

            raw = _call_gemini_api(prompt, session_id="")

            print(f"[llm_client] Gemini response received ({len(raw)} chars), parsing...")

            gemini_questions = _parse_gemini_response(raw)

            # Convert to internal format
            questions = _convert_gemini_to_internal(gemini_questions, disease_name)

            if len(questions) < 3:
                raise ValueError(f"Only {len(questions)} questions parsed, need at least 3")

            # Trim to exactly 9 if more were returned
            questions = questions[:9]

            print(f"[llm_client] ✓ {len(questions)} Gemini questions generated for {display_name}")
            for i, q in enumerate(questions):
                print(f"    Q{i+1}: {q['question'][:70]}...")

            return _enrich_questions(questions, disease_name)

        except json.JSONDecodeError as e:
            print(f"[llm_client] Malformed JSON from Gemini (attempt {attempt}): {e}")
            if attempt >= max_attempts:
                print("[llm_client] Retries exhausted. Falling back to offline.")
                return _enrich_questions(_get_fallback_questions(top3), disease_name)

        except Exception as e:
            print(f"[llm_client] Gemini API error (attempt {attempt}): {e}")
            traceback.print_exc()
            if attempt >= max_attempts:
                print("[llm_client] Falling back to offline question bank.")
                return _enrich_questions(_get_fallback_questions(top3), disease_name)

    # Should not reach here, but fallback just in case
    return _enrich_questions(_get_fallback_questions(top3), disease_name)


# ── Enrichment helper ────────────────────────────────────────────────────────

def _enrich_questions(questions: list[dict], primary_disease: str) -> list[dict]:
    """Add UI metadata (why_asking, clinical_insight) to each question."""
    display_name = DISPLAY_NAMES.get(primary_disease, primary_disease.replace("_", " ").title())

    enriched = []
    for i, q in enumerate(questions):
        disease = q.get("primary_disease", primary_disease)
        q_enriched = {
            **q,
            "index": i,
            "why_asking": _WHY_ASKING.get(
                disease,
                f"This helps refine the diagnostic accuracy for {display_name}.",
            ),
            "clinical_insight": f"Symptom correlation analysis for {display_name}",
        }
        enriched.append(q_enriched)

    return enriched
