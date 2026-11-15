import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePaymentPolling } from '../hooks/usePaymentPolling';
import { createBillingOrder, confirmSandboxOrder, fetchAccountQuota } from '../api/billingApi';
import { useBodyScrollLock } from '../../../shared/utils/scrollLock';
import '../Billing.css';

const OFFICIAL_ZALO_PHONES = ['0924.616.199', '0385.497.085'];

function ZaloIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect width="48" height="48" rx="12" fill="#0068FF" />
      <path
        d="M35.2 22.9c0 6.1-5.1 11-11.4 11-1.9 0-3.7-.4-5.3-1.2l-5.7 1.8 1.7-5c-1.3-1.8-2.1-4.1-2.1-6.6 0-6.1 5.1-11 11.4-11 6.3 0 11.4 4.9 11.4 11Z"
        fill="#FFFFFF"
      />
      <path
        d="M17.3 19.8h5.3l-5.4 6.6v.1h5.6v1.7h-7.8v-.1l5.3-6.6h-5v-1.7h2Z"
        fill="#0068FF"
      />
      <path
        d="M25.6 28.2c-1.4 0-2.5-1.1-2.5-2.6 0-1.5 1.1-2.6 2.5-2.6.8 0 1.4.3 1.8.8v-.7h1.6v5h-1.6v-.7c-.4.5-1 .8-1.8.8Zm.4-1.4c.7 0 1.3-.5 1.3-1.2 0-.7-.6-1.2-1.3-1.2-.7 0-1.3.5-1.3 1.2 0 .7.6 1.2 1.3 1.2ZM30.1 19.6h1.6v8.6h-1.6v-8.6Z"
        fill="#0068FF"
      />
    </svg>
  );
}

// Bộ nhớ đệm nhẹ giúp kích thước và số dư hiển thị tức thì ngay khi mở modal
let cachedAccountQuota = null;
let inflightQuotaPromise = null;

if (typeof window !== 'undefined') {
  const clearCachedQuota = () => {
    cachedAccountQuota = null;
  };
  window.addEventListener('tuvi-auth-updated', clearCachedQuota);
  window.addEventListener('tuvi:auth-logout', clearCachedQuota);
}

/**
 * Tải ngầm hạn mức tài khoản trước khi người dùng mở modal thanh toán.
 */
export async function prefetchAccountQuota() {
  if (inflightQuotaPromise) return inflightQuotaPromise;
  inflightQuotaPromise = fetchAccountQuota()
    .then((q) => {
      cachedAccountQuota = q;
      return q;
    })
    .catch(() => cachedAccountQuota)
    .finally(() => {
      inflightQuotaPromise = null;
    });
  return inflightQuotaPromise;
}

/**
 * PaymentModal - Modal Thanh Toán SePay Tinh Gọn, Trực Diện & Đảm Bảo Quyền Lợi
 * 1. Chỉ có 2 gói dịch vụ chuẩn: "Luận giải AI" và "Luận giải trực tiếp 1-1".
 * 2. Mã QR kích thước lớn, căn giữa.
 * 3. Số tài khoản nằm chính giữa ngay dưới mã QR.
 * 4. Nội dung chuyển khoản và nhãn chung 1 dòng căn giữa.
 * 5. Xử lý an toàn khi khách chuyển khoản lúc còn dưới 3 phút.
 */
