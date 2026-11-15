// LaSoTuViContainer.jsx
/**
 * Container điều phối toàn bộ Phân Hệ Lập Lá Số & Luận Giải Tử Vi Đẩu Số.
 * Quản lý trạng thái chuyển đổi giữa Màn hình Lá Số (Chart View) và Màn hình Luận Văn Podcast (Podcast View).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AstrologyChartView from './components/AstrologyChartView';
import AiReadingPodcastView from './components/AiReadingPodcastView';
import PaymentModal, { prefetchAccountQuota } from '../billing/components/PaymentModal';
import AuthModal from '../auth/AuthModal';
import { setupChartEventBridge } from './services/chartEventBridge';
import { getActiveSessionId } from './services/aiReadingClient';
import { dispatchChartToAiReading } from './services/chartDataBridge';
import { getRouteKey, getSavedWindowScroll, restoreScrollAsync, saveWindowScroll } from '../../shared/persistence';
import './LaSoTuVi.css';

const AI_PACKAGE_INFO = {
  title: 'Luận giải AI',
  price: '199.000 VNĐ',
  amount: 199000,
  serviceType: 'lifetime',
  description: 'Bản giải đoán trọn đời 12 cung, 10 năm đại vận, tiểu vận chi tiết, phong thủy tài lộc kích tài tăng phúc.',
  benefits: [
    'Bản luận giải trọn đời 12 cung số, hạn 10 năm đại vận và tiểu vận.',
    'Phương pháp hóa giải sao xấu, phong thủy kích hoạt tài vận & bình an.',
    'Lưu trữ hồ sơ vĩnh viễn trên hệ thống, xem lại mọi lúc.'
  ]
};

const CONSULTATION_PACKAGE_INFO = {
  title: 'Luận giải trực tiếp 1-1',
  price: '500.000 VNĐ',
  amount: 500000,
  serviceType: 'consultation',
  description: 'Trực tiếp đàm thoại qua Zalo (gọi thoại hoặc video) cùng Thầy Tử Vi Hồng Ân.',
  benefits: [
    'Đàm thoại trực tiếp 1-1 qua Zalo cùng Thầy Tử Vi Hồng Ân.',
    'Tháo gỡ chi tiết vướng mắc bản mệnh, sự nghiệp, tình duyên, gia đạo.',
    'Tư vấn định hướng chiến lược cuộc đời và phương pháp cải vận.'
  ]
};

export default function LaSoTuViContainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state || {};

  const [frameHeight, setFrameHeight] = useState(1040);

  // Trạng thái Chế độ xem: 'chart' (Lá số) | 'ai-podcast' (Bài Luận Văn Podcast toàn trang)
  const [activeView, setActiveView] = useState('chart');
  const [markdownAi, setMarkdownAi] = useState(navState.markdownAi || '');
  const [chartData, setChartData] = useState(navState.chartData || null);
  const [chartImageUrl, setChartImageUrl] = useState(navState.chartImageUrl || '');
  const [activeSessionIdState, setActiveSessionIdState] = useState(
    navState.sessionId || getActiveSessionId() || null
  );

  // Quản lý Modal Đăng nhập Google & Modal Thanh toán SePay
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activePaymentPackage, setActivePaymentPackage] = useState(null);
  const [pendingChartContext, setPendingChartContext] = useState(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('tuvi_user');
      if (savedUser) setUser(JSON.parse(savedUser));
    } catch {
      /* ignore */
    }
    const idleFn = typeof window !== 'undefined' && window.requestIdleCallback
      ? window.requestIdleCallback
      : (cb) => setTimeout(cb, 150);
    const idleId = idleFn(() => {
      prefetchAccountQuota();
    });
    return () => {
      if (typeof window !== 'undefined' && window.cancelIdleCallback && typeof idleId === 'number') {
        try { window.cancelIdleCallback(idleId); } catch (_e) {}
      }
    };
  }, []);

  // Đọc dữ liệu từ sessionStorage nếu chưa có
  useEffect(() => {
    if (!markdownAi) {
      try {
        const savedMd = sessionStorage.getItem('tuvi_markdown_ai');
        if (savedMd) setMarkdownAi(savedMd);
      } catch (_e) {}
    }
    if (!chartImageUrl) {
      try {
        const savedImg = sessionStorage.getItem('tuvi_chart_image_url');
        if (savedImg) setChartImageUrl(savedImg);
      } catch (_e) {}
    }
    if (!chartData) {
      try {
        const savedCd = sessionStorage.getItem('tuvi_chart_data');
        if (savedCd) setChartData(JSON.parse(savedCd));
      } catch (_e) {}
    }
  }, [markdownAi, chartImageUrl, chartData]);

  const latestChartContextRef = useRef({
    markdownAi,
    chartData,
    chartImageUrl,
    activeSessionIdState,
  });

  useEffect(() => {
    latestChartContextRef.current = {
      markdownAi,
      chartData,
      chartImageUrl,
      activeSessionIdState,
    };
  }, [markdownAi, chartData, chartImageUrl, activeSessionIdState]);

  // Khôi phục vị trí cuộn trang khi quay lại từ nút "Quay lại" trên màn hình Luận giải AI
  useEffect(() => {
    if (!navState.restoreScroll) return undefined;
    const routeKey = getRouteKey(location.pathname, location.search);
    const saved = getSavedWindowScroll(routeKey);
    if (!saved || (saved.x <= 0 && saved.y <= 0)) return undefined;
    return restoreScrollAsync({
      target: window,
      x: saved.x,
      y: saved.y,
      maxWaitMs: 3500
    });
  }, [navState.restoreScroll, location.pathname, location.search]);

  // Điều hướng vào màn hình Luận giải AI qua Data Sync Bridge
  const handleProceedToAiReading = useCallback((ctx) => {
    saveWindowScroll(getRouteKey(location.pathname, location.search));
    setActivePaymentPackage(null);
    const latest = latestChartContextRef.current;
    const targetMd = ctx?.targetMd || latest.markdownAi;
    const targetCd = ctx?.targetCd || latest.chartData;
    const targetImg = ctx?.targetImg || latest.chartImageUrl;

    dispatchChartToAiReading(navigate, {
      chartData: targetCd,
      markdownAi: targetMd,
      chartImageUrl: targetImg,
      sessionId: latest.activeSessionIdState
    });
  }, [navigate, location.pathname, location.search]);

  useEffect(() => {
    const cleanup = setupChartEventBridge({
      onResize: (height) => {
        // Nâng ngưỡng từ 4px lên 10px để triệt tiêu dao động subpixel
        setFrameHeight((prev) => (Math.abs(prev - height) >= 10 ? height : prev));
      },
      onMarkdownGenerated: ({ markdownAi: md, chartData: cd, chartImageUrl: img }) => {
        if (md) {
          setMarkdownAi(md);
          try {
            sessionStorage.setItem('tuvi_markdown_ai', md);
          } catch (_e) {}
        }
        if (cd) {
          setChartData(cd);
          try {
            sessionStorage.setItem('tuvi_chart_data', JSON.stringify(cd));
          } catch (_e) {}
        }
        if (img) {
          setChartImageUrl(img);
          setPendingChartContext((prev) => (prev ? { ...prev, targetImg: img } : prev));
          setTimeout(() => {
            try {
              sessionStorage.setItem('tuvi_chart_image_url', img);
            } catch (_e) {}
          }, 0);
        }
      },
      onOpenConsultationModal: ({ chartData: cd, hotline } = {}) => {
        if (cd) setChartData(cd);
        const resolvedHotline =
          hotline ||
          cd?.hotline ||
          latestChartContextRef.current.chartData?.hotline ||
          '';
        setActivePaymentPackage({
          ...CONSULTATION_PACKAGE_INFO,
          zaloPhone: resolvedHotline
        });
      },
      // Khi người dùng bấm nút / thẻ "LUẬN GIẢI AI" trên tờ lá số: Mở ngay lập tức bảng thanh toán SePay
      onOpenAiModal: ({ markdownAi: md, chartData: cd, chartImageUrl: img }) => {
        const latest = latestChartContextRef.current;
        const targetMd = md || latest.markdownAi;
        const targetCd = cd || latest.chartData;
        const targetImg = img || latest.chartImageUrl;

        // Cập nhật UI mở modal tức thì trước mọi thao tác storage
        setPendingChartContext({ targetMd, targetCd, targetImg });
        setActivePaymentPackage(AI_PACKAGE_INFO);

        if (targetMd) setMarkdownAi(targetMd);
        if (targetCd) setChartData(targetCd);
        if (targetImg) setChartImageUrl(targetImg);

        // Ghi cache ngầm sau frame mở modal để không chặn render
        setTimeout(() => {
          try {
            if (targetMd) {
              sessionStorage.setItem('tuvi_markdown_ai', targetMd);
              localStorage.setItem('tuvi_markdown_ai', targetMd);
            }
            if (targetCd) {
              const serialized = JSON.stringify(targetCd);
              sessionStorage.setItem('tuvi_chart_data', serialized);
              localStorage.setItem('tuvi_chart_data', serialized);
            }
            if (targetImg) {
              sessionStorage.setItem('tuvi_chart_image_url', targetImg);
            }
          } catch (_e) {}
        }, 0);
      },
      onScrollToTop: () => {
        // Đã loại bỏ tự động cuộn trang theo yêu cầu người dùng
      },
      onOpenAuthModal: () => {
        setAuthOpen(true);
      },
      onOpenAiSession: ({ sessionId, markdownAi: md, chartData: cd, chartImageUrl: img }) => {
        saveWindowScroll(getRouteKey(location.pathname, location.search));
        const latest = latestChartContextRef.current;
        const targetMd = md || latest.markdownAi;
        const targetCd = cd || latest.chartData;
        const targetImg = img || latest.chartImageUrl;

        dispatchChartToAiReading(navigate, {
          chartData: targetCd,
          markdownAi: targetMd,
          chartImageUrl: targetImg,
          sessionId
        });
      }
    });

    return cleanup;
  }, [navigate]);

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setAuthOpen(false);
    prefetchAccountQuota();
    const iframe = document.querySelector('.astrology-chart-iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'TUVI_AUTH_CHANGED',
        token: localStorage.getItem('tuvi_token'),
        user: loggedInUser
      }, '*');
    }
  };

  return (
    <div className="laso-unified-page">
      {/* 1. MÀN HÌNH LÁ SỐ TỬ VI VÀ QUẢN LÝ LỊCH SỬ DẠNG TAB */}
      <AstrologyChartView
        frameHeight={frameHeight}
        visible={activeView === 'chart'}
      />

      {/* 2. MÀN HÌNH BÀI LUẬN VĂN PODCAST TOÀN TRANG */}
      {activeView === 'ai-podcast' && (
        <AiReadingPodcastView
          onBack={() => {
            setActiveView('chart');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          markdownAi={markdownAi}
          chartData={chartData}
        />
      )}

      {/* 3. MODAL THANH TOÁN SEPAY (LUẬN GIẢI AI & LUẬN GIẢI TRỰC TIẾP 1-1) */}
      <PaymentModal
        isOpen={Boolean(activePaymentPackage)}
        onClose={() => setActivePaymentPackage(null)}
        onOpenAuth={() => {
          setActivePaymentPackage(null);
          setAuthOpen(true);
        }}
        packageInfo={activePaymentPackage || AI_PACKAGE_INFO}
        onUseExistingQuota={
          activePaymentPackage?.serviceType === 'consultation'
            ? undefined
            : () => {
                handleProceedToAiReading(pendingChartContext);
              }
        }
        onSuccess={
          activePaymentPackage?.serviceType === 'consultation'
            ? undefined
            : (_order) => {
                handleProceedToAiReading(pendingChartContext);
              }
        }
      />

      {/* 4. MODAL ĐĂNG NHẬP GOOGLE KHI GỌI TỪ TAB LỊCH SỬ */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        user={user}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
