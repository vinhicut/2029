# -*- coding: utf-8 -*-
"""
Repository for Articles module.
"""

import base64
import json
import logging
import os
import re
import sqlite3
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from core.config import ARTICLE_IMAGE_DIR, DATABASE_MODE
from core.db import get_connection
from core.db_manager import DatabaseManager
from .models import Article

logger = logging.getLogger(__name__)

_db_manager = DatabaseManager()

def _get_articles_conn():
    if DATABASE_MODE == "modular":
        return _db_manager.get_articles_connection()
    return get_connection()

SEED_ARTICLES = [
    {
        "slug": "thien-tuong",
        "title": "KHÂM THIÊN GIÁM TỬ VI ĐẨU SỐ – THIÊN TƯỚNG",
        "category": "Tử Vi",
        "author": "Tử Vi Việt Nam",
        "date": "27/09/2026",
        "excerpt": "Thiên Tướng là một trong 14 chính tinh của Tử Vi Đẩu Số. Trong hệ thống Khâm Thiên Giám, Thiên Tướng mang tính chất của một vị tinh có vai trò phụ tá, bảo hộ, điều hòa và giữ gìn trật tự.",
        "content_html": "<p>Thiên Tướng là một trong những chính tinh quan trọng trong Tử Vi Đẩu Số. Mang biểu tượng phụ tá và bảo hộ.</p>",
        "tags": ["Chính tinh", "Khâm Thiên Giám", "Thiên Tướng"]
    },
    {
        "slug": "thien-giam-thai-duong",
        "title": "KHÂM THIÊN GIÁM TỬ VI ĐẨU SỐ – THÁI DƯƠNG",
        "category": "Tử Vi",
        "author": "Tử Vi Việt Nam",
        "date": "27/09/2026",
        "excerpt": "Trong hệ thống Tử Vi Đẩu Số, Thái Dương là một trong những chính tinh quan trọng, chủ về ánh sáng, công danh, địa vị, khả năng biểu đạt và tinh thần hướng ngoại.",
        "content_html": "<p>Thái Dương là đệ nhất quang minh tinh, tượng trưng cho mặt trời và trí tuệ quang minh.</p>",
        "tags": ["Chính tinh", "Khâm Thiên Giám", "Thái Dương"]
    },
    {
        "slug": "cu-mon",
        "title": "KHÂM THIÊN GIÁM TỬ VI ĐẨU SỐ – CỰ MÔN",
        "category": "Tử Vi",
        "author": "Tử Vi Việt Nam",
        "date": "27/09/2026",
        "excerpt": "Cự Môn là ám tinh chủ về khẩu tài, khả năng lập luận, phân tích sắc bén nhưng cũng mang theo thử thách về thị phi và giao tiếp ứng xử.",
        "content_html": "<p>Cự Môn là cánh cửa mở ra tri thức hoặc khép lại trong hoài nghi, chủ về ngôn ngữ và phân tích.</p>",
        "tags": ["Chính tinh", "Khâm Thiên Giám", "Cự Môn"]
    },
    {
        "slug": "thien-luong",
        "title": "KHÂM THIÊN GIÁM TỬ VI ĐẨU SỐ – THIÊN LƯƠNG",
        "category": "Tử Vi",
        "author": "Tử Vi Việt Nam",
        "date": "27/09/2026",
        "excerpt": "Thiên Lương là ấm tinh và thọ tinh, chủ về phúc hậu, sự che chở, tôn trọng đạo đức và khả năng biến nguy thành an.",
        "content_html": "<p>Thiên Lương tượng trưng cho cây rường cột, người cao niên từng trải gìn giữ kỷ cương gia tộc.</p>",
        "tags": ["Chính tinh", "Khâm Thiên Giám", "Thiên Lương"]
    },
    {
        "slug": "that-sat",
        "title": "KHÂM THIÊN GIÁM TỬ VI ĐẨU SỐ – THẤT SÁT",
        "category": "Tử Vi",
        "author": "Tử Vi Việt Nam",
        "date": "27/09/2026",
        "excerpt": "Thất Sát là chính tinh Nam Đẩu mang khí chất quyền uy, quyết đoán và hành động mạnh mẽ; biểu tượng của vị tướng tiên phong vượt qua thử thách.",
        "content_html": "<p>Thất Sát là thanh gươm của chủ soái, đại diện cho uy quyền và tinh thần dũng liệt xông pha.</p>",
        "tags": ["Chính tinh", "Khâm Thiên Giám", "Thất Sát"]
    },
    {
        "slug": "pha-quan",
        "title": "KHÂM THIÊN GIÁM TỬ VI ĐẨU SỐ – PHÁ QUÂN",
        "category": "Tử Vi",
        "author": "Tử Vi Việt Nam",
        "date": "27/09/2026",
        "excerpt": "Phá Quân là sao dũng mãnh, chủ về sự biến động, khai phá, sẵn sàng phá bỏ nếp cũ để tái thiết lập trật tự mới.",
        "content_html": "<p>Phá Quân tượng trưng cho tinh thần tiên phong mở đường, đổi mới và tái thiết lập trật tự.</p>",
        "tags": ["Chính tinh", "Khâm Thiên Giám", "Phá Quân"]
    }
]


