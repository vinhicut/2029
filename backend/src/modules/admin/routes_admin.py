import os
import sqlite3
from flask import Blueprint, request, jsonify, g, send_from_directory
from modules.auth.auth import permission_required
from core.config import CHART_IMAGE_DIR
from core.db import (
    admin_get_users,
    admin_get_user_detail,
    admin_get_charts,
    admin_get_stats,
    admin_create_user,
    admin_update_user,
    admin_delete_user
)
from core.customer_store import (
    delete_customer_account,
    delete_customer_chart_log,
    get_customer_chart_image_filename,
    list_chart_logs_by_emails,
    list_customer_accounts,
    list_customer_chart_logs,
)
from modules.articles.repository import (
    create_admin_article,
    delete_admin_article,
    list_admin_articles,
    save_article_image,
    update_admin_article,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

@admin_bp.route("/users", methods=["GET"])
@permission_required("users")
def list_users():
    """Xem danh sách toàn bộ người dùng trong hệ thống (Dành cho Quản lý)."""
    limit = min(int(request.args.get("limit", 50)), 200)
    users = admin_get_users(limit=limit)
    return jsonify({
        "status": "success",
        "total": len(users),
        "data": users
    }), 200


@admin_bp.route("/users/<user_id>", methods=["GET"])
@permission_required("users")
def get_user_detail(user_id):
    user = admin_get_user_detail(user_id)
    if not user:
        return jsonify({"status": "error", "message": "Không tìm thấy người dùng."}), 404
    return jsonify({"status": "success", "data": user}), 200

@admin_bp.route("/referral-chart-logs", methods=["GET"])
@permission_required("users")
def list_referred_user_chart_logs():
    """Return chart history for referred accounts in a collaborator detail popup."""
    raw_emails = str(request.args.get("emails") or "")
    emails = [e.strip().lower() for e in raw_emails.split(",") if e.strip()][:200]
    rows = list_chart_logs_by_emails(emails)
    return jsonify({"status": "success", "data": rows}), 200


@admin_bp.route("/users", methods=["POST"])
@permission_required("users")
def create_user():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email') or '').strip().lower()
    name = str(data.get('name') or '').strip()
    account_type = data.get('account_type', 'user')
    if not email or '@' not in email or not name or account_type not in ('user', 'collaborator', 'admin'):
        return jsonify({"status": "error", "message": "Họ tên, email hợp lệ và loại tài khoản là bắt buộc."}), 400
    if account_type == 'admin' and int(g.current_user.get('admin_level') or 2) != 1:
        return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được tạo tài khoản quản trị."}), 403
    try:
        user = admin_create_user(email, name, account_type)
    except Exception as error:
        return jsonify({"status": "error", "message": str(error) or "Không thể tạo người dùng."}), 409
    return jsonify({"status": "success", "data": user}), 201


@admin_bp.route("/users/<user_id>", methods=["PUT", "DELETE"])
@permission_required("users")
def update_or_delete_user(user_id):
    current = g.current_user
    current_level = int(current.get('admin_level') or 2)
    target = admin_get_user_detail(user_id)
    if not target:
        return jsonify({"status": "error", "message": "Không tìm thấy người dùng."}), 404
    if request.method == 'DELETE':
        if str(current.get('id')) == str(user_id):
            return jsonify({"status": "error", "message": "Không thể xóa tài khoản đang đăng nhập."}), 400
        if int(target.get('admin_level') or 0) == 1 and current_level != 1:
            return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được quản lý tài khoản Admin 1."}), 403
        admin_delete_user(user_id)
        return jsonify({"status": "success"}), 200

    updates = request.get_json(silent=True) or {}
    # A role change away from admin can arrive with a stale admin_level from
    # clients that submit the full user form. The database resets it to 0.
    if updates.get('account_type') in ('user', 'collaborator'):
        updates.pop('admin_level', None)
    if updates.get('account_type') == 'admin' and current_level != 1:
        return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được tạo hoặc phân quyền tài khoản quản trị."}), 403
    if 'admin_level' in updates and current_level != 1:
        return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được đổi cấp quản trị."}), 403
    if 'admin_level' in updates:
        try:
            updates['admin_level'] = int(updates['admin_level'])
        except (TypeError, ValueError):
            return jsonify({"status": "error", "message": "Cấp quản trị phải là 1, 2 hoặc 3."}), 400
        if updates['admin_level'] not in (1, 2, 3) or updates.get('account_type', target.get('account_type')) != 'admin':
            return jsonify({"status": "error", "message": "Cấp quản trị chỉ áp dụng cho tài khoản admin."}), 400
    if str(current.get('id')) == str(user_id) and updates.get('account_type', target.get('account_type')) != 'admin':
        return jsonify({"status": "error", "message": "Không thể tự hạ quyền tài khoản đang đăng nhập."}), 400
    if int(target.get('admin_level') or 0) == 1 and current_level != 1:
        return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được sửa tài khoản Admin 1."}), 403
    try:
        user = admin_update_user(user_id, updates)
    except ValueError as error:
        return jsonify({"status": "error", "message": str(error)}), 400
    return jsonify({"status": "success", "data": user}), 200

@admin_bp.route("/charts", methods=["GET"])
@permission_required("full")
def list_charts():
    """Xem danh sách toàn bộ lá số đã lưu trên website (Dành cho Quản lý)."""
    limit = min(int(request.args.get("limit", 50)), 200)
    charts = admin_get_charts(limit=limit)
    return jsonify({
        "status": "success",
        "total": len(charts),
        "data": charts
    }), 200

@admin_bp.route("/stats", methods=["GET"])
@permission_required("full")
def get_stats():
    """Xem thống kê tổng quan hệ thống (Dành cho Quản lý)."""
    stats = admin_get_stats()
    return jsonify({
        "status": "success",
        "data": stats
    }), 200

@admin_bp.route("/customer-logs/charts", methods=["GET"])
@permission_required("full")
def list_customer_chart_logs_route():
    limit = request.args.get("limit", 50, type=int) or 50
    offset = request.args.get("offset", 0, type=int) or 0
    rows = list_customer_chart_logs(limit=limit, offset=offset)
    return jsonify({"status": "success", "data": rows}), 200


@admin_bp.route("/customer-logs/charts/<int:chart_id>", methods=["DELETE"])
@permission_required("full")
def delete_customer_chart_log_route(chart_id):
    if chart_id < 1:
        return jsonify({"status": "error", "message": "Mã lá số không hợp lệ."}), 400
    if not delete_customer_chart_log(chart_id):
        return jsonify({"status": "error", "message": "Không tìm thấy bản ghi lá số."}), 404
    return jsonify({"status": "success", "message": "Đã xóa bản ghi lá số."}), 200


@admin_bp.route("/customer-accounts", methods=["GET"])
@permission_required("full")
def list_google_customer_accounts():
    limit = request.args.get("limit", 100, type=int) or 100
    rows = list_customer_accounts(limit=limit)
    return jsonify({"status": "success", "data": rows}), 200


@admin_bp.route("/customer-accounts/<int:account_id>", methods=["DELETE"])
@permission_required("full")
def delete_google_customer_account(account_id):
    if account_id < 1:
        return jsonify({"status": "error", "message": "Mã tài khoản không hợp lệ."}), 400
    if not delete_customer_account(account_id):
        return jsonify({"status": "error", "message": "Không tìm thấy tài khoản khách hàng."}), 404
    return jsonify({"status": "success", "message": "Đã xóa tài khoản khách hàng."}), 200


@admin_bp.route("/customer-logs/charts/<int:chart_id>/image", methods=["GET"])
@permission_required("full")
def get_customer_chart_image(chart_id):
    filename = get_customer_chart_image_filename(chart_id)
    if not filename:
        return jsonify({"status": "error", "message": "Bản ghi này chưa có ảnh lá số."}), 404
    target = os.path.join(CHART_IMAGE_DIR, filename)
    if not os.path.isfile(target):
        return jsonify({"status": "error", "message": "Không tìm thấy tệp ảnh lá số."}), 404
    return send_from_directory(CHART_IMAGE_DIR, filename, mimetype="image/jpeg")


@admin_bp.route("/articles", methods=["GET", "POST"])
@permission_required("articles")
def manage_articles():
    if request.method == "GET":
        return jsonify({"status": "success", "data": list_admin_articles()}), 200

    payload = request.get_json(silent=True) or {}
    author_name = str(g.current_user.get("name") or "Quản trị viên")
    try:
        created = create_admin_article(payload, author_name)
        return jsonify({"status": "success", "data": created}), 201
    except ValueError as err:
        return jsonify({"status": "error", "message": str(err)}), 400
    except OverflowError as err:
        return jsonify({"status": "error", "message": str(err)}), 400
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "Đường dẫn này đã được dùng. Hãy đổi slug bài viết."}), 409


