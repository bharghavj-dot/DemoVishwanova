import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

const answerTypes = ['key_symptom', 'moderate_symptom', 'possible_reason', 'not_relevant'];

const answerIcons = [
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" /></svg>,
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
];

export default function QA() {
  const { session_id } = useParams();
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx]  = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalSteps, setTotalSteps] = useState(9);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await API.get(`/qa/${session_id}/questions`);
        setQuestions(res.data.questions || []);
        setTotalSteps(res.data.total_questions || 9);
      } catch (err) {
        // handled
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [session_id]);

  const handleSubmit = async () => {
    if (selected === null) return;
    setSubmitting(true);
    try {
      const res = await API.post(`/qa/${session_id}/answer`, {
        question_index: currentIdx,
        answer_type: answerTypes[selected],
      });

      dispatch({ type: 'SET_CURRENT_QUESTION', payload: currentIdx + 1 });

      if (res.data.is_complete) {
        navigate(`/report/${session_id}/final`);
        return;
      }

      setCurrentIdx((prev) => prev + 1);
      setSelected(null);
    } catch (err) {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading questions..." />
      </div>
    );
  }

  if (!questions.length) return null;

  const q = questions[currentIdx];
  if (!q) return null;

  const progressPercent = ((currentIdx + 1) / totalSteps) * 100;
  const answerEntries = q.answers ? Object.entries(q.answers) : [];

  return (
    <div className="min-h-screen bg-clinical-bg flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
        {/* Progress */}
        <div className="text-center mb-8">
          <p className="label-text text-primary-500 mb-3">
            Step {currentIdx + 1} of {totalSteps}
          </p>
          <div className="w-full max-w-md mx-auto progress-bar h-2">
            <div className="progress-fill bg-primary-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Question + Answers */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-clinical-text leading-tight mb-8">
              {q.question}
            </h1>

            <div className="space-y-4">
              {answerEntries.map(([key, val], i) => (
                <button
                  key={key}
                  onClick={() => setSelected(i)}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 text-left group ${
                    selected === i
                      ? 'border-primary-500 bg-primary-50 shadow-clinical'
                      : 'border-clinical-border bg-white hover:border-primary-200 hover:shadow-clinical'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected === i ? 'bg-primary-500 text-white' : 'bg-clinical-bg text-primary-500'
                  }`}>
                    {answerIcons[i]}
                  </div>
                  <span className="font-medium text-clinical-text flex-1">{val.text}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selected === i ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                  }`}>
                    {selected === i && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Why asking sidebar */}
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
                  Clinical Insight
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="sticky bottom-0 bg-white border-t border-clinical-border py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => { if (currentIdx > 0) { setCurrentIdx(currentIdx - 1); setSelected(null); } }}
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
                Continue
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
