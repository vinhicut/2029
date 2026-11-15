# -*- coding: utf-8 -*-
"""
Forum Module.
"""

from .routes import forum_bp
from .service import ForumService, forum_service

__all__ = ["forum_bp", "ForumService", "forum_service"]
