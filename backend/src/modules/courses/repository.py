# -*- coding: utf-8 -*-
"""
Repository for Courses module.
"""

import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from core.config import DATABASE_MODE
from core.db import get_connection
from core.db_manager import DatabaseManager
from .models import Course, CourseEnrollment

logger = logging.getLogger(__name__)

_db_manager = DatabaseManager()

def _get_courses_conn():
    if DATABASE_MODE == "modular":
        return _db_manager.get_courses_connection()
    return get_connection()

SEED_COURSES = [
    {
        "id": "course-tv-01",
        "slug": "tu-vi-can-ban",
        "title": "Tử Vi Đẩu Số Căn Bản – Nhập Môn Luận Mệnh",
        "instructor": "Hồng Ân Đạo Nhân",
        "description": "Khoá học nhập môn toàn diện: An sao, 14 chính tinh, 12 cung chức, định cách cục và luận đoán đại hạn tổng quan.",
        "level": "Căn bản",
        "duration": "8 tuần (16 buổi)",
        "price": 2500000,
        "thumbnail_url": "/assets/courses/tu-vi-can-ban.webp",
        "syllabus": [
            {"week": 1, "topic": "Tổng quan âm dương ngũ hành và can chi"},
            {"week": 2, "topic": "Cấu trúc 12 cung vị và ý nghĩa nhân sinh"},
            {"week": 3, "topic": "14 Chính tinh: Tử Vi, Thiên Phủ, Thái Dương, Thái Âm..."},
            {"week": 4, "topic": "Lục cát tinh và Lục sát tinh trong thực chiến"}
        ],
        "is_active": True
    },
    {
        "id": "course-tv-02",
        "slug": "tu-vi-chuyen-sau",
        "title": "Tử Vi Khâm Thiên Giám Chuyên Sâu – Phi Tinh Lương Phái",
        "instructor": "Hồng Ân Đạo Nhân",
        "description": "Chuyên đề nâng cao về Tứ Hóa phi tinh (Khoa, Quyền, Lộc, Kỵ), tầm nguyên nhân quả và giải đoán lưu niên chuẩn xác.",
        "level": "Nâng cao",
        "duration": "10 tuần (20 buổi)",
        "price": 5000000,
        "thumbnail_url": "/assets/courses/tu-vi-chuyen-sau.webp",
        "syllabus": [
            {"week": 1, "topic": "Nguyên lý Tứ Hóa nguyên thủy và tự hóa"},
            {"week": 2, "topic": "Phi cung quy luật và trục đối xung"},
            {"week": 3, "topic": "Luận đại vận 10 năm và lưu niên từng năm"}
        ],
        "is_active": True
    },
    {
        "id": "course-pt-01",
        "slug": "bat-trach-loan-dau",
        "title": "Bát Trạch Minh Kính & Loan Đầu Phong Thủy Ứng Dụng",
        "instructor": "Chuyên Gia Phong Thủy",
        "description": "Thực hành đo đạc La Kinh, phân cung trạch mệnh, bố trí dương trạch (cửa, bếp, phòng ngủ, ban thờ) chiêu tài nạp phúc.",
        "level": "Trung cấp",
        "duration": "6 tuần (12 buổi)",
        "price": 3200000,
        "thumbnail_url": "/assets/courses/phong-thuy-bat-trach.webp",
        "syllabus": [
            {"week": 1, "topic": "Nguyên tắc Bát Trạch Đông Tây Tứ Mệnh"},
            {"week": 2, "topic": "Khảo sát thế đất và hình thế Loan Đầu xung quanh"}
        ],
        "is_active": True
    },
    {
        "id": "course-qm-01",
        "slug": "ky-mon-don-giap",
        "title": "Kỳ Môn Độn Giáp Dự Đoán Học Thực Chiến",
        "instructor": "Dị Nhân Kỳ Môn",
        "description": "Môn bí truyền dự đoán thời vận, chiến lược đàm phán kinh doanh, chọn thời khắc khởi sự và xuất hành đại cát.",
        "level": "Nâng cao",
        "duration": "8 tuần (16 buổi)",
        "price": 4500000,
        "thumbnail_url": "/assets/courses/ky-mon-don-giap.webp",
        "syllabus": [
            {"week": 1, "topic": "Cửu Cung Bát Quái và Cửu Tinh Cửu Thần"},
            {"week": 2, "topic": "Tam Kỳ Lục Nghi và cách lập bàn thời khóa"}
        ],
        "is_active": True
    }
]


