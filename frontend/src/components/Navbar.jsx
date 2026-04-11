import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const { state, dispatch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  // Public navbar (for homepage, login, register)
  if (!state.token) {
    return (
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-clinical-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary-500 tracking-tight">
            Trilens
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="btn-primary text-sm py-2 px-5 rounded-lg">
              Login
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Patient/Guardian nav links
  const patientLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/scan', label: 'Scans' },
    { to: '/consultations', label: 'Consultations' },
    { to: '/profile', label: 'Profile' },
  ];

  // Doctor nav links
  const doctorLinks = [
    { to: '/doctor/dashboard', label: 'Dashboard' },
    { to: '/scan', label: 'Scans' },
    { to: '/consultations', label: 'Consultations' },
    { to: '/profile', label: 'Profile' },
  ];

  const links = state.user?.role === 'doctor' ? doctorLinks : patientLinks;

  // Add Family for guardian
  if (state.user?.role === 'guardian') {
    links.splice(1, 0, { to: '/family', label: 'Family' });
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-clinical-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="text-2xl font-bold text-primary-500 tracking-tight">
            Trilens
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification bell */}
          <button className="relative p-2 text-clinical-muted hover:text-primary-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Settings gear */}
          <button className="p-2 text-clinical-muted hover:text-primary-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* User avatar */}
          <button 
            onClick={handleLogout}
            className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold hover:bg-primary-600 transition-colors"
            title="Sign Out"
          >
            {state.user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-clinical-border">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              isActive(link.to)
                ? 'bg-primary-500 text-white'
                : 'text-clinical-muted hover:bg-primary-50'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
