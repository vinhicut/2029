// aiReadingClient.js
/**
 * Client API kết nối tầng AI Luận Giải Backend.
 * NGUYÊN TẮC BẢO MẬT ZERO-KEY:
 * Tuyệt đối không lưu trữ hoặc truyền GEMINI_API_KEY ở Frontend.
 * Mọi request đều gọi qua endpoint bảo mật nội bộ /api/ai/interpret-chart của Backend.
 */

import { API_ROUTES } from '../constants/astrologyConfig.js';

// Từ điển chuyển ngữ Hán-Việt & từ ngoại lai thường gặp trong ngữ cảnh Tử Vi Đẩu Số
const FOREIGN_TOKEN_MAP = {
  '逢': 'phùng',
  '主': 'chủ',
  '落': 'rơi',
  '綿': 'kéo',
  '绵': 'kéo',
  'быстро': 'nhanh chóng',
  '命': 'mệnh',
  '身': 'thân',
  '宮': 'cung',
  '宫': 'cung',
  '財': 'tài',
  '财': 'tài',
  '官': 'quan',
  '遷': 'di',
  '迁': 'di',
  '福': 'phúc',
  '德': 'đức',
  '夫': 'phu',
  '妻': 'thê',
  '子': 'tử',
  '女': 'nữ',
  '田': 'điền',
  '宅': 'trạch',
  '疾': 'tật',
  '厄': 'ách',
  '僕': 'bộc',
  '仆': 'bộc',
  '兄': 'huynh',
  '弟': 'đệ',
  '父': 'phụ',
  '母': 'mẫu',
  '星': 'tinh',
  '吉': 'cát',
  '凶': 'hung',
  '化': 'hóa',
  '祿': 'lộc',
  '禄': 'lộc',
  '權': 'quyền',
  '权': 'quyền',
  '科': 'khoa',
  '忌': 'kỵ',
  '廟': 'miếu',
  '庙': 'miếu',
  '旺': 'vượng',
  '得': 'đắc',
  '地': 'địa',
  '陷': 'hãm',
  '運': 'vận',
  '运': 'vận',
  '限': 'hạn',
  '大': 'đại',
  '小': 'tiểu',
  '流': 'lưu',
  '年': 'niên',
  '月': 'nguyệt',
  '日': 'nhật',
  '陰': 'âm',
  '阴': 'âm',
  '陽': 'dương',
  '阳': 'dương',
  '金': 'kim',
  '木': 'mộc',
  '水': 'thủy',
  '火': 'hỏa',
  '土': 'thổ',
  '局': 'cục'
};

const FOREIGN_SCRIPT_REGEX = /[\u0400-\u052F\u0590-\u0E7F\u1100-\u11FF\u2E80-\u2FDF\u3000-\u303F\u3040-\u30FF\u3130-\u318F\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]+/g;

/**
 * Làm sạch văn bản luận giải, đảm bảo 100% chữ Quốc ngữ tiếng Việt chuẩn (NFC),
 * loại bỏ hoàn toàn các token tiếng Trung (CJK), Hàn (Hangul), Nga (Cyrillic)...
 */
export function sanitizeVietnameseReading(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.normalize('NFC');

  // Thay thế các cụm đặc thù
  cleaned = cleaned
    .replace(/逢\s*hung/gi, ' phùng hung')
    .replace(/主\s*tinh/gi, ' chủ tinh')
    .replace(/khi\s*落\s*vào/gi, 'khi rơi vào')
    .replace(/落\s*hãm/gi, ' lạc hãm')
    .replace(/落\s*vào/gi, ' rơi vào')
    .replace(/phúc\s+lộc\s*[綿绵]\s*dài/gi, 'phúc lộc kéo dài')
    .replace(/[綿绵]\s*dài/gi, ' kéo dài')
    .replace(/[綿绵]\s*trường/gi, ' miên trường')
    .replace(/быстро/gi, ' nhanh chóng ');

  for (const [fTok, vWord] of Object.entries(FOREIGN_TOKEN_MAP)) {
    if (cleaned.includes(fTok)) {
      cleaned = cleaned.split(fTok).join(` ${vWord} `);
    }
  }

  cleaned = cleaned.replace(FOREIGN_SCRIPT_REGEX, ' ');

  // TUYỆT ĐỐI KHÔNG IN NGHIÊNG: Loại bỏ mọi ký tự * hoặc _ in nghiêng đơn lẻ, bảo lưu chữ đứng chuẩn mực (giữ nguyên in đậm **)
  cleaned = cleaned.replace(/(?<!\*)\*([^\*\n]+?)\*(?!\*)/g, '$1');
  cleaned = cleaned.replace(/(?<!_)_([^\_\n]+?)_(?!_)/g, '$1');

  return cleaned
    .split('\n')
    .map((line) =>
      line
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\s+([,.;:!?\])])/g, '$1')
        .replace(/([(\[])\s+/g, '$1')
        .trimEnd()
    )
    .join('\n');
}

