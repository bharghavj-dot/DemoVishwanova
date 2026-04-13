import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import stethImg from '../steth.jpeg';

export default function Profile() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState(null);
  const [showRecords, setShowRecords] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get('/profile');
        setProfile(res.data);
        setEditName(res.data.full_name || '');
        setEditEmail(res.data.email || '');
      } catch (err) { /* handled */ }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await API.put('/profile', { full_name: editName, email: editEmail });
      setProfile(res.data);
      setEditing(false);
      dispatch({ type: 'SET_TOAST', payload: { message: 'Profile updated!', type: 'success' } });
    } catch (err) { /* handled */ }
    finally { setSaving(false); }
  };

  const handleViewVault = async () => {
    try {
      const res = await API.get('/profile/records');
      setRecords(res.data.records || []);
      setShowRecords(true);
    } catch (err) { /* handled */ }
  };

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  if (!profile) return null;

  const stabilityColors = {
    High: 'bg-primary-500',
    Medium: 'bg-amber-500',
    Low: 'bg-red-500',
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        backgroundImage: `url(${stethImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        position: 'relative',
      }}
    >
      {/* Semi-transparent overlay to soften the image and provide a denser glass effect */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(230, 240, 240, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }} className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
        {/* Profile header card */}
        <div className="card-static p-8 mb-8" style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.6)',
        }}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-4xl font-bold text-white">
                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs text-clinical-muted uppercase tracking-widest mb-1">Patient ID: {profile.patient_id || 'N/A'}</p>
              <h1 className="text-3xl font-bold text-clinical-text">{profile.full_name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 justify-center md:justify-start">
                <span className={`badge text-white ${stabilityColors[profile.clinical_stability] || 'bg-gray-400'}`}>
                  <div className="w-2 h-2 rounded-full bg-white/80"></div>
                  Clinical Stability: {profile.clinical_stability || 'N/A'}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-clinical-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Member since {profile.member_since ? new Date(profile.member_since).getFullYear() : 'N/A'}
                </span>
              </div>
            </div>
            <div className="card-static p-4 text-center hidden md:block">
              <p className="text-[10px] text-clinical-muted uppercase tracking-widest mb-2">Metric Trend</p>
              <div className="flex items-end gap-1 h-12 justify-center">
                {[40, 55, 35, 70, 60, 80, 65].map((h, i) => (
                  <div key={i} className="w-3 rounded-t bg-primary-300 transition-all" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Personal Information */}
          <div className="card p-6" style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}>
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-clinical-text mb-2">Personal Information</h3>
            <p className="text-sm text-clinical-muted mb-4">Modify your core identity data, emergency contacts, and health foundations.</p>

            {editing ? (
              <div className="space-y-3 mb-4">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field pl-4 text-sm" placeholder="Full Name" />
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="input-field pl-4 text-sm" placeholder="Email" />
                <div className="flex gap-2">
                  <button onClick={handleUpdate} disabled={saving} className="btn-primary text-xs py-2 px-4 flex-1">
                    {saving ? <LoadingSpinner size="sm" /> : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-outline text-xs py-2 px-4">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-500 hover:gap-3 transition-all">
                Update Details
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            )}
          </div>

          {/* Clinical Records */}
          <div className="card p-6" style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}>
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-clinical-text mb-2">Clinical Records</h3>
            <p className="text-sm text-clinical-muted mb-4">Archive of longitudinal scan reports, therapy logs, and shared diagnostic data.</p>
            <button onClick={handleViewVault} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-500 hover:gap-3 transition-all">
              View Vault
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>


        </div>



        {/* Records modal */}
        {showRecords && records && (
          <div className="card-static p-6 mb-8 animate-scale-in" style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-clinical-text">Clinical Records Vault</h3>
              <button onClick={() => setShowRecords(false)} className="text-clinical-muted hover:text-primary-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {records.length === 0 ? (
              <p className="text-sm text-clinical-muted py-8 text-center">No records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-clinical-border">
                      <th className="text-left py-3 text-xs font-semibold uppercase tracking-widest text-clinical-muted">Session</th>
                      <th className="text-left py-3 text-xs font-semibold uppercase tracking-widest text-clinical-muted">Disease</th>
                      <th className="text-left py-3 text-xs font-semibold uppercase tracking-widest text-clinical-muted">Confidence</th>
                      <th className="text-left py-3 text-xs font-semibold uppercase tracking-widest text-clinical-muted">Severity</th>
                      <th className="text-left py-3 text-xs font-semibold uppercase tracking-widest text-clinical-muted">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i} className="border-b border-clinical-border hover:bg-clinical-subtle transition-colors">
                        <td className="py-3 font-mono text-xs">{r.session_id}</td>
                        <td className="py-3 font-medium">{r.primary_disease}</td>
                        <td className="py-3 font-bold text-primary-500">{Math.round(r.confidence * 100)}%</td>
                        <td className="py-3"><span className={`badge ${r.severity === 'Mild' ? 'badge-success' : r.severity === 'Moderate' ? 'badge-warning' : 'badge-danger'}`}>{r.severity}</span></td>
                        <td className="py-3 text-clinical-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <div className="text-center">
          <button onClick={handleLogout} className="btn-outline flex items-center gap-2 mx-auto">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            SIGN OUT
          </button>
          <p className="text-[10px] text-clinical-muted uppercase tracking-widest mt-3">Security Level: Grade-A AES-256</p>
        </div>
      </div>
    </div>
  );
}
