import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState('');
  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(true);
    } catch (err) {
      setForgotError('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const roleOptions = [
    { value: 'patient', label: 'PATIENT', desc: 'Access my health data', icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    )},
    { value: 'doctor', label: 'DOCTOR', desc: 'Clinical diagnostics', icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
    )},
    { value: 'guardian', label: 'GUARDIAN', desc: 'Manage family care', icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    )},
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/auth/login', { email, password, role });
      localStorage.setItem('token', res.data.access_token);
      dispatch({ type: 'SET_AUTH', payload: { token: res.data.access_token, user: res.data.user } });
      dispatch({ type: 'SET_TOAST', payload: { message: 'Welcome back!', type: 'success' } });
      const dest = res.data.user.role === 'doctor' ? '/doctor/dashboard' : res.data.user.role === 'guardian' ? '/family' : '/dashboard';
      navigate(dest);
    } catch (err) {
      // Error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole) => {
    setDemoLoading(demoRole);
    try {
      const res = await API.post('/auth/demo-login', { role: demoRole });
      localStorage.setItem('token', res.data.access_token);
      dispatch({ type: 'SET_AUTH', payload: { token: res.data.access_token, user: res.data.user } });
      dispatch({ type: 'SET_TOAST', payload: { message: `Demo ${demoRole} session started`, type: 'success' } });
      const dest = demoRole === 'doctor' ? '/doctor/dashboard' : demoRole === 'guardian' ? '/family' : '/dashboard';
      navigate(dest);
    } catch (err) {
      // Error handled by interceptor
    } finally {
      setDemoLoading('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clinical-bg via-white to-primary-50 flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary-100/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent-teal/10 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-lg">
          <div className="card-static p-8 md:p-10 animate-fade-in-up">
            <div className="text-center mb-8 animate-stagger-1">
              <h1 className="text-3xl font-bold text-clinical-text">Welcome Back</h1>
              <p className="text-clinical-muted mt-2">Enter the Clinical Sanctuary</p>
            </div>

            {/* Role Selector with animated transitions */}
            <div className="grid grid-cols-3 gap-3 mb-8 animate-stagger-2">
              {roleOptions.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-400 text-center group ${
                    role === r.value
                      ? 'border-primary-500 bg-white shadow-clinical scale-[1.02]'
                      : 'border-clinical-border bg-clinical-subtle hover:border-primary-200 hover:scale-[1.01]'
                  }`}
                  style={{ transitionTimingFunction: 'cubic-bezier(.25,.46,.45,.94)' }}
                >
                  <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                    role === r.value ? 'bg-primary-50 text-primary-500 scale-110' : 'bg-gray-100 text-clinical-muted'
                  }`}>
                    {r.icon}
                  </div>
                  <p className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                    role === r.value ? 'text-primary-500' : 'text-clinical-muted'
                  }`}>{r.label}</p>
                  <p className="text-[10px] text-clinical-muted mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>

            {/* Login Form with interactive inputs */}
            <form onSubmit={handleLogin} className="space-y-5 animate-stagger-3">
              <div>
                <label className="label-text">Medical Email</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-primary-500 transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="iris.walker@trilens.med"
                    className="input-field"
                    required
                    id="login-email"
                  />
                </div>
              </div>

              <div>
                <label className="label-text">Access Key</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-primary-500 transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pr-12"
                    required
                    id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-clinical-muted hover:text-primary-500 transition-all duration-300 hover:scale-110"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-clinical-muted cursor-pointer group">
                  <input type="checkbox" className="rounded border-clinical-border text-primary-500 focus:ring-primary-300 transition-all duration-200" />
                  <span className="group-hover:text-clinical-text transition-colors duration-200">Keep session secure</span>
                </label>
                <button type="button" onClick={() => { setShowForgotModal(true); setForgotSuccess(false); setForgotError(''); setForgotEmail(''); }} className="text-primary-500 font-medium hover:underline text-sm transition-all duration-200 hover:text-primary-400">
                  Forgot Access Key?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 text-base"
                id="login-submit"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    Sign in as {role.charAt(0).toUpperCase() + role.slice(1)}
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8 animate-stagger-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-clinical-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs font-semibold uppercase tracking-widest text-clinical-muted">Simulation Access</span>
              </div>
            </div>

            {/* Demo Buttons with stagger */}
            <div className="flex gap-3 justify-center animate-stagger-5">
              {[
                { role: 'patient', label: 'Patient Demo', letter: 'P', color: 'bg-primary-500' },
                { role: 'doctor', label: 'Doctor Demo', letter: 'D', color: 'bg-primary-400' },
                { role: 'guardian', label: 'Guardian Demo', letter: 'G', color: 'bg-primary-300' },
              ].map((demo) => (
                <button
                  key={demo.role}
                  onClick={() => handleDemoLogin(demo.role)}
                  disabled={!!demoLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-clinical-border bg-white hover:bg-clinical-subtle transition-all duration-300 hover:shadow-clinical hover:-translate-y-0.5 text-sm"
                  id={`demo-${demo.role}`}
                >
                  {demoLoading === demo.role ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <span className={`w-6 h-6 rounded-full ${demo.color} text-white flex items-center justify-center text-xs font-bold transition-transform duration-300 hover:scale-110`}>
                        {demo.letter}
                      </span>
                      {demo.label}
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Register link */}
            <div className="text-center mt-8 pt-6 border-t border-clinical-border animate-stagger-6">
              <p className="text-sm text-clinical-muted mb-3">Don't have an account yet?</p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-primary-500 font-semibold hover:gap-3 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create New Account
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Security badges with stagger */}
          <div className="flex items-center justify-center gap-6 mt-6 animate-stagger-6">
            {['HIPAA COMPLIANT', '256-BIT AES', 'GDPR PROTECTED'].map((badge) => (
              <div key={badge} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-clinical-muted hover:text-primary-500 transition-colors duration-300 cursor-default">
                <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          FORGOT PASSWORD MODAL
         ═══════════════════════════════════════════════ */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowForgotModal(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

          {/* Modal */}
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-clinical-muted hover:text-clinical-text transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {forgotSuccess ? (
              /* ── Success State ── */
              <div className="text-center animate-fade-in">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4 validation-icon">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-clinical-text mb-2">Check Your Email</h3>
                <p className="text-sm text-clinical-muted mb-6 leading-relaxed">
                  If an account with that email exists, we've sent a password reset link. Please check your inbox (and the backend console for demo purposes).
                </p>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="btn-primary px-8 py-2.5 text-sm"
                >
                  Got It
                </button>
              </div>
            ) : (
              /* ── Email Form ── */
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto bg-primary-50 rounded-2xl flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-clinical-text">Reset Your Access Key</h3>
                  <p className="text-sm text-clinical-muted mt-1">Enter your registered email to receive a reset link</p>
                </div>

                {forgotError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="label-text">Medical Email</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-primary-500 transition-colors duration-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="iris.walker@trilens.med"
                        className="input-field"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        Send Reset Link
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
