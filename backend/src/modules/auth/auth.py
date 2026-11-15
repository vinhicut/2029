import os
import json
import urllib.request
import secrets
from functools import wraps
from flask import request, jsonify, g
from typing import Optional, Dict, Any, Tuple

from core.config import GOOGLE_CLIENT_IDS, MANAGER_EMAILS, SUPER_ADMIN_EMAILS
from core.customer_store import upsert_customer_account
from core.db import upsert_user, create_session, get_user_by_token, delete_session


def verify_google_id_token(credential: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Xác thực Google ID Token trực tiếp với endpoint tokeninfo của Google API.
    Không phụ thuộc thư viện bên ngoài, chạy thuần Python Standard Library.
    """
    if not credential:
        return False, None, "Không tìm thấy thông tin xác thực Google."

    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TuViHongAn-Backend/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status != 200:
                return False, None, f"Google từ chối xác thực (HTTP {response.status})"
            payload = json.loads(response.read().decode("utf-8"))

        aud = payload.get("aud")
        if not GOOGLE_CLIENT_IDS or aud not in GOOGLE_CLIENT_IDS:
            print(
                f"Google sign-in audience mismatch: received aud={aud!r}; "
                f"configured client IDs={GOOGLE_CLIENT_IDS!r}",
                flush=True,
            )
            return False, None, "Google ID token không được cấp cho ứng dụng này."

        email = payload.get("email")
        if not email or str(payload.get("email_verified", "")).lower() != "true":
            return False, None, "Token Google không chứa email hợp lệ."

        google_id = payload.get("sub")
        if not google_id:
            return False, None, "Google ID token không có mã định danh tài khoản."

        user_info = {
            "google_id": google_id,
            "email": email.strip().lower(),
            "name": payload.get("name", email.split("@")[0]),
            "avatar": payload.get("picture")
        }
        return True, user_info, None

    except urllib.error.HTTPError as e:
        return False, None, f"Lỗi xác thực Google: HTTP {e.code}"
    except Exception as e:
        return False, None, f"Không thể kết nối đến máy chủ Google: {str(e)}"

def is_admin_or_developer(user: Optional[Dict[str, Any]]) -> bool:
    """Kiểm tra tài khoản thuộc nhóm Nhà phát triển hoặc Quản trị viên."""
    if not isinstance(user, dict):
        return False
    role = str(user.get("role") or "").strip().lower()
    account_type = str(user.get("account_type") or "").strip().lower()
    clean_email = str(user.get("email") or "").strip().lower()
    try:
        admin_level = int(user.get("admin_level") or 0)
    except (TypeError, ValueError):
        admin_level = 0
    return (
        role in ("developer", "admin", "manager")
        or account_type in ("developer", "admin")
        or admin_level > 0
        or clean_email in SUPER_ADMIN_EMAILS
    )


def has_management_access(user: Optional[Dict[str, Any]]) -> bool:
    """Kiểm tra quyền truy cập trang Quản lý (Nhà phát triển, Quản trị viên, Cộng tác viên)."""
    if not isinstance(user, dict):
        return False
    if is_admin_or_developer(user):
        return True
    role = str(user.get("role") or "").strip().lower()
    account_type = str(user.get("account_type") or "").strip().lower()
    return role == "collaborator" or account_type == "collaborator"


DEVELOPER_EMAILS = {"tranngocxuanbach7@gmail.com"}


def is_developer_user(user: Optional[Dict[str, Any]]) -> bool:
    """Kiểm tra chặt chẽ tài khoản có vai trò Nhà phát triển (Developer) hợp lệ từ phía máy chủ."""
    if not isinstance(user, dict):
        return False
    clean_email = str(user.get("email") or "").strip().lower()
    role = str(user.get("role") or "").strip().lower()
    account_type = str(user.get("account_type") or "").strip().lower()
    return (
        clean_email in DEVELOPER_EMAILS
        or role == "developer"
        or account_type == "developer"
    )


def get_token_from_request() -> str:
    """Trích xuất session token từ Authorization header hoặc HttpOnly cookie."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    if request.cookies:
        return (request.cookies.get("tuvi_token") or "").strip()
    return ""


def determine_user_role(email: str) -> str:
    """Xác định vai trò (developer, manager hoặc user) dựa trên danh sách email."""
    if not email:
        return "user"
    clean_email = email.strip().lower()
    if clean_email in DEVELOPER_EMAILS:
        return "developer"
    if clean_email in MANAGER_EMAILS or clean_email in SUPER_ADMIN_EMAILS:
        return "manager"
    return "user"

def issue_user_session(user_info: Dict[str, Any], forced_role: Optional[str] = None, referral_code: Optional[str] = None) -> Dict[str, Any]:
    """Cấp phát session token cho người dùng đã xác thực."""
    role = forced_role if forced_role else determine_user_role(user_info["email"])
    user = upsert_user(
        google_id=user_info["google_id"],
        email=user_info["email"],
        name=user_info["name"],
        avatar=user_info.get("avatar"),
        role=role,
        referral_code=referral_code
    )
    if isinstance(user, dict):
        user["can_access_management"] = has_management_access(user)
    token = secrets.token_hex(32)
    session_data = create_session(user["id"], token, days=30)
    try:
        upsert_customer_account(user, login_increment=1)
    except Exception:
        pass
    return {
        "token": token,
        "expires_at": session_data["expires_at"],
        "user": user
    }

def get_current_user_from_request() -> Optional[Dict[str, Any]]:
    """Trích xuất và kiểm tra tính hợp lệ của người dùng từ Authorization Header hoặc HttpOnly Cookie."""
    token = get_token_from_request()

    if not token:
        return None

    # 1. Kiểm tra phiên Quản trị viên (Admin Mode)
    try:
        from modules.auth.admin_auth import ADMIN_SESSIONS, ADMIN_EMAILS
        if token in ADMIN_SESSIONS:
            session_info = ADMIN_SESSIONS.get(token, {})
            email = session_info.get("email") or ADMIN_EMAILS[0]
            role = session_info.get("role") or "admin"
            return {
                "id": 1,
                "google_id": "admin_account",
                "email": email,
                "name": "QUẢN TRỊ VIÊN",
                "avatar": "/Avatar.jpg",
                "role": role,
                "account_type": "admin",
                "admin_level": 1,
                "ai_credits": 999999,
                "is_unlimited": True,
                "can_access_management": True
            }
    except Exception:
        pass

    # 2. Tra cứu người dùng từ Database
    user = get_user_by_token(token)
    if user:
        clean_email = str(user.get('email', '')).strip().lower()
        is_admin = (
            user.get('role') in ('manager', 'admin', 'developer')
            or user.get('account_type') in ('admin', 'developer')
        )
        default_account_type = (
            'admin' if is_admin
            else ('collaborator' if user.get('role') == 'collaborator' else 'user')
        )
        user.setdefault('account_type', default_account_type)
        default_level = 1 if (user.get('role') == 'developer' or user.get('account_type') == 'developer') else (2 if is_admin else 0)
        user.setdefault('admin_level', default_level)
        if clean_email in DEVELOPER_EMAILS or user.get('role') == 'developer' or user.get('account_type') == 'developer':
            is_sandbox_active = bool(user.get('is_sandbox'))
            user.update({
                'role': 'developer',
                'account_type': 'developer',
                'admin_level': 1,
                'is_developer': True,
                'is_sandbox': is_sandbox_active,
                'sandbox_unlimited_payment': is_sandbox_active,
                'ai_credits': int(user.get('sandbox_ai_credits') or 0) if is_sandbox_active else 999999,
                'is_unlimited': not is_sandbox_active
            })
        elif clean_email in SUPER_ADMIN_EMAILS:
            user.update({
                'role': 'manager',
                'account_type': 'admin',
                'admin_level': 1,
                'is_developer': False,
                'is_sandbox': False,
                'sandbox_unlimited_payment': False,
                'ai_credits': 999999,
                'is_unlimited': True
            })
        else:
            user['is_developer'] = False
            user['is_sandbox'] = False
            user['sandbox_unlimited_payment'] = False
        user['can_access_management'] = has_management_access(user)
    return user

def login_required(f):
    """Decorator bắt buộc người dùng phải đăng nhập hợp lệ."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user_from_request()
        if not user:
            return jsonify({
                "status": "error",
                "code": "UNAUTHORIZED",
                "message": "Vui lòng đăng nhập để thực hiện chức năng này."
            }), 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def role_required(required_role: str):
    """Decorator kiểm tra vai trò người dùng."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user_from_request()
            if not user:
                return jsonify({
                    "status": "error",
                    "code": "UNAUTHORIZED",
                    "message": "Vui lòng đăng nhập để thực hiện chức năng này."
                }), 401
            # Quản trị viên và Nhà phát triển có toàn quyền truy cập
            user_role = user.get("role")
            if user_role != required_role and not is_admin_or_developer(user):
                return jsonify({
                    "status": "error",
                    "code": "FORBIDDEN",
                    "message": "Bạn không có quyền truy cập vào tài nguyên này."
                }), 403
            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def permission_required(permission: str):
    """Enforce administrator capabilities on the server, regardless of UI state."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user_from_request()
            if not user:
                return jsonify({"status": "error", "code": "UNAUTHORIZED", "message": "Đăng nhập để tiếp tục."}), 401
            is_admin = is_admin_or_developer(user)
            level = int(
                user.get('admin_level')
                or (1 if (user.get('role') in ('admin', 'developer') or user.get('account_type') == 'developer') else (2 if user.get('role') == 'manager' else 0))
            )
            allowed = is_admin and (
                permission in ('users', 'articles', 'chat') or (permission == 'full' and level == 1)
            )
            if not allowed:
                return jsonify({"status": "error", "code": "FORBIDDEN", "message": "Tài khoản không có quyền thực hiện thao tác này."}), 403
            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator
