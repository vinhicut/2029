import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Compass,
  BookOpen,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '../../shared/ui/Navbar';
import Footer from '../../shared/ui/Footer';
import PaymentModal, { prefetchAccountQuota } from '../../features/billing/components/PaymentModal';
import { qimenArticles } from '../../features/ky-mon/qimenArticles';
import {
  PALACES,
  STORY_BEATS,
  NGU_HANH_ELEMENTS,
  PACKAGES,
  NINE_STAR_BY_REMAINDER,
} from './homeData';
import './HomeScrollytelling.css';
import './HomeMobile.css';

export default function HomeMobile() {
  const navigate = useNavigate();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [thienBanStep, setThienBanStep] = useState(0);
  const [activeElement, setActiveElement] = useState('hoa');
  const [nguHanhVisible, setNguHanhVisible] = useState(false);
  const [accountQuota, setAccountQuota] = useState(null);

  const [birthGender, setBirthGender] = useState('nam');
  const [birthYear, setBirthYear] = useState('');
  const [viewingYear, setViewingYear] = useState(String(new Date().getFullYear() + 1));

  const progressBarRef = useRef(null);
  const nguHanhRef = useRef(null);
  const touchStartXRef = useRef(null);

  const isLoggedIn = Boolean(
    accountQuota?.logged_in ||
    (typeof window !== 'undefined' && localStorage.getItem('tuvi_token'))
  );
  const aiCredits = Number(accountQuota?.ai_credits || 0);
  const showAiPurchasedBadge = isLoggedIn && aiCredits > 0;

  // Đồng bộ hạn mức tài khoản & sự kiện thanh toán/đăng nhập
  useEffect(() => {
    const syncQuota = () => {
      prefetchAccountQuota().then((q) => {
        if (q) setAccountQuota(q);
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

    window.addEventListener('tuvi:quota-updated', handleQuotaUpdated);
    window.addEventListener('tuvi:auth-changed', syncQuota);
    window.addEventListener('storage', syncQuota);

    return () => {
      if (typeof window !== 'undefined' && window.cancelIdleCallback && typeof id === 'number') {
        try { window.cancelIdleCallback(id); } catch {}
      }
      window.removeEventListener('tuvi:quota-updated', handleQuotaUpdated);
      window.removeEventListener('tuvi:auth-changed', syncQuota);
      window.removeEventListener('storage', syncQuota);
    };
  }, []);

  // Thanh tiến trình đọc (GPU scaleX qua rAF)
  useEffect(() => {
    let rafId = null;
    const updateProgress = () => {
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
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Scroll Reveal cho các khối nội dung Mobile
  useEffect(() => {
    const revealEls = Array.from(document.querySelectorAll('.hm-reveal'));
    if (revealEls.length === 0) return undefined;

    const vh = window.innerHeight || 760;
    revealEls.forEach((el) => {
      if (el.getBoundingClientRect().top < vh * 0.95) {
        el.classList.add('is-visible');
      }
    });

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );
    revealEls.forEach((el) => obs.observe(el));

    return () => obs.disconnect();
  }, []);

  // Kích hoạt vẽ đồ hình Ngũ Hành khi cuộn tới
  useEffect(() => {
    const target = nguHanhRef.current;
    if (!target) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setNguHanhVisible(true);
          }
        });
      },
      { threshold: 0.18 }
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Hỗ trợ vuốt trái/phải đổi bước Thiên Bàn trên màn hình cảm ứng
  const handleSwipeStart = (e) => {
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };

  const handleSwipeEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches?.[0]?.clientX;
    if (typeof endX !== 'number') {
      touchStartXRef.current = null;
      return;
    }
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) < 36) return;
    if (deltaX < 0 && thienBanStep < STORY_BEATS.length - 1) {
      setThienBanStep((prev) => prev + 1);
    } else if (deltaX > 0 && thienBanStep > 0) {
      setThienBanStep((prev) => prev - 1);
    }
  };

  const currentBeat = STORY_BEATS[thienBanStep] || STORY_BEATS[0];
  const currentElementData =
    NGU_HANH_ELEMENTS.find((item) => item.key === activeElement) || NGU_HANH_ELEMENTS[3];

  const getPalaceClass = (palaceId) => {
    if (currentBeat.highlight.primary.includes(palaceId)) return 'is-primary';
    if (currentBeat.highlight.tamhop.includes(palaceId)) return 'is-tamhop';
    if (currentBeat.highlight.xungchieu.includes(palaceId)) return 'is-xungchieu';
    return 'is-dimmed';
  };

  const parsedBirthYear = Number(birthYear);
  const validBirthYear =
    Number.isInteger(parsedBirthYear) &&
    parsedBirthYear >= 1900 &&
    parsedBirthYear <= new Date().getFullYear();
  const birthAge = validBirthYear ? Number(viewingYear) - parsedBirthYear + 1 : 0;
  const selectedStar =
    birthAge > 0
      ? qimenArticles.find(
          (article) => article.slug === NINE_STAR_BY_REMAINDER[birthGender][birthAge % 9]
        )
      : null;

  return (
    <div className="home-mobile-page min-h-screen bg-[#fcfaf7] text-[#1c1917] flex flex-col font-sans selection:bg-[#8b1d1d] selection:text-white relative">
      {/* Thanh tiến trình đọc trên đỉnh màn hình */}
      <div className="scrolly-progress-track" aria-hidden="true">
        <div
          ref={progressBarRef}
          className="scrolly-progress-bar"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <Navbar />

      <main className="flex-1 bg-[#fdfbf8]">
        {/* =================================================================== */}
        {/* CHƯƠNG I: HERO MỞ MÀN TỐI ƯU DI ĐỘNG                                */}
        {/* =================================================================== */}
        <section
          id="chapter-hero"
          className="relative min-h-[calc(100svh-64px)] flex flex-col items-center justify-between overflow-hidden px-4 pt-8 pb-8"
        >
          {/* Vòng Bát Quái nền xoay nhẹ */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            aria-hidden="true"
          >
            <div className="relative w-[300px] h-[300px] flex items-center justify-center">
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

          <div className="w-full" aria-hidden="true" />

          {/* Nội dung chính Hero */}
          <div className="relative z-10 w-full max-w-md mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fcf8f0] border border-[#9a6b26]/35 text-[11px] font-bold text-[#9a6b26] tracking-wide mb-4">
              <span>Tử Vi Đẩu Số Tân Biên 1956</span>
            </div>

            <h1 className="text-[30px] leading-[1.22] font-display font-extrabold text-[#1c1917] tracking-tight">
              Giải mã <span className="text-[#8b1d1d]">mật thư</span>
              <br />
              của riêng bạn.
            </h1>

            <p className="mt-4 text-[14.5px] text-stone-600 leading-relaxed px-1">
              Từ khoảnh khắc cất tiếng khóc chào đời, vị trí của 14 Chính Tinh và hơn 110 Phụ Tinh đã khắc họa nên bản đồ khí vận riêng biệt — nơi bạn thấu hiểu bản thân và chủ động đón lành tránh dữ.
            </p>

            {/* Nút hành động chuẩn vùng chạm ngón cái (>= 48px) */}
            <div className="mt-7 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate('/la-so-tu-vi')}
                className="hm-tap-card w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#8b1d1d] active:bg-[#701616] text-white font-bold text-[15px] shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Lập Lá Số Tử Vi Miễn Phí</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('chapter-thien-ban')}
                className="hm-tap-card w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-[#1c1917]/20 text-[#1c1917] font-bold text-[14px] shadow-2xs cursor-pointer"
              >
                <span>Khám phá câu chuyện Thiên Bàn</span>
                <ChevronDown className="w-4 h-4 shrink-0" />
              </button>
            </div>

            {/* Dải thông tin tin cậy gọn gàng */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11.5px] font-semibold text-[#57534e]">
              <span>14 Chính Tinh &amp; 110+ Phụ Tinh</span>
              <span className="text-stone-300">•</span>
              <span>Xuất PDF &amp; Ảnh 4K Sắc Nét</span>
            </div>
          </div>

          {/* Gợi ý cuộn xuống */}
          <button
            type="button"
            onClick={() => scrollToSection('chapter-thien-ban')}
            className="mt-6 relative z-10 inline-flex flex-col items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-stone-400 cursor-pointer"
          >
            <span>Cuộn xuống để khai mở</span>
            <ChevronDown className="w-4 h-4 scrolly-cue-bounce" />
          </button>
        </section>

        {/* =================================================================== */}
        {/* CHƯƠNG II: HÀNH TRÌNH GIẢI MÃ 12 CUNG ĐỊA BÀN (INTERACTIVE STEPPER) */}
        {/* =================================================================== */}
        <section
          id="chapter-thien-ban"
          className="relative px-4 py-10 bg-[#fdfbf8]"
        >
          <div className="max-w-md mx-auto">
            <div className="text-center mb-5 hm-reveal">
              <h2 className="text-[24px] font-display font-extrabold text-[#1c1917] tracking-tight leading-snug">
                Hành Trình Giải Mã
                <br />
                12 Cung Địa Bàn
              </h2>
              <p className="mt-2 text-[13.5px] text-stone-600 leading-relaxed">
                Chạm từng bước hoặc vuốt ngang trên lá số để quan sát đường nối Tam Hợp, Xung Chiếu chuẩn Tử Vi Đẩu Số Tân Biên 1956.
              </p>
            </div>

            {/* Tờ Lá Số Tương Tác (Tỷ lệ A4 chuẩn 737/1013) */}
            <div
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
              className="hm-reveal relative w-full max-w-[400px] mx-auto"
            >
              <div className="relative aspect-[737/1013] w-full rounded-[8px] border border-[#1c1917] bg-[#1c1917] overflow-hidden shadow-md">
                {/* Đường nối vector Tam Hợp & Xung Chiếu */}
                <svg
                  viewBox="0 0 400 550"
                  className="absolute inset-0 w-full h-full pointer-events-none z-20"
                  aria-hidden="true"
                >
                  {currentBeat.vectors.map((vec) => (
                    <line
                      key={`${currentBeat.step}-${vec.id}`}
                      x1={vec.x1}
                      y1={vec.y1}
                      x2={vec.x2}
                      y2={vec.y2}
                      stroke={vec.color}
                      strokeWidth="1.6"
                      strokeDasharray={vec.dashed ? '4 4' : undefined}
                      strokeLinecap="round"
                      className="scrolly-svg-line is-drawn"
                      opacity="0.88"
                    />
                  ))}
                </svg>

                {/* Huy hiệu TUẦN - TRIỆT */}
                <div
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex items-center gap-[2px] pointer-events-none"
                  style={{ top: '25%', left: '87.5%' }}
                >
                  <span className="bg-[#1c1917] text-white text-[6.5px] font-bold px-1 py-0.5 rounded-[2px] tracking-wide uppercase">
                    TUẦN
                  </span>
                  <span className="bg-[#1c1917] text-white text-[6.5px] font-bold px-1 py-0.5 rounded-[2px] tracking-wide uppercase">
                    TRIỆT
                  </span>
                </div>

                {/* Ma trận 4x4: 12 Cung + Thiên Bàn 2x2 */}
                <div className="grid grid-cols-4 grid-rows-4 gap-[1px] w-full h-full bg-[#1c1917]">
                  {PALACES.map((palace) => (
                    <div
                      key={palace.id}
                      style={{
                        gridColumn: palace.col,
                        gridRow: palace.row,
                      }}
                      className={`scrolly-house relative px-1 py-0.5 flex flex-col justify-between overflow-hidden select-none ${getPalaceClass(
                        palace.id
                      )}`}
                    >
                      <div className="flex items-center justify-between gap-0.5 pb-0.5">
                        <span
                          style={{ color: palace.chiColor }}
                          className="text-[7px] font-bold leading-none"
                        >
                          {palace.chi}
                        </span>
                        <span
                          className={`text-[7px] font-extrabold uppercase tracking-tight leading-none truncate ${
                            palace.isMenh ? 'text-[#8b1d1d]' : 'text-[#1c1917]'
                          }`}
                        >
                          {palace.name}
                        </span>
                        <span className="text-[7px] font-bold text-[#1c1917] tabular-nums leading-none">
                          {palace.daiHan}
                        </span>
                      </div>

                      <div className="text-center my-0.5 min-h-[13px] flex flex-col justify-center">
                        {palace.chinhTinh.map((ct) => (
                          <div
                            key={ct.name}
                            style={{ color: ct.color }}
                            className="text-[7.5px] font-extrabold leading-[1.12] tracking-tight"
                          >
                            {ct.name}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-x-0.5 text-[6px] leading-[1.15] mb-auto pt-0.5">
                        <div className="font-medium truncate">
                          {palace.leftStars.map((s) => (
                            <div key={s.name} style={{ color: s.color }} className="truncate">
                              {s.name}
                            </div>
                          ))}
                        </div>
                        <div className="font-medium text-right truncate">
                          {palace.rightStars.map((s) => (
                            <div key={s.name} style={{ color: s.color }} className="truncate">
                              {s.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-0.5 text-[6px] leading-none">
                        <span className="font-bold text-[#1c1917]">{palace.tieuHan}</span>
                        <span className="text-[#57534e] font-medium truncate px-0.5">{palace.trangSinh}</span>
                        <span className="font-bold text-[#1c1917]">{palace.thang}</span>
                      </div>
                    </div>
                  ))}

                  {/* Thiên Bàn Trung Tâm 2x2 */}
                  <div
                    style={{ gridColumn: '2 / 4', gridRow: '2 / 4' }}
                    className="bg-white px-2 py-2 flex flex-col items-center justify-between text-center relative overflow-hidden"
                  >
                    <div className="w-full space-y-0.5">
                      <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#8b1d1d]">
                        TỬ VI HỒNG ÂN
                      </div>
                      <div className="text-[7px] font-bold text-[#1c1917] leading-tight">
                        Luận giải đầy đủ 199k tại www.tuvihongan.com
                      </div>
                    </div>

                    <div className="w-full space-y-[2px] text-[6.5px] text-left px-0.5 my-auto leading-tight">
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Họ tên</span>
                        <span className="text-[#1c1917] truncate">: www.tuvihongan.com</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Năm sinh</span>
                        <span className="text-[#1c1917] truncate">: 2000 Kỷ Mão (N.1999)</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Tháng sinh</span>
                        <span className="text-[#1c1917] truncate">: 01 Bính Tí (Th.11)</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Ngày sinh</span>
                        <span className="text-[#1c1917] truncate">: 01 Mậu Ngọ (Ng.25)</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Giờ sinh</span>
                        <span className="text-[#1c1917] truncate">: 00:00 Nhâm Tí</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Năm xem</span>
                        <span className="text-[#1c1917] truncate">: 2027 Đinh Mùi (29t)</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Âm Dương</span>
                        <span className="text-[#1c1917] truncate">: Âm Nam</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Bản Mệnh</span>
                        <span className="text-[#1c1917] truncate">: Thành Đầu Thổ</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Cục</span>
                        <span className="text-[#1c1917] truncate">: Thủy nhị cục</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Chủ Mệnh</span>
                        <span className="text-[#1c1917] truncate">: Tham Lang</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1">
                        <span className="font-bold text-[#1c1917]">Chủ Thân</span>
                        <span className="text-[#1c1917] truncate">: Thiên Đồng</span>
                      </div>
                      <div className="grid grid-cols-[48px_1fr] gap-1 items-start">
                        <span className="font-bold text-[#1c1917]">Mệnh lý</span>
                        <span className="text-[#1c1917] leading-snug">
                          : Âm Dương nghịch lý
                          <br />
                          &nbsp; Mệnh khắc Cục
                          <br />
                          &nbsp; Thân cư MỆNH
                        </span>
                      </div>
                    </div>

                    <div className="w-full text-right text-[6.5px] text-stone-400 font-semibold tabular-nums">
                      W-87617574
                    </div>
                  </div>
                </div>
              </div>

              {/* Chú giải tương quan cung vị */}
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold text-[#57534e]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                  Bản Cung
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
                  Tam Hợp
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
                  Xung Chiếu
                </span>
              </div>
            </div>

            {/* Bộ điều khiển 4 bước gắn liền ngay dưới Thiên Bàn */}
            <div
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
              className="mt-4 space-y-2.5"
            >
              <div
                role="tablist"
                aria-label="Các bước giải mã Thiên Bàn"
                className="grid grid-cols-4 gap-1.5"
              >
                {STORY_BEATS.map((beat, idx) => {
                  const isActive = thienBanStep === idx;
                  return (
                    <button
                      key={beat.step}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setThienBanStep(idx)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-extrabold tracking-wide border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#8b1d1d] text-white border-[#8b1d1d] shadow-xs'
                          : 'bg-white text-[#57534e] border-stone-200'
                      }`}
                    >
                      Bước 0{idx + 1}
                    </button>
                  );
                })}
              </div>

              <article
                key={currentBeat.step}
                className="hm-beat-enter rounded-2xl bg-white border border-[#8b1d1d] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8b1d1d]">
                    Bước 0{currentBeat.step + 1} / 0{STORY_BEATS.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Bước trước"
                      disabled={thienBanStep === 0}
                      onClick={() => setThienBanStep((s) => Math.max(0, s - 1))}
                      className="w-8 h-8 rounded-lg border border-stone-200 bg-[#fcfaf7] text-[#1c1917] disabled:opacity-35 flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Bước tiếp theo"
                      disabled={thienBanStep === STORY_BEATS.length - 1}
                      onClick={() =>
                        setThienBanStep((s) => Math.min(STORY_BEATS.length - 1, s + 1))
                      }
                      className="w-8 h-8 rounded-lg border border-stone-200 bg-[#fcfaf7] text-[#1c1917] disabled:opacity-35 flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-[16px] font-display font-extrabold text-[#1c1917] leading-snug">
                  {currentBeat.title}
                </h3>

                {thienBanStep === STORY_BEATS.length - 1 && (
                  <div className="mt-3.5 pt-3 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => navigate('/la-so-tu-vi')}
                      className="hm-tap-card w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#8b1d1d] active:bg-[#701616] px-4 py-2.5 text-[13.5px] font-bold text-white shadow-xs cursor-pointer"
                    >
                      <span>Lập Lá Số Của Bạn Ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </article>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* CHƯƠNG III: BIỂU ĐỒ NGŨ HÀNH TƯƠNG SINH – TƯƠNG KHẮC                */}
        {/* =================================================================== */}
        <section
          id="chapter-ngu-hanh"
          ref={nguHanhRef}
          className="relative px-4 py-12 bg-[#fcfaf7]"
        >
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6 hm-reveal">
              <h2 className="text-[24px] font-display font-extrabold text-[#1c1917] tracking-tight leading-snug">
                Nhịp Điều Hòa
                <br />
                Tương Sinh – Tương Khắc
              </h2>
              <p className="mt-2 text-[13.5px] text-stone-600 leading-relaxed">
                Chạm vào từng hành trong đồ hình Ngũ Hành để quan sát dòng chảy sinh khắc và cấu trúc năng lượng bản mệnh.
              </p>
            </div>

            {/* Đồ hình Ngũ Hành SVG */}
            <div className="hm-reveal rounded-3xl bg-white border border-stone-200 shadow-xs p-5 flex flex-col items-center">
              <div className="relative w-full max-w-[280px] aspect-square">
                <svg viewBox="0 0 400 390" className="w-full h-full overflow-visible">
                  <circle
                    cx="200"
                    cy="195"
                    r="148"
                    fill="none"
                    stroke="#1e5631"
                    strokeWidth="2.4"
                    pathLength="100"
                    className={`scrolly-svg-path ${nguHanhVisible ? 'is-drawn' : ''}`}
                    opacity="0.82"
                  />
                  <polygon
                    points="200,47 287,314.7 59.2,149.3 340.8,149.3 113,314.7"
                    fill="none"
                    stroke="#8b1d1d"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                    pathLength="100"
                    className={`scrolly-svg-path ${nguHanhVisible ? 'is-drawn' : ''}`}
                    opacity="0.68"
                  />

                  {NGU_HANH_ELEMENTS.map((el) => {
                    const isSelected = el.key === activeElement;
                    return (
                      <g
                        key={el.key}
                        onClick={() => setActiveElement(el.key)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={el.cx}
                          cy={el.cy}
                          r={isSelected ? 34 : 28}
                          fill={isSelected ? el.color : '#ffffff'}
                          stroke={el.color}
                          strokeWidth={isSelected ? '3' : '2.2'}
                          style={{ transition: 'all 260ms ease' }}
                        />
                        <text
                          x={el.cx}
                          y={el.cy + 5}
                          textAnchor="middle"
                          fill={isSelected ? '#ffffff' : el.color}
                          fontSize="15"
                          fontWeight="800"
                          style={{ pointerEvents: 'none', transition: 'fill 260ms ease' }}
                        >
                          {el.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="mt-3 flex items-center justify-center gap-5 text-[11.5px] font-semibold text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-[#1e5631] inline-block" />
                  Tương Sinh
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-[#8b1d1d] inline-block" />
                  Tương Khắc
                </span>
              </div>
            </div>

            {/* Thanh chọn 5 hành vừa khít 1 hàng không cần cuộn ngang */}
            <div
              role="tablist"
              aria-label="Chọn Ngũ Hành"
              className="mt-3.5 grid grid-cols-5 gap-1.5"
            >
              {NGU_HANH_ELEMENTS.map((el) => {
                const Icon = el.icon;
                const isSelected = el.key === activeElement;
                return (
                  <button
                    key={el.key}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveElement(el.key)}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-2xl text-[11.5px] font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c1917] text-white border-[#1c1917] shadow-xs'
                        : 'bg-white text-[#1c1917] border-stone-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{el.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Bảng chỉ số bản mệnh theo hành đang chọn */}
            <div className="mt-3.5 rounded-3xl bg-white border border-stone-200 shadow-xs p-5 space-y-4">
              <div>
                <h3 className="text-[18px] font-display font-extrabold text-[#1c1917]">
                  Bản Mệnh Hành {currentElementData.name}
                </h3>
                <p className="mt-1.5 text-[13.5px] text-stone-600 leading-relaxed">
                  {currentElementData.traits}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-[#f6fbf7] border border-[#1e5631]/25 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#1e5631]">
                    Vượng Sinh
                  </div>
                  <div className="text-[12.5px] font-bold text-[#1c1917] mt-1 leading-snug">
                    {currentElementData.sinh}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#fff8f8] border border-[#8b1d1d]/25 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b1d1d]">
                    Chế Khắc
                  </div>
                  <div className="text-[12.5px] font-bold text-[#1c1917] mt-1 leading-snug">
                    {currentElementData.khac}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {currentElementData.bars.map((bar) => (
                  <div key={bar.label}>
                    <div className="flex items-center justify-between text-[12px] font-bold text-stone-700 mb-1">
                      <span>{bar.label}</span>
                      <span className="tabular-nums text-[#1c1917]">{bar.val}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: nguHanhVisible ? `${bar.val}%` : '0%',
                          backgroundColor: currentElementData.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* CHƯƠNG IV: HỆ SINH THÁI TIỆN ÍCH HUYỀN HỌC MIỄN PHÍ                 */}
        {/* =================================================================== */}
        <section
          id="chapter-utilities"
          className="relative px-4 py-12 bg-[#fdfbf8]"
        >
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6 hm-reveal">
              <h2 className="text-[24px] font-display font-extrabold text-[#1c1917] tracking-tight leading-snug">
                Hệ Sinh Thái Tiện Ích
                <br />
                Huyền Học Miễn Phí
              </h2>
              <p className="mt-2 text-[13.5px] text-stone-600 leading-relaxed">
                Từ lập lá số trọn đời, xem ngày lành tháng tốt, đo la kinh phong thủy đến chiêm nghiệm Truyện Kiều và tra cứu Cửu Diệu sao hạn.
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Thẻ trọng tâm: LẬP LÁ SỐ TỬ VI */}
              <div
                id="card-tuvi-intro"
                onClick={() => navigate('/la-so-tu-vi')}
                className="hm-reveal hm-tap-card rounded-3xl bg-white p-5 border-2 border-[#8b1d1d] shadow-[0_10px_28px_rgba(139,29,29,0.08)] cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#8b1d1d] text-white flex items-center justify-center shadow-xs shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="text-[18px] font-display font-extrabold text-[#1c1917] tracking-tight leading-tight">
                      LẬP LÁ SỐ TỬ VI
                    </h3>
                  </div>
                  <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                    MIỄN PHÍ
                  </span>
                </div>

                <p className="text-[13.5px] text-stone-600 leading-relaxed mb-3.5">
                  An sao chính xác theo chuẩn Tử Vi Đẩu Số Tân Biên 1956
                </p>

                <div className="grid grid-cols-2 gap-2 mb-3.5">
                  <div className="p-3 rounded-2xl bg-[#fcfaf7] border border-stone-200/80">
                    <div className="text-[11px] font-bold text-[#8b1d1d] uppercase tracking-wide">
                      Cung Mệnh &amp; Thân
                    </div>
                    <div className="text-[11.5px] text-stone-600 mt-0.5 leading-snug">
                      Cốt cách &amp; nền tảng vận mệnh
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#fcfaf7] border border-stone-200/80">
                    <div className="text-[11px] font-bold text-[#9a6b26] uppercase tracking-wide">
                      Quan Lộc
                    </div>
                    <div className="text-[11.5px] text-stone-600 mt-0.5 leading-snug">
                      Công danh &amp; đường tiến thân
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#fcfaf7] border border-stone-200/80">
                    <div className="text-[11px] font-bold text-[#9a6b26] uppercase tracking-wide">
                      Tài Bạch
                    </div>
                    <div className="text-[11.5px] text-stone-600 mt-0.5 leading-snug">
                      Tài vận &amp; khả năng tích lũy
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#fcfaf7] border border-stone-200/80">
                    <div className="text-[11px] font-bold text-[#8b1d1d] uppercase tracking-wide">
                      Đại / Tiểu Vận
                    </div>
                    <div className="text-[11.5px] text-stone-600 mt-0.5 leading-snug">
                      10 năm đại vận &amp; từng năm
                    </div>
                  </div>
                </div>

                <ul className="space-y-1.5 text-[12.5px] text-stone-600 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#8b1d1d] shrink-0 mt-0.5" />
                    <span>An đầy đủ 14 Chính tinh &amp; hơn 110 Phụ tinh chuẩn xác</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#8b1d1d] shrink-0 mt-0.5" />
                    <span>Tự động lập Tam Hợp, Xung Chiếu, Tứ Hóa &amp; Tuần Triệt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#8b1d1d] shrink-0 mt-0.5" />
                    <span>Lưu trữ lịch sử lá số &amp; xuất bản ảnh 4K, PDF sắc nét</span>
                  </li>
                </ul>

                <div className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#8b1d1d] text-white font-bold text-[14.5px] shadow-xs">
                  <span>Lập lá số ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Ô 1: LỊCH VẠN SỰ */}
              <div
                id="card-lichvansu-intro"
                onClick={() => navigate('/lich-van-su')}
                className="hm-reveal hm-reveal-delay-1 hm-tap-card rounded-2xl bg-white p-4 border border-stone-200 shadow-xs cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#fcfaf7] border border-stone-200 text-[#1c1917] flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-[15px] text-[#1c1917]">
                        LỊCH VẠN SỰ
                      </h3>
                      <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                        MIỄN PHÍ
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2 mt-1">
                      <p className="text-[12.5px] text-[#57534e] leading-snug">
                        Tra cứu lịch âm dương, ngày tốt xấu, giờ hoàng đạo &amp; tiết khí
                      </p>
                      <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ô 2: BÁT QUÁI, PHONG THỦY */}
              <div
                id="card-batquai-intro"
                onClick={() => navigate('/la-kinh-phong-thuy')}
                className="hm-reveal hm-reveal-delay-2 hm-tap-card rounded-2xl bg-white p-4 border border-stone-200 shadow-xs cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#f0f7f2] border border-[#1e5631]/25 text-[#1e5631] flex items-center justify-center shrink-0 mt-0.5">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-[15px] text-[#1c1917]">
                        BÁT QUÁI, PHONG THỦY
                      </h3>
                      <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                        MIỄN PHÍ
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2 mt-1">
                      <p className="text-[12.5px] text-[#57534e] leading-snug">
                        Tra cứu Cung Phi, Bát Trạch, hướng nhà &amp; xung hợp nhân duyên
                      </p>
                      <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ô 3: TAROT KIỀU */}
              <div
                id="card-tarot-intro"
                onClick={() => navigate('/boi-kieu')}
                className="hm-reveal hm-reveal-delay-3 hm-tap-card rounded-2xl bg-white p-4 border border-stone-200 shadow-xs cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#fff5f5] border border-[#8b1d1d]/25 text-[#8b1d1d] flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-[15px] text-[#1c1917]">
                        TAROT KIỀU
                      </h3>
                      <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                        MIỄN PHÍ
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2 mt-1">
                      <p className="text-[12.5px] text-[#57534e] leading-snug">
                        Xin quẻ 3.254 câu thơ Truyện Kiều, lắng nghe thi ca khai mở tâm trí
                      </p>
                      <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ô 4: TRA CỨU SAO HẠN */}
              <div
                id="card-saohan-intro"
                className="hm-reveal rounded-2xl bg-white p-4 border border-[#9a6b26]/45 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#fcf8f0] border border-[#9a6b26]/30 text-[#9a6b26] flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 fill-[#9a6b26] text-[#9a6b26]" />
                    </div>
                    <h3 className="font-display font-bold text-[15px] text-[#8b1d1d] uppercase truncate">
                      TRA CỨU SAO HẠN
                    </h3>
                  </div>
                  <span className="rounded-full border border-[#1e5631]/30 bg-[#f0f7f2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1e5631] shrink-0">
                    MIỄN PHÍ
                  </span>
                </div>
                <p className="text-[12.5px] text-[#57534e] mb-3">
                  Xem sao chiếu mệnh, cát hung năm nay và phương thức hóa giải
                </p>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Chọn giới tính">
                    {[['nam', 'Nam'], ['nu', 'Nữ']].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBirthGender(value)}
                        aria-pressed={birthGender === value}
                        className={`min-h-[40px] rounded-xl border py-2 px-3 text-[13px] font-bold transition-colors cursor-pointer ${
                          birthGender === value
                            ? 'border-[#9a6b26] bg-[#9a6b26] text-white shadow-2xs'
                            : 'border-stone-200 bg-[#fcfaf7] text-[#1c1917]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="hm-birth-year" className="mb-1 block text-[11px] font-semibold text-[#57534e]">
                        Năm sinh
                      </label>
                      <input
                        id="hm-birth-year"
                        type="number"
                        inputMode="numeric"
                        min="1900"
                        max={new Date().getFullYear()}
                        step="1"
                        value={birthYear}
                        onChange={(event) => setBirthYear(event.target.value)}
                        placeholder="Ví dụ: 1995"
                        className="w-full min-h-[40px] rounded-xl border border-stone-200 bg-[#fcfaf7] px-3 py-2 text-[13px] text-[#1c1917] outline-none focus:border-[#9a6b26] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="hm-viewing-year" className="mb-1 block text-[11px] font-semibold text-[#57534e]">
                        Năm xem
                      </label>
                      <select
                        id="hm-viewing-year"
                        value={viewingYear}
                        onChange={(event) => setViewingYear(event.target.value)}
                        className="w-full min-h-[40px] rounded-xl border border-stone-200 bg-[#fcfaf7] px-3 py-2 text-[13px] text-[#1c1917] outline-none focus:border-[#9a6b26] focus:bg-white"
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

                {selectedStar && (
                  <div
                    key={selectedStar.slug}
                    className="scrolly-star-reveal mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={`/qimen/${selectedStar.slug}.webp`}
                        alt={selectedStar.name}
                        className="w-12 h-12 rounded-xl object-cover border border-[#9a6b26]/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] text-[#57534e]">Sao chiếu năm {viewingYear}:</p>
                        <p className="font-display text-[15px] font-bold text-[#8b1d1d] leading-tight truncate">
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
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#8b1d1d] active:bg-[#701616] px-3 py-2.5 text-[12px] font-bold text-white transition-colors shadow-xs cursor-pointer shrink-0"
                    >
                      <span>Xem giải đoán</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* CHƯƠNG V: DỊCH VỤ LUẬN GIẢI TỬ VI CHUYÊN SÂU (#service)             */}
        {/* =================================================================== */}
        <section
          id="service"
          className="px-4 py-12 text-[#1c1917] scroll-mt-16 bg-[#fcfaf7]"
        >
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6 hm-reveal">
              <h2 className="text-[24px] font-display font-extrabold text-[#1c1917] tracking-tight leading-snug">
                Dịch Vụ Luận Giải
                <br />
                Tử Vi Chuyên Sâu
              </h2>
              <p className="mt-2 text-[13.5px] text-stone-600 leading-relaxed">
                Khi bạn sẵn sàng bước vào chiều sâu của bản mệnh, hãy chọn hình thức luận giải phù hợp nhất cho hành trình sắp tới.
              </p>
            </div>

            <div className="space-y-4">
              {/* Gói 1: LUẬN GIẢI AI */}
              <div className="hm-reveal bg-white p-5 rounded-3xl border-2 border-[#8b1d1d] shadow-[0_10px_28px_rgba(139,29,29,0.08)] relative flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#8b1d1d] text-white text-[10px] font-extrabold px-4 py-1.5 rounded-bl-2xl shadow-xs uppercase tracking-wider">
                  Được Lựa Chọn Nhiều Nhất
                </div>

                <div>
                  <div className="pt-5 mb-3">
                    <h3 className="text-[21px] font-display font-extrabold text-[#1c1917] uppercase leading-tight">
                      LUẬN GIẢI AI
                    </h3>
                    <p className="text-[13px] text-[#57534e] leading-relaxed mt-1.5">
                      Phân tích chuyên sâu bằng mô hình AI mạnh nhất của Google Deep Mind
                    </p>
                  </div>

                  <div className="py-2 space-y-1.5">
                    {showAiPurchasedBadge ? (
                      <div>
                        <span className="inline-flex items-center px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[13.5px] font-bold leading-snug">
                          Đã mua - Bạn có {aiCredits} lượt sử dụng
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[34px] font-extrabold text-[#8b1d1d] font-display leading-none">
                            199.000đ
                          </span>
                          <span className="text-[20px] font-bold text-[#1c1917] font-display leading-none">
                            / Lá số
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-stone-400 line-through text-[13px]">499.000đ</span>
                          <span className="text-[11px] text-[#1e5631] font-bold bg-[#f0f7f2] px-2.5 py-0.5 rounded-full border border-[#1e5631]/25">
                            Tiết kiệm 60%
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <ul className="space-y-3 py-4 text-[13px]">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Bài luận giải 7.000 – 8.000 từ</strong>
                        <span className="block text-[#57534e] mt-0.5">Phân tích toàn diện 12 cung bản mệnh.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Dự đoán chi tiết</strong>
                        <span className="block text-[#57534e] mt-0.5">10 năm Đại vận &amp; diễn biến 3 năm Tiểu vận gần nhất.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Hỏi đáp không giới hạn</strong>
                        <span className="block text-[#57534e] mt-0.5">Tương tác trực tiếp cùng trợ lý AI thông minh.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Nhận kết quả ngay tức thì</strong>
                        <span className="block text-[#57534e] mt-0.5">Hồ sơ được lưu trữ trọn đời trên website.</span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 space-y-2">
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
                    className="hm-tap-card w-full min-h-[48px] py-3.5 rounded-2xl bg-[#8b1d1d] active:bg-[#701616] text-white font-bold text-[14px] transition-colors shadow-md flex items-center justify-center cursor-pointer uppercase tracking-wide"
                  >
                    {showAiPurchasedBadge ? 'LẬP LÁ SỐ & LUẬN GIẢI NGAY' : 'ĐĂNG KÝ LUẬN GIẢI AI'}
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-[#57534e] px-0.5">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#1e5631]" />
                      Bảo mật thông tin đương số
                    </span>
                    <span>Nhận kết quả tức thì</span>
                  </div>
                </div>
              </div>

              {/* Gói 2: LUẬN GIẢI TRỰC TIẾP 1-1 */}
              <div className="hm-reveal bg-white p-5 rounded-3xl border-2 border-[#1c1917] shadow-[0_10px_28px_rgba(28,25,23,0.08)] relative flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#1c1917] text-[#e5c488] text-[10px] font-extrabold px-4 py-1.5 rounded-bl-2xl shadow-xs uppercase tracking-wider">
                  Chuyên Gia Đàm Thoại
                </div>

                <div>
                  <div className="pt-5 mb-3">
                    <h3 className="text-[21px] font-display font-extrabold text-[#1c1917] uppercase leading-tight">
                      LUẬN GIẢI TRỰC TIẾP 1-1
                    </h3>
                    <p className="text-[13px] text-[#57534e] leading-relaxed mt-1.5">
                      Đàm thoại trực tiếp cùng Thầy Tử Vi Hồng Ân
                    </p>
                  </div>

                  <div className="py-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[34px] font-extrabold text-[#1c1917] font-display leading-none">
                        500.000đ
                      </span>
                      <span className="text-[20px] font-bold text-[#1c1917] font-display leading-none">
                        / Lá số
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 py-4 text-[13px]">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Đàm thoại trực tiếp 1-1</strong>
                        <span className="block text-[#57534e] mt-0.5">Trao đổi qua Zalo cùng Thầy Tử Vi Hồng Ân.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Tháo gỡ chuyên sâu các vướng mắc</strong>
                        <span className="block text-[#57534e] mt-0.5">Về sự nghiệp, tài lộc, tình duyên &amp; gia đạo.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Định hướng chiến lược cuộc đời</strong>
                        <span className="block text-[#57534e] mt-0.5">Lựa chọn thời điểm lành để khởi sự.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1e5631] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#1c1917] font-bold">Tư vấn cải vận thực chứng</strong>
                        <span className="block text-[#57534e] mt-0.5">Giải đáp cặn kẽ mọi băn khoăn của quý khách.</span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const officialPhones = ['0924.616.199', '0385.497.085'];
                      const randomPhone = officialPhones[Math.floor(Math.random() * officialPhones.length)];
                      setSelectedPackage({ ...PACKAGES.direct500, zaloPhone: randomPhone });
                      setShowPaymentModal(true);
                    }}
                    className="hm-tap-card w-full min-h-[48px] py-3.5 rounded-2xl bg-[#1c1917] active:bg-stone-800 text-white font-bold text-[14px] transition-colors shadow-md flex items-center justify-center cursor-pointer uppercase tracking-wide"
                  >
                    ĐẶT LỊCH LUẬN GIẢI
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-[#57534e] px-0.5">
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
