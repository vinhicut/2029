import os
import secrets
import logging

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))

# Nạp tự động các biến môi trường từ tệp .env nếu có
ENV_PATH = os.path.join(PROJECT_ROOT, "backend", ".env")
if os.path.exists(ENV_PATH):
    try:
        with open(ENV_PATH, "r", encoding="utf-8-sig") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key not in os.environ or not os.environ[key].strip():
                        os.environ[key] = val
    except Exception:
        pass

DATA_DIR = os.path.join(BASE_DIR, "..", "data")
DB_PATH = os.path.join(DATA_DIR, "tuvi.db")

# ── Cấu hình Cơ sở dữ liệu Module hóa (Modular Databases) ──
DATABASES_DIR = os.path.join(DATA_DIR, "databases")
DATABASE_MODE = os.getenv("DATABASE_MODE", "modular").strip().lower()

# Đường dẫn 10 CSDL chuyên biệt theo Domain-Driven Design
DB_AUTH_STAFF_PATH = os.path.join(DATABASES_DIR, "auth_staff.db")
DB_CUSTOMERS_PII_PATH = os.path.join(DATABASES_DIR, "customers_pii.db")
DB_CSKH_CHAT_PATH = os.path.join(DATABASES_DIR, "cskh_chat.db")
DB_BILLING_PATH = os.path.join(DATABASES_DIR, "billing.db")
DB_CHARTS_PATH = os.path.join(DATABASES_DIR, "charts.db")
DB_AI_READINGS_PATH = os.path.join(DATABASES_DIR, "ai_readings.db")
DB_ARTICLES_PATH = os.path.join(DATABASES_DIR, "articles_academic.db")
DB_BUDDHISM_PATH = os.path.join(DATABASES_DIR, "buddhism.db")
DB_COURSES_PATH = os.path.join(DATABASES_DIR, "courses.db")
DB_COMMUNITY_PATH = os.path.join(DATABASES_DIR, "community_forum.db")

# Alias tương thích ngược nếu cần
DB_AUTH_USERS_PATH = DB_CUSTOMERS_PII_PATH

STORAGE_DIR = os.path.join(DATA_DIR, "storage")
CHART_IMAGE_DIR = os.getenv("CHART_IMAGE_DIR", os.path.join(STORAGE_DIR, "chart-images"))
ARTICLE_IMAGE_DIR = os.getenv("ARTICLE_IMAGE_DIR", os.path.join(STORAGE_DIR, "article-images"))
RELEASE_DIR = os.path.join(PROJECT_ROOT, "releases", "dist")
DIST_DIR = os.getenv("DIST_DIR", RELEASE_DIR)
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "frontend", "public")

# Ensure data, databases and storage directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(DATABASES_DIR, exist_ok=True)
os.makedirs(CHART_IMAGE_DIR, exist_ok=True)
os.makedirs(ARTICLE_IMAGE_DIR, exist_ok=True)

# Firebase Configuration
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "tu-vi-hong")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", os.path.join(PROJECT_ROOT, "security", "keys-and-secrets", "firebase-service-account.json"))

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "714306691526-iq2uodqu69fdcdalibn2ipgia2t4lqvs.apps.googleusercontent.com").strip()
GOOGLE_CLIENT_IDS_RAW = os.getenv("GOOGLE_CLIENT_IDS", "")
GOOGLE_CLIENT_IDS = list(dict.fromkeys(
    client_id.strip() for client_id in [GOOGLE_CLIENT_ID, *GOOGLE_CLIENT_IDS_RAW.split(",")]
    if client_id.strip()
))
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# Authorized URIs from client_secret + Local Dev URIs
GOOGLE_REDIRECT_URIS = [
    "https://tuvihongan.com/",
    "https://www.tuvihongan.com/",
    "http://tuvihongan.com/",
    "http://localhost:5173/",
    "http://localhost:2026/",
    "http://127.0.0.1:5173/",
    "http://127.0.0.1:2026/"
]

GOOGLE_JAVASCRIPT_ORIGINS = [
    "https://tuvihongan.com",
    "https://www.tuvihongan.com",
    "http://tuvihongan.com",
    "http://localhost:5173",
    "http://localhost:2026",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:2026"
]

# Manager / Admin email list (comma-separated in env)
MANAGER_EMAILS_RAW = os.getenv(
    "MANAGER_EMAILS",
    "admin@tuvihongan.com,quanly@tuvihongan.com,nguyenvinhvan90@gmail.com,tranngocxuanbach7@gmail.com",
)
MANAGER_EMAILS = [e.strip().lower() for e in MANAGER_EMAILS_RAW.split(",") if e.strip()]

# Only these accounts receive unrestricted Admin 1 access. Existing manager
# accounts are migrated as Admin 2 until an owner is explicitly configured.
SUPER_ADMIN_EMAILS_RAW = os.getenv("SUPER_ADMIN_EMAILS", "tranngocxuanbach7@gmail.com")
SUPER_ADMIN_EMAILS = [e.strip().lower() for e in SUPER_ADMIN_EMAILS_RAW.split(",") if e.strip()]
if "tranngocxuanbach7@gmail.com" not in SUPER_ADMIN_EMAILS:
    SUPER_ADMIN_EMAILS.append("tranngocxuanbach7@gmail.com")

# Server configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "2026"))
_raw_cors = os.getenv("CORS_ORIGIN", "").strip()
_env_origins = [o.strip().rstrip("/") for o in _raw_cors.split(",") if o.strip() and o.strip() != "*"]
ALLOWED_ORIGINS = list(dict.fromkeys([*GOOGLE_JAVASCRIPT_ORIGINS, *_env_origins]))
CORS_ORIGIN = ALLOWED_ORIGINS[0]

_env_secret_key = os.getenv("SECRET_KEY", "").strip()
if not _env_secret_key:
    logger.warning("SECRET_KEY chưa được cấu hình trong .env; sử dụng khóa phiên tạm thời ngẫu nhiên.")
    SECRET_KEY = secrets.token_hex(32)
else:
    SECRET_KEY = _env_secret_key
