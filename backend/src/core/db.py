import sqlite3
import json
import secrets
import datetime
from typing import Optional, Dict, Any, List, Tuple
from core.config import DB_PATH, SUPER_ADMIN_EMAILS, DATABASE_MODE
import core.firebase_db as firebase_db
from core.db_manager import DatabaseManager

ONLINE_WINDOW_SECONDS = 120

# Flag to indicate if Firebase is active
FIREBASE_ACTIVE = False

# Database Manager singleton for modular databases
_db_manager = DatabaseManager()

def is_modular() -> bool:
    """Kiểm tra hệ thống đang chạy ở chế độ modular (10 CSDL riêng) hay monolithic (tuvi.db)."""
    return DATABASE_MODE == "modular"

def get_connection() -> sqlite3.Connection:
    """
    Tạo kết nối SQLite an toàn, tối ưu hiệu năng cao với Row factory.
    Mặc định trỏ về tuvi.db để duy trì tính tương thích ngược tuyệt đối.
    """
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 10000;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA temp_store = MEMORY;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Khởi tạo cấu trúc các bảng cơ sở dữ liệu nếu chưa tồn tại. Đồng thời thử kết nối Firebase."""
    global FIREBASE_ACTIVE
    FIREBASE_ACTIVE = firebase_db.init_firebase()

    # Nếu đang ở chế độ modular, khởi tạo cấu trúc cho toàn bộ 10 CSDL độc lập
    if is_modular():
        try:
            _db_manager.init_all_databases()
        except Exception as e:
            print("Lỗi khởi tạo modular databases:", e)

    # Đồng thời luôn đảm bảo tuvi.db sẵn sàng cho kịch bản fallback hoặc monolithic
    conn = get_connection()
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
        with conn:
            # 1. Bảng người dùng
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

            user_columns = {row['name'] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
            if 'account_type' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'user'")
            if 'admin_level' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN admin_level INTEGER NOT NULL DEFAULT 0")
            if 'referral_code' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN referral_code TEXT")
            if 'referred_by_user_id' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN referred_by_user_id INTEGER REFERENCES users(id) DEFAULT NULL")
            if 'is_busy' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN is_busy INTEGER NOT NULL DEFAULT 0")
            if 'ai_credits' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN ai_credits INTEGER NOT NULL DEFAULT 0")
            if 'consultation_credits' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN consultation_credits INTEGER NOT NULL DEFAULT 0")
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL")
            admin_placeholders = ','.join('?' for _ in SUPER_ADMIN_EMAILS) or "''"
            conn.execute(f"UPDATE users SET account_type = 'admin', admin_level = CASE WHEN lower(email) IN ({admin_placeholders}) THEN 1 ELSE 2 END WHERE role = 'manager' AND account_type = 'user'", SUPER_ADMIN_EMAILS)
            conn.execute("UPDATE users SET role = 'manager' WHERE account_type = 'admin'")

            conn.execute("UPDATE users SET role = CASE WHEN account_type = 'admin' THEN 'manager' ELSE 'user' END WHERE role = 'developer'")
            conn.execute("DELETE FROM users WHERE google_id = 'developer_super_account' OR lower(email) = 'developer@tuvihongan.local'")

            # 2. Bảng phiên đăng nhập (Sessions)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_activity_at TEXT NOT NULL
            );
            """)
            session_columns = {row['name'] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()}
            if 'last_activity_at' not in session_columns:
                conn.execute("ALTER TABLE sessions ADD COLUMN last_activity_at TEXT")
                conn.execute("UPDATE sessions SET last_activity_at = created_at WHERE last_activity_at IS NULL")
            if 'is_sandbox' not in session_columns:
                conn.execute("ALTER TABLE sessions ADD COLUMN is_sandbox INTEGER NOT NULL DEFAULT 0")
            if 'sandbox_ai_credits' not in session_columns:
                conn.execute("ALTER TABLE sessions ADD COLUMN sandbox_ai_credits INTEGER NOT NULL DEFAULT 0")
            if 'sandbox_consultation_credits' not in session_columns:
                conn.execute("ALTER TABLE sessions ADD COLUMN sandbox_consultation_credits INTEGER NOT NULL DEFAULT 0")
            conn.execute("DELETE FROM sessions WHERE token LIKE 'dev_%' OR token = 'test_dev_token_verify_888'")

            # 3. Bảng lá số người dùng
            conn.execute("""
            CREATE TABLE IF NOT EXISTS user_charts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
                reading_markdown TEXT,
                created_by_admin_test INTEGER DEFAULT 0,
                admin_session_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)

            chart_cols = {row['name'] for row in conn.execute("PRAGMA table_info(user_charts)").fetchall()}
            if 'reading_markdown' not in chart_cols:
                conn.execute("ALTER TABLE user_charts ADD COLUMN reading_markdown TEXT DEFAULT NULL;")
            if 'created_by_admin_test' not in chart_cols:
                conn.execute("ALTER TABLE user_charts ADD COLUMN created_by_admin_test INTEGER DEFAULT 0;")
            if 'admin_session_id' not in chart_cols:
                conn.execute("ALTER TABLE user_charts ADD COLUMN admin_session_id TEXT DEFAULT NULL;")

            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_user_charts_latest ON user_charts(user_id, updated_at DESC);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_user_charts_code ON user_charts(chart_code);")

            # 4. Bảng tài khoản khách hàng
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
            conn.execute("DELETE FROM customer_accounts WHERE google_sub = 'developer_super_account' OR lower(email) = 'developer@tuvihongan.local'")

            existing_ca_count = conn.execute("SELECT COUNT(*) FROM customer_accounts").fetchone()[0]
            if existing_ca_count == 0:
                conn.execute("""
                    INSERT OR IGNORE INTO customer_accounts
                        (google_sub, email, display_name, avatar_url, role, login_count, first_login_at, last_login_at, created_at, updated_at)
                    SELECT
                        google_id, lower(email), name, avatar,
                        CASE WHEN role IN ('manager', 'admin') THEN 'manager' ELSE 'user' END,
                        1, created_at, last_login_at, created_at, last_login_at
                    FROM users
                    WHERE google_id NOT LIKE 'pending:%'
                """)

            # 5. Bảng nhật ký lá số khách hàng
            conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_chart_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER REFERENCES customer_accounts(id) ON DELETE SET NULL,
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

            # 6. Bảng tin nhắn chat
            conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
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

            # 7. Bảng bài viết CMS
            conn.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'Phật pháp',
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
            article_cols = {row['name'] for row in conn.execute("PRAGMA table_info(articles)").fetchall()}
            if 'content' not in article_cols:
                conn.execute("ALTER TABLE articles ADD COLUMN content TEXT")
                conn.execute("UPDATE articles SET content = content_html WHERE content IS NULL AND content_html IS NOT NULL")
            if 'cover_image' not in article_cols:
                conn.execute("ALTER TABLE articles ADD COLUMN cover_image TEXT")
            if 'course_meta' not in article_cols:
                conn.execute("ALTER TABLE articles ADD COLUMN course_meta TEXT")
            if 'status' not in article_cols:
                conn.execute("ALTER TABLE articles ADD COLUMN status TEXT NOT NULL DEFAULT 'published'")
                conn.execute("UPDATE articles SET status = CASE WHEN is_published = 1 THEN 'published' ELSE 'draft' END")
            if 'published_at' not in article_cols:
                conn.execute("ALTER TABLE articles ADD COLUMN published_at TEXT")
                conn.execute("UPDATE articles SET published_at = created_at WHERE status = 'published' AND published_at IS NULL")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles(status, published_at);")
    finally:
        conn.close()

# ----------------- User Queries -----------------

def _new_referral_code() -> str:
    return secrets.token_urlsafe(7).replace('-', '').replace('_', '').upper()[:9]

def upsert_user(google_id: str, email: str, name: str, avatar: Optional[str], role: str = 'user', referral_code: Optional[str] = None) -> Dict[str, Any]:
    """Tạo mới hoặc cập nhật người dùng khi đăng nhập Google SSO."""
    if FIREBASE_ACTIVE:
        return firebase_db.upsert_user(google_id, email, name, avatar, role, referral_code)

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE google_id = ? OR email = ?", (google_id, email))
            existing = cur.fetchone()

            if existing:
                final_role = existing['role'] if existing['role'] == 'manager' else role
                account_type = existing['account_type']
                admin_level = existing['admin_level']
                if role == 'manager' and account_type != 'admin':
                    account_type, admin_level = 'admin', 2
                if email.lower() in SUPER_ADMIN_EMAILS:
                    final_role, account_type, admin_level = 'manager', 'admin', 1
                referred_by_user_id = existing['referred_by_user_id']
                if not referred_by_user_id and referral_code:
                    cur.execute("SELECT id FROM users WHERE upper(referral_code) = upper(?) AND account_type = 'collaborator'", (referral_code.strip(),))
                    referrer = cur.fetchone()
                    referred_by_user_id = referrer['id'] if referrer and str(referrer['id']) != str(existing['id']) else None
                cur.execute("""
                    UPDATE users
                    SET google_id = ?, email = ?, name = ?, avatar = ?, role = ?, account_type = ?, admin_level = ?, referred_by_user_id = ?, last_login_at = ?
                    WHERE id = ?
                """, (google_id, email, name, avatar, final_role, account_type, admin_level, referred_by_user_id, now_str, existing['id']))
                user_id = existing['id']
            else:
                account_type = 'admin' if role == 'manager' or email.lower() in SUPER_ADMIN_EMAILS else 'user'
                admin_level = 1 if email.lower() in SUPER_ADMIN_EMAILS else (2 if account_type == 'admin' else 0)
                final_role = 'manager' if account_type == 'admin' else 'user'
                referred_by_user_id = None
                if referral_code:
                    cur.execute("SELECT id FROM users WHERE upper(referral_code) = upper(?) AND account_type = 'collaborator'", (referral_code.strip(),))
                    referrer = cur.fetchone()
                    if referrer:
                        referred_by_user_id = referrer['id']
                referral_code_for_user = _new_referral_code() if account_type == 'collaborator' else None
                cur.execute("""
                    INSERT INTO users (google_id, email, name, avatar, role, account_type, admin_level, referral_code, referred_by_user_id, created_at, last_login_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (google_id, email, name, avatar, final_role, account_type, admin_level, referral_code_for_user, referred_by_user_id, now_str, now_str))
                user_id = cur.lastrowid

            cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cur.fetchone()
            return dict(row)
    finally:
        conn.close()

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.get_user_by_id(str(user_id))
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def set_user_busy(user_id: Any, is_busy: bool) -> Optional[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.set_user_busy(str(user_id), is_busy)
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("UPDATE users SET is_busy = ? WHERE id = ?", (1 if is_busy else 0, user_id))
            if not cur.rowcount:
                return None
            cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()

def get_public_admin_presence(emails: List[str]) -> Dict[str, Dict[str, bool]]:
    """Return only presence flags for the configured public consultation accounts."""
    clean_emails = [str(email).strip().lower() for email in emails if str(email).strip()]
    if FIREBASE_ACTIVE:
        return firebase_db.get_public_admin_presence(clean_emails)
    if not clean_emails:
        return {}
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    placeholders = ','.join('?' for _ in clean_emails)
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        rows = conn.execute(f"""
            SELECT lower(u.email) AS email, COALESCE(u.is_busy, 0) AS is_busy,
                   EXISTS (
                       SELECT 1 FROM sessions s
                       WHERE s.user_id = u.id
                         AND s.expires_at > ?
                         AND s.last_activity_at > datetime('now', '-120 seconds')
                   ) AS is_online
            FROM users u
            WHERE lower(u.email) IN ({placeholders})
        """, [now_str, *clean_emails]).fetchall()
        return {row['email']: {'is_online': bool(row['is_online']), 'is_busy': bool(row['is_busy'])} for row in rows}
    finally:
        conn.close()

# ----------------- Session Queries -----------------

def create_session(user_id: int, token: str, days: int = 30) -> Dict[str, Any]:
    if FIREBASE_ACTIVE:
        return firebase_db.create_session(str(user_id), token, days)

    now = datetime.datetime.now(datetime.timezone.utc)
    now_str = now.isoformat()
    exp_str = (now + datetime.timedelta(days=days)).isoformat()

    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO sessions (user_id, token, expires_at, created_at, last_activity_at)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, token, exp_str, now_str, now_str))
            return {"user_id": user_id, "token": token, "expires_at": exp_str}
    finally:
        conn.close()