// Bộ dữ liệu luận giải mẫu chuẩn Tử Vi Hồng Ân (Tuân thủ nghiêm ngặt 6 quy chuẩn AGENTS.md & mock_service.py)
export const STANDARD_READING_BLOCKS = [
  {
    title: '## I. TỔNG QUAN LÁ SỐ (LUẬN VỀ TRUNG CUNG)',
    content: `"Mến chào Quý anh, Tử Vi Hồng Ân xin được giải đoán mệnh vận của Quý anh như sau:"\n\nKhi tiếp cận một lá số Tử Vi Đẩu Số, điểm khởi đầu quan trọng nhất chính là bức tranh toàn cảnh tại khu vực Trung cung. Đây chính là hạt nhân năng lượng gốc rễ quy định cấu trúc bản thể và dòng chảy số mệnh của một đời người:\n\n- **Bản Mệnh & Cục Số:** Quý anh sinh năm Mậu Tý, nạp âm Tích Lịch Hỏa (Lửa sấm sét), cục số là Thủy nhị cục. Ngũ hành Cục (Thủy) khắc Mệnh (Hỏa), đây là thế Cục khắc Mệnh. Thuở thiếu thời hoàn cảnh thường tạo ra không ít thử thách, đòi hỏi Quý anh phải sớm tôi rèn bản lĩnh tự lập. Tuy nhiên, Tích Lịch Hỏa là ngọn lửa uy phong phi thường của trời đất, càng trong phong ba bão táp lại càng sáng ngời nghị lực kiên cường.\n\n- **Mệnh - Thân Phối Chiếu:** Cung Mệnh tọa tại Mão (Âm Mộc tương sinh cho Hỏa mệnh), có sao Thiên Tướng hãm địa đồng cung cùng Đắc Thiên Hình, hội tụ Hồng Loan, Thiên Quý và Thiếu Âm. Quý anh là người trọng chữ tín, khảng khái, giàu lòng trắc ẩn nhưng làm việc gì cũng chuẩn mực, kỷ luật. Thân cư Phu Thê tại Sửu có bộ đôi Vũ Khúc - Tham Lang đồng độ, báo hiệu trung niên lập thân hiển đạt, hậu vận tích lũy điền sản và tài chính vững vàng.\n\n> "Thiên Tướng tính khoan dung từ ái\nGặp Hình tinh uy dũng khôn lường\nHỏa mệnh tôi rèn qua gian khó\nHậu vận vinh hoa rạng tông đường."`
  },
  {
    title: '## II. LUẬN GIẢI TAM HỢP (MỆNH - TÀI - QUAN)',
    content: `"Tiếp theo luận tới Tam Hợp Mệnh-Tài-Quan của Quý anh:"\n\nTrong cấu trúc tinh bàn, trục tam hợp Mệnh, Tài Bạch và Quan Lộc giữ vai trò hạt nhân tựa như một chiếc kiềng ba chân vững chãi. Ba cung vị này gắn kết chặt chẽ giữa nội lực bản thân, nguồn tài chính và sự nghiệp:\n\n"Bây giờ, Tử Vi Hồng Ân xin luận giải ba cung Mệnh, Tài Bạch và Quan Lộc cho Quý anh:"\n\n- **1. Cung Mệnh (Tại Mão):** Bản tính trung kiên, chu đáo và sâu sắc. Mệnh có Thiên Tài và Thiếu Âm giúp Quý anh có trực giác nhạy bén, khả năng phân tích sự việc đa chiều. Lời khuyên chân thành là cần học cách dung hòa sự thẳng thắn, dĩ hòa vi quý trong các mối quan hệ xã hội để đường đời muôn phần thuận lợi ("tác sự tất hữu thành").\n\n- **2. Cung Tài Bạch (Tại Hợi):** Cung Vô Chính Diệu nhưng đắc vòng Tràng Sinh, nhận trọn ánh sáng hội chiếu của Nhật Nguyệt (Thái Âm từ Tý) và Cơ Lương (từ Thìn). Dòng tiền của Quý anh gắn liền với trí tuệ, kỹ năng chuyên sâu và khả năng lập kế hoạch tài chính bài bản; càng về trung niên tiền bạc càng tích tụ dồi dào, bền vững.\n\n- **3. Cung Quan Lộc (Tại Mùi):** Cung Quan ngộ Triệt Không thuở ban đầu có giai đoạn định hướng trăn trở, nhưng nhờ Tả Phù, Văn Khúc và Tấu Thư phò tá nên khi qua ngưỡng 30 tuổi sự nghiệp sẽ cất cánh mạnh mẽ, nắm giữ các vai trò quản trị, chiến lược hoặc chuyên môn then chốt.`
  },
  {
    title: '## III. LUẬN GIẢI ĐẠI VẬN & TIỂU VẬN 3 NĂM',
    content: `"TỬ VI HỒNG ÂN xin luận giải Đại vận và tiểu vận của Quý anh:"\n\n- **Về Đại Vận Hiện Tại (12 - 21 tuổi, Tại Thìn):** Đóng tại cung Phụ Mẫu có Thiên Cơ, Thiên Lương miếu địa và Hóa Khoa phò trợ. Đây là đại vận thuận lợi cho con đường học vấn, tích lũy kiến thức nền tảng và phát triển năng lực tư duy.\n\n- **Tiểu Vận Năm 2026 (Bính Ngọ - 19 tuổi):** Lưu Thái Tuế và Tiểu Hạn trùng phùng tại Cung Điền Trạch (Ngọ) ngộ Tuần Không. Năm nay chủ về sự dịch chuyển môi trường sống, học tập hoặc công việc mới. Cần chú ý cẩn trọng trong các cam kết giấy tờ và giữ gìn sức khỏe đường hô hấp.\n\n- **Tiểu Vận Năm 2027 (Đinh Mùi - 20 tuổi):** Vận nhập Cung Quan Lộc gặp Văn Khúc và Tấu Thư. Con đường thi cử, chứng chỉ chuyên môn và cơ hội khẳng định năng lực bản thân vô cùng sáng sủa.\n\n- **Tiểu Vận Năm 2028 (Mậu Thân - 21 tuổi):** Vận hội quý nhân trợ lực, mở rộng giao lưu bạn bè và cộng sự đáng tin cậy, đặt viên gạch vững chắc cho bước đường lập nghiệp.`
  },
  {
    title: '## IV. LUẬN GIẢI CÁC CUNG VÀ ĐẠI VẬN CÒN LẠI',
    content: `- **Cung Phu Thê (Thân cư):** Vũ Khúc, Tham Lang miếu địa tại Sửu ngộ Hóa Lộc và Thiên Khôi. Bạn đời là người thông minh, tháo vát, có tài thao lược tài chính, vừa là hậu phương vững chắc vừa là bạn đồng hành chí hướng.\n\n- **Cung Phúc Đức (Tại Tỵ):** Tử Vi, Thất Sát miếu địa đắc Lộc Tồn. Phúc ấm gia tộc sâu dày, tiền nhân để lại nhiều phúc đức, bản thân luôn được che chở mỗi khi đứng trước những khúc ngoặt quan trọng của cuộc đời.\n\n- **Lời Dặn Cốt Lõi:** "Tử Vi Hồng Ân khuyên Quý anh nên tu dưỡng thân tâm, làm điều thiện, tránh điều dữ, đặc biệt tránh làm các việc phi pháp, tín tâm cầu khẩn Thần Phật gia trì để tích âm đức cho mình và kích hoạt các cát tinh giúp Quý anh vượt qua mọi nghịch cảnh."`
  },
  {
    title: '## V. TỔNG KẾT',
    content: `"Tới đây, Tử Vi Hồng Ân xin có đôi lời tổng quan về mệnh vận của anh:"\n\nCổ nhân có dạy "Đức năng thắng số", tinh bàn tử vi cho ta thấy tấm bản đồ tiềm năng và chu kỳ thời vận, nhưng chính tâm tính thiện lương và nỗ lực tu dưỡng từng ngày của Quý anh mới là chiếc chìa khóa định hình nên vận mệnh tốt lành nhất ("Qua cơn bĩ cực tới hồi thái lai").\n\n"TỬ VI HỒNG ÂN hoan hỷ hữu duyên luận giải vận mệnh cho Quý anh, Quý anh hãy tải về máy để tham khảo. Nếu cần hỏi đáp chi tiết hơn về vận mệnh của mình, TỬ VI HỒNG ÂN mời Quý anh đặt lịch luận giải trực tiếp với các quý thầy đã nghiên cứu, luận giải và chiêm nghiệm Tử Vi nhiều năm của TỬ VI HỒNG ÂN qua các số Zalo của trang này."`
  }
];

