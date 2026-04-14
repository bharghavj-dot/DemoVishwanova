"""
Trilens Router — Voice Agent (Twilio + Gemini Voice Consult)
==============================================================
Endpoints:
    POST /voice/{session_id}/initiate   — Start outbound call via Twilio
    POST /voice/incoming                — Twilio webhook → returns TwiML
    WS   /voice/stream                  — Bi-directional audio bridge
    POST /voice/status                  — Twilio status callback (hang-up detection)
    GET  /voice/{session_id}/status     — Poll voice consult status from frontend
    POST /voice/{session_id}/skip       — Skip voice consult → finalize immediately
"""

from __future__ import annotations

import os
import json
import traceback
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.database import get_db, SessionLocal
from backend.models import crud
from backend.models.schemas import (
    VoiceConsultInitRequest,
    VoiceConsultInitResponse,
    VoiceConsultStatusResponse,
)
from backend.pipeline.bayesian_client import apply_voice_update, generate_final_output
from backend.pipeline.voice_llm_client import (
    VoiceLLMBridge,
    generate_post_call_summary,
    get_bridge,
)
from backend.routers.auth import get_current_user_dep

router = APIRouter(prefix="/voice", tags=["Voice Consult"])


# ── POST /voice/{session_id}/initiate ─────────────────────────────────────────