class ArticleRepository:
    def __init__(self):
        self._in_memory_articles = {item["slug"]: Article.from_dict(item) for item in SEED_ARTICLES}
        self._init_table()

    def _init_table(self):
        try:
            conn = _get_articles_conn()
            try:
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS articles (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            slug TEXT UNIQUE NOT NULL,
                            title TEXT NOT NULL,
                            category TEXT NOT NULL DEFAULT 'Tử Vi',
                            author TEXT,
                            date TEXT,
                            excerpt TEXT DEFAULT '',
                            content_html TEXT,
                            content TEXT,
                            cover_image TEXT,
                            course_meta TEXT,
                            tags TEXT,
                            is_published BOOLEAN DEFAULT 1,
                            status TEXT NOT NULL DEFAULT 'published',
                            published_at TEXT,
                            created_at TEXT,
                            updated_at TEXT
                        )
                    """)
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category)")

                    # Seed initial articles if empty
                    cur = conn.cursor()
                    cur.execute("SELECT COUNT(*) FROM articles")
                    count = cur.fetchone()[0]
                    if count == 0:
                        now = datetime.utcnow().isoformat()
                        for a in SEED_ARTICLES:
                            cur.execute("""
                                INSERT INTO articles (slug, title, category, author, date, excerpt, content_html, tags, is_published, created_at, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                            """, (
                                a["slug"], a["title"], a["category"], a["author"], a["date"],
                                a["excerpt"], a["content_html"], json.dumps(a["tags"]), now, now
                            ))
            finally:
                conn.close()
        except Exception as e:
            logger.warning(f"Could not initialize SQLite articles table: {e}. Using in-memory fallback.")

    def list_articles(self, category: Optional[str] = None, tag: Optional[str] = None, limit: int = 20, offset: int = 0) -> List[Article]:
        try:
            conn = _get_articles_conn()
            try:
                cur = conn.cursor()
                query = "SELECT id, slug, title, category, author, date, excerpt, content_html, tags, is_published, created_at, updated_at FROM articles WHERE is_published = 1"
                params = []
                if category:
                    query += " AND category = ?"
                    params.append(category)
                if tag:
                    query += " AND tags LIKE ?"
                    params.append(f"%{tag}%")
                query += " ORDER BY id ASC LIMIT ? OFFSET ?"
                params.extend([limit, offset])

                cur.execute(query, tuple(params))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    d = dict(r)
                    if d.get("tags") and isinstance(d["tags"], str):
                        try:
                            d["tags"] = json.loads(d["tags"])
                        except Exception:
                            d["tags"] = [t.strip() for t in d["tags"].split(",") if t.strip()]
                    results.append(Article.from_dict(d))
                return results
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error querying articles from SQLite: {e}")
            items = list(self._in_memory_articles.values())
            if category:
                items = [i for i in items if i.category == category]
            return items[offset:offset + limit]

    def get_by_slug(self, slug: str) -> Optional[Article]:
        try:
            conn = _get_articles_conn()
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, slug, title, category, author, date, excerpt, content_html, tags, is_published, created_at, updated_at
                    FROM articles WHERE slug = ?
                """, (slug,))
                row = cur.fetchone()
                if not row:
                    return self._in_memory_articles.get(slug)
                d = dict(row)
                if d.get("tags") and isinstance(d["tags"], str):
                    try:
                        d["tags"] = json.loads(d["tags"])
                    except Exception:
                        d["tags"] = [t.strip() for t in d["tags"].split(",") if t.strip()]
                return Article.from_dict(d)
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error getting article by slug: {e}")
            return self._in_memory_articles.get(slug)


