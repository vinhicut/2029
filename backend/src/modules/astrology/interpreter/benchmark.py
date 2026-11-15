# benchmark.py
"""
Công cụ đo lường dung lượng Token, số từ tiếng Việt và ước tính chi phí API (Gemini 4 Argon).
"""

import re
from typing import Dict, Any

# Biểu giá Gemini 3.8 Flash (USD / 1.000.000 tokens)
# Theo chuẩn Google Cloud: Thinking Tokens được tính phí tương đương Output Tokens
PRICE_INPUT_PER_1M = 2.00
PRICE_OUTPUT_PER_1M = 10.00
PRICE_THINKING_PER_1M = 10.00 # Thinking tokens tính theo đơn giá Output Tokens ($10.00/1M tokens)

AI_CLICHE_BLACKLIST = [
    "bức tranh", "bản giao hưởng", "bản hòa ca", "vũ điệu của",
    "lắng đọng trong lòng độc giả", "khép lại trang sách", "khơi gợi cảm xúc", "chạm đến trái tim",
    "khắc họa một cách sinh động", "chiếu rọi", "soi rọi", "cộng hưởng sâu sắc", "đan xen tinh tế",
    "vượt qua ranh giới thời gian", "gợi lên nỗi niềm sâu kín", "thế giới nội tâm phức tạp",
    "hơi thở của thời đại", "nốt trầm xao xuyến", "chiếc cầu nối cảm xúc", "tiếng lòng",
    "sức lôi cuốn kỳ diệu", "ám ảnh khôn nguôi", "đậm chất trữ tình", "tràn trề sức sống",
    "sâu sắc và tinh tế", "dấu ấn không thể phai mờ", "thể hiện rõ nét", "thổi hồn vào",
    "dệt nên", "đưa người đọc qua từng cung bậc cảm xúc", "tựa như một bức tranh",
    "mở ra một thế giới đầy mê hoặc", "như một sợi chỉ đỏ xuyên suốt", "đọng lại dư âm khó phai",
    "đóng vai trò then chốt", "minh chứng rõ nét", "minh chứng sống động", "tối quan trọng",
    "ngọn hải đăng dẫn lối", "đi sâu vào", "đào sâu vào", "góc nhìn đa chiều", "bối cảnh không ngừng biến đổi",
    "hồi chuông cảnh tỉnh", "bản chất cốt lõi", "đạt được sự cân bằng tinh tế", "kim chỉ nam",
    "chất xúc tác mạnh mẽ", "mối tương quan phức tạp", "mỗi chúng ta cần", "tác động sâu rộng",
    "trong thế giới phát triển nhanh chóng ngày nay", "trong kỷ nguyên số", "nhìn nhận một cách thấu đáo",
    "mở đường cho", "tạo tiền đề vững chắc", "vun đắp những giá trị tốt đẹp", "nâng cao nhận thức",
    "vượt qua ranh giới định kiến", "đứng trước ngã rẽ cuộc đời", "khẳng định vị thế bản thân",
    "bài toán nan giải", "sức mạnh nội sinh", "quy luật tất yếu của cuộc sống",
    "không phải là đích đến mà là một hành trình", "tóm lại, nhìn chung", "tận dụng tối đa", "mở khóa tiềm năng"
]

def audit_anti_slop(text: str) -> Dict[str, Any]:
    """Kiểm tra văn bản đầu ra xem có chứa các từ vựng khuôn sáo AI (AI Clichés) bị cấm hay không."""
    if not text:
        return {"passed": True, "detected_cliches": [], "cliche_count": 0}
    text_lower = text.lower()
    found = []
    for c in AI_CLICHE_BLACKLIST:
        if c.lower() in text_lower:
            found.append(c)
    return {
        "passed": len(found) == 0,
        "detected_cliches": found,
        "cliche_count": len(found)
    }

FOREIGN_SCRIPT_PATTERN = re.compile(
    r"[\u0400-\u052F\u0590-\u0E7F\u1100-\u11FF\u2E80-\u2FDF\u3000-\u303F\u3040-\u30FF\u3130-\u318F\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]+"
)

def audit_language_purity(text: str) -> Dict[str, Any]:
    """Kiểm tra văn bản đầu ra có đạt chuẩn 100% tiếng Việt (không lẫn token CJK, Hangul, Cyrillic...) hay không."""
    if not text:
        return {"passed": True, "foreign_tokens": [], "foreign_token_count": 0}
    matches = FOREIGN_SCRIPT_PATTERN.findall(text)
    return {
        "passed": len(matches) == 0,
        "foreign_tokens": list(dict.fromkeys(matches)),
        "foreign_token_count": len(matches)
    }

def count_words(text: str) -> int:
    """Đếm số từ tiếng Việt thực tế trong văn bản."""
    if not text:
        return 0
    words = re.findall(r"\b[\w\-À-ỹ]+\b", text, re.UNICODE)
    return len(words)

def estimate_tokens(text: str) -> int:
    """
    Ước lượng số lượng token cho văn bản tiếng Việt.
    Dựa trên tỷ lệ BPE trung bình của mô hình Gemini (~1.5 token / word + ký tự định dạng).
    """
    if not text:
        return 0
    words = count_words(text)
    # Tỷ lệ: 1 từ tiếng Việt ~ 1.5 token, cộng thêm phụ phí định dạng markdown
    estimated = int(words * 1.55) + len(re.findall(r"[#*|`>\-_[\]()]", text)) // 2
    return max(estimated, 1)

