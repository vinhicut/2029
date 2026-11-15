# -*- coding: utf-8 -*-
"""
Courses Module.
"""

from .routes import courses_bp
from .service import CourseService, course_service

__all__ = ["courses_bp", "CourseService", "course_service"]
