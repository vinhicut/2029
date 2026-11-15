# -*- coding: utf-8 -*-
"""
Routes for Courses module.
Hỗ trợ mở khóa toàn bộ khóa học cho tài khoản Quản trị viên.
"""

from flask import Blueprint, request, jsonify
from .service import course_service
from modules.auth.auth import get_current_user_from_request

courses_bp = Blueprint("courses", __name__, url_prefix="/api/courses")


@courses_bp.route("", methods=["GET"])
def get_courses():
    level = request.args.get("level")
    data = course_service.list_courses(level)
    
    # Kiểm tra quyền Quản trị viên để mở khóa sẵn khóa học
    user = get_current_user_from_request()
    is_privileged = bool(user and user.get("role") in ("admin", "manager"))

    if is_privileged and isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                item["is_unlocked"] = True
                item["free_access"] = True
                item["enrolled"] = True

    return jsonify({
        "status": "success",
        "data": data,
        "total": len(data),
        "privileged_access": is_privileged
    }), 200


@courses_bp.route("/<identifier>", methods=["GET"])
def get_course(identifier):
    course = course_service.get_course_detail(identifier)
    if not course:
        return jsonify({
            "status": "error",
            "message": f"Không tìm thấy khoá học '{identifier}'.",
            "code": "COURSE_NOT_FOUND"
        }), 404

    user = get_current_user_from_request()
    is_privileged = bool(user and user.get("role") in ("admin", "manager"))
    if is_privileged and isinstance(course, dict):
        course["is_unlocked"] = True
        course["free_access"] = True
        course["enrolled"] = True

    return jsonify({
        "status": "success",
        "data": course,
        "privileged_access": is_privileged
    }), 200


@courses_bp.route("/enroll", methods=["POST"])
def enroll_course():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Dữ liệu gửi lên không hợp lệ.",
            "code": "INVALID_REQUEST"
        }), 400

    user = get_current_user_from_request()
    is_privileged = bool(user and user.get("role") in ("admin", "manager"))
    if is_privileged:
        return jsonify({
            "status": "success",
            "message": "Tài khoản Quản trị viên đã được kích hoạt toàn quyền truy cập khóa học miễn phí.",
            "data": {
                "enrollment_id": "admin_auto_enroll_unlimited",
                "status": "COMPLETED",
                "free_access": True
            }
        }), 200

    success, msg, enroll_id = course_service.enroll(data)
    if not success:
        return jsonify({
            "status": "error",
            "message": msg,
            "code": "ENROLLMENT_FAILED"
        }), 400

    return jsonify({
        "status": "success",
        "message": msg,
        "data": {"enrollment_id": enroll_id}
    }), 201
