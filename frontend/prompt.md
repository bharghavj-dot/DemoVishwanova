You are a senior frontend engineer. Your ONLY job is to build and wire up the complete frontend 
for the Trilens medical diagnostic web app. The backend is 100% complete and working. 
DO NOT touch, modify, rename, or refactor ANY backend file, variable, function, route, 
model, schema, or database config — not even a single character. Your entire scope is 
the /frontend directory only.

===========================================================
PROJECT STRUCTURE
===========================================================
The project root is /vishwanova (or wherever the project lives).
- /backend     ← HANDS OFF. Fully complete. Do not touch.
- /frontend    ← Your entire workspace. Build everything here.
- /frontend/img ← Contains reference mockup screenshots of every page.
                  Study every image carefully. Match the UI pixel-for-pixel.

===========================================================
TECH STACK (Frontend)
===========================================================
- Framework: React (Vite) or Vue 3 (Vite) — pick whichever matches any 
  existing package.json in /frontend, otherwise use React + Vite.
- Styling: Tailwind CSS
- HTTP Client: Axios (with interceptors)
- Routing: React Router v6 (or Vue Router 4)
- State: React Context + useReducer (or Pinia for Vue)
- NO backend changes. NO new backend files. NO proxy config changes 
  that touch backend code.

===========================================================
BACKEND CONNECTION
===========================================================
Base API URL: http://localhost:8000
- All API calls go to this URL.
- Configure Axios baseURL to http://localhost:8000
- CORS is already handled by the backend for localhost:3000 and localhost:5173.
- For every request (except auth + health), attach:
  Authorization: Bearer <token from localStorage>
- Create a global Axios interceptor that:
  1. Attaches the Bearer token automatically to every request.
  2. Catches any error response, reads error.response.data.detail, 
     and displays it as a toast/alert notification.

===========================================================
AUTHENTICATION
===========================================================
Endpoints:
  POST /auth/register   → { full_name, email, password, confirm_password, role }
  POST /auth/login      → { email, password, role }
  POST /auth/demo-login → { role }   (for demo buttons on login page)
  GET  /auth/me         → returns current user object

Flow:
1. On login/register/demo-login success, backend returns { access_token, user }.
2. Store access_token in localStorage under key "token".
3. Store user object in global auth state/context.
4. Redirect to /dashboard.
5. On any 401 response, clear token and redirect to /login.

Role values: "patient" | "doctor" | "guardian"
Show role selector on login/register page (3 buttons or dropdown).
Demo login buttons: one per role.

===========================================================
SESSION_ID — CRITICAL CONCEPT
===========================================================
The entire diagnostic flow is glued by a session_id.
- First image upload returns a session_id in the response.
- Store session_id in global state (Context/Pinia) immediately.
- Pass this session_id to every subsequent scan, report, Q&A, and PDF endpoint.
- Do NOT hardcode it. Do NOT lose it between page navigations.

===========================================================
PAGE-BY-PAGE IMPLEMENTATION
===========================================================
Study the corresponding image in /frontend/img for each page before coding it.

--- PAGE 1: Login & Register (/login, /register) ---
  Mockup: Login.png / Register.png (check /frontend/img)
  - Email, password, role selector fields.
  - "Login" button → POST /auth/login
  - "Register" button → POST /auth/register
  - Demo login buttons (Patient / Doctor / Guardian) → POST /auth/demo-login
  - Show loading spinner during request.
  - On success → navigate to /dashboard.
  - On error → show toast with error.response.data.detail.

--- PAGE 2: Dashboard (/dashboard) ---
  Mockup: Dashboard.png
  - On mount: call GET /auth/me (for greeting name) and GET /reports/history 
    (for recent scan summaries).
  - Display user's name in header greeting.
  - Show recent report cards from /reports/history response.
  - Static diagnostic module cards: Tongue Scan, Ocular Check, Nail Bed Analysis.
  - Each module card has a "Launch Module" button → navigates to /scan.
  - Nav sidebar/bottom nav with links to: Dashboard, Scan, Consultations, 
    Family, Profile, (Doctor Dashboard if role=doctor).

