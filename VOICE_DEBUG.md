# Voice Call Debugging Guide

## 🔍 Step 1: Check Render Logs

Go to your Render dashboard → **trilens-backend** → **Logs** tab

### ✅ Expected Success Messages:
```
[voice_agent] Outbound call initiated: CAxxxxx → +1xxxxxxxxxx
[voice_bridge] Stream started: MZxxxxx
[voice_bridge] ✓ TTS sent to Twilio: Hello! This is the Trilens...
[voice_bridge] Patient said: [user's response]
[voice_bridge] AI response: [AI's reply]
[voice_agent] ✓ Voice consult finalized for session xxxxx
```

### ❌ Common Error Messages:
```
[voice_bridge] pyttsx3 not installed, cannot generate audio
[voice_bridge] Speech generation error: [error details]
[voice_bridge] Critical stream handler error: [error]
[voice_agent] Twilio call error: [error]
```

---

## 🧪 Step 2: Test Components Locally

### Test pyttsx3 (TTS):
```python
# Create test_tts.py
import pyttsx3

try:
    engine = pyttsx3.init()
    engine.say("Hello, this is a test")
    engine.runAndWait()
    print("✅ pyttsx3 works!")
except Exception as e:
    print(f"❌ pyttsx3 error: {e}")
```

Run: `python test_tts.py`

### Test Gemini API:
```python
# Create test_gemini.py
import google.generativeai as genai

try:
    genai.configure(api_key="YOUR_API_KEY")
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content("Say hello")
    print(f"✅ Gemini works: {response.text}")
except Exception as e:
    print(f"❌ Gemini error: {e}")
```

Run: `python test_gemini.py`

---

## 📞 Step 3: Test Voice Call Flow

### 1. Check Twilio Webhook
- Go to https://www.twilio.com/console → **Phone Numbers**
- Click your number → **Voice & Fax** section
- **Webhook URL should be:** `https://your-backend.onrender.com/voice/incoming`
- **HTTP Method:** POST

### 2. Test Call Initiation
- Start a session in your app
- Complete Q&A
- Click "Start Voice Call"
- **Expected:** Twilio makes outbound call

### 3. Test Call Reception
- Answer the call
- **Expected:** AI greeting (not error message)
- Speak a response
- **Expected:** AI responds back

---

## 🔧 Step 4: Common Fixes

### If "pyttsx3 not installed":
```bash
# In Render dashboard → Environment
# Add: PYTHONPATH=/app
# Or check if pyttsx3 is in requirements.txt
```

### If "Gemini API error":
- Check `GEMINI_API_KEY` in Render environment variables
- Verify key is valid at https://aistudio.google.com/apikey

### If "Twilio connection failed":
- Check all TWILIO_* environment variables
- Verify webhook URL is HTTPS (not HTTP)

### If "Audio not heard":
- Check logs for TTS generation errors
- pyttsx3 may need additional system packages on Linux

---

## 📊 Step 5: Check Database

### Verify Session Status:
```sql
-- Check if voice call was initiated
SELECT id, voice_status, call_sid, call_transcript
FROM sessions
WHERE id = 'your-session-id'
ORDER BY created_at DESC LIMIT 1;
```

Expected results:
- `voice_status`: "completed" (after call ends)
- `call_sid`: "CAxxxxx" (Twilio call ID)
- `call_transcript`: JSON array of conversation

---

## 🚨 Step 6: Emergency Fallback

If voice calls still fail, temporarily disable voice and use text-only:

### Option A: Skip Voice Consult
```python
# In voice_agent.py, modify skip_voice_consult to always work
@router.post("/{session_id}/skip")
async def skip_voice_consult(...):
    # Remove status checks - allow skipping anytime
    # crud.update_session(db, session, status="finalized", voice_status="skipped")
```

### Option B: Use Twilio <Say> Directly
```python
# In voice_agent.py, modify TwiML to use <Say> instead of WebSocket
twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hello! This is the Trilens AI assistant.</Say>
    <Gather numDigits="1" action="/voice/handle_input">
        <Say>Please press 1 to continue or hang up.</Say>
    </Gather>
</Response>"""
```

---

## 📞 Step 7: Get Help

If still failing, provide me:

1. **Render logs** (last 50 lines during a call)
2. **Twilio debugger logs** (from Twilio console)
3. **Session ID** from your app
4. **What you hear** when you answer the call

**Command to get recent logs:**
```bash
# In Render dashboard → Logs tab
# Or use Render API if you have CLI access
```

---

## 🎯 Quick Diagnosis

**Run this checklist:**

- [ ] Render deployment successful (no build errors)
- [ ] pyttsx3 installed (check logs)
- [ ] Gemini API key valid
- [ ] Twilio credentials correct
- [ ] Webhook URL is HTTPS
- [ ] Voice call initiates (hear phone ring)
- [ ] Call connects (no immediate hangup)
- [ ] AI speaks (not error message)

**Most common issue:** Missing or invalid environment variables in Render dashboard.

Let me know what you find! 🔍