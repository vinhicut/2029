# -*- coding: utf-8 -*-
"""
Models for Shop module.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


@dataclass
class Product:
    id: str
    sku: str
    name: str
    category: str
    price: int
    original_price: Optional[int] = None
    description: str = ""
    images: List[str] = field(default_factory=list)
    stock: int = 100
    is_active: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Product":
        return cls(
            id=str(data.get("id", "")),
            sku=str(data.get("sku", "")),
            name=data.get("name", ""),
            category=data.get("category", "Vật phẩm phong thủy"),
            price=int(data.get("price", 0)),
            original_price=int(data.get("original_price")) if data.get("original_price") else None,
            description=data.get("description", ""),
            images=data.get("images", []),
            stock=int(data.get("stock", 100)),
            is_active=bool(data.get("is_active", True))
        )


@dataclass
class ShopOrder:
    order_code: str
    customer_name: str
    customer_phone: str
    customer_address: str
    items: List[Dict[str, Any]]
    total_amount: int
    payment_method: str = "VIETQR"
    billing_order_id: Optional[str] = None
    status: str = "PENDING"
    id: Optional[int] = None
    created_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
