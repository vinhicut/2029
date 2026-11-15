# -*- coding: utf-8 -*-
"""
Service for Courses module.
"""

from typing import List, Optional, Dict, Any, Tuple
from .repository import CourseRepository
from .models import Course, CourseEnrollment


class CourseService:
    def __init__(self, repository: Optional[CourseRepository] = None):
        self.repository = repository or CourseRepository()

    def list_courses(self, level: Optional[str] = None) -> List[Dict[str, Any]]:
        courses = self.repository.list_courses(level)
        return [c.to_dict() for c in courses]

    def get_course_detail(self, identifier: str) -> Optional[Dict[str, Any]]:
        course = self.repository.get_course(identifier)
        return course.to_dict() if course else None

    def enroll(self, data: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        course_id = str(data.get("course_id", "")).strip()
        student_name = str(data.get("student_name", "")).strip()
        email = str(data.get("email", "")).strip()
        phone = str(data.get("phone", "")).strip()

        if not course_id:
            return False, "Thiếu thông tin khoá học.", None
        if not student_name:
            return False, "Vui lòng nhập họ và tên học viên.", None
        if not phone:
            return False, "Vui lòng nhập số điện thoại liên hệ.", None

        course = self.repository.get_course(course_id)
        if not course:
            return False, f"Không tìm thấy khoá học '{course_id}'.", None

        enrollment_id = self.repository.save_enrollment(data)
        return True, "Đăng ký khoá học thành công.", enrollment_id


course_service = CourseService()
