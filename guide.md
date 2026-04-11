# Trilens Frontend Integration Guide

This guide outlines exactly how the frontend should connect to the FastAPI backend. Our backend architecture maps exactly to the frontend UI mockups, utilizing a **Session-Based State flow** to carry a diagnostic scan from image upload all the way through to final PDF generation.

---

## 1. Network & Setup Defaults

*   **Base API URL:** `http://localhost:8000`
*   **Documentation:** `http://localhost:8000/docs` (Swagger UI - excellent for seeing exact JSON structures)
*   **CORS:** Already configured to accept requests from `localhost:3000` and `localhost:5173`. 
*   **Content-Type:** Use `application/json` for all requests **except** Image Uploads (which use `multipart/form-data`).

---

## 2. Authentication Standard (Bearer Tokens)

Every logged-in request requires an Authorization header.
When a user logs in (or uses Demo Login), the backend returns an `access_token`.
**Frontend Action:** Store this token (e.g., in `localStorage`) and attach it to every subsequent `fetch` or `axios` call.

```javascript
// Axios interceptor example
axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
```

---

## 3. The Core Concept: `session_id`
The entire diagnostic workflow (Uploads -> XGBoost Analysis -> Reports -> Q&A -> Final Report) is glued together by a single `session_id`. 
**Frontend Action:** Once the first image is uploaded and a `session_id` is returned, **store this ID in your frontend state (Vuex/Redux/Context)**. You will need to pass this ID back to the server as a URL parameter or body attribute for the next 5 pages!

---

## 4. Page-by-Page Implementation Guide

### A. Login & Registration
*   **Endpoint:** `POST /auth/login` or `POST /auth/register` (or `POST /auth/demo-login` for UI simulation buttons).
*   **Flow:** Send email, password, and `role` (`"patient"`, `"doctor"`, or `"guardian"`).
*   **Result:** Save the returned `access_token` and route the user to `/dashboard`.

### B. Image Analysis / Scan Page
This is a multi-step upload page. The backend requires exactly 3 images (Eye, Tongue, Nail) before it can run the AI.
*   **Endpoint:** `POST /scan/upload/{scan_type}` (scan_type = `eye`, `tongue`, or `nail`).
*   **Flow:**
    1.  User selects the 'Eye' tab and chooses a file.
    2.  Send the file using `FormData` (do **not** manually set the Content-Type header to JSON; let the browser handle the multipart boundary).
    3.  Backend responds immediately with the extracted features and a `session_id`. **Save this session_id**.
    4.  Repeat for Tongue and Nail.
*   **Analysis Trigger:** Once you have locally tracked that all 3 uploads succeed, enable the "Analyze" button.
*   **Endpoint:** `POST /scan/analyze` (Pass the `session_id` in the JSON body).
*   **Result:** Backend merges all features and runs the XGBoost model. On success, navigate to the **Report Page**.

### C. Initial Report Page
*   **Endpoint:** `GET /reports/{session_id}`
*   **Flow:** Fetch the generated report. The response matches your UI perfectly (Top 3 conditions with percentages, severity level, precautions).
*   **Action:** When the user clicks "Start Clinical Q&A", immediately call `POST /qa/{session_id}/start` and navigate to the Q&A page.

### D. Clinical Q&A Flow (Dynamic MCQ)
The backend generates exactly 9 questions dynamically using an LLM.
*   **Endpoint:** `GET /qa/{session_id}/questions` (or use the response from the `start` call above).
*   **Flow (Step X of 9):**
    1.  Render question 0.
    2.  User selects one of the 4 MCQ options.
    3.  Call `POST /qa/{session_id}/answer`. Body: `{ "question_index": 0, "answer_type": "key_symptom" }`. (Map the 4 radio buttons to: `"key_symptom"`, `"moderate_symptom"`, `"possible_reason"`, `"not_relevant"`).
    4.  Advance UI to question 1.
    5.  Repeat until the backend responds with `"is_complete": true`.
*   **Result:** Auto-navigate to the **Final Report Page**.

### E. Final Report Page
*   **Endpoint:** `GET /reports/{session_id}/final`
*   **Flow:** Fetch the finalized report. Bayesian mathematics have now shifted the probabilities. The JSON includes a `mandatory_clinical_action` block, `medications`, and an array of `recommended_specialists` (Doctor Cards).
*   **Action (PDF):** The "Download PDF" button should simply trigger a browser download from `GET /reports/{session_id}/pdf` (Ensure you pass the Authorization header in your fetch, then convert the response blob to a downloadable URL).

### F. Doctor Consultation Booking
*   **Endpoint:** `GET /doctors` (Accepts an optional `?category=` filter query matching your UI Tabs).
*   **Endpoint:** `POST /doctors/book` (Pass `doctor_id`, and optionally the `session_id` to link the scan to the doctor).

---

## 5. Expected Error Handling
All errors thrown by the backend follow the standard FastAPI format. If a request returns a `400`, `401`, `403`, or `404`, the body will look like this:
```json
{
  "detail": "Session must be in 'analyzed' state to start Q&A."
}
```
**Frontend Action:** Create a global axios interceptor that catches error responses, reads `error.response.data.detail`, and displays it in a toast/alert notification to the user.