export const MOCK_INTERPRETATION_RESULT = {
  success: true,
  reading_markdown: STANDARD_READING_BLOCKS.map((b) => `${b.title}\n\n${b.content}`).join('\n\n---\n\n'),
  word_count: 2450,
  duration_seconds: 1.2,
  metadata: {
    name: 'Hữu Duyên',
    gender: 'Nam',
    age: 19,
    pronoun: 'Quý anh',
    nap_am: 'Tích Lịch Hỏa',
    cuc: 'Thủy nhị cục',
    menh_cung: 'Mão',
    than_cu: 'Thân cư Phu Thê',
    limit_year: 2026
  },
  benchmark: {
    total_words: 2450,
    word_count: 2450,
    is_standard_range: true,
    duration_seconds: 1.2,
    promptTokenCount: 1250,
    candidatesTokenCount: 3300,
    thoughtsTokenCount: 9500,
    totalTokenCount: 14050,
    cachedContentTokenCount: 0
  }
};

export function getAuthToken() {
  try {
    return localStorage.getItem('tuvi_token') || null;
  } catch (_e) {
    return null;
  }
}

export async function fetchUserAiQuota() {
  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    const res = await fetch('/api/ai/user-quota', { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Lỗi khi kiểm tra lượt sử dụng:', err);
    const savedUser = localStorage.getItem('tuvi_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        const isAdmin = u.role === 'admin' || u.role === 'manager';
        return {
          status: 'success',
          logged_in: true,
          credits: isAdmin ? 999999 : (u.ai_credits ?? 3),
          is_admin: isAdmin,
          unlimited: isAdmin
        };
      } catch {}
    }
    return { status: 'success', logged_in: false, credits: 0, is_admin: false, unlimited: false };
  }
}