def calculate_cost(input_tokens: int, output_tokens: int, thinking_tokens: int = 0, cached_tokens: int = 0) -> Dict[str, float]:
    """
    Tính toán chi phí giả định theo biểu giá Gemini 3.8 Flash (USD),
    bóc tách rõ ràng chi phí Input, Output văn bản và Thinking tokens.
    """
    billable_in = max(input_tokens - cached_tokens, 0)
    cost_in = (billable_in / 1_000_000) * PRICE_INPUT_PER_1M
    cost_cached = (cached_tokens / 1_000_000) * (PRICE_INPUT_PER_1M * 0.1) # Chiết khấu tới 90% cho cached context
    cost_out = (output_tokens / 1_000_000) * PRICE_OUTPUT_PER_1M
    cost_thinking = (thinking_tokens / 1_000_000) * PRICE_THINKING_PER_1M
    total = cost_in + cost_cached + cost_out + cost_thinking
    return {
        "total_cost_usd": round(total, 6),
        "input_cost_usd": round(cost_in + cost_cached, 6),
        "output_cost_usd": round(cost_out, 6),
        "thinking_cost_usd": round(cost_thinking, 6)
    }

def benchmark_reading(
    system_instruction: str, 
    user_prompt: str, 
    output_text: str, 
    usage_metadata: Any = None,
    thinking_level: str = "HIGH"
) -> Dict[str, Any]:
    """
    Tổng hợp chỉ số hiệu năng, telemetry token bóc tách và chi phí của lượt gọi API.
    Ưu tiên dữ liệu telemetry thực tế từ Google GenAI usageMetadata nếu có.
    """
    input_text = (system_instruction or "") + "\n" + (user_prompt or "")
    default_in = estimate_tokens(input_text)
    default_out = estimate_tokens(output_text)
    
    in_tokens = default_in
    out_tokens = default_out
    thinking_tokens = 0
    cached_tokens = 0

    if usage_metadata:
        if isinstance(usage_metadata, dict):
            in_tokens = usage_metadata.get("promptTokenCount") or usage_metadata.get("prompt_token_count") or in_tokens
            out_tokens = usage_metadata.get("candidatesTokenCount") or usage_metadata.get("candidates_token_count") or usage_metadata.get("response_token_count") or out_tokens
            thinking_tokens = usage_metadata.get("thoughtsTokenCount") or usage_metadata.get("thoughts_token_count") or 0
            cached_tokens = usage_metadata.get("cachedContentTokenCount") or usage_metadata.get("cached_content_token_count") or 0
        else:
            in_tokens = getattr(usage_metadata, "prompt_token_count", in_tokens) or in_tokens
            out_tokens = getattr(usage_metadata, "candidates_token_count", None) or getattr(usage_metadata, "response_token_count", None) or out_tokens
            thinking_tokens = getattr(usage_metadata, "thoughts_token_count", 0) or 0
            cached_tokens = getattr(usage_metadata, "cached_content_token_count", 0) or 0
        total_tokens = in_tokens + out_tokens + thinking_tokens
    else:
        # Ước lượng telemetry dựa trên cấp độ suy luận nếu không có usageMetadata thực tế
        lvl = str(thinking_level).upper()
        if lvl == "HIGH":
            thinking_tokens = 9500 # Ước lượng tiêu chuẩn mức HIGH
        elif lvl == "MEDIUM":
            thinking_tokens = 3000
        elif lvl == "LOW":
            thinking_tokens = 500
        else:
            thinking_tokens = 0
        total_tokens = in_tokens + out_tokens + thinking_tokens

    word_cnt = count_words(output_text)
    char_cnt = len(output_text or "")
    costs = calculate_cost(in_tokens, out_tokens, thinking_tokens, cached_tokens)
    slop_audit = audit_anti_slop(output_text)
    lang_audit = audit_language_purity(output_text)
    
    return {
        "word_count": word_cnt,
        "char_count": char_cnt,
        "is_under_char_limit": char_cnt <= 38000,
        "is_under_word_limit": word_cnt <= 8500,
        "is_optimal": 5800 <= word_cnt <= 7200 and char_cnt <= 38000,
        "in_target_range": 5800 <= word_cnt <= 7500 and char_cnt <= 38000,
        "anti_slop_audit": slop_audit,
        "language_purity_audit": lang_audit,
        # Bóc tách telemetry chuẩn hóa
        "input_tokens": in_tokens,
        "output_tokens": out_tokens,
        "thoughts_tokens": thinking_tokens,
        "total_tokens": total_tokens,
        "cached_tokens": cached_tokens,
        # Chuẩn định dạng Google Cloud / Gemini Telemetry
        "promptTokenCount": in_tokens,
        "candidatesTokenCount": out_tokens,
        "thoughtsTokenCount": thinking_tokens,
        "totalTokenCount": total_tokens,
        "cachedContentTokenCount": cached_tokens,
        # Chi phí
        "estimated_cost_usd": costs["total_cost_usd"],
        "cost_breakdown": costs,
        "model": "gemini-4-argon",
        "thinking_level": thinking_level
    }
