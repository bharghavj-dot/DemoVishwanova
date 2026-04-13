import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import TiltedCard from '../components/TiltedCard';
import stethImg from '../steth.jpeg';

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

  // Generate a gradient avatar URL based on doctor name for TiltedCard
  const getAvatarGradient = (name, index) => {
    const gradients = [
      'linear-gradient(135deg, #1B4D4B 0%, #00D4AA 100%)',
      'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
      'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
      'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    ];
    return gradients[index % gradients.length];
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
      {/* Semi-transparent overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(230, 240, 240, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }} className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
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
                  ? 'border-primary-200 text-clinical-text'
                  : 'border-white/40 text-clinical-muted hover:border-primary-200'
              }`}
              style={{
                background: activeCategory === cat ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: activeCategory === cat ? '1px solid rgba(0, 212, 170, 0.4)' : '1px solid rgba(255,255,255,0.6)',
                boxShadow: activeCategory === cat ? '0 4px 12px rgba(0, 0, 0, 0.05)' : 'none',
              }}
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
              <div
                key={i}
                className="rounded-2xl overflow-hidden animate-slide-up"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.7)',
                }}
              >
                {/* TiltedCard Avatar Section */}
                <div className="relative">
                  <TiltedCard
                    imageSrc={doc.avatar_url || stethImg}
                    altText={doc.name}
                    captionText={doc.specialty}
                    containerHeight="200px"
                    containerWidth="100%"
                    imageHeight="200px"
                    imageWidth="100%"
                    scaleOnHover={1}
                    rotateAmplitude={0}
                    showMobileWarning={false}
                    showTooltip={true}
                    displayOverlayContent={true}
                    overlayContent={
                      <div className="text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{doc.name}</span>
                          {doc.verified && (
                            <span className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center text-white text-[10px]">✓</span>
                          )}
                        </div>
                        <p className="text-sm text-white/80">{doc.specialty}</p>
                      </div>
                    }
                  />
                </div>

                {/* Doctor Info */}
                <div className="p-5">

                  {doc.specialties && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {doc.specialties.map((s, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full border border-clinical-border text-clinical-muted">{s}</span>
                      ))}
                    </div>
                  )}

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className={`w-4 h-4 ${j < Math.floor(doc.rating || 0) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-sm text-clinical-muted ml-1">{doc.rating} ({doc.review_count})</span>
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