--- PAGE 3: Scan / Image Analysis (/scan) ---
  Mockup: Scan.png (or ImageAnalysis.png)
  - Three tabs at the bottom: Eye | Tongue | Nail
  - Each tab shows a file picker ("CHOOSE FILE") and a preview area.
  - On file select, immediately POST /scan/upload/{scan_type} using FormData:
      const formData = new FormData();
      formData.append('file', imageFile);
      fetch('/scan/upload/eye', { 
        method: 'POST', 
        headers: { Authorization: 'Bearer ...' }, 
        body: formData 
        // DO NOT set Content-Type manually — browser sets multipart boundary
      });
  - On success, display:
    - session_id stored globally.
    - Capture quality panel: lighting, position, clarity from response.
    - Status: "EXTRACTED" badge.
  - Track locally which of the 3 types have been uploaded successfully.
  - Only enable the "ANALYZE" button when all 3 are uploaded.
  - "ANALYZE" click → POST /scan/analyze with body { session_id }.
  - Show loading state during analysis (XGBoost is running).
  - On success → navigate to /report/{session_id}.

--- PAGE 4: Initial Report (/report/:session_id) ---
  Mockup: Report.png
  - On mount: GET /reports/{session_id}
  - Display:
    - Circular confidence gauge showing confidence as percentage (e.g. 92%).
    - "ANALYSIS COMPLETE" badge.
    - Top 3 probable conditions as horizontal progress bars with percentages.
    - Severity level card (e.g. "Mild" with note).
    - Precautions list (bullet points).
    - "Start Clinical Q&A →" button.
  - "Start Clinical Q&A" click:
    1. Call POST /qa/{session_id}/start
    2. Navigate to /qa/{session_id}

--- PAGE 5: Clinical Q&A (/qa/:session_id) ---
  Mockup: QA.png (or ClinicalQA.png)
  - On mount: GET /qa/{session_id}/questions (or use response from /start call).
  - Render questions one at a time. Show "Step X of 9" progress indicator.
  - Each question has exactly 4 MCQ options. Map them to these answer_type values:
      Option A → "key_symptom"
      Option B → "moderate_symptom"
      Option C → "possible_reason"
      Option D → "not_relevant"
  - On user selecting an option and clicking "Next":
      POST /qa/{session_id}/answer with body:
      { "question_index": currentIndex, "answer_type": selectedAnswerType }
  - Advance to next question.
  - When response contains "is_complete": true → navigate to /report/{session_id}/final.
  - Show progress bar updating after each answer.

