# -*- coding: utf-8 -*-
"""
Routes for Tarot Kiều module.
"""

from flask import Blueprint, request, jsonify
from .service import tarot_kieu_service

tarot_kieu_bp = Blueprint("tarot_kieu", __name__, url_prefix="/api/tarot_kieu")


@tarot_kieu_bp.route("/draw", methods=["POST"])
def draw_card():
    data = request.get_json(silent=True) or {}
    topic = data.get("topic", "Tình Duyên")
    inquiry = data.get("inquiry", "")
    result = tarot_kieu_service.draw(topic, inquiry)
    return jsonify({
        "status": "success",
        "data": result.to_dict()
    }), 200


@tarot_kieu_bp.route("/daily", methods=["GET"])
def get_daily():
    date_param = request.args.get("date")
    data = tarot_kieu_service.get_daily_verse(date_param)
    return jsonify({
        "status": "success",
        "data": data
    }), 200


@tarot_kieu_bp.route("/verses", methods=["GET"])
def get_all_verses():
    data = tarot_kieu_service.list_all_verses()
    return jsonify({
        "status": "success",
        "data": data,
        "total": len(data)
    }), 200