def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.get_user_by_token(token)

    now = datetime.datetime.now(datetime.timezone.utc)
    now_str = now.isoformat()
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT u.*,
                   s.id AS _session_id,
                   s.last_activity_at AS _last_activity_at,
                   COALESCE(s.is_sandbox, 0) AS _session_is_sandbox,
                   COALESCE(s.sandbox_ai_credits, 0) AS _sandbox_ai_credits,
                   COALESCE(s.sandbox_consultation_credits, 0) AS _sandbox_consultation_credits
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
        """, (token, now_str))
        row = cur.fetchone()
        if not row:
            return None

        user_dict = dict(row)
        session_id = user_dict.pop("_session_id", None)
        last_act_raw = user_dict.pop("_last_activity_at", None)
        user_dict["is_sandbox"] = bool(user_dict.pop("_session_is_sandbox", 0))
        user_dict["sandbox_ai_credits"] = int(user_dict.pop("_sandbox_ai_credits", 0) or 0)
        user_dict["sandbox_consultation_credits"] = int(user_dict.pop("_sandbox_consultation_credits", 0) or 0)

        # Debounce ghi last_activity_at: chỉ cập nhật tối đa 1 lần / 60 giây để tránh write-lock dưới tải 1.000 CCU
        should_update = True
        if last_act_raw:
            try:
                last_dt = datetime.datetime.fromisoformat(str(last_act_raw))
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=datetime.timezone.utc)
                if (now - last_dt).total_seconds() < 60:
                    should_update = False
            except Exception:
                pass

        if should_update and session_id is not None:
            try:
                with conn:
                    conn.execute("UPDATE sessions SET last_activity_at = ? WHERE id = ?", (now_str, session_id))
            except Exception:
                pass

        return user_dict
    finally:
        conn.close()

def delete_session(token: str) -> bool:
    if FIREBASE_ACTIVE:
        return firebase_db.delete_session(token)

    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM sessions WHERE token = ?", (token,))
            return cur.rowcount > 0
    finally:
        conn.close()

def set_session_sandbox_mode(token: str, enabled: bool) -> Optional[Dict[str, Any]]:
    """Bật/tắt chế độ giả lập (Sandbox Mode) trong phạm vi phiên làm việc hiện tại; luôn khởi tạo số dư sandbox = 0."""
    if not token or FIREBASE_ACTIVE:
        return None
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("""
                UPDATE sessions
                SET is_sandbox = ?,
                    sandbox_ai_credits = 0,
                    sandbox_consultation_credits = 0
                WHERE token = ? AND expires_at > ?
            """, (1 if enabled else 0, token, now_str))
            if cur.rowcount == 0:
                return None
        return {
            "is_sandbox": bool(enabled),
            "sandbox_ai_credits": 0,
            "sandbox_consultation_credits": 0,
        }
    finally:
        conn.close()

def add_session_sandbox_credits(token: str, service_type: str, credits: int = 1) -> Tuple[bool, int]:
    """Cộng lượt dịch vụ giả lập vào phiên Sandbox (tách biệt hoàn toàn khỏi bảng users thực)."""
    if not token or FIREBASE_ACTIVE:
        return False, 0
    col = "sandbox_consultation_credits" if service_type == "consultation" else "sandbox_ai_credits"
    delta = max(0, int(credits))
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE sessions SET {col} = COALESCE({col}, 0) + ? WHERE token = ? AND is_sandbox = 1 AND expires_at > ?",
                (delta, token, now_str)
            )
            if cur.rowcount == 0:
                return False, 0
            cur.execute(f"SELECT {col} FROM sessions WHERE token = ?", (token,))
            row = cur.fetchone()
            return True, int(row[col] if row else 0)
    finally:
        conn.close()

def deduct_session_sandbox_ai_credit(token: str) -> Tuple[bool, int]:
    """Trừ 1 lượt AI giả lập trong phiên Sandbox (không chạm vào số dư thực)."""
    if not token or FIREBASE_ACTIVE:
        return False, 0
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE sessions SET sandbox_ai_credits = sandbox_ai_credits - 1 WHERE token = ? AND is_sandbox = 1 AND sandbox_ai_credits > 0 AND expires_at > ?",
                (token, now_str)
            )
            if cur.rowcount == 0:
                return False, 0
            cur.execute("SELECT sandbox_ai_credits FROM sessions WHERE token = ?", (token,))
            row = cur.fetchone()
            return True, int(row["sandbox_ai_credits"] if row else 0)
    finally:
        conn.close()

# ----------------- Chart Queries -----------------

def save_user_chart(
    user_id: int,
    chart_code: str,
    ho_ten: str,
    gioi_tinh: str,
    ngay_sinh: int,
    thang_sinh: int,
    nam_sinh: int,
    gio_sinh: int,
    phut_sinh: int,
    loai_lich: str,
    thang_nhuan: int,
    nam_xem_han: int,
    input_data: Any,
    chart_data: Any,
    created_by_admin_test: bool = False,
    admin_session_id: Optional[str] = None,
    reading_markdown: Optional[str] = None
) -> Dict[str, Any]:
    """Lưu hoặc cập nhật một bản ghi lá số vào bảng user_charts (và ai_readings nếu có)."""
    if FIREBASE_ACTIVE:
        return firebase_db.save_user_chart(
            str(user_id), chart_code, ho_ten, gioi_tinh,
            ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
            loai_lich, thang_nhuan, nam_xem_han, input_data, chart_data,
            created_by_admin_test=created_by_admin_test,
            admin_session_id=admin_session_id,
            reading_markdown=reading_markdown
        )

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    input_json = json.dumps(input_data, ensure_ascii=False) if not isinstance(input_data, str) else input_data
    chart_json = json.dumps(chart_data, ensure_ascii=False) if not isinstance(chart_data, str) else chart_data

    # Chế độ Modular: tách dữ liệu lá số vào charts.db và bài luận dài vào ai_readings.db
    if is_modular():
        # 1. Ghi bài luận vào ai_readings.db nếu có (cô lập tuyệt đối theo user_id + chart_code)
        final_reading = reading_markdown
        if reading_markdown is not None:
            ai_conn = _db_manager.get_ai_readings_connection()
            try:
                with ai_conn:
                    ai_cur = ai_conn.cursor()
                    ai_cur.execute("""
                        INSERT INTO chart_readings (chart_code, user_id, reading_markdown, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(user_id, chart_code) DO UPDATE SET
                            reading_markdown = excluded.reading_markdown,
                            updated_at = excluded.updated_at
                    """, (chart_code, int(user_id), reading_markdown, now_str, now_str))
            finally:
                ai_conn.close()
        else:
            # Kiểm tra xem user hiện tại đã có bài luận trước đó cho lá số này chưa
            ai_conn = _db_manager.get_ai_readings_connection()
            try:
                ai_cur = ai_conn.cursor()
                ai_cur.execute(
                    "SELECT reading_markdown FROM chart_readings WHERE user_id = ? AND chart_code = ? LIMIT 1",
                    (int(user_id), chart_code)
                )
                ai_row = ai_cur.fetchone()
                if ai_row:
                    final_reading = ai_row['reading_markdown']
            finally:
                ai_conn.close()

        # 2. Ghi tinh bàn lá số vào charts.db (không chứa reading_markdown)
        charts_conn = _db_manager.get_charts_connection()
        try:
            with charts_conn:
                cur = charts_conn.cursor()
                cur.execute("""
                    SELECT id FROM user_charts
                    WHERE user_id = ? AND chart_code = ?
                    ORDER BY updated_at DESC LIMIT 1
                """, (user_id, chart_code))
                existing = cur.fetchone()

                if existing:
                    chart_id = existing['id']
                    cur.execute("""
                        UPDATE user_charts
                        SET ho_ten = ?, gioi_tinh = ?, ngay_sinh = ?, thang_sinh = ?, nam_sinh = ?,
                            gio_sinh = ?, phut_sinh = ?, loai_lich = ?, thang_nhuan = ?, nam_xem_han = ?,
                            input_data = ?, chart_data = ?,
                            created_by_admin_test = ?, admin_session_id = ?, updated_at = ?
                        WHERE id = ?
                    """, (
                        ho_ten, gioi_tinh, ngay_sinh, thang_sinh, nam_sinh,
                        gio_sinh, phut_sinh, loai_lich, thang_nhuan, nam_xem_han,
                        input_json, chart_json,
                        1 if created_by_admin_test else 0, admin_session_id, now_str, chart_id
                    ))
                else:
                    cur.execute("""
                        INSERT INTO user_charts (
                            user_id, chart_code, ho_ten, gioi_tinh,
                            ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                            loai_lich, thang_nhuan, nam_xem_han,
                            input_data, chart_data,
                            created_by_admin_test, admin_session_id, created_at, updated_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        user_id, chart_code, ho_ten, gioi_tinh,
                        ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                        loai_lich, thang_nhuan, nam_xem_han,
                        input_json, chart_json,
                        1 if created_by_admin_test else 0, admin_session_id, now_str, now_str
                    ))
                    chart_id = cur.lastrowid

                return {
                    "id": chart_id,
                    "chart_code": chart_code,
                    "ho_ten": ho_ten,
                    "reading_markdown": final_reading,
                    "updated_at": now_str
                }
        finally:
            charts_conn.close()

    # Chế độ Monolithic (tuvi.db truyền thống)
    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, reading_markdown FROM user_charts
                WHERE user_id = ? AND chart_code = ?
                ORDER BY updated_at DESC LIMIT 1
            """, (user_id, chart_code))
            existing = cur.fetchone()

            if existing:
                chart_id = existing['id']
                final_reading = reading_markdown if reading_markdown is not None else existing['reading_markdown']
                cur.execute("""
                    UPDATE user_charts
                    SET ho_ten = ?, gioi_tinh = ?, ngay_sinh = ?, thang_sinh = ?, nam_sinh = ?,
                        gio_sinh = ?, phut_sinh = ?, loai_lich = ?, thang_nhuan = ?, nam_xem_han = ?,
                        input_data = ?, chart_data = ?, reading_markdown = ?,
                        created_by_admin_test = ?, admin_session_id = ?, updated_at = ?
                    WHERE id = ?
                """, (
                    ho_ten, gioi_tinh, ngay_sinh, thang_sinh, nam_sinh,
                    gio_sinh, phut_sinh, loai_lich, thang_nhuan, nam_xem_han,
                    input_json, chart_json, final_reading,
                    1 if created_by_admin_test else 0, admin_session_id, now_str, chart_id
                ))
            else:
                cur.execute("""
                    INSERT INTO user_charts (
                        user_id, chart_code, ho_ten, gioi_tinh,
                        ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                        loai_lich, thang_nhuan, nam_xem_han,
                        input_data, chart_data, reading_markdown,
                        created_by_admin_test, admin_session_id, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id, chart_code, ho_ten, gioi_tinh,
                    ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                    loai_lich, thang_nhuan, nam_xem_han,
                    input_json, chart_json, reading_markdown,
                    1 if created_by_admin_test else 0, admin_session_id, now_str, now_str
                ))
                chart_id = cur.lastrowid

            return {
                "id": chart_id,
                "chart_code": chart_code,
                "ho_ten": ho_ten,
                "reading_markdown": reading_markdown,
                "updated_at": now_str
            }
    finally:
        conn.close()

