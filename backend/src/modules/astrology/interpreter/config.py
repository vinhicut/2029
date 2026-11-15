# config.py
"""
Cấu hình hệ thống AI Luận Giải Tử Vi Đẩu Số (Tử Vi Hồng Ân).
"""

import os
from pathlib import Path

# Đường dẫn thư mục tài nguyên cục bộ và tham chiếu
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[4] # E:\Documents\Tử Vi Hồng Ân Website
RESOURCES_DIR = BASE_DIR / "resources"
REFERENCES_DIR = BASE_DIR / "resources"


# Tự động nạp biến môi trường từ .env
for env_file in [PROJECT_ROOT / ".env", PROJECT_ROOT / "backend" / ".env"]:
    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip("'\"")
                        os.environ[key] = val
        except Exception:
            pass

# Cấu hình model của Gemini (mặc định gemini-4-carbon)
AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-4-carbon").strip()

# Cấu hình mức độ suy luận (Thinking Level: MINIMAL, LOW, MEDIUM, HIGH)
THINKING_LEVEL = os.getenv("THINKING_LEVEL", "MEDIUM").strip().upper()

# Trần giới hạn token tối đa kỹ thuật cho bài luận (26.000 tokens)
MAX_OUTPUT_TOKENS = int(os.getenv("MAX_OUTPUT_TOKENS", "26000"))

# Giới hạn mở rộng (Extended Quota) khi người dùng yêu cầu luận giải lại (gấp 1.5 lần MAX_OUTPUT_TOKENS = 39.000)
EXTENDED_MAX_OUTPUT_TOKENS = int(os.getenv("EXTENDED_MAX_OUTPUT_TOKENS", "39000"))
EXTENDED_REQUEST_TIMEOUT_MS = int(os.getenv("EXTENDED_REQUEST_TIMEOUT_MS", "900000")) # 15 phút (900.000 ms)

# Cấu hình model & mức độ suy luận cho hỏi đáp tiếp nối sau luận giải (Q&A Follow-up)
QA_MODEL_NAME = os.getenv("QA_MODEL_NAME", "gemini-4-hydrogen").strip()
QA_THINKING_LEVEL = os.getenv("QA_THINKING_LEVEL", "LOW").strip().upper()
QA_MAX_OUTPUT_TOKENS = int(os.getenv("QA_MAX_OUTPUT_TOKENS", "10000"))

# Request timeout ở tầng client / gateway (120s = 120.000 ms)
REQUEST_TIMEOUT_MS = int(os.getenv("AI_REQUEST_TIMEOUT_MS", "300000"))

# Mục tiêu dung lượng văn bản luận giải tiếng Việt (14-15 phần hoàn chỉnh):
# - Khoảng tối ưu: 6.500 từ (dải khuyến nghị 5.800 - 7.200 từ)
# - Trần tối đa: 8.500 từ tiếng Việt
# - Trần tối đa: 38.000 ký tự tính cả dấu cách
TARGET_OPTIMAL_WORDS = int(os.getenv("TARGET_OPTIMAL_WORDS", "6500"))
TARGET_MIN_WORDS = int(os.getenv("TARGET_MIN_WORDS", "5800"))
TARGET_MAX_WORDS = int(os.getenv("TARGET_MAX_WORDS", "7200"))
MAX_WORDS_LIMIT = int(os.getenv("MAX_WORDS_LIMIT", "8500"))
MAX_CHARS_LIMIT = int(os.getenv("MAX_CHARS_LIMIT", "38000"))

# Biến môi trường API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()


# Chế độ giả lập (Mock Mode)
# Mặc định kích hoạt nếu MOCK_LLM_SERVICE=true HOẶC chưa có GEMINI_API_KEY
_mock_env = os.getenv("MOCK_LLM_SERVICE", "").strip().lower()
if _mock_env in ("false", "0", "no"):
    MOCK_LLM_SERVICE = False if GEMINI_API_KEY else True
else:
    MOCK_LLM_SERVICE = True if not GEMINI_API_KEY else (_mock_env in ("true", "1", "yes"))
