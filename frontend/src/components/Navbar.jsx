import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { state, dispatch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const profileRef = useRef(null);
  const settingsRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    dispatch({ type: 'LOGOUT' });
    navigate('/');
  };

  // Public navbar (for homepage, login, register)
  if (!state.token) {
    return (
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-clinical-border animate-fade-in-down">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary-500 tracking-tight hover:text-primary-400 transition-colors duration-300">
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

  // Patient nav links
  const patientLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/scan', label: 'Scans' },
    { to: '/consultations', label: 'Consultations' },
    { to: '/profile', label: 'Profile' },
  ];

  // Guardian nav links
  const guardianLinks = [
    { to: '/family', label: 'Family' },
    { to: '/profile', label: 'Profile' },
  ];

  // Doctor nav links
  const doctorLinks = [
    { to: '/doctor/dashboard', label: 'Dashboard' },
    { to: '/profile', label: 'Profile' },
  ];

  let links = [];
  if (state.user?.role === 'doctor') {
    links = [...doctorLinks];
  } else if (state.user?.role === 'guardian') {
    links = [...guardianLinks];
  } else {
    links = [...patientLinks];
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-clinical-border animate-fade-in-down">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Task 4: Logo navigates to homepage */}
          <Link to="/" className="text-2xl font-bold text-primary-500 tracking-tight hover:text-primary-400 transition-colors duration-300">
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

        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button className="relative p-2 text-clinical-muted hover:text-primary-500 transition-all duration-300 hover:scale-110">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Task 1: Settings gear — opens dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => { setSettingsOpen(!settingsOpen); setProfileOpen(false); }}
              className={`p-2 text-clinical-muted hover:text-primary-500 transition-all duration-300 ${settingsOpen ? 'text-primary-500 rotate-90' : 'hover:rotate-90'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Settings Dropdown */}
            {settingsOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-clinical-lg border border-clinical-border overflow-hidden animate-fade-in-down z-50">
                <div className="p-3 border-b border-clinical-border">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-clinical-muted">Settings</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setSettingsOpen(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-clinical-text hover:bg-primary-50 hover:text-primary-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Edit Profile
                  </button>
                  <button
                    onClick={() => { setSettingsOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-clinical-text hover:bg-primary-50 hover:text-primary-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Notifications
                  </button>
                  <button
                    onClick={() => { setSettingsOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-clinical-text hover:bg-primary-50 hover:text-primary-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Privacy & Security
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Task 2: User avatar with dropdown menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setSettingsOpen(false); }}
              className={`w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold transition-all duration-300 hover:scale-110 ${
                profileOpen ? 'ring-2 ring-primary-300 ring-offset-2 shadow-glow-primary' : 'hover:bg-primary-600 hover:shadow-glow-primary'
              }`}
              title="Account"
            >
              {state.user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-clinical-lg border border-clinical-border overflow-hidden animate-fade-in-down z-50">
                {/* User info header */}
                <div className="p-4 bg-gradient-to-r from-primary-50 to-white border-b border-clinical-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {state.user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-clinical-text truncate">{state.user?.full_name || 'User'}</p>
                      <p className="text-xs text-clinical-muted truncate">{state.user?.email || ''}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
                        {state.user?.role || 'patient'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-clinical-text hover:bg-primary-50 hover:text-primary-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </button>
                  {!(state.user?.role === 'doctor' || state.user?.role === 'guardian') && (
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/dashboard'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-clinical-text hover:bg-primary-50 hover:text-primary-500 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Dashboard
                    </button>
                  )}
                </div>

                {/* About section */}
                <div className="border-t border-clinical-border py-1">
                  <button
                    onClick={() => { setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-clinical-text hover:bg-primary-50 hover:text-primary-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    About Trilens
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-clinical-border py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-clinical-border">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-300 ${
              isActive(link.to)
                ? 'bg-primary-500 text-white shadow-clinical'
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
