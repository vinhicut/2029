# -*- coding: utf-8 -*-
"""
Service for Contact & Booking module.
"""

import os
import ssl
import smtplib
import logging
from email.message import EmailMessage
from typing import Dict, Any, Tuple, Optional, List
from .repository import ContactRepository
from .models import ContactMessage

logger = logging.getLogger(__name__)


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    return default if value is None else value.strip().lower() in {"1", "true", "yes", "on"}


class ContactService:
    def __init__(self, repository: Optional[ContactRepository] = None):
        self.repository = repository or ContactRepository()

    def send_notification_email(self, subject: str, body_text: str) -> bool:
        smtp_host = os.getenv("SMTP_HOST", "").strip()
        smtp_user = os.getenv("SMTP_USER", "").strip()
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user).strip()
        to_email = os.getenv("BOOKING_NOTIFICATION_EMAIL", "nguyenvinhvan90@gmail.com").strip()

        if not all((smtp_host, smtp_user, smtp_password, from_email, to_email)):
            logger.info("SMTP credentials not fully configured; logged notification to console.")
            logger.info(f"Notification [{subject}]:\n{body_text}")
            return True

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = from_email
        message["To"] = to_email
        message.set_content(body_text)

        try:
            port = int(os.getenv("SMTP_PORT", "587"))
            timeout = float(os.getenv("SMTP_TIMEOUT", "15"))
        except ValueError:
            logger.error("Invalid SMTP configuration.")
            return False

        use_ssl = _env_flag("SMTP_USE_SSL", port == 465)
        use_tls = _env_flag("SMTP_USE_TLS", not use_ssl)

        try:
            if use_ssl:
                with smtplib.SMTP_SSL(smtp_host, port, timeout=timeout, context=ssl.create_default_context()) as server:
                    server.login(smtp_user, smtp_password)
                    server.send_message(message)
            else:
                with smtplib.SMTP(smtp_host, port, timeout=timeout) as server:
                    server.ehlo()
                    if use_tls:
                        server.starttls(context=ssl.create_default_context())
                        server.ehlo()
                    server.login(smtp_user, smtp_password)
                    server.send_message(message)
            return True
        except Exception:
            logger.exception("Failed to dispatch SMTP notification email; fallback to logged message")
            return False

    def handle_contact_submission(self, data: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        msg = ContactMessage.from_dict(data)
        err = msg.validate()
        if err:
            return False, err, None

        sub_id = self.repository.save_submission(data, submission_type="contact")
        body = (
            "Bạn nhận được liên hệ mới từ website Tử Vi Hồng Ân.\n\n"
            f"Họ tên: {msg.name}\n"
            f"Điện thoại: {msg.phone}\n"
            f"Email: {msg.email or 'Không cung cấp'}\n"
            f"Dịch vụ quan tâm: {msg.service or msg.topic or 'Tư vấn chung'}\n"
            f"Ngày hẹn: {msg.preferred_date or 'Linh hoạt'}\n"
            f"Nội dung: {msg.message or 'Không có'}\n"
        )
        self.send_notification_email("Liên hệ mới từ website Tử Vi Hồng Ân", body)
        return True, "Yêu cầu đã được gửi thành công.", sub_id

    def handle_booking_submission(self, data: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        name = str(data.get("name", "")).strip()
        phone = str(data.get("phone", "")).strip()
        topic = str(data.get("topic") or data.get("service", "")).strip()
        note = str(data.get("note") or data.get("message", "")).strip()

        if not name or len(name) > 120:
            return False, "Vui lòng nhập họ tên hợp lệ (tối đa 120 ký tự).", None
        if not phone or len(phone) > 32:
            return False, "Vui lòng nhập số điện thoại hợp lệ.", None
        if not topic or len(topic) > 200:
            return False, "Vui lòng chọn nội dung tư vấn hợp lệ.", None

        sub_id = self.repository.save_submission(data, submission_type="booking")
        body = (
            "Bạn nhận được một yêu cầu đặt lịch tư vấn mới từ website Tử Vi Hồng Ân.\n\n"
            f"Họ tên: {name}\n"
            f"Số điện thoại Zalo: {phone}\n"
            f"Nội dung cần tư vấn: {topic}\n"
            f"Ghi chú: {note or 'Không có'}\n"
        )
        self.send_notification_email("Thông tin đặt lịch tư vấn mới", body)
        return True, "Đã gửi yêu cầu đặt lịch thành công.", sub_id

    def list_submissions(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        return self.repository.list_submissions(limit, offset)


contact_service = ContactService()