def update_chart_reading(user_id: int, chart_code: str, reading_markdown: str, chart_id: Optional[int] = None) -> bool:
    """Cập nhật bài luận giải AI (reading_markdown) vào bản ghi lá số đã lưu."""
    if FIREBASE_ACTIVE:
        return firebase_db.update_chart_reading(str(user_id), chart_code, reading_markdown, str(chart_id) if chart_id else None)

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if is_modular():
        # Tìm chart_code nếu chỉ có chart_id
        target_code = chart_code
        charts_conn = _db_manager.get_charts_connection()
        try:
            with charts_conn:
                if chart_id and not target_code:
                    row = charts_conn.execute("SELECT chart_code FROM user_charts WHERE id = ? AND user_id = ?", (chart_id, user_id)).fetchone()
                    if row:
                        target_code = row['chart_code']
                elif not target_code:
                    row = charts_conn.execute("SELECT chart_code FROM user_charts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1", (user_id,)).fetchone()
                    if row:
                        target_code = row['chart_code']

                # Cập nhật updated_at trong user_charts
                if target_code:
                    charts_conn.execute("UPDATE user_charts SET updated_at = ? WHERE chart_code = ? AND user_id = ?", (now_str, target_code, user_id))
        finally:
            charts_conn.close()

        if target_code:
            ai_conn = _db_manager.get_ai_readings_connection()
            try:
                with ai_conn:
                    ai_conn.execute("""
                        INSERT INTO chart_readings (chart_code, user_id, reading_markdown, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(user_id, chart_code) DO UPDATE SET
                            reading_markdown = excluded.reading_markdown,
                            updated_at = excluded.updated_at
                    """, (target_code, int(user_id), reading_markdown, now_str, now_str))
                    return True
            finally:
                ai_conn.close()
        return False

    # Monolithic mode
    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            if chart_id:
                cur.execute("""
                    UPDATE user_charts
                    SET reading_markdown = ?, updated_at = ?
                    WHERE id = ? AND user_id = ?
                """, (reading_markdown, now_str, chart_id, user_id))
            elif chart_code:
                cur.execute("""
                    UPDATE user_charts
                    SET reading_markdown = ?, updated_at = ?
                    WHERE user_id = ? AND chart_code = ?
                """, (reading_markdown, now_str, user_id, chart_code))
            else:
                cur.execute("""
                    UPDATE user_charts
                    SET reading_markdown = ?, updated_at = ?
                    WHERE id = (
                        SELECT id FROM user_charts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1
                    )
                """, (reading_markdown, now_str, user_id))
            return cur.rowcount > 0
    finally:
        conn.close()

