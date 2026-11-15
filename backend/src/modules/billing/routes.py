# -*- coding: utf-8 -*-
"""
Routes for Billing & SePay Gateway module.
"""

from flask import Blueprint, request, jsonify, g
from modules.auth.auth import (
    get_current_user_from_request,
    get_token_from_request,
    is_developer_user,
    login_required,
)
from .service import billing_service

billing_bp = Blueprint("billing", __name__, url_prefix="/api/billing")


@billing_bp.route("/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}
    user = get_current_user_from_request()
    is_sandbox = bool(user and user.get("is_sandbox"))
    if is_sandbox:
        if not is_developer_user(user):
            return jsonify({
                "status": "error",
                "code": "FORBIDDEN",
                "message": "Không có quyền tạo đơn hàng giả lập."
            }), 403
        data["user_id"] = str(user["id"])

    success, msg, order_data = billing_service.create_order(data, is_sandbox=is_sandbox)
    if not success:
        return jsonify({
            "status": "error",
            "message": msg,
            "code": "CREATE_ORDER_FAILED"
        }), 400

    return jsonify({
        "status": "success",
        "message": msg,
        "data": order_data
    }), 201


@billing_bp.route("/sandbox/confirm", methods=["POST"])
@login_required
def confirm_sandbox_payment():
    """Xác nhận thanh toán giả lập (Sandbox) — bắt buộc quyền Developer và phiên Sandbox đang bật."""
    if not is_developer_user(g.current_user):
        return jsonify({
            "status": "error",
            "code": "FORBIDDEN",
            "message": "Chỉ tài khoản Nhà phát triển mới có quyền thực hiện giao dịch giả lập."
        }), 403

    if not g.current_user.get("is_sandbox"):
        return jsonify({
            "status": "error",
            "code": "SANDBOX_INACTIVE",
            "message": "Vui lòng kích hoạt Chế độ giả lập trước khi thực hiện giao dịch thử nghiệm."
        }), 403

    token = get_token_from_request()
    data = request.get_json(silent=True) or {}
    order_code = data.get("order_code")
    success, msg, result_data = billing_service.confirm_sandbox_order(
        order_code=order_code,
        user_id=str(g.current_user["id"]),
        session_token=token
    )
    if not success:
        return jsonify({
            "status": "error",
            "message": msg,
            "code": "SANDBOX_CONFIRM_FAILED"
        }), 400

    return jsonify({
        "status": "success",
        "message": msg,
        "data": result_data
    }), 200


@billing_bp.route("/orders/<identifier>/status", methods=["GET"])
def get_order_status(identifier):
    status_data = billing_service.get_order_status(identifier)
    if not status_data:
        return jsonify({
            "status": "error",
            "message": f"Không tìm thấy đơn hàng '{identifier}'.",
            "code": "ORDER_NOT_FOUND"
        }), 404

    return jsonify({
        "status": "success",
        "data": status_data
    }), 200


@billing_bp.route("/webhook", methods=["POST"])
@billing_bp.route("/sepay/webhook", methods=["POST"])
def sepay_webhook():
    auth_header = request.headers.get("Authorization")
    api_key_query = request.args.get("api_key")

    if not billing_service.verify_webhook_auth(auth_header, api_key_query):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    success, msg, code = billing_service.process_sepay_webhook(data)
    return jsonify({
        "success": success,
        "message": msg
    }), code


@billing_bp.route("/config", methods=["GET"])
def get_config():
    cfg = billing_service.get_bank_config()
    return jsonify({
        "status": "success",
        "data": cfg
    }), 200
