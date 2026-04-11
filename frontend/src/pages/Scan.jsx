import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Scan() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('eye');
  const [previews, setPreviews] = useState({ eye: null, tongue: null, nail: null });
  const [qualities, setQualities] = useState({ eye: null, tongue: null, nail: null });
  const [uploadingType, setUploadingType] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const tabs = [
    { key: 'eye', label: 'EYE', icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
    )},
    { key: 'tongue', label: 'TONGUE', icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
    )},
    { key: 'nail', label: 'NAIL', icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
    )},
  ];

  const allUploaded = state.uploadsComplete.eye && state.uploadsComplete.tongue && state.uploadsComplete.nail;

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviews((prev) => ({ ...prev, [activeTab]: ev.target.result }));
    };
    reader.readAsDataURL(file);

    // Upload immediately
    setUploadingType(activeTab);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await API.post(`/scan/upload/${activeTab}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Store session_id from first upload
      if (res.data.session_id) {
        dispatch({ type: 'SET_SESSION_ID', payload: res.data.session_id });
      }

      // Store capture quality
      setQualities((prev) => ({ ...prev, [activeTab]: res.data.capture_quality }));

      // Mark upload complete
      dispatch({ type: 'SET_UPLOAD_COMPLETE', payload: activeTab });

      dispatch({ type: 'SET_TOAST', payload: { message: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} scan uploaded successfully`, type: 'success' } });
    } catch (err) {
      setPreviews((prev) => ({ ...prev, [activeTab]: null }));
    } finally {
      setUploadingType(null);
    }
  };

  const handleAnalyze = async () => {
    if (!state.sessionId) return;
    setAnalyzing(true);
    try {
      await API.post('/scan/analyze', { session_id: state.sessionId });
      dispatch({ type: 'SET_TOAST', payload: { message: 'Analysis complete!', type: 'success' } });
      navigate(`/report/${state.sessionId}`);
    } catch (err) {
      // handled by interceptor
    } finally {
      setAnalyzing(false);
    }
  };

  const currentQuality = qualities[activeTab];

  return (
    <div className="min-h-screen bg-clinical-bg">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Main scan area */}
          <div>
            {/* Upload area */}
            <div className="card-static p-8 border-2 border-dashed border-clinical-border relative overflow-hidden" style={{ minHeight: 450 }}>
              {/* Status bar */}
              <div className="mb-8">
                <p className="text-[10px] uppercase tracking-[0.2em] text-clinical-muted font-mono">
                  Source: {previews[activeTab] ? 'IMAGE LOADED' : 'WAITING FOR INPUT...'}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-clinical-muted font-mono">
                  Status: {state.uploadsComplete[activeTab] ? 'EXTRACTED' : uploadingType === activeTab ? 'PROCESSING...' : 'IDLE'}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                {uploadingType === activeTab ? (
                  <LoadingSpinner size="xl" text="Extracting features..." />
                ) : previews[activeTab] ? (
                  <div className="relative">
                    <img src={previews[activeTab]} alt="Scan preview" className="max-h-64 rounded-xl shadow-clinical object-contain" />
                    {state.uploadsComplete[activeTab] && (
                      <div className="absolute -top-2 -right-2 badge-success">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        EXTRACTED
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-clinical-bg flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-clinical-text mb-2">Ready for Analysis</h3>
                    <p className="text-sm text-clinical-muted mb-6">Select a high-resolution diagnostic image to begin ML extraction</p>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="scan-file-input"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingType === activeTab}
                  className="btn-outline flex items-center gap-2 mt-4"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  CHOOSE FILE
                </button>

                <p className="text-[10px] text-clinical-muted uppercase tracking-widest mt-4">
                  Accepted Formats: DICOM, TIFF, JPEG (8K)
                </p>
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex justify-center gap-4 mt-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 min-w-[90px] ${
                    activeTab === tab.key
                      ? 'bg-white shadow-clinical-lg border border-primary-200 text-primary-500'
                      : 'bg-white shadow-clinical text-clinical-muted hover:shadow-clinical-lg'
                  }`}
                >
                  {tab.icon}
                  <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
                  {state.uploadsComplete[tab.key] && (
                    <div className="w-2 h-2 rounded-full bg-accent-green"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Analyze button */}
            {allUploaded && (
              <div className="mt-6 text-center animate-scale-in">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="btn-primary text-lg px-10 py-4 flex items-center gap-3 mx-auto"
                  id="analyze-button"
                >
                  {analyzing ? (
                    <LoadingSpinner size="sm" text="" />
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  {analyzing ? 'Analyzing with XGBoost...' : 'ANALYZE ALL SCANS'}
                </button>
              </div>
            )}
          </div>

          {/* Right sidebar — Capture Quality */}
          <div className="space-y-6">
            <div className="card-static p-6">
              <h3 className="label-text mb-6">Capture Quality</h3>
              <div className="space-y-5">
                {[
                  { label: 'Lighting', value: currentQuality?.lighting || 'OPTIMAL LUX', color: 'bg-accent-green' },
                  { label: 'Position', value: currentQuality?.position || 'CENTERED', color: 'bg-accent-green' },
                  { label: 'Clarity', value: currentQuality?.clarity || 'CLEAR', color: currentQuality?.clarity === 'MOTION DETECTED' ? 'bg-accent-amber' : 'bg-accent-green' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-clinical-text">{item.label}</p>
                      <p className="text-xs text-clinical-muted uppercase tracking-wider">{item.value}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full ${item.color} shadow-lg`}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload status overview */}
            <div className="card-static p-6">
              <h3 className="label-text mb-4">Upload Status</h3>
              <div className="space-y-3">
                {tabs.map((tab) => (
                  <div key={tab.key} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{tab.key}</span>
                    {state.uploadsComplete[tab.key] ? (
                      <span className="badge-success text-[10px]">Done</span>
                    ) : (
                      <span className="badge text-[10px] bg-gray-100 text-gray-500">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Guidance info */}
            <div className="card-static p-5 bg-primary-50 border-primary-100">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-primary-700 leading-relaxed">
                  Hold device steady. The subject should look directly at the teal dot.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
