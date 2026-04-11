import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import ConfidenceGauge from '../components/ConfidenceGauge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Report() {
  const { session_id } = useParams();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingQA, setStartingQA] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await API.get(`/reports/${session_id}`);
        setReport(res.data);
        dispatch({ type: 'SET_SESSION_ID', payload: session_id });
      } catch (err) {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [session_id, dispatch]);

  const handleStartQA = async () => {
    setStartingQA(true);
    try {
      await API.post(`/qa/${session_id}/start`);
      navigate(`/qa/${session_id}`);
    } catch (err) {
      // handled
    } finally {
      setStartingQA(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await API.get(`/reports/${session_id}/pdf`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trilens-report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // handled
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading report..." />
      </div>
    );
  }

  if (!report) return null;

  const confidence = (report.confidence || 0) * 100;
  const severityColors = {
    Mild: 'text-green-600 bg-green-50',
    Moderate: 'text-amber-600 bg-amber-50',
    Severe: 'text-red-600 bg-red-50',
  };

  return (
    <div className="min-h-screen bg-clinical-bg">
      <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
        {/* Download button */}
        <div className="flex justify-end mb-4">
          <button onClick={handleDownloadPDF} className="btn-primary flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Report
          </button>
        </div>

        {/* Header card */}
        <div className="card-static p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <ConfidenceGauge percentage={confidence} size={140} />
            <div>
              <div className="badge-success mb-2">Analysis Complete</div>
              <h1 className="text-3xl font-bold text-clinical-text">
                {report.primary_display_name || report.primary_disease}
              </h1>
              <p className="text-sm text-clinical-muted mt-1">
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last scanned: {report.last_scanned ? new Date(report.last_scanned).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Severity card */}
        <div className="card-static p-6 mb-6 bg-gradient-to-r from-primary-50 to-white">
          <p className="label-text">Severity Level</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-clinical-text">{report.severity}</h2>
              <p className="text-2xl font-bold text-clinical-text">Severity</p>
            </div>
            <div className={`ml-auto px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider ${severityColors[report.severity] || 'bg-gray-100 text-gray-600'}`}>
              {report.severity_note || 'Immediate attention not required'}
            </div>
          </div>
        </div>

        {/* Top 3 Conditions */}
        <div className="mb-6">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
            Top 3 Probable Conditions
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {(report.top3 || []).map((condition, i) => (
              <div key={i} className="card-static p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-clinical-muted">
                    {i === 0 ? 'Primary Match' : 'Potential'}
                  </span>
                  <span className="text-lg font-bold text-primary-500">{Math.round(condition.probability * 100)}%</span>
                </div>
                <p className="font-semibold text-clinical-text mb-3">{condition.display_name}</p>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${i === 0 ? 'bg-primary-500' : i === 1 ? 'bg-accent-purple' : 'bg-gray-300'}`}
                    style={{ width: `${condition.probability * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section: Precautions + QA CTA */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Precautions */}
          <div>
            <h3 className="text-lg font-bold text-clinical-text flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Precautions to Take
            </h3>
            <div className="space-y-3">
              {(report.precautions || []).map((p, i) => (
                <div key={i} className="card-static p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-clinical-text">{p}</p>
                </div>
              ))}
            </div>
          </div>

          {/* QA CTA */}
          <div className="card-static p-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-clinical-bg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-clinical-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-clinical-text mb-2">Refine Diagnostic Accuracy</h3>
            <p className="text-sm text-clinical-muted mb-6">Answer 5 targeted clinical questions to improve the precision of your scan analysis.</p>
            <button
              onClick={handleStartQA}
              disabled={startingQA}
              className="btn-primary w-full flex items-center justify-center gap-2"
              id="start-qa"
            >
              {startingQA ? <LoadingSpinner size="sm" /> : (
                <>
                  Start Clinical Q&A
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
            <p className="text-[10px] text-clinical-muted uppercase tracking-widest mt-3">
              <svg className="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approx. 2 minutes
            </p>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div className="card-static p-6 border-red-200 bg-red-50/50 text-center">
          <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h4 className="font-bold text-clinical-text mb-1">Medical Disclaimer</h4>
          <p className="text-xs text-clinical-muted leading-relaxed max-w-xl mx-auto">
            Trilens is a diagnostic support tool and does not provide clinical diagnoses. This report is based on algorithmic analysis of ocular imaging. Please consult with a qualified ophthalmologist for a comprehensive clinical assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
