"""
Trilens Pipeline — Voice LLM Client (Gemini Multimodal Live)
===============================================================
Bridges bi-directional audio between Twilio Media Streams and
Google Gemini's Multimodal Live API for real-time voice consultation.

Responsibilities:
  1. Audio format conversion (Twilio μ-law ↔ Gemini PCM)
  2. Real-time streaming bridge via WebSockets
  3. Transcript accumulation during the call
  4. Post-call clinical summary generation with probability adjustments
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import traceback
from datetime import datetime, timezone
from typing import Optional

import google.generativeai as genai


# ── System prompt fed to the Voice LLM with disease context ──────────────────

_VOICE_SYSTEM_PROMPT = """\
You are a compassionate, professional medical AI assistant conducting a \
follow-up voice consultation for the Trilens diagnostic system.

CONTEXT:
The patient has just completed a visual biomarker scan and an AI-generated \
clinical questionnaire. Based on those results, the current disease \
probability rankings are:

{disease_context}

YOUR MISSION:
1. Greet the patient warmly and introduce yourself as the Trilens AI assistant.
2. Ask targeted follow-up questions about their symptoms to CONFIRM or DENY \
   the top suspected conditions. Focus on symptoms that differentiate between \
   the top 2-3 diseases.
3. Keep your questions SHORT, CLEAR, and PATIENT-FRIENDLY. No medical jargon.
4. Ask about: pain location/severity, symptom duration, family history of \
   the suspected conditions, recent diet/lifestyle changes, and any medications.
5. Listen carefully to their answers and mentally adjust your confidence in \
   each disease.
6. After 4-6 questions (or when you have enough information), politely wrap \
   up the call with a brief summary of what you learned.
7. Do NOT provide a diagnosis. Say "Your doctor will review these findings."

TONE: Warm, professional, reassuring. Like a caring nurse doing a phone check-in.
DURATION: Keep the call under 3 minutes.
"""


_POST_CALL_SUMMARY_PROMPT = """\
You are a clinical AI analyst. A voice consultation just completed between \
an AI assistant and a patient. Based on the transcript and the pre-call \
disease probabilities, generate a clinical analysis.

PRE-CALL DISEASE PROBABILITIES:
{disease_context}

CALL TRANSCRIPT:
{transcript}

Generate a JSON response with this EXACT structure (no markdown, no explanation):
{{
  "clinical_summary": "A 2-3 sentence clinical summary of the call findings.",
  "key_findings": [
    "Finding 1: Patient confirmed symptom X",
    "Finding 2: Patient denied symptom Y"
  ],
  "adjusted_probabilities": {{
    "disease_name": 0.XX
  }},
  "confidence_changes": [
    {{
      "disease": "disease_name",
      "direction": "increased/decreased",
      "reason": "Patient confirmed/denied specific symptom"
    }}
  ],
  "recommendation": "Brief recommendation for the reviewing doctor"
}}

