"""
Trilens Router — Q&A (Clinical Questions & Answers) (PostgreSQL)
==================================================================
Endpoints: POST /qa/{session_id}/start, GET /qa/{session_id}/questions,
           POST /qa/{session_id}/answer, GET /qa/{session_id}/status
Matches Q&A.png page.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import crud
from backend.models.schemas import (
    AnswerOption,
    QAAnswerRequest,
    QAAnswerResponse,
    QAStartResponse,
    QAStatusResponse,
    QuestionItem,
)
from backend.pipeline.bayesian_client import apply_bayesian_update, generate_final_output
from backend.pipeline.llm_client import generate_qa_questions
from backend.routers.auth import get_current_user_dep

router = APIRouter(prefix="/qa", tags=["Clinical Q&A"])


# ── POST /qa/{session_id}/start ───────────────────────────────────────────────

@router.post("/{session_id}/start", response_model=QAStartResponse)
async def start_qa(
    session_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Trigger LLM question generation for a diagnostic session."""
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Session belongs to another user")

    if session.status not in ("analyzed",):
        if session.questions:
            return _build_qa_response(session_id, session)
        raise HTTPException(
            status_code=400,
            detail="Session must be in 'analyzed' state to start Q&A. Run /scan/analyze first.",
        )

    top3_tuples = session.top3_tuples or []
    if not top3_tuples:
        raise HTTPException(status_code=400, detail="No classification results found.")

    questions = await generate_qa_questions(top3_tuples)

    crud.update_session(
        db, session,
        questions=questions,
        answers={},
        qa_probabilities=dict(session.priors or {}),
        status="qa_started"
    )

    return _build_qa_response(session_id, session)


# ── GET /qa/{session_id}/questions ────────────────────────────────────────────

@router.get("/{session_id}/questions", response_model=QAStartResponse)
async def get_questions(
    session_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Get all questions for the Q&A session."""
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Session belongs to another user")

    if not session.questions:
        raise HTTPException(
            status_code=400,
            detail="Q&A not started. Call POST /qa/{session_id}/start first.",
        )

    return _build_qa_response(session_id, session)


# ── POST /qa/{session_id}/answer ──────────────────────────────────────────────

@router.post("/{session_id}/answer", response_model=QAAnswerResponse)
async def submit_answer(
    session_id: str,
    req: QAAnswerRequest,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Submit an answer for one question. Runs Bayesian update immediately."""
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Session belongs to another user")

    questions = session.questions or []
    if not questions:
        raise HTTPException(status_code=400, detail="Q&A not started")

    if req.question_index < 0 or req.question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Invalid question index")

    current_probs = session.qa_probabilities or dict(session.priors or {})
    question = questions[req.question_index]

    updated_probs, ruled_out = apply_bayesian_update(
        current_probs=current_probs,
        question=question,
        answer_type=req.answer_type.value,
    )

    # Update session answers
    new_answers = dict(session.answers or {})
    new_answers[str(req.question_index)] = req.answer_type.value

    is_complete = len(new_answers) >= len(questions)

    if is_complete:
        final_output = generate_final_output(updated_probs)
        crud.update_session(
            db, session,
            answers=new_answers,
            qa_probabilities=updated_probs,
            status="pending_voice",
            final_output=final_output
        )
        # NOTE: Report finalization is now deferred to the voice consult phase.
        # The report is finalized either by:
        #   POST /voice/{session_id}/skip   — user skips voice consult
        #   POST /voice/status              — call completed callback
    else:
        crud.update_session(
            db, session,
            answers=new_answers,
            qa_probabilities=updated_probs
        )

    return QAAnswerResponse(
        session_id=session_id,
        question_index=req.question_index,
        current_step=len(new_answers),
        total_steps=len(questions),
        updated_probabilities=updated_probs,
        is_complete=is_complete,
        ruled_out=ruled_out,
    )


# ── GET /qa/{session_id}/status ───────────────────────────────────────────────

@router.get("/{session_id}/status", response_model=QAStatusResponse)
async def get_qa_status(
    session_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Get Q&A progress for a session."""
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Session belongs to another user")

    answers = session.answers or {}
    questions = session.questions or []
    qa_probs = session.qa_probabilities or (session.priors or {})

    return QAStatusResponse(
        session_id=session_id,
        current_step=len(answers),
        total_steps=len(questions),
        is_complete=len(answers) >= len(questions) and len(questions) > 0,
        answered_indices=[int(k) for k in answers.keys()],
        probabilities=qa_probs,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_qa_response(session_id: str, session) -> QAStartResponse:
    questions = session.questions or []
    question_items = []
    for i, q in enumerate(questions):
        answers_dict = {}
        for key in ["key_symptom", "moderate_symptom", "possible_reason", "not_relevant"]:
            ans = q.get("answers", {}).get(key, {})
            text = ans.get("text", "") if isinstance(ans, dict) else str(ans)
            answers_dict[key] = AnswerOption(text=text)

        question_items.append(QuestionItem(
            index=i,
            question=q.get("question", ""),
            primary_disease=q.get("primary_disease", ""),
            answers=answers_dict,
            why_asking=q.get("why_asking"),
            clinical_insight=q.get("clinical_insight"),
        ))

    return QAStartResponse(
        session_id=session_id,
        total_questions=len(question_items),
        questions=question_items,
    )
