import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Compass,
  BookOpen,
  ArrowRight,
  ChevronDown,
  Star,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '../../shared/ui/Navbar';
import Footer from '../../shared/ui/Footer';
import PaymentModal, { prefetchAccountQuota } from '../../features/billing/components/PaymentModal';
import { qimenArticles } from '../../features/ky-mon/qimenArticles';
import ScrollyThienBan from './ScrollyThienBan';
import HomeMobile from './HomeMobile';
import { PACKAGES, NINE_STAR_BY_REMAINDER } from './homeData';
import { isMobileViewport } from '../../shared/utils/viewportScale';
import { isScrollLocked } from '../../shared/utils/scrollLock';
import './HomeScrollytelling.css';

export default function Home() {
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let rafId = null;
    const handleViewportChange = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        setIsMobile(isMobileViewport());
      });
    };

    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', handleViewportChange, { passive: true });
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  if (isMobile) {
    return <HomeMobile />;
  }

  return <HomeDesktop />;
}

function HomeDesktop() {
  const navigate = useNavigate();

  // Navigation & UI state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  // Trạng thái bước hiện tại (0..3) của Chương 2 cho cơ chế cuộn 5 nấc
  const [thienBanStep, setThienBanStep] = useState(0);
  const thienBanStepRef = useRef(0);
  useEffect(() => {
    thienBanStepRef.current = thienBanStep;
  }, [thienBanStep]);

  // Refs for GPU-accelerated scroll progress & hero parallax (zero re-render on scroll)
  const progressBarRef = useRef(null);
  const heroBatQuaiRef = useRef(null);
  const heroContentRef = useRef(null);
  const [accountQuota, setAccountQuota] = useState(null);

  const isLoggedIn = Boolean(
    accountQuota?.logged_in ||
    (typeof window !== 'undefined' && localStorage.getItem('tuvi_token'))
  );
  const aiCredits = Number(accountQuota?.ai_credits || 0);
  const showAiPurchasedBadge = isLoggedIn && aiCredits > 0;

  useEffect(() => {
    const syncQuota = () => {
      if (!localStorage.getItem('tuvi_token')) {
        setAccountQuota(null);
        return;
      }
      prefetchAccountQuota().then((q) => {
        setAccountQuota(q || null);
      });
    };

    const idleFn = typeof window !== 'undefined' && window.requestIdleCallback
      ? window.requestIdleCallback
      : (cb) => setTimeout(cb, 200);
    const id = idleFn(syncQuota);

    const handleQuotaUpdated = (e) => {
      if (e?.detail?.quota) {
        setAccountQuota(e.detail.quota);
      } else {
        syncQuota();
      }
    };

    const handleAuthLogout = () => {
      setAccountQuota(null);
    };

    window.addEventListener('tuvi:quota-updated', handleQuotaUpdated);
    window.addEventListener('tuvi-auth-updated', syncQuota);
    window.addEventListener('tuvi:auth-logout', handleAuthLogout);
    window.addEventListener('tuvi:auth-changed', syncQuota);
    window.addEventListener('storage', syncQuota);

    return () => {
      if (typeof window !== 'undefined' && window.cancelIdleCallback && typeof id === 'number') {
        try { window.cancelIdleCallback(id); } catch {}
      }
      window.removeEventListener('tuvi:quota-updated', handleQuotaUpdated);
      window.removeEventListener('tuvi-auth-updated', syncQuota);
      window.removeEventListener('tuvi:auth-logout', handleAuthLogout);
      window.removeEventListener('tuvi:auth-changed', syncQuota);
      window.removeEventListener('storage', syncQuota);
    };
  }, []);

  // Scroll Progress & Hero Parallax via rAF (no React state churn)
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = null;
    const updateOnScroll = () => {
      rafId = null;
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const docHeight = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const progress = Math.min(1, Math.max(0, scrollTop / docHeight));

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${progress})`;
      }

      if (!prefersReduced) {
        const heroProgress = Math.min(1, scrollTop / Math.max(400, window.innerHeight));
        if (heroBatQuaiRef.current) {
          heroBatQuaiRef.current.style.transform = `translate3d(0, ${heroProgress * 60}px, 0) rotate(${heroProgress * 28}deg) scale(${1 + heroProgress * 0.08})`;
        }
        if (heroContentRef.current) {
          heroContentRef.current.style.transform = `translate3d(0, ${heroProgress * 32}px, 0)`;
          heroContentRef.current.style.opacity = String(Math.max(0.15, 1 - heroProgress * 0.65));
        }
      }
    };

    const handleScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateOnScroll);
      }
    };

    updateOnScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Discrete Step-Scroll Engine (hỗ trợ cuộn nhanh / flick scroll không khóa cứng):
  // - Chương 2 (#chapter-thien-ban) được ghim trong 5 nấc cuộn (Bước 1 -> 2 -> 3 -> 4 -> sang Chương 3)
  // - Khi cuộn ngược từ cuối trang (#site-footer), luôn dừng tuần tự tại Chương Dịch vụ (#service)
  // - Khi cuộn ngược về Chương 1 (#chapter-hero), luôn cuộn về y = 0 để Header (Navbar) hiển thị đầy đủ 100%
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarsePointer =
      window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    if (prefersReduced || isCoarsePointer) return undefined;

    const SECTION_IDS = [
      'chapter-hero',
      'chapter-thien-ban',
      'chapter-ngu-hanh',
      'chapter-utilities',
      'service',
      'site-footer',
    ];

    let animRafId = null;
    let currentIdx = 0;
    let lastTriggerTime = 0;
    let lastWheelDelta = 0;
    let lastDir = 0;

    const getSections = () =>
      SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);

    const syncCurrentIndexFromScroll = () => {
      const sections = getSections();
      if (sections.length === 0) return 0;
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      if (scrollTop < 120) {
        currentIdx = 0;
        return 0;
      }
      // Ở cuối trang (#site-footer), luôn neo đúng index cuối để cuộn ngược dừng tại #service
      if (maxScroll > 0 && scrollTop >= maxScroll - 24) {
        currentIdx = sections.length - 1;
        return currentIdx;
      }
      const scrollMid = scrollTop + window.innerHeight * 0.38;
      let bestIdx = 0;
      for (let i = 0; i < sections.length; i++) {
        const top = sections[i].getBoundingClientRect().top + scrollTop;
        if (top <= scrollMid) bestIdx = i;
      }
      currentIdx = bestIdx;
      return bestIdx;
    };

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const scrollToSectionIndex = (
      nextIdx,
      initialThienBanStep = null,
      isFastRetarget = false
    ) => {
      const sections = getSections();
      if (sections.length === 0) return;
      const clampedIdx = Math.max(0, Math.min(sections.length - 1, nextIdx));

      if (typeof initialThienBanStep === 'number') {
        thienBanStepRef.current = initialThienBanStep;
        setThienBanStep(initialThienBanStep);
      }

      const targetEl = sections[clampedIdx];
      const startY = window.scrollY || window.pageYOffset || 0;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      // Chương 1 luôn cuộn về y = 0 để hiển thị trọn vẹn thanh Header (Navbar)
      const rawTop =
        clampedIdx === 0
          ? 0
          : targetEl.getBoundingClientRect().top + startY;
      const targetY = Math.max(0, Math.min(maxScroll, rawTop));

      currentIdx = clampedIdx;
      if (animRafId) window.cancelAnimationFrame(animRafId);

      // Rút ngắn thời gian khi người dùng cuộn nhanh liên tiếp để phản hồi tức thì
      const duration = isFastRetarget ? 440 : 640;
      const easingFn = isFastRetarget ? easeOutCubic : easeInOutCubic;
      const startTime = performance.now();

      const animate = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = easingFn(t);
        window.scrollTo(0, startY + (targetY - startY) * eased);

        if (t < 1) {
          animRafId = window.requestAnimationFrame(animate);
        } else {
          animRafId = null;
        }
      };

      animRafId = window.requestAnimationFrame(animate);
    };

    const handleStepTransition = (dir, isFastRetarget = false) => {
      // Chỉ đồng bộ lại index từ vị trí cuộn khi không có animation chuyển chương đang chạy
      if (animRafId === null) {
        syncCurrentIndexFromScroll();
      }

      // Cơ chế cuộn 5 nấc riêng cho Chương 2 (index === 1)
      if (currentIdx === 1) {
        const step = thienBanStepRef.current;
        if (dir > 0 && step < 3) {
          const nextStep = step + 1;
          thienBanStepRef.current = nextStep;
          setThienBanStep(nextStep);
          return;
        }
        if (dir < 0 && step > 0) {
          const prevStep = step - 1;
          thienBanStepRef.current = prevStep;
          setThienBanStep(prevStep);
          return;
        }
      }

      const sections = getSections();
      const nextIdx = Math.max(
        0,
        Math.min(sections.length - 1, currentIdx + dir)
      );
      if (nextIdx !== currentIdx) {
        // Vào Chương 2 từ trên xuống -> Bước 1 (0); từ dưới lên -> Bước 4 (3)
        const entryStep = nextIdx === 1 ? (dir > 0 ? 0 : 3) : null;
        scrollToSectionIndex(nextIdx, entryStep, isFastRetarget);
      }
    };

    const onWheel = (e) => {
      if (isScrollLocked()) return;
      if (window.innerWidth <= 580) return;
      if (e.ctrlKey || e.metaKey) return;
      const scrollableAncestor = e.target?.closest?.(
        '[data-native-scroll], .overflow-y-auto, .overflow-auto, select'
      );
      if (scrollableAncestor) return;

      e.preventDefault();
      const absDelta = Math.abs(e.deltaY);
      if (absDelta < 8) return;

      const dir = e.deltaY > 0 ? 1 : -1;
      const now = performance.now();
      const elapsed = now - lastTriggerTime;
      const isDirectionChange = lastDir !== 0 && dir !== lastDir;

      if (!isDirectionChange) {
        // Chống lặp trong cùng 1 nấc lăn chuột
        if (elapsed < 140) {
          lastWheelDelta = absDelta;
          return;
        }
        // Bỏ qua đuôi quán tính suy giảm của trackpad (nhỏ dần và < 42px)
        if (
          elapsed < 380 &&
          absDelta < 42 &&
          absDelta <= lastWheelDelta * 1.15
        ) {
          lastWheelDelta = absDelta;
          return;
        }
      }

      const isFastRetarget = animRafId !== null;
      lastTriggerTime = now;
      lastWheelDelta = absDelta;
      lastDir = dir;
      handleStepTransition(dir, isFastRetarget);
    };

    const onKeyDown = (e) => {
      if (isScrollLocked()) return;
      if (window.innerWidth <= 580) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        handleStepTransition(1, animRafId !== null);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        handleStepTransition(-1, animRafId !== null);
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToSectionIndex(0, 0, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToSectionIndex(getSections().length - 1, null, true);
      }
    };

    syncCurrentIndexFromScroll();
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      if (animRafId) window.cancelAnimationFrame(animRafId);
    };
  }, []);

  // Bidirectional IntersectionObserver cho 100% khối nội dung (.scrolly-reveal)
  useEffect(() => {
    const revealEls = Array.from(document.querySelectorAll('.scrolly-reveal'));
    if (revealEls.length === 0) return undefined;

    const vh = window.innerHeight || 800;
    revealEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.94) {
        el.classList.add('is-visible');
      }
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.add('is-visible');
            el.classList.remove('is-exit-top');
          } else {
            const rect = entry.boundingClientRect;
            if (rect.top > (window.innerHeight || 800) * 0.85) {
              // Thoát xuống dưới khi cuộn ngược lên: reset nhẹ để tái kích hoạt khi cuộn xuống lại
              el.classList.remove('is-visible', 'is-exit-top');
            } else if (rect.bottom < 0) {
              // Đã cuộn qua lên trên: giữ trạng thái ổn định không nhấp nháy
              el.classList.add('is-visible', 'is-exit-top');
            }
          }
        });
      },
      { threshold: [0, 0.08], rootMargin: '20px 0px -28px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));

    return () => {
      revealObserver.disconnect();
    };
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const [birthGender, setBirthGender] = useState('nam');
  const [birthYear, setBirthYear] = useState('');
  const [viewingYear, setViewingYear] = useState(String(new Date().getFullYear() + 1));
  const parsedBirthYear = Number(birthYear);
  const validBirthYear = Number.isInteger(parsedBirthYear) && parsedBirthYear >= 1900 && parsedBirthYear <= new Date().getFullYear();
  const birthAge = validBirthYear ? Number(viewingYear) - parsedBirthYear + 1 : 0;
  const selectedStar = birthAge > 0
    ? qimenArticles.find((article) => article.slug === NINE_STAR_BY_REMAINDER[birthGender][birthAge % 9])
    : null;

  return (
    <div className="scrolly-page min-h-screen bg-[#fcfaf7] text-[#1c1917] flex flex-col font-sans selection:bg-[#8b1d1d] selection:text-white relative">
      {/* Top Reading Progress Bar (Solid Vermilion) */}
      <div className="scrolly-progress-track" aria-hidden="true">
        <div
          ref={progressBarRef}
          className="scrolly-progress-bar"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <Navbar />

      {/* ========================================================================= */}
      {/* MAIN SCROLLYTELLING NARRATIVE                                             */}
      {/* ========================================================================= */}
      <main className="flex-1 bg-[#fdfbf8]">
        {/* ===================================================================== */}
        {/* HERO OPENING (PARALLAX BÁT QUÁI - SOLID COLORS ONLY)                  */}
        {/* ===================================================================== */}
        <section
          id="chapter-hero"
          className="relative min-h-[calc(100vh-76px)] flex flex-col items-center justify-center overflow-hidden pt-10 pb-20 sm:pt-14 sm:pb-24"
        >
          {/* Parallax Celestial Bát Quái & Orbital Rings */}
          <div
            ref={heroBatQuaiRef}
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none will-change-transform"
            aria-hidden="true"
          >
            <div className="relative w-[340px] h-[340px] sm:w-[540px] sm:h-[540px] lg:w-[640px] lg:h-[640px] flex items-center justify-center">
              <svg
                viewBox="0 0 400 400"
                className="absolute inset-0 w-full h-full scrolly-orbit-cw opacity-30"
              >
                <circle
                  cx="200"
                  cy="200"
                  r="192"
                  fill="none"
                  stroke="#9a6b26"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="164"
                  fill="none"
                  stroke="#8b1d1d"
                  strokeWidth="0.75"
                  strokeDasharray="2 10"
                />
              </svg>
              <img
                src="/BatQuai.png"
                alt=""
                className="w-[72%] h-[72%] object-contain opacity-[0.06] scrolly-orbit-ccw"
              />
            </div>
          </div>

          {/* Foreground Narrative */}
          <div
            ref={heroContentRef}
            className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center will-change-transform"
          >
            <h1 className="scrolly-reveal text-[26px] sm:text-3xl md:text-[34px] lg:text-[42px] xl:text-[46px] font-display font-extrabold text-[#1c1917] tracking-tight leading-snug md:whitespace-nowrap">
              Giải mã{' '}
              <span className="text-[#8b1d1d]">mật thư</span>
              <br className="md:hidden" /> của riêng bạn.
            </h1>

            <p className="scrolly-reveal scrolly-reveal-delay-1 mt-5 sm:mt-6 text-sm sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
              Từ khoảnh khắc cất tiếng khóc chào đời, vị trí của 14 Chính Tinh và hơn 110 Phụ Tinh đã khắc họa nên bản đồ khí vận riêng biệt — nơi bạn thấu hiểu bản thân và chủ động đón lành tránh dữ.
            </p>

            {/* Primary Story & Action CTAs (Solid Colors) */}
            <div className="scrolly-reveal scrolly-reveal-delay-2 mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate('/la-so-tu-vi')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-[#8b1d1d] hover:bg-[#701616] text-white font-bold text-sm sm:text-base shadow-md transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Lập Lá Số Tử Vi Miễn Phí</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('chapter-thien-ban')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border border-[#1c1917]/25 text-[#1c1917] font-bold text-sm sm:text-base hover:border-[#8b1d1d] hover:text-[#8b1d1d] transition-colors shadow-2xs cursor-pointer"
              >
                <span>Khám phá câu chuyện Thiên Bàn</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Classical Trust Strip */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-[#57534e]">
              <span>Chuẩn Tử Vi Đẩu Số Tân Biên 1956</span>
              <span className="hidden sm:inline text-stone-300">•</span>
              <span>14 Chính Tinh &amp; 110+ Phụ Tinh</span>
              <span className="hidden sm:inline text-stone-300">•</span>
              <span>Xuất PDF &amp; Ảnh 4K Sắc Nét</span>
            </div>
          </div>

          {/* Scroll Cue */}
          <button
            type="button"
            onClick={() => scrollToSection('chapter-thien-ban')}
            className="mt-10 sm:mt-14 relative z-10 inline-flex flex-col items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-stone-400 hover:text-[#8b1d1d] transition-colors cursor-pointer"
          >
            <span>Cuộn xuống để khai mở</span>
            <ChevronDown className="w-4 h-4 scrolly-cue-bounce" />
          </button>
        </section>

        {/* ===================================================================== */}
        {/* STICKY THIÊN BÀN & BIỂU ĐỒ NGŨ HÀNH                                   */}
        {/* ===================================================================== */}
        <ScrollyThienBan activeBeat={thienBanStep} onSelectBeat={setThienBanStep} />

        {/* ===================================================================== */}
        {/* HỆ SINH THÁI TIỆN ÍCH MIỄN PHÍ & TRA CỨU SAO HẠN                      */}
        {/* ===================================================================== */}
        <section
          id="chapter-utilities"
          className="relative overflow-hidden py-12 sm:py-16 lg:py-4 lg:h-screen lg:min-h-[640px] lg:flex lg:flex-col lg:justify-center bg-[#fdfbf8]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <div className="max-w-6xl mx-auto text-center mb-8 sm:mb-10 lg:mb-4 scrolly-reveal">
              <h2 className="text-2xl sm:text-3xl lg:text-[32px] xl:text-[36px] font-display font-extrabold text-[#1c1917] tracking-tight leading-snug md:whitespace-nowrap">
                Hệ Sinh Thái Tiện Ích
                <br className="md:hidden" /> Huyền Học Miễn Phí
              </h2>
              <p className="mt-1.5 max-w-none mx-auto whitespace-nowrap text-[clamp(7px,1.75vw,15px)] sm:text-[clamp(10px,1.3vw,15px)] lg:text-[clamp(11.5px,1.08vw,15px)] text-stone-600 leading-relaxed">
                Từ lập lá số trọn đời, xem ngày lành tháng tốt, đo la kinh phong thủy đến chiêm nghiệm Truyện Kiều và tra cứu Cửu Diệu sao hạn.
              </p>
            </div>

            {/* Cụm Tiện Ích Chính: 1 Ô lớn bên trái (Lập lá số) + 4 Ô nhỏ xếp dọc bên phải */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_1fr] gap-5 lg:gap-5 items-stretch">
              {/* CỘT TRÁI: Ô LỚN ƯU TIÊN - LẬP LÁ SỐ TỬ VI */}
              <div className="flex flex-col scrolly-reveal">
                <div
                  id="card-tuvi-intro"
                  onClick={() => navigate('/la-so-tu-vi')}
                  className="group relative flex-1 rounded-3xl bg-white p-6 sm:p-8 lg:p-6 xl:p-7 border-2 border-[#8b1d1d] hover:border-[#701616] shadow-[0_10px_32px_rgba(139,29,29,0.08)] hover:shadow-[0_18px_44px_rgba(139,29,29,0.14)] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  {/* Header & Content Area */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-3 mb-5 lg:mb-3.5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-12 lg:h-12 rounded-2xl bg-[#8b1d1d] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0">
                          <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 lg:w-6 lg:h-6" />
                        </div>
                        <h3 className="text-xl sm:text-2xl lg:text-[26px] font-display font-extrabold text-[#1c1917] group-hover:text-[#8b1d1d] transition-colors tracking-tight leading-tight">
                          LẬP LÁ SỐ TỬ VI
                        </h3>
                      </div>
                      <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                        MIỄN PHÍ
                      </span>
                    </div>

                    <p className="text-stone-600 text-sm sm:text-base lg:text-sm leading-relaxed mb-5 lg:mb-3.5">
                      An sao chính xác theo chuẩn Tử Vi Đẩu Số Tân Biên 1956
                    </p>

                    {/* 2x2 Feature grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-2.5 mb-5 lg:mb-3.5">
                      <div className="p-3.5 lg:p-3 rounded-2xl bg-[#fcfaf7] border border-stone-200/80 group-hover:border-[#8b1d1d]/30 transition-colors">
                        <div className="text-xs font-bold text-[#8b1d1d] uppercase tracking-wide">Cung Mệnh &amp; Thân</div>
                        <div className="text-xs text-stone-600 mt-1">Cốt cách, bản tính &amp; nền tảng vận mệnh</div>
                      </div>
                      <div className="p-3.5 lg:p-3 rounded-2xl bg-[#fcfaf7] border border-stone-200/80 group-hover:border-[#8b1d1d]/30 transition-colors">
                        <div className="text-xs font-bold text-[#9a6b26] uppercase tracking-wide">Quan Lộc</div>
                        <div className="text-xs text-stone-600 mt-1">Công danh, sự nghiệp &amp; đường tiến thân</div>
                      </div>
                      <div className="p-3.5 lg:p-3 rounded-2xl bg-[#fcfaf7] border border-stone-200/80 group-hover:border-[#8b1d1d]/30 transition-colors">
                        <div className="text-xs font-bold text-[#9a6b26] uppercase tracking-wide">Tài Bạch</div>
                        <div className="text-xs text-stone-600 mt-1">Tài vận, sinh kế &amp; khả năng tích lũy</div>
                      </div>
                      <div className="p-3.5 lg:p-3 rounded-2xl bg-[#fcfaf7] border border-stone-200/80 group-hover:border-[#8b1d1d]/30 transition-colors">
                        <div className="text-xs font-bold text-[#8b1d1d] uppercase tracking-wide">Đại / Tiểu Vận</div>
                        <div className="text-xs text-stone-600 mt-1">Diễn biến 10 năm đại vận &amp; từng năm</div>
                      </div>
                    </div>

                    {/* Key Capabilities */}
                    <ul className="space-y-2 lg:space-y-1.5 text-xs sm:text-sm text-stone-600 mb-4 lg:mb-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#8b1d1d] shrink-0" />
                        <span>An đầy đủ 14 Chính tinh &amp; hơn 110 Phụ tinh chuẩn xác</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#8b1d1d] shrink-0" />
                        <span>Tự động lập Tam Hợp, Xung Chiếu, Tứ Hóa &amp; Tuần Triệt</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#8b1d1d] shrink-0" />
                        <span>Lưu trữ lịch sử lá số &amp; xuất bản ảnh 4K, PDF sắc nét</span>
                      </li>
                    </ul>
                  </div>

                  {/* Bottom Action Area */}
                  <div className="relative z-10 pt-5 lg:pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#57534e]">
                      <span className="w-2 h-2 rounded-full bg-[#1e5631] inline-block animate-pulse shrink-0" />
                      <span>Tính toán tức thì • Đầy đủ 110+ chính tinh &amp; phụ tinh</span>
                    </div>
                    <div className="inline-flex items-center gap-2.5 px-6 py-3.5 lg:px-5 lg:py-2.5 rounded-2xl bg-[#8b1d1d] group-hover:bg-[#701616] text-white font-bold text-sm sm:text-base shadow-sm transition-colors shrink-0">
                      <span>Lập lá số ngay</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: 4 Ô NHỎ XẾP DỌC */}
              <div className="flex flex-col gap-3.5 sm:gap-4 lg:gap-2.5 justify-between">
                {/* Ô 1: LỊCH VẠN SỰ */}
                <div
                  id="card-lichvansu-intro"
                  onClick={() => navigate('/lich-van-su')}
                  className="scrolly-reveal scrolly-reveal-delay-1 group relative rounded-2xl bg-white p-4 sm:p-5 lg:px-4 lg:py-3 border border-stone-200 hover:border-[#1c1917] shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="flex items-start gap-3.5 w-full">
                    <div className="w-11 h-11 rounded-xl bg-[#fcfaf7] border border-stone-200 text-[#1c1917] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-bold text-base text-[#1c1917] group-hover:text-[#8b1d1d] transition-colors truncate">
                          LỊCH VẠN SỰ
                        </h3>
                        <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                          MIỄN PHÍ
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-[#57534e] truncate">
                          Tra cứu lịch âm dương, ngày tốt xấu, giờ hoàng đạo &amp; tiết khí
                        </p>
                        <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#8b1d1d] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ô 2: BÁT QUÁI, PHONG THỦY */}
                <div
                  id="card-batquai-intro"
                  onClick={() => navigate('/la-kinh-phong-thuy')}
                  className="scrolly-reveal scrolly-reveal-delay-2 group relative rounded-2xl bg-white p-4 sm:p-5 lg:px-4 lg:py-3 border border-stone-200 hover:border-[#1e5631] shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="flex items-start gap-3.5 w-full">
                    <div className="w-11 h-11 rounded-xl bg-[#f0f7f2] border border-[#1e5631]/25 text-[#1e5631] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-bold text-base text-[#1c1917] group-hover:text-[#1e5631] transition-colors truncate">
                          BÁT QUÁI, PHONG THỦY
                        </h3>
                        <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                          MIỄN PHÍ
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-[#57534e] truncate">
                          Tra cứu Cung Phi, Bát Trạch, hướng nhà &amp; xung hợp nhân duyên
                        </p>
                        <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#1e5631] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ô 3: TAROT KIỀU */}
                <div
                  id="card-tarot-intro"
                  onClick={() => navigate('/boi-kieu')}
                  className="scrolly-reveal scrolly-reveal-delay-3 group relative rounded-2xl bg-white p-4 sm:p-5 lg:px-4 lg:py-3 border border-stone-200 hover:border-[#8b1d1d] shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="flex items-start gap-3.5 w-full">
                    <div className="w-11 h-11 rounded-xl bg-[#fff5f5] border border-[#8b1d1d]/25 text-[#8b1d1d] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-bold text-base text-[#1c1917] group-hover:text-[#8b1d1d] transition-colors truncate">
                          TAROT KIỀU
                        </h3>
                        <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                          MIỄN PHÍ
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-[#57534e] truncate">
                          Xin quẻ 3.254 câu thơ Truyện Kiều, lắng nghe thi ca khai mở tâm trí
                        </p>
                        <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#8b1d1d] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ô 4: TRA CỨU SAO HẠN */}
                <div
                  id="card-saohan-intro"
                  className="scrolly-reveal scrolly-reveal-delay-4 relative rounded-2xl bg-white p-4 sm:p-5 lg:px-4 lg:py-3 border border-[#9a6b26]/45 shadow-xs hover:border-[#9a6b26] transition-all duration-300 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 lg:mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#fcf8f0] border border-[#9a6b26]/30 text-[#9a6b26] flex items-center justify-center shrink-0">
                        <Star className="w-4 h-4 fill-[#9a6b26] text-[#9a6b26]" />
                      </div>
                      <h3 className="font-display font-bold text-base text-[#8b1d1d] truncate uppercase">
                        TRA CỨU SAO HẠN
                      </h3>
                    </div>
                    <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                      MIỄN PHÍ
                    </span>
                  </div>
                  <p className="text-xs text-[#57534e] mb-3 lg:mb-2">
                    Xem sao chiếu mệnh, cát hung năm nay và phương thức hóa giải
                  </p>

                  {/* Form controls */}
                  <div className="space-y-2.5 lg:space-y-1.5">
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Chọn giới tính">
                      {[['nam', 'Nam'], ['nu', 'Nữ']].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setBirthGender(value)}
                          aria-pressed={birthGender === value}
                          className={`rounded-xl border py-1.5 px-3 text-xs font-bold transition-colors cursor-pointer ${
                            birthGender === value
                              ? 'border-[#9a6b26] bg-[#9a6b26] text-white shadow-2xs'
                              : 'border-stone-200 bg-[#fcfaf7] text-[#1c1917] hover:border-[#9a6b26]/50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="qimen-birth-year" className="mb-1 block text-[11px] font-semibold text-[#57534e]">
                          Năm sinh
                        </label>
                        <input
                          id="qimen-birth-year"
                          type="number"
                          inputMode="numeric"
                          min="1900"
                          max={new Date().getFullYear()}
                          step="1"
                          value={birthYear}
                          onChange={(event) => setBirthYear(event.target.value)}
                          placeholder="Ví dụ: 1995"
                          className="w-full rounded-xl border border-stone-200 bg-[#fcfaf7] px-2.5 py-1.5 text-xs text-[#1c1917] outline-none focus:border-[#9a6b26] focus:bg-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="qimen-viewing-year" className="mb-1 block text-[11px] font-semibold text-[#57534e]">
                          Năm xem
                        </label>
                        <select
                          id="qimen-viewing-year"
                          value={viewingYear}
                          onChange={(event) => setViewingYear(event.target.value)}
                          className="w-full rounded-xl border border-stone-200 bg-[#fcfaf7] px-2.5 py-1.5 text-xs text-[#1c1917] outline-none focus:border-[#9a6b26] focus:bg-white"
                        >
                          {Array.from({ length: 31 }, (_, index) => new Date().getFullYear() + 1 + index).map((year) => (
                            <option key={year} value={year}>
                              Năm {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Kết quả sao chiếu mệnh kèm minh họa Cửu Diệu */}
                  {selectedStar && (
                    <div
                      key={selectedStar.slug}
                      className="scrolly-star-reveal relative mt-3 pt-3 lg:mt-2 lg:pt-2 border-t border-stone-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={`/qimen/${selectedStar.slug}.webp`}
                          alt={selectedStar.name}
                          className="w-11 h-11 rounded-xl object-cover border border-[#9a6b26]/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] text-[#57534e]">Sao chiếu năm {viewingYear}:</p>
                          <p className="font-display text-sm sm:text-base font-bold text-[#8b1d1d] leading-tight truncate">
                            {selectedStar.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[#9a6b26] truncate">
                            {selectedStar.type.split(' · ')[0]}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/ky-mon-don-giap/${selectedStar.slug}`)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#8b1d1d] hover:bg-[#701616] px-3 py-2 text-xs font-bold text-white transition-colors shadow-xs cursor-pointer shrink-0"
                      >
                        <span>Xem giải đoán</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* DỊCH VỤ LUẬN GIẢI CHUYÊN SÂU (#service - SOLID COLORS ONLY)           */}
        {/* ===================================================================== */}
        <section
          id="service"
          className="py-12 sm:py-16 lg:py-4 lg:h-screen lg:min-h-[640px] lg:flex lg:flex-col lg:justify-center lg:overflow-hidden text-[#1c1917] scroll-mt-20 bg-[#fcfaf7]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            {/* Section Title: Desktop 1 dòng, Mobile 2 dòng cân xứng */}
            <div className="text-center max-w-6xl mx-auto mb-8 sm:mb-10 lg:mb-5 scrolly-reveal">
              <h2 className="text-2xl sm:text-3xl lg:text-[32px] xl:text-[36px] font-display font-extrabold text-[#1c1917] tracking-tight leading-snug md:whitespace-nowrap">
                Dịch Vụ Luận Giải
                <br className="md:hidden" /> Tử Vi Chuyên Sâu
              </h2>
              <p className="mt-1.5 max-w-none mx-auto whitespace-nowrap text-[clamp(7.5px,1.8vw,15px)] sm:text-[clamp(10.5px,1.35vw,15px)] lg:text-[clamp(12px,1.1vw,15px)] text-stone-600 leading-relaxed">
                Khi bạn sẵn sàng bước vào chiều sâu của bản mệnh, hãy chọn hình thức luận giải phù hợp nhất cho hành trình sắp tới.
              </p>
            </div>

            {/* 2 Service Package Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-7 items-stretch max-w-5xl mx-auto">
              {/* Card 1: Luận Giải AI */}
              <div className="scrolly-reveal bg-white p-6 sm:p-8 lg:px-7 lg:py-5 rounded-3xl border-2 border-[#8b1d1d] shadow-[0_10px_30px_rgba(139,29,29,0.08)] hover:shadow-[0_16px_40px_rgba(139,29,29,0.14)] transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
                {/* Corner Badge (Solid Color) */}
                <div className="absolute top-0 right-0 bg-[#8b1d1d] text-white text-[11px] font-extrabold px-5 py-1.5 rounded-bl-2xl shadow-xs uppercase tracking-wider">
                  Được Lựa Chọn Nhiều Nhất
                </div>

                <div>
                  <div className="pt-5 sm:pt-4 lg:pt-3 mb-4 lg:mb-2">
                    <h3 className="text-2xl sm:text-[26px] lg:text-[26px] font-display font-extrabold text-[#1c1917] uppercase leading-tight md:min-h-[34px] flex items-center">
                      LUẬN GIẢI AI
                    </h3>
                    <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed mt-3 lg:mt-1.5 md:min-h-[40px]">
                      Phân tích chuyên sâu bằng mô hình AI mạnh nhất của Google Deep Mind
                    </p>
                  </div>

                  <div className={showAiPurchasedBadge ? 'py-2' : 'py-4 lg:py-2 space-y-2 md:min-h-[114px] lg:min-h-[82px] flex flex-col justify-center'}>
                    {showAiPurchasedBadge ? (
                      <div>
                        <span className="inline-flex items-center px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm sm:text-base font-bold leading-snug">
                          Đã mua - Bạn có {aiCredits} lượt sử dụng
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl lg:text-[42px] font-extrabold text-[#8b1d1d] font-display leading-none">
                            199.000đ
                          </span>
                          <span className="text-2xl sm:text-[32px] lg:text-[26px] font-bold text-[#1c1917] font-display leading-none">
                            / Lá số
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-stone-400 line-through text-sm">499.000đ</span>
                          <span className="text-[11px] text-[#1e5631] font-bold bg-[#f0f7f2] px-2.5 py-0.5 rounded-full border border-[#1e5631]/25">
                            Tiết kiệm 60%
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Benefits List */}
                  <ul className="space-y-3.5 lg:space-y-2 py-5 lg:py-2.5 text-xs sm:text-sm">
                    <li className="flex items-start gap-2.5 md:min-h-[44px] lg:min-h-[36px]">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Bài luận giải 7.000 – 8.000 từ</strong>
                        <span className="block text-[#57534e] mt-0.5">Phân tích toàn diện 12 cung bản mệnh.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 md:min-h-[44px] lg:min-h-[36px]">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Dự đoán chi tiết</strong>
                        <span className="block text-[#57534e] mt-0.5">10 năm Đại vận &amp; diễn biến 3 năm Tiểu vận gần nhất.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 md:min-h-[44px] lg:min-h-[36px]">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Hỏi đáp không giới hạn</strong>
                        <span className="block text-[#57534e] mt-0.5">Tương tác trực tiếp cùng trợ lý AI thông minh.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 md:min-h-[44px] lg:min-h-[36px]">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Nhận kết quả ngay tức thì</strong>
                        <span className="block text-[#57534e] mt-0.5">Hồ sơ được lưu trữ trọn đời trên website.</span>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Action Button (Solid Color) */}
                <div className="pt-4 lg:pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (showAiPurchasedBadge) {
                        navigate('/la-so-tu-vi');
                      } else {
                        setSelectedPackage(PACKAGES.ai199);
                        setShowPaymentModal(true);
                      }
                    }}
                    className="w-full py-3.5 lg:py-3 rounded-2xl bg-[#8b1d1d] hover:bg-[#701616] text-white font-bold text-sm sm:text-base transition-colors shadow-md flex items-center justify-center cursor-pointer uppercase tracking-wide"
                  >
                    {showAiPurchasedBadge ? 'LẬP LÁ SỐ & LUẬN GIẢI NGAY' : 'ĐĂNG KÝ LUẬN GIẢI AI'}
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-[#57534e] px-1">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#1e5631]" />
                      Bảo mật thông tin đương số
                    </span>
                    <span>Nhận kết quả tức thì</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Luận Giải Trực Tiếp 1-1 */}
              <div className="scrolly-reveal scrolly-reveal-delay-2 bg-white p-6 sm:p-8 lg:px-7 lg:py-5 rounded-3xl border-2 border-[#1c1917] shadow-[0_10px_30px_rgba(28,25,23,0.08)] hover:shadow-[0_16px_40px_rgba(28,25,23,0.14)] transition-all duration-300 relative flex flex-col justify-between overflow-hidden">
                {/* Corner Badge (Solid Color) */}
                <div className="absolute top-0 right-0 bg-[#1c1917] text-[#e5c488] text-[11px] font-extrabold px-5 py-1.5 rounded-bl-2xl shadow-xs uppercase tracking-wider">
                  Chuyên Gia Đàm Thoại
                </div>

                <div>
                  <div className="pt-5 sm:pt-4 lg:pt-3 mb-4 lg:mb-2">
                    <h3 className="text-2xl sm:text-[26px] lg:text-[26px] font-display font-extrabold text-[#1c1917] uppercase leading-tight md:min-h-[34px] flex items-center">
                      LUẬN GIẢI TRỰC TIẾP 1-1
                    </h3>
                    <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed mt-3 lg:mt-1.5 md:min-h-[40px]">
                      Đàm thoại trực tiếp cùng Thầy Tử Vi Hồng Ân
                    </p>
                  </div>

                  <div className="py-4 lg:py-2 space-y-2 md:min-h-[114px] lg:min-h-[82px] flex flex-col justify-center">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl lg:text-[42px] font-extrabold text-[#1c1917] font-display leading-none">
                        500.000đ
                      </span>
                      <span className="text-2xl sm:text-[32px] lg:text-[26px] font-bold text-[#1c1917] font-display leading-none">
                        / Lá số
                      </span>
                    </div>
                  </div>

                  {/* Benefits List */}
                  <ul className="space-y-3.5 lg:space-y-2 py-5 lg:py-2.5 text-xs sm:text-sm">
                    <li className="flex items-start gap-2.5 md:min-h-[44px] lg:min-h-[36px]">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Đàm thoại trực tiếp 1-1</strong>
                        <span className="block text-[#57534e] mt-0.5">Trao đổi qua Zalo cùng Thầy Tử Vi Hồng Ân.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 md:min-h-[44px] lg:min-h-[36px]">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Tháo gỡ chuyên sâu các vướng mắc</strong>
                        <span className="block text-[#57534e] mt-0.5">Về sự nghiệp, tài lộc, tình duyên &amp; gia đạo.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 md:min-h-[44px] lg:min-h-[36px]">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Định hướng chiến lược cuộc đời</strong>
                        <span className="block text-[#57534e] mt-0.5">Lựa chọn thời điểm lành để khởi sự.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 md:min-h-[44px] lg:min-h-[36px]">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Tư vấn cải vận thực chứng</strong>
                        <span className="block text-[#57534e] mt-0.5">Giải đáp cặn kẽ mọi băn khoăn của quý khách.</span>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Action Button (Solid Color) */}
                <div className="pt-4 lg:pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const officialPhones = ['0924.616.199', '0385.497.085'];
                      const randomPhone = officialPhones[Math.floor(Math.random() * officialPhones.length)];
                      setSelectedPackage({ ...PACKAGES.direct500, zaloPhone: randomPhone });
                      setShowPaymentModal(true);
                    }}
                    className="w-full py-3.5 lg:py-3 rounded-2xl bg-[#1c1917] hover:bg-stone-800 text-white font-bold text-sm sm:text-base transition-colors shadow-md flex items-center justify-center cursor-pointer uppercase tracking-wide"
                  >
                    ĐẶT LỊCH LUẬN GIẢI
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-[#57534e] px-1">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#1e5631]" />
                      Hẹn giờ linh hoạt theo quý khách
                    </span>
                    <span>Tư vấn tận tâm 1-1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment / Booking Modal */}
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onOpenAuth={() => {
              setShowPaymentModal(false);
              window.dispatchEvent(new CustomEvent('tuvi:open-auth'));
            }}
            packageInfo={selectedPackage || PACKAGES.ai199}
            onSuccess={(_orderData) => {}}
          />
        </section>
      </main>

      <div id="site-footer">
        <Footer />
      </div>
    </div>
  );
}
