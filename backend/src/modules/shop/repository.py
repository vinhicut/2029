# -*- coding: utf-8 -*-
"""
Repository for Shop module.
"""

import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from core.config import DATABASE_MODE
from core.db import get_connection
from core.db_manager import DatabaseManager
from .models import Product, ShopOrder

logger = logging.getLogger(__name__)

_db_manager = DatabaseManager()

def _get_community_conn():
    if DATABASE_MODE == "modular":
        return _db_manager.get_community_connection()
    return get_connection()

SEED_PRODUCTS = [
    {
        "id": "prod-tram-01",
        "sku": "TRAM-108",
        "name": "Chuỗi Tràng Hạt Trầm Hương Tự Nhiên 108 Hạt",
        "category": "Vật phẩm phong thủy",
        "price": 1250000,
        "original_price": 1500000,
        "description": "Vòng trầm hương tự nhiên giúp định tâm, an thần, xua đuổi tà khí và chiêu dẫn vượng khí may mắn.",
        "images": ["/assets/shop/tram-huong-108.webp"],
        "stock": 50,
        "is_active": True
    },
    {
        "id": "prod-lakinh-01",
        "sku": "LK-DONG-24",
        "name": "La Kinh Phong Thủy Tam Hợp Bằng Đồng Nguyên Khối 24 Sơn",
        "category": "Dụng cụ phong thủy",
        "price": 890000,
        "original_price": 1100000,
        "description": "La kinh khảo sát chuẩn xác phương vị nhà cửa, phòng ốc và định hướng xuất hành đại cát.",
        "images": ["/assets/shop/la-kinh-dong.webp"],
        "stock": 35,
        "is_active": True
    },
    {
        "id": "prod-thap-vx",
        "sku": "THAP-VX-09",
        "name": "Tháp Văn Xương Bạch Ngọc 9 Tầng Chiêu Tài Đỗ Đạt",
        "category": "Vật phẩm phong thủy",
        "price": 650000,
        "original_price": 800000,
        "description": "Biểu tượng trí tuệ, hỗ trợ học hành hanh thông, thi cử đỗ đạt và thăng tiến quan lộ.",
        "images": ["/assets/shop/thap-van-xuong.webp"],
        "stock": 40,
        "is_active": True
    },
    {
        "id": "prod-vip-reading",
        "sku": "VIP-READING-01",
        "name": "Gói Luận Giải Tử Vi Chuyên Sâu 1-1 Kèm Audio & Bản Đồ Vận Mệnh",
        "category": "Dịch vụ luận giải",
        "price": 1500000,
        "original_price": 2000000,
        "description": "Luận giải chi tiết 12 cung chức, định hướng nghề nghiệp, giải mã nghiệp duyên và hóa giải vận hạn đại vận.",
        "images": ["/assets/shop/goi-luan-giai-vip.webp"],
        "stock": 999,
        "is_active": True
    }
]


class ShopRepository:
    def __init__(self):
        self._in_memory_products = {p["id"]: Product.from_dict(p) for p in SEED_PRODUCTS}
        self._in_memory_orders: List[Dict[str, Any]] = []
        self._init_tables()

    def _init_tables(self):
        try:
            conn = _get_community_conn()
            try:
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS shop_products (
                            id TEXT PRIMARY KEY,
                            sku TEXT UNIQUE NOT NULL,
                            name TEXT NOT NULL,
                            category TEXT NOT NULL,
                            price INTEGER NOT NULL,
                            original_price INTEGER,
                            description TEXT,
                            images TEXT,
                            stock INTEGER DEFAULT 100,
                            is_active BOOLEAN DEFAULT 1
                        )
                    """)
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS shop_orders (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            order_code TEXT UNIQUE NOT NULL,
                            customer_name TEXT NOT NULL,
                            customer_phone TEXT NOT NULL,
                            customer_address TEXT NOT NULL,
                            items TEXT NOT NULL,
                            total_amount INTEGER NOT NULL,
                            payment_method TEXT DEFAULT 'VIETQR',
                            billing_order_id TEXT,
                            status TEXT DEFAULT 'PENDING',
                            created_at TEXT NOT NULL
                        )
                    """)
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_shop_orders_code ON shop_orders(order_code)")
                    cur = conn.cursor()
                    cur.execute("SELECT COUNT(*) FROM shop_products")
                    if cur.fetchone()[0] == 0:
                        for p in SEED_PRODUCTS:
                            cur.execute("""
                                INSERT INTO shop_products (id, sku, name, category, price, original_price, description, images, stock, is_active)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                            """, (
                                p["id"], p["sku"], p["name"], p["category"], p["price"],
                                p["original_price"], p["description"], json.dumps(p["images"]), p["stock"]
                            ))
            finally:
                conn.close()
        except Exception as e:
            logger.warning(f"Could not init SQLite shop tables: {e}")

    def list_products(self, category: Optional[str] = None, limit: int = 20, offset: int = 0) -> List[Product]:
        try:
            conn = _get_community_conn()
            try:
                cur = conn.cursor()
                query = "SELECT id, sku, name, category, price, original_price, description, images, stock, is_active FROM shop_products WHERE is_active = 1"
                params = []
                if category and category != "all":
                    query += " AND category = ?"
                    params.append(category)
                query += " ORDER BY id ASC LIMIT ? OFFSET ?"
                params.extend([limit, offset])
                cur.execute(query, tuple(params))
                rows = cur.fetchall()
                res = []
                for r in rows:
                    d = dict(r)
                    if d.get("images") and isinstance(d["images"], str):
                        try:
                            d["images"] = json.loads(d["images"])
                        except Exception:
                            d["images"] = []
                    res.append(Product.from_dict(d))
                return res
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error querying products from SQLite: {e}")
            items = list(self._in_memory_products.values())
            if category and category != "all":
                items = [i for i in items if i.category == category]
            return items[offset:offset + limit]

    def get_product(self, product_id: str) -> Optional[Product]:
        try:
            conn = _get_community_conn()
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, sku, name, category, price, original_price, description, images, stock, is_active
                    FROM shop_products WHERE id = ? OR sku = ?
                """, (product_id, product_id))
                row = cur.fetchone()
                if not row:
                    return self._in_memory_products.get(product_id)
                d = dict(row)
                if d.get("images") and isinstance(d["images"], str):
                    try:
                        d["images"] = json.loads(d["images"])
                    except Exception:
                        d["images"] = []
                return Product.from_dict(d)
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error getting product: {e}")
            return self._in_memory_products.get(product_id)

    def create_order(self, data: Dict[str, Any]) -> int:
        now = datetime.utcnow().isoformat()
        try:
            conn = _get_community_conn()
            try:
                with conn:
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO shop_orders (order_code, customer_name, customer_phone, customer_address, items, total_amount, payment_method, billing_order_id, status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
                    """, (
                        data.get("order_code"),
                        data.get("customer_name"),
                        data.get("customer_phone"),
                        data.get("customer_address"),
                        json.dumps(data.get("items", [])),
                        int(data.get("total_amount", 0)),
                        data.get("payment_method", "VIETQR"),
                        data.get("billing_order_id"),
                        now
                    ))
                    return cur.lastrowid
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error saving shop order in SQLite: {e}")
            rec = dict(data)
            rec["id"] = len(self._in_memory_orders) + 1
            rec["created_at"] = now
            self._in_memory_orders.append(rec)
            return rec["id"]
