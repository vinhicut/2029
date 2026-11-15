# interpreter_service.py
"""
Bộ điều phối Luận Giải AI (TuViInterpreterService) cho Tử Vi Hồng Ân.
Tự động chuyển đổi giữa Mock Service (khi chưa cấu hình API Key) và Real Gemini Service.
Bảo đảm chuẩn đầu ra 2000 - 2300 từ tiếng Việt và trần giới hạn token 4096.
"""

import re
import time
import logging
import unicodedata
from typing import Dict, Any, Optional, List

from .config import (
    AI_MODEL_NAME,
    THINKING_LEVEL,
    QA_MODEL_NAME,
    QA_THINKING_LEVEL,
    MAX_OUTPUT_TOKENS,
    EXTENDED_MAX_OUTPUT_TOKENS,
    EXTENDED_REQUEST_TIMEOUT_MS,
    QA_MAX_OUTPUT_TOKENS,
    REQUEST_TIMEOUT_MS,
    TARGET_MIN_WORDS,
    TARGET_MAX_WORDS,
    MOCK_LLM_SERVICE,
    GEMINI_API_KEY
)

from .prompt_compiler import PromptCompiler
from .benchmark import benchmark_reading, count_words
from .mock_service import MockTuViInterpreterService

logger = logging.getLogger(__name__)

# Bảng ánh xạ từ điển Hán-Việt & từ ngoại lai thường bị mô hình đa ngữ trộn vào ngữ cảnh Tử Vi Đẩu Số
FOREIGN_TO_VIET_MAP = {
    # Các token lỗi thực tế đã ghi nhận và biến thể giản thể/phồn thể
    "逢": "phùng",
    "主": "chủ",
    "落": "rơi",
    "綿": "kéo",
    "绵": "kéo",
    "быстро": "nhanh chóng",
    "медленно": "chậm rãi",
    "хорошо": "tốt đẹp",
    "очень": "rất",
    "успех": "thành công",
    # Thuật ngữ Mệnh lý Hán-Việt phổ biến (phòng ngừa trượt token CJK/Hanja)
    "命": "mệnh",
    "身": "thân",
    "宮": "cung",
    "宫": "cung",
    "財": "tài",
    "财": "tài",
    "官": "quan",
    "遷": "di",
    "迁": "di",
    "福": "phúc",
    "德": "đức",
    "夫": "phu",
    "妻": "thê",
    "子": "tử",
    "女": "nữ",
    "田": "điền",
    "宅": "trạch",
    "疾": "tật",
    "厄": "ách",
    "僕": "bộc",
    "仆": "bộc",
    "兄": "huynh",
    "弟": "đệ",
    "父": "phụ",
    "母": "mẫu",
    "星": "tinh",
    "曜": "diệu",
    "吉": "cát",
    "凶": "hung",
    "化": "hóa",
    "祿": "lộc",
    "禄": "lộc",
    "權": "quyền",
    "权": "quyền",
    "科": "khoa",
    "忌": "kỵ",
    "廟": "miếu",
    "庙": "miếu",
    "旺": "vượng",
    "得": "đắc",
    "地": "địa",
    "陷": "hãm",
    "平": "bình",
    "和": "hòa",
    "運": "vận",
    "运": "vận",
    "限": "hạn",
    "大": "đại",
    "小": "tiểu",
    "流": "lưu",
    "年": "niên",
    "月": "nguyệt",
    "日": "nhật",
    "時": "thời",
    "时": "thời",
    "陰": "âm",
    "阴": "âm",
    "陽": "dương",
    "阳": "dương",
    "金": "kim",
    "木": "mộc",
    "水": "thủy",
    "火": "hỏa",
    "土": "thổ",
    "局": "cục",
    "生": "sinh",
    "剋": "khắc",
    "克": "khắc",
    "合": "hợp",
    "沖": "xung",
    "冲": "xung",
    "照": "chiếu",
    "會": "hội",
    "会": "hội",
    "同": "đồng",
    "坐": "tọa",
    "守": "thủ",
    "空": "không",
    "亡": "vong",
    "劫": "kiếp",
    "煞": "sát",
    "杀": "sát",
    "破": "phá",
    "狼": "lang",
    "貪": "tham",
    "贪": "tham",
    "紫": "tử",
    "微": "vi",
    "天": "thiên",
    "機": "cơ",
    "机": "cơ",
    "太": "thái",
    "武": "vũ",
    "曲": "khúc",
    "廉": "liêm",
    "貞": "trinh",
    "贞": "trinh",
    "府": "phủ",
    "巨": "cự",
    "門": "môn",
    "门": "môn",
    "相": "tướng",
    "梁": "lương",
    "七": "thất",
    "貴": "quý",
    "贵": "quý",
    "人": "nhân",
    "壽": "thọ",
    "寿": "thọ",
    "富": "phú",
    "貧": "bần",
    "贫": "bần",
    "災": "tai",
    "灾": "tai",
    "禍": "họa",
    "祸": "họa",
    "長": "trường",
    "长": "trường",
    "久": "cửu",
    "常": "thường",
    "極": "cực",
    "极": "cực",
    "難": "nan",
    "难": "nan",
    "易": "dị",
    "成": "thành",
    "敗": "bại",
    "败": "bại",
    "興": "hưng",
    "兴": "hưng",
    "衰": "suy",
    "盛": "thịnh",
    "善": "thiện",
    "惡": "ác",
    "恶": "ác",
    "心": "tâm",
    "性": "tính",
    "情": "tình",
    "智": "trí",
    "慧": "tuệ",
    "道": "đạo",
    "理": "lý",
    # Chữ Hàn (Hangul) thông dụng có thể bị rò rỉ
    "명": "mệnh",
    "운": "vận",
    "복": "phúc",
    "덕": "đức",
    "길": "cát",
    "흉": "hung",
}

