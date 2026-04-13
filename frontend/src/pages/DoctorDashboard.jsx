import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DoctorDashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await API.get('/doctor/dashboard');
        setData(res.data);
      } catch (err) { /* handled */ }
      finally { setLoading(false); }
    };
    fetchDashboard();
  }, []);

  const handleAction = async (bookingId, action, sessionId) => {
    try {
      await API.put(`/doctor/bookings/${bookingId}`, { action });
      dispatch({ type: 'SET_TOAST', payload: { message: `Booking ${action}ed successfully`, type: 'success' } });
      if (action === 'review' && sessionId) {
        navigate(`/report/${sessionId}`);
      }
      const res = await API.get('/doctor/dashboard');
      setData(res.data);
    } catch (err) { /* handled */ }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading doctor dashboard..." />
      </div>
    );
  }

  if (!data) return null;

  const { stats, bookings } = data;

  return (
    <div className="min-h-screen bg-clinical-bg">
      <div className="flex">
        {/* Sidebar — simplified */}
        <aside className="hidden lg:block w-56 bg-white border-r border-clinical-border min-h-screen p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm">
              {state.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DC'}
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-500">{state.user?.full_name || 'Dr. Clinical'}</p>
              <p className="text-[10px] text-clinical-muted uppercase tracking-wider">Doctor</p>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              { icon: '📋', label: 'Dashboard', id: 'dashboard' },
              { icon: '👤', label: 'Profile', id: 'profile' },
              { icon: '⚙', label: 'Account Settings', id: 'settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'profile') navigate('/profile');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === item.id ? 'bg-primary-50 text-primary-500 font-semibold' : 'text-clinical-muted hover:bg-clinical-subtle'}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-clinical-text">Patient Bookings</h1>
              <p className="text-clinical-muted text-sm mt-1">Review and manage your patient bookings and consultation requests.</p>
            </div>
            <div className="card-static px-4 py-2 flex items-center gap-2 mt-4 md:mt-0">
              <svg className="w-4 h-4 text-clinical-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-clinical-text font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Total Patients', value: stats?.total_patients || 0, color: 'text-primary-500', icon: '🏥' },
              { label: 'Pending Reviews', value: stats?.pending_reviews || 0, sub: 'Awaiting your review', color: 'text-clinical-text', icon: '⏳' },
              { label: 'Emergency Escalations', value: String(stats?.emergency_escalations || 0).padStart(2, '0'), color: 'text-accent-red', dot: true, icon: '🚨' },
            ].map((stat, i) => (
              <div key={i} className="card-static p-6 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{stat.icon}</span>
                  <p className="text-xs font-semibold uppercase tracking-widest text-clinical-muted">{stat.label}</p>
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-4xl font-bold ${stat.color}`}>{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</span>
                  {stat.dot && <span className="w-3 h-3 rounded-full bg-accent-red animate-pulse mb-2"></span>}
                </div>
                {stat.sub && <p className="text-xs text-clinical-muted mt-1">{stat.sub}</p>}
              </div>
            ))}
          </div>

          {/* Clinical Priority Queue */}
          <div className="card-static overflow-hidden">
            <div className="p-6 flex items-center justify-between border-b border-clinical-border">
              <h2 className="text-xl font-bold text-clinical-text">Clinical Priority Queue</h2>
              <div className="flex gap-2">
                {['all', 'high'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-white shadow-clinical border border-clinical-border text-clinical-text' : 'text-clinical-muted hover:bg-clinical-subtle'}`}
                  >
                    {f === 'all' ? 'All Types' : 'High Risk'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-clinical-border bg-clinical-subtle">
                    {['Patient Profile', 'Symptom Cluster', 'Scan Type', 'Criteria Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-clinical-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(bookings || []).map((booking, i) => (
                    <tr key={i} className="border-b border-clinical-border hover:bg-clinical-subtle transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-clinical-bg flex items-center justify-center text-sm font-bold text-primary-500">
                            {booking.patient_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-clinical-text">{booking.patient_name}</p>
                            <p className="text-[10px] text-clinical-muted">ID: #{booking.patient_id?.slice(-7)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-clinical-text">{booking.symptom_cluster}</td>
                      <td className="px-6 py-4">
                        <span className="badge bg-primary-50 text-primary-600 text-[10px]">{booking.scan_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${booking.criteria_status === 'Criteria Met' ? 'text-accent-green' : 'text-amber-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${booking.criteria_status === 'Criteria Met' ? 'bg-accent-green' : 'bg-amber-400'}`}></div>
                          {booking.criteria_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(booking.booking_id, 'confirm', null)}
                            className="btn-primary text-xs py-2 px-3"
                          >
                            Confirm Booking
                          </button>
                          <button
                            onClick={() => handleAction(booking.booking_id, 'review', booking.session_id)}
                            className="btn-outline text-xs py-2 px-3"
                          >
                            Review Full Scan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(!bookings || bookings.length === 0) && (
              <div className="py-12 text-center text-clinical-muted">
                <svg className="w-16 h-16 mx-auto mb-4 text-clinical-border" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-semibold text-clinical-text mb-1">No bookings yet</p>
                <p className="text-sm">Patient bookings will appear here when they schedule a consultation with you.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
