# -*- coding: utf-8 -*-
"""
Package api: Controller endpoints RESTful cho phân hệ Lá Số & Luận Giải Tử Vi.
"""

from .routes_charts import charts_bp
from .routes_ai import ai_bp

__all__ = ["charts_bp", "ai_bp"]
