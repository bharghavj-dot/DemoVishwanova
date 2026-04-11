import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import API from '../api/axios';
import ConfidenceGauge from '../components/ConfidenceGauge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function FinalReport() {
  const { session_id } = useParams();
  const { dispatch } = useApp();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    const fetchFinalReport = async () => {
      try {
        const res = await API.get(`/reports/${session_id}/final`);
        setReport(res.data);
      } catch (err) {
        // handled
      } finally {
        setLoading(false);
      }
    };
    fetchFinalReport();
  }, [session_id]);

  const handleDownloadPDF = async () => {
    try {
      const res = await API.get(`/reports/${session_id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trilens-report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { /* handled */ }
  };

  const handleBookDoctor = async (doctorId) => {
    try {
      const res = await API.post('/doctors/book', { doctor_id: doctorId, session_id });
      setBookingId(res.data.booking_id);
      dispatch({ type: 'SET_TOAST', payload: { message: `Booked successfully! ID: ${res.data.booking_id}`, type: 'success' } });
    } catch (err) { /* handled */ }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading final report..." />
      </div>
    );
  }

  if (!report) return null;

  const confidence = (report.diagnostic_confidence || 0) * 100;

  return (
    <div className="min-h-screen bg-clinical-bg">
      <div className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <span className="badge-info mb-2">Internal ID</span>
            <h1 className="text-2xl font-bold text-clinical-text">Diagnostic Report: #{report.report_id || 'N/A'}</h1>
            <p className="text-sm text-clinical-muted">Patient: {report.patient_name} • Generated: {report.generated_at ? new Date(report.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
          </div>
          <button onClick={handleDownloadPDF} className="btn-primary flex items-center gap-2 text-sm mt-4 md:mt-0" id="download-pdf">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF Report
          </button>
        </div>

        {/* Confidence + Pathologies row */}
        <div className="grid md:grid-cols-[280px_1fr] gap-6 mb-6">
          {/* Confidence gauge */}
          <div className="card-static p-8 flex flex-col items-center justify-center">
            <p className="label-text mb-4">Diagnostic Confidence</p>
            <ConfidenceGauge percentage={confidence} size={180} label="High Accuracy" />
          </div>

          {/* Pathologies + Mandatory Action */}
          <div className="space-y-4">
            <div className="card-static p-6">
              <h3 className="label-text mb-4">Probable Pathologies</h3>
              <div className="space-y-4">
                {(report.probable_pathologies || []).map((p, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-clinical-text">{p.display_name}</span>
                      <span className="text-sm font-bold text-primary-500">{Math.round(p.probability * 100)}% Match</span>
                    </div>
                    <div className="progress-bar h-3">
                      <div
                        className={`progress-fill ${i === 0 ? 'bg-gradient-to-r from-primary-500 to-primary-400' : i === 1 ? 'bg-gradient-to-r from-accent-purple to-purple-300' : 'bg-gradient-to-r from-gray-400 to-gray-300'}`}
                        style={{ width: `${p.probability * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mandatory Clinical Action */}
            {report.see_doctor_flag && (
              <div className="card-static p-6 bg-primary-500 text-white">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Mandatory Clinical Action</h3>
                    <p className="text-primary-100 text-sm leading-relaxed">{report.mandatory_clinical_action}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Severity badge */}
        <div className="card-static p-5 mb-6 inline-flex items-center gap-3">
          <p className="label-text mb-0">Severity Level</p>
          <span className="text-xl font-bold text-clinical-text">{report.severity}</span>
          <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Medications + Precautions */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Medications */}
          <div className="card-static p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-clinical-muted mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Recommended Over-the-Counter
            </h3>
            <div className="space-y-3">
              {(report.medications || []).map((med, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-clinical-bg rounded-xl group hover:bg-primary-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-clinical-text">{med.name}</p>
                    <p className="text-xs text-clinical-muted">{med.dosage}</p>
                  </div>
                  <svg className="w-4 h-4 text-clinical-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Precautions */}
          <div className="card-static p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-clinical-muted mb-4">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Crucial Precautions
            </h3>
            <div className="space-y-3">
              {(report.precautions || []).map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-red mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-clinical-text leading-relaxed">{p}</p>
                </div>
              ))}
            </div>

            {/* Escalation flags */}
            {report.escalation_flags && report.escalation_flags.length > 0 && (
              <div className="mt-6 pt-4 border-t border-clinical-border">
                <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">Escalation Flags</h4>
                <div className="flex flex-wrap gap-2">
                  {report.escalation_flags.map((flag, i) => (
                    <span key={i} className="badge-danger text-[10px]">{flag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Specialists */}
        {report.recommended_specialists && report.recommended_specialists.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">Recommended Specialists</h2>
              <a href="/consultations" className="text-sm text-primary-500 font-medium hover:underline flex items-center gap-1">
                View All Directory
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {report.recommended_specialists.map((doc, i) => (
                <div key={i} className="card-static p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-clinical-bg flex items-center justify-center text-lg font-bold text-primary-500">
                      {doc.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-clinical-text">{doc.name}</h4>
                      <p className="text-xs text-clinical-muted uppercase tracking-wider">{doc.specialty}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-clinical-muted mb-4">
                    <span>{doc.distance}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {doc.rating} ({doc.review_count})
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] text-clinical-muted uppercase tracking-widest">Consultation</p>
                      <p className="text-xl font-bold text-clinical-text">${doc.fee?.toFixed(2)}</p>
                    </div>
                    <div className="text-right text-xs text-green-600 font-medium">{doc.availability}</div>
                  </div>
                  <button
                    onClick={() => handleBookDoctor(doc.id)}
                    className="btn-primary w-auto text-sm py-2 px-5"
                  >
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-clinical-border pt-8 pb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-primary-500">Trilens</h3>
              <p className="text-[10px] text-clinical-muted uppercase tracking-wider">© 2024 TRILENS MEDICAL SYSTEMS. ADVANCED AI-DRIVEN CLINICAL DECISION SUPPORT TOOL.</p>
            </div>
            <div className="flex gap-6 text-xs text-clinical-muted uppercase tracking-widest">
              <span className="hover:text-primary-500 cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-primary-500 cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-primary-500 cursor-pointer transition-colors">Clinical Disclaimers</span>
              <span className="hover:text-primary-500 cursor-pointer transition-colors">HIPAA Compliance</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
