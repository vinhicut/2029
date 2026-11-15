# -*- coding: utf-8 -*-
"""
DatabaseManager - Trình quản lý kết nối và phân vùng cơ sở dữ liệu chuyên biệt (Modular Databases)
Dự án: Website Tử Vi Hồng Ân
Thiết kế theo chuẩn Domain-Driven Design (DDD) & SQLite ATTACH Architecture.
"""

import os
import sqlite3
import logging
from typing import Dict, Any, List, Optional
from core.config import (
    DATABASE_MODE,
    DATABASES_DIR,
    DB_AUTH_STAFF_PATH,
    DB_CUSTOMERS_PII_PATH,
    DB_CSKH_CHAT_PATH,
    DB_BILLING_PATH,
    DB_CHARTS_PATH,
    DB_AI_READINGS_PATH,
    DB_ARTICLES_PATH,
    DB_BUDDHISM_PATH,
    DB_COURSES_PATH,
    DB_COMMUNITY_PATH,
    DB_PATH
)

logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Quản lý các kết nối tới 10 cơ sở dữ liệu module độc lập.
    Hỗ trợ chế độ Dual-Mode: 'modular' (10 DB riêng biệt) hoặc 'monolithic' (tuvi.db truyền thống).
    """

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(DatabaseManager, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        os.makedirs(DATABASES_DIR, exist_ok=True)

    @staticmethod
    def _create_connection(db_path: str) -> sqlite3.Connection:
        """Tạo kết nối SQLite tối ưu hiệu năng cao với busy_timeout, NORMAL sync và Foreign Keys ON."""
        conn = sqlite3.connect(db_path, timeout=20.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout = 10000;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA temp_store = MEMORY;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    # ─────────────────────────────────────────────────────────────
    # Các hàm lấy kết nối cho từng Module CSDL chuyên biệt
    # ─────────────────────────────────────────────────────────────

    def get_auth_staff_connection(self) -> sqlite3.Connection:
        """1. CSDL Quản trị viên, Lập trình viên, Phiên admin: auth_staff.db"""
        return self._create_connection(DB_AUTH_STAFF_PATH)

    def get_customers_pii_connection(self) -> sqlite3.Connection:
        """2. CSDL Tài khoản khách hàng & PII nhạy cảm: customers_pii.db"""
        return self._create_connection(DB_CUSTOMERS_PII_PATH)

    def get_auth_users_connection(self) -> sqlite3.Connection:
        """Alias tương thích cho danh tính người dùng (trỏ tới customers_pii.db)"""
        return self.get_customers_pii_connection()

    def get_cskh_chat_connection(self) -> sqlite3.Connection:
        """3. CSDL CSKH & Tin nhắn chat website: cskh_chat.db"""
        return self._create_connection(DB_CSKH_CHAT_PATH)

    def get_billing_connection(self) -> sqlite3.Connection:
        """4. CSDL Đơn hàng & Giao dịch thanh toán: billing.db"""
        return self._create_connection(DB_BILLING_PATH)

    def get_charts_connection(self) -> sqlite3.Connection:
        """5. CSDL Tinh bàn Lá số Tử Vi & Log ảnh: charts.db"""
        return self._create_connection(DB_CHARTS_PATH)

    def get_ai_readings_connection(self) -> sqlite3.Connection:
        """6. CSDL Bài luận giải AI & Hỏi đáp chuyên sâu: ai_readings.db"""
        return self._create_connection(DB_AI_READINGS_PATH)

    def get_articles_connection(self) -> sqlite3.Connection:
        """7. CSDL Bài viết học thuật & Chuyên mục: articles_academic.db"""
        return self._create_connection(DB_ARTICLES_PATH)

    def get_buddhism_connection(self) -> sqlite3.Connection:
        """8. CSDL Phật pháp & Tĩnh tâm: buddhism.db"""
        return self._create_connection(DB_BUDDHISM_PATH)

    def get_courses_connection(self) -> sqlite3.Connection:
        """9. CSDL Khóa học đào tạo & Ghi danh: courses.db"""
        return self._create_connection(DB_COURSES_PATH)

    def get_community_connection(self) -> sqlite3.Connection:
        """10. CSDL Diễn đàn thảo luận & Shop phong thủy: community_forum.db"""
        return self._create_connection(DB_COMMUNITY_PATH)

    # ─────────────────────────────────────────────────────────────
    # Kết nối hợp nhất (Unified Connection với ATTACH DATABASE)
    # Phục vụ các câu lệnh JOIN liên bảng cho báo cáo Admin
    # ─────────────────────────────────────────────────────────────

    def get_unified_connection(self, attached_domains: Optional[List[str]] = None) -> sqlite3.Connection:
        """
        Mở kết nối tới customers_pii.db làm cơ sở và ATTACH các CSDL khác khi cần truy vấn JOIN.
        Các bí danh ATTACH khả dụng:
          - 'charts': charts.db
          - 'chat': cskh_chat.db
          - 'billing': billing.db
          - 'staff': auth_staff.db
          - 'ai': ai_readings.db
        """
        conn = self._create_connection(DB_CUSTOMERS_PII_PATH)
        domain_mapping = {
            "charts": DB_CHARTS_PATH,
            "chat": DB_CSKH_CHAT_PATH,
            "billing": DB_BILLING_PATH,
            "staff": DB_AUTH_STAFF_PATH,
            "ai": DB_AI_READINGS_PATH,
            "community": DB_COMMUNITY_PATH,
            "articles": DB_ARTICLES_PATH,
            "courses": DB_COURSES_PATH
        }

        targets = attached_domains if attached_domains is not None else ["charts", "chat", "billing", "staff", "ai"]
        for domain in targets:
            path = domain_mapping.get(domain)
            if path and os.path.exists(path):
                # Thoát đường dẫn an toàn cho câu lệnh ATTACH
                escaped_path = path.replace("'", "''")
                try:
                    conn.execute(f"ATTACH DATABASE '{escaped_path}' AS {domain};")
                except sqlite3.OperationalError as e:
                    logger.debug(f"Database {domain} already attached or error: {e}")
        return conn

    # ─────────────────────────────────────────────────────────────
    # Khởi tạo Schema cấu trúc bảng cho toàn bộ 10 CSDL
    # ─────────────────────────────────────────────────────────────

    def init_all_databases(self):
        """Khởi tạo toàn bộ cấu trúc bảng và chỉ mục cho 10 CSDL độc lập."""
        logger.info("Initializing schemas for all 10 modular databases...")

        # 1. auth_staff.db
        with self.get_auth_staff_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                admin_email TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_admin_sessions_email ON admin_sessions(admin_email);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_admin_sessions_id ON admin_sessions(session_id);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS staff_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                avatar TEXT,
                role TEXT NOT NULL DEFAULT 'manager',
                account_type TEXT NOT NULL DEFAULT 'admin',
                admin_level INTEGER NOT NULL DEFAULT 1,
                referral_code TEXT,
                referred_by_user_id INTEGER,
                created_at TEXT NOT NULL,
                last_login_at TEXT NOT NULL,
                is_busy INTEGER NOT NULL DEFAULT 0
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_staff_users_email ON staff_users(email);")

        # 2. customers_pii.db
        with self.get_customers_pii_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                avatar TEXT,
                role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'manager', 'admin')),
                account_type TEXT NOT NULL DEFAULT 'user',
                admin_level INTEGER NOT NULL DEFAULT 0,
                referral_code TEXT,
                referred_by_user_id INTEGER REFERENCES users(id),
                created_at TEXT NOT NULL,
                last_login_at TEXT NOT NULL,
                is_busy INTEGER NOT NULL DEFAULT 0,
                ai_credits INTEGER NOT NULL DEFAULT 0,
                consultation_credits INTEGER NOT NULL DEFAULT 0
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);")
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_user_id);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_activity_at TEXT NOT NULL,
                is_sandbox INTEGER NOT NULL DEFAULT 0,
                sandbox_ai_credits INTEGER NOT NULL DEFAULT 0,
                sandbox_consultation_credits INTEGER NOT NULL DEFAULT 0
            );
            """)
            session_cols = {row["name"] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()}
            if "is_sandbox" not in session_cols:
                conn.execute("ALTER TABLE sessions ADD COLUMN is_sandbox INTEGER NOT NULL DEFAULT 0;")
            if "sandbox_ai_credits" not in session_cols:
                conn.execute("ALTER TABLE sessions ADD COLUMN sandbox_ai_credits INTEGER NOT NULL DEFAULT 0;")
            if "sandbox_consultation_credits" not in session_cols:
                conn.execute("ALTER TABLE sessions ADD COLUMN sandbox_consultation_credits INTEGER NOT NULL DEFAULT 0;")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_activity ON sessions(user_id, expires_at, last_activity_at);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_sub TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                avatar_url TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                login_count INTEGER NOT NULL DEFAULT 1,
                first_login_at TEXT NOT NULL,
                last_login_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(email);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_customer_accounts_sub ON customer_accounts(google_sub);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                service TEXT,
                topic TEXT,
                preferred_date TEXT,
                message TEXT,
                type TEXT DEFAULT 'contact',
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions(created_at DESC);")

        # 3. cskh_chat.db
        with self.get_cskh_chat_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                sender_role TEXT NOT NULL CHECK(sender_role IN ('customer', 'manager')),
                sender_name TEXT NOT NULL,
                message TEXT NOT NULL,
                read_by_customer INTEGER NOT NULL DEFAULT 0,
                read_by_manager INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_customer_chat_customer_id ON customer_chat_messages(customer_id, id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_customer_chat_unread ON customer_chat_messages(sender_role, read_by_manager);")

        # 4. billing.db
        with self.get_billing_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("""
            CREATE TABLE IF NOT EXISTS billing_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_code TEXT UNIQUE NOT NULL,
                amount INTEGER NOT NULL,
                description TEXT,
                service_type TEXT NOT NULL DEFAULT 'consultation',
                user_id TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
                qr_url TEXT,
                is_sandbox INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                paid_at TEXT
            );
            """)
            order_cols = {row["name"] for row in conn.execute("PRAGMA table_info(billing_orders)").fetchall()}
            if "is_sandbox" not in order_cols:
                conn.execute("ALTER TABLE billing_orders ADD COLUMN is_sandbox INTEGER NOT NULL DEFAULT 0;")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_orders_code ON billing_orders(order_code);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_orders_status ON billing_orders(status);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_orders_user_id ON billing_orders(user_id, created_at DESC);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_orders_sandbox ON billing_orders(is_sandbox);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS billing_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sepay_id INTEGER UNIQUE,
                gateway TEXT,
                transaction_date TEXT,
                account_number TEXT,
                order_code TEXT,
                transfer_type TEXT,
                transfer_amount INTEGER,
                reference_code TEXT,
                raw_payload TEXT,
                is_sandbox INTEGER NOT NULL DEFAULT 0,
                processed_at TEXT NOT NULL
            );
            """)
            tx_cols = {row["name"] for row in conn.execute("PRAGMA table_info(billing_transactions)").fetchall()}
            if "is_sandbox" not in tx_cols:
                conn.execute("ALTER TABLE billing_transactions ADD COLUMN is_sandbox INTEGER NOT NULL DEFAULT 0;")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_transactions_sepay_id ON billing_transactions(sepay_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_transactions_order_code ON billing_transactions(order_code);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_transactions_sandbox ON billing_transactions(is_sandbox);")

        # 5. charts.db
        with self.get_charts_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
            # Lưu ý: Cột reading_markdown được tách sang ai_readings.db
            conn.execute("""
            CREATE TABLE IF NOT EXISTS user_charts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chart_code TEXT NOT NULL,
                ho_ten TEXT NOT NULL,
                gioi_tinh TEXT NOT NULL,
                ngay_sinh INTEGER NOT NULL,
                thang_sinh INTEGER NOT NULL,
                nam_sinh INTEGER NOT NULL,
                gio_sinh INTEGER NOT NULL,
                phut_sinh INTEGER NOT NULL,
                loai_lich TEXT NOT NULL,
                thang_nhuan INTEGER NOT NULL DEFAULT 0,
                nam_xem_han INTEGER NOT NULL,
                input_data TEXT NOT NULL,
                chart_data TEXT NOT NULL,
                created_by_admin_test INTEGER DEFAULT 0,
                admin_session_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_user_charts_latest ON user_charts(user_id, updated_at DESC);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_user_charts_code ON user_charts(chart_code);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_chart_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL DEFAULT '',
                chart_code TEXT NOT NULL,
                birth_input TEXT NOT NULL,
                image_path TEXT,
                created_at TEXT NOT NULL
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_customer_chart_logs_created_at ON customer_chart_logs(created_at DESC);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_customer_chart_logs_customer_id ON customer_chart_logs(customer_id);")

        # 6. ai_readings.db
        with self.get_ai_readings_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("""
            CREATE TABLE IF NOT EXISTS chart_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chart_code TEXT NOT NULL,
                user_id INTEGER NOT NULL DEFAULT 0,
                reading_markdown TEXT NOT NULL,
                model_name TEXT DEFAULT 'gemini-3.8-flash',
                thinking_level TEXT DEFAULT 'LOW',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, chart_code)
            );
            """)
            table_sql_row = conn.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='chart_readings'"
            ).fetchone()
            if table_sql_row and "chart_code text unique" in (table_sql_row["sql"] or "").lower():
                conn.execute("ALTER TABLE chart_readings RENAME TO chart_readings_legacy;")
                conn.execute("""
                CREATE TABLE chart_readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chart_code TEXT NOT NULL,
                    user_id INTEGER NOT NULL DEFAULT 0,
                    reading_markdown TEXT NOT NULL,
                    model_name TEXT DEFAULT 'gemini-3.8-flash',
                    thinking_level TEXT DEFAULT 'LOW',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(user_id, chart_code)
                );
                """)
                conn.execute("""
                INSERT OR IGNORE INTO chart_readings
                    (id, chart_code, user_id, reading_markdown, model_name, thinking_level, created_at, updated_at)
                SELECT id, chart_code, COALESCE(user_id, 0), reading_markdown, model_name, thinking_level, created_at, updated_at
                FROM chart_readings_legacy;
                """)
                conn.execute("DROP TABLE chart_readings_legacy;")

            conn.execute("CREATE INDEX IF NOT EXISTS idx_chart_readings_code ON chart_readings(chart_code);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_chart_readings_user ON chart_readings(user_id);")
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_chart_readings_user_code ON chart_readings(user_id, chart_code);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_qa_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                chart_code TEXT NOT NULL,
                user_id INTEGER,
                messages TEXT NOT NULL,
                total_tokens INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_qa_chart ON ai_qa_sessions(chart_code);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_qa_user_chart ON ai_qa_sessions(user_id, chart_code);")

        # 7. articles_academic.db
        with self.get_articles_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
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
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);")
            article_cols = {
                row["name"] for row in conn.execute("PRAGMA table_info(articles);").fetchall()
            }
            for col_name, col_def in (
                ("content", "TEXT"),
                ("cover_image", "TEXT"),
                ("course_meta", "TEXT"),
                ("status", "TEXT NOT NULL DEFAULT 'published'"),
                ("published_at", "TEXT"),
            ):
                if col_name not in article_cols:
                    conn.execute(f"ALTER TABLE articles ADD COLUMN {col_name} {col_def};")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles(status, published_at);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);")

        # 8. buddhism.db
        with self.get_buddhism_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("""
            CREATE TABLE IF NOT EXISTS buddhism_articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'Phật pháp',
                author TEXT DEFAULT 'Tử Vi Hồng Ân',
                excerpt TEXT DEFAULT '',
                content TEXT,
                content_html TEXT,
                cover_image TEXT,
                status TEXT NOT NULL DEFAULT 'published',
                published_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_buddhism_slug ON buddhism_articles(slug);")

        # 9. courses.db
        with self.get_courses_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
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
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);")

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
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_enrollments_course ON course_enrollments(course_id);")

        # 10. community_forum.db
        with self.get_community_connection() as conn:
            conn.execute("PRAGMA journal_mode = WAL;")
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
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_forum_topics_cat ON forum_topics(category);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS forum_replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id INTEGER NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
                author_name TEXT NOT NULL,
                author_id INTEGER,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON forum_replies(topic_id);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS shop_products (
                id TEXT PRIMARY KEY,
                sku TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price INTEGER NOT NULL,
                original_price INTEGER,
                description TEXT,
                images TEXT,
                stock INTEGER DEFAULT 100,
                is_active BOOLEAN DEFAULT 1
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_shop_products_sku ON shop_products(sku);")

            conn.execute("""
            CREATE TABLE IF NOT EXISTS shop_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_code TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                customer_address TEXT NOT NULL,
                items TEXT NOT NULL,
                total_amount INTEGER NOT NULL,
                payment_method TEXT DEFAULT 'VIETQR',
                billing_order_id TEXT,
                status TEXT DEFAULT 'PENDING',
                created_at TEXT NOT NULL
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_shop_orders_code ON shop_orders(order_code);")

        logger.info("All 10 modular database schemas initialized successfully.")