/**
 * Luận giải lá số trực tiếp thời gian thực qua Server-Sent Events (SSE).
 * Đẩy ký tự tới đâu hiển thị tới đó, chống gián đoạn 60-120FPS.
 */
export async function streamAiInterpretation(
  paramsOrMarkdown,
  onChunkCallback,
  onDoneCallback,
  onErrorCallback
) {
  let params = {};
  if (typeof paramsOrMarkdown === 'string') {
    params = {
      markdownAi: paramsOrMarkdown,
      onChunk: onChunkCallback,
      onDone: onDoneCallback,
      onError: onErrorCallback
    };
  } else if (paramsOrMarkdown && typeof paramsOrMarkdown === 'object') {
    params = { ...paramsOrMarkdown };
    if (typeof onChunkCallback === 'function') params.onChunk = onChunkCallback;
    if (typeof onDoneCallback === 'function') params.onDone = onDoneCallback;
    if (typeof onErrorCallback === 'function') params.onError = onErrorCallback;
  }

  const {
    markdownAi,
    age,
    gender,
    chartHash,
    extendedQuota = false,
    onChunk,
    onProgress,
    onDone,
    onError,
    signal
  } = params;

  if (!markdownAi) {
    throw new Error('Chưa nhận được dữ liệu tinh bàn Markdown AI từ lá số.');
  }

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Quản lý timeout: Mặc định 600s (10 phút), Mở rộng 900s (15 phút) phòng quá tải máy chủ
  const timeoutMs = extendedQuota ? 900000 : 600000;
  const internalController = new AbortController();
  const timeoutId = setTimeout(() => internalController.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => internalController.abort());
  }

  try {
    const response = await fetch(API_ROUTES.STREAM_INTERPRET_CHART || '/api/ai/stream-interpret-chart', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        markdown_ai: markdownAi,
        age,
        gender,
        chart_hash: chartHash,
        chart_code: params.chartCode || params.chartData?.id_code || params.chartData?.idCode || params.chartData?.chart_code || "",
        extended_quota: Boolean(extendedQuota)
      }),
      signal: internalController.signal
    });

    if (!response.ok) {
      let errMsg = 'Không thể kết nối đến máy chủ AI.';
      try {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
      } catch (_e) {}
      throw new Error(errMsg);
    }

    if (!response.body) {
      throw new Error('Trình duyệt không hỗ trợ luồng dữ liệu (ReadableStream).');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedMarkdown = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const payload = JSON.parse(jsonStr);

            if (payload.type === 'start') {
              if (onProgress) onProgress({ status: 'connected', payload });
            } else if (payload.type === 'chunk' && payload.text) {
              const cleanText = sanitizeVietnameseReading(payload.text);
              accumulatedMarkdown += cleanText;
              if (onChunk) onChunk(cleanText, accumulatedMarkdown);
            } else if (payload.type === 'done') {
              if (onDone) onDone(accumulatedMarkdown, payload);
            } else if (payload.type === 'error') {
              if (onError) onError(new Error(payload.error || 'Lỗi luồng AI.'));
            }
          } catch (_jsonErr) {}
        }
      }
    } finally {
      reader.releaseLock();
    }

    return sanitizeVietnameseReading(accumulatedMarkdown);
  } catch (err) {
    if (err.name === 'AbortError') {
      const waitMinutes = extendedQuota ? '15 phút' : '10 phút';
      throw new Error(`Yêu cầu luận giải AI đã quá thời gian chờ (${waitMinutes}) do máy chủ quá tải. Vui lòng bấm nút vòng xoay để thử lại với hạn mức mở rộng.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchAiInterpretation({ markdownAi, age, gender, extendedQuota = false }) {
  if (!markdownAi) {
    throw new Error('Chưa nhận được dữ liệu tinh bàn Markdown AI từ lá số.');
  }

  const timeoutMs = extendedQuota ? 900000 : 600000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(API_ROUTES.INTERPRET_CHART, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        markdown_ai: markdownAi,
        age: age,
        gender: gender,
        chart_code: arguments[0]?.chartCode || arguments[0]?.chartData?.id_code || arguments[0]?.chartData?.idCode || arguments[0]?.chartData?.chart_code || "",
        extended_quota: Boolean(extendedQuota)
      }),
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Không thể tạo bản luận giải từ máy chủ AI.');
    }

    if (data.reading_markdown) {
      data.reading_markdown = sanitizeVietnameseReading(data.reading_markdown);
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const waitMinutes = extendedQuota ? '15 phút' : '10 phút';
      throw new Error(`Yêu cầu luận giải AI đã quá thời gian chờ (${waitMinutes}) do máy chủ quá tải. Vui lòng bấm nút vòng xoay để thử lại với hạn mức mở rộng.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchAiStatus() {
  const response = await fetch(API_ROUTES.AI_STATUS);
  if (!response.ok) {
    throw new Error('Không thể kiểm tra trạng thái máy chủ AI.');
  }
  return response.json();
}

// ==================== QUẢN LÝ LỊCH SỬ PHIÊN LUẬN GIẢI AI (LOCAL STORAGE) ====================
const STORAGE_KEY_SESSIONS = 'tuvi_chat_sessions';
const STORAGE_KEY_ACTIVE_SESSION_ID = 'tuvi_active_session_id';

/**
 * Ảnh lá số dạng data URL (base64 PNG) rất lớn (vài MB) → vượt hạn mức localStorage (~5MB)
 * khiến việc lưu lịch sử luận giải thất bại. Chỉ giữ lại URL thường, bỏ data URL.
 */
function stripHeavyFields(session) {
  const img = session && session.chartImageUrl;
  if (typeof img === 'string' && img.startsWith('data:')) {
    return { ...session, chartImageUrl: '' };
  }
  return session;
}

/**
 * Ghi danh sách phiên vào localStorage; nếu vượt hạn mức thì bỏ dần các phiên cũ nhất.
 */
function persistSessionsSafely(sessions) {
  let list = sessions.map(stripHeavyFields);
  for (;;) {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(list));
      return true;
    } catch (err) {
      if (list.length <= 1) {
        console.error('Không thể lưu lịch sử luận giải (vượt hạn mức bộ nhớ):', err);
        return false;
      }
      list = list.slice(0, -1); // danh sách mới nhất ở đầu → bỏ phiên cũ nhất
    }
  }
}

/**
 * Dọn dẹp toàn bộ dữ liệu phiên luận giải mẫu cũ (developer mockup) còn sót lại trong localStorage
 */
export function purgeOldMockSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) return;
    const sessions = JSON.parse(raw);
    const cleaned = sessions.filter((s) => {
      const text = (s.renderedBlocks || []).join(' ');
      const isOldMock = s.is_mock || text.includes('Tích Lịch Hỏa (Lửa sấm sét)') || text.includes('Thiên Tướng tính khoan dung từ ái') || text.includes('TỬ VI HỒNG ÂN hoan hỷ hữu duyên');
      return !isOldMock;
    });
    if (cleaned.length !== sessions.length) persistSessionsSafely(cleaned);

    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION_ID);
    if (activeId && !cleaned.some((s) => s.sessionId === activeId)) {
      sessionStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION_ID);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION_ID);
    }
  } catch (_e) {}
}

