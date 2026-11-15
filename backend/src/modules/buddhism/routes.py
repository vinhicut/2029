# -*- coding: utf-8 -*-
"""
Routes for Buddhism module.
"""

from flask import Blueprint, jsonify, request
from .service import buddhism_service

buddhism_bp = Blueprint("buddhism", __name__, url_prefix="/api/buddhism")


@buddhism_bp.route("/daily-quote", methods=["GET"])
def get_daily_quote():
    date_param = request.args.get("date")
    quote = buddhism_service.get_daily_quote(date_param)
    return jsonify({
        "status": "success",
        "data": quote
    }), 200


@buddhism_bp.route("/sutras", methods=["GET"])
def get_sutras():
    data = buddhism_service.get_sutras()
    return jsonify({
        "status": "success",
        "data": data,
        "total": len(data)
    }), 200


@buddhism_bp.route("/sutras/<sutra_id>", methods=["GET"])
def get_sutra_detail(sutra_id):
    data = buddhism_service.get_sutra_detail(sutra_id)
    if not data:
        return jsonify({
            "status": "error",
            "message": "Không tìm thấy kinh văn",
            "code": "SUTRA_NOT_FOUND"
        }), 404

    return jsonify({
        "status": "success",
        "data": data
    }), 200
