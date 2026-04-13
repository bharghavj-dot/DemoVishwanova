import { useState, useEffect } from 'react';

export default function Preloader({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Accelerate as we go
        const increment = prev < 60 ? 4 : prev < 85 ? 3 : 2;
        return Math.min(prev + increment, 100);
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        setHiding(true);
        setTimeout(() => {
          onFinish?.();
        }, 600);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [progress, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 transition-all duration-600 ${
        hiding ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
      }`}
      style={{ transition: 'opacity 0.6s ease, transform 0.6s ease' }}
    >
      {/* Floating background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent-teal/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      <div className="relative z-10 text-center">
        {/* Pulsing logo ring */}
        <div className="relative w-28 h-28 mx-auto mb-8">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary-400/30 animate-spin" style={{ animationDuration: '3s' }}></div>
          {/* Middle pulsing ring */}
          <div className="absolute inset-2 rounded-full border border-accent-teal/40 animate-ping" style={{ animationDuration: '2s' }}></div>
          {/* Inner glow */}
          <div className="absolute inset-4 rounded-full bg-primary-500/20 backdrop-blur-sm flex items-center justify-center animate-pulse-glow">
            <span className="text-3xl font-bold text-white tracking-tight">T</span>
          </div>
        </div>

        {/* Brand name with stagger */}
        <h1 className="text-2xl font-bold text-white tracking-[0.3em] uppercase mb-2 animate-fade-in">
          TRILENS
        </h1>
        <p className="text-xs text-primary-200 uppercase tracking-[0.2em] mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Precision Diagnostics
        </p>

        {/* Progress bar */}
        <div className="w-48 mx-auto">
          <div className="h-1 rounded-full bg-primary-600 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-teal to-primary-300 transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] text-primary-300 uppercase tracking-widest font-mono">
              Initializing
            </span>
            <span className="text-[10px] text-primary-300 uppercase tracking-widest font-mono">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
