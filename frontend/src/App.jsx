import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useApp } from './context/AppContext';
import API from './api/axios';

// Layout
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import Preloader from './components/Preloader';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';

// Pages
import Homepage from './pages/Homepage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import Report from './pages/Report';
import QA from './pages/QA';
import FinalReport from './pages/FinalReport';
import Consultations from './pages/Consultations';
import Profile from './pages/Profile';
import Family from './pages/Family';
import DoctorDashboard from './pages/DoctorDashboard';
import ResetPassword from './pages/ResetPassword';

/* ── Page transition wrapper ── */
function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionKey, setTransitionKey] = useState(location.key);

  useEffect(() => {
    if (location.key !== transitionKey) {
      setTransitionKey(location.key);
      setDisplayChildren(children);
    }
  }, [location.key, children, transitionKey]);

  return (
    <div key={transitionKey} className="page-enter">
      {displayChildren}
    </div>
  );
}

function AppContent() {
  const { state, dispatch } = useApp();
  const [showPreloader, setShowPreloader] = useState(true);

  const handlePreloaderFinish = useCallback(() => {
    setShowPreloader(false);
  }, []);

  // On app load, if token exists, fetch user
  useEffect(() => {
    if (state.token && !state.user) {
      API.get('/auth/me')
        .then((res) => dispatch({ type: 'SET_USER', payload: res.data }))
        .catch(() => dispatch({ type: 'LOGOUT' }));
    }
  }, [state.token, state.user, dispatch]);

  return (
    <BrowserRouter>
      {showPreloader && <Preloader onFinish={handlePreloaderFinish} />}
      <div className={`min-h-screen flex flex-col transition-opacity duration-500 ${showPreloader ? 'opacity-0' : 'opacity-100'}`}>
        <Navbar />
        <Toast />
        <main className="flex-1">
          <PageTransition>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Homepage />} />
              <Route path="/login" element={state.token ? <Navigate to="/dashboard" /> : <Login />} />
              <Route path="/register" element={state.token ? <Navigate to="/dashboard" /> : <Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
              <Route path="/report/:session_id" element={<ProtectedRoute><Report /></ProtectedRoute>} />
              <Route path="/qa/:session_id" element={<ProtectedRoute><QA /></ProtectedRoute>} />
              <Route path="/report/:session_id/final" element={<ProtectedRoute><FinalReport /></ProtectedRoute>} />
              <Route path="/consultations" element={<ProtectedRoute><Consultations /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Role-restricted routes */}
              <Route path="/family" element={<RoleRoute allowedRoles={['guardian']}><Family /></RoleRoute>} />
              <Route path="/doctor/dashboard" element={<RoleRoute allowedRoles={['doctor']}><DoctorDashboard /></RoleRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PageTransition>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppContent />;
}
