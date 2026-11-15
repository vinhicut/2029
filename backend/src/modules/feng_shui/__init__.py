# -*- coding: utf-8 -*-
"""
Feng Shui Module.
"""

from .routes import feng_shui_bp
from .service import FengShuiService, feng_shui_service

__all__ = ["feng_shui_bp", "FengShuiService", "feng_shui_service"]
