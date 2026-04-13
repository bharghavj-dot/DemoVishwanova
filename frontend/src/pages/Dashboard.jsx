import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, historyRes] = await Promise.all([
          API.get('/auth/me'),
          API.get('/reports/history'),
        ]);
        dispatch({ type: 'SET_USER', payload: meRes.data });
        setReports(historyRes.data.reports || []);
      } catch (err) {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dispatch]);

  /* ── Scroll reveal observer ── */
  useEffect(() => {
    if (loading) return;
    const reveals = document.querySelectorAll('.reveal, .reveal-scale, .stagger-children');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const modules = [
    {
      title: 'Tongue Scan',
      desc: 'Analyze microbial coating and hydration patterns.',
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-teal-100">
          <svg className="w-7 h-7 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      ),
      color: 'text-primary-500',
    },
    {
      title: 'Ocular Check',
      desc: 'Evaluate retinal clarity and sclera coloration.',
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-purple-100">
          <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      ),
      color: 'text-purple-600',
    },
    {
      title: 'Nail Bed Analysis',
      desc: 'Scan for micronutrient markers and oxygenation.',
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-gray-200">
          <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          </svg>
        </div>
      ),
      color: 'text-gray-700',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-clinical-bg">
      {/* Hero Greeting — animated entry */}
      <div className="bg-gradient-to-r from-primary-50 via-clinical-bg to-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-3 animate-fade-in-up">
            {getGreeting()}, {state.user?.full_name?.split(' ')[0] || 'User'}.
          </h1>
          <p className="text-clinical-muted text-base animate-stagger-2">
            Your physiological baseline remains stable. Next diagnostic window in 4 hours.
          </p>
          <div className="flex gap-3 mt-6 animate-stagger-3">
            <Link to="/profile" className="btn-ghost flex items-center gap-2 text-sm border border-clinical-border rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-all duration-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View All History
            </Link>
            {reports.length > 0 && (
              <button className="btn-ghost flex items-center gap-2 text-sm border border-clinical-border rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-all duration-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Report
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Diagnostic Scan Modules — staggered reveal */}
        <h2 className="section-title mb-6 reveal">Diagnostic Scan Modules</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-12 stagger-children">
          {modules.map((mod, i) => (
            <div key={i} className="card p-8 group cursor-pointer">
              <div className="mb-5">{mod.icon}</div>
              <h3 className={`text-xl font-bold ${mod.color} mb-2 group-hover:translate-x-1 transition-transform duration-300`}>{mod.title}</h3>
              <p className="text-sm text-clinical-muted mb-6">{mod.desc}</p>
              <button
                onClick={() => navigate('/scan')}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-500 group-hover:gap-3 transition-all duration-300"
              >
                Launch Module
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Recent Reports — staggered reveal */}
        {reports.length > 0 && (
          <>
            <h2 className="section-title mb-6 reveal">Recent Reports</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {reports.slice(0, 6).map((report, i) => (
                <Link
                  key={i}
                  to={report.is_final ? `/report/${report.session_id}/final` : `/report/${report.session_id}`}
                  className="card-static p-5 hover:shadow-clinical-lg hover:-translate-y-1 transition-all duration-400 group"
                  style={{ transitionTimingFunction: 'cubic-bezier(.25,.46,.45,.94)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`badge ${report.severity === 'Mild' ? 'badge-success' : report.severity === 'Moderate' ? 'badge-warning' : 'badge-danger'}`}>
                      {report.severity}
                    </span>
                    <span className="text-xs text-clinical-muted">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-clinical-text group-hover:text-primary-500 transition-colors duration-300">{report.primary_disease}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 progress-bar">
                      <div className="progress-fill bg-primary-500" style={{ width: `${(report.confidence * 100)}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-primary-500">{Math.round(report.confidence * 100)}%</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
