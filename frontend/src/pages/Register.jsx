import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Register() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleOptions = [
    { value: 'patient', label: 'Patient', icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    )},
    { value: 'doctor', label: 'Doctor', icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
    )},
    { value: 'guardian', label: 'Guardian', icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    )},
  ];

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!agreed) {
      dispatch({ type: 'SET_TOAST', payload: { message: 'Please agree to the terms', type: 'error' } });
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        confirm_password: confirmPassword,
        role,
      });
      localStorage.setItem('token', res.data.access_token);
      dispatch({ type: 'SET_AUTH', payload: { token: res.data.access_token, user: res.data.user } });
      dispatch({ type: 'SET_TOAST', payload: { message: 'Account created successfully!', type: 'success' } });
      const dest = role === 'doctor' ? '/doctor/dashboard' : role === 'guardian' ? '/family' : '/dashboard';
      navigate(dest);
    } catch (err) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clinical-bg via-white to-primary-50 flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-primary-100/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 -left-20 w-72 h-72 bg-accent-teal/10 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-lg">
          <div className="card-static p-8 md:p-10 animate-fade-in-up">
            <div className="text-center mb-8 animate-stagger-1">
              <h1 className="text-3xl font-bold text-clinical-text">Create Clinical Account</h1>
              <p className="text-clinical-muted mt-2">Initialize your secure medical environment</p>
            </div>

            {/* Role Selector */}
            <div className="animate-stagger-2">
              <label className="label-text">Select Clinical Role</label>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {roleOptions.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`p-4 rounded-xl border-2 transition-all duration-400 text-center ${
                      role === r.value
                        ? 'border-primary-500 bg-white shadow-clinical scale-[1.02]'
                        : 'border-clinical-border bg-clinical-subtle hover:border-primary-200 hover:scale-[1.01]'
                    }`}
                    style={{ transitionTimingFunction: 'cubic-bezier(.25,.46,.45,.94)' }}
                  >
                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                      role === r.value ? 'text-primary-500 scale-110' : 'text-clinical-muted'
                    }`}>
                      {r.icon}
                    </div>
                    <p className={`text-xs font-semibold transition-colors duration-300 ${role === r.value ? 'text-primary-500' : 'text-clinical-muted'}`}>
                      {r.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-5 animate-stagger-3">
              <div>
                <label className="label-text">Full Name</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-primary-500 transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Julian Vane" className="input-field" required id="register-name" />
                </div>
              </div>

              <div>
                <label className="label-text">Medical Email</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-primary-500 transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vane.j@trilens-med.com" className="input-field" required id="register-email" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Access Key</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-primary-500 transition-colors duration-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field" required id="register-password" />
                  </div>
                </div>
                <div>
                  <label className="label-text">Confirm Access Key</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-primary-500 transition-colors duration-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input-field" required id="register-confirm" />
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm text-clinical-muted cursor-pointer group">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 rounded border-clinical-border text-primary-500 focus:ring-primary-300 transition-all duration-200" />
                <span className="group-hover:text-clinical-text transition-colors duration-200">I agree to the <span className="text-primary-500 font-medium">Clinical Terms of Service</span> and <span className="text-primary-500 font-medium">Privacy Protocol</span>.</span>
              </label>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 text-sm uppercase tracking-wider" id="register-submit">
                {loading ? <LoadingSpinner size="sm" /> : (
                  <>
                    Create My Clinical Account
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-6 animate-stagger-5">
              <p className="text-sm text-clinical-muted">Already have an account? <Link to="/login" className="text-primary-500 font-bold hover:underline transition-all duration-200">Sign In</Link></p>
            </div>
          </div>

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
    </div>
  );
}
