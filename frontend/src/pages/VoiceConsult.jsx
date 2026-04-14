import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

export default function VoiceConsult() {
  const { session_id } = useParams();
  const { state } = useApp();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(state.user?.phone_number || '');
  const [status, setStatus] = useState('none'); // none, pending, in_progress, analysis, skipped
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const pollingInterval = useRef(null);

  // ── Polling for status updates ──
  const checkStatus = async () => {
    try {
      const res = await API.get(`/voice/${session_id}/status`);
      const { voice_status } = res.data;
      
      if (voice_status === 'completed') {
        clearInterval(pollingInterval.current);
        navigate(`/report/${session_id}/final`);
      } else if (voice_status === 'in_progress' && status !== 'in_progress') {
        setStatus('in_progress');
      } else if (voice_status === 'pending' && status !== 'pending') {
        setStatus('pending');
      }
    } catch (err) {
      console.error(err);
      clearInterval(pollingInterval.current);
      setError('Connection lost while checking call status. Please refresh.');
    }
  };

  useEffect(() => {
    if (status === 'pending' || status === 'in_progress') {
      pollingInterval.current = setInterval(checkStatus, 3000);
    } else if (status === 'analysis') {
      setTimeout(() => {
        navigate(`/report/${session_id}/final`);
      }, 3000);
    }
    
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [status, session_id, navigate]);

  // ── Actions ──
  const handleStartCall = async (e) => {
    e.preventDefault();
    if (!phone) return setError('Please enter a valid phone number');
    
    setLoading(true);
    setError(null);
    try {
      await API.post(`/voice/${session_id}/initiate`, { phone_number: phone });
      setStatus('pending');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initiate call');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await API.post(`/voice/${session_id}/skip`);
      setStatus('skipped');
      navigate(`/report/${session_id}/final`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to skip');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-clinical-bg py-12 flex flex-col items-center">
      <div className="max-w-2xl w-full px-6 text-center">
        
        {/* Header Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-primary-100 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-clinical-text mb-4">
          Optional Voice Consultation
        </h1>
        <p className="text-clinical-muted mb-8 text-lg">
          Our AI medical assistant can call you right now to ask a few follow-up questions. 
          This helps refine our diagnostic accuracy before generating your final report.
        </p>

        {error && (
          <div className="mb-6 bg-red-50 text-accent-red p-4 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="card-static p-8">
          {status === 'none' && (
            <form onSubmit={handleStartCall} className="space-y-6">
              <div className="text-left">
                <label className="block text-sm font-semibold text-clinical-text mb-2">
                  Your Phone Number (Including Country Code)
                </label>
                <input
                  type="tel"
                  placeholder="+1 (234) 567-8900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 flex justify-center items-center gap-2"
                >
                  {loading ? <LoadingSpinner size="sm"/> : 'Start Voice Consult'}
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  className="btn-ghost"
                >
                  Skip & Generate Report
                </button>
              </div>
            </form>
          )}

          {status === 'pending' && (
            <div className="py-8">
              <div className="relative w-16 h-16 mx-auto mb-6">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-16 w-16 bg-primary-500 items-center justify-center">
                   <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                   </svg>
                 </span>
              </div>
              <h2 className="text-xl font-bold text-clinical-text">Calling You Now...</h2>
              <p className="text-clinical-muted mt-2">Please answer your phone to begin the consultation.</p>
            </div>
          )}

          {status === 'in_progress' && (
            <div className="py-8">
              {/* Fake audio visualizer */}
              <div className="flex justify-center items-center gap-1.5 h-16 mb-6">
                <div className="w-2 h-8 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-12 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-16 bg-primary-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                <div className="w-2 h-10 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '450ms'}}></div>
                <div className="w-2 h-6 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '600ms'}}></div>
              </div>
              <h2 className="text-xl font-bold text-primary-500">Consultation In Progress</h2>
              <p className="text-clinical-muted mt-2">Speak clearly after each question.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