def get_latest_user_chart(user_id: int) -> Optional[Dict[str, Any]]:
    """Truy xuất lá số được lưu gần đây nhất của người dùng."""
    if FIREBASE_ACTIVE:
        return firebase_db.get_latest_user_chart(str(user_id))

    if is_modular():
        conn = _db_manager.get_charts_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, user_id, chart_code, ho_ten, gioi_tinh,
                       ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                       loai_lich, thang_nhuan, nam_xem_han,
                       input_data, chart_data, created_at, updated_at
                FROM user_charts
                WHERE user_id = ?
                ORDER BY updated_at DESC, id DESC
                LIMIT 1
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return None
            res = dict(row)
        finally:
            conn.close()

        # Nạp bài luận giải từ ai_readings.db (lọc theo đúng user_id)
        ai_conn = _db_manager.get_ai_readings_connection()
        try:
            ai_row = ai_conn.execute(
                "SELECT reading_markdown FROM chart_readings WHERE user_id = ? AND chart_code = ? LIMIT 1",
                (int(user_id), res["chart_code"])
            ).fetchone()
            res["reading_markdown"] = ai_row["reading_markdown"] if ai_row else None
        finally:
            ai_conn.close()

        try:
            res["input_data"] = json.loads(res["input_data"])
        except Exception:
            pass
        try:
            res["chart_data"] = json.loads(res["chart_data"])
        except Exception:
            pass
        return res

    # Monolithic mode
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, user_id, chart_code, ho_ten, gioi_tinh,
                   ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                   loai_lich, thang_nhuan, nam_xem_han,
                   input_data, chart_data, reading_markdown, created_at, updated_at
            FROM user_charts
            WHERE user_id = ?
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
        """, (user_id,))
        row = cur.fetchone()
        if not row:
            return None
        res = dict(row)
        try:
            res["input_data"] = json.loads(res["input_data"])
        except Exception:
            pass
        try:
            res["chart_data"] = json.loads(res["chart_data"])
        except Exception:
            pass
        return res
    finally:
        conn.close()

def get_user_charts_list(user_id: int, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
    """Lấy danh sách các lá số mà người dùng đã lưu (kèm input_data, chart_data, reading_markdown)."""
    if FIREBASE_ACTIVE:
        return firebase_db.get_user_charts_list(str(user_id), limit, offset)

    if is_modular():
        conn = _db_manager.get_charts_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, chart_code, ho_ten, gioi_tinh,
                       ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                       loai_lich, thang_nhuan, nam_xem_han,
                       input_data, chart_data, created_at, updated_at
                FROM user_charts
                WHERE user_id = ?
                ORDER BY updated_at DESC
                LIMIT ? OFFSET ?
            """, (user_id, limit, offset))
            rows = [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

        # Batch nạp reading_markdown từ ai_readings.db (cô lập theo user_id)
        if rows:
            codes = list(dict.fromkeys(r["chart_code"] for r in rows))
            placeholders = ",".join("?" for _ in codes)
            ai_conn = _db_manager.get_ai_readings_connection()
            try:
                ai_rows = ai_conn.execute(
                    f"SELECT chart_code, reading_markdown FROM chart_readings WHERE user_id = ? AND chart_code IN ({placeholders})",
                    [int(user_id), *codes]
                ).fetchall()
                readings_map = {ar["chart_code"]: ar["reading_markdown"] for ar in ai_rows}
            finally:
                ai_conn.close()

            for r in rows:
                r["reading_markdown"] = readings_map.get(r["chart_code"])
                if isinstance(r.get("input_data"), str):
                    try:
                        r["input_data"] = json.loads(r["input_data"])
                    except Exception:
                        pass
                if isinstance(r.get("chart_data"), str):
                    try:
                        r["chart_data"] = json.loads(r["chart_data"])
                    except Exception:
                        pass
        return rows

    # Monolithic mode
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chart_code, ho_ten, gioi_tinh,
                   ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                   loai_lich, thang_nhuan, nam_xem_han,
                   input_data, chart_data, reading_markdown, created_at, updated_at
            FROM user_charts
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        """, (user_id, limit, offset))
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            if isinstance(r.get("input_data"), str):
                try:
                    r["input_data"] = json.loads(r["input_data"])
                except Exception:
                    pass
            if isinstance(r.get("chart_data"), str):
                try:
                    r["chart_data"] = json.loads(r["chart_data"])
                except Exception:
                    pass
        return rows
    finally:
        conn.close()

def get_user_ai_credits(user_id: int) -> Tuple[int, bool]:
    user = get_user_by_id(user_id)
    if not user:
        return 0, False
    if user.get("role") in ("manager", "admin"):
        return 999999, True
    return int(user.get("ai_credits", 0)), False

def deduct_user_ai_credit(user_id: int) -> Tuple[bool, int]:
    """Trừ 1 lượt luận giải AI của tài khoản. Admin/Manager không bị trừ."""
    user = get_user_by_id(user_id)
    if not user:
        return False, 0
    if user.get("role") in ("manager", "admin"):
        return True, 999999
    
    current_credits = int(user.get("ai_credits", 0))
    if current_credits <= 0:
        return False, 0

    if FIREBASE_ACTIVE:
        return firebase_db.deduct_user_ai_credit(str(user_id))

    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("UPDATE users SET ai_credits = ai_credits - 1 WHERE id = ? AND ai_credits > 0", (user_id,))
            if cur.rowcount > 0:
                cur.execute("SELECT ai_credits FROM users WHERE id = ?", (user_id,))
                r = cur.fetchone()
                return True, int(r[0]) if r else max(0, current_credits - 1)
            return False, 0
    finally:
        conn.close()

def add_user_ai_credits(user_id: int, credits: int = 1) -> Tuple[bool, int]:
    """Cộng thêm lượt luận giải AI cho tài khoản người dùng."""
    user = get_user_by_id(user_id)
    if not user:
        return False, 0
    if user.get("role") in ("manager", "admin"):
        return True, 999999

    if FIREBASE_ACTIVE:
        return firebase_db.add_user_ai_credits(str(user_id), credits)

    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("UPDATE users SET ai_credits = COALESCE(ai_credits, 0) + ? WHERE id = ?", (max(0, int(credits)), user_id))
            if cur.rowcount > 0:
                cur.execute("SELECT ai_credits FROM users WHERE id = ?", (user_id,))
                r = cur.fetchone()
                return True, int(r[0]) if r else 0
            return False, 0
    finally:
        conn.close()

def add_user_consultation_credits(user_id: int, credits: int = 1) -> Tuple[bool, int]:
    """Cộng thêm lượt luận giải trực tiếp cho tài khoản người dùng."""
    user = get_user_by_id(user_id)
    if not user:
        return False, 0
    if user.get("role") in ("manager", "admin"):
        return True, 999999

    if FIREBASE_ACTIVE:
        return firebase_db.add_user_consultation_credits(str(user_id), credits)

    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("UPDATE users SET consultation_credits = COALESCE(consultation_credits, 0) + ? WHERE id = ?", (max(0, int(credits)), user_id))
            if cur.rowcount > 0:
                cur.execute("SELECT consultation_credits FROM users WHERE id = ?", (user_id,))
                r = cur.fetchone()
                return True, int(r[0]) if r else 0
            return False, 0
    finally:
        conn.close()

def delete_user_chart(user_id: int, chart_id: int) -> bool:
    """Xóa một lá số khỏi cơ sở dữ liệu theo id và user_id sở hữu."""
    if FIREBASE_ACTIVE:
        return firebase_db.delete_user_chart(str(user_id), str(chart_id))

    if is_modular():
        conn = _db_manager.get_charts_connection()
        chart_code = None
        try:
            with conn:
                row = conn.execute("SELECT chart_code FROM user_charts WHERE id = ? AND user_id = ?", (chart_id, user_id)).fetchone()
                if row:
                    chart_code = row['chart_code']
                cur = conn.cursor()
                cur.execute("DELETE FROM user_charts WHERE id = ? AND user_id = ?", (chart_id, user_id))
                success = cur.rowcount > 0
        finally:
            conn.close()

        if chart_code:
            ai_conn = _db_manager.get_ai_readings_connection()
            try:
                with ai_conn:
                    ai_conn.execute(
                        "DELETE FROM chart_readings WHERE user_id = ? AND chart_code = ?",
                        (int(user_id), chart_code)
                    )
            except Exception:
                pass
            finally:
                ai_conn.close()
        return success

    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM user_charts WHERE id = ? AND user_id = ?", (chart_id, user_id))
            return cur.rowcount > 0
    finally:
        conn.close()

def get_user_chart_by_id(user_id: int, chart_id: int) -> Optional[Dict[str, Any]]:
    """Truy xuất chi tiết một lá số theo ID."""
    if FIREBASE_ACTIVE:
        return firebase_db.get_user_chart_by_id(str(user_id), str(chart_id))

    if is_modular():
        conn = _db_manager.get_charts_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, user_id, chart_code, ho_ten, gioi_tinh,
                       ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                       loai_lich, thang_nhuan, nam_xem_han,
                       input_data, chart_data, created_at, updated_at
                FROM user_charts
                WHERE id = ? AND user_id = ?
                LIMIT 1
            """, (chart_id, user_id))
            row = cur.fetchone()
            if not row:
                return None
            res = dict(row)
        finally:
            conn.close()

        ai_conn = _db_manager.get_ai_readings_connection()
        try:
            ai_row = ai_conn.execute(
                "SELECT reading_markdown FROM chart_readings WHERE user_id = ? AND chart_code = ? LIMIT 1",
                (int(user_id), res["chart_code"])
            ).fetchone()
            res["reading_markdown"] = ai_row["reading_markdown"] if ai_row else None
        finally:
            ai_conn.close()

        try:
            res["input_data"] = json.loads(res["input_data"])
        except Exception:
            pass
        try:
            res["chart_data"] = json.loads(res["chart_data"])
        except Exception:
            pass
        return res

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, user_id, chart_code, ho_ten, gioi_tinh,
                   ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                   loai_lich, thang_nhuan, nam_xem_han,
                   input_data, chart_data, reading_markdown, created_at, updated_at
            FROM user_charts
            WHERE id = ? AND user_id = ?
            LIMIT 1
        """, (chart_id, user_id))
        row = cur.fetchone()
        if not row:
            return None
        res = dict(row)
        try:
            res["input_data"] = json.loads(res["input_data"])
        except Exception:
            pass
        try:
            res["chart_data"] = json.loads(res["chart_data"])
        except Exception:
            pass
        return res
    finally:
        conn.close()

# ----------------- Admin Queries -----------------

def admin_get_users(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_get_users(limit, offset)

    safe_limit = min(max(int(limit), 1), 200)
    safe_offset = max(int(offset), 0)
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now_iso = now_dt.isoformat()
    online_cutoff_iso = (now_dt - datetime.timedelta(seconds=ONLINE_WINDOW_SECONDS)).isoformat()

    if is_modular():
        conn = _db_manager.get_unified_connection(["charts"])
        try:
            cur = conn.cursor()
            cur.execute("""
                WITH paged_users AS (
                    SELECT id, google_id, email, name, avatar, role, account_type, admin_level,
                           referral_code, referred_by_user_id, created_at, last_login_at, is_busy
                    FROM users
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?
                )
                SELECT u.id, u.google_id, u.email, u.name, u.avatar, u.role, u.account_type, u.admin_level,
                       u.referral_code, u.referred_by_user_id, r.name AS referrer_name, r.email AS referrer_email,
                       u.created_at, u.last_login_at, u.is_busy,
                       CASE WHEN EXISTS (
                           SELECT 1 FROM sessions active_session
                           WHERE active_session.user_id = u.id
                             AND active_session.expires_at > ?
                             AND active_session.last_activity_at > ?
                       ) THEN 1 ELSE 0 END AS is_online,
                       (SELECT COUNT(*) FROM charts.user_charts c WHERE c.user_id = u.id) AS total_charts,
                       (SELECT COUNT(*) FROM users referred WHERE referred.referred_by_user_id = u.id) AS referred_users
                FROM paged_users u
                LEFT JOIN users r ON r.id = u.referred_by_user_id
                ORDER BY u.id DESC
            """, (safe_limit, safe_offset, now_iso, online_cutoff_iso))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            WITH paged_users AS (
                SELECT id, google_id, email, name, avatar, role, account_type, admin_level,
                       referral_code, referred_by_user_id, created_at, last_login_at, is_busy
                FROM users
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            )
            SELECT u.id, u.google_id, u.email, u.name, u.avatar, u.role, u.account_type, u.admin_level,
                   u.referral_code, u.referred_by_user_id, r.name AS referrer_name, r.email AS referrer_email,
                   u.created_at, u.last_login_at, u.is_busy,
                   CASE WHEN EXISTS (
                       SELECT 1 FROM sessions active_session
                       WHERE active_session.user_id = u.id
                         AND active_session.expires_at > ?
                         AND active_session.last_activity_at > ?
                   ) THEN 1 ELSE 0 END AS is_online,
                   (SELECT COUNT(*) FROM user_charts c WHERE c.user_id = u.id) AS total_charts,
                   (SELECT COUNT(*) FROM users referred WHERE referred.referred_by_user_id = u.id) AS referred_users
            FROM paged_users u
            LEFT JOIN users r ON r.id = u.referred_by_user_id
            ORDER BY u.id DESC
        """, (safe_limit, safe_offset, now_iso, online_cutoff_iso))
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

