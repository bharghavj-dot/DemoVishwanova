import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-clinical-border mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs font-semibold uppercase tracking-widest text-clinical-muted">
            <Link to="#" className="hover:text-primary-500 transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-primary-500 transition-colors">Clinical Disclaimers</Link>
            <Link to="#" className="hover:text-primary-500 transition-colors">Support</Link>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-clinical-border">
          <p className="text-center text-xs text-clinical-muted tracking-wide">
            © 2024 TRILENS CLINICAL SYSTEMS. MEDICAL DIAGNOSTIC USE ONLY.
          </p>
        </div>
      </div>
    </footer>
  );
}