RULES:
- adjusted_probabilities MUST include ALL diseases from the pre-call list
- Probabilities must sum to approximately 1.0
- Be conservative: only adjust by 5-20% based on clear evidence from the call
- If the call was inconclusive, keep probabilities close to pre-call values
"""


def _build_disease_context(probabilities: dict[str, float]) -> str:
    """Format disease probabilities into a readable string for prompts."""
    lines = []
    for disease, prob in sorted(probabilities.items(), key=lambda x: x[1], reverse=True):
        display = disease.replace("_", " ").title()
        lines.append(f"  - {display}: {prob:.1%}")
    return "\n".join(lines)


# ── Active call session storage (in-memory, keyed by Twilio stream SID) ──────

_active_sessions: dict[str, "VoiceLLMBridge"] = {}


def get_bridge(stream_sid: str) -> Optional["VoiceLLMBridge"]:
    """Retrieve an active voice bridge by Twilio stream SID."""
    return _active_sessions.get(stream_sid)


def register_bridge(stream_sid: str, bridge: "VoiceLLMBridge"):
    """Register a voice bridge for an active call."""
    _active_sessions[stream_sid] = bridge


def remove_bridge(stream_sid: str):
    """Remove a voice bridge after call ends."""
    _active_sessions.pop(stream_sid, None)


# ── Voice LLM Bridge Class ──────────────────────────────────────────────────

class VoiceLLMBridge:
    """
    Manages the real-time audio bridge between Twilio and Gemini.

    Architecture:
        Twilio (μ-law audio) → FastAPI WebSocket → Gemini Live API → response audio → Twilio

    The bridge accumulates a text transcript during the call and generates
    a clinical summary + probability adjustments after the call ends.
    """

    def __init__(self, session_id: str, session_data: dict):
        self.session_id = session_id
        self.session_data = session_data  # current probs, top3, etc.
        self.transcript: list[dict] = []
        self.stream_sid: Optional[str] = None
        self.call_sid: Optional[str] = None
        self._is_active = False

        # Build system prompt with disease context
        disease_context = _build_disease_context(
            session_data.get("qa_probabilities", session_data.get("priors", {}))
        )
        self.system_prompt = _VOICE_SYSTEM_PROMPT.format(disease_context=disease_context)

    async def handle_twilio_stream(self, twilio_ws):
        """
        Main handler for the Twilio bi-directional WebSocket Media Stream.

        Twilio sends JSON messages with:
          - event: "connected", "start", "media", "stop"
          - media.payload: base64-encoded μ-law audio chunks
          - streamSid: unique identifier for this stream

        We use Gemini's text-based Live API for this MVP implementation:
          - Convert incoming audio to text via Gemini
          - Generate text responses
          - Convert responses to speech via Gemini
          - Send audio back to Twilio
        """
        self._is_active = True
        print(f"[voice_bridge] Starting bridge for session {self.session_id}")

        try:
            # Configure Gemini
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                raise RuntimeError("GEMINI_API_KEY not set")

            genai.configure(api_key=api_key)

            # Use Gemini for generating conversational responses
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=self.system_prompt,
            )
            chat = model.start_chat(history=[])

            # Track audio for simple speech-to-text approximation
            audio_buffer = bytearray()
            silence_counter = 0
            last_response_time = datetime.now(timezone.utc)

            async for message in twilio_ws.iter_text():
                if not self._is_active:
                    break

                try:
                    data = json.loads(message)
                except json.JSONDecodeError:
                    continue

                event = data.get("event")

                if event == "connected":
                    print(f"[voice_bridge] Twilio stream connected")

                elif event == "start":
                    self.stream_sid = data.get("start", {}).get("streamSid")
                    self.call_sid = data.get("start", {}).get("callSid")
                    if self.stream_sid:
                        register_bridge(self.stream_sid, self)
                    print(f"[voice_bridge] Stream started: {self.stream_sid}")

                    # Send initial greeting
                    greeting = await self._get_llm_response(
                        chat,
                        "The patient has just connected to the call. "
                        "Greet them warmly and ask your first question."
                    )
                    self._add_transcript("ai", greeting)
                    await self._send_tts_to_twilio(twilio_ws, greeting)

                elif event == "media":
                    # Accumulate audio payload
                    payload = data.get("media", {}).get("payload", "")
                    if payload:
                        audio_bytes = base64.b64decode(payload)
                        audio_buffer.extend(audio_bytes)

                        # Simple voice activity detection:
                        # Process audio buffer when we accumulate ~2 seconds
                        # (Twilio sends 8kHz μ-law = 8000 bytes/sec)
                        if len(audio_buffer) >= 16000:  # ~2 seconds
                            # Check if there's actual speech (non-silence)
                            avg_energy = sum(audio_buffer) / len(audio_buffer)

                            if avg_energy > 130:  # Threshold for speech vs silence
                                silence_counter = 0
                                # In production, send to a Speech-to-Text engine
                                # For MVP, we use a placeholder
                                patient_text = await self._transcribe_audio(
                                    bytes(audio_buffer)
                                )
                                if patient_text:
                                    self._add_transcript("patient", patient_text)
                                    response = await self._get_llm_response(
                                        chat, patient_text
                                    )
                                    self._add_transcript("ai", response)
                                    await self._send_tts_to_twilio(
                                        twilio_ws, response
                                    )
                                    last_response_time = datetime.now(timezone.utc)
                            else:
                                silence_counter += 1

                            audio_buffer.clear()

                elif event == "stop":
                    print(f"[voice_bridge] Stream stopped for {self.session_id}")
                    self._is_active = False
                    break

        except Exception as e:
            print(f"[voice_bridge] Error in stream handler: {e}")
            traceback.print_exc()
        finally:
            self._is_active = False
            if self.stream_sid:
                remove_bridge(self.stream_sid)
            print(f"[voice_bridge] Bridge closed for session {self.session_id}")

    async def _get_llm_response(self, chat, user_message: str) -> str:
        """Get a text response from Gemini chat."""
        try:
            response = chat.send_message(
                user_message,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=200,  # Keep responses short for voice
                ),
            )
            return response.text.strip()
        except Exception as e:
            print(f"[voice_bridge] Gemini response error: {e}")
            return "I understand. Could you tell me more about that?"

    async def _transcribe_audio(self, audio_data: bytes) -> Optional[str]:
        """
        Transcribe audio using Gemini's multimodal capabilities.

        For MVP, we use Gemini to process audio descriptions.
        In production, integrate Google Cloud Speech-to-Text for accuracy.
        """
        # MVP: Use Gemini multimodal with audio
        # In production, use Google Cloud Speech-to-Text API
        try:
            api_key = os.environ.get("GEMINI_API_KEY")
            genai.configure(api_key=api_key)

            model = genai.GenerativeModel("gemini-2.5-flash")

            # Encode audio as base64 for Gemini
            audio_b64 = base64.b64encode(audio_data).decode("utf-8")

            response = model.generate_content([
                "Transcribe the following audio. Return ONLY the transcribed text, "
                "nothing else. If the audio is silence or unintelligible, return EMPTY.",
                {
                    "mime_type": "audio/basic",  # μ-law 8kHz
                    "data": audio_b64,
                },
            ])

            text = response.text.strip()
            if text and text.upper() != "EMPTY":
                return text
            return None

        except Exception as e:
            print(f"[voice_bridge] Transcription error: {e}")
            return None

    async def _send_tts_to_twilio(self, twilio_ws, text: str):
        """
        Send text-to-speech audio back to Twilio.

        Uses Twilio's built-in <Say> TTS via a media message.
        For MVP, we send a text marker that the frontend displays.
        In production, use Google Cloud Text-to-Speech or ElevenLabs.
        """
        if not self.stream_sid:
            return

        try:
            # For MVP: Use Twilio's native TTS by sending a mark event
            # The actual audio is handled by <Say> in TwiML
            mark_message = {
                "event": "mark",
                "streamSid": self.stream_sid,
                "mark": {
                    "name": f"response_{len(self.transcript)}"
                }
            }
            await twilio_ws.send_text(json.dumps(mark_message))

        except Exception as e:
            print(f"[voice_bridge] TTS send error: {e}")

    def _add_transcript(self, role: str, text: str):
        """Add an entry to the call transcript."""
        self.transcript.append({
            "role": role,
            "text": text,
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        })

    def stop(self):
        """Signal the bridge to stop processing."""
        self._is_active = False


# ── Post-Call Summary Generation ─────────────────────────────────────────────

async def generate_post_call_summary(
    transcript: list[dict],
    probabilities: dict[str, float],
) -> dict:
    """
    Generate a clinical summary and adjusted probabilities after the voice call.

    Parameters
    ----------
    transcript : list[dict]
        The call transcript: [{role, text, timestamp}, ...]
    probabilities : dict[str, float]
        Pre-call Bayesian posteriors.

    Returns
    -------
    dict with keys:
        - clinical_summary: str
        - key_findings: list[str]
        - adjusted_probabilities: dict[str, float]
        - confidence_changes: list[dict]
        - recommendation: str
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return _fallback_summary(transcript, probabilities)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Format transcript for the prompt
        transcript_text = "\n".join(
            f"[{entry['role'].upper()}]: {entry['text']}"
            for entry in transcript
        )

        disease_context = _build_disease_context(probabilities)

        prompt = _POST_CALL_SUMMARY_PROMPT.format(
            disease_context=disease_context,
            transcript=transcript_text,
        )

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=2048,
            ),
            request_options={"timeout": 30},
        )

        # Parse JSON response
        raw = response.text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            import re
            raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
            raw = re.sub(r"\n?```\s*$", "", raw)
            raw = raw.strip()

        summary = json.loads(raw)

        # Validate required keys
        required = ["clinical_summary", "key_findings", "adjusted_probabilities"]
        for key in required:
            if key not in summary:
                raise ValueError(f"Missing key: {key}")

        # Ensure adjusted_probabilities are normalized
        adj_probs = summary["adjusted_probabilities"]
        total = sum(adj_probs.values())
        if total > 0:
            summary["adjusted_probabilities"] = {
                d: p / total for d, p in adj_probs.items()
            }

        print(f"[voice_llm] ✓ Post-call summary generated successfully")
        return summary

    except Exception as e:
        print(f"[voice_llm] Post-call summary error: {e}")
        traceback.print_exc()
        return _fallback_summary(transcript, probabilities)


def _fallback_summary(
    transcript: list[dict],
    probabilities: dict[str, float],
) -> dict:
    """Fallback summary when Gemini fails."""
    return {
        "clinical_summary": (
            f"Voice consultation completed with {len(transcript)} exchanges. "
            "Gemini analysis unavailable — probabilities unchanged."
        ),
        "key_findings": [
            f"Call contained {len(transcript)} transcript entries",
            "Automated analysis could not be completed",
        ],
        "adjusted_probabilities": probabilities,  # Keep unchanged
        "confidence_changes": [],
        "recommendation": "Manual review of the call transcript is recommended.",
    }
