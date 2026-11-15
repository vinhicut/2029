// chartDataBridge.js
/**
 * Cầu Nối Đồng Bộ Dữ Liệu Liên Trang (Cross-Page Data Sync Bridge).
 * Quản lý luồng chuyển giao dữ liệu 100% không thất thoát giữa:
 * Trang Lập Lá Số (/la-so-tu-vi) <---> Trang Luận Giải AI (/luan-giai-ai).
 * 
 * Áp dụng kiến trúc đa tầng:
 * 1. Global State / Router State (0ms)
 * 2. IndexedDB Storage (Bền vững, dung lượng lớn cho ảnh Base64)
 * 3. SessionStorage & BroadcastChannel (Đồng bộ đa tab thời gian thực)
 * 4. Deep-link Hash URL khôi phục trạng thái khi F5 hoặc chia sẻ link
 */

import { saveChartToIndexedDb, getChartFromIndexedDb } from './indexedDbStorage.js';

const SYNC_CHANNEL_NAME = 'tuvi_chart_sync_channel';
let broadcastChannel = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch (_e) {
    broadcastChannel = null;
  }
}

/**
 * Sinh mã băm duy nhất SHA-256 từ thông tin đương số (Profile Hash)
 */
export async function generateChartHash(profile) {
  if (!profile) return 'default_chart_hash';
  
  const name = (profile.fullName || profile.ho_ten || 'duong_so').trim().toLowerCase();
  const gender = (profile.gender || profile.gioi_tinh || 'nam').trim().toLowerCase();
  const d = profile.solarDate?.day ?? profile.ngay_sinh ?? 15;
  const m = profile.solarDate?.month ?? profile.thang_sinh ?? 8;
  const y = profile.solarDate?.year ?? profile.nam_sinh ?? 1996;
  const h = profile.birthTime?.hour ?? profile.gio_sinh_gio ?? profile.gio_sinh ?? 9;
  const mi = profile.birthTime?.minute ?? profile.phut_sinh ?? 30;
  const viewYear = profile.viewYear ?? profile.nam_xem_han ?? new Date().getFullYear();

  const rawSeed = `${name}_${gender}_${d}-${m}-${y}_${h}:${mi}_${viewYear}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(rawSeed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
    } catch (_e) {
      // Fallback nếu subtle crypto bị chặn
    }
  }

  // Thuật toán băm dự phòng nhẹ (DJB2 cải tiến)
  let hash = 5381;
  for (let i = 0; i < rawSeed.length; i++) {
    hash = ((hash << 5) + hash) + rawSeed.charCodeAt(i);
    hash = hash & hash;
  }
  return 'tv_' + Math.abs(hash).toString(16);
}

/**
 * Chuẩn hóa Master Payload tổng thể từ dữ liệu an sao
 */
export async function buildMasterPayload({ chartData, markdownAi, chartImageUrl }) {
  const cd = chartData || {};
  const profile = {
    fullName: cd.ho_ten || cd.name || 'Đương số',
    gender: cd.gioi_tinh || cd.gender || 'Nam',
    solarDate: cd.duong_lich || {
      day: cd.ngay_sinh || 15,
      month: cd.thang_sinh || 8,
      year: cd.nam_sinh || 1996
    },
    lunarDate: cd.am_lich || {
      day: cd.ngay_am || 1,
      month: cd.thang_am || 7,
      year: cd.nam_sinh || 1996,
      isLeap: Boolean(cd.is_leap)
    },
    birthTime: {
      hour: cd.gio_sinh_gio ?? cd.gio_sinh ?? 9,
      minute: cd.phut_sinh ?? 30,
      chiGio: cd.chi_gio || 'Tỵ'
    },
    viewYear: cd.nam_xem_han || new Date().getFullYear(),
    age: cd.nam_sinh ? (new Date().getFullYear() - cd.nam_sinh + 1) : 28
  };

  const chartHash = await generateChartHash(profile);

  return {
    chartHash,
    generatedAt: new Date().toISOString(),
    clientVersion: '2027.1.0',
    profile,
    thienBan: cd.thienBan || cd.thien_ban || null,
    diaBan: cd.diaBan || cd.dia_ban || cd.cung_data || null,
    markdownAi: markdownAi || '',
    chartImageUrl: chartImageUrl || '',
    rawChartData: cd
  };
}

/**
 * Chuyển giao dữ liệu từ trang Lập Lá Số sang Luận Giải AI với độ trễ < 100ms
 */
export async function dispatchChartToAiReading(navigate, { chartData, markdownAi, chartImageUrl, sessionId }) {
  const payload = await buildMasterPayload({ chartData, markdownAi, chartImageUrl });
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  // 1. Lưu tức thì vào IndexedDB
  await saveChartToIndexedDb(payload.chartHash, payload);

  // 2. Ghi đè chỉ báo tham chiếu nhẹ vào SessionStorage
  try {
    sessionStorage.setItem('tuvi_current_chart_hash', payload.chartHash);
    sessionStorage.setItem('tuvi_markdown_ai', payload.markdownAi || '');
    if (sessionId) sessionStorage.setItem('tuvi_active_session_id', sessionId);
  } catch (_e) {}

  // 3. Thông báo cho các tab khác qua BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'TUVI_CHART_UPDATED',
        chartHash: payload.chartHash
      });
    } catch (_err) {}
  }

  // 4. Điều hướng nhanh với URL Deep-link có mã băm
  const targetUrl = `/luan-giai-ai?chart=${payload.chartHash}${sessionId ? `&session=${sessionId}` : ''}`;

  const navOptions = {
    state: {
      chartHash: payload.chartHash,
      initialPayload: payload,
      markdownAi: payload.markdownAi,
      chartData: payload.rawChartData,
      chartImageUrl: payload.chartImageUrl,
      sessionId
    }
  };

  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    document.startViewTransition(() => {
      navigate(targetUrl, navOptions);
    });
  } else {
    navigate(targetUrl, navOptions);
  }
}

/**
 * Khôi phục trạng thái Tinh Bàn khi người dùng vào thẳng /luan-giai-ai hoặc nhấn F5 Hard Reload
 */
export async function restoreChartPayload({ chartHash, routerState }) {
  // 1. Nếu Router State đã có sẵn payload đầy đủ
  if (routerState?.initialPayload) {
    return routerState.initialPayload;
  }

  // 2. Lấy hash từ tham số truyền vào hoặc URL query hoặc SessionStorage
  let targetHash = chartHash;
  if (!targetHash && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    targetHash = params.get('chart');
    if (!targetHash) {
      targetHash = sessionStorage.getItem('tuvi_current_chart_hash');
    }
  }

  // 3. Truy xuất từ IndexedDB
  if (targetHash) {
    const stored = await getChartFromIndexedDb(targetHash);
    if (stored) return stored;
  }

  // 4. Dự phòng đọc từ SessionStorage / LocalStorage cũ
  try {
    const rawCd = sessionStorage.getItem('tuvi_chart_data') || localStorage.getItem('tuvi_chart_data');
    const md = sessionStorage.getItem('tuvi_markdown_ai') || localStorage.getItem('tuvi_markdown_ai');
    const img = sessionStorage.getItem('tuvi_chart_image_url') || localStorage.getItem('tuvi_chart_image_url');
    if (rawCd || md) {
      const cd = rawCd ? JSON.parse(rawCd) : null;
      return await buildMasterPayload({ chartData: cd, markdownAi: md, chartImageUrl: img });
    }
  } catch (_e) {}

  return null;
}
