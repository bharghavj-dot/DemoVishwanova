import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Toast() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    if (state.toast) {
      const timer = setTimeout(() => {
        dispatch({ type: 'CLEAR_TOAST' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [state.toast, dispatch]);

  if (!state.toast) return null;

  const bgColor =
    state.toast.type === 'error'
      ? 'bg-red-50 border-red-300 text-red-800'
      : state.toast.type === 'success'
      ? 'bg-green-50 border-green-300 text-green-800'
      : 'bg-primary-50 border-primary-300 text-primary-800';

  const icon =
    state.toast.type === 'error' ? (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-slide-down">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-clinical-lg ${bgColor} backdrop-blur-sm max-w-md`}>
        {icon}
        <p className="text-sm font-medium flex-1">{state.toast.message}</p>
        <button
          onClick={() => dispatch({ type: 'CLEAR_TOAST' })}
          className="text-current opacity-50 hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
