export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeMap[size]} relative`}>
        <div className={`${sizeMap[size]} border-3 border-primary-100 rounded-full absolute`}></div>
        <div className={`${sizeMap[size]} border-3 border-t-primary-500 rounded-full animate-spin absolute`}></div>
      </div>
      {text && <p className="text-sm text-clinical-muted font-medium">{text}</p>}
    </div>
  );
}
