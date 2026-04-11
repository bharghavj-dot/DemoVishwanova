import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

const ANSWER_TYPE_ORDER = ['key_symptom', 'moderate_symptom', 'possible_reason', 'not_relevant'];

const ANSWER_LABELS = ['A', 'B', 'C', 'D'];

const ANSWER_ICONS = [
  // A — key symptom (strong confirm)
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  // B — moderate symptom
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  // C — possible reason
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  // D — not relevant
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
];

export default function QA() {
  const { session_id } = useParams();
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [totalSteps, setTotalSteps] = useState(9);
  const [error, setError] = useState(null);

  // ── Start Q&A session → triggers Gemini question generation ──
  const startQA = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.post(`/qa/${session_id}/start`);
      const qs = res.data.questions || [];
      setQuestions(qs);
      setTotalSteps(res.data.total_questions || qs.length || 9);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to generate questions. Please try again.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, [session_id]);

  useEffect(() => {
    startQA();
  }, [startQA]);

  // ── Submit answer ──
  const handleSubmit = async () => {
    if (selectedType === null) return;
    setSubmitting(true);
    try {
      const res = await API.post(`/qa/${session_id}/answer`, {
        question_index: currentIdx,
        answer_type: selectedType,
      });

      dispatch({ type: 'SET_CURRENT_QUESTION', payload: currentIdx + 1 });

      if (res.data.is_complete) {
        navigate(`/report/${session_id}/final`);
        return;
      }

      // Animate transition
      setAnimating(true);
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
        setSelected(null);
        setSelectedType(null);
        setAnimating(false);
      }, 300);

    } catch (err) {
      // Error handled by axios interceptor (toast)
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state (Gemini generating) ──
  if (loading) {
    return (
      <div className="min-h-screen bg-clinical-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Animated DNA helix spinner */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-primary-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-b-accent-teal border-r-transparent border-t-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-clinical-text mb-2">
            Generating Clinical Questions
          </h2>
          <p className="text-sm text-clinical-muted leading-relaxed">
            Our AI is analyzing your diagnosis and creating personalized clinical questions
            to refine the assessment...
          </p>
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-clinical-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-clinical-text mb-2">Question Generation Failed</h2>
          <p className="text-sm text-clinical-muted mb-6">{error}</p>
          <button onClick={startQA} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!questions.length) return null;

  const q = questions[currentIdx];
  if (!q) return null;

  const progressPercent = ((currentIdx + 1) / totalSteps) * 100;

  // Build options from the answers dict
  const answerEntries = q.answers ? Object.entries(q.answers) : [];
  // Sort in canonical order: key_symptom → moderate_symptom → possible_reason → not_relevant
  const sortedEntries = ANSWER_TYPE_ORDER
    .map((type, i) => {
      const entry = answerEntries.find(([key]) => key === type);
      return entry ? { type, label: ANSWER_LABELS[i], text: entry[1]?.text || '', icon: ANSWER_ICONS[i], idx: i } : null;
    })
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-clinical-bg flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">

        {/* ── Progress header ── */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-clinical-muted mb-3">
            Question {currentIdx + 1} of {totalSteps}
          </p>
          <div className="w-full max-w-md mx-auto h-2 rounded-full bg-clinical-border overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-clinical-muted">
            {Math.round(progressPercent)}% complete
          </p>
        </div>

        {/* ── Question + Options card ── */}
        <div
          className={`transition-all duration-300 ease-out ${
            animating ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
          }`}
        >
          <div className="grid lg:grid-cols-[1fr_320px] gap-8">
            {/* Main question area */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-clinical-text leading-tight mb-8">
                {q.question}
              </h1>

              <div className="space-y-3">
                {sortedEntries.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => { setSelected(opt.idx); setSelectedType(opt.type); }}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 text-left group ${
                      selected === opt.idx
                        ? 'border-primary-500 bg-primary-50 shadow-clinical'
                        : 'border-clinical-border bg-white hover:border-primary-200 hover:shadow-clinical'
                    }`}
                    id={`qa-option-${opt.type}`}
                  >
                    {/* Label badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors font-bold text-sm ${
                      selected === opt.idx
                        ? 'bg-primary-500 text-white'
                        : 'bg-clinical-bg text-primary-500'
                    }`}>
                      {opt.label}
                    </div>

                    {/* Option text */}
                    <span className="font-medium text-clinical-text flex-1 text-sm md:text-base">
                      {opt.text}
                    </span>

                    {/* Radio indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      selected === opt.idx ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                    }`}>
                      {selected === opt.idx && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Why asking sidebar ── */}
            <div className="space-y-4">
              <div className="card-static p-6 border-l-4 border-l-primary-500">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500">Why Are We Asking?</h3>
                </div>
                <p className="text-sm text-clinical-muted leading-relaxed">{q.why_asking}</p>
                <div className="mt-4 pt-4 border-t border-clinical-border">
                  <span className="badge-info text-[10px]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {q.clinical_insight || 'Clinical Insight'}
                  </span>
                </div>
              </div>

              {/* Progress dots */}
              <div className="card-static p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-clinical-muted mb-3">Progress</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        i < currentIdx
                          ? 'bg-primary-500 text-white'
                          : i === currentIdx
                          ? 'bg-primary-100 text-primary-500 ring-2 ring-primary-500'
                          : 'bg-clinical-bg text-clinical-muted'
                      }`}
                    >
                      {i < currentIdx ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom navigation bar ── */}
      <div className="sticky bottom-0 bg-white border-t border-clinical-border py-4 px-6 shadow-clinical">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (currentIdx > 0) {
                setAnimating(true);
                setTimeout(() => {
                  setCurrentIdx(currentIdx - 1);
                  setSelected(null);
                  setSelectedType(null);
                  setAnimating(false);
                }, 200);
              }
            }}
            disabled={currentIdx === 0}
            className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>

          <button
            onClick={handleSubmit}
            disabled={selected === null || submitting}
            className="btn-primary flex items-center gap-2 px-8"
            id="qa-continue"
          >
            {submitting ? <LoadingSpinner size="sm" /> : (
              <>
                {currentIdx === totalSteps - 1 ? 'Finish' : 'Next Question'}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
