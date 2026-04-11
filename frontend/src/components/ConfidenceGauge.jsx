export default function ConfidenceGauge({ percentage = 0, size = 160, label = 'CONFIDENCE' }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="gauge-circle" width={size} height={size}>
        <circle
          className="gauge-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="gauge-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'rotate(0deg)' }}>
        <span className="text-3xl font-bold text-primary-500">{Math.round(percentage)}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-clinical-muted">{label}</span>
      </div>
    </div>
  );
}
