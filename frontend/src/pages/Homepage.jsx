import { Link } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';
import HeroAnimation from '../components/HeroAnimation';

export default function Homepage() {
  const heroRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  /* ── Intersection Observer for scroll-reveal ── */
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal, .reveal-scale, .reveal-left, .reveal-right, .stagger-children');
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
  }, []);

  /* ── Parallax on scroll ── */
  const handleScroll = useCallback(() => {
    requestAnimationFrame(() => {
      const scrolled = window.pageYOffset;
      if (orb1Ref.current) {
        orb1Ref.current.style.transform = `translateY(${scrolled * 0.3}px) rotate(${scrolled * 0.02}deg)`;
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.transform = `translateY(${scrolled * -0.2}px) rotate(${scrolled * -0.01}deg)`;
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-clinical-bg">
      {/* ═══════════════════════════════════════════════
          HERO SECTION — staggered text, parallax orbs
         ═══════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-clinical-bg to-white">
        {/* Parallax decorative orbs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            ref={orb1Ref}
            className="absolute top-20 left-10 w-72 h-72 bg-primary-300 rounded-full blur-3xl parallax-orb"
          ></div>
          <div
            ref={orb2Ref}
            className="absolute bottom-20 right-10 w-96 h-96 bg-accent-teal rounded-full blur-3xl parallax-orb"
          ></div>
          {/* Extra decorative ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary-300/20 rounded-full animate-spin-slow"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Animated diagnostic card */}
            {/* Canvas frame animation from demo */}
            <div className="mb-12 mx-auto max-w-2xl animate-fade-in">
              <HeroAnimation />
            </div>

            {/* Staggered hero text */}
            <p className="label-text text-primary-400 mb-3 animate-stagger-1">
              Precision Diagnostics
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-clinical-text leading-tight mb-6">
              <span className="inline-block animate-stagger-2">Clinical Health Insights</span>
              <br />
              <span className="inline-block animate-stagger-3">Through&nbsp;</span>
              <span className="inline-block text-gradient animate-stagger-4">Visual Biomarkers</span>
            </h1>
            <p className="text-base text-clinical-muted leading-relaxed max-w-2xl mx-auto animate-stagger-5">
              Trilens bridges the gap between home wellness and laboratory precision. Our AI-driven platform analyzes physiological visual data to provide a high-trust overview of your internal health landscape.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 animate-stagger-6">
              <Link
                to="/register"
                className="btn-primary text-base flex items-center gap-2 px-8 py-3.5"
              >
                Start Assessment
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to="/login"
                className="btn-outline text-base flex items-center gap-2 px-8 py-3.5"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURES SECTION — hover lift + shine cards
         ═══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12 reveal">
          <p className="label-text text-primary-400 mb-2">Our Technology</p>
          <h2 className="text-3xl font-bold text-clinical-text">
            Three-Point Diagnostic System
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 stagger-children">
          {[
            {
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              ),
              title: 'Tongue Analysis',
              desc: 'Utilizing multispectral imaging to map the lingual dorsum. We analyze coating thickness and color variations that correlate with gastrointestinal microbiome health and systemic inflammation markers.',
              cta: 'Microbial Mapping',
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ),
              title: 'Ocular Check',
              desc: 'High-fidelity scanning of the sclera and iris to detect micro-vascular changes. Our clinical engine identifies early indicators of oxidative stress, liver efficiency, and cardiovascular fatigue.',
              cta: 'Vascular Scan',
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              ),
              title: 'Nail Bed Scan',
              desc: 'Evaluation of the lunula and nail plate morphology. We measure peripheral oxygen saturation and micronutrient bioavailability markers through digital capillary refill assessment.',
              cta: 'Nutrient Index',
            },
          ].map((feature, i) => (
            <div key={i} className="card p-8 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-clinical-bg flex items-center justify-center text-clinical-text mb-5 group-hover:bg-primary-50 group-hover:text-primary-500 transition-all duration-400 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-clinical-text mb-3 group-hover:text-primary-500 transition-colors duration-300">{feature.title}</h3>
              <p className="text-sm text-clinical-muted leading-relaxed mb-6">{feature.desc}</p>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-500 group-hover:gap-3 transition-all duration-300">
                {feature.cta}
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          STATS SECTION — animated counters
         ═══════════════════════════════════════════════ */}
      <section className="bg-gradient-to-r from-primary-500 to-primary-700 py-16 reveal">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white stagger-children">
            {[
              { value: '40K+', label: 'Clinical Cases' },
              { value: '99.2%', label: 'Accuracy Rate' },
              { value: '3', label: 'Biomarker Scans' },
              { value: '<2m', label: 'Analysis Time' },
            ].map((stat, i) => (
              <div key={i} className="group">
                <p className="text-3xl md:text-4xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.value}
                </p>
                <p className="text-xs uppercase tracking-widest text-primary-200">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA SECTION — reveal + glassmorphism
         ═══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="reveal-scale glass-card overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)' }}>
          <div className="grid md:grid-cols-2">
            <div className="p-10 md:p-14 flex flex-col justify-center bg-gradient-to-br from-primary-500 to-primary-700 text-white relative overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-10 -right-10 w-40 h-40 border border-white rounded-full animate-float"></div>
                <div className="absolute bottom-10 left-10 w-24 h-24 border border-white rounded-full animate-float-delayed"></div>
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4 leading-tight">
                  Scientific Integrity In<br />Every Scan
                </h2>
                <p className="text-primary-100 text-sm leading-relaxed mb-8">
                  Our proprietary engine is trained on a dataset of over 40,000 clinically validated cases. By digitizing physical biomarkers, we provide medical-grade insights with the convenience of a smartphone interface.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/register" className="inline-flex items-center justify-center bg-accent-teal text-primary-900 font-semibold py-3 px-6 rounded-xl hover:bg-opacity-90 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow-teal">
                    Start Your Assessment
                  </Link>
                  <button className="inline-flex items-center justify-center bg-white/10 backdrop-blur text-white font-semibold py-3 px-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                    Our Methodology
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-clinical-bg to-white p-10 flex items-center justify-center reveal-right">
              <div className="w-full max-w-sm glass-card p-6 text-center" style={{ background: 'rgba(255,255,255,0.85)' }}>
                <div className="w-16 h-16 mx-auto bg-primary-50 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
                  <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs text-clinical-muted uppercase tracking-widest">Clinical Workstation</p>
                {/* Animated status indicator */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></div>
                  <span className="text-[10px] text-accent-green font-semibold uppercase tracking-widest">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER — with hover interactions
         ═══════════════════════════════════════════════ */}
      <footer className="bg-white border-t border-clinical-border py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold text-primary-500 mb-2">Trilens</h3>
              <p className="text-xs text-clinical-muted">© 2024 TRILENS TACTILE WELLNESS LAB.<br />PRECISION DIAGNOSTICS FOR HUMAN PERFORMANCE.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-primary-400 mb-3">Legal & Ethos</h4>
              <div className="space-y-2">
                <p className="text-xs text-clinical-muted hover:text-primary-500 cursor-pointer transition-colors duration-300 hover:translate-x-1 transform">Privacy Framework</p>
                <p className="text-xs text-clinical-muted hover:text-primary-500 cursor-pointer transition-colors duration-300 hover:translate-x-1 transform">Terms of Use</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-primary-400 mb-3">Clinical Care</h4>
              <div className="space-y-2">
                <p className="text-xs text-clinical-muted hover:text-primary-500 cursor-pointer transition-colors duration-300 hover:translate-x-1 transform">Clinical Whitepapers</p>
                <p className="text-xs text-clinical-muted hover:text-primary-500 cursor-pointer transition-colors duration-300 hover:translate-x-1 transform">Technical Support</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></div>
                <span className="text-xs font-semibold text-accent-green uppercase tracking-widest">System Integrity: Verified</span>
              </div>
              <p className="text-[10px] text-clinical-muted uppercase tracking-wider">Lab Node: CLN-W04-LX<br />Engine Version: 4.2.0-Stable</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