// Tự động kích hoạt dọn dẹp dữ liệu mockup khi nạp module
purgeOldMockSessions();

/**
 * Lấy toàn bộ danh sách phiên luận giải (đã loại bỏ mockup)
 */
export function getAllAiSessions() {
  try {
    purgeOldMockSessions();
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) return [];
    const sessions = JSON.parse(raw);
    return sessions.map((s) => ({
      ...s,
      renderedBlocks: Array.isArray(s.renderedBlocks)
        ? s.renderedBlocks.map((b) => sanitizeVietnameseReading(b))
        : [],
      messages: Array.isArray(s.messages)
        ? s.messages.map((m) => ({ ...m, text: sanitizeVietnameseReading(m.text || '') }))
        : []
    }));
  } catch (err) {
    console.error('Lỗi khi đọc sessions từ localStorage:', err);
    return [];
  }
}

/**
 * Lấy danh sách phiên luận giải lọc theo lá số (dựa trên tên, ngày sinh, giới tính)
 */
export function getAiSessionsForChart(chartData) {
  const sessions = getAllAiSessions();
  if (!chartData) return sessions;

  const chartKey = getChartKey(chartData);
  return sessions.filter((s) => s.chartKey === chartKey);
}

/**
 * Chuẩn hóa toàn diện thông tin lá số Tử Vi từ mọi nguồn payload:
 * 1. Dạng engine/backend chuẩn: { thien_ban: { ho_ten, gioi_tinh, duong_lich: { ngay, thang, nam, gio, phut }, am_lich, nam_xem_han } }
 * 2. Dạng input_data: { name, gender, day, month, year, hour, minute, limitYear, isSolar }
 * 3. Dạng phẳng tiếng Việt/Anh: { ho_ten, gioi_tinh, ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh, nam_xem_han }
 * 4. Bóc tách dự phòng sâu bằng regex từ văn bản Markdown AI
 * Xử lý triệt để null, undefined, đảm bảo dữ liệu toàn vẹn khi F5.
 */
