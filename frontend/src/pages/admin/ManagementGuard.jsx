import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, Home, ShieldAlert, ArrowLeft } from 'lucide-react';
import { hasManagementAccess, isAdminOrDeveloper } from '../../shared/utils/authRoles';
import './QuanLy.css';

export default function ManagementGuard({ requireAdmin = false, children }) {
  const navigate = useNavigate();
  const abortRef = useRef(null);
  const [state, setState] = useState({
    checking: true,
    user: null,
    reason: '',
  });

  const verifyAccess = useCallback(async ({ showLoading = false } = {}) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const token = localStorage.getItem('tuvi_token');
    if (!token || token.startsWith('dev_')) {
      if (token && token.startsWith('dev_')) {
        localStorage.removeItem('tuvi_token');
        localStorage.removeItem('tuvi_user');
      }
      setState({ checking: false, user: null, reason: 'unauthenticated' });
      return;
    }

    if (showLoading) {
      setState((prev) => ({ ...prev, checking: true }));
    }
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (response.status === 401) {
        localStorage.removeItem('tuvi_token');
        localStorage.removeItem('tuvi_user');
        setState({ checking: false, user: null, reason: 'unauthenticated' });
        window.dispatchEvent(new Event('tuvi-auth-updated'));
        return;
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.user) {
        setState({ checking: false, user: null, reason: 'unauthenticated' });
        return;
      }

      const verifiedUser = result.user;
      localStorage.setItem('tuvi_user', JSON.stringify(verifiedUser));

      const allowed = requireAdmin
        ? isAdminOrDeveloper(verifiedUser)
        : hasManagementAccess(verifiedUser);

      if (!allowed) {
        setState({ checking: false, user: verifiedUser, reason: 'forbidden' });
        return;
      }

      setState({ checking: false, user: verifiedUser, reason: '' });
    } catch (error) {
      if (error.name === 'AbortError') return;
      setState({ checking: false, user: null, reason: 'unauthenticated' });
    }
  }, [requireAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      verifyAccess();
    }, 0);

    const handleAuthChange = () => {
      verifyAccess({ showLoading: true });
    };
    window.addEventListener('tuvi-auth-updated', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.clearTimeout(timer);
      if (abortRef.current) {
        abortRef.current.abort();
      }
      window.removeEventListener('tuvi-auth-updated', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [verifyAccess]);

  if (state.checking) {
    return (
      <main className="management-guard-page">
        <section className="management-guard-card" aria-live="polite">
          <div className="management-guard-icon">
            <Lock size={26} />
          </div>
          <span className="customer-admin-eyebrow">KIỂM TRA QUYỀN TRUY CẬP</span>
          <h1>Đang xác thực tài khoản…</h1>
          <p>Vui lòng chờ trong giây lát.</p>
        </section>
      </main>
    );
  }

  if (!state.user || state.reason) {
    const isUnauthenticated = state.reason === 'unauthenticated' || !state.user;
    const canGoBackToQuanLy = requireAdmin && hasManagementAccess(state.user);

    return (
      <main className="management-guard-page">
        <section className="management-guard-card" role="alert">
          <div className={`management-guard-icon ${isUnauthenticated ? 'is-locked' : 'is-denied'}`}>
            {isUnauthenticated ? <Lock size={28} /> : <ShieldAlert size={28} />}
          </div>
          <span className="customer-admin-eyebrow">
            {isUnauthenticated ? 'YÊU CẦU ĐĂNG NHẬP' : 'TRUY CẬP BỊ CHẶN'}
          </span>
          <h1>
            {isUnauthenticated
              ? 'Không thể truy cập trang Quản lý'
              : 'Tài khoản không có quyền truy cập'}
          </h1>
          <p>
            {isUnauthenticated
              ? 'Khu vực Quản lý chỉ dành cho tài khoản được cấp quyền Nhà phát triển, Quản trị viên hoặc Cộng tác viên. Vui lòng đăng nhập để tiếp tục.'
              : requireAdmin
                ? 'Trang này chỉ dành cho tài khoản được cấp quyền Nhà phát triển hoặc Quản trị viên.'
                : `Tài khoản ${state.user?.email || ''} hiện chưa được cấp quyền Nhà phát triển, Quản trị viên hoặc Cộng tác viên để truy cập trang này.`}
          </p>
          <div className="management-guard-actions">
            {isUnauthenticated ? (
              <button
                type="button"
                className="management-guard-btn primary"
                onClick={() => window.dispatchEvent(new CustomEvent('tuvi:open-auth'))}
              >
                <LogIn size={16} /> Đăng nhập tài khoản
              </button>
            ) : (
              <button
                type="button"
                className="management-guard-btn secondary"
                onClick={() => window.dispatchEvent(new CustomEvent('tuvi:open-auth'))}
              >
                <LogIn size={16} /> Đổi tài khoản
              </button>
            )}
            {canGoBackToQuanLy && (
              <button
                type="button"
                className="management-guard-btn secondary"
                onClick={() => navigate('/quan-ly')}
              >
                <ArrowLeft size={16} /> Quay lại trang Quản lý
              </button>
            )}
            <button
              type="button"
              className={`management-guard-btn ${isUnauthenticated ? 'secondary' : 'primary'}`}
              onClick={() => navigate('/')}
            >
              <Home size={16} /> Về trang chủ
            </button>
          </div>
        </section>
      </main>
    );
  }

  return React.isValidElement(children)
    ? React.cloneElement(children, { currentUser: state.user })
    : children;
}
