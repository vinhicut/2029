# -*- coding: utf-8 -*-
"""
Routes for Lunar Calendar module.
"""

from flask import Blueprint, request, jsonify
from .service import lunar_calendar_service

lunar_calendar_bp = Blueprint("lunar_calendar", __name__, url_prefix="/api/lunar_calendar")


@lunar_calendar_bp.route("/day", methods=["GET"])
def get_day_info():
    date_param = request.args.get("date")
    info = lunar_calendar_service.get_day_info(date_param)
    return jsonify({
        "status": "success",
        "data": info.to_dict()
    }), 200


@lunar_calendar_bp.route("/month", methods=["GET"])
def get_month_grid():
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)

    if not year or not month or month < 1 or month > 12:
        return jsonify({
            "status": "error",
            "message": "Vui lòng cung cấp năm và tháng hợp lệ (year=YYYY&month=1..12).",
            "code": "INVALID_PARAMS"
        }), 400

    days = lunar_calendar_service.get_month_grid(year, month)
    return jsonify({
        "status": "success",
        "data": {
            "year": year,
            "month": month,
            "days": days
        }
    }), 200


@lunar_calendar_bp.route("/convert", methods=["POST"])
def convert_date():
    data = request.get_json(silent=True) or {}
    direction = data.get("direction", "solar_to_lunar")
    try:
        day = int(data.get("day"))
        month = int(data.get("month"))
        year = int(data.get("year"))
    except (TypeError, ValueError):
        return jsonify({
            "status": "error",
            "message": "Ngày, tháng, năm phải là số nguyên hợp lệ.",
            "code": "INVALID_DATE"
        }), 400

    is_leap = bool(data.get("is_leap", False))
    result = lunar_calendar_service.convert_date(direction, day, month, year, is_leap)
    return jsonify({
        "status": "success",
        "data": result
    }), 200
