# -*- coding: utf-8 -*-
"""
Routes for Articles module (CMS articles & image assets).
"""

import os
import re
from flask import Blueprint, request, jsonify, send_from_directory, Response
from core.config import ARTICLE_IMAGE_DIR
from .repository import list_cms_articles, get_cms_article_by_slug
from .service import article_service

articles_bp = Blueprint("articles", __name__, url_prefix="/api/articles")
article_images_bp = Blueprint("article_images", __name__, url_prefix="/api/article-images")

_SAFE_IMAGE_FILENAME = re.compile(r"^[a-f0-9-]+\.(png|jpg|webp|gif)$")


@articles_bp.route("", methods=["GET"])
def get_articles():
    slug = str(request.args.get("slug") or "").strip()
    if slug:
        article = get_cms_article_by_slug(slug) or article_service.get_article(slug)
        if not article:
            return jsonify({"status": "error", "message": "Không tìm thấy bài viết."}), 404
        return jsonify({"status": "success", "data": article}), 200

    category = str(request.args.get("category") or "").strip()
    rows = list_cms_articles(category=category)
    return jsonify({"status": "success", "data": rows}), 200


@articles_bp.route("/<slug>", methods=["GET"])
def get_article_by_slug(slug):
    article = get_cms_article_by_slug(slug) or article_service.get_article(slug)
    if not article:
        return jsonify({
            "status": "error",
            "message": f"Không tìm thấy bài viết với mã '{slug}'.",
            "code": "ARTICLE_NOT_FOUND",
        }), 404

    return jsonify({"status": "success", "data": article}), 200


@article_images_bp.route("/<filename>", methods=["GET"])
def serve_article_image(filename: str):
    clean_name = os.path.basename(filename)
    if not _SAFE_IMAGE_FILENAME.match(clean_name):
        return Response("", status=404)
    target = os.path.join(ARTICLE_IMAGE_DIR, clean_name)
    if not os.path.isfile(target):
        return Response("", status=404)
    return send_from_directory(ARTICLE_IMAGE_DIR, clean_name)
