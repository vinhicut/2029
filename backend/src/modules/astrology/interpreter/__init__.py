# -*- coding: utf-8 -*-
"""
Package interpreter: Module tích hợp AI Luận Giải Tử Vi Đẩu Số Chuẩn Hàm Lâm (Tử Vi Hồng Ân).
"""

from .config import (
    AI_MODEL_NAME,
    MAX_OUTPUT_TOKENS,
    TARGET_MIN_WORDS,
    TARGET_MAX_WORDS,
    MOCK_LLM_SERVICE
)
from .service import TuViInterpreterService
from .prompt_compiler import PromptCompiler
from .mock_service import MockTuViInterpreterService

__all__ = [
    "AI_MODEL_NAME",
    "MAX_OUTPUT_TOKENS",
    "TARGET_MIN_WORDS",
    "TARGET_MAX_WORDS",
    "MOCK_LLM_SERVICE",
    "TuViInterpreterService",
    "PromptCompiler",
    "MockTuViInterpreterService"
]
