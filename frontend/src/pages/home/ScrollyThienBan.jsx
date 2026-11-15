import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PALACES, STORY_BEATS, NGU_HANH_ELEMENTS } from './homeData';

export default function ScrollyThienBan({ activeBeat: controlledBeat, onSelectBeat }) {
  const navigate = useNavigate();
  const [internalBeat, setInternalBeat] = useState(0);
  const [activeElement, setActiveElement] = useState('hoa');
  const [nguHanhVisible, setNguHanhVisible] = useState(false);

  const activeBeat = typeof controlledBeat === 'number' ? controlledBeat : internalBeat;
  const setActiveBeat = (nextVal) => {
    if (typeof onSelectBeat === 'function') {
      onSelectBeat(nextVal);
    } else {
      setInternalBeat(nextVal);
    }
  };

  const beatRefs = useRef([]);
  const nguHanhRef = useRef(null);

  // Trên Mobile (<= 580px) dùng IntersectionObserver tự nhiên; trên Desktop (> 580px) được điều phối bởi 5 nấc cuộn ở Home.jsx
  useEffect(() => {
    if (typeof controlledBeat === 'number' && typeof window !== 'undefined' && window.innerWidth > 580) {
      return undefined;
    }
    const observers = [];
    beatRefs.current.forEach((el, index) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && (typeof window === 'undefined' || window.innerWidth <= 580)) {
              if (typeof onSelectBeat === 'function') {
                onSelectBeat(index);
              } else {
                setInternalBeat(index);
              }
            }
          });
        },
        { rootMargin: '-32% 0px -38% 0px', threshold: 0.1 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [controlledBeat, onSelectBeat]);

  useEffect(() => {
    const target = nguHanhRef.current;
    if (!target) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setNguHanhVisible(true);
          }
        });
      },
      { threshold: 0.25 }
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, []);

  const currentBeat = STORY_BEATS[activeBeat] || STORY_BEATS[0];
  const currentElementData =
    NGU_HANH_ELEMENTS.find((item) => item.key === activeElement) || NGU_HANH_ELEMENTS[3];

  const getPalaceClass = (palaceId) => {
    if (currentBeat.highlight.primary.includes(palaceId)) return 'is-primary';
    if (currentBeat.highlight.tamhop.includes(palaceId)) return 'is-tamhop';
    if (currentBeat.highlight.xungchieu.includes(palaceId)) return 'is-xungchieu';
    return 'is-dimmed';
  };

  return (
    <>
      {/* =================================================================== */}
      {/* KHAI MỞ THIÊN BÀN 12 CUNG (ĐỒNG NHẤT 100% MẪU /la-so-tu-vi)         */}
      {/* =================================================================== */}
      <section
        id="chapter-thien-ban"
        className="relative mt-12 sm:mt-16 lg:mt-24 py-10 sm:py-14 lg:py-4 lg:h-screen lg:min-h-[640px] lg:flex lg:flex-col lg:justify-center lg:overflow-hidden bg-[#fdfbf8]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-6xl mx-auto text-center mb-6 sm:mb-8 lg:mb-4 scrolly-reveal">
            <h2 className="text-2xl sm:text-3xl lg:text-[30px] xl:text-[34px] font-display font-extrabold text-[#1c1917] tracking-tight leading-snug md:whitespace-nowrap">
              Hành Trình Giải Mã
              <br className="md:hidden" /> 12 Cung Địa Bàn
            </h2>
            <p className="mt-1.5 max-w-none mx-auto whitespace-nowrap text-[clamp(7.5px,1.8vw,15px)] sm:text-[clamp(10.5px,1.35vw,15px)] lg:text-[clamp(12px,1.1vw,15px)] text-stone-600 leading-relaxed">
              Cuộn qua từng nhịp để quan sát cấu trúc tờ lá số chuẩn xác theo hệ thống an sao Tử Vi Đẩu Số Tân Biên 1956.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.12fr_1fr] gap-6 lg:gap-8 items-center">
            {/* LEFT: LÁ SỐ ĐỒNG BỘ CHIỀU CAO KHUNG HÌNH */}
            <div className="z-10">
              <div className="relative w-full min-w-0 mx-auto flex flex-col items-center justify-center">
                {/* Khung Tờ Lá Số Tỷ Lệ A4 Chuẩn (737 x 1013) tự co giãn vừa khít trong chương 100vh */}
                <div
                  className="relative aspect-[737/1013] w-full max-w-[520px] lg:w-[min(100%,calc((100vh-175px)*737/1013))] lg:max-w-[460px] xl:max-w-[500px] rounded-[8px] border border-[#1c1917] bg-[#1c1917] overflow-hidden shadow-md"
                >
                  {/* SVG Overlay: Đường nối Tam Hợp & Xung Chiếu nằm gọn trong Thiên Bàn */}
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
                        opacity="0.85"
                      />
                    ))}
                  </svg>

                  {/* Huy hiệu TUẦN - TRIỆT trên ranh giới Thân (col 4, row 1) & Dậu (col 4, row 2) */}
                  <div
                    className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex items-center gap-[2px] pointer-events-none"
                    style={{ top: '25%', left: '87.5%' }}
                  >
                    <span className="bg-[#1c1917] text-white text-[7px] sm:text-[8.5px] font-bold px-1.5 py-0.5 rounded-[2px] tracking-wide uppercase">
                      TUẦN
                    </span>
                    <span className="bg-[#1c1917] text-white text-[7px] sm:text-[8.5px] font-bold px-1.5 py-0.5 rounded-[2px] tracking-wide uppercase">
                      TRIỆT
                    </span>
                  </div>

                  {/* Ma trận 4x4: 12 Cung + Thiên Bàn 2x2 (Rãnh viền mảnh 1px) */}
                  <div className="grid grid-cols-4 grid-rows-4 gap-[1px] w-full h-full bg-[#1c1917]">
                    {PALACES.map((palace) => (
                      <div
                        key={palace.id}
                        style={{
                          gridColumn: palace.col,
                          gridRow: palace.row,
                        }}
                        className={`scrolly-house relative px-1 py-1 sm:px-1.5 sm:py-1.5 flex flex-col justify-between overflow-hidden select-none ${getPalaceClass(
                          palace.id
                        )}`}
                      >
                        {/* House Header: Địa Chi | Tên Cung | Đại Hạn */}
                        <div className="flex items-center justify-between gap-0.5 pb-0.5">
                          <span
                            style={{ color: palace.chiColor }}
                            className="text-[7.5px] sm:text-[9px] font-bold leading-none"
                          >
                            {palace.chi}
                          </span>
                          <span
                            className={`text-[7.5px] sm:text-[9.5px] font-extrabold uppercase tracking-tight leading-none truncate ${
                              palace.isMenh ? 'text-[#8b1d1d]' : 'text-[#1c1917]'
                            }`}
                          >
                            {palace.name}
                          </span>
                          <span className="text-[7.5px] sm:text-[9px] font-bold text-[#1c1917] tabular-nums leading-none">
                            {palace.daiHan}
                          </span>
                        </div>

                        {/* Chính Tinh */}
                        <div className="text-center my-0.5 min-h-[14px] sm:min-h-[18px] flex flex-col justify-center">
                          {palace.chinhTinh.map((ct) => (
                            <div
                              key={ct.name}
                              style={{ color: ct.color }}
                              className="text-[8px] sm:text-[10px] font-extrabold leading-[1.15] tracking-tight"
                            >
                              {ct.name}
                            </div>
                          ))}
                        </div>

                        {/* Phụ Tinh 2 cột (Tả / Hữu) */}
                        <div className="grid grid-cols-2 gap-x-0.5 text-[6.5px] sm:text-[8px] leading-[1.2] mb-auto pt-0.5">
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

                        {/* House Footer: Tiểu Hạn | Vòng Tràng Sinh | Tháng */}
                        <div className="flex items-center justify-between pt-0.5 text-[6.5px] sm:text-[8px] leading-none">
                          <span className="font-bold text-[#1c1917]">{palace.tieuHan}</span>
                          <span className="text-[#57534e] font-medium truncate px-0.5">{palace.trangSinh}</span>
                          <span className="font-bold text-[#1c1917]">{palace.thang}</span>
                        </div>
                      </div>
                    ))}

                    {/* Thiên Bàn Trung Tâm (2x2) - Khớp 100% ảnh mẫu /la-so-tu-vi */}
                    <div
                      style={{ gridColumn: '2 / 4', gridRow: '2 / 4' }}
                      className="bg-white px-2.5 py-2.5 sm:px-4 sm:py-3.5 flex flex-col items-center justify-between text-center relative overflow-hidden"
                    >
                      <div className="w-full space-y-0.5">
                        <div className="text-[11px] sm:text-[15px] font-extrabold uppercase tracking-wide text-[#8b1d1d]">
                          TỬ VI HỒNG ÂN
                        </div>
                        <div className="text-[7.5px] sm:text-[9.5px] font-bold text-[#1c1917] leading-tight">
                          Luận giải đầy đủ 199k tại www.tuvihongan.com
                        </div>
                        <div className="text-[7px] sm:text-[9px] text-[#57534e] leading-tight">
                          Đặt lịch luận giải riêng với thầy qua Zalo
                        </div>
                        <div className="text-[9.5px] sm:text-[12px] font-extrabold text-[#8b1d1d] tracking-wide">
                          0385.497.085
                        </div>
                      </div>

                      {/* Thông tin Đương Số chuẩn mẫu */}
                      <div className="w-full space-y-[2px] sm:space-y-1 text-[7px] sm:text-[9.5px] text-left px-0.5 sm:px-2 my-auto leading-tight">
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Họ tên</span>
                          <span className="text-[#1c1917] truncate">: www.tuvihongan.com</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Năm sinh</span>
                          <span className="text-[#1c1917] truncate">: 2000 &nbsp; Kỷ Mão (N.1999)</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Tháng sinh</span>
                          <span className="text-[#1c1917] truncate">: 01 &nbsp;&nbsp;&nbsp; Bính Tí (Th.11)</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Ngày sinh</span>
                          <span className="text-[#1c1917] truncate">: 01 &nbsp;&nbsp;&nbsp; Mậu Ngọ (Ng.25)</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Giờ sinh</span>
                          <span className="text-[#1c1917] truncate">: 00:00 Nhâm Tí (G.00:00)</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Năm xem</span>
                          <span className="text-[#1c1917] truncate">: 2027 &nbsp; Đinh Mùi &nbsp; 29 tuổi</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Âm Dương</span>
                          <span className="text-[#1c1917] truncate">: Âm Nam</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Bản Mệnh</span>
                          <span className="text-[#1c1917] truncate">: Thành Đầu Thổ</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Cục</span>
                          <span className="text-[#1c1917] truncate">: Thủy nhị cục</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Chủ Mệnh</span>
                          <span className="text-[#1c1917] truncate">: Tham Lang</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1">
                          <span className="font-bold text-[#1c1917]">Chủ Thân</span>
                          <span className="text-[#1c1917] truncate">: Thiên Đồng</span>
                        </div>
                        <div className="grid grid-cols-[54px_1fr] sm:grid-cols-[72px_1fr] gap-1 items-start">
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

                      <div className="w-full text-right text-[7px] sm:text-[8.5px] text-stone-400 font-semibold tabular-nums">
                        W-87617574
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chú giải tương quan cung vị */}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] font-semibold text-[#57534e]">
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
            </div>

            {/* RIGHT: 4 KHỐI BƯỚC GỌN GÀNG VỪA KHÍT 100VH */}
            <div className="space-y-3.5 lg:space-y-2.5">
              {STORY_BEATS.map((beat, idx) => {
                const isActive = activeBeat === idx;
                return (
                  <article
                    key={beat.step}
                    ref={(el) => {
                      beatRefs.current[idx] = el;
                    }}
                    onClick={() => setActiveBeat(idx)}
                    className={`scrolly-beat-card rounded-3xl bg-white border p-5 sm:p-6 lg:px-5 lg:py-3.5 cursor-pointer ${
                      isActive ? 'is-active border-[#8b1d1d]' : 'is-inactive border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8b1d1d]">
                        Bước 0{idx + 1}
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          isActive ? 'bg-[#8b1d1d]' : 'bg-stone-300'
                        }`}
                      />
                    </div>
                    <h3 className="text-base sm:text-lg font-display font-extrabold text-[#1c1917] leading-snug">
                      {beat.title}
                    </h3>

                    {idx === STORY_BEATS.length - 1 && (
                      <div className="mt-4 pt-3.5 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/la-so-tu-vi');
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#8b1d1d] hover:bg-[#701616] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-colors cursor-pointer"
                        >
                          <span>Lập Lá Số Của Bạn Ngay</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* BIỂU ĐỒ NGŨ HÀNH & KHÍ VẬN (SOLID COLORS ONLY)                      */}
      {/* =================================================================== */}
      <section
        id="chapter-ngu-hanh"
        ref={nguHanhRef}
        className="relative py-14 sm:py-20 lg:py-8 lg:min-h-screen lg:flex lg:flex-col lg:justify-center bg-[#fcfaf7] overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="mx-auto text-center mb-10 sm:mb-12 lg:mb-8 scrolly-reveal">
            <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-display font-extrabold text-[#1c1917] tracking-tight leading-snug md:whitespace-nowrap">
              Nhịp Điều Hòa
              <br className="md:hidden" /> Tương Sinh – Tương Khắc
            </h2>
            <p className="mt-3 mx-auto text-[13px] sm:text-sm lg:text-[15px] text-stone-600 leading-relaxed lg:whitespace-nowrap">
              Chạm vào từng hành trong đồ hình Ngũ Hành để quan sát dòng chảy sinh khắc và cấu trúc năng lượng bản mệnh.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_auto_1fr] gap-6 lg:gap-7 items-stretch max-w-7xl mx-auto">
            {/* LEFT: ANIMATED SVG PENTAGRAM (Kích thước lớn, đường nối pathLength=100 sắc nét) */}
            <div className="scrolly-reveal relative rounded-3xl bg-white border border-stone-200 shadow-sm p-6 sm:p-9 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-[430px] aspect-square">
                <svg viewBox="0 0 400 390" className="w-full h-full overflow-visible">
                  {/* Vòng Tương Sinh (r=148, tâm 200,195) */}
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
                  {/* Ngôi sao 5 cánh Tương Khắc nối đúng tọa độ tâm 5 hành */}
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
                          r={isSelected ? 33 : 27}
                          fill={isSelected ? el.color : '#ffffff'}
                          stroke={el.color}
                          strokeWidth={isSelected ? '3' : '2.2'}
                          style={{ transition: 'all 280ms ease' }}
                        />
                        <text
                          x={el.cx}
                          y={el.cy + 5}
                          textAnchor="middle"
                          fill={isSelected ? '#ffffff' : el.color}
                          fontSize="14.5"
                          fontWeight="800"
                          style={{ pointerEvents: 'none', transition: 'fill 280ms ease' }}
                        >
                          {el.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="mt-4 flex items-center gap-6 text-xs font-semibold text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-[#1e5631] inline-block" />
                  Tương Sinh (Nuôi dưỡng)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-[#8b1d1d] inline-block" />
                  Tương Khắc (Chế ước)
                </span>
              </div>
            </div>

            {/* CENTER: VERTICAL MENU ĐỘC LẬP CHO 5 HÀNH */}
            <div
              role="tablist"
              aria-label="Chọn Ngũ Hành"
              className="scrolly-reveal scrolly-reveal-delay-1 flex flex-row lg:flex-col justify-center gap-2.5 overflow-x-auto lg:overflow-visible py-1"
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
                    className={`inline-flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer shrink-0 lg:min-w-[144px] ${
                      isSelected
                        ? 'bg-[#1c1917] text-white border-[#1c1917] shadow-sm'
                        : 'bg-white text-[#1c1917] border-stone-200 hover:border-[#8b1d1d] hover:text-[#8b1d1d]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>Hành {el.name}</span>
                  </button>
                );
              })}
            </div>

            {/* RIGHT: LIVE DATA VISUALIZATION PANEL (Tăng kích thước cân xứng) */}
            <div className="scrolly-reveal scrolly-reveal-delay-2 rounded-3xl bg-white border border-stone-200 shadow-sm p-6 sm:p-9 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-xl sm:text-2xl lg:text-[26px] font-display font-extrabold text-[#1c1917] mb-2.5">
                  Bản Mệnh Hành {currentElementData.name}
                </h3>
                <p className="text-sm sm:text-[15px] text-stone-600 leading-relaxed">
                  {currentElementData.traits}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-2xl bg-[#f6fbf7] border border-[#1e5631]/25 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#1e5631]">
                    Vượng Sinh
                  </div>
                  <div className="text-sm sm:text-[15px] font-bold text-[#1c1917] mt-1">
                    {currentElementData.sinh}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#fff8f8] border border-[#8b1d1d]/25 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8b1d1d]">
                    Chế Khắc
                  </div>
                  <div className="text-sm sm:text-[15px] font-bold text-[#1c1917] mt-1">
                    {currentElementData.khac}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {currentElementData.bars.map((bar) => (
                  <div key={bar.label}>
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-stone-700 mb-1.5">
                      <span>{bar.label}</span>
                      <span className="tabular-nums text-[#1c1917]">{bar.val}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-stone-100 overflow-hidden">
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
        </div>
      </section>
    </>
  );
}