def admin_get_user_detail(user_id: str) -> Optional[Dict[str, Any]]:
    """Return a user's basic account data and saved chart/service history."""
    if FIREBASE_ACTIVE:
        return firebase_db.admin_get_user_detail(str(user_id))

    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now_iso = now_dt.isoformat()
    online_cutoff_iso = (now_dt - datetime.timedelta(seconds=ONLINE_WINDOW_SECONDS)).isoformat()

    if is_modular():
        users_conn = _db_manager.get_customers_pii_connection()
        try:
            cur = users_conn.cursor()
            cur.execute("""SELECT u.id, u.email, u.name, u.avatar, u.account_type, u.admin_level,
                              u.referral_code, u.referred_by_user_id, u.created_at, u.last_login_at, u.is_busy,
                              CASE WHEN EXISTS (
                                  SELECT 1 FROM sessions active_session
                                  WHERE active_session.user_id = u.id
                                    AND active_session.expires_at > ?
                                    AND active_session.last_activity_at > ?
                              ) THEN 1 ELSE 0 END AS is_online,
                              r.name AS referrer_name, r.email AS referrer_email, r.referral_code AS referrer_code,
                              (SELECT COUNT(*) FROM users referred WHERE referred.referred_by_user_id = u.id) AS referred_users
                         FROM users u LEFT JOIN users r ON r.id = u.referred_by_user_id WHERE u.id = ?""",
                        (now_iso, online_cutoff_iso, user_id))
            user = cur.fetchone()
            if not user:
                return None
            result = dict(user)

            charts_conn = _db_manager.get_charts_connection()
            try:
                c_cur = charts_conn.cursor()
                c_cur.execute("""SELECT id, chart_code, ho_ten, gioi_tinh, ngay_sinh, thang_sinh, nam_sinh,
                                  gio_sinh, phut_sinh, loai_lich, nam_xem_han, created_at, updated_at
                             FROM user_charts WHERE user_id = ? ORDER BY updated_at DESC""", (user_id,))
                result['services'] = [dict(row) for row in c_cur.fetchall()]

                result['referred_accounts'] = []
                if result.get('account_type') == 'collaborator':
                    cur.execute("""SELECT id, name, email, created_at, last_login_at
                                 FROM users WHERE referred_by_user_id = ? ORDER BY created_at DESC""", (user_id,))
                    referred_accounts = [dict(row) for row in cur.fetchall()]
                    if referred_accounts:
                        ref_ids = [acc['id'] for acc in referred_accounts]
                        placeholders = ",".join("?" for _ in ref_ids)
                        c_cur.execute(
                            f"""SELECT id, user_id, chart_code, ho_ten, created_at, updated_at
                                FROM user_charts WHERE user_id IN ({placeholders}) ORDER BY updated_at DESC""",
                            ref_ids
                        )
                        charts_by_ref: Dict[int, List[Dict[str, Any]]] = {}
                        for row in c_cur.fetchall():
                            row_d = dict(row)
                            uid = row_d.pop('user_id')
                            charts_by_ref.setdefault(uid, []).append(row_d)
                        for account in referred_accounts:
                            account['services'] = charts_by_ref.get(account['id'], [])
                    result['referred_accounts'] = referred_accounts
                return result
            finally:
                charts_conn.close()
        finally:
            users_conn.close()

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""SELECT u.id, u.email, u.name, u.avatar, u.account_type, u.admin_level,
                          u.referral_code, u.referred_by_user_id, u.created_at, u.last_login_at, u.is_busy,
                          CASE WHEN EXISTS (
                              SELECT 1 FROM sessions active_session
                              WHERE active_session.user_id = u.id
                                AND active_session.expires_at > ?
                                AND active_session.last_activity_at > ?
                          ) THEN 1 ELSE 0 END AS is_online,
                          r.name AS referrer_name, r.email AS referrer_email, r.referral_code AS referrer_code,
                          (SELECT COUNT(*) FROM users referred WHERE referred.referred_by_user_id = u.id) AS referred_users
                     FROM users u LEFT JOIN users r ON r.id = u.referred_by_user_id WHERE u.id = ?""",
                    (now_iso, online_cutoff_iso, user_id))
        user = cur.fetchone()
        if not user:
            return None
        result = dict(user)
        cur.execute("""SELECT id, chart_code, ho_ten, gioi_tinh, ngay_sinh, thang_sinh, nam_sinh,
                          gio_sinh, phut_sinh, loai_lich, nam_xem_han, created_at, updated_at
                     FROM user_charts WHERE user_id = ? ORDER BY updated_at DESC""", (user_id,))
        result['services'] = [dict(row) for row in cur.fetchall()]
        result['referred_accounts'] = []
        if result.get('account_type') == 'collaborator':
            cur.execute("""SELECT id, name, email, created_at, last_login_at
                         FROM users WHERE referred_by_user_id = ? ORDER BY created_at DESC""", (user_id,))
            referred_accounts = [dict(row) for row in cur.fetchall()]
            if referred_accounts:
                ref_ids = [acc['id'] for acc in referred_accounts]
                placeholders = ",".join("?" for _ in ref_ids)
                cur.execute(
                    f"""SELECT id, user_id, chart_code, ho_ten, created_at, updated_at
                        FROM user_charts WHERE user_id IN ({placeholders}) ORDER BY updated_at DESC""",
                    ref_ids
                )
                charts_by_ref = {}
                for row in cur.fetchall():
                    row_d = dict(row)
                    uid = row_d.pop('user_id')
                    charts_by_ref.setdefault(uid, []).append(row_d)
                for account in referred_accounts:
                    account['services'] = charts_by_ref.get(account['id'], [])
            result['referred_accounts'] = referred_accounts
        return result
    finally:
        conn.close()

def admin_create_user(email: str, name: str, account_type: str = 'user') -> Dict[str, Any]:
    email = email.strip().lower()
    name = name.strip()
    if FIREBASE_ACTIVE:
        return firebase_db.admin_create_user(email, name, account_type)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    code = _new_referral_code() if account_type == 'collaborator' else None
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("INSERT INTO users (google_id,email,name,role,account_type,admin_level,referral_code,created_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?)",
                        (f"pending:{secrets.token_urlsafe(18)}", email, name, 'manager' if account_type == 'admin' else 'user', account_type, 2 if account_type == 'admin' else 0, code, now, now))
            cur.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,))
            return dict(cur.fetchone())
    finally:
        conn.close()

def admin_update_user(user_id: Any, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_update_user(str(user_id), updates)
    allowed = {'name', 'account_type', 'admin_level', 'referred_by_user_id'}
    fields = {key: value for key, value in updates.items() if key in allowed}
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            current = cur.fetchone()
            if not current:
                return None
            if fields.get('referred_by_user_id'):
                cur.execute("SELECT id FROM users WHERE id = ? AND account_type = 'collaborator'", (fields['referred_by_user_id'],))
                if not cur.fetchone() or str(fields['referred_by_user_id']) == str(user_id):
                    raise ValueError('Người giới thiệu phải là một tài khoản cộng tác viên khác.')
            if 'account_type' in fields:
                if fields['account_type'] not in ('admin', 'collaborator', 'user'):
                    raise ValueError('Loại tài khoản không hợp lệ.')
                fields['role'] = 'manager' if fields['account_type'] == 'admin' else 'user'
                if fields['account_type'] == 'admin':
                    fields['admin_level'] = fields.get('admin_level') or current['admin_level'] or 2
                else:
                    fields['admin_level'] = 0
                if fields['account_type'] == 'collaborator' and not current['referral_code']:
                    fields['referral_code'] = _new_referral_code()
            if fields.get('account_type') == 'admin' and fields.get('admin_level') not in (1, 2, 3):
                raise ValueError('Cấp quản trị phải là 1, 2 hoặc 3.')
            if fields:
                assignments = ', '.join(f"{column} = ?" for column in fields)
                cur.execute(f"UPDATE users SET {assignments} WHERE id = ?", [*fields.values(), user_id])
            cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()

def admin_delete_user(user_id: Any) -> bool:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_delete_user(str(user_id))
    conn = _db_manager.get_customers_pii_connection() if is_modular() else get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("UPDATE users SET referred_by_user_id = NULL WHERE referred_by_user_id = ?", (user_id,))
            cur.execute("DELETE FROM users WHERE id = ?", (user_id,))
            return cur.rowcount > 0
    finally:
        conn.close()

def admin_get_charts(limit: int = 50, offset: int = 0, search: Optional[str] = None) -> List[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_get_charts(limit, offset, search)

    if is_modular():
        conn = _db_manager.get_unified_connection(["charts"])
        try:
            cur = conn.cursor()
            if search:
                q = f"%{search}%"
                cur.execute("""
                    SELECT c.id, c.user_id, u.name AS user_name, u.email AS user_email,
                           c.chart_code, c.ho_ten, c.gioi_tinh, c.ngay_sinh, c.thang_sinh, c.nam_sinh,
                           c.gio_sinh, c.phut_sinh, c.loai_lich, c.thang_nhuan, c.nam_xem_han,
                           c.created_at, c.updated_at
                    FROM charts.user_charts c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.chart_code LIKE ? OR c.ho_ten LIKE ? OR u.email LIKE ?
                    ORDER BY c.id DESC
                    LIMIT ? OFFSET ?
                """, (q, q, q, limit, offset))
            else:
                cur.execute("""
                    SELECT c.id, c.user_id, u.name AS user_name, u.email AS user_email,
                           c.chart_code, c.ho_ten, c.gioi_tinh, c.ngay_sinh, c.thang_sinh, c.nam_sinh,
                           c.gio_sinh, c.phut_sinh, c.loai_lich, c.thang_nhuan, c.nam_xem_han,
                           c.created_at, c.updated_at
                    FROM charts.user_charts c
                    JOIN users u ON c.user_id = u.id
                    ORDER BY c.id DESC
                    LIMIT ? OFFSET ?
                """, (limit, offset))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    conn = get_connection()
    try:
        cur = conn.cursor()
        if search:
            q = f"%{search}%"
            cur.execute("""
                SELECT c.id, c.user_id, u.name AS user_name, u.email AS user_email,
                       c.chart_code, c.ho_ten, c.gioi_tinh, c.ngay_sinh, c.thang_sinh, c.nam_sinh,
                       c.gio_sinh, c.phut_sinh, c.loai_lich, c.thang_nhuan, c.nam_xem_han,
                       c.created_at, c.updated_at
                FROM user_charts c
                JOIN users u ON c.user_id = u.id
                WHERE c.chart_code LIKE ? OR c.ho_ten LIKE ? OR u.email LIKE ?
                ORDER BY c.id DESC
                LIMIT ? OFFSET ?
            """, (q, q, q, limit, offset))
        else:
            cur.execute("""
                SELECT c.id, c.user_id, u.name AS user_name, u.email AS user_email,
                       c.chart_code, c.ho_ten, c.gioi_tinh, c.ngay_sinh, c.thang_sinh, c.nam_sinh,
                       c.gio_sinh, c.phut_sinh, c.loai_lich, c.thang_nhuan, c.nam_xem_han,
                       c.created_at, c.updated_at
                FROM user_charts c
                JOIN users u ON c.user_id = u.id
                ORDER BY c.id DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

