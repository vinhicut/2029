// astrologyConfig.js
/**
 * Hằng số & Cấu hình cho Phân hệ Lá Số & Luận Giải Tử Vi (Tử Vi Hồng Ân).
 */

export const ZALO_CONTACTS = [
  { label: 'Zalo 1', phone: '0924.6161.99', href: 'https://zalo.me/0924616199', type: 'zalo' },
  { label: 'Zalo 2', phone: '0385.497.085', href: 'https://zalo.me/0385497085', type: 'zalo' },
];

export const BRAND_THEME = {
  primaryRed: '#8b1d1d',
  primaryRedHover: '#a12323',
  primaryRedLight: '#fdf2f2',
  accentGold: '#c5a059',
  accentGoldLight: '#fcf9f2',
  textMain: '#1e293b',
  borderLight: '#e2e8f0',
};

export const API_ROUTES = {
  INTERPRET_CHART: '/api/ai/interpret-chart',
  STREAM_INTERPRET_CHART: '/api/ai/stream-interpret-chart',
  CHART_CACHE: '/api/ai/chart-cache',
  AI_STATUS: '/api/ai/status',
};

export const PODCAST_SECTIONS = [
  { id: 'sec-1', label: 'I. Tổng Quan', title: 'Tổng Quan Lá Số (Trung Cung)', prefix: '## I.' },
  { id: 'sec-2', label: 'II. Tam Hợp', title: 'Tam Hợp Mệnh - Tài - Quan', prefix: '## II.' },
  { id: 'sec-3', label: 'III. Vận Hạn', title: 'Đại Vận & Tiểu Vận 3 Năm', prefix: '## III.' },
  { id: 'sec-4', label: 'IV. 11 Cung Phụ', title: 'Luận Giải Các Cung Còn Lại', prefix: '## IV.' },
  { id: 'sec-5', label: 'V. Tổng Kết', title: 'Tổng Kết & Lời Dặn Nhân Sinh', prefix: '## V.' }
];
