# -*- coding: utf-8 -*-
"""
Routes for Feng Shui module.
"""

from flask import Blueprint, request, jsonify
from .service import feng_shui_service

feng_shui_bp = Blueprint("feng_shui", __name__, url_prefix="/api/feng_shui")


@feng_shui_bp.route("/calculate", methods=["POST"])
def calculate_kua():
    data = request.get_json(silent=True) or {}
    year = data.get("year") or data.get("birth_year")
    gender = data.get("gender", "Nam")

    try:
        year_int = int(year)
    except (TypeError, ValueError):
        return jsonify({
            "status": "error",
            "message": "Năm sinh không hợp lệ. Vui lòng nhập năm dạng số (ví dụ: 1990).",
            "code": "INVALID_YEAR"
        }), 400

    result = feng_shui_service.calculate_kua(year_int, gender)
    return jsonify({
        "status": "success",
        "data": result.to_dict()
    }), 200


@feng_shui_bp.route("/compass-guides", methods=["GET"])
def get_compass_guides():
    guides = feng_shui_service.get_compass_guides()
    return jsonify({
        "status": "success",
        "data": guides,
        "total": len(guides)
    }), 200


@feng_shui_bp.route("/compatibility", methods=["POST"])
def evaluate_compatibility():
    data = request.get_json(silent=True) or {}
    male_year = data.get("male_year")
    female_year = data.get("female_year")

    try:
        m_year = int(male_year)
        f_year = int(female_year)
    except (TypeError, ValueError):
        return jsonify({
            "status": "error",
            "message": "Năm sinh của vợ và chồng phải là số hợp lệ.",
            "code": "INVALID_INPUT"
        }), 400

    result = feng_shui_service.evaluate_spouse_compatibility(m_year, f_year)
    return jsonify({
        "status": "success",
        "data": result
    }), 200
