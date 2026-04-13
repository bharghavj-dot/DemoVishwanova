import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Family() {
  const { dispatch } = useApp();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', relationship: '', email: '' });
  const [adding, setAdding] = useState(false);
  const [viewingReports, setViewingReports] = useState(null);
  const [memberReports, setMemberReports] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await API.get('/family/members');
      setMembers(res.data.members || []);
    } catch (err) { /* handled */ }
    finally { setLoading(false); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await API.post('/family/members', newMember);
      dispatch({ type: 'SET_TOAST', payload: { message: 'Family member enrolled!', type: 'success' } });
      setShowForm(false);
      setNewMember({ name: '', relationship: '', email: '' });
      fetchMembers();
    } catch (err) { /* handled */ }
    finally { setAdding(false); }
  };

  const handleViewDashboard = async (memberId) => {
    try {
      const res = await API.get(`/family/members/${memberId}/reports`);
      setMemberReports(Array.isArray(res.data) ? res.data : (res.data.reports || []));
      setViewingReports(memberId);
    } catch (err) { /* handled */ }
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`/family/members/${deleteTarget.id}`);
      dispatch({ type: 'SET_TOAST', payload: { message: `${deleteTarget.name} has been removed.`, type: 'success' } });
      setDeleteTarget(null);
      if (viewingReports === deleteTarget.id) setViewingReports(null);
      fetchMembers();
    } catch (err) {
      dispatch({ type: 'SET_TOAST', payload: { message: 'Failed to remove member.', type: 'error' } });
    } finally {
      setDeleting(false);
    }
  };

  const statusColors = {
    STABLE: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-300' },
    'NEW REPORT AVAILABLE': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-300' },
    'CHECKUP PENDING': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-300' },
  };

  const avatarColors = ['from-rose-400 to-rose-600', 'from-purple-400 to-purple-600', 'from-blue-400 to-blue-600', 'from-teal-400 to-teal-600'];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading family..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 via-clinical-bg to-clinical-bg">
      <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-3">Family Wellness Dashboard</h1>
          <p className="text-clinical-muted text-base">Select a family member to review clinical records and wellness insights.</p>
        </div>

        {/* Member cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {members.map((member, i) => {
            const status = statusColors[member.status] || statusColors.STABLE;
            return (
              <div key={member.id} className="card-static p-6 text-center relative animate-slide-up" style={{ animationDelay: `${i * 0.15}s` }}>
                {/* Status badge */}
                <div className="absolute top-4 right-4">
                  <span className={`badge ${status.bg} ${status.text}`}>
                    <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                    {member.status}
                  </span>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => setDeleteTarget(member)}
                  className="absolute top-4 left-4 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all duration-200 opacity-60 hover:opacity-100"
                  title="Remove member"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                {/* Avatar */}
                <div className={`w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-white`}>
                  {member.name?.charAt(0)?.toUpperCase()}
                </div>

                <h3 className="text-xl font-bold text-clinical-text">{member.name}</h3>
                <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-6">{member.relationship}</p>

                <button
                  onClick={() => handleViewDashboard(member.id)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  View Dashboard
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Member reports view */}
        {viewingReports && (
          <div className="card-static p-6 mb-8 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-clinical-text">
                Reports for {members.find(m => m.id === viewingReports)?.name}
              </h3>
              <button onClick={() => setViewingReports(null)} className="text-clinical-muted hover:text-primary-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {memberReports.length === 0 ? (
              <p className="text-sm text-clinical-muted py-8 text-center">No reports available for this member.</p>
            ) : (
              <div className="space-y-3">
                {memberReports.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-clinical-bg rounded-xl">
                    <div>
                      <p className="font-semibold text-sm">{r.primary_disease}</p>
                      <p className="text-xs text-clinical-muted">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-primary-500">{Math.round(r.confidence * 100)}%</span>
                      <span className={`badge ${r.severity === 'Mild' ? 'badge-success' : 'badge-warning'}`}>{r.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enroll new member */}
        <div className="text-center">
          {showForm ? (
            <div className="card-static p-8 max-w-md mx-auto animate-scale-in">
              <h3 className="text-lg font-bold text-clinical-text mb-4">Enroll New Family Member</h3>
              <form onSubmit={handleAddMember} className="space-y-4">
                <input type="text" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Full Name" className="input-field pl-4" required />
                <input type="text" value={newMember.relationship} onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })} placeholder="Relationship (e.g. Spouse, Son)" className="input-field pl-4" required />
                <input type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} placeholder="Email (optional)" className="input-field pl-4" />
                <div className="flex gap-3">
                  <button type="submit" disabled={adding} className="btn-primary flex-1">
                    {adding ? <LoadingSpinner size="sm" /> : 'Enroll Member'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-dashed border-clinical-border rounded-2xl text-sm font-bold uppercase tracking-widest text-clinical-muted hover:border-primary-300 hover:text-primary-500 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Enroll New Family Member
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
         ═══════════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-clinical-text mb-2">Remove Family Member</h3>
            <p className="text-sm text-clinical-muted mb-6">
              Are you sure you want to remove <strong>{deleteTarget.name}</strong> ({deleteTarget.relationship}) from your family dashboard? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