export function normalizeChartData(chartData, markdownAi = '') {
  const parseMdRegex = (pattern) => {
    if (!markdownAi || typeof markdownAi !== 'string') return null;
    const match = markdownAi.match(pattern);
    return match ? (match[1] || match[0]).trim() : null;
  };

  const tb = chartData?.thien_ban;
  const inp = chartData?.input_data;
  const dl = tb?.duong_lich || chartData?.duong_lich;
  const al = tb?.am_lich || chartData?.am_lich;
  const nxh = tb?.nam_xem_han;

  // 1. Họ tên đương số
  let hoTen = tb?.ho_ten || inp?.name || chartData?.ho_ten || chartData?.name;
  if (!hoTen) {
    hoTen = parseMdRegex(/(?:Đương số|Họ và tên đương số|Họ và tên)[:\s*|]+([^|\n\r]+)/i) || 'Đương số';
  }
  hoTen = String(hoTen).replace(/[|*]/g, '').trim();

  // 2. Giới tính
  let rawGender = tb?.gioi_tinh || inp?.gender || chartData?.gioi_tinh || chartData?.gender;
  if (!rawGender) {
    rawGender = parseMdRegex(/(?:Giới tính)[:\s*|]+([^|\n\r()]+)/i) || 'Nam';
  }
  const isFemale = /(?:nữ|nu|female)/i.test(String(rawGender));
  const gioiTinh = isFemale ? 'Nữ' : 'Nam';

  // 3. Regex bóc tách Dương lịch từ Markdown nếu cần (ví dụ: "- Dương lịch: 01/01/2000 lúc 20:49")
  const mdSolarMatch = markdownAi && typeof markdownAi === 'string'
    ? markdownAi.match(/(?:Dương lịch|Ngày sinh)[:\s*]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+lúc\s+(\d{1,2})[:h](\d{1,2}))?/i)
    : null;

  // Ngày sinh
  let ngaySinh = dl?.ngay ?? dl?.day ?? inp?.day ?? chartData?.ngay_sinh ?? chartData?.day;
  if ((ngaySinh === undefined || ngaySinh === null || ngaySinh === '') && mdSolarMatch) {
    ngaySinh = parseInt(mdSolarMatch[1], 10);
  }
  ngaySinh = Number(ngaySinh) || 1;

  // Tháng sinh
  let thangSinh = dl?.thang ?? dl?.month ?? inp?.month ?? chartData?.thang_sinh ?? chartData?.month;
  if ((thangSinh === undefined || thangSinh === null || thangSinh === '') && mdSolarMatch) {
    thangSinh = parseInt(mdSolarMatch[2], 10);
  }
  thangSinh = Number(thangSinh) || 1;

  // Năm sinh
  let namSinh = dl?.nam ?? dl?.year ?? inp?.year ?? chartData?.nam_sinh ?? chartData?.year;
  if ((namSinh === undefined || namSinh === null || namSinh === '') && mdSolarMatch) {
    namSinh = parseInt(mdSolarMatch[3], 10);
  }
  namSinh = Number(namSinh) || 2000;

  // 4. Giờ & Phút sinh
  let gioSinh = dl?.gio ?? dl?.hour ?? inp?.hour ?? chartData?.gio_sinh ?? chartData?.gio_sinh_gio ?? chartData?.hour;
  if ((gioSinh === undefined || gioSinh === null || gioSinh === '') && mdSolarMatch && mdSolarMatch[4] !== undefined) {
    gioSinh = parseInt(mdSolarMatch[4], 10);
  }
  if (gioSinh === undefined || gioSinh === null || gioSinh === '') {
    const mdHourOnly = parseMdRegex(/\|\s*7\s*\|\s*\*\*Giờ sinh\*\*\s*\|\s*(\d{1,2})/i);
    if (mdHourOnly) gioSinh = parseInt(mdHourOnly, 10);
  }
  gioSinh = Number(gioSinh ?? 0);

  let phutSinh = dl?.phut ?? dl?.minute ?? inp?.minute ?? chartData?.phut_sinh ?? chartData?.minute;
  if ((phutSinh === undefined || phutSinh === null || phutSinh === '') && mdSolarMatch && mdSolarMatch[5] !== undefined) {
    phutSinh = parseInt(mdSolarMatch[5], 10);
  }
  if (phutSinh === undefined || phutSinh === null || phutSinh === '') {
    const mdMinuteOnly = parseMdRegex(/\|\s*8\s*\|\s*\*\*Phút sinh\*\*\s*\|\s*(\d{1,2})/i);
    if (mdMinuteOnly) phutSinh = parseInt(mdMinuteOnly, 10);
  }
  phutSinh = Number(phutSinh ?? 0);

  // 5. Chi giờ
  const getChiGio = (hour) => {
    const h = parseInt(hour, 10);
    if (isNaN(h)) return '';
    if (h === 23 || h === 0) return 'Tý';
    if (h === 1 || h === 2) return 'Sửu';
    if (h === 3 || h === 4) return 'Dần';
    if (h === 5 || h === 6) return 'Mão';
    if (h === 7 || h === 8) return 'Thìn';
    if (h === 9 || h === 10) return 'Tỵ';
    if (h === 11 || h === 12) return 'Ngọ';
    if (h === 13 || h === 14) return 'Mùi';
    if (h === 15 || h === 16) return 'Thân';
    if (h === 17 || h === 18) return 'Dậu';
    if (h === 19 || h === 20) return 'Tuất';
    if (h === 21 || h === 22) return 'Hợi';
    return '';
  };
  const chiGio = chartData?.chi_gio || al?.can_chi_gio || getChiGio(gioSinh) || '';

  // 6. Loại lịch & Tháng nhuận
  const isSolar = chartData?.is_solar !== undefined
    ? Boolean(chartData.is_solar)
    : (inp?.isSolar !== undefined
      ? Boolean(inp.isSolar)
      : (inp?.is_solar !== undefined
        ? Boolean(inp.is_solar)
        : (chartData?.loai_lich ? chartData.loai_lich !== 'lunar' && chartData.loai_lich !== 'am_lich' : true)));
  const isLeap = Boolean(chartData?.thang_nhuan || chartData?.is_leap_input || inp?.isLeapMonthInput || inp?.is_leap_month_input || al?.thang_nhuan);

  // 7. Năm xem hạn & Tuổi mụ (Tuổi âm)
  let rawNamXem = nxh?.nam ?? inp?.limitYear ?? chartData?.nam_xem_han ?? chartData?.limit_year;
  let canChiNamXem = nxh?.can_chi || '';
  let tuoiMu = nxh?.tuoi_mu;

  if (!rawNamXem) {
    const mdNamXemStr = parseMdRegex(/(?:Năm xem(?: hạn gốc)?|Năm xem hạn)[:\s*|]+([^|\n\r]+)/i);
    if (mdNamXemStr) {
      const yrMatch = mdNamXemStr.match(/\b(20\d{2}|19\d{2})\b/);
      if (yrMatch) rawNamXem = parseInt(yrMatch[1], 10);
      const ccMatch = mdNamXemStr.match(/\(([^)]+)\)/);
      if (ccMatch) canChiNamXem = ccMatch[1].replace(/-\s*\d+.*$/i, '').trim();
      const tmMatch = mdNamXemStr.match(/(\d+)\s*tuổi/i);
      if (tmMatch) tuoiMu = parseInt(tmMatch[1], 10);
    }
  }

  const namXemInt = Number(rawNamXem) || new Date().getFullYear();
  if (!tuoiMu && namSinh) {
    tuoiMu = namXemInt - namSinh + 1;
  }
  tuoiMu = Number(tuoiMu) || 28;

  return {
    ho_ten: hoTen,
    name: hoTen,
    gioi_tinh: gioiTinh,
    gender: gioiTinh,
    is_solar: isSolar,
    isSolar: isSolar,
    is_leap: isLeap,
    isLeap: isLeap,
    ngay_sinh: ngaySinh,
    day: ngaySinh,
    thang_sinh: thangSinh,
    month: thangSinh,
    nam_sinh: namSinh,
    year: namSinh,
    gio_sinh: gioSinh,
    gio_sinh_gio: gioSinh,
    hour: gioSinh,
    phut_sinh: phutSinh,
    minute: phutSinh,
    chi_gio: chiGio,
    nam_xem_han: namXemInt,
    nam_xem: namXemInt,
    can_chi_nam_xem: canChiNamXem,
    tuoi_mu: tuoiMu,
    duong_lich: {
      ngay: ngaySinh,
      thang: thangSinh,
      nam: namSinh,
      gio: gioSinh,
      phut: phutSinh,
      day: ngaySinh,
      month: thangSinh,
      year: namSinh,
      hour: gioSinh,
      minute: phutSinh
    },
    thien_ban: {
      ho_ten: hoTen,
      gioi_tinh: gioiTinh,
      duong_lich: {
        ngay: ngaySinh,
        thang: thangSinh,
        nam: namSinh,
        gio: gioSinh,
        phut: phutSinh
      },
      nam_xem_han: {
        nam: namXemInt,
        can_chi: canChiNamXem,
        tuoi_mu: tuoiMu
      },
      am_duong_menh: tb?.am_duong_menh || (gioiTinh === 'Nam' ? 'Dương Nam' : 'Âm Nữ')
    },
    raw: chartData
  };
}

