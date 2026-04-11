import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useApp } from './context/AppContext';
import API from './api/axios';

// Layout
import Navbar from './components/Navbar';
import Toast from './components/Toast';
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

function AppContent() {
  const { state, dispatch } = useApp();

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
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <Toast />
        <main className="flex-1">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={state.token ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/register" element={state.token ? <Navigate to="/dashboard" /> : <Register />} />

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
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppContent />;
}
