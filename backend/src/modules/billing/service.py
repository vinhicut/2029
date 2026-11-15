# -*- coding: utf-8 -*-
"""
Service for Billing & SePay Gateway module.
"""

import os
import re
import json
import hmac
import secrets
import string
import urllib.parse
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from .repository import BillingRepository
from .models import Order, Transaction, OrderStatus, SePayWebhookPayload

CANONICAL_SERVICE_PRICES: Dict[str, int] = {
    "lifetime": 199000,
    "ai_reading": 199000,
}


class BillingService:
    def __init__(self, repository: Optional[BillingRepository] = None):
        self.repository = repository or BillingRepository()

    def get_bank_config(self) -> Dict[str, Any]:
        return {
            "bank_name": os.getenv("SEPAY_BANK_NAME", "MB"),
            "account_no": os.getenv("SEPAY_ACCOUNT_NO", "8857159999"),
            "account_name": os.getenv("SEPAY_ACCOUNT_NAME", "TU VI HONG AN"),
            "support_phone": os.getenv("HOTLINE", "0901234567")
        }

    def generate_vietqr_url(self, amount: int, order_code: str) -> str:
        cfg = self.get_bank_config()
        bank_id = cfg["bank_name"].strip()
        acc_no = cfg["account_no"].strip()
        acc_name = cfg["account_name"].strip()

        encoded_desc = urllib.parse.quote(order_code)
        encoded_name = urllib.parse.quote(acc_name)

        return "/qr-qronly-sepay.png"

    def create_order(self, data: Dict[str, Any], is_sandbox: bool = False) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        try:
            amount = int(data.get("amount", 0))
        except (TypeError, ValueError):
            return False, "Số tiền thanh toán không hợp lệ.", None

        if amount < 1000:
            return False, "Số tiền thanh toán tối thiểu là 1,000 VNĐ.", None

        description = str(data.get("description", "Thanh toán dịch vụ Tử Vi Hồng Ân")).strip()[:255]
        service_type = str(data.get("service_type", "lifetime")).strip().lower()
        if service_type not in CANONICAL_SERVICE_PRICES:
            return False, "Gói dịch vụ không hỗ trợ thanh toán trực tuyến.", None
        amount = CANONICAL_SERVICE_PRICES[service_type]

        user_id = str(data.get("user_id")) if data.get("user_id") is not None else None

        # Sinh mã đơn hàng ngẫu nhiên mật mã học: TVHA + 8 ký tự (hoặc TVHASBX + 5 ký tự cho sandbox)
        alphabet = string.ascii_uppercase + string.digits
        if is_sandbox:
            suffix = "".join(secrets.choice(alphabet) for _ in range(5))
            order_code = f"TVHASBX{suffix}"
        else:
            suffix = "".join(secrets.choice(alphabet) for _ in range(8))
            order_code = f"TVHA{suffix}"

        qr_url = self.generate_vietqr_url(amount, order_code)
        now = datetime.utcnow().isoformat()

        order = Order(
            order_code=order_code,
            amount=amount,
            description=description,
            service_type=service_type,
            user_id=user_id,
            status=OrderStatus.PENDING.value,
            qr_url=qr_url,
            is_sandbox=bool(is_sandbox),
            created_at=now
        )

        order_id = self.repository.create_order(order)
        order.id = order_id

        res = order.to_dict()
        res["order_id"] = order_id
        res["is_sandbox"] = bool(is_sandbox)
        res["bank_info"] = self.get_bank_config()
        return True, "Tạo đơn hàng thanh toán thành công.", res

    def get_order_status(self, identifier: str) -> Optional[Dict[str, Any]]:
        # Chỉ cho phép tra cứu theo order_code ngẫu nhiên (chặn dò ID số nguyên tuần tự IDOR)
        clean_code = str(identifier or "").strip().upper()
        if not re.match(r"^TVHA[A-Z0-9]{6,12}$", clean_code):
            return None
        order = self.repository.get_order_by_code(clean_code)

        if not order:
            return None

        return {
            "order_id": order.id,
            "order_code": order.order_code,
            "status": order.status,
            "amount": order.amount,
            "description": order.description,
            "service_type": order.service_type,
            "is_sandbox": bool(order.is_sandbox),
            "qr_url": order.qr_url,
            "paid_at": order.paid_at,
            "created_at": order.created_at
        }

    def verify_webhook_auth(self, auth_header: Optional[str], api_key_query: Optional[str]) -> bool:
        expected_key = os.getenv("SEPAY_API_KEY", "").strip()
        if not expected_key:
            # Mặc định từ chối mọi webhook nếu chưa cấu hình SEPAY_API_KEY (chỉ mở khi đặt rõ cờ dev)
            return os.getenv("ALLOW_INSECURE_WEBHOOK_DEV", "false").strip().lower() == "true"

        token = ""
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() in ["apikey", "bearer"]:
                token = parts[1].strip()
            elif len(parts) == 1:
                token = parts[0].strip()

        if not token and api_key_query:
            token = api_key_query.strip()

        if not token:
            return False
        return hmac.compare_digest(token.encode("utf-8"), expected_key.encode("utf-8"))

    def process_sepay_webhook(self, raw_data: Dict[str, Any]) -> Tuple[bool, str, int]:
        payload = SePayWebhookPayload.from_dict(raw_data)
        now_str = datetime.utcnow().isoformat()

        # 1. Idempotency Check
        if payload.id:
            existing_tx = self.repository.get_transaction_by_sepay_id(payload.id)
            if existing_tx:
                return True, "Transaction already processed", 200

        # 2. Transfer Type Verification
        transfer_type = (payload.transfer_type or "").strip().lower()
        if transfer_type and transfer_type != "in":
            return True, "Ignored outgoing transfer", 200

        # 3. Extract Order Code from content or description
        text_to_search = f"{payload.content or ''} {payload.description or ''}"
        match = re.search(r"TVHA[A-Z0-9]{6,12}", text_to_search, re.IGNORECASE)
        order_code = match.group(0).upper() if match else None

        # 4. Reconcile order if found & Auto-activate service (tách biệt tuyệt đối khỏi đơn sandbox)
        matched_order = None
        if order_code:
            matched_order = self.repository.get_order_by_code(order_code)
            if matched_order and not matched_order.is_sandbox and payload.transfer_amount >= matched_order.amount:
                if matched_order.status != OrderStatus.PAID.value:
                    self.repository.update_order_status(order_code, OrderStatus.PAID.value, paid_at=now_str)
                    if matched_order.user_id:
                        try:
                            from core.db import add_user_ai_credits
                            # Gói luận giải AI: 1 lần thanh toán cộng đúng 1 lượt (áp dụng cho 1 lá số)
                            add_user_ai_credits(matched_order.user_id, 1)
                        except Exception as act_err:
                            import logging
                            logging.getLogger(__name__).error(f"Error auto-activating service for order {order_code}: {act_err}")

        # 5. Persist transaction record
        tx = Transaction(
            sepay_id=payload.id,
            gateway=payload.gateway or "BANK",
            transaction_date=payload.transaction_date or now_str,
            account_number=payload.account_number or "",
            order_code=order_code,
            transfer_type=payload.transfer_type or "in",
            transfer_amount=payload.transfer_amount,
            reference_code=payload.reference_code,
            raw_payload=json.dumps(raw_data, ensure_ascii=False),
            processed_at=now_str
        )
        self.repository.save_transaction(tx)

        return True, "Transaction processed successfully", 200

    def confirm_sandbox_order(
        self,
        order_code: str,
        user_id: str,
        session_token: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Xác nhận thanh toán giả lập (Sandbox) — cô lập khỏi sổ cái thực và cộng lượt vào phiên sandbox."""
        clean_code = str(order_code or "").strip().upper()
        if not re.match(r"^TVHA[A-Z0-9]{6,12}$", clean_code):
            return False, "Mã đơn hàng giả lập không hợp lệ.", None

        order = self.repository.get_order_by_code(clean_code)
        if not order:
            return False, "Không tìm thấy đơn hàng giả lập.", None
        if not order.is_sandbox:
            return False, "Không thể xác nhận đơn hàng thực qua luồng giả lập.", None
        if str(order.user_id or "") != str(user_id):
            return False, "Đơn hàng giả lập không thuộc phiên tài khoản hiện tại.", None

        now_str = datetime.utcnow().isoformat()
        already_paid = order.status == OrderStatus.PAID.value
        new_balance = None

        if not already_paid:
            self.repository.update_order_status(clean_code, OrderStatus.PAID.value, paid_at=now_str)
            from core.db import add_session_sandbox_credits
            ok, new_balance = add_session_sandbox_credits(session_token, order.service_type, 1)
            if not ok:
                return False, "Phiên giả lập không còn hiệu lực để cộng lượt dịch vụ.", None

            tx = Transaction(
                sepay_id=None,
                gateway="SANDBOX_SIMULATOR",
                transaction_date=now_str,
                account_number="SANDBOX",
                order_code=clean_code,
                transfer_type="in",
                transfer_amount=order.amount,
                reference_code=f"MOCK-{clean_code}",
                raw_payload=json.dumps({
                    "is_sandbox": True,
                    "mock_transaction": True,
                    "order_code": clean_code,
                    "service_type": order.service_type,
                    "amount": order.amount,
                    "user_id": user_id
                }, ensure_ascii=False),
                processed_at=now_str,
                is_sandbox=True
            )
            self.repository.save_transaction(tx)

        return True, "Thanh toán giả lập thành công.", {
            "order_id": order.id,
            "order_code": clean_code,
            "status": OrderStatus.PAID.value,
            "amount": order.amount,
            "description": order.description,
            "service_type": order.service_type,
            "is_sandbox": True,
            "mock_transaction": True,
            "paid_at": order.paid_at or now_str,
            "credits_added": 0 if already_paid else 1,
            "sandbox_balance": new_balance
        }


billing_service = BillingService()