/**
 * Tạo một chartKey chuẩn để nhóm các phiên luận giải theo từng lá số
 */
export function getChartKey(chartData) {
  if (!chartData) return 'default_chart';
  const norm = normalizeChartData(chartData);
  const name = norm.ho_ten.trim().toLowerCase();
  const gender = norm.gioi_tinh;
  const y = norm.nam_sinh;
  const m = norm.thang_sinh;
  const d = norm.ngay_sinh;
  const h = norm.gio_sinh;
  return `${name}_${gender}_${y}_${m}_${d}_${h}`;
}

/**
 * Lấy chi tiết một phiên luận giải theo session_id
 */
export function getAiSessionById(sessionId) {
  if (!sessionId) return null;
  const sessions = getAllAiSessions();
  return sessions.find((s) => s.sessionId === sessionId) || null;
}

/**
 * Lấy session_id đang kích hoạt
 */
export function getActiveSessionId() {
  try {
    return sessionStorage.getItem(STORAGE_KEY_ACTIVE_SESSION_ID) || localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION_ID) || null;
  } catch (_e) {
    return null;
  }
}

/**
 * Thiết lập session_id đang kích hoạt
 */
export function setActiveSessionId(sessionId) {
  try {
    if (sessionId) {
      sessionStorage.setItem(STORAGE_KEY_ACTIVE_SESSION_ID, sessionId);
      localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION_ID, sessionId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION_ID);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION_ID);
    }
  } catch (_e) {}
}