class CourseRepository:
    def __init__(self):
        self._in_memory_courses = {c["id"]: Course.from_dict(c) for c in SEED_COURSES}
        self._in_memory_enrollments: List[Dict[str, Any]] = []
        self._init_tables()

    def _init_tables(self):
        try:
            conn = _get_courses_conn()
            try:
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS courses (
                            id TEXT PRIMARY KEY,
                            slug TEXT UNIQUE NOT NULL,
                            title TEXT NOT NULL,
                            instructor TEXT NOT NULL,
                            description TEXT,
                            level TEXT,
                            duration TEXT,
                            price INTEGER,
                            thumbnail_url TEXT,
                            syllabus TEXT,
                            is_active BOOLEAN DEFAULT 1
                        )
                    """)
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS course_enrollments (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            course_id TEXT NOT NULL,
                            student_name TEXT NOT NULL,
                            email TEXT NOT NULL,
                            phone TEXT NOT NULL,
                            note TEXT,
                            payment_status TEXT DEFAULT 'PENDING',
                            created_at TEXT NOT NULL
                        )
                    """)
                    # Check seed
                    cur = conn.cursor()
                    cur.execute("SELECT COUNT(*) FROM courses")
                    if cur.fetchone()[0] == 0:
                        for c in SEED_COURSES:
                            cur.execute("""
                                INSERT INTO courses (id, slug, title, instructor, description, level, duration, price, thumbnail_url, syllabus, is_active)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                            """, (
                                c["id"], c["slug"], c["title"], c["instructor"], c["description"],
                                c["level"], c["duration"], c["price"], c["thumbnail_url"], json.dumps(c["syllabus"])
                            ))
            finally:
                conn.close()
        except Exception as e:
            logger.warning(f"Could not init SQLite courses tables: {e}")

    def list_courses(self, level: Optional[str] = None) -> List[Course]:
        try:
            conn = _get_courses_conn()
            try:
                cur = conn.cursor()
                query = "SELECT id, slug, title, instructor, description, level, duration, price, thumbnail_url, syllabus, is_active FROM courses WHERE is_active = 1"
                params = []
                if level:
                    query += " AND level = ?"
                    params.append(level)
                cur.execute(query, tuple(params))
                rows = cur.fetchall()
                result = []
                for r in rows:
                    d = dict(r)
                    if d.get("syllabus") and isinstance(d["syllabus"], str):
                        try:
                            d["syllabus"] = json.loads(d["syllabus"])
                        except Exception:
                            d["syllabus"] = []
                    result.append(Course.from_dict(d))
                return result
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error querying courses from SQLite: {e}")
            res = list(self._in_memory_courses.values())
            if level:
                res = [c for c in res if c.level == level]
            return res

    def get_course(self, identifier: str) -> Optional[Course]:
        try:
            conn = _get_courses_conn()
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, slug, title, instructor, description, level, duration, price, thumbnail_url, syllabus, is_active
                    FROM courses WHERE (id = ? OR slug = ?) AND is_active = 1
                """, (identifier, identifier))
                row = cur.fetchone()
                if not row:
                    return self._in_memory_courses.get(identifier)
                d = dict(row)
                if d.get("syllabus") and isinstance(d["syllabus"], str):
                    try:
                        d["syllabus"] = json.loads(d["syllabus"])
                    except Exception:
                        d["syllabus"] = []
                return Course.from_dict(d)
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error getting course: {e}")
            return self._in_memory_courses.get(identifier)

    def save_enrollment(self, data: Dict[str, Any]) -> int:
        now = datetime.utcnow().isoformat()
        try:
            conn = _get_courses_conn()
            try:
                with conn:
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO course_enrollments (course_id, student_name, email, phone, note, payment_status, created_at)
                        VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
                    """, (
                        str(data.get("course_id", "")),
                        str(data.get("student_name", "")),
                        str(data.get("email", "")),
                        str(data.get("phone", "")),
                        str(data.get("note", "")),
                        now
                    ))
                    return cur.lastrowid
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error saving enrollment to SQLite: {e}")
            rec = {
                "id": len(self._in_memory_enrollments) + 1,
                "course_id": data.get("course_id"),
                "student_name": data.get("student_name"),
                "email": data.get("email"),
                "phone": data.get("phone"),
                "note": data.get("note"),
                "payment_status": "PENDING",
                "created_at": now
            }
            self._in_memory_enrollments.append(rec)
            return rec["id"]
