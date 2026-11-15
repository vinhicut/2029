import os
from flask import Blueprint, request, jsonify, g, make_response
from core.customer_store import (
    list_chart_logs_by_emails,
    list_my_chart_logs,
    upsert_customer_account,
)
from core.db import (
    admin_get_user_detail,
    delete_user_account_self,
    export_user_personal_data,
    get_public_admin_presence,
    set_session_sandbox_mode,
    set_user_busy,
)
from modules.auth.auth import (
    verify_google_id_token,
    issue_user_session,
    is_admin_or_developer,
    is_developer_user,
    get_token_from_request,
    login_required,
    delete_session,
    get_current_user_from_request
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

PUBLIC_CONSULTATION_EMAILS = (
    "kingcobraatnight@gmail.com",
    "tuyetnt511@gmail.com",
)

@auth_bp.route("/public/admin-presence", methods=["GET"])
def public_admin_presence():
    return jsonify({"status": "success", "data": get_public_admin_presence(PUBLIC_CONSULTATION_EMAILS)}), 200

@auth_bp.route("/customer-accounts/sync", methods=["POST"])
@login_required
def sync_customer_account():
    customer_id = upsert_customer_account(g.current_user, login_increment=1)
    return jsonify({
        "status": "success",
        "data": {"customer_id": customer_id, "email": g.current_user.get("email", "")}
    }), 200

@auth_bp.route("/google", methods=["POST"])
def auth_google():
    """Endpoint nhận Google ID token từ client và cấp phiên đăng nhập."""
    data = request.get_json(silent=True) or {}
    credential = data.get("credential")

    if not credential:
        return jsonify({
            "status": "error",
            "message": "Không tìm thấy thông tin đăng nhập Google (credential)."
        }), 400

    success, user_info, err_msg = verify_google_id_token(credential)
    if not success or not user_info:
        return jsonify({
            "status": "error",
            "message": err_msg or "Xác thực tài khoản Google thất bại."
        }), 401

    session_res = issue_user_session(user_info, referral_code=data.get("referral_code"))
    resp = make_response(jsonify({
        "status": "success",
        "message": f"Chào mừng {session_res['user']['name']} đã đăng nhập thành công!",
        "token": session_res["token"],
        "expires_at": session_res["expires_at"],
        "user": session_res["user"]
    }), 200)
    is_https = request.is_secure or request.headers.get("X-Forwarded-Proto", "").lower() == "https"
    resp.set_cookie(
        "tuvi_token",
        session_res["token"],
        max_age=30 * 24 * 3600,
        httponly=True,
        secure=is_https,
        samesite="Lax",
        path="/"
    )
    return resp

@auth_bp.route("/me", methods=["GET"])
@login_required
def auth_me():
    """Lấy thông tin người dùng hiện tại từ session token."""
    return jsonify({
        "status": "success",
        "user": g.current_user
    }), 200


@auth_bp.route("/sandbox", methods=["POST"])
@login_required
def toggle_developer_sandbox():
    """Bật/tắt chế độ giả lập người dùng (Sandbox Mode) — chỉ dành cho tài khoản Developer hợp lệ."""
    if not is_developer_user(g.current_user):
        return jsonify({
            "status": "error",
            "code": "FORBIDDEN",
            "message": "Chỉ tài khoản Nhà phát triển mới có quyền kích hoạt chế độ giả lập."
        }), 403

    token = get_token_from_request()
    if not token:
        return jsonify({
            "status": "error",
            "code": "UNAUTHORIZED",
            "message": "Không tìm thấy phiên làm việc hợp lệ."
        }), 401

    data = request.get_json(silent=True) or {}
    enabled = data.get("enabled")
    if not isinstance(enabled, bool):
        return jsonify({
            "status": "error",
            "message": "Tham số 'enabled' phải là kiểu boolean."
        }), 400

    sandbox_state = set_session_sandbox_mode(token, enabled)
    if sandbox_state is None:
        return jsonify({
            "status": "error",
            "message": "Không thể cập nhật trạng thái giả lập cho phiên làm việc này."
        }), 400

    updated_user = get_current_user_from_request()
    return jsonify({
        "status": "success",
        "message": (
            "Đã kích hoạt Chế độ giả lập (Sandbox Mode). Số dư dịch vụ được đặt về 0."
            if enabled
            else "Đã thoát Chế độ giả lập và khôi phục trạng thái Nhà phát triển."
        ),
        "sandbox": sandbox_state,
        "user": updated_user
    }), 200

@auth_bp.route("/profile/details", methods=["GET"])
@login_required
def auth_profile_details():
    """Return profile details for the authenticated user only."""
    profile = admin_get_user_detail(str(g.current_user["id"]))
    if not profile:
        return jsonify({"status": "error", "message": "Không tìm thấy hồ sơ người dùng."}), 404
    return jsonify({"status": "success", "data": profile}), 200

@auth_bp.route("/profile/busy", methods=["PUT"])
@login_required
def update_profile_busy():
    current = g.current_user
    if current.get('account_type') != 'admin' and current.get('role') not in ('manager', 'admin'):
        return jsonify({"status": "error", "message": "Chỉ tài khoản Admin mới có trạng thái bận."}), 403
    data = request.get_json(silent=True) or {}
    if not isinstance(data.get('is_busy'), bool):
        return jsonify({"status": "error", "message": "Trạng thái bận không hợp lệ."}), 400
    user = set_user_busy(current['id'], data['is_busy'])
    if not user:
        return jsonify({"status": "error", "message": "Không tìm thấy tài khoản."}), 404
    return jsonify({"status": "success", "data": {"is_busy": bool(user.get('is_busy'))}}), 200

@auth_bp.route("/profile/chart-logs", methods=["GET"])
@login_required
def auth_profile_chart_logs():
    """Return legacy chart selection logs for the authenticated account."""
    rows = list_my_chart_logs(g.current_user.get("email", ""))
    return jsonify({"status": "success", "data": rows}), 200

@auth_bp.route("/profile/referred-emails", methods=["GET"])
@login_required
def auth_profile_referred_emails():
    """Expose only this collaborator's referred account emails to the customer API."""
    profile = admin_get_user_detail(str(g.current_user["id"]))
    if not profile or profile.get("account_type") != "collaborator":
        return jsonify({"status": "error", "message": "Tài khoản không phải cộng tác viên."}), 403
    emails = [str(account.get("email") or "").strip().lower() for account in profile.get("referred_accounts", [])]
    return jsonify({"status": "success", "data": {"emails": [email for email in emails if email]}}), 200

@auth_bp.route("/profile/referred-chart-logs", methods=["GET"])
@login_required
def auth_profile_referred_chart_logs():
    """Return chart history belonging to accounts referred by the current collaborator."""
    profile = admin_get_user_detail(str(g.current_user["id"]))
    if not profile or profile.get("account_type") != "collaborator":
        return jsonify({"status": "error", "message": "Tài khoản không phải cộng tác viên."}), 403
    emails = [str(account.get("email") or "").strip().lower() for account in profile.get("referred_accounts", [])]
    rows = list_chart_logs_by_emails(emails)
    return jsonify({"status": "success", "data": rows}), 200

@auth_bp.route("/logout", methods=["POST"])
def auth_logout():
    """Đăng xuất và hủy token phiên làm việc."""
    token = ""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif request.cookies:
        token = (request.cookies.get("tuvi_token") or "").strip()
    if token:
        delete_session(token)
    resp = make_response(jsonify({
        "status": "success",
        "message": "Đã đăng xuất thành công."
    }), 200)
    resp.delete_cookie("tuvi_token", path="/")
    return resp

@auth_bp.route("/my-data/export", methods=["GET"])
@login_required
def export_my_personal_data():
    """Cho phép chủ thể dữ liệu xuất toàn bộ dữ liệu cá nhân (Điều 9 & 14 NĐ 13/2023/NĐ-CP)."""
    data = export_user_personal_data(g.current_user["id"])
    if not data:
        return jsonify({"status": "error", "message": "Không tìm thấy hồ sơ người dùng."}), 404
    return jsonify({"status": "success", "data": data}), 200

@auth_bp.route("/my-account", methods=["DELETE"])
@login_required
def delete_my_personal_account():
    """Cho phép người dùng tự xóa tài khoản và toàn bộ dữ liệu cá nhân (Điều 16 NĐ 13/2023/NĐ-CP)."""
    if is_admin_or_developer(g.current_user):
        return jsonify({
            "status": "error",
            "message": "Tài khoản Quản trị viên/Nhà phát triển cần thu hồi quyền trước khi xóa."
        }), 403
    data = request.get_json(silent=True) or {}
    if data.get("confirm") is not True:
        return jsonify({
            "status": "error",
            "message": "Vui lòng xác nhận xóa vĩnh viễn tài khoản và dữ liệu."
        }), 400
    deleted = delete_user_account_self(g.current_user["id"])
    if not deleted:
        return jsonify({"status": "error", "message": "Không thể xóa tài khoản hoặc tài khoản không tồn tại."}), 404
    resp = make_response(jsonify({
        "status": "success",
        "message": "Đã xóa vĩnh viễn tài khoản và toàn bộ dữ liệu cá nhân của bạn khỏi hệ thống."
    }), 200)
    resp.delete_cookie("tuvi_token", path="/")
    return resp

@auth_bp.route("/dev-login", methods=["POST"])
def auth_dev_login():
    """Endpoint đăng nhập nhanh thử nghiệm cục bộ (chỉ mở khi ENABLE_DEV_LOGIN=true trên localhost)."""
    dev_enabled = os.getenv("ENABLE_DEV_LOGIN", "false").strip().lower() == "true"
    remote_ip = (request.remote_addr or "").strip()
    forwarded_for = (request.headers.get("X-Forwarded-For") or "").strip()
    is_local_direct = remote_ip in ("127.0.0.1", "::1") and not forwarded_for
    if not dev_enabled or not is_local_direct:
        return jsonify({
            "status": "error",
            "code": "FORBIDDEN",
            "message": "Chức năng đăng nhập thử nghiệm đã bị vô hiệu hóa trên môi trường này."
        }), 403

    data = request.get_json(silent=True) or {}
    role = data.get("role", "user")
    if role not in ("user", "manager"):
        role = "user"

    if role == "manager":
        mock_user = {
            "google_id": "dev_manager_id_999",
            "email": "quanly@tuvihongan.com",
            "name": data.get("name", "Quản Lý Tử Vi Hồng Ân"),
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Manager"
        }
    else:
        mock_user = {
            "google_id": "dev_user_id_101",
            "email": "user.demo@tuvihongan.com",
            "name": data.get("name", "Người Dùng Thử Nghiệm"),
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=TuViUser"
        }

    session_res = issue_user_session(mock_user, forced_role=role)
    return jsonify({
        "status": "success",
        "message": f"Đăng nhập thành công với vai trò {role.upper()}!",
        "token": session_res["token"],
        "expires_at": session_res["expires_at"],
        "user": session_res["user"]
    }), 200
