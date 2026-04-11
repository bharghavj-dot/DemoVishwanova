import { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext(null);

const initialState = {
  token: localStorage.getItem('token') || null,
  user: null,
  sessionId: null,
  currentQuestion: 0,
  uploadsComplete: {
    eye: false,
    tongue: false,
    nail: false,
  },
  toast: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
      };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...initialState,
        token: null,
      };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_UPLOAD_COMPLETE':
      return {
        ...state,
        uploadsComplete: {
          ...state.uploadsComplete,
          [action.payload]: true,
        },
      };
    case 'RESET_UPLOADS':
      return {
        ...state,
        uploadsComplete: { eye: false, tongue: false, nail: false },
        sessionId: null,
      };
    case 'SET_CURRENT_QUESTION':
      return { ...state, currentQuestion: action.payload };
    case 'SET_TOAST':
      return { ...state, toast: action.payload };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Listen for toast events from Axios interceptor
  useEffect(() => {
    const handleToast = (e) => {
      dispatch({
        type: 'SET_TOAST',
        payload: { message: e.detail.message, type: e.detail.type },
      });
    };
    window.addEventListener('trilens-toast', handleToast);
    return () => window.removeEventListener('trilens-toast', handleToast);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
