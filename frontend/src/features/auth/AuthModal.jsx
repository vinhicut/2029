import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getRoleBadgeInfo, isDeveloperAccount, isSandboxActive } from '../../shared/utils/authRoles';
import { useBodyScrollLock } from '../../shared/utils/scrollLock';
import './AuthModal.css';

const API = import.meta.env.VITE_API_URL || '';

function AuthModal({ open, onClose, user, onAuthSuccess, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [privacyActionLoading, setPrivacyActionLoading] = useState(false);
  const [privacyFeedback, setPrivacyFeedback] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [quota, setQuota] = useState({
    aiCredits: 0,
    unlimited: false,
    isDeveloper: false,
    isSandbox: false,
  });

  const googleBtnRef = useRef(null);
  const consentMarketingRef = useRef(false);

  useEffect(() => {
    consentMarketingRef.current = consentMarketing;
  }, [consentMarketing]);

  useEffect(() => {
    if (open) {
      setConsentRequired(false);
      setConsentMarketing(false);
      setPrivacyFeedback('');
      setConfirmDeleteOpen(false);
      setError('');
    }
  }, [open, user]);

  const fetchQuota = useCallback(async () => {
    const token = localStorage.getItem('tuvi_token');
    if (!token || !user) return;
    try {
      const res = await fetch(`${API}/api/ai/user-quota`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setQuota({
        aiCredits: Number(data.ai_credits ?? data.credits ?? 0),
        unlimited: Boolean(data.unlimited || data.is_admin),
        isDeveloper: Boolean(data.is_developer),
        isSandbox: Boolean(data.is_sandbox),
      });
    } catch {
      // Giữ nguyên giá trị mặc định nếu không kết nối được
    }
  }, [user]);

  useEffect(() => {
    if (!open || !user) return;
    fetchQuota();
    const handleQuotaUpdated = () => fetchQuota();
    window.addEventListener('tuvi:quota-updated', handleQuotaUpdated);
    return () => window.removeEventListener('tuvi:quota-updated', handleQuotaUpdated);
  }, [open, user, fetchQuota]);

  // Khởi tạo Google Identity Services (GSI)
  useEffect(() => {
    if (!open || user) return;
    setError('');

    const initGoogleGSI = () => {
      const clientId =
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '714306691526-iq2uodqu69fdcdalibn2ipgia2t4lqvs.apps.googleusercontent.com';

      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            width: 300,
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        } catch (e) {
          console.warn('Google GSI initialization notice:', e);
        }
      }
    };

    const timer = setTimeout(initGoogleGSI, 120);
    return () => clearTimeout(timer);
  }, [open, user]);

  // Khóa cuộn trang toàn cục khi thẻ Đăng nhập hoặc Tài khoản đang hiển thị
  useBodyScrollLock(open);

  if (!open) return null;

  // Xử lý đăng nhập Google OAuth
  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credential: response.credential,
          consent_terms: true,
          consent_marketing: Boolean(consentMarketingRef.current),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Xác thực Google thất bại');

      localStorage.setItem('tuvi_token', data.token);
      localStorage.setItem('tuvi_user', JSON.stringify(data.user));
      onAuthSuccess?.(data.user);
      window.dispatchEvent(new Event('tuvi-auth-updated'));
      onClose?.();
    } catch (err) {
      setError(err.message || 'Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPersonalData = async () => {
    const token = localStorage.getItem('tuvi_token');
    setPrivacyActionLoading(true);
    setPrivacyFeedback('');
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/my-data/export`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể xuất dữ liệu cá nhân.');
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tuvi-hong-an-du-lieu-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPrivacyFeedback('Đã tải xuống bản sao dữ liệu cá nhân.');
    } catch (err) {
      setError(err.message || 'Lỗi khi tải xuống dữ liệu cá nhân.');
    } finally {
      setPrivacyActionLoading(false);
    }
  };

  const handleDeleteAccountSelf = async () => {
    const token = localStorage.getItem('tuvi_token');
    setPrivacyActionLoading(true);
    setPrivacyFeedback('');
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/my-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể xóa tài khoản.');
      }
      setConfirmDeleteOpen(false);
      onLogout?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Lỗi khi yêu cầu xóa tài khoản.');
    } finally {
      setPrivacyActionLoading(false);
    }
  };

  const handleToggleSandbox = async () => {
    const token = localStorage.getItem('tuvi_token');
    if (!token) return;
    const nextEnabled = !(isSandboxActive(user) || quota.isSandbox);
    setSandboxLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể chuyển đổi Chế độ giả lập.');
      }
      if (data.user) {
        localStorage.setItem('tuvi_user', JSON.stringify(data.user));
        onAuthSuccess?.(data.user);
      }
      await fetchQuota();
      window.dispatchEvent(new Event('tuvi-auth-updated'));
      window.dispatchEvent(new CustomEvent('tuvi:quota-updated'));
    } catch (err) {
      setError(err.message || 'Lỗi khi thay đổi Chế độ giả lập.');
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout?.();
    onClose?.();
  };

  const modalContent = (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        aria-label="Cửa sổ đăng nhập"
      >
        <button className="auth-close" onClick={onClose} type="button" title="Đóng">
          ×
        </button>

        {user ? (
          /* TRẠNG THÁI: ĐÃ ĐĂNG NHẬP */
          (() => {
            const roleBadge = getRoleBadgeInfo(user);
            const canUseSandbox = isDeveloperAccount(user) || Boolean(quota.isDeveloper);
            const sandboxActive = canUseSandbox && (isSandboxActive(user) || Boolean(quota.isSandbox));
            const formatCredit = (val) =>
              quota.unlimited ? 'Không giới hạn' : `${String(val).padStart(2, '0')} lượt`;
            return (
              <div className="auth-logged-in-box">
                <div className="auth-user-card">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="auth-user-avatar-lg" />
                  ) : (
                    <div className="auth-user-avatar-lg default">👤</div>
                  )}
                  <div className="auth-user-name">{user.name}</div>
                  <div className="auth-user-email">{user.email}</div>
                  <div className="auth-badges-row">
                    <span className={`auth-role-badge auth-role-badge--${roleBadge.variant}`}>
                      {roleBadge.label}
                    </span>
                    {sandboxActive && (
                      <span className="auth-sandbox-badge" title="Phiên giả lập người dùng đang hoạt động">
                        Sandbox Mode
                      </span>
                    )}
                  </div>
                </div>

                <div className="auth-quota-section">
                  <div className="auth-quota-title">
                    {sandboxActive ? 'Số dư dịch vụ (Chế độ giả lập)' : 'Số dư dịch vụ'}
                  </div>
                  <div className="auth-quota-list">
                    <div className="auth-quota-item">
                      <span className="auth-quota-name">Luận giải Tử Vi AI</span>
                      <span className="auth-quota-value">{formatCredit(quota.aiCredits)}</span>
                    </div>
                  </div>
                </div>

                {canUseSandbox && (
                  <div className={`auth-sandbox-panel ${sandboxActive ? 'is-active' : ''}`}>
                    <div className="auth-sandbox-header">
                      <span className="auth-sandbox-title">Giả lập người dùng (Sandbox Mode)</span>
                      <span className={`auth-sandbox-status ${sandboxActive ? 'on' : 'off'}`}>
                        {sandboxActive ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                      </span>
                    </div>
                    <p className="auth-sandbox-desc">
                      {sandboxActive
                        ? 'Số dư khởi tạo bằng 0, hạn mức thanh toán vô hạn trong phiên làm việc này.'
                        : 'Bật để trải nghiệm luồng thanh toán và số dư 0 lượt như người dùng mới.'}
                    </p>
                    <button
                      type="button"
                      className={`btn-auth-sandbox ${sandboxActive ? 'is-active' : ''}`}
                      onClick={handleToggleSandbox}
                      disabled={sandboxLoading}
                    >
                      {sandboxLoading
                        ? 'Đang chuyển trạng thái...'
                        : sandboxActive
                        ? 'Tắt Chế độ giả lập'
                        : 'Kích hoạt Chế độ giả lập'}
                    </button>
                  </div>
                )}

                <div className="auth-privacy-box">
                  <div className="auth-privacy-title">Quyền dữ liệu cá nhân (NĐ 13/2023)</div>
                  <div className="auth-privacy-actions">
                    <button
                      type="button"
                      className="btn-auth-secondary"
                      onClick={handleExportPersonalData}
                      disabled={privacyActionLoading}
                    >
                      Tải dữ liệu cá nhân
                    </button>
                    <button
                      type="button"
                      className="btn-auth-danger-outline"
                      onClick={() => setConfirmDeleteOpen((prev) => !prev)}
                      disabled={privacyActionLoading}
                    >
                      Xóa tài khoản
                    </button>
                  </div>

                  {confirmDeleteOpen && (
                    <div className="auth-delete-confirm">
                      <p>
                        Bạn chắc chắn muốn xóa vĩnh viễn tài khoản và toàn bộ lá số, lịch sử hỏi đáp?
                        Thao tác này không thể khôi phục.
                      </p>
                      <div className="auth-delete-confirm-btns">
                        <button
                          type="button"
                          className="btn-auth-cancel"
                          onClick={() => setConfirmDeleteOpen(false)}
                          disabled={privacyActionLoading}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          className="btn-auth-confirm-delete"
                          onClick={handleDeleteAccountSelf}
                          disabled={privacyActionLoading}
                        >
                          {privacyActionLoading ? 'Đang xử lý...' : 'Xác nhận xóa vĩnh viễn'}
                        </button>
                      </div>
                    </div>
                  )}

                  {privacyFeedback && <div className="auth-privacy-success">{privacyFeedback}</div>}
                  {error && <div className="auth-error">{error}</div>}
                </div>

                <button type="button" className="btn-auth-logout" onClick={handleLogout}>
                  ĐĂNG XUẤT
                </button>
              </div>
            );
          })()
        ) : (
          /* TRẠNG THÁI: CHƯA ĐĂNG NHẬP (BỐ CỤC DỌC MỚI) */
          <div className="auth-signin-box">
            {/* VỊ TRÍ 1: LOGO GOOGLE LỚN TRÊN CÙNG */}
            <div className="auth-google-logo-wrapper">
              <svg
                className="auth-google-large-logo"
                viewBox="0 0 48 48"
                width="84"
                height="84"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
            </div>

            {/* VỊ TRÍ 2: DÒNG VĂN BẢN GHI CHÚ / HƯỚNG DẪN Ở GIỮA */}
            <p className="auth-single-instruction">
              Đăng nhập để lưu trữ<br />và quản lý các lá số của bạn
            </p>

            {/* Ô TÍCH ĐỒNG Ý THEO NGHỊ ĐỊNH 13/2023 (KHÔNG PRE-TICK) */}
            <div className="auth-consent-group">
              <label className="auth-consent-item">
                <input
                  type="checkbox"
                  checked={consentRequired}
                  onChange={(e) => {
                    setConsentRequired(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                />
                <span>
                  Tôi đã đọc và đồng ý với{' '}
                  <a href="/dieu-khoan" target="_blank" rel="noopener noreferrer">
                    Điều khoản sử dụng
                  </a>{' '}
                  và{' '}
                  <a href="/chinh-sach" target="_blank" rel="noopener noreferrer">
                    Chính sách bảo vệ dữ liệu cá nhân
                  </a>{' '}
                  (bắt buộc).
                </span>
              </label>

              <label className="auth-consent-item optional">
                <input
                  type="checkbox"
                  checked={consentMarketing}
                  onChange={(e) => setConsentMarketing(e.target.checked)}
                />
                <span>
                  Tôi đồng ý nhận bản tin cập nhật kiến thức Tử Vi và thông báo ưu đãi mới (tùy chọn).
                </span>
              </label>
            </div>

            {error && <div className="auth-error">{error}</div>}

            {/* VỊ TRÍ 3: NÚT BẤM ĐĂNG NHẬP BẰNG GOOGLE DƯỚI CÙNG */}
            <div className={`auth-google-gate ${consentRequired ? 'unlocked' : 'locked'}`}>
              <div className="google-btn-wrapper" ref={googleBtnRef}></div>
              {!consentRequired && (
                <button
                  type="button"
                  className="auth-google-gate-blocker"
                  aria-label="Vui lòng đồng ý điều khoản trước khi đăng nhập bằng Google"
                  onClick={() =>
                    setError(
                      'Vui lòng tích đồng ý Điều khoản sử dụng & Chính sách bảo vệ dữ liệu cá nhân trước khi đăng nhập.'
                    )
                  }
                />
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="auth-loading-overlay">
            <div className="spinner-small"></div>
            <span>Đang xác thực Google...</span>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

export default AuthModal;
