# Trilens — Frontend Implementation Specification

> **CRITICAL:** Do NOT touch, modify, rename, or refactor ANY file inside `/backend/`. Do NOT change `.env`, `requirements.txt`, CORS config, database schema, or any existing backend file. Your entire scope is the `/frontend` directory only.

---

## 1. Project Bootstrap

```bash
# From project root /vishwanova
cd frontend
npm create vite@latest . -- --template react
npm install
npm install axios react-router-dom lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**tailwind.config.js**
```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand:   "#1A5C4A",
        bgPage:  "#F0F4F8",
        dark:    "#1A2B2B",
        muted:   "#6B7280",
        alert:   "#DC2626",
        purple:  "#6B21A8",
        amber:   "#D97706",
        success: "#16A34A",
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      borderRadius: { card: "12px", card2: "16px" },
      boxShadow: { card: "0 1px 3px rgba(0,0,0,0.08)" },
    },
  },
  plugins: [],
}
```

**index.css** — add at top:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { background: #F0F4F8; font-family: 'Inter', sans-serif; color: #1A2B2B; margin: 0; }

/* Glass card utility */
.glass-card {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(12px) saturate(1.8);
  -webkit-backdrop-filter: blur(12px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.1);
}

/* Animated nav underline */
.nav-link { position: relative; padding-bottom: 4px; }
.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; width: 100%; height: 2px;
  background: #1A5C4A;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
}
.nav-link:hover::after, .nav-link.active::after {
  transform: scaleX(1);
  transform-origin: left;
}

/* Button glow */
.btn-primary:hover {
  box-shadow: 0 0 20px rgba(26,92,74,0.3);
  transform: translateY(-1px);
}

/* Scroll reveal */
.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.5s ease, transform 0.5s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }
```

---

## 2. Folder Structure

```
/frontend/src/
  api/
    axios.js          ← Axios instance + interceptors
  context/
    AppContext.jsx    ← Global state (auth, sessionId, uploads)
  components/
    Navbar.jsx
    Sidebar.jsx       ← Doctor role only
    Toast.jsx
    ProtectedRoute.jsx
    CircleGauge.jsx   ← Reusable confidence circle
    DoctorCard.jsx
    MedicationCard.jsx
  pages/
    Landing.jsx
    Login.jsx
    Register.jsx
    Dashboard.jsx
    Scan.jsx
    Report.jsx
    QA.jsx
    FinalReport.jsx
    Consultations.jsx
    Profile.jsx
    Family.jsx
    DoctorDashboard.jsx
  App.jsx
  main.jsx
```

---

## 3. API Client — `src/api/axios.js`

```js
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });

// Request interceptor — attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — global error handling
api.interceptors.response.use(
  res => res,
  err => {
    const detail = err?.response?.data?.detail || 'Something went wrong.';
    window.dispatchEvent(new CustomEvent('trilens-toast', { detail }));
    if (err?.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## 4. Global State — `src/context/AppContext.jsx`

```jsx
import { createContext, useContext, useReducer } from 'react';

