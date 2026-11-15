# -*- coding: utf-8 -*-
"""
Unified SQLite & file storage layer for customer accounts, chart logs, and chat messages
(consolidated from legacy backend-node service into Flask backend).
Supports Dual-Mode: Modular databases (customers_pii.db, charts.db, cskh_chat.db) or Monolithic (tuvi.db).
"""

import base64
import datetime
import io
import json
import os
import uuid
from typing import Any, Dict, List, Optional
from PIL import Image

from core.config import CHART_IMAGE_DIR, DATABASE_MODE
from core.db import get_connection
from core.db_manager import DatabaseManager

MAX_IMAGE_BYTES = 5 * 1024 * 1024

CHAT_WELCOME_MESSAGE = """🌸 TỬ VI HỒNG ÂN xin chào bạn!

Cảm ơn bạn đã tin tưởng và liên hệ. Hồng Ân đã nhận được tin nhắn và sẽ phản hồi bạn sớm nhất có thể.

📩 Để đặt lịch xem Tử Vi, mời bạn để lại:
• Họ tên, giới tính.
• Ngày, tháng, năm sinh (ghi rõ âm lịch hoặc dương lịch).
• Giờ sinh.
• Số điện thoại/Zalo liên hệ.
• Nội dung muốn xem và thời gian thuận tiện.

🌐 Hoặc bạn có thể lập lá số miễn phí tại tuvihongan.com, rồi gửi ảnh lá số kèm số điện thoại và nội dung cần tư vấn.

🌿 Phí luận giải trực tiếp với Thầy là 500.000đ, bao gồm luận giải chi tiết 12 cung và không giới hạn câu hỏi trong buổi xem.

Để đặt lịch, bạn vui lòng chuyển khoản theo thông tin:
• Ngân hàng: MB Bank (Ngân hàng Quân đội)
• Số tài khoản: 8857159999
• Chủ tài khoản: TU VI HONG AN
• Nội dung: Họ tên + Số điện thoại

Bạn có thể quét mã QR đính kèm để chuyển khoản. Sau khi chuyển, vui lòng gửi ảnh giao dịch để Hồng Ân kiểm tra, xác nhận và sắp xếp lịch xem nhé!

Cảm ơn bạn đã kiên nhẫn chờ đợi! 🙏"""

_db_manager = DatabaseManager()


def _is_modular() -> bool:
    return DATABASE_MODE == "modular"


def _get_customers_conn():
    return _db_manager.get_customers_pii_connection() if _is_modular() else get_connection()


def _get_charts_conn():
    return _db_manager.get_charts_connection() if _is_modular() else get_connection()


