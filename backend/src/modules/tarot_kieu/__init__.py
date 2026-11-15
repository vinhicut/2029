# -*- coding: utf-8 -*-
"""
Tarot Kiều Module.
"""

from .routes import tarot_kieu_bp
from .service import TarotKieuService, tarot_kieu_service

__all__ = ["tarot_kieu_bp", "TarotKieuService", "tarot_kieu_service"]
