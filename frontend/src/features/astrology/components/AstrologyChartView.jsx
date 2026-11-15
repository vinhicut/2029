// AstrologyChartView.jsx
import React, { useRef, useEffect } from 'react';
import { requestIframeHeight, notifyIframeViewport, notifyIframeAuthChanged } from '../services/chartEventBridge';
import './AstrologyChartView.css';

export default function AstrologyChartView({ frameHeight, visible }) {
  const iframeRef = useRef(null);
  const lastWidthRef = useRef(0);

  useEffect(() => {
    function sendViewport(force = false) {
      if (!iframeRef.current) return;
      const rect = iframeRef.current.getBoundingClientRect();
      const actualWidth = Math.round(iframeRef.current.clientWidth || rect.width || window.innerWidth);
      // Chỉ gửi thông điệp viewport khi chiều rộng thực tế thay đổi hoặc được yêu cầu force
      if (!force && lastWidthRef.current > 0 && Math.abs(actualWidth - lastWidthRef.current) < 2) {
        return;
      }
      lastWidthRef.current = actualWidth;
      notifyIframeViewport(iframeRef.current, actualWidth, window.innerHeight);
    }

    function handleResize() {
      sendViewport(false);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && iframeRef.current) {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = Math.round(entry.contentRect.width);
          if (newWidth > 0 && Math.abs(newWidth - lastWidthRef.current) >= 2) {
            sendViewport(false);
          }
        }
      });
      ro.observe(iframeRef.current);
    }

    if (visible && iframeRef.current) {
      sendViewport(true);
      requestIframeHeight(iframeRef.current);
      const token = localStorage.getItem('tuvi_token');
      const user = localStorage.getItem('tuvi_user');
      if (token) {
        notifyIframeAuthChanged(iframeRef.current, token, user);
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (ro) ro.disconnect();
    };
  }, [visible]);

  return (
    <div
      className="astrology-chart-view"
      style={{ display: visible ? 'block' : 'none' }}
    >
      <iframe
        ref={iframeRef}
        src="/astrology-engine/laso-tuvi.html?v=2471"
        title="Lá Số Tử Vi Đẩu Số"
        className="astrology-chart-iframe"
        style={{ height: `${frameHeight}px` }}
        scrolling="no"
        frameBorder="0"
        onLoad={() => {
          if (iframeRef.current) {
            const rect = iframeRef.current.getBoundingClientRect();
            const actualWidth = Math.round(iframeRef.current.clientWidth || rect.width || window.innerWidth);
            lastWidthRef.current = actualWidth;
            notifyIframeViewport(iframeRef.current, actualWidth, window.innerHeight);
            requestIframeHeight(iframeRef.current);

            // Gửi auth token ổn định sau khi iframe nạp xong (loại bỏ cascading setTimeout kép 150ms/500ms)
            setTimeout(() => {
              if (iframeRef.current) {
                const token = localStorage.getItem('tuvi_token');
                const user = localStorage.getItem('tuvi_user');
                if (token) {
                  notifyIframeAuthChanged(iframeRef.current, token, user);
                }
              }
            }, 250);
          }
        }}
      />
    </div>
  );
}
