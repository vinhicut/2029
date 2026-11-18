// AiInterpretationGeminiView.jsx
/**
 * Giao diện Standalone Toàn Màn Hình: Luận Giải Lá Số Bằng AI (Tử Vi Hồng Ân).
 * Phiên bản chuẩn hóa Ổn định (Production-Grade Split View):
 * - Header tối ưu chiều cao (h-12 / 48px), thanh thoát, thương hiệu Tử Vi Hồng Ân.
 * - Cột trái: Trình xem tờ lá số chất lượng cao (High-Res Chart Viewer) hỗ trợ bật/tắt (Toggle Sidebar) linh hoạt.
 * - Cột phải: Khu vực luận giải AI tập trung giữa màn hình (Max-width 850px) với thẻ xác nhận ban đầu (AiConfirmChartCard),
 *   luồng đọc Markdown CommonMark/GFM với Typography 15px #000000, và khung chat Q&A capsule dock tối ưu 750px.
 * - Bảo toàn trạng thái đa tầng (Zero Data-Drop): Đồng bộ IndexedDB, URL Hash, và sessionStorage/localStorage.
 * - Tự động đối chiếu tinh bàn, hỗ trợ streaming SSE và cơ chế dự phòng REST API khi có sự cố mạng.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  AlertCircle,
  RefreshCw,
  Sparkles,
  RotateCw,
  Download
} from 'lucide-react';
import { marked } from 'marked';
import {
  normalizeChartData,
  fetchAiInterpretation,
  streamAiInterpretation,
  sendAiFollowupQuestion,
  fetchUserAiQuota,
  getAiSessionById,
  saveAiSession,
  getChartKey,
  getActiveSessionId,
  setActiveSessionId,
  sanitizeVietnameseReading
} from './services/aiReadingClient.js';
import {
  saveChartToIndexedDb,
  getChartFromIndexedDb,
  saveReadingToIndexedDb,
  getReadingFromIndexedDb
} from './services/indexedDbStorage.js';
import { restoreChartPayload, generateChartHash } from './services/chartDataBridge.js';
import AiConfirmChartCard from './components/AiConfirmChartCard.jsx';
import PaymentModal from '../billing/components/PaymentModal.jsx';
import AuthModal from '../auth/AuthModal.jsx';
import { BRAND_THEME } from './constants/astrologyConfig.js';
import './AiInterpretationGeminiView.css';
// Cấu hình marked: Tương thích CommonMark / GFM, vô hiệu hóa hoàn toàn định dạng in nghiêng
marked.setOptions({
  gfm: true,
  breaks: true,
});
const customRenderer = new marked.Renderer();
// Bắt buộc mọi thẻ em/i chuyển thành span chữ đứng chuẩn mực
function slugifyHeading(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

customRenderer.heading = function({ tokens, depth }) {
  const content = this.parser ? this.parser.parseInline(tokens) : (tokens ? tokens.map(t => t.raw || t.text || '').join('') : '');
  const rawText = tokens ? tokens.map(t => t.text || t.raw || '').join('') : '';
  const id = slugifyHeading(rawText);

  // CHUẨN HÓA 100% ĐỒNG BỘ VỚI PDF (WHAT YOU SEE IS WHAT YOU GOT):
  // 1. Các đề mục niên vận "Năm..." sử dụng màu đen than #1E293B, font Lora có chân, tuyệt đối không dùng màu đỏ
  if (/^Năm\s+\d{4}/i.test(rawText.trim())) {
    return `<h4 class="year-heading" id="${id}">${content}</h4>\n`;
  }

  // 2. Các phần lớn I đến X hoặc MỤC LỤC hoặc TỔNG KẾT luôn hiển thị là H1 (Đỏ chu sa, căn giữa, chữ hoa, font Lora có chân)
  const isMajorSection = /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/i.test(rawText.trim()) || 
                         /^MỤC\s+LỤC/i.test(rawText.trim()) || 
                         /^TỔNG\s+KẾT/i.test(rawText.trim());
  if (isMajorSection || depth === 1) {
    return `<h1 class="major-heading" id="${id}">${content}</h1>\n`;
  }

  // 3. Các mục số 1, 2, 3... (như 1. Cung Mệnh, 2. Cung Tài Bạch, 1. Về Đại vận...) là H2 (Đen mực, căn trái, font Lora có chân)
  const isSubSection = /^\d+\.\s+/i.test(rawText.trim()) || /^(?:Bản Mệnh|Tương quan|Vị trí Thân)/i.test(rawText.trim());
  if (isSubSection || depth === 2) {
    return `<h2 class="sub-heading" id="${id}">${content}</h2>\n`;
  }

  if (depth === 3) {
    return `<h3 id="${id}">${content}</h3>\n`;
  }

  return `<h${depth} id="${id}">${content}</h${depth}>\n`;
};

// Chuẩn hóa danh sách gạch đầu dòng (bullet points):
// Tự động ngắt xuống dòng cho toàn bộ nội dung đứng sau dấu hai chấm (:), căn lề ngay ngắn và dễ đọc
customRenderer.listitem = function(token) {
  const rawText = token.text || '';
  const parsedContent = this.parser ? this.parser.parse(token.tokens) : (rawText || '');

  // Nếu là liên kết điều hướng trong Mục Lục, giữ nguyên cấu trúc
  if (/^\s*<a\s+href=/i.test(parsedContent.trim()) || /^\s*\[.+?\]\(.+?\)/.test(rawText.trim())) {
    return `<li>${parsedContent}</li>\n`;
  }

  const clean = parsedContent.trim();
  // Nhận diện nhãn kết thúc bằng dấu hai chấm (: hoặc ：)
  let match = clean.match(/^(?:<p>)?\s*(<(?:strong|b)>[\s\S]+?[:：]<\/(?:strong|b)>)\s*([\s\S]+?)(?:<\/p>)?$/i);
  if (!match) {
    match = clean.match(/^(?:<p>)?\s*(<(?:strong|b)>[\s\S]+?<\/(?:strong|b)>[:：])\s*([\s\S]+?)(?:<\/p>)?$/i);
  }
  if (!match) {
    match = clean.match(/^(?:<p>)?\s*([^<:\n]{2,60}[:：])\s+([\s\S]+?)(?:<\/p>)?$/i);
    if (match) {
      match[1] = `<strong>${match[1]}</strong>`;
    }
  }

  if (match) {
    const label = match[1].trim();
    const body = match[2].trim();
    if (body) {
      return `<li class="bullet-item-colon"><div class="bullet-label">${label}</div><div class="bullet-content">${body}</div></li>\n`;
    }
  }

  return `<li>${parsedContent}</li>\n`;
};

// Chuẩn hóa đoạn văn: Nhận diện lời thoại thương hiệu & câu thơ độc lập đồng bộ 100% với PDF
customRenderer.paragraph = function({ tokens }) {
  const text = this.parser ? this.parser.parseInline(tokens) : '';
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Đề phòng tiêu đề bị bọc trọn trong thẻ p hoặc p strong:
  if (/^(?:<strong>)?(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+[\s\S]+?(?:<\/strong>)?$/i.test(clean) ||
      /^(?:<strong>)?TỔNG\s+KẾT(?:\s*\(.*?\))?(?:<\/strong>)?$/i.test(clean)) {
    const rawH = clean.replace(/<\/?strong>/gi, '').trim();
    const id = slugifyHeading(rawH);
    return `<h1 class="major-heading" id="${id}">${rawH}</h1>\n`;
  }
  if (/^(?:<strong>)?\d+\.\s+[\s\S]+?(?:<\/strong>)?$/.test(clean) ||
      /^(?:<strong>)?(?:Bản Mệnh|Tương quan|Vị trí Thân)[\s\S]+?(?:<\/strong>)?$/i.test(clean)) {
    const rawH = clean.replace(/<\/?strong>/gi, '').trim();
    const id = slugifyHeading(rawH);
    return `<h2 class="sub-heading" id="${id}">${rawH}</h2>\n`;
  }
  if (/^(?:<strong>)?Năm\s+\d{4}[\s\S]*?(?:<\/strong>)?$/i.test(clean)) {
    const rawH = clean.replace(/<\/?strong>/gi, '').trim();
    const id = slugifyHeading(rawH);
    return `<h4 class="year-heading" id="${id}">${rawH}</h4>\n`;
  }

  // Nhận diện lời thoại thương hiệu "Tử Vi Hồng Ân": Ngắt dòng rộng rãi 24px trên & dưới
  const isDialogue = lower.includes('tử vi hồng ân') && (
    lower.includes('mến chào') ||
    lower.includes('xin được giải đoán') ||
    lower.includes('xin luận giải') ||
    lower.includes('đôi lời tổng quan') ||
    lower.includes('hoan hỷ hữu duyên') ||
    lower.includes('luận tới tam hợp')
  );
  if (isDialogue) {
    return `<p class="brand-dialogue">${text}</p>\n`;
  }

  // Nhận diện câu thơ/phú đặt trong dấu ngoặc kép độc lập: Căn giữa, không nền không viền
  const isIsolatedPoem = (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith('“') && clean.endsWith('”'))
  );
  if (isIsolatedPoem) {
    return `<blockquote class="poem-quote">${text}</blockquote>\n`;
  }

  return `<p>${text}</p>\n`;
};

// Bắt buộc mọi thẻ em/i chuyển thành span chữ đứng chuẩn mực (TUYỆT ĐỐI KHÔNG IN NGHIÊNG)
customRenderer.em = (token) => {
  const content = typeof token === 'object' && token.text ? token.text : (token || '');
  return `<span>${content}</span>`;
};
marked.use({ renderer: customRenderer });

// Xử lý và chuẩn hóa khối Mục Lục: Phân cấp rõ nét Level 1, Level 2, Level 3
function formatTocBlock(tocMarkdown) {
  const lines = tocMarkdown.split('\n');
  const items = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^#+\s*MỤC\s+LỤC/i.test(line) || /^MỤC\s+LỤC$/i.test(line)) {
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const indent = rawLine.length - rawLine.trimStart().length;
      const clean = line.replace(/^[-*+]\s+/, '').trim();

      const linkMatch = clean.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      let title = clean;
      let href = '';
      if (linkMatch) {
        title = linkMatch[1];
        href = linkMatch[2];
      }

      // Phân cấp chuẩn: Level 1 (Phần lớn I-V), Level 2 (Đề mục 1, 2, 3), Level 3 (Năm...)
      let level = 1;
      if (/^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/i.test(title) || /^V\.\s+TỔNG\s+KẾT/i.test(title) || /^TỔNG\s+KẾT$/i.test(title)) {
        level = 1;
      } else if (/^Năm\s+\d{4}/i.test(title) || indent >= 4) {
        level = 3;
      } else if (/^\d+\.\s+/i.test(title) || indent >= 1 || /^(?:Bản Mệnh|Tương quan|Vị trí Thân)/i.test(title)) {
        level = 2;
      } else {
        level = 1;
      }

      const itemContent = href ? `<a href="${href}">${title}</a>` : title;
      items.push(`<li class="toc-item level-${level}">${itemContent}</li>`);
    }
  }

  if (items.length === 0) return '';
  return `<div class="toc-box">\n  <div class="toc-header">MỤC LỤC</div>\n  <ul class="toc-list">\n    ${items.join('\n    ')}\n  </ul>\n</div>\n`;
}

export function formatMarkdownToHtml(markdownText, { allowAutoToc = true } = {}) {
  if (!markdownText) return '';
  let cleanMd = typeof markdownText === 'string' ? markdownText.replace(/\\n/g, '\n') : '';
  cleanMd = sanitizeVietnameseReading(cleanMd);

  // 0. Chuẩn hóa các dòng tiêu đề lớn và tiểu mục:
  const rawLines = cleanMd.split('\n');
  const normalizedLines = rawLines.map((l) => {
    const trimmed = l.trim();
    if (!trimmed) return l;

    // a. Tiêu đề phần lớn I. đến X. hoặc TỔNG KẾT -> Chuẩn hóa về # (H1)
    const majorMatch = trimmed.match(/^(?:#{1,3}\s*)?(?:\*\*)?((?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+[\s\S]+?)(?:\*\*)?$/i) ||
                       trimmed.match(/^(?:#{1,3}\s*)?(?:\*\*)?(TỔNG\s+KẾT(?:\s*\(.*?\))?)(?:\*\*)?$/i);
    if (majorMatch) {
      return `# ${majorMatch[1].trim()}`;
    }

    // b. Tiêu đề các mục số (1. Cung Mệnh, 2. Cung Tài Bạch, 1. Về Đại vận, 2. Về Tiểu vận...) -> Chuẩn hóa về ## (H2)
    const subMatch = trimmed.match(/^(?:#{1,3}\s*)?(?:\*\*)?(\d+\.\s+[\s\S]+?)(?:\*\*)?$/);
    if (subMatch) {
      return `## ${subMatch[1].trim()}`;
    }

    // c. Tiêu đề niên vận "Năm 2003..." -> Chuẩn hóa về #### (H4 - slate-800, không đỏ)
    const yearMatch = trimmed.match(/^(?:#{1,4}\s*)?(?:\*\*)?(Năm\s+\d{4}[\s\S]*?)(?:\*\*)?$/i);
    if (yearMatch) {
      return `#### ${yearMatch[1].trim()}`;
    }

    return l;
  });
  cleanMd = normalizedLines.join('\n');

  // 1. Tự động kiến tạo Mục Lục nếu chưa có phần # MỤC LỤC (chỉ áp dụng cho toàn bài / block đầu tiên)
  if (allowAutoToc && !/#+\s*MỤC\s+LỤC/i.test(cleanMd) && !/^MỤC\s+LỤC$/im.test(cleanMd)) {
    const tocLines = ['# MỤC LỤC'];
    for (const rawL of cleanMd.split('\n')) {
      const sl = rawL.trim();
      if (!sl.startsWith('#')) continue;
      const hm = sl.match(/^(#+)\s*(.+)$/);
      if (!hm) continue;
      const hText = hm[2].trim();
      const slug = slugifyHeading(hText);
      if (/^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/i.test(hText) || /^V\.\s+TỔNG\s+KẾT/i.test(hText) || /^TỔNG\s+KẾT$/i.test(hText)) {
        tocLines.push(`- [${hText}](#${slug})`);
      } else if (/^\d+\.\s+/i.test(hText) || /^(?:Bản Mệnh|Tương quan|Vị trí Thân)/i.test(hText)) {
        tocLines.push(`  - [${hText}](#${slug})`);
      } else if (/^Năm\s+\d{4}/i.test(hText)) {
        tocLines.push(`    - [${hText}](#${slug})`);
      }
    }
    if (tocLines.length > 1) {
      cleanMd = tocLines.join('\n') + '\n\n' + cleanMd;
    }
  }

  // 2. Chuyển đổi khối Mục Lục thành Card giao diện hiện đại
  const tocRegex = /(?:^|\n)(#+\s*MỤC\s+LỤC[\s\S]*?)(?=\n#+\s+[I|1]\.|\n##|\n$)/i;
  const match = cleanMd.match(tocRegex);
  if (match) {
    const rawToc = match[1];
    const tocHtml = formatTocBlock(rawToc);
    cleanMd = cleanMd.replace(rawToc, tocHtml);
  }

  try {
    return marked.parse(cleanMd);
  } catch (err) {
    console.warn('Lỗi parse Markdown:', err);
    return cleanMd;
  }
}

// Component khối bài đọc được memo hóa: chỉ re-render khi nội dung HTML thay đổi (F13)
const ReadingBlock = React.memo(function ReadingBlock({ html }) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="mb-4"
    />
  );
});
// Hàm AI trích xuất và sinh tự động 6 - 8 câu hỏi gợi ý phù hợp dựa trên nội dung thực tế của bài luận giải
export function generateDynamicSuggestions(readingMarkdown, chartData) {
  const text = readingMarkdown || '';
  const questions = ['Hãy tóm tắt ngắn gọn các ý chính trong bài luận giải.'];
  // 1. Cung Thân cư
  const thanMatch = text.match(/Thân cư\s+([A-Za-zÀ-ỹ\s]+?)(?:tại|\(|\.|,|-)/i);
  if (thanMatch) {
    const tc = thanMatch[1].trim();
    if (/Thê/i.test(tc)) {
      questions.push('Cung Thân cư Thê ảnh hưởng ra sao đến hôn nhân và sự nghiệp?');
    } else if (/Phu/i.test(tc)) {
      questions.push('Cung Thân cư Phu ảnh hưởng ra sao đến hôn nhân và sự nghiệp?');
    } else if (/Quan/i.test(tc)) {
      questions.push('Vị trí Thân cư Quan Lộc định hướng con đường công danh thế nào?');
    } else if (/Tài/i.test(tc)) {
      questions.push('Vị trí Thân cư Tài Bạch tác động ra sao đến khả năng tích lũy tài chính?');
    } else if (/Phúc/i.test(tc)) {
      questions.push('Vị trí Thân cư Phúc Đức mang lại phúc ấm và bước ngoặt ra sao?');
    } else if (/Di|Thiên Di/i.test(tc)) {
      questions.push('Thân cư Thiên Di có lợi thế gì khi phát triển xã hội hoặc đi xa?');
    } else if (/Mệnh/i.test(tc)) {
      questions.push('Thân Mệnh đồng cung thể hiện bản lĩnh tự lập và tính cách ra sao?');
    }
  }
  // 2. Tam hợp Mệnh - Tài - Quan & Bộ sao chủ đạo
  if (/Sát Phá Tham/i.test(text)) {
    questions.push('Cách cục Sát Phá Tham trên tinh bàn tác động thế nào đến vận mệnh?');
  } else if (/Tử Phủ Vũ Tướng/i.test(text)) {
    questions.push('Bộ sao Tử Phủ Vũ Tướng mở ra cơ hội lãnh đạo và phát triển thế nào?');
  } else if (/Cơ Nguyệt Đồng Lương/i.test(text)) {
    questions.push('Cách cục Cơ Nguyệt Đồng Lương định hướng sự nghiệp chuyên môn ra sao?');
  } else if (/Cự Nhật|Cự Cơ/i.test(text)) {
    questions.push('Bộ sao Cự Môn trên tinh bàn ảnh hưởng gì đến các mối quan hệ xã hội?');
  }
  // 3. Cung Tài Bạch
  if (/Phá Quân/i.test(text) && /Tài Bạch/i.test(text)) {
    questions.push('Dòng tiền theo cung Tài Bạch ngộ Phá Quân cần lưu ý điều gì?');
  } else if (/Tài Bạch/i.test(text)) {
    questions.push('Cơ hội tài lộc và khả năng tích lũy tiền của tôi diễn biến thế nào?');
  }
  // 4. Cung Quan Lộc
  if (/Không Kiếp/i.test(text) && /Quan Lộc/i.test(text)) {
    questions.push('Cách hóa giải hung sát tinh ngộ Không Kiếp tại cung Quan Lộc?');
  } else if (/Thất Sát/i.test(text) && /Quan Lộc/i.test(text)) {
    questions.push('Cách vượt qua áp lực và thử thách trong công việc theo cung Quan Lộc?');
  } else if (/Quan Lộc/i.test(text)) {
    questions.push('Môi trường công việc và hướng thăng tiến phù hợp nhất với tôi là gì?');
  }
  // 5. Đại vận 10 năm
  const dvMatch = text.match(/đại vận\s*(\d{1,2}\s*-\s*\d{1,2}\s*tuổi)/i);
  if (dvMatch) {
    questions.push(`Đại vận ${dvMatch[1]} mang lại những bước ngoặt then chốt nào?`);
  } else {
    questions.push('Đại vận 10 năm hiện tại có những cơ hội và thách thức gì?');
  }
  // 6. Tiểu vận các năm
  const yearMatches = text.match(/Năm\s*(20\d{2})/g);
  if (yearMatches) {
    const rawYears = yearMatches.map((m) => m.replace(/\D/g, ''));
    const uniqueYears = [...new Set(rawYears)];
    if (uniqueYears.length >= 1) {
      questions.push(`Vận hạn và cơ hội tài chính trong năm ${uniqueYears[0]} diễn biến thế nào?`);
    }
    if (uniqueYears.length >= 2) {
      const rest = uniqueYears.slice(1, 3).join(' và ');
      questions.push(`Năm ${rest} tôi cần lưu ý gì về sức khỏe và công việc?`);
    }
  }
  // 7. Lời khuyên tu dưỡng / Hóa giải
  questions.push('Lời khuyên tu dưỡng để kích hoạt phúc đức, vạn sự hanh thông?');
  return questions.slice(0, 8);
}
// Trần hạn mức Output Token tối đa cho toàn bộ các lượt hỏi đáp AI trong phiên
const MAX_QA_TOKENS = 10000;
// Thông tin mặc định dự phòng chuẩn khi đương số vào trực tiếp /luan-giai-ai mà chưa qua trang Lập lá số
const DEFAULT_FALLBACK_CHART = {
  ho_ten: 'Đương số',
  gioi_tinh: 'Nam',
  loai_lich: 'Dương lịch',
  is_solar: true,
  ngay_sinh: 15,
  thang_sinh: 8,
  nam_sinh: 1996,
  gio_sinh_gio: 9,
  phut_sinh: 30,
  chi_gio: 'Tỵ',
  nam_xem_han: 2026,
  duong_lich: { day: 15, month: 8, year: 1996 }
};
export default function AiInterpretationGeminiView() {
  const navigate = useNavigate();
  const location = useLocation();
  // Dữ liệu đầu vào từ navigation state hoặc sessionStorage/localStorage (chống F5 mất dữ liệu)
  const navState = location.state || {};
  const [markdownAi, setMarkdownAi] = useState(() => {
    if (navState.markdownAi) return navState.markdownAi;
    try {
      return sessionStorage.getItem('tuvi_markdown_ai') || localStorage.getItem('tuvi_markdown_ai') || '';
    } catch (_e) {
      return '';
    }
  });
  const [chartData, setChartData] = useState(() => {
    if (navState.chartData) return navState.chartData;
    try {
      const rawCd = sessionStorage.getItem('tuvi_chart_data') || localStorage.getItem('tuvi_chart_data');
      if (rawCd) return JSON.parse(rawCd);
    } catch (_e) {}
    return null;
  });
  const [chartImageUrl, setChartImageUrl] = useState(() => {
    if (navState.chartImageUrl) return navState.chartImageUrl;
    try {
      return sessionStorage.getItem('tuvi_chart_image_url') || localStorage.getItem('tuvi_chart_image_url') || '';
    } catch (_e) {
      return '';
    }
  });
  const [sessionId, setSessionId] = useState(() => {
    if (navState.sessionId) return navState.sessionId;
    return getActiveSessionId() || null;
  });
  // Trạng thái Bố cục & Split View
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Trạng thái Luận giải AI
  const [isThinking, setIsThinking] = useState(false);
  const [isFadingSkeleton, setIsFadingSkeleton] = useState(false);
  const [renderedBlocks, setRenderedBlocks] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExtendedRetry, setIsExtendedRetry] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [apiError, setApiError] = useState(null);
  // Phân biệt chế độ xem lại lịch sử cụ thể hay là vào trang mới
  const isExplicitHistory = Boolean(
    navState.isHistoryView ||
    navState.sessionId ||
    (typeof window !== 'undefined' && window.location.search.includes('view=history'))
  );
  // Quản lý trạng thái:
  // - isConfirmed: Đương số đã xác nhận thông tin hay chưa (mặc định là false để hiển thị Thẻ xác nhận cố định cột phải)
  // - isFadingOutCard: Kích hoạt hiệu ứng mờ dần (fade-out 350ms) cho Thẻ xác nhận khi bấm Xác nhận
  const [isConfirmed, setIsConfirmed] = useState(isExplicitHistory);
  const [isFadingOutCard, setIsFadingOutCard] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userQuota, setUserQuota] = useState(null);
  // Cuộc hội thoại hỏi đáp bổ sung & Hạn mức token & Gợi ý động AI
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [usedQaTokens, setUsedQaTokens] = useState(0);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState([]);
  const isQuotaExceeded = usedQaTokens >= MAX_QA_TOKENS;
  // Thanh nhập liệu chat (Input Bar) chỉ hiển thị mượt mà với hiệu ứng Fade-in khi AI hoàn tất quá trình luận giải
  const showInputBar = isConfirmed && !isThinking && !isStreaming && renderedBlocks.length > 0;
  // Dữ liệu đương số hiệu lực (chuẩn hóa đa tầng tự động thích ứng với mọi định dạng payload)
  const effectiveChartData = normalizeChartData(chartData, markdownAi);
  // Danh sách gợi ý động lấy từ AI hoặc phân tích trực tiếp từ bài luận giải thực tế
  const activeSuggestions = dynamicSuggestions.length > 0
    ? dynamicSuggestions
    : generateDynamicSuggestions(renderedBlocks.join('\n\n'), effectiveChartData);
  // Refs
  const iframeRef = useRef(null);
  const messagesEndRef = useRef(null);
  const readingStartRef = useRef(null);
  const latestUserMessageRef = useRef(null);
  const latestUserMessageIndexRef = useRef(-1);
  const readingInitiatedRef = useRef(false);
  const textareaRef = useRef(null);
  const suggestionsMenuRef = useRef(null);
  const suggestionsButtonRef = useRef(null);
  const lastEnterTimeRef = useRef(0);
  // Cuộn mượt đến đúng vị trí bắt đầu (dòng đầu tiên) của bài luận giải AI
  const scrollToReadingStart = useCallback(() => {
    setTimeout(() => {
      if (readingStartRef.current) {
        readingStartRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 200);
  }, []);
  // Cuộn mượt neo dòng đầu tiên của tin nhắn câu hỏi người dùng vừa gửi sát mép trên viewport
  const scrollToLatestUserMessage = useCallback(() => {
    setTimeout(() => {
      if (latestUserMessageRef.current) {
        latestUserMessageRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  }, []);

  // Refs phục vụ hàng đợi nhả chữ & cuộn bám đuổi (F13, F15, F16)
  const parsedHtmlCacheRef = useRef(new Map());
  const rawBufferRef = useRef('');
  const displayedTextRef = useRef('');
  const cadenceRafRef = useRef(null);
  const isStreamingActiveRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const followScrollRafRef = useRef(null);
  const isUserScrolledUpRef = useRef(false);
  const skeletonFadeTimeoutRef = useRef(null);

  // Hàm kích hoạt cuộn giảm tốc bám đuổi theo rAF (F15)
  const triggerFollowScroll = useCallback(() => {
    if (isUserScrolledUpRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    if (followScrollRafRef.current) {
      cancelAnimationFrame(followScrollRafRef.current);
    }

    const step = () => {
      if (isUserScrolledUpRef.current || !scrollContainerRef.current) {
        followScrollRafRef.current = null;
        return;
      }
      const maxScroll = container.scrollHeight - container.clientHeight;
      const currentScroll = container.scrollTop;
      const dist = maxScroll - currentScroll;

      if (dist > 2) {
        // Easing deceleration: bước nhảy tỷ lệ với khoảng cách còn lại (~0.12)
        // Tái hiện đường cong cubic-bezier(0.16, 1, 0.3, 1) cho mục tiêu di động
        const move = Math.max(1.5, dist * 0.12);
        container.scrollTop = Math.min(maxScroll, currentScroll + move);
        followScrollRafRef.current = requestAnimationFrame(step);
      } else {
        container.scrollTop = maxScroll;
        followScrollRafRef.current = null;
      }
    };

    followScrollRafRef.current = requestAnimationFrame(step);
  }, []);

  // Bộ máy bơm chữ đàn hồi (Elastic Cadence Queue - F16)
  const startCadenceDrain = useCallback(() => {
    if (cadenceRafRef.current) return;

    const drain = () => {
      const target = rawBufferRef.current;
      const current = displayedTextRef.current;
      const backlog = target.length - current.length;

      if (backlog > 0) {
        // Nhả chữ đàn hồi: cơ sở 2-3 ký tự/frame khi nhàn rỗi (40-60 wpm),
        // tự động tăng tốc xả hết backlog trong ~8-12 frames khi có chùm chunk lớn
        const step = Math.max(2, Math.ceil(backlog / 8));
        const nextLen = Math.min(target.length, current.length + step);
        const nextText = target.slice(0, nextLen);
        displayedTextRef.current = nextText;

        const sections = nextText.split(/\n(?=## )/);
        setRenderedBlocks(sections);
        triggerFollowScroll();
      }

      if (isStreamingActiveRef.current || target.length > displayedTextRef.current.length) {
        cadenceRafRef.current = requestAnimationFrame(drain);
      } else {
        cadenceRafRef.current = null;
      }
    };

    cadenceRafRef.current = requestAnimationFrame(drain);
  }, [triggerFollowScroll]);

  // Lắng nghe hành vi cuộn ngược của người dùng trên container bài đọc (F15)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.deltaY < -2) {
        // Người dùng cuộn chuột ngược lên trên -> tạm ngắt auto-scroll
        isUserScrolledUpRef.current = true;
        if (followScrollRafRef.current) {
          cancelAnimationFrame(followScrollRafRef.current);
          followScrollRafRef.current = null;
        }
      } else if (e.deltaY > 2) {
        // Người dùng cuộn xuống dưới -> nếu đã chạm sát đáy thì tái kích hoạt bám đuổi
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll - container.scrollTop <= 60) {
          isUserScrolledUpRef.current = false;
        }
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e) => {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY;
      if (deltaY > 6) {
        // Kéo ngón tay xuống (nội dung trôi lên) = cuộn ngược -> tạm dừng
        isUserScrolledUpRef.current = true;
        if (followScrollRafRef.current) {
          cancelAnimationFrame(followScrollRafRef.current);
          followScrollRafRef.current = null;
        }
      } else if (deltaY < -6) {
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll - container.scrollTop <= 60) {
          isUserScrolledUpRef.current = false;
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      if (followScrollRafRef.current) {
        cancelAnimationFrame(followScrollRafRef.current);
      }
      if (cadenceRafRef.current) {
        cancelAnimationFrame(cadenceRafRef.current);
      }
      if (skeletonFadeTimeoutRef.current) {
        clearTimeout(skeletonFadeTimeoutRef.current);
      }
    };
  }, []);
  // Tải thông tin hạn mức của tài khoản người dùng
  const loadQuota = useCallback(async () => {
    try {
      const q = await fetchUserAiQuota();
      setUserQuota(q);
      return q;
    } catch (e) {
      console.warn('Không thể kiểm tra lượt sử dụng:', e);
      return null;
    }
  }, []);
  useEffect(() => {
    loadQuota();
  }, [loadQuota]);
  // Lắng nghe sự kiện đồng bộ từ iframe lá số và nhận ảnh tự động xuất
  useEffect(() => {
    function handleIframeMessage(e) {
      if (!e.data || typeof e.data !== 'object') return;
      // 1. Nhận ảnh lá số đã xuất tự động từ engine
      if (e.data.type === 'TUVI_CHART_IMAGE_GENERATED' && e.data.chartImageUrl) {
        setChartImageUrl(e.data.chartImageUrl);
        try {
          sessionStorage.setItem('tuvi_chart_image_url', e.data.chartImageUrl);
          localStorage.setItem('tuvi_chart_image_url', e.data.chartImageUrl);
        } catch (_err) {}
      }
      // 2. Nhận dữ liệu markdown tinh bàn
      if (e.data.type === 'TUVI_MARKDOWN_GENERATED') {
        if (e.data.markdown_ai) {
          setMarkdownAi(e.data.markdown_ai);
          try {
            sessionStorage.setItem('tuvi_markdown_ai', e.data.markdown_ai);
            localStorage.setItem('tuvi_markdown_ai', e.data.markdown_ai);
          } catch (_err) {}
        }
        if (e.data.chartData) {
          setChartData(e.data.chartData);
          try {
            sessionStorage.setItem('tuvi_chart_data', JSON.stringify(e.data.chartData));
            localStorage.setItem('tuvi_chart_data', JSON.stringify(e.data.chartData));
          } catch (_err) {}
        }
      }
    }
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);
  // Khôi phục đa tầng (IndexedDB -> Router State -> URL Params -> Storage) Chống F5 mất dữ liệu
  useEffect(() => {
    let isMounted = true;
    async function initData() {
      const params = new URLSearchParams(location.search);
      const hashFromUrl = params.get('chartHash');
      const payload = await restoreChartPayload({
        chartHash: hashFromUrl,
        routerState: location.state
      });
      if (isMounted && payload) {
        if (payload.chartData && !chartData) {
          setChartData(payload.chartData);
        }
        if (payload.markdownAi && !markdownAi) {
          setMarkdownAi(payload.markdownAi);
        }
        if (payload.chartImageUrl && !chartImageUrl) {
          setChartImageUrl(payload.chartImageUrl);
        }
        if (payload.readingResult && renderedBlocks.length === 0) {
          parsedHtmlCacheRef.current.clear();
          const rawSections = payload.readingResult.split(/\n(?=## )/);
          setRenderedBlocks(rawSections);
          setIsConfirmed(true);
        }
      }
    }
    initData();
    return () => { isMounted = false; };
  }, [location.search, location.state]);
  // Khôi phục dữ liệu từ sessionStorage hoặc localStorage nếu chưa có
  useEffect(() => {
    if (!markdownAi) {
      try {
        const savedMd = sessionStorage.getItem('tuvi_markdown_ai') || localStorage.getItem('tuvi_markdown_ai');
        if (savedMd) setMarkdownAi(savedMd);
      } catch (_e) {}
    }
    if (!chartImageUrl) {
      try {
        const savedImg = sessionStorage.getItem('tuvi_chart_image_url') || localStorage.getItem('tuvi_chart_image_url');
        if (savedImg) setChartImageUrl(savedImg);
      } catch (_e) {}
    }
    if (!chartData) {
      try {
        const rawCd = sessionStorage.getItem('tuvi_chart_data') || localStorage.getItem('tuvi_chart_data');
        if (rawCd) setChartData(JSON.parse(rawCd));
      } catch (_e) {}
    }
  }, [markdownAi, chartImageUrl, chartData]);
  // Quản lý khởi tạo phiên luận giải:
  // - Nếu là phiên lịch sử chỉ định rõ ràng (isExplicitHistory): mở lại kết quả từ lịch sử (không hiện Thẻ xác nhận)
  // - Nếu là phiên mới / truy cập thông thường: Giữ isConfirmed = false để hiển thị Thẻ xác nhận thông tin đương số cố định cột phải
  useEffect(() => {
    if (readingInitiatedRef.current) return;
    if (isExplicitHistory && sessionId) {
      let existing = getAiSessionById(sessionId);
      if (existing) {
        const activeChart = normalizeChartData(chartData, markdownAi);
        const currentChartKey = getChartKey(activeChart);
        if (existing.chartKey && existing.chartKey !== currentChartKey && !isExplicitHistory) {
          existing = null;
        }
      }
      if (!existing && (chartData?.reading_markdown || navState?.reading_markdown)) {
        const rawText = chartData?.reading_markdown || navState?.reading_markdown;
        existing = {
          sessionId,
          renderedBlocks: rawText.split(/\n(?=## )/),
          messages: [],
          usedQaTokens: 0,
          suggestedQuestions: []
        };
      }
      if (existing && (existing.renderedBlocks?.length > 0 || existing.messages?.length > 0)) {
        parsedHtmlCacheRef.current.clear();
        readingInitiatedRef.current = true;
        setSessionId(existing.sessionId);
        setRenderedBlocks(existing.renderedBlocks || []);
        setMessages(existing.messages || []);
        if (typeof existing.usedQaTokens === 'number') {
          setUsedQaTokens(existing.usedQaTokens);
        }
        if (existing.suggestedQuestions && Array.isArray(existing.suggestedQuestions) && existing.suggestedQuestions.length > 0) {
          setDynamicSuggestions(existing.suggestedQuestions);
        }
        setIsThinking(false);
        setIsStreaming(false);
        if (existing.chartImageUrl && !chartImageUrl) setChartImageUrl(existing.chartImageUrl);
        if (existing.chartData && !chartData) setChartData(existing.chartData);
        if (existing.markdownAi && !markdownAi) setMarkdownAi(existing.markdownAi);
        setActiveSessionId(existing.sessionId);
        setIsConfirmed(true);
        return;
      }
    }
    // Mọi trường hợp vào trang thông thường: Giữ isConfirmed = false để hiện Thẻ xác nhận cố định cột phải
    readingInitiatedRef.current = true;
    setIsConfirmed(false);
  }, [sessionId, isExplicitHistory, markdownAi, chartData, chartImageUrl]);
  const persistReadingToDatabase = async (finalText, cData, mAi) => {
    try {
      const token = localStorage.getItem('tuvi_token');
      if (!token || !finalText) return;
      const norm = normalizeChartData(cData, mAi);
      const code = cData?.id_code || cData?.idCode || cData?.chart_code || `HA-${norm.nam_sinh}${String(norm.thang_sinh).padStart(2, '0')}${String(norm.ngay_sinh).padStart(2, '0')}`;
      await fetch('/api/user/charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chart_code: code,
          ho_ten: norm.ho_ten || 'Vô Danh',
          gioi_tinh: norm.gioi_tinh || 'Nam',
          ngay_sinh: norm.ngay_sinh || 1,
          thang_sinh: norm.thang_sinh || 1,
          nam_sinh: norm.nam_sinh || 2000,
          gio_sinh: norm.gio_sinh || 0,
          phut_sinh: norm.phut_sinh || 0,
          loai_lich: 'duong_lich',
          nam_xem_han: 2026,
          input_data: cData?.input_data || norm,
          chart_data: cData || {},
          reading_markdown: finalText
        })
      });
    } catch (saveErr) {
      console.warn('[TuVi] Không thể tự động lưu bài luận lên máy chủ:', saveErr);
    }
  };
  // Tải bản luận giải định dạng PDF chuẩn thương hiệu Tử Vi Hồng Ân
  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    const fullMarkdown = renderedBlocks.join('\n\n');
    if (!fullMarkdown.trim()) {
      alert('Chưa có nội dung bài luận giải để tải bản PDF.');
      return;
    }
    setIsExportingPdf(true);
    try {
      const norm = normalizeChartData(chartData, markdownAi);
      const rawName = (norm.ho_ten || 'Huu_Duyen')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      const safeFileName = `Luan_Giai_Tu_Vi_Hong_An_${rawName || 'Huu_Duyen'}.pdf`;

      // Nếu chartImageUrl không phải Data URL (ví dụ blob:, http:, /api/...), chuyển sang Base64 Data URL để backend tiếp nhận
      let imagePayload = chartImageUrl && chartImageUrl.startsWith('data:image/') ? chartImageUrl : null;
      if (chartImageUrl && !imagePayload) {
        try {
          const imgResp = await fetch(chartImageUrl);
          if (imgResp.ok) {
            const imgBlob = await imgResp.blob();
            const dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(imgBlob);
            });
            if (dataUrl && dataUrl.startsWith('data:image/')) {
              imagePayload = dataUrl;
            }
          }
        } catch (_blobErr) {
          console.warn('[TuVi] Không thể chuyển đổi ảnh lá số sang base64 data URL:', _blobErr);
        }
      }

      const token = localStorage.getItem('tuvi_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/ai/export-pdf', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          markdown_text: fullMarkdown,
          chart_image: imagePayload || null,
          title: `Luận Giải Tử Vi - ${norm.ho_ten || 'Tử Vi Hồng Ân'}`,
          filename: safeFileName
        })
      });

      if (!response.ok) {
        let errMessage = 'Máy chủ backend (cổng 8080) hiện chưa phản hồi hoặc gặp sự cố.';
        try {
          const errJson = await response.json();
          if (errJson?.error || errJson?.message) {
            errMessage = errJson.error || errJson.message;
          }
        } catch (_jsonErr) {}
        if (response.status === 401) {
          setAuthOpen(true);
        }
        throw new Error(errMessage);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = safeFileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Trì hoãn thu hồi Object URL để trình duyệt Apple Safari kịp khởi tạo luồng tải tệp
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(blobUrl);
        } catch (_e) {}
      }, 5000);
    } catch (err) {
      console.error('[TuVi] Lỗi khi tải PDF:', err);
      alert(`Tải bản PDF không thành công: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Thực thi gọi API Luận giải AI thực tế (Hỗ trợ SSE Streaming & REST Fallback)
  const executeAiReading = async (options = {}) => {
    const isExtended = Boolean(options?.extendedQuota);
    if (isExtended) {
      setIsExtendedRetry(true);
    }
    setIsThinking(true);
    setIsStreaming(true);
    setApiError(null);
    setRenderedBlocks([]); // Luôn dọn sạch bài cũ trước khi tạo bài mới
    parsedHtmlCacheRef.current.clear();
    rawBufferRef.current = '';
    displayedTextRef.current = '';
    isStreamingActiveRef.current = true;
    isUserScrolledUpRef.current = false;
    if (cadenceRafRef.current) {
      cancelAnimationFrame(cadenceRafRef.current);
      cadenceRafRef.current = null;
    }
    if (followScrollRafRef.current) {
      cancelAnimationFrame(followScrollRafRef.current);
      followScrollRafRef.current = null;
    }
    if (skeletonFadeTimeoutRef.current) {
      clearTimeout(skeletonFadeTimeoutRef.current);
      skeletonFadeTimeoutRef.current = null;
    }
    const currentSessionId = 'session_' + Date.now();
    setSessionId(currentSessionId);
    setActiveSessionId(currentSessionId);
    const activeChart = normalizeChartData(chartData, markdownAi);
    const chartKey = getChartKey(activeChart);
    const title = activeChart?.ho_ten ? `Luận giải lá số: ${activeChart.ho_ten}` : 'Luận giải tổng quan lá số';
    const calcAge = activeChart?.tuoi_mu || (activeChart?.nam_sinh ? (new Date().getFullYear() - activeChart.nam_sinh + 1) : 28);
    const calcGender = activeChart?.gioi_tinh || 'Nam';
    try {
      const currentMd = markdownAi || sessionStorage.getItem('tuvi_markdown_ai') || localStorage.getItem('tuvi_markdown_ai');
      if (!currentMd) {
        throw new Error('Chưa nhận được dữ liệu tinh bàn Markdown AI từ lá số. Vui lòng bấm "Thay đổi thông tin" để tạo lại lá số từ form.');
      }
      let usedStreaming = false;
      try {
        await streamAiInterpretation(
          {
            markdownAi: currentMd,
            age: calcAge,
            gender: calcGender,
            chartData: activeChart,
            extendedQuota: isExtended
          },
          (chunk) => {
            if (!usedStreaming) {
              usedStreaming = true;
              setIsFadingSkeleton(true);
              if (skeletonFadeTimeoutRef.current) clearTimeout(skeletonFadeTimeoutRef.current);
              skeletonFadeTimeoutRef.current = setTimeout(() => {
                setIsThinking(false);
                setIsFadingSkeleton(false);
              }, 240);
            }
            rawBufferRef.current += chunk;
            startCadenceDrain();
          },
          (finalRes) => {
            if (cadenceRafRef.current) {
              cancelAnimationFrame(cadenceRafRef.current);
              cadenceRafRef.current = null;
            }
            isStreamingActiveRef.current = false;
            usedStreaming = true;
            setIsThinking(false);
            setIsFadingSkeleton(false);
            setIsStreaming(false);
            setIsExtendedRetry(false);
            const finalText = typeof finalRes === 'object'
              ? (finalRes.reading_markdown || finalRes.text || rawBufferRef.current)
              : (finalRes || rawBufferRef.current);
            rawBufferRef.current = finalText;
            displayedTextRef.current = finalText;
            const rawSections = finalText.split(/\n(?=## )/);
            setRenderedBlocks(rawSections);
            scrollToReadingStart();
            if (finalRes && typeof finalRes === 'object') {
              if (finalRes.remaining_credits !== undefined) {
                setUserQuota((prev) => ({
                  ...prev,
                  credits: finalRes.remaining_credits,
                  unlimited: Boolean(finalRes.unlimited)
                }));
              }
              if (finalRes.suggested_questions && finalRes.suggested_questions.length > 0) {
                setDynamicSuggestions(finalRes.suggested_questions);
              }
            }
            saveAiSession({
              sessionId: currentSessionId,
              chartKey,
              title,
              chartData,
              markdownAi: currentMd,
              chartImageUrl,
              renderedBlocks: rawSections,
              messages: [],
              usedQaTokens: 0,
              suggestedQuestions: (finalRes && finalRes.suggested_questions) || generateDynamicSuggestions(finalText, chartData)
            });
            if (chartData) {
              const hash = generateChartHash(chartData);
              saveReadingToIndexedDb(hash, finalText);
            }
            persistReadingToDatabase(finalText, chartData, currentMd);
          }
        );
      } catch (streamErr) {
        if (cadenceRafRef.current) {
          cancelAnimationFrame(cadenceRafRef.current);
          cadenceRafRef.current = null;
        }
        isStreamingActiveRef.current = false;
        console.warn('SSE Streaming gặp sự cố, tự động chuyển REST API:', streamErr);
      }
      if (!usedStreaming) {
        const apiRes = await fetchAiInterpretation({
          markdownAi: currentMd,
          age: calcAge,
          gender: calcGender,
          extendedQuota: isExtended
        });
        if (apiRes && apiRes.reading_markdown) {
          if (apiRes.remaining_credits !== undefined) {
            setUserQuota((prev) => ({
              ...prev,
              credits: apiRes.remaining_credits,
              unlimited: Boolean(apiRes.unlimited)
            }));
          }
          if (apiRes.suggested_questions && apiRes.suggested_questions.length > 0) {
            setDynamicSuggestions(apiRes.suggested_questions);
          }
          const rawSections = apiRes.reading_markdown.split(/\n(?=## )/);
          setIsThinking(false);
          parsedHtmlCacheRef.current.clear();
          const blocksAccumulator = [];
          for (let i = 0; i < rawSections.length; i++) {
            await new Promise((r) => setTimeout(r, 220));
            blocksAccumulator.push(rawSections[i]);
            setRenderedBlocks([...blocksAccumulator]);
          }
          setIsStreaming(false);
          setIsExtendedRetry(false);
          scrollToReadingStart();
          saveAiSession({
            sessionId: currentSessionId,
            chartKey,
            title,
            chartData,
            markdownAi: currentMd,
            chartImageUrl,
            renderedBlocks: blocksAccumulator,
            messages: [],
            usedQaTokens: 0,
            suggestedQuestions: apiRes.suggested_questions || generateDynamicSuggestions(apiRes.reading_markdown, chartData)
          });
          if (chartData) {
            const hash = generateChartHash(chartData);
            saveReadingToIndexedDb(hash, apiRes.reading_markdown);
          }
          persistReadingToDatabase(apiRes.reading_markdown, chartData, currentMd);
        } else {
          throw new Error(apiRes?.error || 'Máy chủ AI không trả về nội dung hợp lệ.');
        }
      }
    } catch (err) {
      console.error('Lỗi khi gọi API Luận giải thực tế:', err);
      setIsThinking(false);
      setIsStreaming(false);
      setIsExtendedRetry(false);
      setApiError(err.message || 'Lỗi kết nối máy chủ AI Luận Giải.');
    }
  };
  // Xử lý khi người dùng nhấn nút "Xác nhận" trên Thẻ xác nhận
  const handleConfirmReading = async () => {
    let currentQuota = userQuota;
    if (!currentQuota) {
      currentQuota = await loadQuota();
    }
    const isLoggedIn = Boolean(currentQuota?.logged_in);
    const isAdmin = Boolean(currentQuota?.is_admin || currentQuota?.unlimited);
    if (!isLoggedIn) {
      setAuthOpen(true);
      return;
    }
    if (!isAdmin && currentQuota?.credits <= 0) {
      alert('Tài khoản của bạn đã hết lượt luận giải lá số bằng AI. Vui lòng nạp thêm lượt để tiếp tục.');
      return;
    }
    // 1. Kích hoạt hiệu ứng Fade-out mượt mà cho Thẻ xác nhận (350ms)
    setIsFadingOutCard(true);
    setTimeout(async () => {
      // 2. Chuyển trạng thái xác nhận và kết thúc fade-out
      setIsConfirmed(true);
      setIsFadingOutCard(false);
      // 3. Kích hoạt AI bắt đầu sinh nội dung luận giải
      await executeAiReading();
    }, 350);
  };
  // Xử lý đăng nhập Google thành công từ AuthModal
  const handleAuthSuccess = async () => {
    const q = await loadQuota();
    setAuthOpen(false);
    if (q && (q.is_admin || q.unlimited || q.credits > 0)) {
      handleConfirmReading();
    }
  };
  // Tự động điều chỉnh độ cao của textarea theo nội dung nhập (Chuẩn hóa Single-line 28px -> Multi-line tối đa 120px)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!inputValue || !inputValue.trim()) {
      el.style.height = '28px';
      return;
    }
    el.style.height = '28px';
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(scrollH, 28), 120)}px`;
  }, [inputValue]);
  // Đã chuyển logic cuộn mượt sang scrollToReadingStart và scrollToLatestUserMessage theo đúng chuẩn UX
  // Xử lý đóng mở Menu Gợi Ý khi click ra ngoài hoặc bấm phím Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsMenuRef.current &&
        !suggestionsMenuRef.current.contains(e.target) &&
        suggestionsButtonRef.current &&
        !suggestionsButtonRef.current.contains(e.target)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    const handleKeyDownEsc = (e) => {
      if (e.key === 'Escape') {
        setIsSuggestionsOpen(false);
      }
    };
    if (isSuggestionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDownEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDownEsc);
    };
  }, [isSuggestionsOpen]);
  // Gửi tin nhắn câu hỏi tiếp nối
  const handleSendMessage = (customText) => {
    const text = (customText !== undefined ? customText : inputValue).trim();
    if (!text || isSubmittingMessage || isQuotaExceeded) return;
    setIsSuggestionsOpen(false);
    const userMsg = { sender: 'user', text, timestamp: new Date().toISOString() };
    const nextMessages = [...messages, userMsg];
    const userMsgIdx = nextMessages.length - 1;
    latestUserMessageIndexRef.current = userMsgIdx;
    setMessages(nextMessages);
    setInputValue('');
    setIsSubmittingMessage(true);
    // Tự động cuộn neo dòng đầu tiên của tin nhắn câu hỏi sát mép trên viewport
    scrollToLatestUserMessage();
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
    }
    const calcAge = chartData?.nam_sinh ? (new Date().getFullYear() - chartData.nam_sinh + 1) : 28;
    const calcGender = chartData?.gioi_tinh || 'Nam';
    sendAiFollowupQuestion({
      question: text,
      markdownAi,
      readingText: renderedBlocks.join('\n\n'),
      history: nextMessages.slice(-4),
      age: calcAge,
      gender: calcGender,
      accumulatedTokens: usedQaTokens
    }).then((res) => {
      if (res.quota_exceeded && !res.answer) {
        setUsedQaTokens(MAX_QA_TOKENS);
        setIsSubmittingMessage(false);
        return;
      }
      const aiReply = {
        sender: 'ai',
        timestamp: new Date().toISOString(),
        text: res.answer || res.text || 'Tử Vi Hồng Ân đã ghi nhận câu hỏi của bạn.'
      };
      setMessages([...nextMessages, aiReply]);
      setIsSubmittingMessage(false);
      // Khi AI phản hồi, giữ hoặc cuộn mượt sao cho dòng đầu tiên của câu hỏi tiếp tục neo sát mép trên viewport
      scrollToLatestUserMessage();
      const outTokens = res.usage_metadata?.candidatesTokenCount || Math.ceil((res.answer || '').length / 3.2);
      const updatedAccumulated = (res.accumulated_tokens !== undefined)
        ? res.accumulated_tokens
        : (usedQaTokens + outTokens);
      setUsedQaTokens(updatedAccumulated);
    }).catch((err) => {
      console.error('Lỗi khi gửi câu hỏi:', err);
      const aiReply = {
        sender: 'ai',
        timestamp: new Date().toISOString(),
        text: err.message || 'Tử Vi Hồng Ân đang bận xử lý dữ liệu tinh bàn, xin Quý anh/chị vui lòng thử lại sau giây lát.'
      };
      setMessages([...nextMessages, aiReply]);
      setIsSubmittingMessage(false);
      scrollToLatestUserMessage();
    });
  };
  // Xử lý phím tắt bàn phím trên textarea
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isQuotaExceeded && inputValue.trim() && !isSubmittingMessage) {
        handleSendMessage();
      }
      lastEnterTimeRef.current = 0;
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      const now = Date.now();
      if (now - lastEnterTimeRef.current <= 450) {
        e.preventDefault();
        lastEnterTimeRef.current = 0;
        if (!isQuotaExceeded && inputValue.trim() && !isSubmittingMessage) {
          const cleanText = inputValue.replace(/[\r\n]+$/, '');
          handleSendMessage(cleanText);
        }
      } else {
        lastEnterTimeRef.current = now;
      }
      return;
    }
    lastEnterTimeRef.current = 0;
  };
  const handleSelectSuggestion = (questionText) => {
    if (isQuotaExceeded) return;
    setInputValue(questionText);
    setIsSuggestionsOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  // Nút quay về trang lập lá số và bảo toàn state (Yêu cầu 3.2: Nút Thay đổi thông tin & Chuyển trang mượt mà)
  const handleGoBack = () => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      const norm = normalizeChartData(chartData, markdownAi);
      const inp = {
        name: norm.ho_ten,
        gender: norm.gioi_tinh,
        day: norm.ngay_sinh,
        month: norm.thang_sinh,
        year: norm.nam_sinh,
        hour: norm.gio_sinh,
        minute: norm.phut_sinh,
        isSolar: norm.is_solar,
        is_solar: norm.is_solar,
        isLeapMonthInput: norm.is_leap,
        is_leap_month_input: norm.is_leap,
        limitYear: norm.nam_xem_han,
        limit_year: norm.nam_xem_han
      };
      if (chartData) {
        sessionStorage.setItem('tuvi_chart_data', JSON.stringify(chartData));
        localStorage.setItem('tuvi_chart_data', JSON.stringify(chartData));
      }
      if (markdownAi) {
        sessionStorage.setItem('tuvi_markdown_ai', markdownAi);
        localStorage.setItem('tuvi_markdown_ai', markdownAi);
      }
      if (chartImageUrl) {
        sessionStorage.setItem('tuvi_chart_image_url', chartImageUrl);
        localStorage.setItem('tuvi_chart_image_url', chartImageUrl);
      }
    } catch (_e) {}
    const doNav = () => {
      navigate('/la-so-tu-vi', {
        state: {
          activeSessionId: sessionId,
          chartData,
          markdownAi,
          chartImageUrl,
          restoreScroll: true
        }
      });
    };
    // Chuyển trang mượt mà 60fps với View Transition API hoặc CSS timeout
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        doNav();
      });
    } else {
      setTimeout(doNav, 300);
    }
  };
  return (
    <div className={`relative w-screen h-screen h-[100dvh] flex flex-col overflow-hidden bg-white text-slate-800 gemini-page-enter ${isExiting ? 'gemini-page-exit' : ''}`}>
      
      {/* Quầng sáng trung tâm Ambient Radial Halo thở co giãn */}
      <div className="gemini-ambient-halo" />
      {/* ==================== 1. THANH HEADER ĐIỀU HƯỚNG ĐỎ THƯƠNG HIỆU (Mobile compact h-10, Desktop h-12) ==================== */}
      <header
        className="fixed top-0 left-0 w-full h-10 md:h-12 z-40 bg-[#8b1d1d] text-white flex items-center justify-between md:justify-start shadow-md shadow-[#8b1d1d]/20 border-b border-red-950/40 rounded-none md:rounded-br-2xl md:w-auto md:max-w-max md:border-r px-2.5 md:px-2.5 gap-2 md:gap-0"
      >
        {/* Cụm nút hành động bên trái: Back & Toggle Lá số (Ẩn toggle trên mobile) */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0 z-10">
          {/* Nút quay lại: Biểu tượng mũi tên màu trắng thanh nhã với hiệu ứng viền kim quang */}
          <button
            onClick={handleGoBack}
            aria-label="Quay về lập lá số"
            title="Quay về lập lá số"
            className="group relative flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-white bg-white/15 hover:bg-white/30 active:scale-[0.97] transition-all duration-120 ease-[cubic-bezier(0.2,0,0,1)] border border-white/25 hover:border-amber-200/80 hover:shadow-[0_0_10px_rgba(253,230,138,0.35)] cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-white group-hover:text-amber-100 group-hover:-translate-x-0.5 transition-all duration-200" />
            <span className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
          </button>
          {/* Nút đóng/mở cột xem lá số: ẨN HOÀN TOÀN TRÊN MOBILE, chỉ hiện trên Desktop với hiệu ứng xoay lò xo đàn hồi */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label={isSidebarOpen ? 'Thu gọn cột xem lá số' : 'Mở rộng cột xem lá số'}
            aria-expanded={isSidebarOpen}
            title={isSidebarOpen ? 'Thu gọn cột lá số (Xem rộng bài luận)' : 'Mở rộng cột lá số (Đối chiếu tinh bàn)'}
            className={`group relative hidden md:flex items-center justify-center w-8 h-8 rounded-full text-white transition-all duration-120 ease-[cubic-bezier(0.2,0,0,1)] border cursor-pointer active:scale-[0.97] shrink-0 ${
              isSidebarOpen
                ? 'bg-white/20 hover:bg-white/35 border-white/30 hover:border-amber-200/80 hover:shadow-[0_0_12px_rgba(253,230,138,0.45)]'
                : 'bg-white/10 hover:bg-white/25 border-white/20 hover:border-amber-200/70 hover:shadow-[0_0_10px_rgba(253,230,138,0.35)]'
            }`}
          >
            <div className={`transition-transform duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSidebarOpen ? 'rotate-0' : 'rotate-180'}`}>
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4 text-white group-hover:text-amber-100 transition-colors" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-white group-hover:text-amber-100 transition-colors" />
              )}
            </div>
            <span className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
          </button>
        </div>
        {/* Tiêu đề: Giữ căn giữa trên Mobile, tự động thu gọn mượt mà bằng CSS Grid 1fr -> 0fr trên Desktop khi tắt lá số */}
        <div
          className={`flex-1 md:flex-none grid transition-[grid-template-columns,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isSidebarOpen
              ? 'md:grid-cols-[1fr] md:opacity-100'
              : 'md:grid-cols-[0fr] md:opacity-0 md:pointer-events-none'
          }`}
        >
          <div className="min-w-0 overflow-hidden flex items-center justify-center md:justify-start">
            {/* Đường vạch phân cách nhẹ trên Desktop */}
            <div className="hidden md:block h-4 w-px bg-white/25 shrink-0 ml-2.5 mr-2" />
            {/* Tiêu đề in hoa nổi bật màu trắng: Căn giữa trên Mobile, hiển thị trọn vẹn không truncate trên Desktop */}
            <h1 className="text-xs md:text-sm font-bold tracking-wider uppercase select-none text-white text-center md:text-left whitespace-nowrap px-1 md:px-0 md:pr-1.5">
              LUẬN GIẢI AI - TỬ VI HỒNG ÂN
            </h1>
          </div>
        </div>
        {/* Spacer giữ cân đối trên Mobile để tiêu đề căn giữa chính xác 100% */}
        <div className="w-7 h-7 shrink-0 md:hidden pointer-events-none" aria-hidden="true" />
      </header>
      {/* ==================== 2. KHU VỰC CHÍNH: RESPONSIVE SPLIT VIEW & MOBILE VERTICAL FLOW ==================== */}
      <main className={`relative z-10 flex-1 pt-10 md:pt-0 flex flex-col md:flex-row w-full h-full overflow-hidden px-2 sm:px-4 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSidebarOpen ? 'md:px-6' : 'md:px-8'}`}>
        
        {/* ---------- CỘT TRÁI (DESKTOP): PREVIEW LÁ SỐ CHUẨN MỰC BÊN CẠNH ---------- */}
        <aside
          style={{
            pointerEvents: isSidebarOpen ? 'auto' : 'none',
          }}
          className={`hidden md:flex shrink-0 h-full md:pt-12 py-2.5 md:py-3.5 items-center justify-start z-10 overflow-hidden transition-[width,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width,transform,opacity] ${
            isSidebarOpen
              ? 'w-[min(44vw,400px)] lg:w-[min(44vw,440px)] xl:w-[min(44vw,480px)] 2xl:w-[min(44vw,520px)] opacity-100 translate-x-0'
              : 'w-0 opacity-0 -translate-x-6 pointer-events-none'
          }`}
        >
          {chartImageUrl ? (
            <div className="relative max-h-[calc(100vh-120px)] h-full w-[380px] lg:w-[420px] xl:w-[460px] 2xl:w-[490px] max-w-[42vw] shrink-0 flex items-center justify-start gemini-chart-mount ai-preview-slide-in">
              <img
                src={chartImageUrl}
                alt="Tờ Lá Số Tử Vi Đẩu Số"
                style={{ borderRadius: 0 }}
                className="max-h-[calc(100vh-120px)] w-full h-auto object-contain rounded-none shadow-none border border-slate-300/80 bg-white"
              />
            </div>
          ) : (
            <div
              style={{ borderRadius: 0 }}
              className="w-[380px] lg:w-[420px] max-w-full h-[580px] max-h-[calc(100vh-72px)] shrink-0 rounded-none bg-white/95 backdrop-blur-md shadow-none border border-slate-300/80 flex flex-col items-center justify-center p-6 text-center space-y-4 relative overflow-hidden ai-skeleton-shimmer ai-preview-slide-in"
            >
              {/* Lưới giả lập 12 cung mờ nhẹ */}
              <div className="absolute inset-3 grid grid-cols-4 grid-rows-4 gap-1 opacity-15 pointer-events-none">
                {Array.from({ length: 16 }).map((_, idx) => (
                  <div key={idx} className={`border border-slate-400 rounded-xs ${(idx === 5 || idx === 6 || idx === 9 || idx === 10) ? 'invisible' : 'bg-slate-100'}`} />
                ))}
              </div>
              <div className="relative z-10 w-11 h-11 rounded-full border-3 border-[#8b1d1d] border-t-transparent animate-spin" />
              <div className="relative z-10 space-y-1">
                <div className="text-sm font-bold text-slate-800">Đang chuẩn bị tờ lá số...</div>
                <div className="text-xs text-slate-500">Hệ thống đang xuất bản hình ảnh tinh bàn độ nét cao</div>
              </div>
            </div>
          )}
          {!chartImageUrl && (
            <iframe
              ref={iframeRef}
              src="/astrology-engine/laso-tuvi.html?view=export-image&v=2462"
              title="Hidden Chart Exporter"
              className="hidden"
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
            />
          )}
        </aside>
        {/* ---------- CỘT PHẢI: KHU VỰC LUẬN GIẢI AI CHIẾM TRỌN KHÔNG GIAN CÒN LẠI ---------- */}
        <section
          className={`relative flex-1 h-full min-w-0 flex flex-col items-stretch justify-between ${!isConfirmed ? 'py-0' : 'pt-0 md:pt-3.5 pb-2.5 md:pb-3.5'} overflow-hidden`}
        >
          <div className={`gemini-chat-enter w-full h-full min-h-0 flex flex-col justify-between ${!isConfirmed ? 'pb-0' : 'pb-1'} z-20 overflow-x-hidden`}>
            
            {/* Vùng nội dung cuộn độc lập: Khung lá số mobile ở trên cùng -> Thẻ xác nhận hoặc Bài luận giải AI */}
            <div
              ref={scrollContainerRef}
              className={`flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden px-2 sm:px-3 md:px-4 gemini-no-scrollbar ${!isConfirmed ? 'flex flex-col items-center justify-start md:justify-center py-2 md:py-0' : 'pt-2 md:pt-4 pb-2 space-y-3 md:space-y-4'}`}
            >
              
              {/* KHUNG HIỂN THỊ LÁ SỐ TRÊN MOBILE: Đặt ở trên cùng của trang (ngay phía trên khu vực bài luận giải AI) */}
              <div className="md:hidden w-full flex flex-col items-center justify-center pt-1 pb-2.5 px-1 shrink-0">
                {chartImageUrl ? (
                  <div className="w-full max-w-[340px] sm:max-w-[400px] flex items-center justify-center mx-auto gemini-chart-mount">
                    <img
                      src={chartImageUrl}
                      alt="Tờ Lá Số Tử Vi Đẩu Số"
                      className="w-full h-auto max-h-[48vh] object-contain rounded-none shadow-none border-none bg-transparent mx-auto"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-[320px] h-[240px] rounded-none bg-white/95 backdrop-blur-md shadow-none border-none flex flex-col items-center justify-center p-4 text-center space-y-2 relative overflow-hidden ai-skeleton-shimmer">
                    <div className="relative z-10 w-7 h-7 rounded-full border-2 border-[#8b1d1d] border-t-transparent animate-spin" />
                    <div className="relative z-10 space-y-0.5">
                      <div className="text-xs font-bold text-slate-800">Đang chuẩn bị tờ lá số...</div>
                      <div className="text-[11px] text-slate-500">Hệ thống đang xuất bản hình ảnh tinh bàn độ nét cao</div>
                    </div>
                  </div>
                )}
              </div>
              {!isConfirmed ? (
                /* 1. TRẠNG THÁI BAN ĐẦU: Hiển thị Thẻ xác nhận thông tin đương số cố định trong cột bên phải */
                <div className="w-full max-w-[490px] mx-auto ai-card-slide-in md:my-auto transition-all duration-450 ease-[cubic-bezier(0.16,1,0.3,1)]">
                  <AiConfirmChartCard
                    chartData={effectiveChartData}
                    markdownAi={markdownAi}
                    quota={userQuota}
                    onConfirm={handleConfirmReading}
                    onChangeInfo={handleGoBack}
                    onOpenAuth={() => setAuthOpen(true)}
                    onOpenPayment={() => setShowPaymentModal(true)}
                    isFadingOut={isFadingOutCard}
                    isSubmitting={isThinking}
                  />
                </div>
              ) : (
                <>
                  {/* Layout Container: Bố cục 850px chuẩn mực, tạo khoảng đệm an toàn tuyệt đối với header */}
                  <div className="w-full max-w-[850px] mx-auto gemini-chat-container-enter overflow-x-hidden transition-all duration-450 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <div className="w-full gemini-ai-bubble overflow-x-hidden">
                      
                      {/* Hiệu ứng trạng thái chờ phản hồi Skeleton Loading (Cross-Fade 240ms F14) */}
                      {isThinking && (
                        <div
                          className={`w-full space-y-4 py-2 transition-all duration-240 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            isFadingSkeleton
                              ? 'opacity-0 -translate-y-1 pointer-events-none absolute top-0 left-0 right-0 z-10'
                              : 'opacity-100 translate-y-0 relative'
                          }`}
                        >
                          <div className="flex items-center space-x-2 text-xs font-semibold py-1 mb-2" style={{ color: BRAND_THEME.primaryRed }}>
                            <div className="w-4 h-4 rounded-full border-2 border-[#8b1d1d] border-t-transparent animate-spin" />
                            <span>Hệ thống đang đối chiếu tinh bàn & kiến tạo bài luận giải...</span>
                          </div>
                          
                          {/* Các thanh mô phỏng văn bản dạng Skeleton Shimmer Gradient liên tục từ trái sang phải */}
                          <div className="space-y-3">
                            <div className="gemini-skeleton-shimmer h-7 w-[48%] mb-3" />
                            <div className="space-y-2">
                              <div className="gemini-skeleton-shimmer h-4 w-full" />
                              <div className="gemini-skeleton-shimmer h-4 w-[96%]" />
                              <div className="gemini-skeleton-shimmer h-4 w-[91%]" />
                              <div className="gemini-skeleton-shimmer h-4 w-[78%]" />
                            </div>

                            <div className="gemini-skeleton-shimmer h-6 w-[56%] mt-5 mb-3" />
                            <div className="space-y-2">
                              <div className="gemini-skeleton-shimmer h-4 w-[98%]" />
                              <div className="gemini-skeleton-shimmer h-4 w-[93%]" />
                              <div className="gemini-skeleton-shimmer h-4 w-[85%]" />
                              <div className="gemini-skeleton-shimmer h-4 w-[65%]" />
                            </div>

                            <div className="gemini-skeleton-shimmer h-6 w-[42%] mt-5 mb-3" />
                            <div className="space-y-2">
                              <div className="gemini-skeleton-shimmer h-4 w-[95%]" />
                              <div className="gemini-skeleton-shimmer h-4 w-[88%]" />
                              <div className="gemini-skeleton-shimmer h-4 w-[72%]" />
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Thông báo lỗi nếu máy chủ AI gặp sự cố */}
                      {apiError && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm mb-4 space-y-2">
                          <div className="flex items-center space-x-2 font-bold text-red-700">
                            <AlertCircle className="w-4 h-4" />
                            <span>Không thể tạo bản luận giải từ máy chủ AI</span>
                          </div>
                          <p className="text-xs text-red-700">{apiError}</p>
                          <button
                            type="button"
                            onClick={executeAiReading}
                            className="mt-2 px-4 py-1.5 rounded-lg bg-[#8b1d1d] text-white text-xs font-semibold hover:bg-[#a12323] cursor-pointer transition-all duration-120 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.97] inline-flex items-center space-x-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            <span>Thử lại ngay</span>
                          </button>
                        </div>
                      )}
                      {/* Vị trí neo dòng đầu tiên của bài luận giải AI để tự động cuộn mượt khi hoàn tất */}
                      <div ref={readingStartRef} className="scroll-mt-3 md:scroll-mt-4" />
                      {/* Render các khối bài luận chuẩn CommonMark/GFM với Typography 15px #000000 (F13 Memoization & Fade-in 240ms) */}
                      <div
                        className={`gemini-reading-body overflow-x-hidden break-words transition-opacity duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isThinking && !isFadingSkeleton ? 'opacity-0 pointer-events-none' : 'opacity-100'
                        }`}
                      >
                        {renderedBlocks.map((block, idx) => {
                          const isActivelyStreaming = isStreaming && idx === renderedBlocks.length - 1;
                          let blockHtml;
                          if (!isActivelyStreaming && parsedHtmlCacheRef.current.has(idx)) {
                            const cached = parsedHtmlCacheRef.current.get(idx);
                            if (cached.raw === block) {
                              blockHtml = cached.html;
                            }
                          }
                          if (!blockHtml) {
                            blockHtml = formatMarkdownToHtml(block, { allowAutoToc: idx === 0 });
                            if (!isActivelyStreaming) {
                              parsedHtmlCacheRef.current.set(idx, { raw: block, html: blockHtml });
                            }
                          }
                          return (
                            <ReadingBlock
                              key={idx}
                              html={blockHtml}
                            />
                          );
                        })}
                      </div>
                      {isStreaming && <span className="gemini-cursor" style={{ background: BRAND_THEME.primaryRed }} />}
                      {/* KHỐI ĐIỀU KHIỂN & HÀNH ĐỘNG Ở CUỐI BÀI LUẬN GIẢI */}
                      {!isThinking && !isStreaming && renderedBlocks.length > 0 && (
                        <div className="mt-4 pt-3 flex items-center gap-3 justify-start border-t border-slate-100">
                          {/* Nút tải bản PDF (Bên trái): Khối nền Đỏ Chu Sa nổi bật kèm icon tải xuống và nhãn "PDF" */}
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isExportingPdf}
                            title="Tải bản luận giải định dạng PDF chuẩn thương hiệu Tử Vi Hồng Ân"
                            aria-label="Tải PDF"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border border-[#8b1d1d] bg-[#8b1d1d] hover:bg-[#a12323] text-white shadow-sm transition-all duration-120 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            {isExportingPdf ? (
                              <RotateCw className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <Download className="w-4 h-4 text-white transition-transform duration-150 group-hover:-translate-y-0.5" />
                            )}
                            <span className="tracking-wide">PDF</span>
                          </button>

                          {/* Nút yêu cầu luận giải lại (Nằm bên phải nút tải PDF) */}
                          <button
                            type="button"
                            onClick={() => executeAiReading({ extendedQuota: true })}
                            disabled={isThinking || isStreaming}
                            title="Luận giải lại với giới hạn token và thời gian cao hơn"
                            aria-label="Luận giải lại"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#8b1d1d] hover:bg-slate-100 transition-all duration-120 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group inline-flex items-center justify-center"
                          >
                            <RotateCw className={`w-4.5 h-4.5 transition-transform duration-300 ${isExtendedRetry ? 'animate-spin text-[#8b1d1d]' : 'group-hover:rotate-180'}`} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Các câu hỏi đáp bổ sung: Đồng bộ container 850px */}
                  <div className="w-full max-w-[850px] mx-auto space-y-4 overflow-x-hidden">
                    {messages.map((msg, idx) => {
                      const isLatestUser = msg.sender === 'user' && idx === latestUserMessageIndexRef.current;
                      return (
                        <div
                          key={idx}
                          ref={isLatestUser ? latestUserMessageRef : null}
                          className={`scroll-mt-3 md:scroll-mt-4 flex items-start ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                        <div
                          className={`max-w-[92%] md:max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed overflow-x-hidden break-words ${
                            msg.sender === 'user'
                              ? 'bg-[#8b1d1d] text-white rounded-tr-xs shadow-xs'
                              : 'w-full bg-white/95 backdrop-blur-md text-slate-700 rounded-2xl border border-slate-200/80 shadow-xs'
                          }`}
                        >
                          {msg.sender === 'user' ? (
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          ) : (
                            <div
                              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(msg.text, { allowAutoToc: false }) }}
                              className="gemini-reading-body gemini-qa-body overflow-x-hidden break-words"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* THANH NHẬP CÂU HỎI HỘI THOẠI BỔ SUNG & MENU GỢI Ý: Giới hạn max-width 750px */}
            {showInputBar && (
              <div className="relative w-full max-w-[700px] md:max-w-[720px] lg:max-w-[750px] mx-auto pt-2 pb-1 ai-input-bar-fade-in">
                {/* Thông báo khi chạm trần Token 10.000 */}
                {isQuotaExceeded && (
                  <div className="w-full mb-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50/95 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-amber-800">⚠️ Thông báo:</span>
                      <span>Bạn đã đạt giới hạn sử dụng AI cho phiên luận giải này. ({usedQaTokens} / {MAX_QA_TOKENS} tokens)</span>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                      Đã khóa phiên
                    </span>
                  </div>
                )}
                {/* Menu Gợi ý yêu cầu: Chiều rộng tối ưu ~560px (chống xuống dòng ngắt quãng), hiệu ứng mở/đóng mượt mà 60FPS */}
                <div
                  ref={suggestionsMenuRef}
                  style={{ backgroundColor: '#ffffff' }}
                  className={`absolute z-30 bottom-full mb-2.5 left-0 w-[calc(100vw-32px)] sm:w-[560px] max-w-[580px] max-h-[320px] bg-white rounded-2xl border border-slate-200/90 shadow-xl p-1.5 flex flex-col gemini-popover-panel ${
                    isSuggestionsOpen ? 'gemini-popover-open' : 'gemini-popover-closed'
                  }`}
                  aria-hidden={!isSuggestionsOpen}
                >
                  <div className="flex-1 overflow-y-auto space-y-1 gemini-custom-scrollbar max-h-[280px] p-0.5">
                    {activeSuggestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        tabIndex={isSuggestionsOpen ? 0 : -1}
                        onClick={() => handleSelectSuggestion(q)}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] text-slate-700 hover:text-[#8b1d1d] hover:bg-[#fdf2f2] border border-transparent hover:border-red-100/60 transition-all duration-120 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.97] cursor-pointer leading-relaxed flex items-center justify-between group"
                        title={q}
                      >
                        <span className="line-clamp-2 pr-2">{q}</span>
                        <span className="text-slate-300 group-hover:text-[#8b1d1d] text-xs shrink-0 transition-colors">↵</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Hàng điều khiển: Nút Gợi ý hình tròn độc lập + Thanh nhập liệu Capsule */}
                <div className={`flex ${
                  (inputValue && (inputValue.includes('\n') || (textareaRef.current && textareaRef.current.scrollHeight > 36)))
                    ? 'items-end'
                    : 'items-center'
                } gap-2 md:gap-2.5 w-full`}>
                  {/* Nút Gợi ý yêu cầu hình tròn độc lập với icon gợi ý riêng biệt */}
                  <button
                    ref={suggestionsButtonRef}
                    type="button"
                    disabled={isQuotaExceeded}
                    aria-label={isSuggestionsOpen ? "Đóng danh sách gợi ý" : "Gợi ý câu hỏi"}
                    title={isQuotaExceeded ? "Đã đạt giới hạn phiên" : (isSuggestionsOpen ? "Đóng danh sách gợi ý" : "Gợi ý câu hỏi đào sâu tinh bàn")}
                    onClick={() => !isQuotaExceeded && setIsSuggestionsOpen((prev) => !prev)}
                    className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all cursor-pointer select-none border ${
                      isQuotaExceeded
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : isSuggestionsOpen
                        ? 'bg-[#8b1d1d] text-white border-[#8b1d1d] shadow-md shadow-[#8b1d1d]/25 scale-105'
                        : 'bg-white hover:bg-[#fdf2f2] text-[#8b1d1d] border-slate-300 hover:border-[#8b1d1d]/40 shadow-sm duration-120 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.97]'
                    }`}
                  >
                    <Sparkles className={`w-5 h-5 transition-transform duration-200 ${isSuggestionsOpen ? 'rotate-12 scale-110' : ''}`} />
                  </button>
                  {/* Thanh nhập liệu Capsule (chỉ gồm ô nhập và nút gửi) */}
                  <div
                    style={{ backgroundColor: isQuotaExceeded ? '#f8fafc' : '#ffffff' }}
                    className={`flex-1 relative z-20 bg-white rounded-2xl border transition-all ${
                      isQuotaExceeded 
                        ? 'border-slate-200 bg-slate-50/90' 
                        : 'border-slate-300 focus-within:border-[#8b1d1d] shadow-sm focus-within:shadow-md'
                    } p-1.5 pl-3.5 flex ${
                      (inputValue && (inputValue.includes('\n') || (textareaRef.current && textareaRef.current.scrollHeight > 36)))
                        ? 'items-end'
                        : 'items-center'
                    } justify-between gap-2`}
                  >
                    {/* Ô Textarea tự động co giãn theo nội dung */}
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputValue}
                      disabled={isQuotaExceeded}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isQuotaExceeded
                          ? "Bạn đã đạt giới hạn sử dụng AI cho phiên luận giải này."
                          : "Hỏi thêm về công danh, gia đạo, vận hạn 3 năm..."
                      }
                      className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none resize-none overflow-y-auto leading-relaxed py-1 px-1 disabled:text-slate-400 disabled:cursor-not-allowed max-h-[120px]"
                      style={{ minHeight: '28px', height: '28px' }}
                    />
                    {/* Nút Gửi */}
                    <div className="shrink-0 flex items-center pr-0.5">
                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || isSubmittingMessage || isQuotaExceeded}
                        title="Gửi câu hỏi (Ctrl + Enter)"
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-120 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer shadow-xs active:scale-[0.97] ${
                          inputValue.trim() && !isSubmittingMessage && !isQuotaExceeded
                            ? 'bg-[#8b1d1d] hover:bg-[#a12323] text-white hover:scale-105 hover:shadow-md hover:shadow-[#8b1d1d]/30 border border-amber-200/40'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      {/* Modal Đăng Nhập Google Tài Khoản nếu cần */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
      {/* Modal Nạp Lượt / Thanh Toán SePay */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        packageInfo={{
          title: 'Luận giải AI',
          price: '199.000 VNĐ',
          amount: 199000,
          serviceType: 'lifetime',
          description: 'Nạp lượt luận giải Tử Vi chuyên sâu cùng AI và tham vấn trọn đời.',
          benefits: [
            'Thêm 5 lượt luận giải AI chất lượng cao',
            'Giải đoán toàn diện 12 cung bản mệnh',
            'Hỏi đáp trực tiếp tiếp nối không giới hạn câu hỏi trong phiên'
          ]
        }}
        onSuccess={async () => {
          await loadQuota();
          setShowPaymentModal(false);
        }}
      />
    </div>
  );
}