/**
 * Lưu hoặc cập nhật một phiên luận giải AI
 */
export function saveAiSession(sessionData) {
  if (!sessionData || !sessionData.sessionId) return null;
  try {
    const sessions = getAllAiSessions();
    const existingIdx = sessions.findIndex((s) => s.sessionId === sessionData.sessionId);
    const now = new Date().toISOString();

    const fullSession = {
      sessionId: sessionData.sessionId,
      chartKey: sessionData.chartKey || 'default_chart',
      title: sessionData.title || 'Luận giải tổng quan lá số',
      createdAt: sessionData.createdAt || now,
      updatedAt: now,
      status: sessionData.status || 'in_progress', // 'in_progress' | 'completed'
      chartData: sessionData.chartData || null,
      markdownAi: sessionData.markdownAi || '',
      chartImageUrl: sessionData.chartImageUrl || '',
      renderedBlocks: Array.isArray(sessionData.renderedBlocks)
        ? sessionData.renderedBlocks.map((b) => sanitizeVietnameseReading(b))
        : [],
      messages: Array.isArray(sessionData.messages)
        ? sessionData.messages.map((m) => ({ ...m, text: sanitizeVietnameseReading(m.text || '') }))
        : [],
      usedQaTokens: sessionData.usedQaTokens || 0,
      suggestedQuestions: sessionData.suggestedQuestions || []
    };

    if (existingIdx >= 0) {
      sessions[existingIdx] = { ...sessions[existingIdx], ...fullSession, updatedAt: now };
    } else {
      sessions.unshift(fullSession);
    }

    persistSessionsSafely(sessions);
    setActiveSessionId(fullSession.sessionId);
    return fullSession;
  } catch (err) {
    console.error('Lỗi khi lưu phiên luận giải:', err);
    return null;
  }
}

/**
 * Xóa một phiên luận giải theo session_id
 */
export function deleteAiSession(sessionId) {
  try {
    let sessions = getAllAiSessions();
    sessions = sessions.filter((s) => s.sessionId !== sessionId);
    persistSessionsSafely(sessions);

    const activeId = getActiveSessionId();
    if (activeId === sessionId) {
      setActiveSessionId(null);
    }
    return sessions;
  } catch (err) {
    console.error('Lỗi khi xóa phiên luận giải:', err);
    return [];
  }
}

/**
 * Gửi câu hỏi đối đáp tiếp nối cho AI sau khi đã có bài luận giải
 * Hạn mức tối đa 10000 tokens
 */
export async function sendAiFollowupQuestion({ question, markdownAi, readingText, history, age, gender, accumulatedTokens = 0 }) {
  try {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question,
        markdown_ai: markdownAi || '',
        reading_text: readingText || '',
        history: history || [],
        age,
        gender,
        accumulated_tokens: accumulatedTokens || 0
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP ${res.status}: Không thể hoàn tất trả lời câu hỏi.`);
    }

    if (data.answer) {
      data.answer = sanitizeVietnameseReading(data.answer);
    }

    return data;
  } catch (err) {
    console.error('Lỗi khi gửi câu hỏi tiếp nối tới AI:', err);
    throw err;
  }
}

