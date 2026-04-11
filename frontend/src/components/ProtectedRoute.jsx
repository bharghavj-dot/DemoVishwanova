import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function ProtectedRoute({ children }) {
  const { state } = useApp();
  if (!state.token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function RoleRoute({ children, allowedRoles }) {
  const { state } = useApp();
  if (!state.token) {
    return <Navigate to="/login" replace />;
  }
  if (state.user && !allowedRoles.includes(state.user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
