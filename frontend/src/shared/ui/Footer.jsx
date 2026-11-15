import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Compass,
  BookOpen,
  Crown,
  UserCheck,
  CalendarDays,
  ShieldCheck,
  GraduationCap,
  FileText,
  Scale,
  BadgeCheck,
} from 'lucide-react';
import { LEGAL_ENTITY_INFO } from '../constants/legalInfo';
import './Footer.css';

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleCommercialServiceClick = () => {
    if (location.pathname === '/' || location.pathname === '/home') {
      const el = document.getElementById('service');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate('/#service');
    setTimeout(() => {
      const el = document.getElementById('service');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <footer className="site-footer bg-[#f4efe6] border-t border-amber-200/80 text-stone-600 text-xs pt-12 pb-8 w-full mt-auto">
      <div className="site-footer-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="site-footer-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cột 1: Thông tin thương hiệu */}
          <div className="site-footer-col space-y-3 md:col-span-1">
            <div className="site-footer-brand-title flex items-center gap-2">
              <div className="site-footer-logo-wrap w-8 h-8 rounded-full overflow-hidden border border-amber-400 bg-[#fffaf2] shadow-xs shrink-0">
                <img
                  src="/logo.png"
                  alt="Tử Vi Hồng Ân Logo"
                  className="site-footer-logo-img w-full h-full object-cover"
                />
              </div>
              <span className="site-footer-brand-name font-bold text-base text-stone-900 tracking-wide">
                Tử Vi Hồng Ân
              </span>
            </div>
            <p className="site-footer-desc text-stone-600 text-xs leading-relaxed">
              Khai sáng vận mệnh, hòa hợp nhân duyên và kiến tạo phong thủy cát tường dựa trên tinh hoa học thuật Đông phương chính thống.
            </p>
            <div className="site-footer-web text-stone-900 font-semibold text-xs">
              Website:{' '}
              <a
                href="https://www.tuvihongan.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-800 underline hover:text-red-700 font-bold"
              >
                tuvihongan.com
              </a>
            </div>
          </div>

          {/* Cột 2: Dịch Vụ Miễn Phí */}
          <div className="site-footer-col space-y-2.5">
            <span className="site-footer-col-title text-xs font-bold text-stone-900 uppercase tracking-wider block">
              Dịch Vụ Miễn Phí
            </span>
            <ul className="site-footer-list space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/la-so-tu-vi')}
                  className="site-footer-btn hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer text-stone-700 text-left"
                >
                  <Sparkles className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Lập Lá Số Tử Vi</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/la-kinh-phong-thuy')}
                  className="site-footer-btn hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer text-stone-700 text-left"
                >
                  <Compass className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Bát Quái, Phong Thủy</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/boi-kieu')}
                  className="site-footer-btn hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer text-stone-700 text-left"
                >
                  <BookOpen className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Tarot Kiều - Xin Quẻ Bói Kiều</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/lich-van-su')}
                  className="site-footer-btn hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer text-stone-700 text-left"
                >
                  <CalendarDays className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Lịch Vạn Sự</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/ky-mon-don-giap')}
                  className="site-footer-btn hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer text-stone-700 text-left"
                >
                  <ShieldCheck className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Kỳ Môn Độn Giáp</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/phat-phap')}
                  className="site-footer-btn hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer text-stone-700 text-left"
                >
                  <Sparkles className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Phật Pháp</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Cột 3: Dịch Vụ Thương Mại */}
          <div className="site-footer-col space-y-2.5">
            <span className="site-footer-col-title text-xs font-bold text-stone-900 uppercase tracking-wider block">
              DỊCH VỤ THƯƠNG MẠI
            </span>
            <ul className="site-footer-list space-y-2 text-stone-700">
              <li>
                <button
                  type="button"
                  onClick={handleCommercialServiceClick}
                  className="site-footer-btn highlight hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer font-bold text-red-700 text-left"
                >
                  <Crown className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Luận Giải AI</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleCommercialServiceClick}
                  className="site-footer-btn highlight hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer font-bold text-red-700 text-left"
                >
                  <UserCheck className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Luận Giải Trực Tiếp 1-1</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/khoa-hoc')}
                  className="site-footer-btn highlight hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer font-bold text-red-700 text-left"
                >
                  <GraduationCap className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Khóa Học</span>
                </button>
              </li>
            </ul>

            <div className="site-footer-col pt-3 mt-3 border-t border-amber-200/70">
              <span className="site-footer-col-title text-xs font-bold text-stone-900 uppercase tracking-wider block">
                Chính Sách &amp; Điều Khoản
              </span>
              <ul className="site-footer-list space-y-2 text-stone-700">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/chinh-sach')}
                    className="site-footer-btn hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer text-stone-700 text-left"
                  >
                    <FileText className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Chính sách bảo mật (NĐ 13/2023)</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/dieu-khoan')}
                    className="site-footer-btn hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer text-stone-700 text-left"
                  >
                    <Scale className="site-footer-icon w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Điều khoản &amp; Thanh toán / Hoàn tiền</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tạm ẩn thông tin định danh chủ quản & Khu vực thông báo Bộ Công Thương chờ hoàn tất thủ tục */}
        {false && (
          <div className="site-footer-legal-bar">
            <div className="site-footer-legal-info">
              <div className="site-footer-legal-operator">{LEGAL_ENTITY_INFO.operatorName}</div>
              <div className="site-footer-legal-meta">
                <span>{LEGAL_ENTITY_INFO.taxIdPlaceholder}</span>
                <span> • </span>
                <span>{LEGAL_ENTITY_INFO.address}</span>
              </div>
              <div className="site-footer-legal-meta">
                <span>Email: {LEGAL_ENTITY_INFO.email}</span>
                <span> • </span>
                <span>Bảo vệ dữ liệu: {LEGAL_ENTITY_INFO.dpoEmail}</span>
                <span> • </span>
                <span>Hotline: 0941.300.629 — 0899.483.393</span>
              </div>
            </div>

            <a
              href="http://online.gov.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer-bct-badge"
              title={LEGAL_ENTITY_INFO.bctStatusLabel}
            >
              <BadgeCheck className="site-footer-bct-icon" />
              <div className="site-footer-bct-text">
                <span className="site-footer-bct-label">Bộ Công Thương (online.gov.vn)</span>
                <span className="site-footer-bct-sub">Hồ sơ thông báo TMĐT — Chờ gắn logo xác thực</span>
              </div>
            </a>
          </div>
        )}

        <div className="site-footer-bottom">
          <p className="site-footer-copyright">
            © {new Date().getFullYear()} {LEGAL_ENTITY_INFO.brandName}. Bảo lưu mọi quyền.
          </p>
        </div>
      </div>
    </footer>
  );
}
