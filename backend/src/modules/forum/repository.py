# -*- coding: utf-8 -*-
"""
Repository for Forum module.
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from core.config import DATABASE_MODE
from core.db import get_connection
from core.db_manager import DatabaseManager
from .models import ForumTopic, ForumReply

logger = logging.getLogger(__name__)

_db_manager = DatabaseManager()

def _get_community_conn():
    if DATABASE_MODE == "modular":
        return _db_manager.get_community_connection()
    return get_connection()

FORUM_CATEGORIES = [
    {"id": "luan-giai", "name": "Luận Giải Lá Số", "description": "Khu vực chia sẻ và nhờ luận giải các cách cục lá số Tử Vi Đẩu Số"},
    {"id": "kien-thuc", "name": "Kiến Thức Tử Vi", "description": "Nghiên cứu nguyên lý an sao, chính tinh, bàng tinh và lý luận học thuật"},
    {"id": "phong-thuy", "name": "Phong Thủy Thực Chiến", "description": "Hỏi đáp bố trí nhà cửa, La Kinh Bát Trạch và xử lý thế phạm"},
    {"id": "giao-luu", "name": "Giao Lưu Hỏi Đáp", "description": "Giao lưu đạo hữu, thảo luận học thuật Đông phương"}
]

SEED_TOPICS = [
    {
        "id": 1,
        "category": "luan-giai",
        "title": "Nhờ các cao nhân luận giải cách cục Tử Phủ Vũ Tướng tại Thân",
        "author_name": "Minh Tâm",
        "content": "Kính nhờ quý thầy và đạo hữu xem giúp lá số Tử Phủ đồng cung tại Thân hội Tả Hữu Xương Khúc, công danh hậu vận thế nào ạ?",
        "chart_code": "NVH-89337816",
        "view_count": 128,
        "reply_count": 2,
        "created_at": "2026-10-15T08:30:00Z"
    },
    {
        "id": 2,
        "category": "kien-thuc",
        "title": "Bàn về vai trò của Hóa Kỵ: Hung tinh hay Động lực kích phát?",
        "author_name": "Hồng Ân",
        "content": "Trong Khâm Thiên Giám, Hóa Kỵ là căn nguyên của Nghiệp lực và biến động. Liệu Hóa Kỵ đắc cách có thể mang lại đại tài?",
        "chart_code": None,
        "view_count": 256,
        "reply_count": 4,
        "created_at": "2026-10-16T14:20:00Z"
    }
]


class ForumRepository:
    def __init__(self):
        self._in_memory_topics = {t["id"]: t for t in SEED_TOPICS}
        self._in_memory_replies: List[Dict[str, Any]] = [
            {"id": 1, "topic_id": 1, "author_name": "Đạo Hữu Tuệ Quang", "content": "Tử Phủ giáp tả hữu là đại cách, hậu vận công danh rất vững.", "created_at": "2026-10-15T09:10:00Z"},
            {"id": 2, "topic_id": 1, "author_name": "Minh Tâm", "content": "Dạ con xin cảm ơn thầy ạ!", "created_at": "2026-10-15T10:00:00Z"}
        ]
        self._init_tables()

    def _init_tables(self):
        try:
            conn = _get_community_conn()
            try:
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS forum_topics (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            category TEXT NOT NULL,
                            title TEXT NOT NULL,
                            author_name TEXT NOT NULL,
                            author_id INTEGER,
                            chart_code TEXT,
                            content TEXT NOT NULL,
                            view_count INTEGER DEFAULT 0,
                            reply_count INTEGER DEFAULT 0,
                            created_at TEXT NOT NULL,
                            updated_at TEXT NOT NULL
                        )
                    """)
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS forum_replies (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            topic_id INTEGER NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
                            author_name TEXT NOT NULL,
                            author_id INTEGER,
                            content TEXT NOT NULL,
                            created_at TEXT NOT NULL
                        )
                    """)
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_forum_topics_cat ON forum_topics(category)")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON forum_replies(topic_id)")

                    cur = conn.cursor()
                    cur.execute("SELECT COUNT(*) FROM forum_topics")
                    if cur.fetchone()[0] == 0:
                        for t in SEED_TOPICS:
                            cur.execute("""
                                INSERT INTO forum_topics (id, category, title, author_name, chart_code, content, view_count, reply_count, created_at, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                t["id"], t["category"], t["title"], t["author_name"], t.get("chart_code"),
                                t["content"], t["view_count"], t["reply_count"], t["created_at"], t["created_at"]
                            ))
                        for r in self._in_memory_replies:
                            cur.execute("""
                                INSERT INTO forum_replies (id, topic_id, author_name, content, created_at)
                                VALUES (?, ?, ?, ?, ?)
                            """, (r["id"], r["topic_id"], r["author_name"], r["content"], r["created_at"]))
            finally:
                conn.close()
        except Exception as e:
            logger.warning(f"Could not init forum SQLite tables: {e}")

    def list_topics(self, category: Optional[str] = None, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        try:
            conn = _get_community_conn()
            try:
                cur = conn.cursor()
                query = "SELECT id, category, title, author_name, author_id, chart_code, content, view_count, reply_count, created_at, updated_at FROM forum_topics"
                params = []
                if category and category != "all":
                    query += " WHERE category = ?"
                    params.append(category)
                query += " ORDER BY id DESC LIMIT ? OFFSET ?"
                params.extend([limit, offset])
                cur.execute(query, tuple(params))
                return [dict(r) for r in cur.fetchall()]
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error listing forum topics from SQLite: {e}")
            items = list(self._in_memory_topics.values())
            if category and category != "all":
                items = [i for i in items if i.get("category") == category]
            return items[offset:offset + limit]

    def get_topic(self, topic_id: int) -> Optional[Dict[str, Any]]:
        try:
            conn = _get_community_conn()
            try:
                cur = conn.cursor()
                cur.execute("UPDATE forum_topics SET view_count = view_count + 1 WHERE id = ?", (topic_id,))
                conn.commit()
                cur.execute("""
                    SELECT id, category, title, author_name, author_id, chart_code, content, view_count, reply_count, created_at, updated_at
                    FROM forum_topics WHERE id = ?
                """, (topic_id,))
                row = cur.fetchone()
                if not row:
                    return None
                t_dict = dict(row)
                cur.execute("""
                    SELECT id, topic_id, author_name, author_id, content, created_at
                    FROM forum_replies WHERE topic_id = ? ORDER BY id ASC
                """, (topic_id,))
                t_dict["replies"] = [dict(r) for r in cur.fetchall()]
                return t_dict
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error getting topic from SQLite: {e}")
            t = self._in_memory_topics.get(topic_id)
            if t:
                t = dict(t)
                t["replies"] = [r for r in self._in_memory_replies if r["topic_id"] == topic_id]
            return t

    def create_topic(self, data: Dict[str, Any]) -> int:
        now = datetime.utcnow().isoformat()
        try:
            conn = _get_community_conn()
            try:
                with conn:
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO forum_topics (category, title, author_name, author_id, chart_code, content, view_count, reply_count, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
                    """, (
                        data.get("category", "luan-giai"),
                        data.get("title", ""),
                        data.get("author_name", "Ẩn danh"),
                        data.get("author_id"),
                        data.get("chart_code"),
                        data.get("content", ""),
                        now, now
                    ))
                    return cur.lastrowid
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error creating forum topic in SQLite: {e}")
            new_id = len(self._in_memory_topics) + 1
            rec = {
                "id": new_id,
                "category": data.get("category", "luan-giai"),
                "title": data.get("title", ""),
                "author_name": data.get("author_name", "Ẩn danh"),
                "author_id": data.get("author_id"),
                "chart_code": data.get("chart_code"),
                "content": data.get("content", ""),
                "view_count": 0,
                "reply_count": 0,
                "created_at": now,
                "updated_at": now
            }
            self._in_memory_topics[new_id] = rec
            return new_id

    def add_reply(self, topic_id: int, data: Dict[str, Any]) -> int:
        now = datetime.utcnow().isoformat()
        try:
            conn = _get_community_conn()
            try:
                with conn:
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO forum_replies (topic_id, author_name, author_id, content, created_at)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        topic_id,
                        data.get("author_name", "Ẩn danh"),
                        data.get("author_id"),
                        data.get("content", ""),
                        now
                    ))
                    rep_id = cur.lastrowid
                    cur.execute("UPDATE forum_topics SET reply_count = reply_count + 1, updated_at = ? WHERE id = ?", (now, topic_id))
                    return rep_id
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error adding reply in SQLite: {e}")
            rep_id = len(self._in_memory_replies) + 1
            self._in_memory_replies.append({
                "id": rep_id,
                "topic_id": topic_id,
                "author_name": data.get("author_name", "Ẩn danh"),
                "author_id": data.get("author_id"),
                "content": data.get("content", ""),
                "created_at": now
            })
            if topic_id in self._in_memory_topics:
                self._in_memory_topics[topic_id]["reply_count"] += 1
            return rep_id
