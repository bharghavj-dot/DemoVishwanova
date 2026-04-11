# Trilens API — Endpoint Reference & Frontend Integration Guide

> **Base URL:** `http://localhost:8000`
> **API Docs:** `http://localhost:8000/docs` (Swagger UI)
> **Version:** 1.0.0

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard)
3. [Scan & Image Analysis](#3-scan--image-analysis)
4. [Reports](#4-reports)
5. [Clinical Q&A](#5-clinical-qa)
6. [Doctors & Consultation](#6-doctors--consultation)
7. [Family Dashboard](#7-family-dashboard)
8. [User Profile](#8-user-profile)
9. [Doctor Dashboard](#9-doctor-dashboard)
10. [System](#10-system)
11. [Frontend Integration Guide](#frontend-integration-guide)

---

## 1. Authentication

All endpoints (except auth and health) require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```

### `POST /auth/register`

Create a new clinical account.

**Request:**
```json
{
  "full_name": "Dr. Julian Vane",
  "email": "vane.j@trilens-med.com",
  "password": "securepassword",
  "confirm_password": "securepassword",
  "role": "patient"   // "patient" | "doctor" | "guardian"
}
```

**Response (201):**
```json
{
  "access_token": "a1b2c3d4e5f6...",
  "token_type": "bearer",
  "user": {
    "id": "USR-A1B2C3D4",
    "full_name": "Dr. Julian Vane",
    "email": "vane.j@trilens-med.com",
    "role": "patient",
    "created_at": "2024-10-24T10:00:00Z",
    "patient_id": "TR-E5F6G7H8",
    "avatar_url": null
  }
}
```

---

### `POST /auth/login`

Sign in with email, password, and role.

**Request:**
```json
{
  "email": "iris.walker@trilens.med",
  "password": "mypassword",
  "role": "patient"
}
```

**Response (200):** Same shape as register response.

---

### `POST /auth/demo-login`

Quick demo access without credentials (for simulation buttons).

**Request:**
```json
{
  "role": "patient"   // "patient" | "doctor" | "guardian"
}
```

**Response (200):** Same shape as register response.

---

### `GET /auth/me`

Get current authenticated user info.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** `UserPublic` object.

---

## 2. Dashboard

The Dashboard page (`Dashboard.png`) data is constructed client-side from:
- `GET /auth/me` → greeting name
- `GET /reports/history` → recent report summaries
- Diagnostic modules are static UI (Tongue Scan, Ocular Check, Nail Bed Analysis)

---

## 3. Scan & Image Analysis

### `POST /scan/upload/{scan_type}`

Upload a single scan image. Runs the feature extractor immediately.

**Path Parameter:** `scan_type` = `eye` | `tongue` | `nail`

**Body:** `multipart/form-data` with `file` field (image)

**Response (200):**
```json
{
  "session_id": "SES-A1B2C3D4",
  "scan_type": "eye",
  "features": {
    "eye_sclera_yellow": 0.1234,
    "eye_conjunctiva_pallor": 0.5678,
    "eye_cornea_clarity": 0.4321,
    "eye_pupil_symmetry": 0.9876,
    "eye_discharge_present": 0.2345
  },
  "status": "extracted",
  "capture_quality": {
    "lighting": "OPTIMAL LUX",
    "position": "CENTERED",
    "clarity": "CLEAR"
  }
}
```

**Frontend Integration:**
1. User selects Eye/Tongue/Nail tab at the bottom
2. User clicks "CHOOSE FILE" and selects an image
3. On selection, immediately `POST /scan/upload/{selected_type}` with the file
4. Show "extracted" status and capture quality panel from response
5. Repeat for all 3 scan types
6. When all 3 are uploaded, enable the "Analyze" action

---

### `POST /scan/analyze`

Merge features from all 3 uploads and run XGBoost classification.

**Request:**
```json
{
  "session_id": "SES-A1B2C3D4"
}
```

**Response (200):**
```json
{
  "session_id": "SES-A1B2C3D4",
  "features": { /* all 15 merged features */ },
  "top3": [
    {"disease": "anaemia", "probability": 0.542, "display_name": "Anaemia"},
    {"disease": "jaundice", "probability": 0.280, "display_name": "Jaundice"},
    {"disease": "diabetes", "probability": 0.100, "display_name": "Diabetes"}
  ],
  "priors": {"anaemia": 0.542, "jaundice": 0.280, "diabetes": 0.100},
  "status": "analyzed"
}
```

**Frontend Integration:**
- Call after all 3 scan uploads complete
- On success, navigate to the Report page using the `session_id`

---

### `GET /scan/session/{session_id}`

Track session progress.

**Response (200):**
```json
{
  "session_id": "SES-A1B2C3D4",
  "status": "analyzed",
  "uploads": {"eye": true, "tongue": true, "nail": false},
  "has_report": true,
  "has_final_report": false,
  "qa_started": false,
  "qa_completed": false
}
```

---

## 4. Reports

### `GET /reports/{session_id}`

Get the initial diagnostic report (before Q&A).

**Response (200):**
```json
{
  "session_id": "SES-A1B2C3D4",
  "primary_disease": "anaemia",
  "primary_display_name": "Anaemia",
  "confidence": 0.92,
  "severity": "Mild",
  "severity_note": "Immediate attention not required",
  "top3": [
    {"disease": "anaemia", "probability": 0.92, "display_name": "Anaemia"},
    {"disease": "jaundice", "probability": 0.45, "display_name": "Jaundice"},
    {"disease": "diabetes", "probability": 0.30, "display_name": "Diabetes"}
  ],
  "precautions": [
    "Avoid touching or rubbing the eyes to prevent irritation.",
    "Use preservative-free lubricating drops as needed.",
    "Monitor for sudden vision changes or increased pain."
  ],
  "created_at": "2024-10-12T10:00:00Z",
  "last_scanned": "2024-10-12T10:00:00Z"
}
```

**Frontend Integration (Report.png):**
- Display confidence as the circular percentage gauge
- Show "ANALYSIS COMPLETE" badge
- Render top 3 probable conditions with progress bars
- Show severity level card
- Show precautions list
- Render "Start Clinical Q&A →" button (triggers `POST /qa/{session_id}/start`)

---

### `GET /reports/{session_id}/final`

Get the final diagnostic report after Q&A completion.

**Response (200):**
```json
{
  "session_id": "SES-A1B2C3D4",
  "report_id": "RPT-X1Y2Z3W4",
  "patient_name": "Alex Morgan",
  "generated_at": "2024-10-24T10:00:00Z",
  "diagnostic_confidence": 0.92,
  "primary_disease": "anaemia",
  "primary_display_name": "Anaemia",
  "severity": "Mild",
  "probable_pathologies": [
    {"disease": "anaemia", "probability": 0.92, "display_name": "Anaemia"},
    {"disease": "jaundice", "probability": 0.45, "display_name": "Jaundice"},
    {"disease": "diabetes", "probability": 0.30, "display_name": "Diabetes"}
  ],
  "mandatory_clinical_action": "Due to a 92% match confidence...",
  "medications": [
    {"name": "Antihistamine Eye Drops", "dosage": "Twice daily for irritation relief"},
    {"name": "Artificial Tears", "dosage": "Preservative-free, as needed"}
  ],
  "precautions": ["Strictly avoid eye rubbing...", "..."],
  "escalation_flags": ["Severe fatigue", "Shortness of breath..."],
  "see_doctor_flag": true,
  "recommended_specialists": [
    {
      "id": "DOC-001",
      "name": "Dr. Sarah Jenkins",
      "specialty": "Ophthalmologist",
      "rating": 4.9,
      "review_count": 128,
      "fee": 120.00,
      "availability": "Today, 4:00 PM",
      "distance": "12KM AWAY"
    }
  ]
}
```

**Frontend Integration (Final_Report.png):**
- Display diagnostic confidence circle
- Render probable pathologies with horizontal progress bars
- Show severity badge with icon
- Display "Mandatory Clinical Action" card if `see_doctor_flag` is true
- Render medications and precautions lists
- Show escalation flags
- Render recommended specialists with "Book Now" buttons
- "Download PDF Report" button → `GET /reports/{session_id}/pdf`

---

### `GET /reports/{session_id}/pdf`

Download the report as a PDF file.

**Response:** Binary PDF file with `Content-Disposition: attachment` header.

**Frontend Integration:** Trigger browser download via `<a href="..." download>` or `window.open()`.

---

### `GET /reports/history`

Get all reports for the current user.

**Response (200):**
```json
{
  "reports": [
    {
      "session_id": "SES-A1B2C3D4",
      "primary_disease": "Anaemia",
      "confidence": 0.92,
      "severity": "Mild",
      "created_at": "2024-10-12T10:00:00Z",
      "is_final": true
    }
  ]
}
```

---

## 5. Clinical Q&A

### `POST /qa/{session_id}/start`

Start the Q&A session — generates 9 questions (3 per disease).

**Response (200):**
```json
{
  "session_id": "SES-A1B2C3D4",
  "total_questions": 9,
  "questions": [
    {
      "index": 0,
      "question": "Do you often feel unusually tired even after a full night's sleep?",
      "primary_disease": "anaemia",
      "answers": {
        "key_symptom":      {"text": "Yes, constantly fatigued"},
        "moderate_symptom": {"text": "Sometimes, a few times a week"},
        "possible_reason":  {"text": "Occasionally, but rarely"},
        "not_relevant":     {"text": "No, my energy levels are normal"}
      },
      "why_asking": "This helps our AI differentiate between chronic fatigue patterns and red blood cell deficiency indicators.",
      "clinical_insight": "Symptom correlation analysis for Anaemia"
    }
    // ... 8 more questions
  ]
}
```

**Frontend Integration (Q&A.png):**
1. Call `POST /qa/{session_id}/start` when "Start Clinical Q&A" is pressed
2. Store the full question list in frontend state
3. Display one question at a time with "STEP X OF 9" progress bar
4. Show question text as the main heading
5. Render 4 answer options as selectable cards
6. Show "WHY ARE WE ASKING?" sidebar with `why_asking` text
7. On "Continue" click → submit answer via `POST /qa/{session_id}/answer`
8. Move to next question
9. After all 9 answers, auto-navigate to Final Report page

---

### `GET /qa/{session_id}/questions`

Re-fetch all questions (e.g., on page refresh).

**Response:** Same shape as start response.

---

### `POST /qa/{session_id}/answer`

Submit one answer. Bayesian update is applied immediately.

**Request:**
```json
{
  "question_index": 0,
  "answer_type": "key_symptom"   // "key_symptom" | "moderate_symptom" | "possible_reason" | "not_relevant"
}
```

**Response (200):**
```json
{
  "session_id": "SES-A1B2C3D4",
  "question_index": 0,
  "current_step": 1,
  "total_steps": 9,
  "updated_probabilities": {
    "anaemia": 0.58,
    "jaundice": 0.25,
    "diabetes": 0.17
  },
  "is_complete": false,
  "ruled_out": []
}
```

**Frontend Integration:**
- Map the 4 radio buttons to answer_type values:
  - Option 1 (top/most severe) → `"key_symptom"`
  - Option 2 → `"moderate_symptom"`
  - Option 3 → `"possible_reason"`
  - Option 4 (bottom/no symptom) → `"not_relevant"`
- When `is_complete` is `true`, navigate to Final Report page

---

### `GET /qa/{session_id}/status`

Get current Q&A progress.

**Response (200):**
```json
{
  "session_id": "SES-A1B2C3D4",
  "current_step": 5,
  "total_steps": 9,
  "is_complete": false,
  "answered_indices": [0, 1, 2, 3, 4],
  "probabilities": { "anaemia": 0.62, "jaundice": 0.21, "diabetes": 0.17 }
}
```

---

## 6. Doctors & Consultation

### `GET /doctors`

List available doctors with optional category filter.

**Query Params:** `category` = `All` | `Ocular` | `Oral (Tongue)` | `Nail Health`

**Response (200):**
```json
{
  "doctors": [
    {
      "id": "DOC-001",
      "name": "Dr. Aris Thorne",
      "specialty": "Ocular Surface Specialist",
      "specialties": ["Ocular Diagnostics", "Corneal Imaging"],
      "verified": true,
      "rating": 4.9,
      "review_count": 128,
      "fee": 120.00,
      "availability": "Today, 2:00 PM",
      "distance": "12KM AWAY",
      "avatar_url": null
    }
  ],
  "categories": ["All", "Ocular", "Oral (Tongue)", "Nail Health"]
}
```

**Frontend Integration (Consultation.png):**
- Render category filter tabs from `categories` array
- On tab click, refetch with `?category=<selected>`
- Render doctor cards with photo, name, specialty tags, rating, fee, availability
- "Book Consultation" button → `POST /doctors/book`

---

### `GET /doctors/{doctor_id}`

Get a specific doctor's details.

---

### `POST /doctors/book`

Book a consultation.

**Request:**
```json
{
  "doctor_id": "DOC-001",
  "session_id": "SES-A1B2C3D4",   // optional — links booking to scan session
  "notes": "Follow-up on ocular scan results"
}
```

**Response (201):**
```json
{
  "booking_id": "BKG-A1B2C3D4",
  "doctor_id": "DOC-001",
  "doctor_name": "Dr. Aris Thorne",
  "patient_id": "USR-E5F6G7H8",
  "status": "confirmed",
  "scheduled_at": "Today, 2:00 PM",
  "fee": 120.00
}
```

---

## 7. Family Dashboard

### `GET /family/members`

List all family members (guardian role).

**Response (200):**
```json
{
  "members": [
    {
      "id": "FAM-A1B2C3D4",
      "name": "Sarah",
      "relationship": "Spouse",
      "status": "STABLE",
      "avatar_url": null,
      "has_new_report": false,
      "reports": []
    },
    {
      "id": "FAM-E5F6G7H8",
      "name": "Leo",
      "relationship": "Son",
      "status": "NEW REPORT AVAILABLE",
      "has_new_report": true,
      "reports": [...]
    }
  ]
}
```

**Frontend Integration (Family_Dashboard.png):**
- Render member cards with avatar, name, relationship badge
- Show status badge color: green = STABLE, red = NEW REPORT, yellow = CHECKUP PENDING
- "View Dashboard" button → fetch reports for that member
- "ENROLL NEW FAMILY MEMBER" button → `POST /family/members`

---

### `POST /family/members`

Add a new family member.

**Request:**
```json
{
  "name": "Maria",
  "relationship": "Mother",
  "email": "maria@example.com"    // optional - links to existing user
}
```

---

### `GET /family/members/{member_id}/reports`

Get reports for a family member (read-only).

---

## 8. User Profile

### `GET /profile`

Get current user's profile.

**Response (200):**
```json
{
  "id": "USR-A1B2C3D4",
  "patient_id": "TR-9920-X12",
  "full_name": "Elena Rodriguez",
  "email": "elena@trilens.med",
  "role": "patient",
  "clinical_stability": "High",
  "member_since": "2021-01-20",
  "avatar_url": null
}
```

**Frontend Integration (Profile.png):**
- Display avatar, patient ID, name, clinical stability badge
- "Member since" date
- Sections: Personal Information, Clinical Records, Security & Privacy
- "UPDATE DETAILS" → `PUT /profile`
- "VIEW VAULT" → `GET /profile/records`

---

### `PUT /profile`

Update profile fields.

**Request:**
```json
{
  "full_name": "Elena Rodriguez-Smith",
  "email": "elena.new@trilens.med"
}
```

---

### `GET /profile/records`

Get clinical records archive.

**Response (200):**
```json
{
  "records": [
    {
      "session_id": "SES-A1B2C3D4",
      "report_id": "RPT-X1Y2Z3W4",
      "primary_disease": "Anaemia",
      "confidence": 0.92,
      "severity": "Mild",
      "created_at": "2024-10-12T10:00:00Z"
    }
  ]
}
```

---

## 9. Doctor Dashboard

> **Note:** All doctor dashboard endpoints require `role: "doctor"`.

### `GET /doctor/dashboard`

Get dashboard stats and patient queue.

**Response (200):**
```json
{
  "stats": {
    "total_patients": 1284,
    "pending_reviews": 42,
    "emergency_escalations": 3
  },
  "bookings": [
    {
      "booking_id": "BKG-A1B2C3D4",
      "patient_name": "Iris Walker",
      "patient_id": "USR-E5F6G7H8",
      "symptom_cluster": "Persistent Ocular Pressure",
      "scan_type": "OCULAR SCAN",
      "criteria_status": "Criteria Met",
      "session_id": "SES-X1Y2Z3W4"
    }
  ]
}
```

**Frontend Integration (Doctor Dashboard.png):**
- Stats cards at top: Total Patients, Pending Reviews, Emergency Escalations
- Clinical Priority Queue table with patient rows
- "Confirm Booking" and "Review Full Scan" action buttons per row

---

### `GET /doctor/patients`

Get all patient bookings.

---

### `PUT /doctor/bookings/{booking_id}`

Update a booking status.

**Request:**
```json
{
  "action": "confirm"    // "confirm" | "review"
}
```

---

## 10. System

### `GET /health`

Health check.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": "2h 15m 30s"
}
```

### `GET /`

Root — returns API info links.

### `GET /docs`

Swagger UI (auto-generated).

### `GET /redoc`

ReDoc documentation (auto-generated).

---

## Frontend Integration Guide

### Complete User Flow

```
Homepage (static)
    │
    ▼
Login/Register  ────────────────────────────►  POST /auth/login
    │                                              or /auth/register
    ▼                                              or /auth/demo-login
Dashboard  ─────────────────────────────────►  GET /auth/me
    │                                           GET /reports/history
    │
    ├── "Launch Module" ────────────────────►  Image Analysis Page
    │       │
    │       ├── Upload Eye ─────────────────►  POST /scan/upload/eye
    │       ├── Upload Tongue ──────────────►  POST /scan/upload/tongue
    │       ├── Upload Nail ────────────────►  POST /scan/upload/nail
    │       └── All 3 uploaded ─────────────►  POST /scan/analyze
    │               │
    │               ▼
    │           Report Page  ───────────────►  GET /reports/{session_id}
    │               │
    │               ├── "Start Clinical Q&A" ►  POST /qa/{session_id}/start
    │               │       │
    │               │       ├── Q1..Q9 ─────►  POST /qa/{session_id}/answer (×9)
    │               │       │
    │               │       ▼
    │               │   Final Report Page ──►  GET /reports/{session_id}/final
    │               │       │
    │               │       ├── "Download PDF" ► GET /reports/{session_id}/pdf
    │               │       └── "Book Now" ──►  POST /doctors/book
    │               │
    │               └── "Download Report" ──►  GET /reports/{session_id}/pdf
    │
    ├── Consultations ──────────────────────►  GET /doctors
    │       └── "Book Consultation" ────────►  POST /doctors/book
    │
    └── Profile ────────────────────────────►  GET /profile
            ├── "Update Details" ───────────►  PUT /profile
            └── "View Vault" ───────────────►  GET /profile/records

Family Dashboard (Guardian) ────────────────►  GET /family/members
    ├── "View Dashboard" ───────────────────►  GET /family/members/{id}/reports
    └── "Enroll New Member" ────────────────►  POST /family/members

Doctor Dashboard (Doctor) ──────────────────►  GET /doctor/dashboard
    ├── "Confirm Booking" ──────────────────►  PUT /doctor/bookings/{id}
    └── "Review Full Scan" ─────────────────►  PUT /doctor/bookings/{id}
```

### Authentication Pattern

```javascript
// Store token after login
const { access_token } = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, role })
}).then(r => r.json());

localStorage.setItem('token', access_token);

// Use token for all subsequent requests
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
};
```

### Image Upload Pattern

```javascript
// Upload scan image (multipart/form-data)
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch(`/scan/upload/${scanType}`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData  // No Content-Type header — browser sets it with boundary
});
```

### Q&A Answer Submission Pattern

```javascript
// Submit each answer sequentially
for (let i = 0; i < questions.length; i++) {
  const response = await fetch(`/qa/${sessionId}/answer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question_index: i,
      answer_type: userSelections[i]  // "key_symptom" | "moderate_symptom" | "possible_reason" | "not_relevant"
    })
  });
  
  const result = await response.json();
  
  if (result.is_complete) {
    // Navigate to Final Report page
    navigate(`/reports/${sessionId}/final`);
    break;
  }
}
```

### Error Handling

All error responses follow this format:
```json
{
  "detail": "Human-readable error message"
}
```

Common HTTP status codes:
| Code | Meaning |
|------|---------|
| 400 | Bad request (missing fields, invalid data) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (wrong role or wrong user) |
| 404 | Not found (session, report, doctor) |
| 409 | Conflict (duplicate email on register) |
| 500 | Server error (ML model failure) |

---

## Running the Backend

### Database Setup

1. Install PostgreSQL (version 18+ recommended)
2. Create a local database:
```sql
CREATE DATABASE trilens;
```
3. Copy `.env.example` to `.env` and fill in your password:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/trilens
```

### Running the Server

```bash
# From project root
cd vishwanova

# Install dependencies (including SQLAlchemy and psycopg2)
pip install -r backend/requirements.txt

# Seed the database with demo users, doctors, and family members (Run once)
python -m backend.seed

# Start the server (tables are auto-created on first run)
python -m uvicorn backend.main:app --reload --port 8000

# Open API docs
# http://localhost:8000/docs
```