def admin_get_stats() -> Dict[str, Any]:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_get_stats()

    if is_modular():
        users_conn = _db_manager.get_customers_pii_connection()
        charts_conn = _db_manager.get_charts_connection()
        try:
            total_users = users_conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            total_managers = users_conn.execute("SELECT COUNT(*) FROM users WHERE role = 'manager'").fetchone()[0]
            active_sessions = users_conn.execute("SELECT COUNT(*) FROM sessions WHERE expires_at > datetime('now')").fetchone()[0]
            total_charts = charts_conn.execute("SELECT COUNT(*) FROM user_charts").fetchone()[0]
            return {
                "total_users": total_users,
                "total_managers": total_managers,
                "total_charts": total_charts,
                "active_sessions": active_sessions
            }
        finally:
            users_conn.close()
            charts_conn.close()

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'manager'")
        total_managers = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM user_charts")
        total_charts = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM sessions WHERE expires_at > datetime('now')")
        active_sessions = cur.fetchone()[0]
        return {
            "total_users": total_users,
            "total_managers": total_managers,
            "total_charts": total_charts,
            "active_sessions": active_sessions
        }
    finally:
        conn.close()


# ----------------- Server-side AI Q&A Quota Tracking -----------------

def get_qa_accumulated_tokens(user_id: int, chart_code: str) -> int:
    """Lấy tổng token hỏi đáp Q&A đã sử dụng của user cho một lá số từ phía Server."""
    safe_code = str(chart_code or "default_qa").strip()[:64] or "default_qa"
    conn = _db_manager.get_ai_readings_connection() if is_modular() else get_connection()
    try:
        row = conn.execute(
            "SELECT total_tokens FROM ai_qa_sessions WHERE user_id = ? AND chart_code = ? ORDER BY id DESC LIMIT 1",
            (int(user_id), safe_code)
        ).fetchone()
        return int(row["total_tokens"] or 0) if row else 0
    except Exception:
        return 0
    finally:
        conn.close()


