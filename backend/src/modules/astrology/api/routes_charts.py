from modules.auth.admin_auth import ADMIN_SESSIONS
import logging
import sys
import os
from flask import Blueprint, request, jsonify, g
from modules.auth.auth import login_required, get_current_user_from_request
from core.customer_store import (
    list_chart_logs_by_emails,
    list_my_chart_logs,
    save_customer_chart_log,
    upsert_customer_account,
)
from core.db import (
    admin_get_user_detail,
    save_user_chart,
    get_latest_user_chart,
    get_user_charts_list,
    delete_user_chart,
    get_user_chart_by_id,
    update_chart_reading
)
from modules.astrology.engine import calculate_tuvi_chart
logger = logging.getLogger(__name__)
charts_bp = Blueprint("charts", __name__, url_prefix="/api")

@charts_bp.route("/calculate", methods=["POST"])

def calculate_chart():
    """
    Endpoint tính toán và an sao Tử Vi Đẩu Số (Core Algorithm).
    Duy trì 100% tương thích ngược với API hiện hữu.
    """
    try:
        params = request.get_json(silent=True) or {}
        chart_result = calculate_tuvi_chart(params)
        return jsonify(chart_result), 200
    except Exception:
        logger.exception("Lỗi tính toán lá số Tử Vi")
        return jsonify({
            "error": "INVALID_CHART_PARAMETERS",
            "message": "Không thể tính toán lá số với tham số đã cung cấp."
        }), 400

@charts_bp.route("/user/charts", methods=["POST"])
@login_required

def save_chart_endpoint():
    """
    Endpoint lưu dữ liệu lá số vào cơ sở dữ liệu có cấu trúc cố định.
    Yêu cầu người dùng đã đăng nhập (User hoặc Manager).
    """
    data = request.get_json(silent=True) or {}
    user_id = g.current_user["id"]
    chart_code = str(data.get("chart_code") or "").strip()
    ho_ten = str(data.get("ho_ten") or data.get("name") or "").strip() or "Vô Danh"
    gioi_tinh = str(data.get("gioi_tinh") or data.get("gender") or "Nam").strip()

    ngay_sinh = data.get("ngay_sinh")
    thang_sinh = data.get("thang_sinh")
    nam_sinh = data.get("nam_sinh")
    birth_date = data.get("birth_date") or data.get("solarDate") or ""
    if (not ngay_sinh or not thang_sinh or not nam_sinh) and birth_date:
        try:
            if "-" in str(birth_date):
                parts = [int(p) for p in str(birth_date).split("-")]
                if len(parts) == 3:
                    if parts[0] > 1000:
                        nam_sinh, thang_sinh, ngay_sinh = parts[0], parts[1], parts[2]
                    else:
                        ngay_sinh, thang_sinh, nam_sinh = parts[0], parts[1], parts[2]
            elif "/" in str(birth_date):
                parts = [int(p) for p in str(birth_date).split("/")]
                if len(parts) == 3:
                    if parts[2] > 1000:
                        ngay_sinh, thang_sinh, nam_sinh = parts[0], parts[1], parts[2]
        except Exception:
            pass

    ngay_sinh = int(ngay_sinh or 1)
    thang_sinh = int(thang_sinh or 1)
    nam_sinh = int(nam_sinh or 2000)
    gio_sinh = int(data.get("gio_sinh") or data.get("birth_hour") or 0)
    phut_sinh = int(data.get("phut_sinh") or data.get("birth_minute") or 0)
    loai_lich = str(data.get("loai_lich") or data.get("calendar_type") or "duong_lich").strip()
    thang_nhuan = 1 if (data.get("thang_nhuan") or data.get("is_leap_month") or data.get("isLeapMonth")) else 0
    nam_xem_han = int(data.get("nam_xem_han") or data.get("view_year") or data.get("limitYear") or 2026)
    input_data = data.get("input_data") or {}
    chart_data = data.get("chart_data") or {}
    if not chart_code:
        chart_code = f"HA-{nam_sinh}{thang_sinh:02d}{ngay_sinh:02d}"
    admin_token = request.headers.get("X-Admin-Token", "")
    created_by_admin = False
    admin_session_id = None
    if admin_token and admin_token in ADMIN_SESSIONS:
        created_by_admin = True
        admin_session_id = ADMIN_SESSIONS[admin_token]["session_id"]
    try:
        reading_markdown = data.get("reading_markdown")
        saved_record = save_user_chart(
            user_id=user_id,
            chart_code=chart_code,
            created_by_admin_test=created_by_admin,
            admin_session_id=admin_session_id,
            ho_ten=ho_ten,
            gioi_tinh=gioi_tinh,
            ngay_sinh=ngay_sinh,
            thang_sinh=thang_sinh,
            nam_sinh=nam_sinh,
            gio_sinh=gio_sinh,
            phut_sinh=phut_sinh,
            loai_lich=loai_lich,
            thang_nhuan=thang_nhuan,
            nam_xem_han=nam_xem_han,
            input_data=input_data,
            chart_data=chart_data,
            reading_markdown=reading_markdown
        )
        return jsonify({
            "status": "success",
            "message": f"Đã lưu thành công lá số {chart_code} của {ho_ten} lên website!",
            "data": saved_record
        }), 201
    except Exception:
        logger.exception("Lỗi khi lưu dữ liệu lá số")
        return jsonify({
            "status": "error",
            "message": "Không thể lưu dữ liệu lá số lúc này."
        }), 500

