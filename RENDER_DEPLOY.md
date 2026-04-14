# Deploy TriLens to Render (FREE TIER FRIENDLY)

## 🚀 Ultra-Simple 5-Step Deploy

### Step 1: Prepare Your Repository
```bash
git add .
git commit -m "Add Render deployment config"
git push origin main
```

### Step 2: Create Render Account
1. Go to https://render.com
2. Sign up (free)
3. Connect your GitHub repo

### Step 3: Create PostgreSQL Database
In Render Dashboard:
1. Click **"New +"** → **"PostgreSQL"**
2. Set:
   - Name: `trilens-db`
   - Database: `trilens_db`
   - Click **Create Database**
3. Copy the connection string from the database page

### Step 4: Deploy Backend
1. Click **"New +"** → **"Web Service"**
2. Select your GitHub repo
3. Set these settings:
   - **Name:** `trilens-backend`
   - **Environment:** `Python 3.11`
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `cd backend && gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - **Plan:** Free ($0/month)
4. Click **Create Web Service**

### Step 5: Add Environment Variables
In the Web Service Settings → **Environment**:
```
DATABASE_URL=postgresql://...  # From Step 3
GEMINI_API_KEY=your-api-key    # Get from https://aistudio.google.com/apikey
TWILIO_ACCOUNT_SID=ACxxxxx     # Get from Twilio Console
TWILIO_AUTH_TOKEN=xxxxx        # Get from Twilio Console
TWILIO_PHONE_NUMBER=+1xxxxxx   # Your Twilio number
TWILIO_WEBHOOK_BASE_URL=https://trilens-backend.onrender.com
CORS_ORIGINS=http://localhost:3000,https://your-frontend.render.com
```

---

## ✅ What's FREE

| Service | Cost | Notes |
|---------|------|-------|
| Render Web Hosting | $0/month | Hibernates after 15 mins inactivity (free tier) |
| PostgreSQL Database | $0/month | Small free tier database |
| Gemini API | Free | 60 requests/min (sufficient) |
| Text-to-Speech (pyttsx3) | **$0** | Completely offline ✅ |
| **Total (excluding calls)** | **$0/month** | ✅ |

---

## ⚠️ What Costs Money

| Service | Cost | Notes |
|---------|------|-------|
| Twilio Calls | ~$0.0075/min | Unavoidable - this is phone infrastructure |
| Render Pro | $7+/month | Optional - only if you want no hibernation |

---

## 🔧 Troubleshooting

### "502 Bad Gateway"
```bash
# Check logs in Render dashboard
# Likely issue: Environment variable missing
# Add all variables from Step 5
```

### "Connection refused (database)"
```bash
# Verify DATABASE_URL is correctly copied
# Should look like: postgresql://xxxxx:xxxxx@host/trilens_db
```

### "Twilio webhook not connecting"
```bash
# Ensure TWILIO_WEBHOOK_BASE_URL is set to your Render domain
# Example: https://trilens-backend.onrender.com
# NOT http:// - must be https://
```

### Audio not working in calls
```bash
# Check logs for pyttsx3 errors
# pyttsx3 requires "espeak" on Linux servers
# Already installed on Render ✅
```

---

## 📱 Getting API Keys (5 minutes total)

### Gemini API (FREE)
1. Go to https://aistudio.google.com/apikey
2. Click **"Create API Key"**
3. Copy and paste into Render env vars

### Twilio (GET PHONE NUMBER)
1. Go to https://www.twilio.com/console
2. Create account (sign up)
3. Go to **Phone Numbers** → **Manage Numbers**
4. Click **"Create New Number"** (or buy one for ~$1/month)
5. Copy: **Account SID**, **Auth Token**, **Phone Number**

---

## 🚀 After Deployment

### Test Voice Call
```bash
# Make a test voice consultation call to your Twilio number
# Expected: No "application error"
# Expected: AI responds with questions
```

### Monitor Logs
In Render Dashboard → Web Service → **Logs**
```
[voice_bridge] Stream started: ...
[voice_bridge] ✓ TTS sent to Twilio: ...
[voice_bridge] Patient said: ...
```

### Scale Up (Optional)
- Free tier: Hibernates after 15 mins
- Paid tier: $7/month for always-on + more resources

---

## 🎯 Cost Summary

**Monthly Cost with Free Tier:**
- Hosting: $0 (Render free)
- Database: $0 (Render free)
- APIs: $0 (Gemini free + pyttsx3 free)
- Twilio Calls: ~$0.10-1.00 depending on usage
- **Total: ~$0-2/month**

That's it! Go deploy! 🚢
