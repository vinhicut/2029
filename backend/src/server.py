#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
backend/server.py
Máy chủ HTTP & REST API phục vụ Website Tử Vi Hồng Ân (Official Production Release 2409).
Cung cấp:
  - REST API /api/calculate : Tính toán và an sao Tử Vi Đẩu Số 14 chính tinh & 110+ phụ tinh.
  - REST API /api/health    : Kiểm tra trạng thái máy chủ (Health Check).
  - REST API /api/auth      : Đăng nhập Google OAuth, kiểm tra phiên, dev-login.
  - REST API /api/admin     : Thống kê và quản trị tài khoản, danh sách lá số.
  - REST API /api/user      : Lưu trữ và tự động điền lá số gần nhất.
  - Phục vụ Static Files    : Ưu tiên 'release website 2409' -> 'dist' -> 'public'.
"""

import os
import sys
import json
import time
import logging
import threading
from collections import defaultdict, deque
from flask import Flask, request, jsonify, send_from_directory, Response
from werkzeug.exceptions import HTTPException
from werkzeug.serving import run_simple

# Thêm thư mục backend vào sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, "..", ".."))

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Nạp tự động các biến môi trường từ tệp .env nếu có
for env_file in [os.path.join(PROJECT_ROOT, ".env"), os.path.join(PROJECT_ROOT, "backend", ".env")]:
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8-sig") as f:
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

RELEASE_DIR = os.path.join(PROJECT_ROOT, "releases", "dist")
DIST_DIR = os.getenv("DIST_DIR", RELEASE_DIR)
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "frontend", "public")

from modules.astrology.engine import calculate_tuvi_chart
from core.config import ALLOWED_ORIGINS, SECRET_KEY
from core.db import init_db
logger = logging.getLogger(__name__)

# Bộ giới hạn tần suất (In-Memory Sliding Window Rate Limiter) theo IP & Endpoint
_RATE_LIMIT_LOCK = threading.Lock()
_RATE_LIMIT_BUCKETS = defaultdict(deque)
_RATE_LIMIT_RULES = {
    "/api/auth/google": (20, 60),
    "/api/auth/dev-login": (10, 60),
    "/api/ai/interpret-chart": (15, 60),
    "/api/ai/stream-interpret-chart": (15, 60),
    "/api/ai/ask": (30, 60),
    "/api/ai/export-pdf": (15, 60),
    "/api/billing/webhook": (60, 60),
    "/api/billing/sepay/webhook": (60, 60),
}
# Phân hệ Cốt lõi
from modules.auth.routes_auth import auth_bp
from modules.admin.routes_admin import admin_bp
from modules.astrology.api.routes_charts import charts_bp
from modules.auth.admin_auth import admin_auth_bp
from modules.astrology.api.routes_ai import ai_bp

# Phân hệ Modular M3 (Features 18, 22, 23, 24)
from modules.contact import contact_bp, booking_bp
from modules.articles import articles_bp, article_images_bp
from modules.courses import courses_bp
from modules.feng_shui import feng_shui_bp
from modules.forum import forum_bp
from modules.lunar_calendar import lunar_calendar_bp
from modules.shop import shop_bp
from modules.tarot_kieu import tarot_kieu_bp
from modules.billing import billing_bp
from modules.buddhism import buddhism_bp
from modules.chat.routes_chat import chat_bp

# Cấu hình mặc định
CONFIG = {
    "HOST": os.getenv("HOST", "0.0.0.0"),
    "PORT": int(os.getenv("PORT", "8080")),
    "CORS_ORIGIN": os.getenv("CORS_ORIGIN", "*"),
}


def create_app():
    """Khởi tạo và cấu hình ứng dụng Flask backend."""
    # Khởi tạo cơ sở dữ liệu SQLite / Firebase
    init_db()

    # Thư mục tĩnh ưu tiên: release website 2409 -> dist -> public
    static_folder = RELEASE_DIR if os.path.exists(RELEASE_DIR) else (DIST_DIR if os.path.exists(DIST_DIR) else PUBLIC_DIR)

    app = Flask(
        __name__,
        static_folder=static_folder,
        static_url_path=""
    )
    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # Giới hạn 20 MB (hỗ trợ ảnh lá số 4K xuất PDF)

    @app.before_request
    def enforce_rate_limits():
        if os.getenv("DISABLE_RATE_LIMIT", "false").strip().lower() == "true":
            return None
        rule = _RATE_LIMIT_RULES.get(request.path)
        if not rule or request.method == "OPTIONS":
            return None
        max_req, window_sec = rule
        client_ip = (request.headers.get("X-Real-IP") or request.remote_addr or "unknown").strip()
        bucket_key = f"{client_ip}:{request.path}"
        now_ts = time.monotonic()
        with _RATE_LIMIT_LOCK:
            q = _RATE_LIMIT_BUCKETS[bucket_key]
            while q and now_ts - q[0] > window_sec:
                q.popleft()
            if len(q) >= max_req:
                return jsonify({
                    "status": "error",
                    "code": "TOO_MANY_REQUESTS",
                    "message": "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại."
                }), 429
            q.append(now_ts)
        return None

    # Đăng ký các phân hệ API cốt lõi
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(charts_bp)
    app.register_blueprint(admin_auth_bp)
    app.register_blueprint(ai_bp)

    # Đăng ký các phân hệ API Modular M3
    app.register_blueprint(contact_bp)
    app.register_blueprint(booking_bp)
    app.register_blueprint(articles_bp)
    app.register_blueprint(article_images_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(feng_shui_bp)
    app.register_blueprint(forum_bp)
    app.register_blueprint(lunar_calendar_bp)
    app.register_blueprint(shop_bp)
    app.register_blueprint(tarot_kieu_bp)
    app.register_blueprint(billing_bp)
    app.register_blueprint(buddhism_bp)
    app.register_blueprint(chat_bp)

    # Cấu hình CORS whitelist & HTTP Security Headers toàn cục
    @app.after_request
    def set_security_and_cors_headers(response):
        origin = (request.headers.get("Origin") or "").strip().rstrip("/")
        if origin and origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"
        elif ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS[0]
            response.headers["Vary"] = "Origin"

        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, If-None-Match"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-XSS-Protection"] = "0"
        return response

    @app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
    @app.route("/<path:path>", methods=["OPTIONS"])
    def options_handler(path=""):
        return Response("", status=200)

    # 1. API Health Check
    @app.route("/api/health", methods=["GET", "HEAD"])
    def api_health():
        static_label = "release website 2409" if os.path.exists(RELEASE_DIR) else ("dist" if os.path.exists(DIST_DIR) else "public")
        payload = {
            "status": "ok",
            "service": "Tu Vi Hong An Core API Engine",
            "version": "1.0.0-release-2409",
            "static_directory": static_label
        }
        return jsonify(payload)

    # 2. API Tính toán lá số Tử Vi Đẩu Số
    @app.route("/api/calculate", methods=["POST"])
    def api_calculate():
        content_type = request.headers.get("Content-Type", "")
        if "application/json" in content_type:
            params = request.get_json(silent=True) or {}
        else:
            try:
                raw_data = request.get_data(as_text=True)
                params = json.loads(raw_data) if raw_data else {}
            except Exception:
                params = {}

        try:
            chart_data = calculate_tuvi_chart(params)
            return jsonify(chart_data)
        except Exception:
            logger.exception("Lỗi khi tính toán lá số Tử Vi tại /api/calculate")
            return jsonify({"error": "Không thể tính toán lá số với dữ liệu đã cung cấp."}), 400

    # 3. Phục vụ tài nguyên tĩnh (Static Files & SPA fallback)
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_static_files(path):
        if not path or path == "/":
            path = "index.html"

        folder = app.static_folder

        # Chặn các tệp tin nguy hiểm
        forbidden_extensions = {".py", ".pyc", ".env", ".git", ".bak", ".swp", ".key", ".log", ".DS_Store"}
        forbidden_filenames = {".env", ".gitignore", "requirements.txt", "package.json", "vite.config.js"}
        base_name = os.path.basename(path).lower()
        ext = os.path.splitext(base_name)[1].lower()

        if base_name in forbidden_filenames or ext in forbidden_extensions or (base_name.startswith(".") and base_name not in (".", "..")):
            return Response("Quyền truy cập bị từ chối", status=403)

        target = os.path.join(folder, path)
        if os.path.isfile(target):
            return send_from_directory(folder, path)

        if os.path.isdir(target):
            index_path = os.path.join(target, "index.html")
            if os.path.isfile(index_path):
                return send_from_directory(target, "index.html")

        # SPA Fallback sang index.html nếu không phải là API request
        if not path.startswith("api/"):
            index_file = os.path.join(folder, "index.html")
            if os.path.isfile(index_file):
                return send_from_directory(folder, "index.html")

        return Response("Không tìm thấy trang yêu cầu", status=404)

    @app.errorhandler(404)
    def spa_not_found(e):
        if not request.path.startswith("/api/"):
            folder = app.static_folder
            index_file = os.path.join(folder, "index.html")
            if os.path.isfile(index_file):
                return send_from_directory(folder, "index.html")
        return jsonify({"status": "error", "message": "Không tìm thấy tài nguyên yêu cầu."}), 404

    @app.errorhandler(413)
    def request_too_large(e):
        return jsonify({
            "status": "error",
            "code": "PAYLOAD_TOO_LARGE",
            "message": "Dung lượng dữ liệu gửi lên vượt quá giới hạn 20 MB."
        }), 413

    @app.errorhandler(Exception)
    def handle_unexpected_error(e):
        if isinstance(e, HTTPException):
            return e
        logger.exception("Unhandled server exception at %s", request.path)
        if request.path.startswith("/api/"):
            return jsonify({
                "status": "error",
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Hệ thống đang xử lý sự cố kỹ thuật. Vui lòng thử lại sau."
            }), 500
        return Response("Đã xảy ra lỗi hệ thống.", status=500)

    return app


def run_server(host: str = None, port: int = None):
    host = host or CONFIG["HOST"]
    port = port or CONFIG["PORT"]

    display_host = "localhost" if host in ["0.0.0.0", ""] else host
    static_folder = RELEASE_DIR if os.path.exists(RELEASE_DIR) else (DIST_DIR if os.path.exists(DIST_DIR) else PUBLIC_DIR)

    print("=" * 60)
    print("  🚀 MÁY CHỦ TỬ VI HỒNG ÂN - CORE API & AUTH ENGINE")
    print(f"  👉 API Endpoint:    http://{display_host}:{port}/api/calculate")
    print(f"  👉 Health Check:     http://{display_host}:{port}/api/health")
    print(f"  👉 Auth Endpoint:   http://{display_host}:{port}/api/auth/google")
    print(f"  👉 Static Files:     {static_folder}")
    print("=" * 60)
    print("  Nhấn Ctrl + C để dừng máy chủ.\n")

    app = create_app()

    # Tắt logging ồn ào của Werkzeug trên dev
    log = logging.getLogger("werkzeug")
    log.setLevel(logging.INFO)

    run_simple(
        hostname=host,
        port=port,
        application=app,
        use_reloader=os.getenv("USE_RELOADER", "0") == "1",
        use_debugger=False,
        threaded=True
    )


if __name__ == "__main__":
    p = CONFIG["PORT"]
    h = CONFIG["HOST"]
    if len(sys.argv) > 1:
        try:
            p = int(sys.argv[1])
        except ValueError:
            pass
    if len(sys.argv) > 2:
        h = sys.argv[2]
    run_server(h, p)