@charts_bp.route("/user/charts/latest", methods=["GET"])
@login_required

def get_latest_chart_endpoint():
    """
    Endpoint truy xuất lá số đã lưu gần nhất của người dùng hiện tại
    để phục vụ tính năng auto-fill khi tải lại trang.
    """
    user_id = g.current_user["id"]
    try:
        latest = get_latest_user_chart(user_id)
        if not latest:
            return jsonify({
                "status": "success",
                "message": "Chưa có lá số nào được lưu trước đó.",
                "data": None
            }), 200
        return jsonify({
            "status": "success",
            "message": "Đã tìm thấy lá số gần nhất.",
            "data": latest
        }), 200
    except Exception:
        logger.exception("Lỗi khi truy xuất lá số gần nhất")
        return jsonify({
            "status": "error",
            "message": "Không thể truy xuất lá số gần nhất."
        }), 500

@charts_bp.route("/user/charts", methods=["GET"])
@login_required

def get_user_charts_endpoint():
    """Lấy danh sách các lá số người dùng đã lưu."""
    user_id = g.current_user["id"]
    limit = min(int(request.args.get("limit", 50)), 100)
    offset = int(request.args.get("offset", 0))
    try:
        charts = get_user_charts_list(user_id, limit=limit, offset=offset)
        return jsonify({
            "status": "success",
            "data": charts,
            "charts": charts,
            "total": len(charts)
        }), 200
    except Exception:
        logger.exception("Lỗi khi tải danh sách lá số")
        return jsonify({
            "status": "error",
            "message": "Không thể tải danh sách lá số."
        }), 500

@charts_bp.route("/user/charts/<chart_id>", methods=["GET"])
@login_required

def get_single_user_chart_endpoint(chart_id):
    """Truy xuất chi tiết một lá số theo ID của người dùng hiện tại."""
    user_id = g.current_user["id"]
    try:
        chart = get_user_chart_by_id(user_id, chart_id)
        if not chart:
            return jsonify({
                "status": "error",
                "message": "Không tìm thấy lá số hoặc bạn không có quyền truy cập."
            }), 404
        return jsonify({
            "status": "success",
            "data": chart
        }), 200
    except Exception:
        logger.exception("Lỗi khi tải chi tiết lá số")
        return jsonify({
            "status": "error",
            "message": "Không thể tải chi tiết lá số."
        }), 500

@charts_bp.route("/user/charts/<chart_id>", methods=["DELETE"])
@login_required

def delete_user_chart_endpoint(chart_id):
    """Xóa một lá số khỏi lịch sử tài khoản."""
    user_id = g.current_user["id"]
    try:
        success = delete_user_chart(user_id, chart_id)
        if not success:
            return jsonify({
                "status": "error",
                "message": "Không thể xóa lá số. Bản ghi không tồn tại hoặc bạn không có quyền sở hữu."
            }), 404
        return jsonify({
            "status": "success",
            "message": "Đã xóa lá số khỏi lịch sử tài khoản thành công."
        }), 200
    except Exception:
        logger.exception("Lỗi khi xóa lá số")
        return jsonify({
            "status": "error",
            "message": "Không thể xóa lá số lúc này."
        }), 500