def article_slug(value: str) -> str:
    """Normalize Vietnamese text into a URL-safe slug up to 255 characters."""
    normalized = unicodedata.normalize("NFD", str(value or ""))
    stripped = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    stripped = stripped.replace("đ", "d").replace("Đ", "d").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", stripped).strip("-")
    return slug[:255]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize_article_row(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    if not d.get("content") and d.get("content_html"):
        d["content"] = d["content_html"]
    return d


def list_cms_articles(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """List published articles ordered by published_at DESC, id DESC."""
    clean_cat = str(category or "").strip()
    conn = _get_articles_conn()
    try:
        rows = conn.execute(
            """
            SELECT id, title, slug, excerpt, cover_image, category, course_meta, author, published_at, created_at
            FROM articles
            WHERE status = 'published' AND (? = '' OR category = ?)
            ORDER BY COALESCE(published_at, created_at) DESC, id DESC
            """,
            (clean_cat, clean_cat),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_cms_article_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch a single published article by slug with full content."""
    conn = _get_articles_conn()
    try:
        row = conn.execute(
            """
            SELECT id, title, slug, excerpt, content, content_html, cover_image, category, course_meta, author, published_at, created_at
            FROM articles
            WHERE slug = ? AND status = 'published'
            LIMIT 1
            """,
            (slug,),
        ).fetchone()
        return _serialize_article_row(row) if row else None
    finally:
        conn.close()


def list_admin_articles() -> List[Dict[str, Any]]:
    """Return all articles (draft and published) for the CMS manager."""
    conn = _get_articles_conn()
    try:
        rows = conn.execute(
            """
            SELECT id, title, slug, excerpt, content, content_html, cover_image, category, course_meta,
                   status, author, published_at, created_at, updated_at
            FROM articles
            ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
            """
        ).fetchall()
        return [_serialize_article_row(r) for r in rows]
    finally:
        conn.close()


def create_admin_article(payload: Dict[str, Any], author_name: str) -> Dict[str, Any]:
    """Create a new CMS article and return the inserted record."""
    title = str(payload.get("title") or "").strip()
    excerpt = str(payload.get("excerpt") or "").strip()
    content = str(payload.get("content") or "").strip()
    slug = article_slug(payload.get("slug") or title)
    cover_image = str(payload.get("cover_image") or "").strip() or None
    course_meta = str(payload.get("course_meta") or "").strip()[:10000] or None
    category = "Khóa học" if payload.get("category") == "Khóa học" else "Phật pháp"
    status = "published" if payload.get("status") == "published" else "draft"

    if not title or not slug or not content:
        raise ValueError("Cần nhập tiêu đề và nội dung bài viết.")
    if len(title) > 240 or len(excerpt) > 600 or len(content) > 1_000_000 or (cover_image and len(cover_image) > 1000):
        raise OverflowError("Nội dung quá dài (tối đa 1.000.000 ký tự).")

    now = _now_iso()
    published_at = now if status == "published" else None
    is_published = 1 if status == "published" else 0
    author = str(author_name or "Quản trị viên").strip()[:120]

    conn = _get_articles_conn()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO articles
                    (title, slug, excerpt, content, content_html, cover_image, category, course_meta, status, is_published, author, published_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (title, slug, excerpt, content, content, cover_image, category, course_meta, status, is_published, author, published_at, now, now),
            )
            row = conn.execute("SELECT * FROM articles WHERE id = ?", (cur.lastrowid,)).fetchone()
            return _serialize_article_row(row)
    finally:
        conn.close()


def update_admin_article(article_id: int, payload: Dict[str, Any], author_name: str) -> Optional[Dict[str, Any]]:
    """Update an existing CMS article by ID. Returns None if not found."""
    title = str(payload.get("title") or "").strip()
    excerpt = str(payload.get("excerpt") or "").strip()
    content = str(payload.get("content") or "").strip()
    slug = article_slug(payload.get("slug") or title)
    cover_image = str(payload.get("cover_image") or "").strip() or None
    course_meta = str(payload.get("course_meta") or "").strip()[:10000] or None
    category = "Khóa học" if payload.get("category") == "Khóa học" else "Phật pháp"
    status = "published" if payload.get("status") == "published" else "draft"

    if not title or not slug or not content:
        raise ValueError("Cần nhập tiêu đề và nội dung bài viết.")
    if len(title) > 240 or len(excerpt) > 600 or len(content) > 1_000_000 or (cover_image and len(cover_image) > 1000):
        raise OverflowError("Nội dung quá dài (tối đa 1.000.000 ký tự).")

    now = _now_iso()
    is_published = 1 if status == "published" else 0
    author = str(author_name or "Quản trị viên").strip()[:120]

    conn = _get_articles_conn()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE articles
                SET title = ?, slug = ?, excerpt = ?, content = ?, content_html = ?, cover_image = ?,
                    category = ?, course_meta = ?, status = ?, is_published = ?, author = ?,
                    published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE NULL END,
                    updated_at = ?
                WHERE id = ?
                """,
                (title, slug, excerpt, content, content, cover_image, category, course_meta, status, is_published, author, status, now, now, article_id),
            )
            if cur.rowcount == 0:
                return None
            row = conn.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
            return _serialize_article_row(row)
    finally:
        conn.close()


def delete_admin_article(article_id: int) -> bool:
    """Delete an article by ID."""
    conn = _get_articles_conn()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM articles WHERE id = ?", (article_id,))
            return cur.rowcount > 0
    finally:
        conn.close()


def save_article_image(image_data: str) -> str:
    """Decode a data URL image (PNG/JPG/WebP/GIF <= 5 MB), verify Magic Bytes, and return its public URL."""
    import io
    from PIL import Image

    match = re.match(r"^data:image/(png|jpeg|jpg|webp|gif);base64,([a-zA-Z0-9+/=]+)$", str(image_data or ""))
    if not match:
        raise ValueError("Chỉ hỗ trợ ảnh PNG, JPG, WebP hoặc GIF.")

    image_bytes = base64.b64decode(match.group(2), validate=True)
    if not image_bytes or len(image_bytes) > 5 * 1024 * 1024:
        raise OverflowError("Ảnh cần nhỏ hơn 5 MB.")

    # Kiểm tra Magic Bytes thực tế trước khi lưu đĩa
    magic_ok = (
        image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
        or image_bytes.startswith(b"\xff\xd8\xff")
        or (image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP")
        or image_bytes.startswith((b"GIF87a", b"GIF89a"))
    )
    if not magic_ok:
        raise ValueError("Chữ ký nhị phân (Magic Bytes) của tệp ảnh không hợp lệ.")

    try:
        probe = Image.open(io.BytesIO(image_bytes))
        probe.verify()
        fmt = (probe.format or "").upper()
        ext_map = {"PNG": "png", "JPEG": "jpg", "WEBP": "webp", "GIF": "gif"}
        if fmt not in ext_map:
            raise ValueError("Định dạng ảnh thực tế không được hỗ trợ.")
        ext = ext_map[fmt]
    except ValueError:
        raise
    except Exception:
        raise ValueError("Tệp ảnh tải lên bị hỏng hoặc giả mạo định dạng.")

    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(ARTICLE_IMAGE_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(image_bytes)
    return f"/api/article-images/{filename}"
