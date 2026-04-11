import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Consultations() {
  const { state, dispatch } = useApp();
  const [doctors, setDoctors] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const fetchDoctors = async (category = 'All') => {
    setLoading(true);
    try {
      const params = category && category !== 'All' ? { category } : {};
      const res = await API.get('/doctors', { params });
      setDoctors(res.data.doctors || []);
      if (res.data.categories) setCategories(res.data.categories);
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    fetchDoctors(cat);
  };

  const handleBook = async (doctorId) => {
    try {
      const body = { doctor_id: doctorId };
      if (state.sessionId) body.session_id = state.sessionId;
      const res = await API.post('/doctors/book', body);
      dispatch({ type: 'SET_TOAST', payload: { message: `Consultation booked! ID: ${res.data.booking_id}`, type: 'success' } });
    } catch (err) { /* handled */ }
  };

  return (
    <div className="min-h-screen bg-clinical-bg">
      <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">Clinical Consultations</h1>
          <p className="text-clinical-muted">Connect with verified experts specializing in visual biomarkers through our secure clinical network.</p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-white shadow-clinical border border-primary-200 text-clinical-text'
                  : 'bg-transparent border border-clinical-border text-clinical-muted hover:border-primary-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Doctor cards */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" text="Loading specialists..." />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc, i) => (
              <div key={i} className="card-static p-6 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-clinical-bg flex items-center justify-center text-2xl font-bold text-primary-500 flex-shrink-0">
                    {doc.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-clinical-text">{doc.name}</h3>
                      {doc.verified && <span className="badge-success text-[9px]">Verified</span>}
                    </div>
                    <p className="text-sm text-primary-500 font-medium">{doc.specialty}</p>
                    {doc.specialties && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.specialties.map((s, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-full border border-clinical-border text-clinical-muted">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className={`w-4 h-4 ${j < Math.floor(doc.rating || 0) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-sm text-clinical-muted ml-1">{doc.rating} ({doc.review_count} reviews)</span>
                </div>

                {/* Fee + Availability */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] text-clinical-muted uppercase tracking-widest">Fee</p>
                    <p className="text-xl font-bold text-clinical-text">${doc.fee?.toFixed(0)} <span className="text-xs font-normal text-clinical-muted">/ session</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-clinical-muted uppercase tracking-widest">Availability</p>
                    <p className="text-sm font-semibold text-primary-500">{doc.availability}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={() => handleBook(doc.id)} className="btn-primary text-sm py-2.5 flex-1">
                    Book Consultation
                  </button>
                  <button className="w-10 h-10 rounded-xl border border-clinical-border flex items-center justify-center text-clinical-muted hover:text-primary-500 hover:border-primary-200 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trust badges */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-16 py-8">
          {[
            { icon: '✓', title: 'Verified Specialists', desc: '100% credential checked' },
            { icon: '🔒', title: 'HIPAA Compliant', desc: 'Bank-grade data security' },
            { icon: '+', title: 'HD Encrypted Video', desc: 'Crystal clear secure link' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 font-bold">{item.icon}</div>
              <div>
                <p className="font-semibold text-sm text-clinical-text">{item.title}</p>
                <p className="text-xs text-clinical-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