export default function PaymentModal({
  isOpen,
  onClose,
  packageInfo,
  order: initialOrder = null,
  onSuccess,
  onOpenAuth,
  onUseExistingQuota
}) {
  const [step, setStep] = useState('DETAILS'); // 'DETAILS' | 'PAYMENT'
  const [order, setOrder] = useState(initialOrder);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút
  const [accountQuota, setAccountQuota] = useState(cachedAccountQuota);
  const [isClosing, setIsClosing] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);
  const [sandboxCountdown, setSandboxCountdown] = useState(5);
  const [sandboxPaid, setSandboxPaid] = useState(false);
  const [sandboxConfirming, setSandboxConfirming] = useState(false);
  const [sandboxError, setSandboxError] = useState('');
  const [fallbackZaloPhone] = useState(
    () => OFFICIAL_ZALO_PHONES[Math.floor(Math.random() * OFFICIAL_ZALO_PHONES.length)]
  );
  const closeTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  // Xử lý đóng modal kèm hiệu ứng fade-out êm dịu (khớp animation CSS 240ms)
  const handleRequestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setIsClosing(false);
      onClose();
    }, 255);
  }, [isClosing, onClose]);

  // Đóng modal khi bấm phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleRequestClose]);

  // Tải thông tin hạn mức và lượt khả dụng của tài khoản (tránh re-render nếu không đổi)
  const loadQuota = useCallback(async () => {
    try {
      const q = await prefetchAccountQuota();
      setAccountQuota((prev) => (JSON.stringify(prev) === JSON.stringify(q) ? prev : q));
      return q;
    } catch (_err) {
      cachedAccountQuota = null;
      setAccountQuota(null);
      return null;
    }
  }, []);

  // Đồng bộ order ban đầu hoặc reset khi mở modal
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsClosing(false);
      loadQuota();
      if (initialOrder) {
        setOrder(initialOrder);
        setStep('PAYMENT');
      } else {
        setStep('DETAILS');
      }
      setErrorMessage('');
      setTimeLeft(900);
      setSandboxCountdown(5);
      setSandboxPaid(false);
      setSandboxConfirming(false);
      setSandboxError('');
    }
  }, [isOpen, initialOrder, loadQuota]);

  const isSandboxMode = Boolean(order?.is_sandbox || accountQuota?.is_sandbox);

  // Hook Polling lắng nghe trạng thái thanh toán từ SePay (tắt khi đang ở Chế độ giả lập)
  const { status, refetch } = usePaymentPolling({
    orderCode: order?.order_code,
    enabled: isOpen && step === 'PAYMENT' && !!order?.order_code && !isSandboxMode,
    timeoutMs: 1200000,
    onSuccess: async (data) => {
      const updatedQuota = await loadQuota();
      localStorage.removeItem('tuvi_pending_checkout');
      window.dispatchEvent(
        new CustomEvent('tuvi:quota-updated', {
          detail: { quota: updatedQuota, order: data }
        })
      );
      if (onSuccess) {
        onSuccess(data);
      }
    }
  });

  // Luồng thanh toán giả lập 5 giây: Đếm ngược 5 -> 0 rồi tự động xác nhận thành công
  useEffect(() => {
    if (!isOpen || step !== 'PAYMENT' || !isSandboxMode || !order?.order_code || sandboxPaid) {
      return;
    }

    let cancelled = false;
    setSandboxCountdown(5);
    setSandboxError('');

    const tickInterval = setInterval(() => {
      setSandboxCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    const confirmTimer = setTimeout(async () => {
      if (cancelled) return;
      setSandboxCountdown(0);
      setSandboxConfirming(true);
      try {
        const res = await confirmSandboxOrder(order.order_code);
        if (cancelled) return;
        const confirmedData = res?.data || { ...order, status: 'PAID', credits_added: 1 };
        setOrder((prev) => ({ ...(prev || {}), ...confirmedData }));
        setSandboxPaid(true);
        cachedAccountQuota = null;
        const updatedQuota = await loadQuota();
        localStorage.removeItem('tuvi_pending_checkout');
        window.dispatchEvent(
          new CustomEvent('tuvi:quota-updated', {
            detail: { quota: updatedQuota, order: confirmedData }
          })
        );
        if (onSuccess) {
          onSuccess(confirmedData);
        }
      } catch (err) {
        if (!cancelled) {
          setSandboxError(err.message || 'Lỗi xác nhận thanh toán giả lập.');
        }
      } finally {
        if (!cancelled) {
          setSandboxConfirming(false);
        }
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(tickInterval);
      clearTimeout(confirmTimer);
    };
  }, [isOpen, step, isSandboxMode, order?.order_code, sandboxPaid, loadQuota, onSuccess]);

  const handleManualRecheck = async () => {
    if (isRechecking || !refetch) return;
    setIsRechecking(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRechecking(false), 800);
    }
  };

  // Đếm ngược thời gian thanh toán
  useEffect(() => {
    if (!isOpen || step !== 'PAYMENT' || status === 'PAID') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step, status]);

  // Khóa cuộn trang toàn cục phía sau khi modal đang mở (Chi tiết gói dịch vụ, QR thanh toán, Xác nhận thanh toán)
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  // Dữ liệu gói thanh toán - Chuẩn hóa duy nhất 2 gói: "Luận giải AI" và "Luận giải trực tiếp 1-1"
  const rawPackage = packageInfo || {
    title: order?.description || 'Luận giải AI',
    price: order?.amount ? `${new Intl.NumberFormat('vi-VN').format(order.amount)} VNĐ` : '199.000 VNĐ',
    amount: order?.amount || 199000,
    serviceType: order?.service_type || 'lifetime',
    description: 'Bản luận giải Tử Vi chuyên sâu cùng AI, định hướng vận mệnh rõ ràng.',
    benefits: [
      'Bản luận giải 12 cung số, hạn 10 năm đại vận và tiểu vận.',
      'Phương pháp hóa giải sao xấu, phong thủy kích hoạt tài vận & bình an.',
      'Lưu trữ hồ sơ vĩnh viễn trên hệ thống, xem lại mọi lúc.'
    ]
  };

  const isConsultation = rawPackage.serviceType === 'consultation' ||
    rawPackage.amount === 500000 ||
    order?.service_type === 'consultation' ||
    order?.amount === 500000;

  const packageAmount = rawPackage.amount || (isConsultation ? 500000 : 199000);
  const formattedAmount = new Intl.NumberFormat('vi-VN').format(packageAmount);
  const formattedUnitPrice = `${formattedAmount} VNĐ / Lá số`;
  const originalAmount = isConsultation ? null : 499000;
  const originalPriceText = originalAmount
    ? new Intl.NumberFormat('vi-VN').format(originalAmount)
    : null;
  const savingsPercent =
    originalAmount && originalAmount > packageAmount
      ? Math.round(((originalAmount - packageAmount) / originalAmount) * 100)
      : 0;

  const activePackage = {
    ...rawPackage,
    title: isConsultation ? 'Luận giải trực tiếp 1-1' : 'Luận giải AI',
    price: rawPackage.price || (isConsultation ? '500.000 VNĐ' : '199.000 VNĐ'),
    amount: packageAmount,
    serviceType: isConsultation ? 'consultation' : 'lifetime'
  };

  // Ghi đầy đủ các quyền lợi và đảm bảo mỗi quyền lợi nằm hoàn toàn trên 1 dòng
  const getDisplayBenefits = () => {
    if (activePackage.serviceType === 'consultation') {
      return [
        'Tham vấn trực tiếp 1-1 qua Zalo cùng Thầy Tử Vi Hồng Ân',
        'Luận giải chuyên sâu Bản mệnh, Đại vận, Sự nghiệp & Gia đạo',
        'Tư vấn tháo gỡ vướng mắc, định hướng tương lai và cải vận',
        'Phạm vi áp dụng: 01 Lá số cho mỗi gói dịch vụ'
      ];
    }
    return [
      'Luận giải chi tiết 12 cung mệnh, 10 năm Đại vận & 3 năm Tiểu vận',
      'Hỏi đáp trực tiếp và trao đổi không giới hạn cùng trợ lý AI',
      'Lưu trữ hồ sơ vĩnh viễn trên hệ thống, tra cứu lại bất cứ lúc nào',
      'Phạm vi áp dụng: 01 Lá số cho mỗi gói dịch vụ'
    ];
  };

  const displayBenefits = getDisplayBenefits();

  const isLoggedIn = Boolean(accountQuota?.logged_in || localStorage.getItem('tuvi_token'));
  const isAdmin = Boolean(accountQuota?.is_admin || accountQuota?.unlimited);

  // Tự động tắt bảng thanh toán, hiện bảng đăng nhập và không mở lại bảng thanh toán sau khi đăng nhập
  const handleTriggerAuth = () => {
    try {
      localStorage.removeItem('tuvi_pending_checkout');
    } catch (_e) {}

    // 1. Tự động tắt bảng thanh toán ngay lập tức
    onClose();

    // 2. Kích hoạt mở bảng đăng nhập (qua callback onOpenAuth hoặc dispatch event toàn cục)
    if (typeof onOpenAuth === 'function') {
      onOpenAuth();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tuvi:open-auth'));
    }
  };

  const handleCreateOrderAndPay = async () => {
    setErrorMessage('');

    // Kiểm tra đăng nhập trước khi thanh toán
    if (!isLoggedIn) {
      handleTriggerAuth();
      return;
    }

    setIsCreatingOrder(true);
    try {
      let savedUserId = accountQuota?.user?.id || null;
      if (!savedUserId) {
        try {
          const rawUser = localStorage.getItem('tuvi_user');
          if (rawUser) {
            const u = JSON.parse(rawUser);
            savedUserId = u.id || null;
          }
        } catch (_e) {}
      }

      const res = await createBillingOrder({
        amount: activePackage.amount || 199000,
        description: activePackage.title || 'Dịch vụ Tử Vi Hồng Ân',
        serviceType: activePackage.serviceType || 'lifetime',
        userId: savedUserId
      });

      if (res && res.data) {
        setOrder(res.data);
        setStep('PAYMENT');
      } else {
        throw new Error('Không nhận được dữ liệu đơn hàng từ máy chủ.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi khi khởi tạo đơn hàng thanh toán.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const bankInfo = order?.bank_info || {
    bank_name: 'MBBank',
    account_no: '8857159999',
    account_name: 'TU VI HONG AN'
  };

  // Xác định số lượt hiển thị
  const aiCreditsDisplay = isAdmin ? 'Vô hạn' : (accountQuota?.ai_credits !== undefined ? `${accountQuota.ai_credits} lượt` : (isLoggedIn ? '0 lượt' : 'Chưa đăng nhập'));
  const hasExistingQuota = isAdmin || (Number(accountQuota?.ai_credits) > 0);

  // Kiểm tra số dư lượt luận giải AI: Nếu đang có số dư thì không hiện nút thanh toán cho dịch vụ này
  const isAiPackage = activePackage.serviceType !== 'consultation';
  const hasAiBalance = isAdmin || (Number(accountQuota?.ai_credits) > 0);
  const hideAiPayment = isAiPackage && hasAiBalance;

  const resolvedZaloPhone = (rawPackage?.zaloPhone || '').trim() || fallbackZaloPhone;
  const cleanZaloPhone = resolvedZaloPhone.replace(/\D/g, '') || '0924616199';

  const modalContent = (
    <>
      <div
        className={`billing-modal-backdrop ${isClosing ? 'is-closing' : ''}`}
        onClick={handleRequestClose}
        onWheel={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
          }
        }}
        onTouchMove={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
          }
        }}
      >
        <div className={`billing-modal-card ${isClosing ? 'is-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
          {/* Header tên gói dịch vụ kèm số tiền */}
          <div className="billing-modal-header">
            <div className="billing-header-info">
              <h3 className="billing-title">
                {step === 'DETAILS' ? 'Chi Tiết Gói Dịch Vụ' : activePackage.title}
              </h3>
              {step === 'PAYMENT' && (
                <span className="billing-header-price-badge">{activePackage.price}</span>
              )}
              {isSandboxMode && (
                <span className="billing-sandbox-badge">Sandbox Mode</span>
              )}
            </div>
            <button
              type="button"
              className="billing-close-btn"
              onClick={handleRequestClose}
              aria-label="Đóng"
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div className="billing-modal-body">
            {/* Thanh hiển thị số lượt khả dụng (chỉ hiển thị ở Bước 1 cho gói Luận giải AI) */}
            {step === 'DETAILS' && !isConsultation && (
              <div className="account-quota-strip">
                <span className="quota-strip-label">Số dư:</span>
                <span className="quota-pill">
                  <span className="quota-pill-label">Luận giải AI:</span>{' '}
                  <strong>{aiCreditsDisplay}</strong>
                </span>
              </div>
            )}

            {/* BƯỚC 1: CHI TIẾT GÓI (Súc tích, không rườm rà) */}
            {step === 'DETAILS' && (
              <div className="package-detail-container">
                <div className="package-compact-box">
                  <div className="package-title-row">
                    <div>
                      <h4 className="package-name-compact">{activePackage.title}</h4>
                    </div>
                    <div className="package-price-group">
                      <span className="package-price-badge">{formattedUnitPrice}</span>
                      {originalPriceText && (
                        <div className="package-original-price-row">
                          <span className="package-original-price">{originalPriceText}</span>
                          {savingsPercent > 0 && (
                            <span className="package-savings-text">
                              - Tiết kiệm {savingsPercent}% so với giá gốc
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="package-brief-section">
                    <div className="package-brief-heading">Quyền lợi:</div>
                    <ul className="package-brief-list">
                      {displayBenefits.map((b, idx) => (
                        <li key={idx} className="package-brief-item">
                          <span className="package-brief-bullet">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {hideAiPayment && (
                  <div className="quota-active-hint" style={{ fontSize: '0.8rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.55rem 0.75rem', borderRadius: '6px', textAlign: 'center', fontWeight: '500', lineHeight: 1.6 }}>
                    <div>Tài khoản của bạn đang có số dư lượt luận giải AI.</div>
                    <div>Vui lòng bấm &quot;Vào luận giải ngay&quot; để tiếp tục.</div>
                  </div>
                )}

                {errorMessage && (
                  <div className="payment-error-text">
                    {errorMessage}
                  </div>
                )}
              </div>
            )}

            {/* BƯỚC 2: MÀN HÌNH MÃ QR & THANH TOÁN SEPAY (HOẶC GIẢ LẬP SANDBOX 5 GIÂY) */}
            {step === 'PAYMENT' && (
              <div className="payment-center-view">
                {status === 'PAID' || sandboxPaid ? (
                  <div className="payment-success-card">
                    <div className="payment-success-icon-wrap">
                      <svg className="success-check-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h4 className="success-headline">THANH TOÁN THÀNH CÔNG</h4>
                    <p className="success-message">
                      Bạn đã được +{Number(order?.credits_added ?? order?.quantity ?? 1)} lượt sử dụng dịch vụ{' '}
                      <strong>{(activePackage?.title || 'LUẬN GIẢI AI').toUpperCase()}</strong> vào tài khoản
                      {isSandboxMode ? ' (Phiên giả lập)' : ''}
                    </p>
                    <div className="success-action-group">
                      <button
                        type="button"
                        className="btn-success-goto-chart"
                        onClick={handleRequestClose}
                      >
                        Xác nhận
                      </button>
                    </div>
                  </div>
                ) : isSandboxMode ? (
                  <div className="sandbox-payment-card">
                    <div className="sandbox-payment-pill">CHẾ ĐỘ GIẢ LẬP · SANDBOX MODE</div>
                    <div className="sandbox-countdown-ring">
                      <span className="sandbox-countdown-number">
                        {sandboxConfirming ? '...' : `${sandboxCountdown}s`}
                      </span>
                    </div>
                    <h4 className="sandbox-payment-title">
                      {sandboxConfirming
                        ? 'Đang xác nhận giao dịch giả lập...'
                        : `Đang xử lý thanh toán giả lập (${sandboxCountdown}s)`}
                    </h4>
                    <p className="sandbox-payment-desc">
                      Mã đơn giả lập: <strong>{order?.order_code}</strong> · Số tiền:{' '}
                      <strong>{activePackage.price}</strong>
                    </p>
                    <div className="sandbox-progress-track">
                      <div
                        className="sandbox-progress-fill"
                        style={{ width: `${((5 - sandboxCountdown) / 5) * 100}%` }}
                      />
                    </div>
                    <p className="sandbox-payment-note">
                      Giao dịch thử nghiệm được cô lập hoàn toàn khỏi hệ thống thanh toán thật và tự động kích hoạt sau 5 giây.
                    </p>
                    {sandboxError && <div className="payment-error-text">{sandboxError}</div>}
                  </div>
                ) : timeLeft === 0 ? (
                  /* Tình huống hết giờ: Khách chuyển khoản lúc gần hết giờ - tiếp tục bảo vệ quyền lợi 100% */
                  <div className="grace-waiting-box">
                    <div className="grace-waiting-title">Đang chờ ngân hàng xác nhận giao dịch...</div>
                    <p className="grace-waiting-desc">
                      Nếu bạn đã hoàn tất chuyển khoản cho đơn hàng <strong>{order?.order_code}</strong>, hệ thống đang kiểm tra đối soát và sẽ tự động kích hoạt dịch vụ ngay khi nhận được tín hiệu. Quyền lợi của bạn luôn được bảo đảm 100%.
                    </p>
                    <div className="grace-waiting-actions">
                      <button
                        type="button"
                        className="btn-recheck-action"
                        onClick={handleManualRecheck}
                        disabled={isRechecking}
                      >
                        {isRechecking ? 'Đang kiểm tra...' : 'Kiểm tra lại ngay'}
                      </button>
                      <a
                        href="https://zalo.me/0924616199"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-zalo-support"
                      >
                        Hỗ trợ Zalo: 0924.6161.99
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Thông báo thời hạn hiệu lực của mã QR */}
                    <div className={`qr-validity-notice ${timeLeft <= 180 ? 'warning-urgent' : ''}`}>
                      QR có hiệu lực trong vòng <strong>{formatTimer(timeLeft)}</strong> phút
                    </div>

                    {/* Hiển thị duy nhất một mã QR kích thước lớn, căn giữa màn hình */}
                    <div className="qr-hero-card">
                      <img
                        src="/qr-qronly-sepay.png"
                        alt={`Mã QR SePay ${order?.order_code || ''}`}
                        className="qr-hero-image"
                      />
                    </div>

                    {/* Số tài khoản thụ hưởng nằm chính giữa, ngay bên dưới mã QR */}
                    <div className="qr-account-center">
                      <span className="qr-account-no">{bankInfo.account_no}</span>
                    </div>

                    {/* Phần 'nội dung chuyển khoản bắt buộc:' và nội dung chung 1 dòng */}
                    <div className="transfer-code-single-row">
                      <span className="transfer-code-label">Nội dung chuyển khoản bắt buộc:</span>
                      <span className="transfer-code-value">{order?.order_code}</span>
                    </div>

                    {/* Lưu ý kích hoạt tự động */}
                    <div className="payment-sub-note">
                      Dịch vụ sẽ tự động kích hoạt sau tối đa 3 phút kể từ lúc chuyển khoản.
                    </div>

                    {/* Xử lý tình huống chuyển khoản khi còn dưới 3 phút để đảm bảo quyền lợi */}
                    {timeLeft <= 180 && (
                      <div className="qr-grace-hint">
                        Lưu ý: Nếu bạn chuyển khoản trong những phút cuối, hệ thống vẫn tiếp tục đối soát và tự động kích hoạt đầy đủ để đảm bảo quyền lợi cho bạn.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer chỉ hiển thị ở Bước 1 (DETAILS) */}
          {step === 'DETAILS' && (
            <div className={`billing-modal-footer ${isConsultation ? 'is-zalo-footer' : ''}`}>
              {isConsultation ? (
                <>
                  <span className="billing-zalo-footer-note">
                    Giao dịch qua Zalo chính thức (Có thể thương lượng giá cả)
                  </span>
                  <a
                    href={`https://zalo.me/${cleanZaloPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-zalo-direct-footer"
                    aria-label={`Liên hệ Zalo ${resolvedZaloPhone}`}
                  >
                    <ZaloIcon size={20} />
                    <span>{resolvedZaloPhone}</span>
                  </a>
                </>
              ) : hideAiPayment ? (
                <button
                  type="button"
                  className="btn-primary-pay"
                  onClick={() => {
                    if (typeof onUseExistingQuota === 'function') {
                      onUseExistingQuota();
                    } else {
                      handleRequestClose();
                      if (typeof window !== 'undefined') {
                        window.location.href = '/luan-giai-ai';
                      }
                    }
                  }}
                >
                  Vào luận giải ngay
                </button>
              ) : (
                <>
                  {hasExistingQuota && Boolean(onUseExistingQuota) && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: '#15803d', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                      onClick={onUseExistingQuota}
                      disabled={isCreatingOrder}
                    >
                      Vào luận giải ngay
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-primary-pay"
                    onClick={!isLoggedIn ? handleTriggerAuth : handleCreateOrderAndPay}
                    disabled={isCreatingOrder}
                  >
                    {isCreatingOrder
                      ? 'Đang tạo đơn...'
                      : !isLoggedIn
                      ? 'Đăng nhập để thanh toán'
                      : 'Thanh toán'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
