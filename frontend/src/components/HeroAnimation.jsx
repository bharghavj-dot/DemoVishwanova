import { useRef, useEffect, useState, useCallback } from 'react';

const FRAME_COUNT = 192;
const FRAME_PATH = (i) => `/demo-frames/ezgif-frame-${String(i).padStart(3, '0')}.png`;

export default function HeroAnimation() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const framesRef = useRef([]);
  const currentFrameRef = useRef(0);
  const animFrameRef = useRef(null);
  const [loadedPercent, setLoadedPercent] = useState(0);
  const [ready, setReady] = useState(false);

  // Preload all frames
  useEffect(() => {
    let loadedCount = 0;
    const frames = [];

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      img.onload = () => {
        loadedCount++;
        setLoadedPercent(Math.round((loadedCount / FRAME_COUNT) * 100));
        if (loadedCount === FRAME_COUNT) {
          framesRef.current = frames;
          setReady(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === FRAME_COUNT) {
          framesRef.current = frames;
          setReady(true);
        }
      };
      frames.push(img);
    }
  }, []);

  // Draw a frame to canvas with cover-fit
  const drawFrame = useCallback((index) => {
    const canvas = canvasRef.current;
    const frames = framesRef.current;
    if (!canvas || !frames[index]) return;

    const ctx = canvas.getContext('2d');
    const img = frames[index];
    if (!img.naturalWidth) return;

    const cw = canvas.width;
    const ch = canvas.height;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cw / ch;
    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawW = cw;
      drawH = cw / imgRatio;
      drawX = 0;
      drawY = (ch - drawH) / 2;
    } else {
      drawH = ch;
      drawW = ch * imgRatio;
      drawY = 0;
      drawX = (cw - drawW) / 2;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }, []);

  // Resize canvas
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    if (ready) {
      drawFrame(currentFrameRef.current);
    }
  }, [ready, drawFrame]);

  // Auto-play animation loop
  useEffect(() => {
    if (!ready) return;

    resizeCanvas();

    let frameIndex = 0;
    let lastTime = 0;
    const fps = 24; // playback speed
    const interval = 1000 / fps;

    const loop = (timestamp) => {
      if (timestamp - lastTime >= interval) {
        lastTime = timestamp;
        frameIndex = (frameIndex + 1) % FRAME_COUNT;
        currentFrameRef.current = frameIndex;
        drawFrame(frameIndex);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [ready, drawFrame, resizeCanvas]);

  // Handle resize
  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden bg-black/90"
      style={{ aspectRatio: '16 / 9' }}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary-900/95">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-primary-400/30 animate-spin" style={{ animationDuration: '3s' }}></div>
            <div className="absolute inset-3 rounded-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-lg font-bold text-white">T</span>
            </div>
          </div>
          <p className="text-xs text-primary-200 uppercase tracking-widest mb-2">Loading Animation</p>
          <div className="w-32 h-1 rounded-full bg-primary-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-teal to-primary-300 transition-all duration-200"
              style={{ width: `${loadedPercent}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-primary-400 mt-2 font-mono">{loadedPercent}%</p>
        </div>
      )}

      {/* Decorative corner accents */}
      <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-accent-teal/50 rounded-tl"></div>
      <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-accent-teal/50 rounded-tr"></div>
      <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-accent-teal/50 rounded-bl"></div>
      <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-accent-teal/50 rounded-br"></div>
    </div>
  );
}
