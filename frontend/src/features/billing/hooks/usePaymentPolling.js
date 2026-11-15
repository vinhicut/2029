import { useState, useEffect, useRef } from 'react';
import { checkOrderStatus } from '../api/billingApi';

export function usePaymentPolling({
  orderCode,
  enabled = true,
  intervalMs = 3000,
  timeoutMs = 1200000, // 20 phút (bao gồm 15 phút hiệu lực QR + 5 phút gia hạn đối soát an toàn)
  onSuccess,
  onExpire,
}) {
  const [status, setStatus] = useState('PENDING');
  const [isPolling, setIsPolling] = useState(enabled);
  const startTimeRef = useRef(Date.now());

  const checkStatusOnce = async () => {
    if (!orderCode) return null;
    try {
      const res = await checkOrderStatus(orderCode);
      if (res && res.data) {
        const currentStatus = res.data.status;
        setStatus(currentStatus);
        if (currentStatus === 'PAID') {
          setIsPolling(false);
          onSuccess && onSuccess(res.data);
        }
        return res.data;
      }
    } catch (err) {
      console.error('Payment polling error:', err);
    }
    return null;
  };

  useEffect(() => {
    if (!enabled || !orderCode || status === 'PAID' || status === 'EXPIRED') {
      return;
    }

    let isMounted = true;
    const timer = setInterval(async () => {
      if (Date.now() - startTimeRef.current > timeoutMs) {
        clearInterval(timer);
        if (isMounted) {
          setStatus('EXPIRED');
          setIsPolling(false);
          onExpire && onExpire();
        }
        return;
      }

      await checkStatusOnce();
    }, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [orderCode, enabled, intervalMs, timeoutMs, status, onSuccess, onExpire]);

  return { status, setStatus, isPolling, refetch: checkStatusOnce };
}
