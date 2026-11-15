# -*- coding: utf-8 -*-
"""
Models for Billing module.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any
from enum import Enum


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class PaymentMethod(str, Enum):
    VIETQR = "VIETQR"
    BANK_TRANSFER = "BANK_TRANSFER"


@dataclass
class Order:
    order_code: str
    amount: int
    description: str
    service_type: str = "consultation"
    user_id: Optional[str] = None
    status: str = "PENDING"
    qr_url: Optional[str] = None
    is_sandbox: bool = False
    id: Optional[int] = None
    created_at: Optional[str] = None
    paid_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Order":
        return cls(
            id=data.get("id"),
            order_code=data.get("order_code", ""),
            amount=int(data.get("amount", 0)),
            description=data.get("description", ""),
            service_type=data.get("service_type", "consultation"),
            user_id=str(data.get("user_id")) if data.get("user_id") is not None else None,
            status=data.get("status", "PENDING"),
            qr_url=data.get("qr_url"),
            is_sandbox=bool(data.get("is_sandbox", False)),
            created_at=data.get("created_at"),
            paid_at=data.get("paid_at")
        )


@dataclass
class Transaction:
    sepay_id: Optional[int]
    gateway: str
    transaction_date: str
    account_number: str
    order_code: Optional[str]
    transfer_type: str
    transfer_amount: int
    reference_code: Optional[str]
    raw_payload: str
    processed_at: str
    is_sandbox: bool = False
    id: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SePayWebhookPayload:
    id: Optional[int]
    gateway: Optional[str]
    transaction_date: Optional[str]
    account_number: Optional[str]
    content: Optional[str]
    transfer_type: Optional[str]
    transfer_amount: int
    reference_code: Optional[str]
    description: Optional[str]
    code: Optional[str] = None
    sub_account: Optional[str] = None
    accumulated: Optional[int] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SePayWebhookPayload":
        return cls(
            id=data.get("id"),
            gateway=data.get("gateway"),
            transaction_date=data.get("transactionDate") or data.get("transaction_date"),
            account_number=data.get("accountNumber") or data.get("account_number"),
            content=data.get("content"),
            transfer_type=data.get("transferType") or data.get("transfer_type"),
            transfer_amount=int(data.get("transferAmount") or data.get("transfer_amount") or 0),
            reference_code=data.get("referenceCode") or data.get("reference_code"),
            description=data.get("description"),
            code=data.get("code"),
            sub_account=data.get("subAccount") or data.get("sub_account"),
            accumulated=data.get("accumulated")
        )