@charts_bp.route("/user/charts/<chart_id>/reading", methods=["PUT", "POST"])
@login_required
def update_chart_reading_endpoint(chart_id):
    """Cập nhật bài luận giải AI vào một lá số đã lưu cụ thể."""
    user_id = g.current_user["id"]
    data = request.get_json(silent=True) or {}
    reading_markdown = data.get("reading_markdown")
    if not reading_markdown:
        return jsonify({"status": "error", "message": "Thiếu nội dung reading_markdown"}), 400
    try:
        ok = update_chart_reading(user_id=user_id, chart_code="", reading_markdown=reading_markdown, chart_id=chart_id)
        if ok:
            return jsonify({"status": "success", "message": "Đã lưu bài luận giải vào lá số thành công."}), 200
        return jsonify({"status": "error", "message": "Không tìm thấy lá số để cập nhật bài luận."}), 404
    except Exception:
        logger.exception("Lỗi khi cập nhật bài luận giải")
        return jsonify({"status": "error", "message": "Không thể lưu bài luận giải."}), 500

@charts_bp.route("/user/charts/reading", methods=["POST"])
@login_required
def update_latest_or_code_reading_endpoint():
    """Cập nhật bài luận giải theo chart_code hoặc lá số mới nhất."""
    user_id = g.current_user["id"]
    data = request.get_json(silent=True) or {}
    reading_markdown = data.get("reading_markdown")
    chart_code = str(data.get("chart_code") or "").strip()
    if not reading_markdown:
        return jsonify({"status": "error", "message": "Thiếu nội dung reading_markdown"}), 400
    try:
        ok = update_chart_reading(user_id=user_id, chart_code=chart_code, reading_markdown=reading_markdown)
        if ok:
            return jsonify({"status": "success", "message": "Đã lưu bài luận giải vào lá số thành công."}), 200
        return jsonify({"status": "error", "message": "Không tìm thấy lá số để cập nhật bài luận."}), 404
    except Exception:
        logger.exception("Lỗi khi cập nhật bài luận giải theo mã lá số")
        return jsonify({"status": "error", "message": "Không thể lưu bài luận giải."}), 500


@charts_bp.route("/customer-accounts/sync", methods=["POST"])
@login_required
def customer_accounts_sync_alias():
    customer_id = upsert_customer_account(g.current_user, login_increment=1)
    return jsonify({
        "status": "success",
        "data": {"customer_id": customer_id, "email": g.current_user.get("email", "")}
    }), 200


@charts_bp.route("/customer-logs/charts", methods=["POST"])
def create_customer_chart_log_endpoint():
    """Lưu log lá số và ảnh JPEG do khách lập (thống nhất từ backend-node)."""
    data = request.get_json(silent=True) or {}
    input_data = data.get("input_data")
    if not isinstance(input_data, dict):
        return jsonify({"status": "error", "message": "Thiếu dữ liệu hợp lệ của lá số."}), 400

    auth_header = request.headers.get("Authorization", "")
    user = None
    if auth_header:
        user = get_current_user_from_request()
        if not user:
            return jsonify({"status": "error", "message": "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."}), 401

    try:
        saved = save_customer_chart_log(
            input_data=input_data,
            chart_code=data.get("chart_code"),
            encoded_image=data.get("image_data") or "",
            user=user,
        )
        return jsonify({"status": "success", "data": saved}), 201
    except ValueError as err:
        return jsonify({"status": "error", "message": str(err)}), 400
    except OverflowError as err:
        return jsonify({"status": "error", "message": str(err)}), 413
    except Exception:
        return jsonify({"status": "error", "message": "Không thể lưu thông tin lá số."}), 500


@charts_bp.route("/customer-logs/my-charts", methods=["GET"])
@login_required
def get_my_customer_chart_logs():
    rows = list_my_chart_logs(g.current_user.get("email", ""))
    return jsonify({"status": "success", "data": rows}), 200


@charts_bp.route("/customer-logs/my-referred-charts", methods=["GET"])
@login_required
def get_my_referred_customer_chart_logs():
    profile = admin_get_user_detail(str(g.current_user["id"]))
    if not profile or profile.get("account_type") != "collaborator":
        return jsonify({"status": "error", "message": "Tài khoản không phải cộng tác viên."}), 403
    emails = [str(account.get("email") or "").strip().lower() for account in profile.get("referred_accounts", [])]
    rows = list_chart_logs_by_emails(emails)
    return jsonify({"status": "success", "data": rows}), 200
