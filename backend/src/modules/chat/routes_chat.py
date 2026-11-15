from flask import Blueprint, g, jsonify, request

from core.customer_store import (
    get_admin_chat_messages,
    get_customer_chat_messages,
    list_admin_chat_conversations,
    post_admin_chat_message,
    post_customer_chat_message,
)
from modules.auth.auth import login_required, permission_required

chat_bp = Blueprint("chat", __name__, url_prefix="/api")


@chat_bp.route("/chat/messages", methods=["GET", "POST"])
@login_required
def customer_chat_messages():
    if request.method == "GET":
        messages = get_customer_chat_messages(g.current_user)
        return jsonify({"status": "success", "data": messages}), 200

    data = request.get_json(silent=True) or {}
    message = str(data.get("message") or "").strip()
    if not message or len(message) > 2000:
        return jsonify({"status": "error", "message": "Tin nhắn cần có từ 1 đến 2000 ký tự."}), 400

    saved = post_customer_chat_message(g.current_user, message)
    return jsonify({"status": "success", "data": saved}), 201


@chat_bp.route("/admin/chat/conversations", methods=["GET"])
@permission_required("chat")
def admin_chat_conversations():
    rows = list_admin_chat_conversations()
    return jsonify({"status": "success", "data": rows}), 200


@chat_bp.route("/admin/chat/conversations/<int:customer_id>/messages", methods=["GET", "POST"])
@permission_required("chat")
def admin_chat_messages(customer_id: int):
    if customer_id < 1:
        return jsonify({"status": "error", "message": "Tài khoản không hợp lệ."}), 400

    if request.method == "GET":
        messages = get_admin_chat_messages(customer_id)
        return jsonify({"status": "success", "data": messages}), 200

    data = request.get_json(silent=True) or {}
    message = str(data.get("message") or "").strip()
    if not message or len(message) > 2000:
        return jsonify({"status": "error", "message": "Tin nhắn cần có từ 1 đến 2000 ký tự."}), 400

    manager_name = str(g.current_user.get("name") or "Quản trị viên")
    saved = post_admin_chat_message(customer_id, manager_name, message)
    return jsonify({"status": "success", "data": saved}), 201
