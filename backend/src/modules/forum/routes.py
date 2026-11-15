# -*- coding: utf-8 -*-
"""
Routes for Forum module.
"""

from flask import Blueprint, request, jsonify
from .service import forum_service

forum_bp = Blueprint("forum", __name__, url_prefix="/api/forum")


@forum_bp.route("/categories", methods=["GET"])
def get_categories():
    data = forum_service.get_categories()
    return jsonify({
        "status": "success",
        "data": data
    }), 200


@forum_bp.route("/topics", methods=["GET"])
def get_topics():
    category = request.args.get("category")
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", 20, type=int)

    data = forum_service.list_topics(category, page, page_size)
    return jsonify({
        "status": "success",
        "data": data
    }), 200


@forum_bp.route("/topics/<int:topic_id>", methods=["GET"])
def get_topic(topic_id):
    topic = forum_service.get_topic_detail(topic_id)
    if not topic:
        return jsonify({
            "status": "error",
            "message": f"Không tìm thấy chủ đề #{topic_id}.",
            "code": "TOPIC_NOT_FOUND"
        }), 404

    return jsonify({
        "status": "success",
        "data": topic
    }), 200


@forum_bp.route("/topics", methods=["POST"])
def create_topic():
    data = request.get_json(silent=True) or {}
    success, msg, topic_id = forum_service.create_topic(data)
    if not success:
        return jsonify({
            "status": "error",
            "message": msg,
            "code": "CREATE_TOPIC_FAILED"
        }), 400

    return jsonify({
        "status": "success",
        "message": msg,
        "data": {"topic_id": topic_id}
    }), 201


@forum_bp.route("/topics/<int:topic_id>/replies", methods=["POST"])
def add_reply(topic_id):
    data = request.get_json(silent=True) or {}
    success, msg, reply_id = forum_service.add_reply(topic_id, data)
    if not success:
        return jsonify({
            "status": "error",
            "message": msg,
            "code": "ADD_REPLY_FAILED"
        }), 400

    return jsonify({
        "status": "success",
        "message": msg,
        "data": {"reply_id": reply_id}
    }), 201
