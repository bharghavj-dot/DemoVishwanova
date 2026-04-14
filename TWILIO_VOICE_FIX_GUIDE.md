# Twilio Voice Integration - Fix Guide & Debugging

## Issues Fixed 🔧

### 1. **No Audio Sent Back to Caller** ❌ → ✅
**Problem:** The original `_send_tts_to_twilio()` only sent "mark" events but never sent actual audio frames back to Twilio. This caused Twilio to think the connection was broken, triggering the error message.

**Fix:** Rewrote the function to:
- Generate speech audio from text using Google Cloud Text-to-Speech
- Convert to μ-law format (8kHz, 160-byte chunks)
- Send audio frames via WebSocket media messages to Twilio
- Added proper error handling and timeouts

### 2. **Poor Audio Quality Detection** ❌ → ✅
**Problem:** The audio energy threshold was using `sum(audio_buffer)` which is incorrect for μ-law encoding. μ-law values range from 0-255, with 128 as silence/neutral.

**Fix:** Changed calculation to:
```python
avg_energy = sum(abs(b - 128) for b in audio_buffer) / len(audio_buffer)
if avg_energy > 15:  # Adjusted threshold for μ-law
```

### 3. **Missing Exception Handling** ❌ → ✅
**Problem:** When Gemini API errors occurred (API timeouts, quota issues, format problems), the exceptions weren't caught. This caused the WebSocket to crash silently, leaving Twilio hanging.

**Fix:** Added try-except blocks around:
- Initial greeting generation
- Patient audio processing
- LLM response generation
- Transcription attempts
- TTS generation

### 4. **Incomplete WebSocket Disconnect Handling** ❌ → ✅
**Problem:** The stream handler didn't import `WebSocketDisconnect` from FastAPI, causing potential issues with proper connection closure.

**Fix:** Added import and proper exception handling for WebSocket disconnections

### 5. **No Fallback Responses** ❌ → ✅
**Problem:** When errors occurred, no message was sent back to the caller, leaving them in silence or hearing only Twilio's error message.

**Fix:** Added fallback responses:
- If greeting fails: "Hello, I'm here to help with your consultation. Please tell me about your symptoms."
- If response generation fails: "I didn't quite catch that. Could you repeat please?"

---

## Debugging Steps 🔍

### 1. Check Environment Variables
```bash
# Ensure these are set in your .env file:
GEMINI_API_KEY=your-key-here
GOOGLE_CLOUD_PROJECT=your-project-id  # For Cloud Text-to-Speech
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json  # For Cloud TTS
```

### 2. Enable Enhanced Logging
Add these lines to `voice_llm_client.py` before calling functions:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("voice_bridge")
```

### 3. Monitor Real-Time Logs
```bash
# Terminal 1: Start backend
cd backend
python -m uvicorn main:app --reload --log-level debug

# Terminal 2: Tail logs
tail -f /var/log/twilio-voice.log  # or your log file location
```

### 4. Test Individual Components

**Test Gemini API:**
```python
import google.generativeai as genai
genai.configure(api_key="YOUR_KEY")
model = genai.GenerativeModel("gemini-2.5-flash")
response = model.generate_content("Say hello")
print(response.text)
```

**Test Text-to-Speech:**
```python
from google.cloud import texttospeech
client = texttospeech.TextToSpeechClient()
# See implementation in voice_llm_client.py for full example
```

**Test Audio Buffer Calculation:**
```python
# μ-law sample
audio_buffer = bytes([128, 127, 129, 130, 126])  # Should have ~60 avg energy
avg_energy = sum(abs(b - 128) for b in audio_buffer) / len(audio_buffer)
print(f"Energy: {avg_energy:.1f}")  # Should be ~1.0
```

---

## Installation Requirements ⚙️

If not already installed, add these to `backend/requirements.txt`:

```
google-cloud-texttospeech>=3.11.0
google-generativeai>=0.3.0
```

Then:
```bash
pip install -r backend/requirements.txt
```

---

## Testing the Fix 🧪

### Test 1: Basic Call Flow
1. Start the backend
2. Create a session and complete Q&A
3. Initiate voice call
4. Answer the call
5. **Check logs for:**
   - `[voice_bridge] Stream started: ...`
   - `[voice_bridge] ✓ TTS sent to Twilio: ...`
   - `[voice_bridge] Patient said: ...`
   - No error messages

### Test 2: Error Resilience
1. Intentionally disable Gemini API key
2. Make a call
3. **Should hear:** Default fallback response instead of error
4. **Logs should show:** `[voice_bridge] Error generating response: ...`

### Test 3: Audio Quality
1. Make a call with different background noise levels
2. Speak clearly in quiet environment
3. Speak with background noise
4. **Expected:** Recognizes voice in both but cleaner transcription in quiet

---

## Common Issues & Solutions 🚨

| Issue | Cause | Solution |
|-------|-------|----------|
| "application error" on call | Missing audio frames | Verify TTS generation is working |
| No transcript saved | WebSocket closed early | Check stream handler exceptions |
| Slow responses | Gemini API timeout | Increase timeout or use faster model |
| Background noise is picked up | Audio threshold too low | Increase energy threshold from 15 to 20+ |
| Audio cuts off | Buffer clearing issues | Verify audio_buffer.clear() is called |
| "API quota exceeded" | Too many API calls | Batch requests or implement caching |

---

## Performance Tips 🚀

1. **Use Speech-to-Text Caching:** Don't transcribe same audio twice
2. **Asynchronous Processing:** Already implemented with `async def`
3. **Audio Compression:** Consider compressing audio before sending
4. **Connection Pooling:** Reuse Gemini chat session (already done)
5. **Monitoring:** Add APM instrumentation for production

---

## Next Steps 📋

- [ ] Deploy these fixes to production
- [ ] Monitor voice call success rate
- [ ] Collect error metrics
- [ ] Optimize audio quality based on real data
- [ ] Add user feedback mechanism ("Was the transcription accurate?")
- [ ] Implement voice activity detection (VAD) library for better audio detection
- [ ] Consider using Twilio's Media API for more control
- [ ] Add call recording for quality assurance

