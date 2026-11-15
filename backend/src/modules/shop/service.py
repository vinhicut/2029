# -*- coding: utf-8 -*-
"""
Service for Shop module.
"""

import uuid
import random
import string
from typing import List, Optional, Dict, Any, Tuple
from .repository import ShopRepository
from .models import Product, ShopOrder


class ShopService:
    def __init__(self, repository: Optional[ShopRepository] = None):
        self.repository = repository or ShopRepository()

    def list_products(self, category: Optional[str] = None, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        offset = max(0, (page - 1) * page_size)
        products = self.repository.list_products(category, limit=page_size, offset=offset)
        return {
            "products": [p.to_dict() for p in products],
            "page": page,
            "page_size": page_size,
            "total": len(products)
        }

    def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        product = self.repository.get_product(product_id)
        return product.to_dict() if product else None

    def create_order(self, data: Dict[str, Any]) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        customer_name = str(data.get("customer_name", "")).strip()
        customer_phone = str(data.get("customer_phone", "")).strip()
        customer_address = str(data.get("customer_address", "")).strip()
        items = data.get("items", [])

        if not customer_name:
            return False, "Vui lòng nhập họ và tên người nhận.", None
        if not customer_phone:
            return False, "Vui lòng nhập số điện thoại người nhận.", None
        if not customer_address:
            return False, "Vui lòng nhập địa chỉ giao hàng.", None
        if not items or not isinstance(items, list):
            return False, "Giỏ hàng không có sản phẩm nào.", None

        # Calculate total
        total = 0
        for item in items:
            p_id = item.get("product_id") or item.get("id")
            qty = int(item.get("quantity", 1))
            prod = self.repository.get_product(p_id)
            if prod:
                total += prod.price * qty
            else:
                total += int(item.get("price", 0)) * qty

        if total <= 0:
            total = int(data.get("total_amount", 0))

        order_suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        order_code = f"TVHASP{order_suffix}"

        order_data = {
            "order_code": order_code,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "customer_address": customer_address,
            "items": items,
            "total_amount": total,
            "payment_method": data.get("payment_method", "VIETQR"),
            "billing_order_id": order_code,
            "status": "PENDING"
        }

        order_id = self.repository.create_order(order_data)
        order_data["id"] = order_id
        return True, "Đặt hàng thành công.", order_data


shop_service = ShopService()