def update_qa_accumulated_tokens(user_id: int, chart_code: str, new_total_tokens: int, question: str = "", answer: str = "") -> int:
    """Cập nhật tổng token hỏi đáp Q&A lũy kế trên Server (chống client reset accumulated_tokens)."""
    safe_code = str(chart_code or "default_qa").strip()[:64] or "default_qa"
    session_key = f"qa_{int(user_id)}_{safe_code}"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = _db_manager.get_ai_readings_connection() if is_modular() else get_connection()
    try:
        with conn:
            row = conn.execute(
                "SELECT id, messages, total_tokens FROM ai_qa_sessions WHERE session_id = ? LIMIT 1",
                (session_key,)
            ).fetchone()
            if row:
                try:
                    msgs = json.loads(row["messages"] or "[]")
                except Exception:
                    msgs = []
                if question:
                    msgs.append({"q": question[:500], "a_len": len(answer or ""), "at": now_str})
                msgs = msgs[-30:]
                final_total = max(int(row["total_tokens"] or 0), int(new_total_tokens))
                conn.execute(
                    "UPDATE ai_qa_sessions SET total_tokens = ?, messages = ?, updated_at = ? WHERE id = ?",
                    (final_total, json.dumps(msgs, ensure_ascii=False), now_str, row["id"])
                )
                return final_total

            msgs = [{"q": question[:500], "a_len": len(answer or ""), "at": now_str}] if question else []
            conn.execute(
                """INSERT INTO ai_qa_sessions (session_id, chart_code, user_id, messages, total_tokens, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (session_key, safe_code, int(user_id), json.dumps(msgs, ensure_ascii=False), int(new_total_tokens), now_str, now_str)
            )
            return int(new_total_tokens)
    except Exception:
        return int(new_total_tokens)
    finally:
        conn.close()


# ----------------- Decree 13/2023/NĐ-CP Data Portability & Self-Deletion -----------------

def export_user_personal_data(user_id: int) -> Optional[Dict[str, Any]]:
    """Xuất toàn bộ dữ liệu cá nhân của chủ thể dữ liệu theo Điều 9 & 14 Nghị định 13/2023/NĐ-CP."""
    user = get_user_by_id(user_id)
    if not user:
        return None

    clean_user = {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user.get("role"),
        "ai_credits": user.get("ai_credits", 0),
        "consultation_credits": user.get("consultation_credits", 0),
        "created_at": user.get("created_at"),
        "last_login_at": user.get("last_login_at"),
    }
    charts = get_user_charts_list(user_id, limit=100, offset=0)

    orders: List[Dict[str, Any]] = []
    chat_messages: List[Dict[str, Any]] = []
    email_lower = str(user.get("email") or "").strip().lower()

    if is_modular():
        bill_conn = _db_manager.get_billing_connection()
        try:
            rows = bill_conn.execute(
                "SELECT order_code, amount, description, service_type, status, created_at, paid_at FROM billing_orders WHERE user_id = ? AND COALESCE(is_sandbox, 0) = 0 ORDER BY created_at DESC LIMIT 200",
                (str(user_id),)
            ).fetchall()
            orders = [dict(r) for r in rows]
        except Exception:
            pass
        finally:
            bill_conn.close()

        cust_conn = _db_manager.get_customers_pii_connection()
        chat_conn = _db_manager.get_cskh_chat_connection()
        try:
            ca = cust_conn.execute("SELECT id FROM customer_accounts WHERE lower(email) = ? LIMIT 1", (email_lower,)).fetchone()
            if ca:
                c_rows = chat_conn.execute(
                    "SELECT sender_role, sender_name, message, created_at FROM customer_chat_messages WHERE customer_id = ? ORDER BY id ASC LIMIT 500",
                    (ca["id"],)
                ).fetchall()
                chat_messages = [dict(r) for r in c_rows]
        except Exception:
            pass
        finally:
            cust_conn.close()
            chat_conn.close()

    return {
        "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "legal_basis": "Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân",
        "account": clean_user,
        "saved_charts": charts,
        "billing_orders": orders,
        "support_chat_messages": chat_messages,
    }


def delete_user_account_self(user_id: int) -> bool:
    """Chủ thể dữ liệu tự xóa tài khoản và toàn bộ dữ liệu cá nhân liên quan (Điều 16 NĐ 13/2023/NĐ-CP)."""
    user = get_user_by_id(user_id)
    if not user:
        return False

    email_lower = str(user.get("email") or "").strip().lower()

    if is_modular():
        # 1. Xóa bài luận AI & Q&A của user
        ai_conn = _db_manager.get_ai_readings_connection()
        try:
            with ai_conn:
                ai_conn.execute("DELETE FROM chart_readings WHERE user_id = ?", (int(user_id),))
                ai_conn.execute("DELETE FROM ai_qa_sessions WHERE user_id = ?", (int(user_id),))
        finally:
            ai_conn.close()

        # 2. Xóa lá số đã lưu trong charts.db
        charts_conn = _db_manager.get_charts_connection()
        try:
            with charts_conn:
                charts_conn.execute("DELETE FROM user_charts WHERE user_id = ?", (int(user_id),))
                if email_lower:
                    charts_conn.execute("DELETE FROM customer_chart_logs WHERE lower(customer_email) = ?", (email_lower,))
        finally:
            charts_conn.close()

        # 3. Ẩn danh hóa đơn hàng thanh toán trong billing.db (giữ sổ kế toán theo luật thuế nhưng gỡ PII user_id)
        bill_conn = _db_manager.get_billing_connection()
        try:
            with bill_conn:
                bill_conn.execute("UPDATE billing_orders SET user_id = NULL WHERE user_id = ?", (str(user_id),))
        finally:
            bill_conn.close()

        # 4. Xóa tin nhắn chat và customer_accounts, sessions, users trong cskh_chat.db & customers_pii.db
        cust_conn = _db_manager.get_customers_pii_connection()
        chat_conn = _db_manager.get_cskh_chat_connection()
        try:
            ca = cust_conn.execute("SELECT id FROM customer_accounts WHERE lower(email) = ? LIMIT 1", (email_lower,)).fetchone()
            if ca:
                with chat_conn:
                    chat_conn.execute("DELETE FROM customer_chat_messages WHERE customer_id = ?", (ca["id"],))
            with cust_conn:
                if ca:
                    cust_conn.execute("DELETE FROM customer_accounts WHERE id = ?", (ca["id"],))
                if email_lower:
                    cust_conn.execute("DELETE FROM contact_submissions WHERE lower(email) = ?", (email_lower,))
                cust_conn.execute("UPDATE users SET referred_by_user_id = NULL WHERE referred_by_user_id = ?", (int(user_id),))
                cust_conn.execute("DELETE FROM sessions WHERE user_id = ?", (int(user_id),))
                cur = cust_conn.execute("DELETE FROM users WHERE id = ?", (int(user_id),))
                return cur.rowcount > 0
        finally:
            chat_conn.close()
            cust_conn.close()

    # Monolithic mode fallback
    conn = get_connection()
    try:
        with conn:
            conn.execute("DELETE FROM user_charts WHERE user_id = ?", (int(user_id),))
            conn.execute("DELETE FROM sessions WHERE user_id = ?", (int(user_id),))
            conn.execute("UPDATE users SET referred_by_user_id = NULL WHERE referred_by_user_id = ?", (int(user_id),))
            cur = conn.execute("DELETE FROM users WHERE id = ?", (int(user_id),))
            return cur.rowcount > 0
    finally:
        conn.close()
