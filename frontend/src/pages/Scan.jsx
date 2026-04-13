import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

/* ── Scanning Animation Overlay ── 
   A dramatic, highly visible scanning effect over uploaded images.
   Features: thick glowing laser line, grid, corner brackets, phase HUD.
*/
function ScanningOverlay({ imageSrc, scanType }) {
  const [scanLinePos, setScanLinePos] = useState(0);
  const [sweepCount, setSweepCount] = useState(0);
  const [scanPhase, setScanPhase] = useState('scanning'); // scanning → extracting → done
  const sweepRef = useRef(0);

  useEffect(() => {
    let frame;
    let start = null;
    const sweepDuration = 1800; // ms for one top→bottom sweep

    const animateScanLine = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const totalCycle = sweepDuration * 2; // full up-down
      const t = (elapsed % totalCycle) / sweepDuration;
      // Ping-pong: 0→1→0
      const pos = t <= 1 ? t : 2 - t;
      setScanLinePos(pos * 100);

      // Count sweeps (each full up-down = 1 sweep)
      const newSweeps = Math.floor(elapsed / totalCycle);
      if (newSweeps !== sweepRef.current) {
        sweepRef.current = newSweeps;
        setSweepCount(newSweeps);
      }

      frame = requestAnimationFrame(animateScanLine);
    };

    frame = requestAnimationFrame(animateScanLine);

    // Phase timings: scan for 4s, then extract for 2s, then done
    const t1 = setTimeout(() => setScanPhase('extracting'), 4000);
    const t2 = setTimeout(() => setScanPhase('done'), 6000);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const scanTypeLabel = scanType === 'eye' ? 'OCULAR SCAN' : scanType === 'tongue' ? 'LINGUAL SCAN' : 'NAIL BED SCAN';
  const isDone = scanPhase === 'done';
  const isExtracting = scanPhase === 'extracting';

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Main scanning container */}
      <div
        className="relative rounded-2xl overflow-hidden border-2 transition-all duration-700"
        style={{
          borderColor: isDone ? '#22C55E' : isExtracting ? '#D4A017' : '#00D4AA',
          boxShadow: isDone
            ? '0 0 20px rgba(34, 197, 94, 0.3)'
            : isExtracting
            ? '0 0 25px rgba(212, 160, 23, 0.3)'
            : '0 0 30px rgba(0, 212, 170, 0.25), 0 0 60px rgba(0, 212, 170, 0.1)',
        }}
      >
        {/* The uploaded image */}
        <img
          src={imageSrc}
          alt="Scan target"
          className="w-full object-contain bg-black/5"
          style={{
            maxHeight: '320px',
            filter: isDone ? 'none' : isExtracting ? 'saturate(1.3) brightness(1.05)' : 'contrast(1.15) brightness(1.05)',
            transition: 'filter 0.8s ease',
          }}
        />

        {/* ── GRID OVERLAY ── */}
        {!isDone && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-700"
            style={{
              opacity: isExtracting ? 0.15 : 0.25,
              backgroundImage: `
                linear-gradient(rgba(0, 212, 170, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 212, 170, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
          />
        )}

        {/* ── TEAL TINT PULSE ── */}
        {!isDone && !isExtracting && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'rgba(0, 212, 170, 0.06)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}

        {/* ═════════════════════════════════════════════════
            THE BIG SCANNING LINE — thick, glowing, unmissable
           ═════════════════════════════════════════════════ */}
        {!isDone && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-20"
            style={{ top: `${scanLinePos}%`, transition: 'none' }}
          >
            {/* Wide glow aura above/below the line */}
            <div
              style={{
                height: '40px',
                marginTop: '-20px',
                background: isExtracting
                  ? 'linear-gradient(180deg, transparent, rgba(212, 160, 23, 0.15), rgba(212, 160, 23, 0.25), rgba(212, 160, 23, 0.15), transparent)'
                  : 'linear-gradient(180deg, transparent, rgba(0, 212, 170, 0.12), rgba(0, 212, 170, 0.25), rgba(0, 212, 170, 0.12), transparent)',
              }}
            />
            {/* The main laser line — 4px thick */}
            <div
              style={{
                height: '4px',
                marginTop: '-22px',
                background: isExtracting
                  ? 'linear-gradient(90deg, transparent 2%, #D4A017 15%, #f0c040 50%, #D4A017 85%, transparent 98%)'
                  : 'linear-gradient(90deg, transparent 2%, #00D4AA 15%, #4de8c8 35%, #00D4AA 50%, #2196f3 65%, #4de8c8 85%, transparent 98%)',
                boxShadow: isExtracting
                  ? '0 0 8px rgba(212, 160, 23, 0.8), 0 0 20px rgba(212, 160, 23, 0.5), 0 0 40px rgba(212, 160, 23, 0.2)'
                  : '0 0 8px rgba(0, 212, 170, 0.9), 0 0 20px rgba(0, 212, 170, 0.6), 0 0 40px rgba(0, 212, 170, 0.25), 0 0 60px rgba(33, 150, 243, 0.15)',
              }}
            />
          </div>
        )}

        {/* ── CORNER BRACKETS ── */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-[3px] border-l-[3px] border-accent-teal/90 rounded-tl pointer-events-none"></div>
        <div className="absolute top-3 right-3 w-6 h-6 border-t-[3px] border-r-[3px] border-accent-teal/90 rounded-tr pointer-events-none"></div>
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-[3px] border-l-[3px] border-accent-teal/90 rounded-bl pointer-events-none"></div>
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-[3px] border-r-[3px] border-accent-teal/90 rounded-br pointer-events-none"></div>

        {/* ── TOP HUD BAR ── */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent px-4 py-2 pointer-events-none z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isDone ? 'bg-accent-green' : 'bg-accent-teal'}`}
                style={{ animation: isDone ? 'none' : 'pulse 0.8s ease-in-out infinite' }}
              ></div>
              <span className="text-[11px] text-white font-mono font-bold uppercase tracking-[0.15em]">
                {scanTypeLabel}
              </span>
            </div>
            <span className="text-[10px] text-white/70 font-mono uppercase tracking-wider">
              {isDone ? 'COMPLETE' : isExtracting ? 'ANALYZING' : `SWEEP ${sweepCount + 1}`}
            </span>
          </div>
        </div>

        {/* ── BOTTOM STATUS BAR ── */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-4 py-3 pointer-events-none z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-white/95 font-mono font-semibold uppercase tracking-widest">
              {isDone ? '✓ Scan Complete' : isExtracting ? '◉ Extracting Biomarkers…' : '◎ Scanning in progress…'}
            </span>
            <span className="text-sm text-white font-mono font-bold">
              {isDone ? '100%' : isExtracting ? '78%' : `${Math.round(scanLinePos)}%`}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: isDone ? '100%' : isExtracting ? '78%' : `${Math.min(60, scanLinePos * 0.6)}%`,
                background: isDone
                  ? 'linear-gradient(90deg, #22C55E, #4ade80)'
                  : isExtracting
                  ? 'linear-gradient(90deg, #D4A017, #f0c040)'
                  : 'linear-gradient(90deg, #00D4AA, #2196f3)',
              }}
            />
          </div>
        </div>

        {/* ── DONE CHECKMARK OVERLAY ── */}
        {isDone && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-30 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-accent-green/90 flex items-center justify-center shadow-lg animate-bounce-in">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Scan() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('eye');
  const [previews, setPreviews] = useState({ eye: null, tongue: null, nail: null });
  const [qualities, setQualities] = useState({ eye: null, tongue: null, nail: null });
  const [uploadingType, setUploadingType] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  // Track which scans are currently showing the scanning animation
  const [scanningAnim, setScanningAnim] = useState({ eye: false, tongue: false, nail: false });
  const fileInputRef = useRef(null);

  /* ── Scroll reveal observer ── */
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal, .reveal-scale, .stagger-children');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1 }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
      // Start scanning animation
      setScanningAnim((prev) => ({ ...prev, [activeTab]: true }));
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

      if (res.data.session_id) {
        dispatch({ type: 'SET_SESSION_ID', payload: res.data.session_id });
      }

      setQualities((prev) => ({ ...prev, [activeTab]: res.data.capture_quality }));
      dispatch({ type: 'SET_UPLOAD_COMPLETE', payload: activeTab });
      dispatch({ type: 'SET_TOAST', payload: { message: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} scan uploaded successfully`, type: 'success' } });

      // Keep scanning animation running for the full 6s animation + 1s to show done checkmark
      setTimeout(() => {
        setScanningAnim((prev) => ({ ...prev, [activeTab]: false }));
      }, 7000);
    } catch (err) {
      setPreviews((prev) => ({ ...prev, [activeTab]: null }));
      setScanningAnim((prev) => ({ ...prev, [activeTab]: false }));
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
  const isScanning = scanningAnim[activeTab];

  const scanCards = [
    {
      key: 'eye',
      label: 'EYE',
      desc: 'Evaluate retinal clarity, sclera coloration, and pupil dilation patterns.',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      ),
    },
    {
      key: 'tongue',
      label: 'TONGUE',
      desc: 'Analyze microbial coating, hydration levels, and surface texture.',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
      ),
    },
    {
      key: 'nail',
      label: 'NAIL',
      desc: 'Scan for micronutrient markers, oxygenation, and capillary health.',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-clinical-bg">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ═══ UPLOAD AREA — full width ═══ */}
        <div className="animate-fade-in-up">
          <div className="card-static p-8 border-2 border-dashed border-clinical-border relative overflow-hidden hover:border-primary-200 transition-colors duration-400" style={{ minHeight: 400 }}>
            {/* Status bar */}
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.2em] text-clinical-muted font-mono">
                Source: {previews[activeTab] ? 'IMAGE LOADED' : 'WAITING FOR INPUT...'}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-clinical-muted font-mono">
                Status: {isScanning ? 'SCANNING...' : state.uploadsComplete[activeTab] ? 'EXTRACTED' : uploadingType === activeTab ? 'PROCESSING...' : 'IDLE'}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center text-center">
              {/* Show scanning animation when uploading with preview available */}
              {isScanning && previews[activeTab] ? (
                <div className="animate-scale-in">
                  <ScanningOverlay imageSrc={previews[activeTab]} scanType={activeTab} />
                </div>
              ) : uploadingType === activeTab ? (
                <div className="animate-scale-in">
                  <LoadingSpinner size="xl" text="Extracting features..." />
                </div>
              ) : previews[activeTab] ? (
                <div className="relative animate-scale-in">
                  <div className="image-zoom-container shadow-clinical">
                    <img src={previews[activeTab]} alt="Scan preview" className="max-h-64 object-contain" loading="lazy" />
                  </div>
                  {state.uploadsComplete[activeTab] && (
                    <div className="absolute -top-2 -right-2 badge-success validation-icon">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      EXTRACTED
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-clinical-bg flex items-center justify-center mb-4 mx-auto hover:bg-primary-50 transition-colors duration-300">
                    <svg className="w-10 h-10 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-clinical-text mb-2">Ready for Analysis</h3>
                  <p className="text-sm text-clinical-muted mb-6">Select a high-resolution diagnostic image to begin ML extraction</p>
                </div>
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
                disabled={uploadingType === activeTab || isScanning}
                className="btn-outline flex items-center gap-2 mt-4"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {isScanning ? 'SCANNING...' : 'CHOOSE FILE'}
              </button>

              <p className="text-[10px] text-clinical-muted uppercase tracking-widest mt-4">
                Accepted Formats: DICOM, TIFF, JPEG (8K)
              </p>
            </div>
          </div>
        </div>

        {/* ═══ SCAN TYPE CARDS — 3 columns below ═══ */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {scanCards.map((card) => {
            const isActive = activeTab === card.key;
            const isDone = state.uploadsComplete[card.key];
            const isCardScanning = scanningAnim[card.key];

            return (
              <button
                key={card.key}
                onClick={() => setActiveTab(card.key)}
                className={`relative card-static p-6 text-center transition-all duration-400 group ${
                  isActive
                    ? 'border-2 border-primary-300 shadow-clinical-lg'
                    : 'border border-clinical-border hover:shadow-clinical-lg hover:border-primary-200'
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(.25,.46,.45,.94)' }}
              >
                {/* Status badge — top right */}
                <div className="absolute top-3 right-3">
                  {isCardScanning ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-teal/10 text-accent-teal border border-accent-teal/30 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-ping"></span>
                      Scanning
                    </span>
                  ) : isDone ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-200">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-clinical-muted border border-clinical-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-clinical-muted"></span>
                      Pending
                    </span>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
                  isActive
                    ? 'bg-primary-50 text-primary-500 scale-110'
                    : 'bg-clinical-bg text-clinical-muted group-hover:bg-primary-50 group-hover:text-primary-500'
                }`}>
                  {card.icon}
                </div>

                {/* Label */}
                <h3 className={`text-base font-bold uppercase tracking-wider mb-2 transition-colors duration-300 ${
                  isActive ? 'text-primary-500' : 'text-clinical-text'
                }`}>
                  {card.label}
                </h3>

                {/* Description */}
                <p className="text-xs text-clinical-muted leading-relaxed">
                  {card.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* ═══ ANALYZE BUTTON ═══ */}
        {allUploaded && (
          <div className="mt-8 text-center animate-bounce-in">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary text-lg px-10 py-4 flex items-center gap-3 mx-auto animate-pulse-glow"
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
    </div>
  );
}
