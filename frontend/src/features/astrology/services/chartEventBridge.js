// chartEventBridge.js
/**
 * Điều phối sự kiện giao tiếp hai chiều giữa ứng dụng React và iframe Lập Lá Số.
 */

export function setupChartEventBridge({
  onResize,
  onMarkdownGenerated,
  onOpenConsultationModal,
  onOpenAiModal,
  onScrollToTop,
  onOpenAuthModal,
  onOpenAiSession
}) {
  function handleMessage(e) {
    if (!e.data || typeof e.data !== 'object') return;

    const { type } = e.data;

    // 1. Đồng bộ chiều cao iframe tự động
    if (type === 'TUVI_IFRAME_RESIZE' && e.data.height && onResize) {
      onResize(Math.max(300, Math.ceil(e.data.height)));
    }

    // 2. Tiếp nhận Markdown AI từ lá số đã an sao thành công
    if (type === 'TUVI_MARKDOWN_GENERATED' && onMarkdownGenerated) {
      onMarkdownGenerated({
        markdownAi: e.data.markdown_ai || '',
        chartData: e.data.chartData || null,
        chartImageUrl: e.data.chartImageUrl || ''
      });
    }

    // 3. Mở modal thanh toán SePay cho gói Luận giải trực tiếp 1-1
    if (type === 'TUVI_OPEN_CONSULTATION_MODAL' && onOpenConsultationModal) {
      onOpenConsultationModal({
        chartData: e.data.chartData || null,
        chartCode: e.data.chartCode || '',
        hotline: e.data.hotline || ''
      });
    }

    // 4. Chuyển sang màn hình Luận Giải AI Standalone kèm hình ảnh tờ lá số
    if (type === 'TUVI_OPEN_AI_MODAL' && onOpenAiModal) {
      onOpenAiModal({
        markdownAi: e.data.markdown_ai || '',
        chartData: e.data.chartData || null,
        chartImageUrl: e.data.chartImageUrl || ''
      });
    }

    // 5. Tiếp nhận ảnh lá số tự động xuất từ engine
    if (type === 'TUVI_CHART_IMAGE_GENERATED' && onMarkdownGenerated) {
      onMarkdownGenerated({
        markdownAi: e.data.markdown_ai || '',
        chartData: e.data.chartData || null,
        chartImageUrl: e.data.chartImageUrl || ''
      });
    }

    // 6. Cuộn mượt lên đầu trang
    if (type === 'TUVI_SCROLL_TO_TOP' && onScrollToTop) {
      onScrollToTop();
    }

    // 7. Yêu cầu mở Auth Modal đăng nhập Google
    if (type === 'TUVI_OPEN_AUTH_MODAL' && onOpenAuthModal) {
      onOpenAuthModal();
    }

    // 8. Mở phiên luận giải AI từ tab Lịch sử
    if (type === 'TUVI_OPEN_AI_SESSION' && onOpenAiSession) {
      onOpenAiSession({
        sessionId: e.data.sessionId,
        markdownAi: e.data.markdown_ai || '',
        chartData: e.data.chartData || null,
        chartImageUrl: e.data.chartImageUrl || '',
        chartCode: e.data.chart_code || ''
      });
    }
  }

  window.addEventListener('message', handleMessage);

  return function cleanup() {
    window.removeEventListener('message', handleMessage);
  };
}

export function requestIframeHeight(iframeRef) {
  try {
    if (iframeRef && iframeRef.contentWindow) {
      iframeRef.contentWindow.postMessage({ type: 'REQUEST_TUVI_HEIGHT' }, '*');
    }
  } catch {
    /* guard cross-origin */
  }
}

export function notifyIframeAuthChanged(iframeRef, token, user) {
  try {
    if (iframeRef && iframeRef.contentWindow) {
      iframeRef.contentWindow.postMessage({
        type: 'TUVI_AUTH_CHANGED',
        token,
        user
      }, '*');
    }
  } catch {
    /* guard cross-origin */
  }
}

export function notifyIframeViewport(iframeRef, width, height) {
  try {
    if (iframeRef && iframeRef.contentWindow) {
      iframeRef.contentWindow.postMessage({
        type: 'TUVI_PARENT_VIEWPORT',
        width: width || window.innerWidth,
        height: height || window.innerHeight
      }, '*');
    }
  } catch {
    /* guard cross-origin */
  }
}