@admin_bp.route("/articles/<int:article_id>", methods=["PUT", "DELETE"])
@permission_required("articles")
def update_article(article_id):
    if article_id < 1:
        return jsonify({"status": "error", "message": "Mã bài viết không hợp lệ."}), 400

    if request.method == "DELETE":
        if not delete_admin_article(article_id):
            return jsonify({"status": "error", "message": "Không tìm thấy bài viết."}), 404
        return jsonify({"status": "success"}), 200

    payload = request.get_json(silent=True) or {}
    author_name = str(g.current_user.get("name") or "Quản trị viên")
    try:
        updated = update_admin_article(article_id, payload, author_name)
        if not updated:
            return jsonify({"status": "error", "message": "Không tìm thấy bài viết."}), 404
        return jsonify({"status": "success", "data": updated}), 200
    except ValueError as err:
        return jsonify({"status": "error", "message": str(err)}), 400
    except OverflowError as err:
        return jsonify({"status": "error", "message": str(err)}), 400
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "Đường dẫn này đã được dùng. Hãy đổi slug bài viết."}), 409


@admin_bp.route("/article-images", methods=["POST"])
@permission_required("articles")
def upload_article_image():
    payload = request.get_json(silent=True) or {}
    try:
        url = save_article_image(payload.get("image_data") or "")
        return jsonify({"status": "success", "data": {"url": url}}), 201
    except ValueError as err:
        return jsonify({"status": "error", "message": str(err)}), 400
    except OverflowError as err:
        return jsonify({"status": "error", "message": str(err)}), 413

@admin_bp.route("/sessions", methods=["GET"])
@permission_required("full")
def api_admin_sessions():
    try:
        from modules.admin.admin_db import get_admin_sessions
        sessions = get_admin_sessions()
        return jsonify({"status": "success", "data": sessions}), 200
    except Exception:
        return jsonify({"status": "success", "data": []}), 200
