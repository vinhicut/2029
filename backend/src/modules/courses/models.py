# -*- coding: utf-8 -*-
"""
Models for Courses module.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


@dataclass
class Course:
    id: str
    title: str
    slug: str
    instructor: str
    description: str
    level: str  # "Căn bản" | "Trung cấp" | "Nâng cao"
    duration: str
    price: int
    thumbnail_url: Optional[str] = None
    syllabus: List[Dict[str, Any]] = field(default_factory=list)
    is_active: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Course":
        return cls(
            id=str(data.get("id", "")),
            title=data.get("title", ""),
            slug=data.get("slug", ""),
            instructor=data.get("instructor", "Thầy Tử Vi"),
            description=data.get("description", ""),
            level=data.get("level", "Căn bản"),
            duration=data.get("duration", "8 tuần"),
            price=int(data.get("price", 0)),
            thumbnail_url=data.get("thumbnail_url"),
            syllabus=data.get("syllabus", []),
            is_active=bool(data.get("is_active", True))
        )


@dataclass
class CourseEnrollment:
    course_id: str
    student_name: str
    email: str
    phone: str
    note: Optional[str] = None
    payment_status: str = "PENDING"
    id: Optional[int] = None
    created_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
