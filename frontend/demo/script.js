/* ═══════════════════════════════════════════════════════
   DOC TONG — Scroll-Driven Frame Animation & Interactions
   ═══════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Configuration ──
    const FRAME_COUNT = 192;
    const FRAME_PATH  = (i) => `img/ezgif-frame-${String(i).padStart(3, '0')}.png`;

    // ── DOM Refs ──
    const canvas      = document.getElementById('hero-canvas');
    const ctx         = canvas.getContext('2d');
    const heroSection = document.getElementById('hero');
    const progressBar = document.getElementById('hero-progress-bar');
    const scrollHint  = document.getElementById('scroll-hint');
    const header      = document.getElementById('site-header');

    // ── Frame Preloading ──
    const frames = [];
    let loadedCount = 0;
    let currentFrame = 0;
    let imagesReady = false;

    function preloadFrames() {
        for (let i = 1; i <= FRAME_COUNT; i++) {
            const img = new Image();
            img.src = FRAME_PATH(i);
            img.onload = () => {
                loadedCount++;
                if (loadedCount === FRAME_COUNT) {
                    imagesReady = true;
                    resizeCanvas();
                    drawFrame(0);
                }
            };
            frames.push(img);
        }
    }

    // ── Canvas Sizing ──
    function resizeCanvas() {
        canvas.width  = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        canvas.style.width  = '100%';
        canvas.style.height = '100%';
        if (imagesReady) drawFrame(currentFrame);
    }

    // ── Draw a Frame ──
    function drawFrame(index) {
        if (!imagesReady || !frames[index]) return;
        const img = frames[index];
        const cw = canvas.width;
        const ch = canvas.height;

        // cover-fit the image
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const canvasRatio = cw / ch;
        let drawW, drawH, drawX, drawY;

        if (canvasRatio > imgRatio) {
            drawW = cw;
            drawH = cw / imgRatio;
            drawX = 0;
            drawY = (ch - drawH) / 2;
        } else {
            drawH = ch;
            drawW = ch * imgRatio;
            drawY = 0;
            drawX = (cw - drawW) / 2;
        }

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    // ── Smooth Animation Logic (Lerp) ──
    let targetProgress = 0;
    let currentSmoothProgress = 0;
    const lerpFactor = 0.085; // Lower = smoother/slower catch-up

    function animate() {
        // Calculate the smooth progress
        const diff = targetProgress - currentSmoothProgress;
        
        // Only update if there's a meaningful difference to save CPU
        if (Math.abs(diff) > 0.0001) {
            currentSmoothProgress += diff * lerpFactor;
            const frameIndex = Math.min(FRAME_COUNT - 1, Math.floor(currentSmoothProgress * FRAME_COUNT));
            
            if (frameIndex !== currentFrame) {
                currentFrame = frameIndex;
                drawFrame(currentFrame);
            }

            // Sync progress bar
            if (progressBar) {
                progressBar.style.width = (currentSmoothProgress * 100) + '%';
            }

            // Hide scroll hint
            if (currentSmoothProgress > 0.02) {
                scrollHint.classList.add('hidden');
            } else {
                scrollHint.classList.remove('hidden');
            }
        }

        requestAnimationFrame(animate);
    }

    // ── Scroll Event Handler ──
    function onScroll() {
        const rect = heroSection.getBoundingClientRect();
        const scrollTop = -rect.top;
        const scrollHeight = heroSection.offsetHeight - window.innerHeight;

        // update target progress 0 → 1
        targetProgress = Math.max(0, Math.min(1, scrollTop / scrollHeight));

        // Header style (outside the lerp loop for immediate response)
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    // ── Intersection Observer for Reveal Animations ──
    function initRevealAnimations() {
        const reveals = document.querySelectorAll('.reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        reveals.forEach((el) => observer.observe(el));
    }

    // ── Smooth Scroll for Nav Links ──
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (e) => {
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ── Mobile Menu Toggle ──
    function initMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const nav = document.querySelector('.nav-links');
        const cta = document.querySelector('.nav-cta');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const isOpen = nav.style.display === 'flex';
            nav.style.display = isOpen ? 'none' : 'flex';
            nav.style.flexDirection = 'column';
            nav.style.position = 'absolute';
            nav.style.top = '64px';
            nav.style.left = '0';
            nav.style.right = '0';
            nav.style.background = 'rgba(13,17,23,.96)';
            nav.style.padding = '20px';
            nav.style.gap = '16px';
            nav.style.borderBottom = '1px solid rgba(48,54,61,.6)';
            if (cta) {
                cta.style.display = isOpen ? 'none' : 'inline-flex';
                cta.style.marginTop = '8px';
            }
        });
    }

    // ── Init ──
    function init() {
        preloadFrames();
        resizeCanvas();
        animate(); // Start the smooth animation loop
        initRevealAnimations();
        initSmoothScroll();
        initMobileMenu();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', resizeCanvas);

        // initial state
        onScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
