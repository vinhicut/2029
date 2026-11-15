import uuid
import datetime
from flask import Blueprint, request, jsonify
from functools import wraps
from modules.admin.admin_db import save_admin_session, end_admin_session, cleanup_admin_test_data

admin_auth_bp = Blueprint("admin_auth", __name__, url_prefix="/api/admin/auth")

ADMIN_EMAILS = ["tranngocxuanbach7@gmail.com"]

# Lưu token admin trong bộ nhớ tạm cho nhanh, hoặc có thể lưu DB.
ADMIN_SESSIONS = {}

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
        token = auth_header.split(" ")[1]
        if token not in ADMIN_SESSIONS:
            return jsonify({"status": "error", "message": "Invalid or expired admin token"}), 401
        
        session_info = ADMIN_SESSIONS[token]
        # check expiration
        if datetime.datetime.now() > session_info['expires']:
            del ADMIN_SESSIONS[token]
            return jsonify({"status": "error", "message": "Session expired"}), 401

        request.admin_session = session_info
        return f(*args, **kwargs)
    return decorated_function

@admin_auth_bp.route("/login", methods=["POST"])
def admin_login():
    return jsonify({
        "status": "error",
        "message": "Hệ thống xác thực 2FA cũ qua email/mã đã được gỡ bỏ hoàn toàn. Vui lòng đăng nhập bằng tài khoản Google quản trị."
    }), 410

@admin_auth_bp.route("/logout", methods=["POST"])
@admin_required
def admin_logout():
    session_info = request.admin_session
    session_id = session_info["session_id"]
    
    end_admin_session(session_id)
    cleanup_admin_test_data(session_id)

    # find token and delete
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ")[1]
    if token in ADMIN_SESSIONS:
        del ADMIN_SESSIONS[token]

    return jsonify({"status": "success", "message": "Logged out and test data cleaned"})