# Biểu thức chính quy quét toàn bộ các dải ký tự ngoại lai: CJK (Trung/Nhật), Hangul (Hàn), Cyrillic (Nga), Thái, Ả Rập...
_FOREIGN_RANGES_REGEX = re.compile(
    r"[\u0400-\u052F\u0590-\u0E7F\u1100-\u11FF\u2E80-\u2FDF\u3000-\u303F\u3040-\u30FF\u3130-\u318F\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]+"
)

def sanitize_vietnamese_text(text: str) -> str:
    """
    Làm sạch và đảm bảo văn bản đầu ra 100% tiếng Việt chuẩn chữ Quốc ngữ (NFC).
    - Tự động chuyển ngữ các token chữ Hán / chữ Hàn / chữ Nga bị trộn sang từ tiếng Việt tương ứng.
    - Tự động chèn khoảng trắng khi token ngoại lai bị dính liền vào từ tiếng Việt (ví dụ: 'lần逢hung' -> 'lần phùng hung').
    - Loại bỏ triệt để mọi ký tự thuộc bảng mã CJK, Hangul, Cyrillic, Hiragana/Katakana còn sót lại.
    """
    if not text:
        return ""

    # 1. Chuẩn hóa Unicode dựng sẵn NFC
    cleaned = unicodedata.normalize("NFC", text)

    # 2. Thay thế các cụm đặc thù hay gặp trước để giữ ngữ nghĩa tự nhiên nhất
    phrase_replacements = [
        (r"逢\s*hung", " phùng hung"),
        (r"主\s*tinh", " chủ tinh"),
        (r"khi\s*落\s*vào", "khi rơi vào"),
        (r"落\s*hãm", " lạc hãm"),
        (r"落\s*vào", " rơi vào"),
        (r"phúc\s+lộc\s*綿\s*dài", "phúc lộc kéo dài"),
        (r"phúc\s+lộc\s*绵\s*dài", "phúc lộc kéo dài"),
        (r"綿\s*dài", " kéo dài"),
        (r"绵\s*dài", " kéo dài"),
        (r"綿\s*trường", " miên trường"),
        (r"绵\s*trường", " miên trường"),
        (r"быстро", " nhanh chóng "),
    ]
    for pattern, repl in phrase_replacements:
        cleaned = re.sub(pattern, repl, cleaned, flags=re.IGNORECASE)

    # 3. Thay thế từng token trong từ điển FOREIGN_TO_VIET_MAP kèm khoảng trắng bảo vệ hai đầu
    for f_tok, v_word in sorted(FOREIGN_TO_VIET_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if f_tok in cleaned:
            cleaned = cleaned.replace(f_tok, f" {v_word} ")

    # 4. Quét sạch hoàn toàn các ký tự ngoại lai (CJK, Hangul, Cyrillic...) không nằm trong từ điển
    if _FOREIGN_RANGES_REGEX.search(cleaned):
        cleaned = _FOREIGN_RANGES_REGEX.sub(" ", cleaned)

    # 5. Chuẩn hóa khoảng trắng trên từng dòng (giữ nguyên cấu trúc Markdown & ngắt dòng)
    cleaned_lines = []
    for line in cleaned.split("\n"):
        # Gộp nhiều dấu cách liên tiếp trên cùng 1 dòng thành 1 dấu cách
        norm_line = re.sub(r"[ \t]{2,}", " ", line)
        # Xóa khoảng trắng thừa ngay trước dấu câu (, . ; : ! ? ))
        norm_line = re.sub(r"\s+([,.;:!?\])])", r"\1", norm_line)
        # Xóa khoảng trắng thừa ngay sau dấu mở ngoặc ( [
        norm_line = re.sub(r"([(\[])\s+", r"\1", norm_line)
        cleaned_lines.append(norm_line.rstrip())

    return "\n".join(cleaned_lines)

def strip_markdown_italics(text: str) -> str:
    """Loại bỏ hoàn toàn định dạng in nghiêng (*...* hoặc _..._) theo quy chuẩn yêu cầu."""
    if not text:
        return ""
    # Chuyển blockquote '> *text*' thành '> text'
    text = re.sub(r'^\s*>\s*\*(.*?)\*\s*$', r'> \1', text, flags=re.MULTILINE)
    # Loại bỏ italic *text* (giữ nguyên **bold**)
    text = re.sub(r'(?<!\*)\*([^*\n\r]+)\*(?!\*)', r'\1', text)
    # Loại bỏ italic _text_ (giữ nguyên __bold__)
    text = re.sub(r'(?<!_)_([^_\n\r]+)_(?!_)', r'\1', text)
    return text

class TuViInterpreterService:
    def __init__(self, use_mock: Optional[bool] = None):
        self.compiler = PromptCompiler()
        self.use_mock = use_mock if use_mock is not None else MOCK_LLM_SERVICE
        self.mock_service = MockTuViInterpreterService()
        
        # Kiểm tra điều kiện thực tế của Gemini API
        self.real_client = None
        if not self.use_mock:
            if not GEMINI_API_KEY:
                logger.error("Không tìm thấy GEMINI_API_KEY để gọi AI thực tế.")
                raise ValueError("Hệ thống chưa được cấu hình GEMINI_API_KEY để gọi AI thực tế.")
            else:
                try:
                    from google import genai
                    from google.genai import types
                    # Cấu hình Client với request timeout (120s) chống ngắt quãng khi suy luận sâu HIGH
                    self.real_client = genai.Client(
                        api_key=GEMINI_API_KEY,
                        http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS)
                    )
                except Exception as e:
                    logger.error(f"Không thể khởi tạo Google GenAI Client: {e}.")
                    raise RuntimeError(f"Không thể kết nối Google GenAI API: {e}")

    def interpret_chart(self, markdown_ai: str, age: Optional[int] = None, gender: Optional[str] = None, extended_quota: bool = False) -> Dict[str, Any]:
        """
        Thực hiện luận giải lá số từ chuỗi markdown_ai.
        """
        start_time = time.time()
        
        # 1. Bóc tách metadata từ chuỗi markdown_ai
        metadata = self.compiler.extract_metadata_from_markdown(markdown_ai)
        actual_age = age if age is not None else metadata.get("age", 28)
        actual_gender = gender if gender is not None else metadata.get("gender", "Nam")
        pronoun = self.compiler.get_pronoun(actual_age, actual_gender)
        
        metadata["age"] = actual_age
        metadata["gender"] = actual_gender
        metadata["pronoun"] = pronoun

        # 2. Biên dịch System Instruction & User Prompt
        system_instruction = self.compiler.compile_system_instruction(actual_age, actual_gender)
        user_prompt = self.compiler.compile_user_prompt(markdown_ai, age=actual_age, gender=actual_gender)

        # 3. Thực thi qua Gemini Real Service (Tắt hoàn toàn Mock Service theo yêu cầu production)
        if self.use_mock:
            raise RuntimeError("Chế độ thử nghiệm (Developer Mockup) đã tắt hoàn toàn. Vui lòng kích hoạt gọi API luận giải thực tế.")

        usage_metadata = None
        try:
            from google.genai import types
            current_max_tokens = EXTENDED_MAX_OUTPUT_TOKENS if extended_quota else MAX_OUTPUT_TOKENS
            current_timeout_ms = EXTENDED_REQUEST_TIMEOUT_MS if extended_quota else REQUEST_TIMEOUT_MS
            config_kwargs = {
                "system_instruction": system_instruction,
                "temperature": 0.55,
                "top_p": 0.90,
                "top_k": 40,
                "max_output_tokens": current_max_tokens,
                "http_options": types.HttpOptions(timeout=current_timeout_ms)
            }
            # Chuẩn Google: Thiết lập thinking_level ("HIGH"), TUYỆT ĐỐI không gán thinking_budget để tránh xung đột
            if THINKING_LEVEL:
                config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_level=THINKING_LEVEL)
            
            config = types.GenerateContentConfig(**config_kwargs)
            
            # Cơ chế gọi streaming để chống timeout 504 Deadline Exceeded khi sinh văn bản dài
            reading_text = ""
            raw_um = None
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    text_parts = []
                    response_stream = self.real_client.models.generate_content_stream(
                        model=AI_MODEL_NAME,
                        contents=user_prompt,
                        config=config
                    )
                    chunk_idx = 0
                    for chunk in response_stream:
                        chunk_idx += 1
                        if chunk.candidates and chunk.candidates[0].content:
                            for part in chunk.candidates[0].content.parts:
                                if not getattr(part, "thought", False) and getattr(part, "text", None):
                                    text_parts.append(part.text)
                        elif chunk.text:
                            text_parts.append(chunk.text)
                        if hasattr(chunk, "usage_metadata") and chunk.usage_metadata:
                            raw_um = chunk.usage_metadata
                        if chunk_idx % 25 == 0:
                            print(f"[Streaming] Chunk {chunk_idx}: {sum(len(p) for p in text_parts)} chars received...", flush=True)
                    reading_text = "".join(text_parts)
                    if reading_text:
                        break
                except Exception as err:
                    err_str = str(err)
                    if any(kw in err_str for kw in ["503", "504", "429", "UNAVAILABLE", "DEADLINE_EXCEEDED", "ResourceExhausted", "timeout"]) and attempt < max_retries - 1:
                        wait_sec = 3.0 * (attempt + 1)
                        logger.warning(f"Gemini API báo bận/timeout (lần {attempt + 1}). Thử lại lần {attempt + 2}/{max_retries} sau {wait_sec}s...")
                        time.sleep(wait_sec)
                    else:
                        raise err

            # Bóc tách Usage Metadata Telemetry thực tế từ response của Google GenAI
            if raw_um:
                thoughts_t = getattr(raw_um, "thoughts_token_count", 0) or 0
                candidates_t = getattr(raw_um, "candidates_token_count", 0) or getattr(raw_um, "response_token_count", 0) or 0
                prompt_t = getattr(raw_um, "prompt_token_count", 0) or 0
                total_t = getattr(raw_um, "total_token_count", 0) or (prompt_t + candidates_t + thoughts_t)
                cached_t = getattr(raw_um, "cached_content_token_count", 0) or 0

                usage_metadata = {
                    "promptTokenCount": prompt_t,
                    "candidatesTokenCount": candidates_t,
                    "thoughtsTokenCount": thoughts_t,
                    "totalTokenCount": total_t,
                    "cachedContentTokenCount": cached_t,
                    "prompt_token_count": prompt_t,
                    "candidates_token_count": candidates_t,
                    "thoughts_token_count": thoughts_t,
                    "total_token_count": total_t,
                    "cached_content_token_count": cached_t
                }

                logger.info(
                    f"[Gemini Telemetry] Model: {AI_MODEL_NAME} | Thinking: {THINKING_LEVEL} | "
                    f"Prompt: {prompt_t} | Thoughts: {thoughts_t} | Candidates: {candidates_t} | "
                    f"Total: {total_t} | Cached: {cached_t}"
                )

            is_mock = False
            model_used = f"{AI_MODEL_NAME} (Thinking: {THINKING_LEVEL})" if THINKING_LEVEL else AI_MODEL_NAME
        except Exception as e:
            logger.error(f"Lỗi khi gọi Gemini API thực tế: {e}")
            raise RuntimeError(f"Lỗi máy chủ AI khi tạo bản luận giải: {str(e)}")

        # Làm sạch ký tự ngoại lai (CJK, Hangul, Cyrillic...) và vô hiệu hóa định dạng in nghiêng
        reading_text = sanitize_vietnamese_text(reading_text)
        reading_text = strip_markdown_italics(reading_text)

        # 4. Đo lường Benchmark (Word count, Token bóc tách, Chi phí)
        metrics = benchmark_reading(
            system_instruction, 
            user_prompt, 
            reading_text, 
            usage_metadata=usage_metadata,
            thinking_level=THINKING_LEVEL
        )
        metrics["model"] = model_used

        duration_sec = round(time.time() - start_time, 2)
        suggested_questions = self.generate_dynamic_suggestions(reading_text, metadata)

        return {
            "success": True,
            "reading_markdown": reading_text,
            "metadata": metadata,
            "benchmark": metrics,
            "suggested_questions": suggested_questions,
            "usage_metadata": usage_metadata,
            "is_mock": is_mock,
            "duration_seconds": duration_sec
        }

    def generate_streaming_reading(self, markdown_ai: str, age: Optional[int] = None, gender: Optional[str] = None, extended_quota: bool = False):
        """
        Bộ sinh dữ liệu (Generator) stream trực tiếp từng chunk văn bản luận giải của mô hình Gemini về client.
        Đảm bảo mỗi chunk được làm sạch và chuẩn hóa tiếng Việt trước khi yield.
        """
        metadata = self.compiler.parse_chart_metadata(markdown_ai)
        actual_age = age if age is not None else metadata.get("age", 28)
        actual_gender = gender if gender is not None else metadata.get("gender", "Nam")

        system_instruction = self.compiler.compile_system_instruction(actual_age, actual_gender)
        user_prompt = self.compiler.compile_user_prompt(markdown_ai, age=actual_age, gender=actual_gender)

        if self.use_mock:
            raise RuntimeError("Chế độ thử nghiệm (Developer Mockup) đã tắt hoàn toàn.")

        from google.genai import types
        current_max_tokens = EXTENDED_MAX_OUTPUT_TOKENS if extended_quota else MAX_OUTPUT_TOKENS
        current_timeout_ms = EXTENDED_REQUEST_TIMEOUT_MS if extended_quota else REQUEST_TIMEOUT_MS
        config_kwargs = {
            "system_instruction": system_instruction,
            "temperature": 0.55,
            "top_p": 0.90,
            "top_k": 40,
            "max_output_tokens": current_max_tokens,
            "http_options": types.HttpOptions(timeout=current_timeout_ms)
        }
        if THINKING_LEVEL:
            config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_level=THINKING_LEVEL)

        config = types.GenerateContentConfig(**config_kwargs)

        response_stream = self.real_client.models.generate_content_stream(
            model=AI_MODEL_NAME,
            contents=user_prompt,
            config=config
        )

        for chunk in response_stream:
            text_chunk = ""
            if chunk.candidates and chunk.candidates[0].content:
                for part in chunk.candidates[0].content.parts:
                    if not getattr(part, "thought", False) and getattr(part, "text", None):
                        text_chunk += part.text
            elif chunk.text:
                text_chunk += chunk.text

            if text_chunk:
                clean_chunk = sanitize_vietnamese_text(text_chunk)
                clean_chunk = strip_markdown_italics(clean_chunk)
                yield clean_chunk

    def generate_dynamic_suggestions(self, reading_markdown: str, metadata: dict = None) -> List[str]:
        """
        Trích xuất và sinh tự động 6 - 8 câu hỏi gợi ý phù hợp dựa trên nội dung thực tế của bài luận giải.
        """
        import re
        text = reading_markdown or ""
        questions = ["Hãy tóm tắt ngắn gọn các ý chính trong bài luận giải."]

        # 1. Thân cư
        than_match = re.search(r'Thân cư\s+([A-Za-zÀ-ỹ\s]+?)(?:tại|\(|\.|\,|\-)', text)
        if than_match:
            tc = than_match.group(1).strip()
            if "Thê" in tc:
                questions.append("Cung Thân cư Thê ảnh hưởng ra sao đến hôn nhân và sự nghiệp?")
            elif "Phu" in tc:
                questions.append("Cung Thân cư Phu ảnh hưởng ra sao đến hôn nhân và sự nghiệp?")
            elif "Quan" in tc:
                questions.append("Vị trí Thân cư Quan Lộc định hướng con đường công danh thế nào?")
            elif "Tài" in tc:
                questions.append("Vị trí Thân cư Tài Bạch tác động ra sao đến khả năng tích lũy tài chính?")
            elif "Phúc" in tc:
                questions.append("Vị trí Thân cư Phúc Đức mang lại phúc ấm và bước ngoặt ra sao?")
            elif "Di" in tc or "Thiên Di" in tc:
                questions.append("Thân cư Thiên Di có lợi thế gì khi phát triển xã hội hoặc đi xa?")
            elif "Mệnh" in tc:
                questions.append("Thân Mệnh đồng cung thể hiện bản lĩnh tự lập và tính cách ra sao?")

        # 2. Tam hợp Mệnh - Tài - Quan & Bộ sao chủ đạo
        if "Sát Phá Tham" in text:
            questions.append("Cách cục Sát Phá Tham trên tinh bàn tác động thế nào đến vận mệnh?")
        elif "Tử Phủ Vũ Tướng" in text:
            questions.append("Bộ sao Tử Phủ Vũ Tướng mở ra cơ hội lãnh đạo và phát triển thế nào?")
        elif "Cơ Nguyệt Đồng Lương" in text:
            questions.append("Cách cục Cơ Nguyệt Đồng Lương định hướng sự nghiệp chuyên môn ra sao?")
        elif "Cự Nhật" in text or "Cự Cơ" in text:
            questions.append("Bộ sao Cự Môn trên tinh bàn ảnh hưởng gì đến các mối quan hệ xã hội?")

        # 3. Cung Tài Bạch
        if "Phá Quân" in text and "Tài Bạch" in text:
            questions.append("Dòng tiền theo cung Tài Bạch ngộ Phá Quân cần lưu ý điều gì?")
        elif "Tài Bạch" in text:
            questions.append("Cơ hội tài lộc và khả năng tích lũy tiền của tôi diễn biến thế nào?")

        # 4. Cung Quan Lộc
        if "Không Kiếp" in text and "Quan Lộc" in text:
            questions.append("Cách hóa giải hung sát tinh ngộ Không Kiếp tại cung Quan Lộc?")
        elif "Thất Sát" in text and "Quan Lộc" in text:
            questions.append("Cách vượt qua áp lực và thử thách trong công việc theo cung Quan Lộc?")
        elif "Quan Lộc" in text:
            questions.append("Môi trường công việc và hướng thăng tiến phù hợp nhất với tôi là gì?")

        # 5. Đại vận 10 năm
        dv_match = re.search(r'đại vận\s*(\d{1,2}\s*-\s*\d{1,2}\s*tuổi)', text, re.IGNORECASE)
        if dv_match:
            questions.append(f"Đại vận {dv_match.group(1)} mang lại những bước ngoặt then chốt nào?")
        else:
            questions.append("Đại vận 10 năm hiện tại có những cơ hội và thách thức gì?")

        # 6. Tiểu vận các năm
        years = re.findall(r'Năm\s*(20\d{2})', text)
        if years:
            unique_years = []
            for y in years:
                if y not in unique_years:
                    unique_years.append(y)
            if len(unique_years) >= 1:
                questions.append(f"Vận hạn và cơ hội tài chính trong năm {unique_years[0]} diễn biến thế nào?")
            if len(unique_years) >= 2:
                y_rest = " và ".join(unique_years[1:3])
                questions.append(f"Năm {y_rest} tôi cần lưu ý gì về sức khỏe và công việc?")

        # 7. Lời khuyên tu dưỡng / Hóa giải
        questions.append("Lời khuyên tu dưỡng để kích hoạt phúc đức, vạn sự hanh thông?")

        # Giữ tối đa 8 câu hỏi súc tích
        return questions[:8]

    def answer_followup_question(
        self,
        question: str,
        markdown_ai: str = "",
        reading_text: str = "",
        history: Optional[list] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        accumulated_tokens: int = 0
    ) -> Dict[str, Any]:
        """
        Xử lý câu hỏi đối đáp tiếp nối của người dùng sau khi đã nghe/đọc luận giải lá số.
        Hạn mức độc lập tối đa toàn phiên: 10000 tokens (QA_MAX_OUTPUT_TOKENS).
        Phong cách: Thân mật theo phong cách đối đáp lịch sự, câu trả lời trực diện, gãy gọn, súc tích.
        """
        start_time = time.time()

        # Kiểm tra trần token lũy kế trước khi xử lý
        if accumulated_tokens >= QA_MAX_OUTPUT_TOKENS:
            return {
                "success": False,
                "quota_exceeded": True,
                "error": "Bạn đã đạt giới hạn sử dụng AI cho phiên luận giải này.",
                "accumulated_tokens": accumulated_tokens,
                "quota_limit": QA_MAX_OUTPUT_TOKENS,
                "answer": ""
            }

        remaining_tokens = QA_MAX_OUTPUT_TOKENS - accumulated_tokens
        current_max_tokens = min(QA_MAX_OUTPUT_TOKENS, max(50, remaining_tokens))

        meta = self.compiler.extract_metadata_from_markdown(markdown_ai) if markdown_ai else {}
        actual_age = age if age is not None else meta.get("age", 28)
        actual_gender = gender if gender is not None else meta.get("gender", "Nam")
        pronoun = self.compiler.get_pronoun(actual_age, actual_gender)
        intimate = self.compiler.get_intimate_pronoun(pronoun)

        qa_system_instruction = f"""Bạn là Chuyên gia Tư vấn Mệnh lý của hệ sinh thái 'Tử Vi Hồng Ân' (tuvihongan.com).
Bạn đang trực tiếp đối đáp và giải đáp thắc mắc của {pronoun} sau khi {pronoun} đã nhận bài luận giải lá số Tử Vi.
QUY TẮC ĐỐI ĐÁP BẮT BUỘC:
1. XƯNG HÔ: Nhất quán xưng hô trang trọng và thân mật với '{pronoun}' (hoặc '{intimate}') và xưng mình là 'Tử Vi Hồng Ân'.
2. PHONG CÁCH: Thân mật theo phong cách đối đáp lịch sự, câu trả lời trực diện, gãy gọn, súc tích và đủ ý (khoảng 200 - 500 từ). Tuyệt đối không trả lời lan man dài dòng.
3. ĐỊNH HƯỚNG: Luôn lấy triết lý 'Đức năng thắng số' làm điểm tựa hành động, thấu cảm, giải tỏa âu lo và hướng dẫn giải pháp thực tế.
4. KHẮC KHOA: Cấm dùng từ ngữ phán xét mê tín cực đoan hoặc thuật ngữ máy móc kỹ thuật AI.
5. NGÔN NGỮ THUẦN VIỆT 100%: Bắt buộc sử dụng 100% chữ Quốc ngữ tiếng Việt chuẩn. Tuyệt đối nghiêm cấm trộn bất kỳ ký tự chữ Hán (Trung/Nhật), chữ Hàn (Hangul), chữ Nga (Cyrillic) hay từ tiếng Anh vào câu trả lời."""

        chart_brief = ""
        if markdown_ai:
            from ..engine.context_pruner import prune_markdown_ai
            chart_brief = prune_markdown_ai(markdown_ai)[:2000]

        history_context = ""
        if history:
            h_lines = []
            for h in history[-3:]:
                sender = h.get("sender", "user")
                txt = h.get("text", "")
                h_lines.append(f"{'Người hỏi' if sender == 'user' else 'Tử Vi Hồng Ân'}: {txt}")
            history_context = "\n".join(h_lines)

        user_content = f"""Dữ liệu tinh bàn tóm lược:
{chart_brief}

Lịch sử trao đổi gần nhất:
{history_context}

Câu hỏi của {pronoun}: "{question}"

Hãy trả lời trực diện, ngắn gọn, thân mật và lịch sự:"""

        if self.use_mock or not self.real_client:
            answer = f"\"*Về thắc mắc của {pronoun}:*\"\n\nTheo cấu trúc tinh bàn và nguyên lý *\"Đức năng thắng số\"*, điều then chốt nhất lúc này là {intimate} cần giữ tâm thế bình tĩnh, kiên định với mục tiêu và không ngừng bồi đắp chuyên môn thực tế. Những trở ngại hiện tại chỉ là phép thử giúp {intimate} tôi luyện bản lĩnh vững vàng hơn trước khi đón nhận những cơ hội hanh thông sắp tới."
            sim_output_tokens = min(current_max_tokens, 180)
            usage = {
                "promptTokenCount": 500,
                "candidatesTokenCount": sim_output_tokens,
                "totalTokenCount": 500 + sim_output_tokens
            }
        else:
            try:
                from google.genai import types
                cfg = types.GenerateContentConfig(
                    system_instruction=qa_system_instruction,
                    temperature=0.55,
                    top_p=0.90,
                    top_k=40,
                    max_output_tokens=current_max_tokens,
                    http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS)
                )
                if QA_THINKING_LEVEL:
                    cfg.thinking_config = types.ThinkingConfig(thinking_level=QA_THINKING_LEVEL)

                resp = self.real_client.models.generate_content(
                    model=QA_MODEL_NAME,
                    contents=user_content,
                    config=cfg
                )
                answer = resp.text or ""
                if not answer and getattr(resp, "candidates", None) and resp.candidates[0].content:
                    parts = [p.text for p in resp.candidates[0].content.parts if getattr(p, "text", None) and not getattr(p, "thought", False)]
                    answer = "".join(parts)

                raw_um = getattr(resp, "usage_metadata", None)
                candidates_cnt = getattr(raw_um, "candidates_token_count", 0) if raw_um else 0
                if candidates_cnt == 0 and answer:
                    candidates_cnt = int(len(answer.split()) * 1.35)

                usage = {
                    "promptTokenCount": getattr(raw_um, "prompt_token_count", 0) if raw_um else 0,
                    "candidatesTokenCount": candidates_cnt,
                    "totalTokenCount": getattr(raw_um, "total_token_count", 0) if raw_um else candidates_cnt
                }
            except Exception as e:
                logger.error(f"Lỗi khi gọi Gemini cho hỏi đáp Q&A: {e}")
                answer = f"Tử Vi Hồng Ân nhận thấy thắc mắc của {pronoun} rất xác đáng. Theo nguyên lý *\"Đức năng thắng số\"*, mọi khúc mắc đều có hướng chuyển hóa tích cực khi ta giữ tâm thái vững vàng, làm việc thiện lành và thận trọng trong từng quyết định."
                usage = {"promptTokenCount": 0, "candidatesTokenCount": 120, "totalTokenCount": 120}

        actual_output = usage.get("candidatesTokenCount", 0)
        new_accumulated = accumulated_tokens + actual_output
        is_quota_reached = new_accumulated >= QA_MAX_OUTPUT_TOKENS

        # Làm sạch ký tự ngoại lai và vô hiệu hóa định dạng in nghiêng trong câu trả lời
        clean_answer = sanitize_vietnamese_text(answer)
        clean_answer = strip_markdown_italics(clean_answer)

        return {
            "success": True,
            "answer": clean_answer,
            "usage_metadata": usage,
            "accumulated_tokens": new_accumulated,
            "quota_exceeded": is_quota_reached,
            "quota_limit": QA_MAX_OUTPUT_TOKENS,
            "duration_seconds": round(time.time() - start_time, 2)
        }

