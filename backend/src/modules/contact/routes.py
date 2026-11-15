# -*- coding: utf-8 -*-
"""
Routes for Contact & Booking module.
"""

from flask import Blueprint, request, jsonify
from modules.auth.auth import permission_required
from .service import contact_service

contact_bp = Blueprint("contact", __name__, url_prefix="/api/contact")
booking_bp = Blueprint("booking", __name__, url_prefix="/api/booking")


@contact_bp.route("", methods=["POST"])
def submit_contact():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"status": "error", "message": "Dữ liệu gửi lên không hợp lệ."}), 400

    success, message, sub_id = contact_service.handle_contact_submission(data)
    if not success:
        return jsonify({"status": "error", "message": message, "error": message}), 400

    return jsonify({
        "status": "success",
        "message": message,
        "data": {"id": sub_id}
    }), 200


@contact_bp.route("/booking", methods=["POST"])
@booking_bp.route("", methods=["POST"])
def submit_booking():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"status": "error", "error": "Dữ liệu gửi lên không hợp lệ.", "message": "Dữ liệu gửi lên không hợp lệ."}), 400

    success, message, sub_id = contact_service.handle_booking_submission(data)
    if not success:
        return jsonify({"status": "error", "error": message, "message": message}), 400

    return jsonify({
        "status": "success",
        "message": message,
        "data": {"id": sub_id}
    }), 200


@contact_bp.route("/messages", methods=["GET"])
@permission_required("users")
def list_messages():
    limit = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)
    messages = contact_service.list_submissions(limit, offset)
    return jsonify({
        "status": "success",
        "data": messages,
        "total": len(messages)
    }), 200
