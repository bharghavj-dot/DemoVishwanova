import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import stethImg from '../steth.jpeg';
import Cropper from 'react-easy-crop';

/* ─────────────────────────────────────────────
   Helper: extract cropped image from canvas
   Returns a Promise<Blob>
───────────────────────────────────────────── */
async function getCroppedBlob(imageSrc, pixelCrop) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas is empty'));
    }, 'image/jpeg', 0.92);
  });
}

/* ─────────────────────────────────────────────
   Aspect ratios per scan type
───────────────────────────────────────────── */
const ASPECT_RATIOS = {
  eye: 4 / 3,
  tongue: 3 / 4,
  nail: 5 / 3,
};

/* ─────────────────────────────────────────────
   Overlay guides per scan type
───────────────────────────────────────────── */
function CropGuideOverlay({ scanType }) {
  if (scanType === 'eye') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: '60%',
            height: '45%',
            border: '2px dashed rgba(0,212,170,0.7)',
            borderRadius: '50%',
            boxShadow: '0 0 12px rgba(0,212,170,0.3)',
          }}
        />
      </div>
    );
  }
  if (scanType === 'nail') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: '55%',
            height: '38%',
            border: '2px dashed rgba(0,212,170,0.7)',
            borderRadius: '8px',
            boxShadow: '0 0 12px rgba(0,212,170,0.3)',
          }}
        />
      </div>
    );
  }
  // tongue — tall rectangle
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: '40%',
          height: '60%',
          border: '2px dashed rgba(0,212,170,0.7)',
          borderRadius: '40px',
          boxShadow: '0 0 12px rgba(0,212,170,0.3)',
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Image Crop Modal
───────────────────────────────────────────── */
function ImageCropModal({ imageSrc, scanType, onConfirm, onCancel, isProcessing }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    await onConfirm(croppedAreaPixels);
  };

  const scanLabel =
    scanType === 'eye' ? 'Ocular' : scanType === 'tongue' ? 'Lingual' : 'Nail Bed';

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 20, 30, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'rgba(255,255,255,0.96)',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,170,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(27,77,75,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(27,77,75,0.06))',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#00D4AA',
                fontFamily: 'monospace',
                marginBottom: '2px',
              }}
            >
              {scanLabel} Scan
            </p>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1b4d4b',
                margin: 0,
              }}
            >
              Adjust Crop Region
            </h2>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid rgba(27,77,75,0.2)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '18px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(27,77,75,0.2)';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ✕
          </button>
        </div>

        {/* Crop area */}
        <div style={{ position: 'relative', height: '360px', background: '#111' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT_RATIOS[scanType]}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: {
                border: '2px solid #00D4AA',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              },
            }}
          />
          {/* Guide overlay hint */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.6)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: 'monospace',
              padding: '4px 12px',
              borderRadius: '20px',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          >
            Drag to reposition · Pinch or scroll to zoom
          </div>
        </div>

        {/* Zoom slider */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(27,77,75,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(248,250,252,0.9)',
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#00D4AA" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
          </svg>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: '#00D4AA',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#1b4d4b',
              minWidth: '36px',
              textAlign: 'right',
            }}
          >
            {zoom.toFixed(1)}×
          </span>
        </div>

        {/* Action buttons */}
        <div
          style={{
            padding: '16px 24px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            borderTop: '1px solid rgba(27,77,75,0.08)',
          }}
        >
          {/* Cancel / Retake */}
          <button
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: '1.5px solid rgba(27,77,75,0.25)',
              background: 'transparent',
              color: '#1b4d4b',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              opacity: isProcessing ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) e.currentTarget.style.background = 'rgba(27,77,75,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retake
          </button>

          {/* Confirm Crop */}
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !croppedAreaPixels}
            style={{
              padding: '10px 26px',
              borderRadius: '10px',
              border: 'none',
              background: isProcessing
                ? 'rgba(0,212,170,0.5)'
                : 'linear-gradient(135deg, #00D4AA, #1b9e8a)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: isProcessing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isProcessing ? 'none' : '0 4px 16px rgba(0,212,170,0.35)',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
            }}
          >
            {isProcessing ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Processing…
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Confirm Crop
              </>
            )}
          </button>
        </div>
      </div>

      {/* spin keyframe injected inline */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

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

  const scanTypeLabel =
    scanType === 'eye' ? 'OCULAR SCAN' : scanType === 'tongue' ? 'LINGUAL SCAN' : 'NAIL BED SCAN';
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
            filter: isDone
              ? 'none'
              : isExtracting
              ? 'saturate(1.3) brightness(1.05)'
              : 'contrast(1.15) brightness(1.05)',
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

        {/* THE BIG SCANNING LINE */}
        {!isDone && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-20"
            style={{ top: `${scanLinePos}%`, transition: 'none' }}
          >
            <div
              style={{
                height: '40px',
                marginTop: '-20px',
                background: isExtracting
                  ? 'linear-gradient(180deg, transparent, rgba(212, 160, 23, 0.15), rgba(212, 160, 23, 0.25), rgba(212, 160, 23, 0.15), transparent)'
                  : 'linear-gradient(180deg, transparent, rgba(0, 212, 170, 0.12), rgba(0, 212, 170, 0.25), rgba(0, 212, 170, 0.12), transparent)',
              }}
            />
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
              <div
                className={`w-2.5 h-2.5 rounded-full ${isDone ? 'bg-accent-green' : 'bg-accent-teal'}`}
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

/* ═══════════════════════════════════════════
   MAIN SCAN PAGE
═══════════════════════════════════════════ */
export default function Scan() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('eye');

  // raw previews (data URLs of original selected images)
  const [rawImages, setRawImages] = useState({ eye: null, tongue: null, nail: null });
  // final cropped previews (data URLs shown after crop confirm)
  const [previews, setPreviews] = useState({ eye: null, tongue: null, nail: null });
  // cropped Blobs ready for upload
  const [croppedBlobs, setCroppedBlobs] = useState({ eye: null, tongue: null, nail: null });

  const [qualities, setQualities] = useState({ eye: null, tongue: null, nail: null });
  const [uploadingType, setUploadingType] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Track which scans are currently showing the scanning animation
  const [scanningAnim, setScanningAnim] = useState({ eye: false, tongue: false, nail: false });

  // Cropper modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropScanType, setCropScanType] = useState(null); // which tab initiated the crop
  const [isCropProcessing, setIsCropProcessing] = useState(false);

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
    {
      key: 'eye',
      label: 'EYE',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      key: 'tongue',
      label: 'TONGUE',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      key: 'nail',
      label: 'NAIL',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
  ];

  const allUploaded =
    state.uploadsComplete.eye && state.uploadsComplete.tongue && state.uploadsComplete.nail;

  /* ── Step 1: User picks a file → open crop modal ── */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset file input so same file can be re-selected after retake
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImages((prev) => ({ ...prev, [activeTab]: ev.target.result }));
      setCropScanType(activeTab);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  /* ── Step 2: User confirms crop → extract via canvas → upload ── */
  const handleCropConfirm = async (pixelCrop) => {
    setIsCropProcessing(true);
    const scanType = cropScanType;

    try {
      const blob = await getCroppedBlob(rawImages[scanType], pixelCrop);

      // Build a data URL for the cropped preview
      const croppedDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(blob);
      });

      // Store cropped preview & blob
      setPreviews((prev) => ({ ...prev, [scanType]: croppedDataUrl }));
      setCroppedBlobs((prev) => ({ ...prev, [scanType]: blob }));

      // Close modal
      setCropModalOpen(false);
      setCropScanType(null);

      // Start scanning animation
      setScanningAnim((prev) => ({ ...prev, [scanType]: true }));

      // Upload the cropped image
      setUploadingType(scanType);
      const file = new File([blob], `${scanType}_scan.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);

      const res = await API.post(`/scan/upload/${scanType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.session_id) {
        dispatch({ type: 'SET_SESSION_ID', payload: res.data.session_id });
      }

      setQualities((prev) => ({ ...prev, [scanType]: res.data.capture_quality }));
      dispatch({ type: 'SET_UPLOAD_COMPLETE', payload: scanType });
      dispatch({
        type: 'SET_TOAST',
        payload: {
          message: `${scanType.charAt(0).toUpperCase() + scanType.slice(1)} scan uploaded successfully`,
          type: 'success',
        },
      });

      // Keep scanning animation running for the full 6s + 1s done checkmark
      setTimeout(() => {
        setScanningAnim((prev) => ({ ...prev, [scanType]: false }));
      }, 7000);
    } catch (err) {
      setPreviews((prev) => ({ ...prev, [scanType]: null }));
      setCroppedBlobs((prev) => ({ ...prev, [scanType]: null }));
      setScanningAnim((prev) => ({ ...prev, [scanType]: false }));
    } finally {
      setIsCropProcessing(false);
      setUploadingType(null);
    }
  };

  /* ── Step 2b: User cancels/retakes → discard raw image, close modal ── */
  const handleCropCancel = () => {
    setCropModalOpen(false);
    setRawImages((prev) => ({ ...prev, [cropScanType]: null }));
    setCropScanType(null);
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
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      key: 'tongue',
      label: 'TONGUE',
      desc: 'Analyze microbial coating, hydration levels, and surface texture.',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      key: 'nail',
      label: 'NAIL',
      desc: 'Scan for micronutrient markers, oxygenation, and capillary health.',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* ═══ CROP MODAL ═══ */}
      {cropModalOpen && rawImages[cropScanType] && (
        <ImageCropModal
          imageSrc={rawImages[cropScanType]}
          scanType={cropScanType}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          isProcessing={isCropProcessing}
        />
      )}

      <div
        style={{
          minHeight: 'calc(100vh - 64px)',
          backgroundImage: `url(${stethImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          position: 'relative',
        }}
      >
        {/* Semi-transparent overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(230, 240, 240, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div
          className="py-6"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}
        >
          {/* 80% width container */}
          <div style={{ width: '80vw' }}>
            {/* ═══ UPLOAD AREA ═══ */}
            <div className="animate-fade-in-up">
              <div
                style={{
                  minHeight: '60vh',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1.5px dashed rgba(27, 77, 75, 0.4)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(27, 77, 75, 0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
                }}
                className="p-8 hover:border-primary-200 transition-colors duration-400"
              >
                {/* Status bar */}
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-clinical-muted font-mono">
                    Source:{' '}
                    {previews[activeTab]
                      ? 'IMAGE LOADED'
                      : rawImages[activeTab]
                      ? 'AWAITING CROP…'
                      : 'WAITING FOR INPUT...'}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-clinical-muted font-mono">
                    Status:{' '}
                    {isScanning
                      ? 'SCANNING...'
                      : state.uploadsComplete[activeTab]
                      ? 'EXTRACTED'
                      : uploadingType === activeTab
                      ? 'PROCESSING...'
                      : 'IDLE'}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center text-center" style={{ flex: 1 }}>
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
                        <img
                          src={previews[activeTab]}
                          alt="Scan preview"
                          className="max-h-64 object-contain"
                          loading="lazy"
                        />
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
                      <div className="w-24 h-24 rounded-full bg-clinical-bg flex items-center justify-center mb-6 mx-auto hover:bg-primary-50 transition-colors duration-300">
                        <svg
                          className="w-12 h-12 text-primary-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-clinical-text mb-3">Ready for Analysis</h3>
                      <p className="text-base text-clinical-muted mb-6">
                        Select a high-resolution diagnostic image to begin ML extraction
                      </p>
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
                    disabled={uploadingType === activeTab || isScanning || isCropProcessing}
                    className="btn-outline flex items-center gap-2 mt-4"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {isScanning ? 'SCANNING...' : previews[activeTab] ? 'RETAKE' : 'CHOOSE FILE'}
                  </button>

                  <p className="text-[10px] text-clinical-muted uppercase tracking-widest mt-4">
                    Accepted Formats: DICOM, TIFF, JPEG (8K) · Crop &amp; confirm before upload
                  </p>
                </div>
              </div>
            </div>

            {/* ═══ SCAN TYPE CARDS — 3 columns ═══ */}
            <div className="grid grid-cols-3 gap-5 mt-5">
              {scanCards.map((card) => {
                const isActive = activeTab === card.key;
                const isDone = state.uploadsComplete[card.key];
                const isCardScanning = scanningAnim[card.key];

                return (
                  <button
                    key={card.key}
                    onClick={() => setActiveTab(card.key)}
                    className={`relative text-center transition-all duration-400 group ${
                      isActive ? 'border-2 border-primary-300' : 'border border-white/50 hover:border-primary-200'
                    }`}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(.25,.46,.45,.94)',
                      minHeight: '200px',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      borderRadius: '16px',
                      boxShadow: isActive
                        ? '0 8px 32px rgba(27,77,75,0.2), inset 0 1px 0 rgba(255,255,255,0.9)'
                        : '0 4px 20px rgba(27,77,75,0.1), inset 0 1px 0 rgba(255,255,255,0.7)',
                      padding: '2rem',
                    }}
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
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
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
                    <div
                      className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
                        isActive
                          ? 'bg-primary-50 text-primary-500 scale-110'
                          : 'bg-clinical-bg text-clinical-muted group-hover:bg-primary-50 group-hover:text-primary-500'
                      }`}
                    >
                      {card.icon}
                    </div>

                    {/* Label */}
                    <h3
                      className={`text-base font-bold uppercase tracking-widest mb-2 transition-colors duration-300 ${
                        isActive ? 'text-primary-500' : 'text-clinical-text'
                      }`}
                    >
                      {card.label}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-clinical-muted leading-relaxed max-w-[220px] mx-auto">
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  )}
                  {analyzing ? 'Analyzing with XGBoost...' : 'ANALYZE ALL SCANS'}
                </button>
              </div>
            )}
          </div>
          {/* end 80vw container */}
        </div>
      </div>
    </>
  );
}