def _get_chat_conn():
    return _db_manager.get_cskh_chat_connection() if _is_modular() else get_connection()


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _parse_json_column(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except Exception:
        return value


# ----------------- Customer Accounts -----------------


def upsert_customer_account(user: Dict[str, Any], login_increment: int = 0) -> int:
    """Insert or update a Google-authenticated account in customer_accounts and return its ID."""
    email = str(user.get("email") or "").strip().lower()
    google_sub = str(user.get("google_id") or user.get("google_sub") or email or f"user:{user.get('id', '0')}")
    display_name = str(user.get("name") or user.get("display_name") or email or "Người dùng").strip()[:120]
    avatar_url = user.get("avatar") or user.get("avatar_url")
    raw_role = str(user.get("role") or "user")
    normalized_role = "manager" if (raw_role in ("manager", "admin") or user.get("account_type") == "admin") else "user"
    now = _now_iso()

    conn = _get_customers_conn()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, role FROM customer_accounts WHERE google_sub = ? OR lower(email) = lower(?) LIMIT 1",
                (google_sub, email),
            )
            existing = cur.fetchone()
            if existing:
                final_role = "manager" if existing["role"] == "manager" else normalized_role
                if login_increment > 0:
                    cur.execute(
                        """
                        UPDATE customer_accounts
                        SET google_sub = ?, email = ?, display_name = ?, avatar_url = ?, role = ?,
                            login_count = login_count + ?, last_login_at = ?, updated_at = ?
                        WHERE id = ?
                        """,
                        (google_sub, email, display_name, avatar_url, final_role, login_increment, now, now, existing["id"]),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE customer_accounts
                        SET google_sub = ?, email = ?, display_name = ?, avatar_url = ?, role = ?, updated_at = ?
                        WHERE id = ?
                        """,
                        (google_sub, email, display_name, avatar_url, final_role, now, existing["id"]),
                    )
                return int(existing["id"])

            cur.execute(
                """
                INSERT INTO customer_accounts
                    (google_sub, email, display_name, avatar_url, role, login_count, first_login_at, last_login_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
                """,
                (google_sub, email, display_name, avatar_url, normalized_role, now, now, now, now),
            )
            return int(cur.lastrowid)
    finally:
        conn.close()


def list_customer_accounts(limit: int = 100) -> List[Dict[str, Any]]:
    """Return Google-authenticated customer accounts (excluding managers)."""
    safe_limit = min(max(int(limit), 1), 200)
    conn = _get_customers_conn()
    try:
        rows = conn.execute(
            """
            SELECT id, email, display_name, avatar_url, role, login_count, first_login_at, last_login_at
            FROM customer_accounts
            WHERE role = 'user'
            ORDER BY last_login_at DESC, id DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def delete_customer_account(account_id: int) -> bool:
    """Delete a customer account (role='user'), cascade chat messages, and detach chart logs."""
    if _is_modular():
        charts_conn = _db_manager.get_charts_connection()
        chat_conn = _db_manager.get_cskh_chat_connection()
        cust_conn = _db_manager.get_customers_pii_connection()
        try:
            with charts_conn:
                charts_conn.execute("UPDATE customer_chart_logs SET customer_id = NULL WHERE customer_id = ?", (account_id,))
        finally:
            charts_conn.close()

        try:
            with chat_conn:
                chat_conn.execute("DELETE FROM customer_chat_messages WHERE customer_id = ?", (account_id,))
        finally:
            chat_conn.close()

        try:
            with cust_conn:
                cur = cust_conn.cursor()
                cur.execute("DELETE FROM customer_accounts WHERE id = ? AND role = 'user'", (account_id,))
                return cur.rowcount > 0
        finally:
            cust_conn.close()

    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("UPDATE customer_chart_logs SET customer_id = NULL WHERE customer_id = ?", (account_id,))
            cur.execute("DELETE FROM customer_chat_messages WHERE customer_id = ?", (account_id,))
            cur.execute("DELETE FROM customer_accounts WHERE id = ? AND role = 'user'", (account_id,))
            return cur.rowcount > 0
    finally:
        conn.close()


# ----------------- Customer Chart Logs -----------------


def save_customer_chart_log(
    input_data: Dict[str, Any],
    chart_code: Optional[str],
    encoded_image: str,
    user: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Validate base64 JPEG image, write to disk, and insert into customer_chart_logs."""
    if not isinstance(encoded_image, str) or not encoded_image.startswith("data:image/jpeg;base64,"):
        raise ValueError("Chưa chụp được ảnh lá số. Vui lòng bấm lập lá số lại.")

    try:
        image_bytes = base64.b64decode(encoded_image[len("data:image/jpeg;base64,"):], validate=True)
    except Exception:
        raise ValueError("Ảnh lá số không hợp lệ.")

    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise OverflowError("Ảnh lá số không hợp lệ hoặc vượt quá 5 MB.")

    # Kiểm tra Magic Bytes JPEG (\xFF\xD8\xFF) và cấu trúc ảnh thực tế qua Pillow
    if not image_bytes.startswith(b"\xff\xd8\xff"):
        raise ValueError("Chữ ký tệp ảnh JPEG không hợp lệ.")
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        if (img.format or "").upper() != "JPEG":
            raise ValueError("Định dạng ảnh thực tế không phải JPEG.")
    except ValueError:
        raise
    except Exception:
        raise ValueError("Tệp ảnh lá số bị hỏng hoặc giả mạo định dạng.")

    safe_code = str(chart_code or f"TV-{uuid.uuid4().hex[:8]}").strip()[:40]
    customer_id = upsert_customer_account(user, login_increment=0) if user else None
    verified_name = str((user.get("name") if user else None) or input_data.get("name") or "Khách vãng lai").strip()[:120]
    verified_email = str((user.get("email") if user else None) or "").strip()

    filename = f"{uuid.uuid4()}.jpg"
    file_path = os.path.join(CHART_IMAGE_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(image_bytes)

    now = _now_iso()
    conn = _get_charts_conn()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO customer_chart_logs
                    (customer_id, customer_name, customer_email, chart_code, birth_input, image_path, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (customer_id, verified_name, verified_email, safe_code, json.dumps(input_data, ensure_ascii=False), filename, now),
            )
            return {"id": int(cur.lastrowid), "chart_code": safe_code}
    except Exception:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        raise
    finally:
        conn.close()


def list_customer_chart_logs(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Return paginated customer chart logs with parsed input_data for admin view."""
    safe_limit = min(max(int(limit), 1), 100)
    safe_offset = max(int(offset), 0)
    conn = _get_charts_conn()
    try:
        rows = conn.execute(
            """
            SELECT id, customer_id, customer_name, customer_email, chart_code, birth_input, created_at
            FROM customer_chart_logs
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            (safe_limit, safe_offset),
        ).fetchall()
        results = []
        for row in rows:
            item = dict(row)
            item["input_data"] = _parse_json_column(item.get("birth_input"))
            results.append(item)
        return results
    finally:
        conn.close()


def list_my_chart_logs(email: str) -> List[Dict[str, Any]]:
    """Return chart log summaries for a given user email."""
    clean_email = str(email or "").strip().lower()
    if not clean_email:
        return []
    conn = _get_charts_conn()
    try:
        rows = conn.execute(
            """
            SELECT id, customer_name AS ho_ten, chart_code, created_at
            FROM customer_chart_logs
            WHERE lower(customer_email) = lower(?)
            ORDER BY created_at DESC, id DESC
            LIMIT 200
            """,
            (clean_email,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def list_chart_logs_by_emails(emails: List[str]) -> List[Dict[str, Any]]:
    """Return chart log summaries matching a list of referred customer emails."""
    clean_emails = list(dict.fromkeys(
        str(e).strip().lower() for e in emails if str(e).strip() and len(str(e).strip()) <= 254
    ))[:500]
    if not clean_emails:
        return []
    placeholders = ", ".join("lower(?)" for _ in clean_emails)
    conn = _get_charts_conn()
    try:
        rows = conn.execute(
            f"""
            SELECT id, customer_name AS ho_ten, customer_email, chart_code, created_at
            FROM customer_chart_logs
            WHERE lower(customer_email) IN ({placeholders})
            ORDER BY created_at DESC, id DESC
            """,
            tuple(clean_emails),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_customer_chart_image_filename(chart_id: int) -> Optional[str]:
    """Return stored JPEG filename for a chart log ID, or None."""
    conn = _get_charts_conn()
    try:
        row = conn.execute(
            "SELECT image_path FROM customer_chart_logs WHERE id = ? LIMIT 1",
            (chart_id,),
        ).fetchone()
        if not row or not row["image_path"]:
            return None
        return os.path.basename(row["image_path"])
    finally:
        conn.close()


def delete_customer_chart_log(chart_id: int) -> bool:
    """Delete a customer chart log record and unlink its stored image file."""
    conn = _get_charts_conn()
    image_filename = None
    try:
        with conn:
            row = conn.execute(
                "SELECT image_path FROM customer_chart_logs WHERE id = ? LIMIT 1",
                (chart_id,),
            ).fetchone()
            if not row:
                return False
            image_filename = row["image_path"]
            conn.execute("DELETE FROM customer_chart_logs WHERE id = ?", (chart_id,))
    finally:
        conn.close()

    if image_filename:
        img_path = os.path.join(CHART_IMAGE_DIR, os.path.basename(image_filename))
        if os.path.exists(img_path):
            try:
                os.remove(img_path)
            except OSError:
                pass
    return True


# ----------------- Customer Chat -----------------


def should_show_chat_welcome(user: Dict[str, Any]) -> bool:
    return (
        user.get("account_type") not in ("collaborator", "admin")
        and user.get("role") not in ("manager", "admin")
    )


def ensure_chat_welcome_message(conn, customer_id: int) -> None:
    existing = conn.execute(
        "SELECT id FROM customer_chat_messages WHERE customer_id = ? LIMIT 1",
        (customer_id,),
    ).fetchone()
    if existing:
        return
    conn.execute(
        """
        INSERT INTO customer_chat_messages
            (customer_id, sender_role, sender_name, message, read_by_customer, read_by_manager, created_at)
        VALUES (?, 'manager', 'Hồng Ân', ?, 0, 0, ?)
        """,
        (customer_id, CHAT_WELCOME_MESSAGE, _now_iso()),
    )


def get_customer_chat_messages(user: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Mark manager messages read and return up to 500 messages for current user."""
    customer_id = upsert_customer_account(user, login_increment=0)
    conn = _get_chat_conn()
    try:
        with conn:
            if should_show_chat_welcome(user):
                ensure_chat_welcome_message(conn, customer_id)
            conn.execute(
                "UPDATE customer_chat_messages SET read_by_customer = 1 WHERE customer_id = ? AND sender_role = 'manager'",
                (customer_id,),
            )
            rows = conn.execute(
                """
                SELECT id, sender_role, sender_name, message, created_at
                FROM customer_chat_messages
                WHERE customer_id = ?
                ORDER BY id ASC
                LIMIT 500
                """,
                (customer_id,),
            ).fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()


def post_customer_chat_message(user: Dict[str, Any], message: str) -> Dict[str, Any]:
    """Save a new message from customer and return the created record."""
    customer_id = upsert_customer_account(user, login_increment=0)
    sender_name = str(user.get("name") or user.get("email") or "Khách hàng").strip()[:120]
    now = _now_iso()
    conn = _get_chat_conn()
    try:
        with conn:
            if should_show_chat_welcome(user):
                ensure_chat_welcome_message(conn, customer_id)
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO customer_chat_messages
                    (customer_id, sender_role, sender_name, message, read_by_customer, read_by_manager, created_at)
                VALUES (?, 'customer', ?, ?, 0, 0, ?)
                """,
                (customer_id, sender_name, message, now),
            )
            row = conn.execute(
                "SELECT id, sender_role, sender_name, message, created_at FROM customer_chat_messages WHERE id = ?",
                (cur.lastrowid,),
            ).fetchone()
            return dict(row)
    finally:
        conn.close()


def list_admin_chat_conversations(limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """List customer chat threads with latest message and unread counter for admin panel (paginated)."""
    safe_limit = min(max(int(limit), 1), 200)
    safe_offset = max(int(offset), 0)
    if _is_modular():
        # customers_pii.db là cơ sở, ATTACH cskh_chat.db AS chat
        conn = _db_manager.get_unified_connection(["chat"])
        try:
            rows = conn.execute(
                """
                SELECT a.id AS customer_id,
                       a.display_name,
                       a.email,
                       a.avatar_url,
                       latest.message AS last_message,
                       latest.created_at AS last_message_at,
                       SUM(CASE WHEN m.sender_role = 'customer' AND m.read_by_manager = 0 THEN 1 ELSE 0 END) AS unread_count
                FROM chat.customer_chat_messages m
                JOIN customer_accounts a ON a.id = m.customer_id
                JOIN chat.customer_chat_messages latest ON latest.id = (
                    SELECT MAX(last.id) FROM chat.customer_chat_messages last WHERE last.customer_id = a.id
                )
                GROUP BY a.id, a.display_name, a.email, a.avatar_url, latest.message, latest.created_at
                ORDER BY latest.created_at DESC
                LIMIT ? OFFSET ?
                """,
                (safe_limit, safe_offset),
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT a.id AS customer_id,
                   a.display_name,
                   a.email,
                   a.avatar_url,
                   latest.message AS last_message,
                   latest.created_at AS last_message_at,
                   SUM(CASE WHEN m.sender_role = 'customer' AND m.read_by_manager = 0 THEN 1 ELSE 0 END) AS unread_count
            FROM customer_chat_messages m
            JOIN customer_accounts a ON a.id = m.customer_id
            JOIN customer_chat_messages latest ON latest.id = (
                SELECT MAX(last.id) FROM customer_chat_messages last WHERE last.customer_id = a.id
            )
            GROUP BY a.id, a.display_name, a.email, a.avatar_url, latest.message, latest.created_at
            ORDER BY latest.created_at DESC
            LIMIT ? OFFSET ?
            """,
            (safe_limit, safe_offset),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_admin_chat_messages(customer_id: int) -> List[Dict[str, Any]]:
    """Mark customer messages read by manager and return conversation history."""
    conn = _get_chat_conn()
    try:
        with conn:
            conn.execute(
                "UPDATE customer_chat_messages SET read_by_manager = 1 WHERE customer_id = ? AND sender_role = 'customer'",
                (customer_id,),
            )
            rows = conn.execute(
                """
                SELECT id, sender_role, sender_name, message, created_at
                FROM customer_chat_messages
                WHERE customer_id = ?
                ORDER BY id ASC
                LIMIT 500
                """,
                (customer_id,),
            ).fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()


def post_admin_chat_message(customer_id: int, manager_name: str, message: str) -> Dict[str, Any]:
    """Save a manager reply to a customer's chat thread."""
    sender_name = str(manager_name or "Quản trị viên").strip()[:120]
    now = _now_iso()
    conn = _get_chat_conn()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO customer_chat_messages
                    (customer_id, sender_role, sender_name, message, read_by_customer, read_by_manager, created_at)
                VALUES (?, 'manager', ?, ?, 0, 1, ?)
                """,
                (customer_id, sender_name, message, now),
            )
            row = conn.execute(
                "SELECT id, sender_role, sender_name, message, created_at FROM customer_chat_messages WHERE id = ?",
                (cur.lastrowid,),
            ).fetchone()
            return dict(row)
    finally:
        conn.close()