const initial = {
  token: localStorage.getItem('token') || null,
  user: null,
  sessionId: null,
  currentQuestion: 0,
  uploadsComplete: { eye: false, tongue: false, nail: false },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':    return { ...state, token: action.token, user: action.user };
    case 'SET_USER':    return { ...state, user: action.user };
    case 'SET_SESSION': return { ...state, sessionId: action.sessionId };
    case 'SET_UPLOAD':  return { ...state, uploadsComplete: { ...state.uploadsComplete, [action.scan]: true } };
    case 'SET_Q':       return { ...state, currentQuestion: action.index };
    case 'LOGOUT':      return { ...initial, token: null, user: null };
    default:            return state;
  }
}

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}
```

---

## 5. Toast Component — `src/components/Toast.jsx`

```jsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function Toast() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const handler = e => {
      const id = Date.now();
      setMessages(m => [...m, { id, text: e.detail }]);
      setTimeout(() => setMessages(m => m.filter(x => x.id !== id)), 4000);
    };
    window.addEventListener('trilens-toast', handler);
    return () => window.removeEventListener('trilens-toast', handler);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {messages.map(msg => (
        <div key={msg.id} className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 flex items-center gap-3 max-w-xs animate-slide-in">
          <span className="text-sm text-dark flex-1">{msg.text}</span>
          <button onClick={() => setMessages(m => m.filter(x => x.id !== msg.id))}>
            <X size={14} className="text-muted" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 6. Protected Route — `src/components/ProtectedRoute.jsx`

```jsx
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children, role }) {
  const { state } = useApp();
  if (!state.token) return <Navigate to="/login" replace />;
  if (role && state.user?.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}
```

---

## 7. App Router — `src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';

import Landing        from './pages/Landing';
import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import Scan           from './pages/Scan';
import Report         from './pages/Report';
import QA             from './pages/QA';
import FinalReport    from './pages/FinalReport';
import Consultations  from './pages/Consultations';
import Profile        from './pages/Profile';
import Family         from './pages/Family';
import DoctorDashboard from './pages/DoctorDashboard';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toast />
        <Routes>
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/scan"      element={<ProtectedRoute><Scan /></ProtectedRoute>} />
          <Route path="/report/:session_id"       element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/report/:session_id/final" element={<ProtectedRoute><FinalReport /></ProtectedRoute>} />
          <Route path="/qa/:session_id"           element={<ProtectedRoute><QA /></ProtectedRoute>} />
          <Route path="/consultations"            element={<ProtectedRoute><Consultations /></ProtectedRoute>} />
          <Route path="/profile"                  element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/family"                   element={<ProtectedRoute role="guardian"><Family /></ProtectedRoute>} />
          <Route path="/doctor/dashboard"         element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
```

---

## 8. Page-by-Page Implementation

### PAGE: Landing (`/`) — `Landing.jsx`

**API calls:** None (static page)

**Sections:**
1. **Navbar** — Logo "Trilens" left, "Login" button right → `/login`
2. **Hero** — Animation placeholder card with loading bar, headline "Clinical Health Insights Through Visual Biomarkers", subtext
3. **Feature cards** — Three columns: Tongue Analysis, Ocular Check, Nail Bed Scan (icons + descriptions)
4. **CTA block** — "Scientific Integrity In Every Scan", "Start Your Assessment" button → `/register`
5. **Footer** — Legal & Ethos, Clinical Care links, System Integrity badge

---

### PAGE: Login (`/login`) — `Login.jsx`

**API calls:**
- `POST /auth/login` → body: `{ email, password, role }`
- `POST /auth/demo-login` → body: `{ role }`

**State:** `selectedRole` (default `"patient"`), `email`, `password`, `loading`

**On success:** store `access_token` in `localStorage("token")`, dispatch `SET_AUTH`, navigate based on role:
- `patient` → `/dashboard`
- `guardian` → `/family`
- `doctor` → `/doctor/dashboard`

**UI elements:**
- Title: "Welcome Back" / subtitle: "Enter the Clinical Sanctuary"
- Role selector: 3 cards — Patient (user icon), Doctor (stethoscope icon), Guardian (users icon). Selected card has brand green border + filled icon bg.
- `MEDICAL EMAIL` input with mail icon
- `ACCESS KEY` input with lock icon + eye toggle
- `Keep session secure` checkbox
- `Forgot Access Key?` link (right-aligned)
- Primary button: "Sign in as {Role} →"
- `SIMULATION ACCESS` section: 3 pill buttons — "Patient Demo", "Doctor Demo", "Guardian Demo" — each calls `POST /auth/demo-login` with respective role
- "Don't have an account yet?" → `Create New Account >` → `/register`
- Footer bar: HIPAA COMPLIANT · 256-BIT AES · GDPR PROTECTED

---

### PAGE: Register (`/register`) — `Register.jsx`

**API calls:**
- `POST /auth/register` → body: `{ full_name, email, password, confirm_password, role }`

**On success:** same as login

**UI elements:**
- Title: "Create Clinical Account" / subtitle: "Initialize your secure medical environment"
- Role selector: same 3 cards (Patient, Doctor, Guardian)
- `FULL NAME` input with user icon
- `MEDICAL EMAIL` input with mail icon
- `ACCESS KEY` + `CONFIRM ACCESS KEY` side-by-side password inputs
- Terms checkbox: "I agree to the Clinical Terms of Service and Privacy Protocol."
- Primary button: "CREATE MY CLINICAL ACCOUNT 🛡"
- "Already have an account? Sign In" → `/login`
- Footer bar: HIPAA COMPLIANT · 256-BIT AES · GDPR PROTECTED

---

### PAGE: Dashboard (`/dashboard`) — `Dashboard.jsx`

**API calls (on mount):**
- `GET /auth/me` → greet user by first name
- `GET /reports/history` → recent report cards

**UI elements:**
- **Navbar** — Logo, nav links (Dashboard active, Scans, Consultations, Profile), bell + gear + avatar icons
- **Hero section** with blurred clinical background image:
  - `Good morning/afternoon/evening, {firstName}.` (brand green, 700, ~40px)
  - Subtitle: "Your physiological baseline remains stable. Next diagnostic window in 4 hours."
  - Two outline buttons: `⟳ View All History` → navigate to `/profile` | `↓ Download Report`
- **Diagnostic Scan Modules** — 3 cards with icons:
  - Tongue Scan (teal icon) — "Analyze microbial coating and hydration patterns." → "LAUNCH MODULE →" → `/scan`
  - Ocular Check (purple icon) — "Evaluate retinal clarity and sclera coloration." → "LAUNCH MODULE →" → `/scan`
  - Nail Bed Analysis (grey icon) — "Scan for micronutrient markers and oxygenation." → "LAUNCH MODULE →" → `/scan`
- **Footer** — PRIVACY POLICY · CLINICAL DISCLAIMERS · SUPPORT, disclaimer text

---

### PAGE: Scan (`/scan`) — `Scan.jsx`

**API calls:**
- `POST /scan/upload/{scan_type}` (FormData, no Content-Type header) — for each of eye, tongue, nail
- `POST /scan/analyze` → body: `{ session_id }`

**State:** `activeTab` (`"eye"`), per-tab upload status `{ eye: null, tongue: null, nail: null }`, `analyzing`

**Upload logic:**
```js
const formData = new FormData();
formData.append('file', file);
const res = await api.post(`/scan/upload/${activeTab}`, formData, {
  headers: { 'Content-Type': undefined }  // let browser set multipart boundary
});
// store session_id from first successful upload
dispatch({ type: 'SET_SESSION', sessionId: res.data.session_id });
dispatch({ type: 'SET_UPLOAD', scan: activeTab });
```

**Analyze logic:**
```js
const res = await api.post('/scan/analyze', { session_id: state.sessionId });
navigate(`/report/${state.sessionId}`);
```

**UI elements:**
- **Navbar**
- **Main upload area** (large dashed border card):
  - `SOURCE: WAITING FOR INPUT...` / `STATUS: IDLE` (or EXTRACTED after upload)
  - Cloud upload icon
  - "Ready for Analysis" heading
  - "Select a high-resolution diagnostic image to begin ML extraction"
  - `CHOOSE FILE` button (triggers hidden `<input type="file" accept="image/*">`)
  - "ACCEPTED FORMATS: DICOM, TIFF, JPEG (8K)"
  - After upload: show image preview + "EXTRACTED" green badge
- **Right panel — CAPTURE QUALITY:**
  - Lighting — {status} — green/amber/red dot
  - Position — {status} — green/amber/red dot
  - Clarity — {status} — green/amber/red dot
  - Tip card: "Hold device steady. The subject should look directly at the teal dot."
- **Bottom tab bar** — 3 tabs: EYE (eye icon) | TONGUE (globe icon) | NAIL (bandage icon). Each tab shows a checkmark when uploaded.
- **ANALYZE button** — disabled (greyed) until all 3 uploaded. When enabled: brand green button. Shows spinner during analysis.
- **Footer**

---

### PAGE: Initial Report (`/report/:session_id`) — `Report.jsx`

**API calls (on mount):**
- `GET /reports/{session_id}`

**On "Start Clinical Q&A" click:**
- `POST /qa/{session_id}/start` → navigate to `/qa/{session_id}`

**UI elements:**
- **Navbar** (Dashboard, Scans active, Consultations, Profile)
- `↓ Download Report` button top-right (calls PDF endpoint)
- **Top card:**
  - Left: CircleGauge showing `confidence * 100`% with "CONFIDENCE" label and "HIGH ACCURACY" sub-label
  - Right: "ANALYSIS COMPLETE" purple pill badge, primary disease name (large), "Last scanned: {date}"
- **Severity card:**
  - "SEVERITY LEVEL" label
  - Medical bag icon
  - Severity name (large bold)
  - "IMMEDIATE ATTENTION NOT REQUIRED" pill (or appropriate text)
- **Top 3 Probable Conditions** — 3 side-by-side cards:
  - Card 1: "PRIMARY MATCH" label, percentage, disease name, brand green progress bar
  - Card 2: "POTENTIAL" label, percentage, disease name, purple progress bar
  - Card 3: "POTENTIAL" label, percentage, disease name, grey progress bar
- **Precautions to Take** — list of precaution strings with shield icon bullets
- **Refine Diagnostic Accuracy CTA card** (right side):
  - Question mark icon
  - "Refine Diagnostic Accuracy" heading
  - "Answer 5 targeted clinical questions to improve the precision of your scan analysis."
  - `Start Clinical Q&A →` primary button
  - "⏱ APPROX. 2 MINUTES"
- **Medical Disclaimer** — warning triangle, disclaimer text
- **Footer**

---

### PAGE: Clinical Q&A (`/qa/:session_id`) — `QA.jsx`

**API calls (on mount):**
- `GET /qa/{session_id}/questions`

**On each answer submit:**
- `POST /qa/{session_id}/answer` → body: `{ question_index: currentIndex, answer_type: selected }`
- When response has `is_complete: true` → navigate to `/report/{session_id}/final`

**Answer type mapping (4 options per question):**
- Option A → `"key_symptom"`
- Option B → `"moderate_symptom"`
- Option C → `"possible_reason"`
- Option D → `"not_relevant"`

**State:** `questions[]`, `currentIndex`, `selectedOption`, `loading`

**UI elements:**
- **Navbar** — "Assessment" active
- **Progress bar** — "STEP {X} OF {total}" with filled green bar
- **Question text** — large bold centered heading
- **4 option cards** — each with icon + text + radio circle on right. Selected card has green left border accent.
- **Right info panel:** "WHY ARE WE ASKING?" card with explanation text and "✓ CLINICAL INSIGHT" pill
- **Bottom bar:** `← Back` (left) | `Continue →` primary button (right, enabled only when option selected)

---

### PAGE: Final Report (`/report/:session_id/final`) — `FinalReport.jsx`

**API calls (on mount):**
- `GET /reports/{session_id}/final`

**On "Book Now":**
- `POST /doctors/book` → body: `{ doctor_id, session_id }`

**On "Download PDF Report":**
```js
const res = await api.get(`/reports/${sessionId}/pdf`, { responseType: 'blob' });
const url = window.URL.createObjectURL(new Blob([res.data]));
const a = document.createElement('a');
a.href = url; a.download = 'trilens-report.pdf'; a.click();
window.URL.revokeObjectURL(url);
```

**UI elements:**
- **Navbar** (Dashboard, Scans active, Reports, Consultations, Profile) + search bar
- **"INTERNAL ID" badge** + report ID heading + "Patient: {name} · Generated: {date}" + `↓ Download PDF Report` button
- **Left column:**
  - CircleGauge — `diagnostic_confidence * 100`%
  - Severity card — severity level with checkmark icon
- **Right column:**
  - "PROBABLE PATHOLOGIES" section — top 3 pathologies with horizontal progress bars (teal / purple / grey)
  - If `see_doctor_flag` true: dark teal **Mandatory Clinical Action** card with medical bag icon + `mandatory_clinical_action` text
- **Medications card** — "RECOMMENDED OVER-THE-COUNTER" — each medication as a card with icon, name, dosage
- **Crucial Precautions** — red warning icon header, bullet list of precautions
- **Escalation Flags** — list of red pill tags
- **Recommended Specialists** — "View All Directory →" link, 3-column grid of DoctorCards:
  - Photo, name, specialty, distance, rating (stars + count), consultation fee, "Book Now" button
- **Footer**

---

### PAGE: Consultations (`/consultations`) — `Consultations.jsx`

**API calls (on mount):**
- `GET /doctors`

**On tab filter click:**
- `GET /doctors?category={tab}` (tabs: All | Ocular | Oral (Tongue) | Nail Health)

**On "Book Consultation":**
- `POST /doctors/book` → body: `{ doctor_id, session_id: state.sessionId || undefined }`

**UI elements:**
- **Navbar** (Consultations active)
- "Clinical Consultations" heading + subtitle
- Filter tab pills: All | Ocular | Oral (Tongue) | Nail Health
- **Doctor cards** (2-column grid on desktop, 1 on mobile):
  - Photo, name, "VERIFIED" badge, specialty, tag pills (specializations), star rating, fee, availability, "Book Consultation" button + eye icon button
- **Trust badges** row: Verified Specialists · HIPAA Compliant · HD Encrypted Video
- **Footer**

---

### PAGE: Profile (`/profile`) — `Profile.jsx`

**API calls (on mount):**
- `GET /profile`

**On "UPDATE DETAILS":**
- `PUT /profile` → body: `{ full_name, email }`

**On "VIEW VAULT":**
- `GET /profile/records` → display records table

**UI elements:**
- **Navbar** (Diagnostics, Patient Labs, Therapy, Research)
- **Profile header card:**
  - Avatar image (or initials fallback), shield icon badge
  - `PATIENT ID: {patient_id}` label
  - Full name (large)
  - "Clinical Stability: {clinical_stability}" green pill badge
  - "Member since {year}" date
  - Metric Trend mini chart (right)
- **3-column cards:**
  - Personal Information — "UPDATE DETAILS →"
  - Clinical Records — "VIEW VAULT →"
  - Security & Privacy — "MANAGE ACCESS →"
- **Connected Devices card** — "3 NODES ONLINE" badge, 3 device tiles: Trilens Link (98% Synced), Ocular Scanner (Calibrated), Nail Bed Sensor (Monitoring)
- **Preferences card** — "OPEN SETTINGS →"
- `SIGN OUT` button (calls `dispatch({ type: 'LOGOUT' })`, clears localStorage, navigates to `/login`)
- "SECURITY LEVEL: GRADE-A AES-256"
- **Footer**

---

### PAGE: Family Dashboard (`/family`) — `Family.jsx`

> **Only accessible when `user.role === "guardian"`**

**API calls (on mount):**
- `GET /family/members`

**On "View Dashboard":**
- `GET /family/members/{member_id}/reports` → show modal or navigate

**On "ENROLL NEW FAMILY MEMBER":**
- Show modal form → `POST /family/members` → body: `{ name, relationship, email }`

**UI elements:**
- **Navbar** — Logo, gear + avatar icons
- **Background**: teal gradient wash
- "Family Wellness Dashboard" heading + subtitle
- **Member cards** (3-column grid, horizontal scroll on mobile):
  - Avatar with colored border ring
  - Status badge: "STABLE" (grey dot), "NEW REPORT AVAILABLE" (red dot), "CHECKUP PENDING" (grey dot)
  - Name, RELATION sub-label
  - "View Dashboard >" primary button
- **Dashed "ENROLL NEW FAMILY MEMBER" button** (full-width centered at bottom)
- **Footer**

---

### PAGE: Doctor Dashboard (`/doctor/dashboard`) — `DoctorDashboard.jsx`

> **Only accessible when `user.role === "doctor"`**

**API calls (on mount):**
- `GET /doctor/dashboard`

**On "Confirm Booking":**
- `PUT /doctor/bookings/{booking_id}` → body: `{ action: "confirm" }`

**On "Review Full Scan":**
- `PUT /doctor/bookings/{booking_id}` → body: `{ action: "review" }` → navigate to `/report/{session_id}`

**UI elements:**
- **Left sidebar** (210px fixed):
  - Doctor avatar + name + "SENIOR PATHOLOGIST" label
  - Nav items: Clinical Alerts (warning icon), Diagnostic Feed (active), Account Settings
- **Top navbar** — Logo, Dashboard | Patients (active) | Schedule | Resources, bell + avatar
- **Page header**: "Patient Bookings" heading + subtitle + date badge
- **Stats cards** (3-column):
  - TOTAL PATIENTS — large number + "+12%"
  - PENDING REVIEWS — large purple number + "Scan data ready"
  - EMERGENCY ESCALATIONS — large red number + red pulsing dot
- **Clinical Priority Queue:**
  - Filter pills: "All Types" | "High Risk"
  - Table headers: PATIENT PROFILE | SYMPTOM CLUSTER | SCAN TYPE | VISUAL BIOMARKER | CRITERIA STATUS | ACTIONS
  - Each booking row: avatar + name + patient_id | symptom cluster | scan type badge | thumbnail | criteria status dot | "Confirm Booking" + "Review Full Scan" buttons
- **Diagnostic Efficiency card** — text + "REVIEW STATS" button
- **Live System Status** panel — AI Pre-Processor status bar
- **Footer**

---

## 9. Reusable Components

### `CircleGauge.jsx`
SVG circle with stroke-dasharray animation showing a percentage. Props: `value` (0-100), `size` (px), `label`.

```jsx
export default function CircleGauge({ value = 92, size = 140, label = "HIGH ACCURACY" }) {
  const r = 54, c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8"/>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1A5C4A" strokeWidth="8"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 1s ease' }}/>
        <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1A2B2B">{value}%</text>
        <text x="60" y="74" textAnchor="middle" fontSize="9" fill="#6B7280">CONFIDENCE</text>
      </svg>
      <span className="text-xs font-semibold text-muted tracking-widest mt-1">{label}</span>
    </div>
  );
}
```

### `DoctorCard.jsx`
Props: `doctor` object. Renders photo/initials, name, specialty, rating stars, distance, fee, "Book Now" button.

### `Navbar.jsx`
Props: `role`. Renders appropriate nav links per role. Uses `useNavigate` for "Trilens" logo click → `/dashboard`. Avatar click → `/profile`.

---

## 10. Role-Based Navigation

| Role      | Default route after login | Accessible routes                                      |
|-----------|--------------------------|--------------------------------------------------------|
| patient   | /dashboard               | /dashboard, /scan, /report/*, /qa/*, /consultations, /profile |
| guardian  | /family                  | /family, /dashboard, /consultations, /profile          |
| doctor    | /doctor/dashboard        | /doctor/dashboard, /consultations, /profile            |

---

## 11. Session ID Lifecycle

```
POST /scan/upload/eye   →  response.session_id  →  dispatch SET_SESSION  →  stored in context
POST /scan/upload/tongue  →  (session_id already exists, ignore new one or assert same)
POST /scan/upload/nail    →  same
POST /scan/analyze      →  body: { session_id }
GET  /reports/{session_id}
POST /qa/{session_id}/start
POST /qa/{session_id}/answer  (×9)
GET  /reports/{session_id}/final
GET  /reports/{session_id}/pdf
POST /doctors/book      →  body: { doctor_id, session_id }
```

> **Never lose session_id between page navigations.** Store in Context. Additionally pass via URL params (/report/:session_id) so a page refresh can recover it from the URL.

---

## 12. Scroll Reveal (Intersection Observer)

Add to `main.jsx` or a `useEffect` in each page:

```js
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

---

## 13. Mobile Responsiveness

- Navbar collapses to hamburger menu on `< md` screens
- 3-column cards → 1-column on mobile
- Doctor sidebar hidden on mobile, shown as bottom sheet on toggle
- Scan tabs always visible at bottom (full-width)
- All font sizes scale with `text-sm` / `text-base` / `text-lg` breakpoints
- Minimum tap target size: 44px × 44px for all interactive elements

---

## 14. Dev Server

```bash
cd frontend
npm run dev
# Starts on http://localhost:5173
# Backend must be running on http://localhost:8000
```

**Vite proxy (optional, add to vite.config.js if CORS issues):**
```js
export default {
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true, rewrite: path => path.replace(/^\/api/, '') }
    }
  }
}
```
> Only use proxy if needed. If used, update axios `baseURL` to `''` and prefix all calls with `/api`.

---

## 15. Deliverable Checklist

- [ ] `npm run dev` starts with zero errors on localhost:5173
- [ ] All 10 pages implemented and connected to their API endpoints
- [ ] `session_id` stored in context and passed correctly through full scan → Q&A → final report flow
- [ ] Auth token stored, attached via interceptor, cleared on 401
- [ ] PDF download works via blob response
- [ ] Role-based routing enforced (guardian → /family, doctor → /doctor/dashboard)
- [ ] Toast notifications appear for all API errors
- [ ] All 3 scan uploads tracked; Analyze button enabled only when all 3 complete
- [ ] Mobile responsive layout on all pages
- [ ] No backend files modified
