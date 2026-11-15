# -*- coding: utf-8 -*-
"""
Routes for Shop module.
"""

from flask import Blueprint, request, jsonify
from .service import shop_service

shop_bp = Blueprint("shop", __name__, url_prefix="/api/shop")


@shop_bp.route("/products", methods=["GET"])
def get_products():
    category = request.args.get("category")
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", 20, type=int)

    data = shop_service.list_products(category, page, page_size)
    return jsonify({
        "status": "success",
        "data": data
    }), 200


@shop_bp.route("/products/<product_id>", methods=["GET"])
def get_product(product_id):
    product = shop_service.get_product(product_id)
    if not product:
        return jsonify({
            "status": "error",
            "message": f"Không tìm thấy sản phẩm '{product_id}'.",
            "code": "PRODUCT_NOT_FOUND"
        }), 404

    return jsonify({
        "status": "success",
        "data": product
    }), 200


@shop_bp.route("/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}
    success, msg, order_data = shop_service.create_order(data)
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
