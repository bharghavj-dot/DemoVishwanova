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
      // Refresh
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
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 bg-white border-r border-clinical-border min-h-screen p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm">
              {state.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DC'}
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-500">{state.user?.full_name || 'Dr. Clinical'}</p>
              <p className="text-[10px] text-clinical-muted uppercase tracking-wider">Senior Pathologist</p>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              { icon: '⚠', label: 'Clinical Alerts', active: false },
              { icon: '📋', label: 'Diagnostic Feed', active: true },
              { icon: '⚙', label: 'Account Settings', active: false },
            ].map((item, i) => (
              <button key={i} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${item.active ? 'bg-primary-50 text-primary-500 font-semibold' : 'text-clinical-muted hover:bg-clinical-subtle'}`}>
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
              <p className="text-clinical-muted text-sm mt-1">Review clinical biomarkers and validate incoming scan requests.</p>
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
              { label: 'Total Patients', value: stats?.total_patients || 0, change: '+12%', color: 'text-primary-500' },
              { label: 'Pending Reviews', value: stats?.pending_reviews || 0, sub: 'Scan data ready', color: 'text-clinical-text' },
              { label: 'Emergency Escalations', value: String(stats?.emergency_escalations || 0).padStart(2, '0'), color: 'text-accent-red', dot: true },
            ].map((stat, i) => (
              <div key={i} className="card-static p-6 relative overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-widest text-clinical-muted mb-2">{stat.label}</p>
                <div className="flex items-end gap-2">
                  <span className={`text-4xl font-bold ${stat.color}`}>{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</span>
                  {stat.change && <span className="text-sm font-semibold text-accent-green mb-1">{stat.change}</span>}
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
                <p>No bookings in queue.</p>
              </div>
            )}
          </div>

          {/* Bottom cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="card-static p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white overflow-hidden relative">
              <h3 className="text-xl font-bold mb-2">Diagnostic Efficiency</h3>
              <p className="text-primary-100 text-sm leading-relaxed mb-4">Average review time has decreased by 18% following the implementation of visual biomarker auto-flagging.</p>
              <button className="bg-white/20 backdrop-blur text-white text-xs font-semibold py-2 px-4 rounded-lg hover:bg-white/30 transition-colors uppercase tracking-wider">
                Review Stats
              </button>
            </div>
            <div className="card-static p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="text-amber-600 font-bold text-sm">📊</span>
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-clinical-muted">Live System Status</h3>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-clinical-text">AI Pre-Processor</span>
                <span className="text-xs font-bold text-accent-green uppercase">Operational</span>
              </div>
              <div className="progress-bar h-2.5 mb-2">
                <div className="progress-fill bg-primary-500" style={{ width: '95%' }}></div>
              </div>
              <p className="text-[10px] text-clinical-muted">Next systematic calibration scheduled for 04:00 AM UTC.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
