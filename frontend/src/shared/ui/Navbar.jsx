import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clearAllPersistedState } from '../persistence';
import { Link, useLocation } from 'react-router-dom';
import AuthModal from '../../features/auth/AuthModal';
import GoogleAvatar from './GoogleAvatar';
import { hasManagementAccess, isSandboxActive } from '../utils/authRoles';
import { prefersReducedMotion } from '../motion/pageTransition';

const coreTools = [
  { label: 'LÁ SỐ TỬ VI', to: '/la-so-tu-vi' },
  { label: 'TAROT KIỀU', to: '/boi-kieu' },
  { label: 'LỊCH VẠN SỰ', to: '/lich-van-su' },
  { label: 'PHONG THỦY', to: '/la-kinh-phong-thuy' },
  { label: 'KỲ MÔN', to: '/ky-mon-don-giap' },
  { label: 'PHẬT PHÁP', to: '/phat-phap' },
];

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDesktopNavHidden, setIsDesktopNavHidden] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [indicator, setIndicator] = useState({ x: 0, scaleX: 0, visible: false, hovering: false });
  const location = useLocation();
  const headerRef = useRef(null);
  const navMenuRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const scrollAccRef = useRef(0);
  const scrollRafRef = useRef(0);
  const dropdownTimerRef = useRef(0);
  const canAccessManagement = hasManagementAccess(user);
  const isToolActive = coreTools.some((item) => location.pathname === item.to);

  // Unified rAF scroll handler for Mobile auto-hide & Desktop compact/glass/auto-hide
  useEffect(() => {
    lastScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    scrollAccRef.current = 0;

    const updateScrollState = () => {
      scrollRafRef.current = 0;
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const diff = currentScrollY - lastScrollYRef.current;
      const isDesktop = window.innerWidth > 580;

      if (isDesktop) {
        setIsNavVisible(true);
        setIsScrolled(currentScrollY > 24);

        if (dropdownOpen || currentScrollY <= 140) {
          setIsDesktopNavHidden(false);
          scrollAccRef.current = 0;
        } else if (diff > 0) {
          if (scrollAccRef.current < 0) scrollAccRef.current = 0;
          scrollAccRef.current += diff;
          if (scrollAccRef.current > 48) {
            setIsDesktopNavHidden(true);
          }
        } else if (diff < 0) {
          if (scrollAccRef.current > 0) scrollAccRef.current = 0;
          scrollAccRef.current += diff;
          if (scrollAccRef.current < -16) {
            setIsDesktopNavHidden(false);
          }
        }

        lastScrollYRef.current = currentScrollY;
        return;
      }

      // Mobile (<= 580px)
      setIsDesktopNavHidden(false);
      setIsScrolled(currentScrollY > 12);

      if (mobileMenuOpen) {
        setIsNavVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (currentScrollY <= 20) {
        setIsNavVisible(true);
        scrollAccRef.current = 0;
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (diff > 0) {
        if (scrollAccRef.current < 0) scrollAccRef.current = 0;
        scrollAccRef.current += diff;
        if (scrollAccRef.current > 15) {
          setIsNavVisible(false);
        }
      } else if (diff < 0) {
        if (scrollAccRef.current > 0) scrollAccRef.current = 0;
        scrollAccRef.current += diff;
        if (scrollAccRef.current < -25) {
          setIsNavVisible(true);
        }
      }

      lastScrollYRef.current = currentScrollY;
    };

    const handleScroll = () => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = 0;
      }
    };
  }, [mobileMenuOpen, dropdownOpen]);

  useEffect(() => {
    // Dọn dẹp mọi token/session ẩn cũ còn sót lại trong trình duyệt
    localStorage.removeItem('tuvi_admin_token');
    localStorage.removeItem('tuvi_admin_user');

    const token = localStorage.getItem('tuvi_token');
    if (token && token.startsWith('dev_')) {
      localStorage.removeItem('tuvi_token');
      localStorage.removeItem('tuvi_user');
      return;
    }

    try {
      const saved = localStorage.getItem('tuvi_user');
      if (saved) setUser(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => {
          if (response.status === 401) {
            localStorage.removeItem('tuvi_token');
            localStorage.removeItem('tuvi_user');
            setUser(null);
            return null;
          }
          return response.ok ? response.json() : null;
        })
        .then((result) => {
          if (result?.user) {
            setUser(result.user);
            localStorage.setItem('tuvi_user', JSON.stringify(result.user));
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const syncUser = () => {
      try { setUser(JSON.parse(localStorage.getItem('tuvi_user') || 'null')); } catch { setUser(null); }
    };
    window.addEventListener('tuvi-auth-updated', syncUser);
    const handleOpenAuth = () => setAuthOpen(true);
    window.addEventListener('tuvi:open-auth', handleOpenAuth);
    return () => {
      window.removeEventListener('tuvi-auth-updated', syncUser);
      window.removeEventListener('tuvi:open-auth', handleOpenAuth);
    };
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('tuvi_token');
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {
      /* ignore */
    }
    localStorage.removeItem('tuvi_token');
    localStorage.removeItem('tuvi_user');
    clearAllPersistedState();
    setUser(null);
    window.dispatchEvent(new Event('tuvi:auth-logout'));
    window.dispatchEvent(new Event('tuvi-auth-updated'));
  };

  // Close mobile menu & dropdown when navigating to another route
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const measureNavItem = useCallback((liEl, hovering) => {
    const menuEl = navMenuRef.current;
    if (!menuEl || !liEl) {
      setIndicator((prev) => ({ ...prev, visible: false, hovering: false }));
      return;
    }
    const linkEl = liEl.querySelector(':scope > a');
    if (!linkEl) return;

    const cs = window.getComputedStyle(linkEl);
    const padLeft = parseFloat(cs.paddingLeft) || 0;
    const padRight = parseFloat(cs.paddingRight) || 0;
    let x = padLeft;
    let curr = linkEl;
    while (curr && curr !== menuEl) {
      x += curr.offsetLeft;
      curr = curr.offsetParent;
    }
    const width = Math.max(12, linkEl.offsetWidth - padLeft - padRight);

    setIndicator({
      x,
      scaleX: width / 100,
      visible: true,
      hovering,
    });
  }, []);

  const syncIndicatorToActive = useCallback(() => {
    const menuEl = navMenuRef.current;
    if (!menuEl) return;
    const activeLi = menuEl.querySelector('.nav-item.active');
    measureNavItem(activeLi, false);
  }, [measureNavItem]);

  useEffect(() => {
    syncIndicatorToActive();
    const menuEl = navMenuRef.current;
    if (!menuEl || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => syncIndicatorToActive());
    ro.observe(menuEl);
    return () => ro.disconnect();
  }, [location.pathname, canAccessManagement, syncIndicatorToActive]);

  const handleNavItemEnter = (event) => {
    measureNavItem(event.currentTarget, true);
  };

  const openDropdown = () => {
    if (dropdownTimerRef.current) {
      window.clearTimeout(dropdownTimerRef.current);
      dropdownTimerRef.current = 0;
    }
    setDropdownOpen(true);
  };

  const scheduleCloseDropdown = () => {
    if (dropdownTimerRef.current) {
      window.clearTimeout(dropdownTimerRef.current);
    }
    dropdownTimerRef.current = window.setTimeout(() => {
      setDropdownOpen(false);
      dropdownTimerRef.current = 0;
    }, 80);
  };

  useEffect(() => {
    return () => {
      if (dropdownTimerRef.current) {
        window.clearTimeout(dropdownTimerRef.current);
      }
    };
  }, []);

  const handleQuickBtnMouseMove = (event) => {
    if (prefersReducedMotion()) return;
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    const dx = Math.max(-3, Math.min(3, (event.clientX - (rect.left + rect.width / 2)) * 0.12));
    const dy = Math.max(-3, Math.min(3, (event.clientY - (rect.top + rect.height / 2)) * 0.18));
    btn.style.setProperty('--mag-x', `${dx.toFixed(2)}px`);
    btn.style.setProperty('--mag-y', `${dy.toFixed(2)}px`);
  };

  const handleQuickBtnMouseLeave = (event) => {
    const btn = event.currentTarget;
    btn.style.setProperty('--mag-x', '0px');
    btn.style.setProperty('--mag-y', '0px');
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <div
      className={`top-navigation-wrapper ${!isNavVisible ? 'mobile-nav-hidden' : ''} ${isScrolled ? 'is-scrolled' : ''}`}
      ref={headerRef}
    >
      {/* HEADER ROW */}
      <header className="header">
        <div className="header-container">
          <Link to="/" className="logo">
            <div className="brand-logo-wrap">
              <img src="/logo.png" alt="Tử Vi Hồng Ân Logo" className="brand-logo-img" />
            </div>
            <div className="logo-text">
              <h1 className="logo-main">TỬ VI HỒNG ÂN</h1>
            </div>
          </Link>

          {/* User Auth Badge (Google Avatar & Name/Email) - Desktop */}
          <div
            className="header-user-badge desktop-only"
            onClick={() => setAuthOpen(true)}
            title={user ? 'Quản lý tài khoản' : 'Đăng nhập tài khoản Google'}
          >
            <div className="user-avatar-wrap">
              {user?.avatar ? (
                <GoogleAvatar
                  src={user.avatar}
                  name={user.name}
                  className="user-avatar-img"
                  fallbackClassName="user-avatar-placeholder user-avatar-placeholder-text"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              )}
            </div>
            <div className="user-info-text">
              <span className="user-name-line">
                {user?.name || 'ĐĂNG NHẬP'}
                {isSandboxActive(user) && (
                  <span
                    style={{
                      marginLeft: '6px',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #f59e0b',
                      verticalAlign: 'middle',
                    }}
                  >
                    Sandbox Mode
                  </span>
                )}
              </span>
              <span className="user-email-line">
                {isSandboxActive(user) ? 'CHẾ ĐỘ GIẢ LẬP ĐANG BẬT' : (user?.email || 'TÀI KHOẢN GOOGLE')}
              </span>
            </div>
          </div>

          {/* 6 Quick Action Buttons (2 rows x 3 columns) */}
          <div className="header-quick-buttons desktop-only">
            <div className="quick-buttons-grid">
              {coreTools.map((btn) => (
                <Link
                  key={btn.label}
                  to={btn.to}
                  className={`header-quick-btn ${location.pathname === btn.to ? 'active' : ''}`}
                  onMouseMove={handleQuickBtnMouseMove}
                  onMouseLeave={handleQuickBtnMouseLeave}
                >
                  {btn.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile User Auth Button & Hamburger Menu Button */}
          <div className="mobile-header-controls mobile-only">
            <button
              type="button"
              className="mobile-auth-icon-btn"
              onClick={() => setAuthOpen(true)}
              aria-label={isSandboxActive(user) ? 'Tài khoản (Sandbox Mode)' : 'Đăng nhập'}
              style={isSandboxActive(user) ? { position: 'relative', outline: '2px solid #f59e0b', outlineOffset: '1px' } : undefined}
            >
              {user?.avatar ? (
                <GoogleAvatar
                  src={user.avatar}
                  name={user.name}
                  className="user-avatar-img-sm"
                  fallbackClassName="user-avatar-img-sm user-avatar-placeholder-text"
                />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              )}
            </button>

            {/* Menu 3 gạch đặt bên phải ảnh đại diện */}
            <button
              type="button"
              className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Bảng dropdown khi bấm vào nút 3 gạch */}
        {mobileMenuOpen && (
          <div className="mobile-menu-dropdown mobile-only">
            <ul className="mobile-nav-menu">
              <li className={location.pathname === '/' || location.pathname === '/home' ? 'active' : ''}>
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                  TRANG CHỦ
                </Link>
              </li>
              <li className={location.pathname.startsWith('/chuyen-muc') ? 'active' : ''}>
                <Link to="/chuyen-muc" onClick={() => setMobileMenuOpen(false)}>
                  BÀI VIẾT
                </Link>
              </li>
              <li className={location.pathname === '/dien-dan' ? 'active' : ''}>
                <Link to="/dien-dan" onClick={() => setMobileMenuOpen(false)}>
                  DIỄN ĐÀN
                </Link>
              </li>
              <li className={location.pathname === '/khoa-hoc' ? 'active' : ''}>
                <Link to="/khoa-hoc" onClick={() => setMobileMenuOpen(false)}>
                  KHÓA HỌC
                </Link>
              </li>
              {canAccessManagement && (
                <li className={location.pathname.startsWith('/quan-ly') ? 'active' : ''}>
                  <Link to="/quan-ly" onClick={() => setMobileMenuOpen(false)}>
                    QUẢN LÝ
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Thanh 6 nút điều hướng công cụ nhanh cố định trên Mobile */}
        <div className="mobile-header-quick-bar mobile-only">
          <div className="mobile-quick-grid">
            {coreTools.map((tool) => {
              const isActive = location.pathname === tool.to;
              return (
                <Link
                  key={tool.label}
                  to={tool.to}
                  className={`mobile-quick-item ${isActive ? 'active' : ''}`}
                >
                  {tool.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* DESKTOP NAVBAR ROW (Hidden on mobile) */}
      <nav
        className={`navbar desktop-only ${isDesktopNavHidden ? 'desktop-nav-hidden' : ''} ${isScrolled ? 'is-scrolled' : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setDropdownOpen(false);
        }}
      >
        <div className="navbar-container">
          <ul
            className="nav-menu"
            ref={navMenuRef}
            data-indicator-ready={indicator.visible ? 'true' : 'false'}
            onMouseLeave={syncIndicatorToActive}
          >
            <li
              className={location.pathname === '/' || location.pathname === '/home' ? 'nav-item active' : 'nav-item'}
              onMouseEnter={handleNavItemEnter}
            >
              <Link to="/">TRANG CHỦ</Link>
            </li>
            <li
              className={`nav-item has-dropdown ${isToolActive ? 'active' : ''} ${dropdownOpen ? 'is-open' : ''}`}
              onMouseEnter={(e) => {
                handleNavItemEnter(e);
                openDropdown();
              }}
              onMouseLeave={scheduleCloseDropdown}
              onFocus={openDropdown}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setDropdownOpen(false);
                }
              }}
            >
              <Link to="/la-so-tu-vi" aria-expanded={dropdownOpen}>
                CÔNG CỤ <span className="caret">▾</span>
              </Link>
              <ul className="dropdown-menu">
                {coreTools.map((item, idx) => (
                  <li key={item.label} style={{ '--dd-index': idx }}>
                    <Link
                      to={item.to}
                      className={location.pathname === item.to ? 'active' : ''}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span className="dd-label">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li
              className={location.pathname.startsWith('/chuyen-muc') ? 'nav-item active' : 'nav-item'}
              onMouseEnter={handleNavItemEnter}
            >
              <Link to="/chuyen-muc">BÀI VIẾT</Link>
            </li>
            <li
              className={location.pathname === '/dien-dan' ? 'nav-item active' : 'nav-item'}
              onMouseEnter={handleNavItemEnter}
            >
              <Link to="/dien-dan">DIỄN ĐÀN</Link>
            </li>
            <li
              className={location.pathname === '/khoa-hoc' ? 'nav-item active' : 'nav-item'}
              onMouseEnter={handleNavItemEnter}
            >
              <Link to="/khoa-hoc">KHÓA HỌC</Link>
            </li>
            {canAccessManagement && (
              <li
                className={location.pathname.startsWith('/quan-ly') ? 'nav-item active' : 'nav-item'}
                onMouseEnter={handleNavItemEnter}
              >
                <Link to="/quan-ly">QUẢN LÝ</Link>
              </li>
            )}
            <li
              aria-hidden="true"
              className={`nav-sliding-indicator ${indicator.hovering ? 'is-hovering' : ''}`}
              style={{
                opacity: indicator.visible ? 1 : 0,
                transform: `translate3d(${indicator.x}px, 0, 0) scaleX(${indicator.scaleX})`,
              }}
            />
          </ul>
        </div>
      </nav>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        user={user}
        onAuthSuccess={(u) => setUser(u)}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default Navbar;
