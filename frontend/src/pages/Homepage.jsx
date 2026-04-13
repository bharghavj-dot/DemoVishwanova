import { Link } from 'react-router-dom';
import { useEffect, useRef, useCallback, useState } from 'react';
import HeroAnimation from '../components/HeroAnimation';

export default function Homepage() {
  const heroRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let scanTimeout;
    let completeTimeout;
    
    const runCycle = () => {
      setIsScanning(true);
      // Scan for 6 seconds
      scanTimeout = setTimeout(() => {
        setIsScanning(false);
        // Show "Scan Complete" for 2.5 seconds, then restart cycle
        completeTimeout = setTimeout(runCycle, 2500);
      }, 6000);
    };
    
    runCycle();
    
    return () => {
      clearTimeout(scanTimeout);
      clearTimeout(completeTimeout);
    };
  }, []);

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
          HOW IT WORKS SECTION — Alternating layout
         ═══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-24 space-y-32">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto reveal mb-8">
          <p className="text-primary-500 font-semibold tracking-wide uppercase text-sm mb-3">How It Works</p>
          <h2 className="text-3xl md:text-5xl font-bold text-clinical-text leading-tight">
            The easiest way to understand your health
          </h2>
        </div>

        {/* Step 1: Scan */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-24 reveal">
          <div className="w-full md:w-1/2 relative flex justify-center order-2 md:order-1">
            {/* Blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 md:w-[28rem] md:h-[28rem] bg-[#e6f0f0] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] animate-spin-slow opacity-80 -z-10 transition-all duration-700"></div>
            
            {/* Phone Mockup - Scan */}
            <div className="w-[280px] h-[580px] bg-white rounded-[3rem] border-[12px] border-gray-800 shadow-2xl relative overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-6 bg-gray-800 rounded-b-2xl w-32 mx-auto z-20"></div>
              
              <div className="p-6 pt-12 flex flex-col items-center h-full bg-[#F0F4F4] relative">
                <p className="text-center font-semibold text-[#1A2C2C] mb-8">Tri-Lens Scanner</p>
                <div className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-[#E2E8E8] relative overflow-hidden flex flex-col justify-between p-6">
                   <div className="space-y-5 relative z-10 text-[#1B4D4B] flex flex-col items-center justify-center h-full">
                      {/* Eyes Image/Icon */}
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-[3px] border-white shadow-md overflow-hidden mb-1.5 relative group">
                          <img src="/assets/eye.jpg" alt="Eye" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-[#00D4AA]/10 mix-blend-overlay"></div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Eyes</span>
                      </div>
                      {/* Tongue Image/Icon */}
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-[3px] border-white shadow-md overflow-hidden mb-1.5 relative group">
                          <img src="/assets/tongue.jpg" alt="Tongue" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-[#00D4AA]/10 mix-blend-overlay"></div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Tongue</span>
                      </div>
                      {/* Nail Image/Icon */}
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-[3px] border-white shadow-md overflow-hidden mb-1.5 relative group">
                          <img src="/assets/nails.jpg" alt="Nails" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-[#00D4AA]/10 mix-blend-overlay"></div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Nails</span>
                      </div>
                   </div>
                   
                   {/* Scanning Overlay State */}
                   {!isScanning && (
                     <div className="absolute inset-0 z-30 flex flex-col justify-center items-center backdrop-blur-md bg-white/70 page-enter">
                        <div className="bg-[#22C55E] text-white w-20 h-20 rounded-full flex items-center justify-center shadow-[0_10px_35px_rgba(34,197,94,0.4)] validation-icon">
                           <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                           </svg>
                        </div>
                        <p className="mt-4 font-bold text-[#1B4D4B] page-enter" style={{animationDelay: '150ms'}}>Scan Complete</p>
                     </div>
                   )}

                   {/* Scanning Line */}
                   {isScanning && (
                     <div className="absolute top-0 left-0 right-0 h-1 bg-[#00D4AA] shadow-[0_0_20px_rgba(0,212,170,1)] animate-scan-full z-20"></div>
                   )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 order-1 md:order-2 text-center md:text-left">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#e6f0f0] text-[#1B4D4B] font-bold mb-6">1</div>
             <h3 className="text-3xl md:text-4xl font-bold text-[#1A2C2C] mb-6 leading-tight">
               Multi-Point <span className="text-[#1B4D4B]">Biomarker Scan</span>
             </h3>
             <p className="text-lg text-[#94A3A8] leading-relaxed mb-8">
               Our application and clinical engine make it easy to assess your baseline health metrics. Simply scan your eyes, nails, and tongue using your smartphone to capture high-fidelity physiological data.
             </p>
             <Link to="/login" className="flex flex-row items-center gap-2 text-[#1B4D4B] font-semibold group mx-auto md:mx-0">
               See how it works
               <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
               </svg>
             </Link>
          </div>
        </div>

        {/* Step 2: Report Generation */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-24 reveal">
          <div className="w-full md:w-1/2 text-center md:text-left">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#e6f0f0] text-[#1B4D4B] font-bold mb-6">2</div>
             <h3 className="text-3xl md:text-4xl font-bold text-[#1A2C2C] mb-6 leading-tight">
               Instant Clinical-Grade <span className="text-[#1B4D4B]">Analytics</span>
             </h3>
             <p className="text-lg text-[#94A3A8] leading-relaxed mb-8">
               We process your visual data instantly securely. Receive a comprehensive diagnostic report detailing your systemic health markers, metabolic efficiency, and potential risks with unparalleled clarity.
             </p>
             <Link to="/login" className="flex flex-row items-center gap-2 text-[#1B4D4B] font-semibold group mx-auto md:mx-0">
               View a sample report
               <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
               </svg>
             </Link>
          </div>

          <div className="w-full md:w-1/2 relative flex justify-center">
            {/* Blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 md:w-[32rem] md:h-[26rem] bg-[#00D4AA]/10 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] animate-float opacity-80 -z-10 transition-all duration-700"></div>
            
            {/* Document Mockup */}
            <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500 mx-auto">
               <div className="flex flex-row items-center justify-between mb-8 border-b pb-4">
                  <div className="text-left">
                    <h4 className="font-bold text-gray-800 text-lg">Health Report</h4>
                    <p className="text-xs text-gray-500">Generated Instantly</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#1B4D4B] flex items-center justify-center shadow-lg">
                    <span className="font-bold text-white">92</span>
                  </div>
               </div>
               
               <div className="space-y-6">
                 <div>
                   <div className="flex flex-row justify-between text-sm mb-1"><span className="font-medium text-gray-700">Jaundice</span><span className="text-[#22C55E] font-bold">Optimal</span></div>
                   <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-[#22C55E] h-2 rounded-full" style={{width: '85%'}}></div></div>
                 </div>
                 <div>
                   <div className="flex flex-row justify-between text-sm mb-1"><span className="font-medium text-gray-700">Diabetes</span><span className="text-[#1B4D4B] font-bold">Balanced</span></div>
                   <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-[#1B4D4B] h-2 rounded-full" style={{width: '70%'}}></div></div>
                 </div>
                 <div>
                   <div className="flex flex-row justify-between text-sm mb-1"><span className="font-medium text-gray-700">Healthy</span><span className="text-[#D4A017] font-bold">Needs Attention</span></div>
                   <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-[#D4A017] h-2 rounded-full" style={{width: '45%'}}></div></div>
                 </div>
                 <div className="pt-4 border-t border-gray-50 flex flex-row gap-2">
                    <div className="h-20 flex-1 bg-gray-50 rounded-lg animate-pulse"></div>
                    <div className="h-20 flex-1 bg-gray-50 rounded-lg animate-pulse" style={{ animationDelay: '0.2s'}}></div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Step 3: Consult Doctor */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-24 reveal">
          <div className="w-full md:w-1/2 relative flex justify-center order-2 md:order-1">
            {/* Blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 md:w-[28rem] md:h-[28rem] bg-[#b3d4d3]/40 rounded-[30%_70%_70%_30%/30%_30%_70%_70%] animate-float-delayed opacity-80 -z-10 transition-all duration-700"></div>
            
            {/* Phone Mockup - Booking */}
            <div className="w-[280px] h-[580px] bg-white rounded-[3rem] border-[12px] border-gray-800 shadow-2xl relative overflow-hidden flex flex-col">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-6 bg-gray-800 rounded-b-2xl w-32 mx-auto z-20"></div>
              
              {/* Header */}
              <div className="pt-12 px-5 pb-4 bg-white border-b border-gray-100 flex flex-row items-center justify-between sticky top-0 z-10">
                <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="font-bold text-gray-800 text-sm">Results</span>
                <span className="text-[#1B4D4B] font-bold text-xs">Map</span>
              </div>
              
              {/* Content */}
              <div className="flex-1 bg-white p-4 space-y-3 overflow-y-auto hide-scrollbar">
                 {/* Search Bar */}
                 <div className="bg-gray-50 rounded-full py-2.5 px-4 shadow-inner text-[10px] text-gray-500 flex flex-row items-center gap-2 mb-4 border border-gray-100">
                    <svg className="w-3 h-3 text-[#1B4D4B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <span>General Practitioners · Current Location</span>
                 </div>
                 
                 <div className="flex flex-row gap-2 mb-4">
                    <span className="text-[10px] border border-gray-200 rounded-full px-3 py-1 flex items-center gap-1">Gender <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg></span>
                    <span className="text-[10px] border border-gray-200 rounded-full px-3 py-1 flex items-center gap-1">Sort by <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg></span>
                 </div>

                 {/* Doctor Cards */}
                 {[
                   { name: 'Dr. Sarah Keller', spec: 'Sports Knee Surgeon', rating: '99' },
                   { name: 'Dr. James Okafor', spec: 'Internal Medicine', rating: '99' },
                   { name: 'Dr. Elena Rossi', spec: 'General Practice', rating: '98' },
                   { name: 'Dr. Wei Chen', spec: 'Functional Medicine', rating: '97' },
                   { name: 'Dr. Jordan Elwood', spec: 'General Practice', rating: '96' }
                 ].map((doc, i) => (
                   <div key={i} className="bg-white py-3 border-b border-gray-100 flex flex-row items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-[#1B4D4B] flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md">
                       {doc.name.charAt(4)}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h5 className="font-semibold text-xs text-gray-900 truncate">{doc.name}</h5>
                       <p className="text-[9px] text-gray-500 truncate">{doc.spec}</p>
                       <p className="text-[9px] text-[#22C55E] flex items-center gap-1 font-medium mt-0.5">
                         <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                         Approved
                       </p>
                     </div>
                     <div className="flex flex-col items-end gap-1">
                       <span className="bg-[#1B4D4B] text-white text-[9px] px-2 py-0.5 rounded font-bold shadow-sm flex items-center gap-1">
                         <svg className="w-2.5 h-2.5 text-[#00D4AA]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                         {doc.rating}
                       </span>
                       <span className="text-[8px] text-gray-400 font-medium">{2 + i}.{i} mi</span>
                     </div>
                   </div>
                 ))}
              </div>
              
              {/* Bottom Nav */}
              <div className="bg-white border-t border-gray-200 py-3 px-6 flex flex-row items-center justify-between pb-6">
                 <div className="flex flex-col items-center text-gray-400 gap-1"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-[8px] font-medium">Home</span></div>
                 <div className="flex flex-col items-center text-[#1B4D4B] gap-1"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg><span className="text-[8px] font-bold">Find care</span></div>
                 <div className="flex flex-col items-center text-gray-400 gap-1"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg><span className="text-[8px] font-medium">Care Team</span></div>
                 <div className="flex flex-col items-center text-gray-400 gap-1"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[8px] font-medium">Claims</span></div>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 order-1 md:order-2 text-center md:text-left">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#e6f0f0] text-[#1B4D4B] font-bold mb-6">3</div>
             <h3 className="text-3xl md:text-4xl font-bold text-[#1A2C2C] mb-6 leading-tight">
               Seamlessly Connect With <span className="text-[#1B4D4B]">Specialists</span>
             </h3>
             <p className="text-lg text-[#94A3A8] leading-relaxed mb-8">
               Our system doesn't just stop at data. Discuss your findings directly with certified health professionals. Easily find and book a consultation via our mobile-first interface to receive tailored, actionable advice.
             </p>
             <button className="flex flex-row items-center gap-2 text-[#1B4D4B] font-semibold group mx-auto md:mx-0">
               Find a provider near you
               <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
               </svg>
             </button>
          </div>
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
