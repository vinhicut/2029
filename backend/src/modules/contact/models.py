# -*- coding: utf-8 -*-
"""
Models for Contact & Booking module.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any
from datetime import datetime


@dataclass
class ContactMessage:
    name: str
    phone: str
    email: Optional[str] = None
    topic: Optional[str] = None
    service: Optional[str] = None
    preferred_date: Optional[str] = None
    message: Optional[str] = None
    status: str = "pending"
    id: Optional[int] = None
    created_at: Optional[str] = None

    def validate(self) -> Optional[str]:
        if not self.name or len(self.name.strip()) == 0 or len(self.name.strip()) > 120:
            return "Vui lòng nhập họ tên hợp lệ (tối đa 120 ký tự)."
        if not self.phone or len(self.phone.strip()) == 0 or len(self.phone.strip()) > 32:
            return "Vui lòng nhập số điện thoại hợp lệ (tối đa 32 ký tự)."
        if self.email and len(self.email.strip()) > 120:
            return "Email không được vượt quá 120 ký tự."
        if self.topic and len(self.topic.strip()) > 200:
            return "Vui lòng chọn nội dung tư vấn hợp lệ (tối đa 200 ký tự)."
        return None

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ContactMessage":
        return cls(
            id=data.get("id"),
            name=str(data.get("name", "")).strip(),
            phone=str(data.get("phone", "")).strip(),
            email=str(data.get("email", "")).strip() or None if data.get("email") else None,
            topic=str(data.get("topic", "")).strip() or None if data.get("topic") else None,
            service=str(data.get("service", "")).strip() or None if data.get("service") else None,
            preferred_date=str(data.get("preferred_date") or data.get("date", "")).strip() or None if (data.get("preferred_date") or data.get("date")) else None,
            message=str(data.get("message") or data.get("note", "")).strip() or None if (data.get("message") or data.get("note")) else None,
            status=str(data.get("status", "pending")),
            created_at=data.get("created_at") or datetime.utcnow().isoformat()
        )