--- PAGE 6: Final Report (/report/:session_id/final) ---
  Mockup: Final_Report.png
  - On mount: GET /reports/{session_id}/final
  - Display:
    - Diagnostic confidence circle/gauge.
    - Probable pathologies with horizontal progress bars.
    - Severity badge with icon.
    - If see_doctor_flag is true → show "Mandatory Clinical Action" warning card 
      with mandatory_clinical_action text.
    - Medications list (name + dosage).
    - Precautions list.
    - Escalation flags section.
    - Recommended Specialists section: render doctor cards from 
      recommended_specialists array. Each card shows name, specialty, 
      rating, fee, availability, distance, and a "Book Now" button.
    - "Book Now" → POST /doctors/book with { doctor_id, session_id }.
    - "Download PDF Report" button → trigger browser download from 
      GET /reports/{session_id}/pdf by:
        const res = await axios.get(`/reports/${sessionId}/pdf`, { 
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` }
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url; a.download = 'trilens-report.pdf'; a.click();

--- PAGE 7: Consultations / Doctors (/consultations) ---
  Mockup: Consultations.png (or Doctors.png)
  - On mount: GET /doctors (optionally with ?category= filter).
  - Show filter tabs matching UI mockup categories.
  - On tab click → GET /doctors?category={tab_value}
  - Render doctor cards: name, specialty, rating, fee, availability.
  - "Book Consultation" → POST /doctors/book with { doctor_id } 
    (include session_id if available in state).

--- PAGE 8: Profile (/profile) ---
  Mockup: Profile.png
  - On mount: GET /profile
  - Display: avatar, patient_id, full_name, role, clinical_stability badge, 
    member_since date.
  - Sections: Personal Information, Clinical Records, Security & Privacy.
  - "UPDATE DETAILS" button → opens edit form → PUT /profile with 
    { full_name, email }.
  - "VIEW VAULT" button → GET /profile/records → display records table/list.

--- PAGE 9: Family Dashboard (/family) — Guardian role only ---
  Mockup: Family_Dashboard.png (or Family.png)
  - On mount: GET /family/members
  - List family members with name, age, relation.
  - "View Dashboard" per member → GET /family/members/{member_id}/reports
  - "Enroll New Member" button → POST /family/members with member details form.

--- PAGE 10: Doctor Dashboard (/doctor/dashboard) — Doctor role only ---
  Mockup: Doctor_Dashboard.png
  - On mount: GET /doctor/dashboard
  - Stats cards: Total Patients, Pending Reviews, Emergency Escalations.
  - Clinical Priority Queue table: patient name, symptom cluster, scan type, 
    criteria status, actions.
  - "Confirm Booking" → PUT /doctor/bookings/{booking_id} with { action: "confirm" }
  - "Review Full Scan" → PUT /doctor/bookings/{booking_id} with { action: "review" }
    then navigate to /report/{session_id} of that booking.

===========================================================
ROUTING & ROUTE PROTECTION
===========================================================
- Protected routes: all pages except /login and /register require a valid token.
- If no token in localStorage → redirect to /login.
- Role-based access:
  - /family → only accessible if user.role === "guardian"
  - /doctor/dashboard → only accessible if user.role === "doctor"
- Default redirect after login based on role:
  - "patient" → /dashboard
  - "guardian" → /family
  - "doctor" → /doctor/dashboard

===========================================================
DATABASE (PostgreSQL)
===========================================================
The database is already set up and seeded by the backend. 
DO NOT touch the database directly from the frontend.
All DB reads/writes go through the backend API endpoints only.
The frontend never connects to PostgreSQL directly.
Connection string used by backend (for reference only, do not use in frontend):
  postgresql://postgres:<password>@localhost:5432/trilens

===========================================================
GLOBAL STATE SHAPE
===========================================================
Maintain this in Context/Pinia:
{
  token: string | null,          // from localStorage
  user: UserObject | null,       // from /auth/me
  sessionId: string | null,      // from first scan upload, persists through entire flow
  currentQuestion: number,       // Q&A progress (0-8)
  uploadsComplete: {             // track scan upload status
    eye: boolean,
    tongue: boolean,
    nail: boolean
  }
}

===========================================================
ERROR HANDLING (GLOBAL)
===========================================================
- Create an Axios response interceptor.
- On any error response, extract error.response.data.detail.
- Display it in a toast notification (top-right, auto-dismiss after 4 seconds).
- On 401 → clear token from localStorage, reset auth state, redirect to /login.
- Show loading spinners on all async operations.

===========================================================
UI/DESIGN RULES
===========================================================
1. Open every .png file in /frontend/img before coding that page.
2. Match the layout, color scheme, typography, and component style exactly.
3. Use Tailwind CSS utility classes for all styling.
4. The app appears to use a dark clinical/medical theme — preserve it.
5. All UI text, labels, and button copy must match the mockups exactly.
6. Do NOT invent new pages, routes, or features not shown in mockups or endpoints.

===========================================================
WHAT YOU MUST NOT DO
===========================================================
- Do NOT edit any file in /backend/
- Do NOT rename any backend variable, function, route, or model
- Do NOT add new backend endpoints
- Do NOT change the database schema
- Do NOT change .env or backend config files
- Do NOT change backend CORS settings
- Do NOT change requirements.txt
- Do NOT proxy through a different port unless it breaks CORS 
  (and even then, only configure the Vite proxy in vite.config.js, 
  which is a frontend-only file)

===========================================================
DELIVERABLES
===========================================================
1. A fully working /frontend directory with all pages implemented.
2. Every page connected to its respective backend endpoint.
3. session_id correctly persisted and passed through the full flow.
4. Auth token stored, attached, and cleared correctly.
5. PDF download working with blob response handling.
6. Responsive layout matching all mockup images.
7. Global error toast notifications.
8. Role-based routing enforced.
9. npm run dev starts the frontend on localhost:5173 with no errors.

Start by reading all .png files in /frontend/img, then scaffold the 
project structure, then implement page by page in the order listed above.