@router.post("/{session_id}/initiate", response_model=VoiceConsultInitResponse)
async def initiate_voice_consult(
    session_id: str,
    req: VoiceConsultInitRequest,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Initiate an outbound Twilio call to the patient for voice consultation.
    Called by the frontend after the MCQ Q&A is complete.
    """
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Session belongs to another user")

    if session.status not in ("pending_voice", "qa_completed"):
        raise HTTPException(
            status_code=400,
            detail=f"Session must be in 'pending_voice' state. Current: {session.status}",
        )

    # Validate Twilio credentials
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    twilio_number = os.environ.get("TWILIO_PHONE_NUMBER")
    webhook_base = os.environ.get("TWILIO_WEBHOOK_BASE_URL", "").rstrip("/")

    # Ensure URL is absolute to prevent Twilio HTTP -> HTTPS redirect loss
    if webhook_base and not webhook_base.startswith("http"):
        webhook_base = f"https://{webhook_base}"

    if not all([account_sid, auth_token, twilio_number, webhook_base]):
        raise HTTPException(
            status_code=503,
            detail="Twilio is not configured. Please set TWILIO_ACCOUNT_SID, "
                   "TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, and TWILIO_WEBHOOK_BASE_URL.",
        )

    # Save phone number to user profile if not already saved
    user_obj = crud.get_user_by_id(db, user["id"])
    if user_obj and not user_obj.phone_number:
        user_obj.phone_number = req.phone_number
        db.commit()

    # Create outbound call via Twilio REST API
    try:
        from twilio.rest import Client

        client = Client(account_sid, auth_token)

        call = client.calls.create(
            to=req.phone_number,
            from_=twilio_number,
            url=f"{webhook_base}/voice/incoming?session_id={session_id}",
            status_callback=f"{webhook_base}/voice/status?session_id={session_id}",
            status_callback_event=["initiated", "ringing", "answered", "completed"],
            status_callback_method="POST",
        )

        # Update session with call SID and status
        crud.update_session(
            db, session,
            call_sid=call.sid,
            voice_status="pending",
        )

        print(f"[voice_agent] Outbound call initiated: {call.sid} → {req.phone_number}")

        return VoiceConsultInitResponse(
            session_id=session_id,
            call_sid=call.sid,
            status="pending",
            message="Call initiated. You will receive a call shortly.",
        )

    except Exception as e:
        print(f"[voice_agent] Twilio call error: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"Failed to initiate Twilio call: {str(e)}",
        )


# ── POST /voice/incoming — Twilio Webhook ────────────────────────────────────

@router.post("/incoming")
@router.get("/incoming")
async def twilio_incoming_webhook(session_id: str):
    """
    Twilio hits this webhook when the call is answered.
    Returns TwiML with an interactive voice consultation.
    """
    # Interactive mode: Allow user to speak and respond
    twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" timeout="60" speechTimeout="2" action="/voice/gather" method="POST">
        <Say voice="alice">
            Hello! This is the Trilens AI Health Assistant.
            Thank you for completing your consultation.
            Please tell me briefly about any symptoms you're experiencing,
            or say 'no symptoms' if you're feeling well.
            You can speak at any time.
        </Say>
    </Gather>
    <Say voice="alice">
        I didn't hear anything. Your doctor will review your results.
        Goodbye.
    </Say>
    <Hangup/>
</Response>"""

    print(f"[voice_agent] Interactive voice call started for session {session_id}")

    return Response(
        content=twiml,
        media_type="text/xml",
        status_code=200
    )


# ── POST /voice/gather — Handle User Speech Input ───────────────────────────

@router.post("/gather")
@router.get("/gather")
async def twilio_gather_speech(request: Request):
    """
    Handle speech input from the user during voice consultation.
    """
    form_data = await request.form()
    speech_result = form_data.get("SpeechResult", "").strip()
    confidence = form_data.get("Confidence", "0")
    session_id = request.query_params.get("session_id", "")

    print(f"[voice_agent] Speech received for session {session_id}: '{speech_result}' (confidence: {confidence})")

    # Process the user's speech
    if speech_result:
        # Save the speech to database
        db = SessionLocal()
        try:
            session = crud.get_session(db, session_id)
            if session:
                # Create a simple transcript
                transcript = [{
                    "role": "patient",
                    "text": speech_result,
                    "timestamp": datetime.now().isoformat() + "Z"
                }]

                crud.update_session(
                    db, session,
                    call_transcript=transcript,
                    voice_status="completed"
                )
                print(f"[voice_agent] Speech saved to session {session_id}")
        except Exception as e:
            print(f"[voice_agent] Error saving speech: {e}")
        finally:
            db.close()

        # Respond based on what they said
        if "symptom" in speech_result.lower() or "pain" in speech_result.lower() or "hurt" in speech_result.lower():
            response_text = "Thank you for sharing that information. Your doctor will review your symptoms along with your consultation results."
        elif "no" in speech_result.lower() and "symptom" in speech_result.lower():
            response_text = "Good to hear you're feeling well. Your doctor will still review your consultation results."
        else:
            response_text = "Thank you for that information. Your doctor will review everything and contact you if needed."
    else:
        response_text = "I didn't catch that clearly. Your doctor will review your consultation results."

    # Return TwiML response
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        {response_text}
        Goodbye.
    </Say>
    <Hangup/>
</Response>"""

    return Response(
        content=twiml,
        media_type="text/xml",
        status_code=200
    )


# ── WebSocket /voice/stream — DISABLED (Using simple mode) ──────────────────

# @router.websocket("/stream")
# async def voice_stream_websocket(
#     websocket: WebSocket,
# ):
#     """
#     DISABLED: Using simple TwiML mode instead for reliability.
#     """
#     await websocket.close(code=1000, reason="Simple mode enabled")
#     return


# ── POST /voice/status — Twilio Status Callback ─────────────────────────────

@router.post("/status")
async def twilio_status_callback(request: Request):
    """
    Twilio calls this when the call status changes.
    On 'completed', triggers post-call analysis and report finalization.
    """
    form_data = await request.form()
    call_status = form_data.get("CallStatus", "")
    call_sid = form_data.get("CallSid", "")
    session_id = request.query_params.get("session_id", "")

    print(f"[voice_agent] Status callback: {call_status} for session {session_id} (SID: {call_sid})")

    if call_status == "completed" and session_id:
        # Call completed successfully - finalize immediately (simple mode)
        print(f"[voice_agent] Call completed for session {session_id} - finalizing")
        db = SessionLocal()
        try:
            session = crud.get_session(db, session_id)
            if session:
                # Finalize with existing MCQ probabilities (simple voice consult)
                updated_probs = session.qa_probabilities or session.priors or {}
                final_output = session.final_output or generate_final_output(updated_probs)

                crud.update_session(
                    db, session,
                    status="finalized",
                    voice_status="completed",
                    final_output=final_output,
                )

                # Finalize the report
                report = crud.get_report_by_session(db, session_id)
                if report:
                    ranked = sorted(updated_probs.items(), key=lambda x: x[1], reverse=True)
                    crud.finalize_report(
                        db, report,
                        final_data=final_output,
                        primary_disease=ranked[0][0] if ranked else report.primary_disease,
                        confidence=ranked[0][1] if ranked else report.confidence,
                        severity=final_output.get("severity", report.severity),
                    )

                print(f"[voice_agent] ✓ Session {session_id} finalized after voice call")

        except Exception as e:
            print(f"[voice_agent] Finalization error: {e}")
            traceback.print_exc()
        finally:
            db.close()

    elif call_status in ("busy", "no-answer", "failed", "canceled"):
        # Call failed — revert to allowing skip
        db = SessionLocal()
        try:
            session = crud.get_session(db, session_id)
            if session:
                crud.update_session(
                    db, session,
                    voice_status="none",
                    status="pending_voice",
                )
        finally:
            db.close()

    return Response(content="<Response/>", media_type="application/xml")


# ── GET /voice/{session_id}/status — Frontend Polling ────────────────────────

@router.get("/{session_id}/status", response_model=VoiceConsultStatusResponse)
async def get_voice_consult_status(
    session_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """Poll the current voice consult status (used by frontend for real-time updates)."""
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Session belongs to another user")

    return VoiceConsultStatusResponse(
        session_id=session_id,
        voice_status=session.voice_status or "none",
        call_sid=session.call_sid,
        transcript=session.call_transcript,
        voice_analysis=session.voice_analysis,
    )


# ── POST /voice/{session_id}/skip — Skip Voice Consult ──────────────────────

@router.post("/{session_id}/skip")
async def skip_voice_consult(
    session_id: str,
    user: dict = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    """
    Skip the voice consult and finalize the report with MCQ-only probabilities.
    This is the same finalization logic that was previously in qa.py.
    """
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Session belongs to another user")

    if session.status not in ("pending_voice", "qa_completed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot skip voice consult in state '{session.status}'",
        )

    # Finalize with existing MCQ probabilities (no voice adjustment)
    updated_probs = session.qa_probabilities or session.priors or {}
    final_output = session.final_output or generate_final_output(updated_probs)

    crud.update_session(
        db, session,
        status="finalized",
        voice_status="skipped",
        final_output=final_output,
    )

    # Finalize the report
    report = crud.get_report_by_session(db, session_id)
    if report:
        ranked = sorted(updated_probs.items(), key=lambda x: x[1], reverse=True)
        crud.finalize_report(
            db, report,
            final_data=final_output,
            primary_disease=ranked[0][0] if ranked else report.primary_disease,
            confidence=ranked[0][1] if ranked else report.confidence,
            severity=final_output.get("severity", report.severity),
        )

    print(f"[voice_agent] Voice consult skipped for session {session_id}, report finalized")

    return {
        "session_id": session_id,
        "status": "finalized",
        "message": "Voice consult skipped. Report finalized with Q&A results.",
    }


# ── Internal: Post-Call Finalization ─────────────────────────────────────────

async def _finalize_voice_consult(session_id: str):
    """
    Run after the phone call ends:
    1. Generate clinical summary from transcript
    2. Apply voice-based probability adjustments
    3. Finalize the report with combined data
    """
    db = SessionLocal()
    try:
        session = crud.get_session(db, session_id)
        if not session:
            print(f"[voice_agent] Session {session_id} not found for finalization")
            return

        transcript = session.call_transcript or []
        current_probs = session.qa_probabilities or session.priors or {}

        if not transcript:
            print(f"[voice_agent] No transcript found, skipping voice analysis")
            # Finalize without voice adjustments
            final_output = session.final_output or generate_final_output(current_probs)
            crud.update_session(
                db, session,
                status="finalized",
                voice_status="completed",
                final_output=final_output,
            )
            _finalize_report(db, session, current_probs, final_output, transcript=[], voice_analysis=None)
            return

        # 1. Generate post-call summary
        print(f"[voice_agent] Generating post-call summary for session {session_id}...")
        voice_analysis = await generate_post_call_summary(transcript, current_probs)

        # 2. Apply voice-based probability adjustments
        adjusted_probs = apply_voice_update(current_probs, voice_analysis)

        # 3. Generate final output with adjusted probabilities
        final_output = generate_final_output(adjusted_probs)

        # 4. Update session
        crud.update_session(
            db, session,
            voice_analysis=voice_analysis,
            qa_probabilities=adjusted_probs,
            final_output=final_output,
            status="finalized",
            voice_status="completed",
        )

        # 5. Finalize report
        _finalize_report(db, session, adjusted_probs, final_output, transcript, voice_analysis)

        print(f"[voice_agent] ✓ Voice consult finalized for session {session_id}")
        print(f"    Transcript entries: {len(transcript)}")
        print(f"    Summary: {voice_analysis.get('clinical_summary', 'N/A')[:100]}...")

    except Exception as e:
        print(f"[voice_agent] Finalization error: {e}")
        traceback.print_exc()
        # Still mark as completed even if analysis fails
        try:
            session = crud.get_session(db, session_id)
            if session:
                final_output = session.final_output or generate_final_output(
                    session.qa_probabilities or session.priors or {}
                )
                crud.update_session(db, session, status="finalized", voice_status="completed")
                _finalize_report(
                    db, session,
                    session.qa_probabilities or session.priors or {},
                    final_output,
                    session.call_transcript or [],
                    None,
                )
        except Exception:
            pass
    finally:
        db.close()


def _finalize_report(
    db: Session,
    session,
    probs: dict,
    final_output: dict,
    transcript: list,
    voice_analysis: dict | None,
):
    """Helper to finalize the report with all data."""
    report = crud.get_report_by_session(db, session.id)
    if not report:
        return

    ranked = sorted(probs.items(), key=lambda x: x[1], reverse=True)

    report.is_final = True
    report.final_data = final_output
    report.finalized_at = datetime.utcnow()
    report.primary_disease = ranked[0][0] if ranked else report.primary_disease
    report.confidence = ranked[0][1] if ranked else report.confidence
    report.severity = final_output.get("severity", report.severity)
    report.call_transcript = transcript if transcript else None
    report.voice_analysis = voice_analysis

    db.commit()
    db.refresh(report)
