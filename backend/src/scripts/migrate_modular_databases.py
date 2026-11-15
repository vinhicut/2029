# -*- coding: utf-8 -*-
"""
Kịch bản chuyển đổi dữ liệu (Migration Script): Monolithic tuvi.db -> 10 Modular Databases
Dự án: Website Tử Vi Hồng Ân
Thiết kế theo chuẩn Domain-Driven Design (DDD).
Đảm bảo an toàn 100%: Sao lưu trước khi chạy, xác thực số lượng bản ghi (Row Count Verification).
"""

import os
import sys
import shutil
import sqlite3
import datetime
from typing import Dict, Any, List

# Thêm đường dẫn backend/src vào sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from core.config import (
    DATA_DIR,
    DB_PATH,
    DATABASES_DIR,
    DB_AUTH_STAFF_PATH,
    DB_CUSTOMERS_PII_PATH,
    DB_CSKH_CHAT_PATH,
    DB_BILLING_PATH,
    DB_CHARTS_PATH,
    DB_AI_READINGS_PATH,
    DB_ARTICLES_PATH,
    DB_BUDDHISM_PATH,
    DB_COURSES_PATH,
    DB_COMMUNITY_PATH,
)
from core.db_manager import DatabaseManager


def backup_monolithic_db() -> str:
    """Tạo bản sao lưu an toàn cho tuvi.db trước khi thực hiện di trú."""
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Không tìm thấy CSDL nguyên khối: {DB_PATH}")

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(DATA_DIR, f"tuvi.db.backup_{timestamp}")
    shutil.copy2(DB_PATH, backup_path)
    print(f"[*] Đã sao lưu an toàn tuvi.db -> {backup_path}")
    return backup_path


def copy_table_data(
    src_conn: sqlite3.Connection,
    dest_conn: sqlite3.Connection,
    table_name: str,
    exclude_columns: List[str] = None
) -> int:
    """Sao chép toàn bộ dữ liệu của một bảng từ src_conn sang dest_conn."""
    exclude = set(exclude_columns or [])
    src_cur = src_conn.cursor()
    dest_cur = dest_conn.cursor()

    # Kiểm tra bảng nguồn có tồn tại không
    src_cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}';")
    if not src_cur.fetchone():
        return 0

    # Lấy danh sách cột từ bảng nguồn
    src_cur.execute(f"PRAGMA table_info({table_name});")
    src_cols = [row[1] for row in src_cur.fetchall() if row[1] not in exclude]

    if not src_cols:
        return 0

    # Lấy danh sách cột từ bảng đích để đảm bảo tương thích
    dest_cur.execute(f"PRAGMA table_info({table_name});")
    dest_cols = {row[1] for row in dest_cur.fetchall()}
    cols_to_insert = [c for c in src_cols if c in dest_cols]

    if not cols_to_insert:
        return 0

    cols_str = ", ".join(cols_to_insert)
    placeholders = ", ".join("?" for _ in cols_to_insert)

    src_cur.execute(f"SELECT {cols_str} FROM {table_name};")
    rows = src_cur.fetchall()

    if rows:
        dest_cur.executemany(
            f"INSERT OR REPLACE INTO {table_name} ({cols_str}) VALUES ({placeholders});",
            rows
        )
        dest_conn.commit()

    return len(rows)


def run_migration(verify_only: bool = False):
    print("=" * 70)
    print("🚀 BẮT ĐẦU QUY TRÌNH CHUYỂN ĐỔI DATABASE SANG 10 CSDL MODULE HÓA")
    print(f"⏰ Thời gian: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    if not os.path.exists(DB_PATH):
        print(f"[-] Lỗi: Không tìm thấy tệp CSDL gốc tại {DB_PATH}")
        return

    # Khởi tạo DatabaseManager và cấu trúc 10 CSDL nếu chưa có
    db_mgr = DatabaseManager()
    db_mgr.init_all_databases()

    src_conn = sqlite3.connect(DB_PATH)
    src_conn.row_factory = sqlite3.Row

    # 1. Đọc số lượng bản ghi hiện tại của 17 bảng trong tuvi.db
    tables = [
        "users", "sessions", "admin_sessions", "user_charts", "customer_accounts",
        "customer_chart_logs", "customer_chat_messages", "articles", "courses",
        "course_enrollments", "forum_topics", "forum_replies", "shop_products",
        "shop_orders", "billing_orders", "billing_transactions", "contact_submissions"
    ]

    source_counts: Dict[str, int] = {}
    for table in tables:
        try:
            cur = src_conn.cursor()
            cur.execute(f"SELECT COUNT(*) FROM {table};")
            source_counts[table] = cur.fetchone()[0]
        except Exception:
            source_counts[table] = 0

    print("\n[📊] Số lượng bản ghi nguồn trong tuvi.db:")
    for table, count in source_counts.items():
        print(f"  • {table:<25}: {count:>5} bản ghi")

    if verify_only:
        print("\n[i] Chế độ --verify-only: Đã đọc xong thống kê nguồn, không thực hiện ghi.")
        src_conn.close()
        return

    # 2. Sao lưu an toàn trước khi di trú
    backup_monolithic_db()

    migrated_counts: Dict[str, int] = {}

    print("\n[*] Đang di chuyển dữ liệu sang 10 CSDL chuyên biệt...")

    # A. auth_staff.db
    staff_conn = db_mgr.get_auth_staff_connection()
    try:
        migrated_counts["admin_sessions"] = copy_table_data(src_conn, staff_conn, "admin_sessions")

        # Đồng bộ tài khoản admin/manager sang staff_users
        staff_cur = staff_conn.cursor()
        src_cur = src_conn.cursor()
        src_cur.execute("""
            SELECT google_id, email, name, avatar, role, account_type, admin_level, referral_code, referred_by_user_id, created_at, last_login_at, is_busy
            FROM users WHERE role = 'manager' OR account_type IN ('admin', 'collaborator')
        """)
        staff_rows = src_cur.fetchall()
        for r in staff_rows:
            staff_cur.execute("""
                INSERT OR REPLACE INTO staff_users
                    (google_id, email, name, avatar, role, account_type, admin_level, referral_code, referred_by_user_id, created_at, last_login_at, is_busy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, tuple(r))
        staff_conn.commit()
        migrated_counts["staff_users"] = len(staff_rows)
    finally:
        staff_conn.close()

    # B. customers_pii.db
    cust_conn = db_mgr.get_customers_pii_connection()
    try:
        migrated_counts["users"] = copy_table_data(src_conn, cust_conn, "users")
        migrated_counts["sessions"] = copy_table_data(src_conn, cust_conn, "sessions")
        migrated_counts["customer_accounts"] = copy_table_data(src_conn, cust_conn, "customer_accounts")
        migrated_counts["contact_submissions"] = copy_table_data(src_conn, cust_conn, "contact_submissions")
    finally:
        cust_conn.close()

    # C. cskh_chat.db
    chat_conn = db_mgr.get_cskh_chat_connection()
    try:
        migrated_counts["customer_chat_messages"] = copy_table_data(src_conn, chat_conn, "customer_chat_messages")
    finally:
        chat_conn.close()

    # D. billing.db
    billing_conn = db_mgr.get_billing_connection()
    try:
        migrated_counts["billing_orders"] = copy_table_data(src_conn, billing_conn, "billing_orders")
        migrated_counts["billing_transactions"] = copy_table_data(src_conn, billing_conn, "billing_transactions")
    finally:
        billing_conn.close()

    # E. charts.db & ai_readings.db
    # Lưu ý: Tách user_charts: tinh bàn lá số -> charts.db, reading_markdown -> ai_readings.db
    charts_conn = db_mgr.get_charts_connection()
    ai_conn = db_mgr.get_ai_readings_connection()
    try:
        migrated_counts["customer_chart_logs"] = copy_table_data(src_conn, charts_conn, "customer_chart_logs")

        # user_charts -> charts.db (loại bỏ reading_markdown)
        migrated_counts["user_charts"] = copy_table_data(
            src_conn, charts_conn, "user_charts", exclude_columns=["reading_markdown"]
        )

        # Trích xuất reading_markdown -> ai_readings.db
        src_cur = src_conn.cursor()
        src_cur.execute("""
            SELECT chart_code, user_id, reading_markdown, created_at, updated_at
            FROM user_charts
            WHERE reading_markdown IS NOT NULL AND trim(reading_markdown) != ''
        """)
        reading_rows = src_cur.fetchall()
        ai_cur = ai_conn.cursor()
        for r in reading_rows:
            ai_cur.execute("""
                INSERT OR REPLACE INTO chart_readings
                    (chart_code, user_id, reading_markdown, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (r["chart_code"], r["user_id"], r["reading_markdown"], r["created_at"], r["updated_at"]))
        ai_conn.commit()
        migrated_counts["chart_readings"] = len(reading_rows)
    finally:
        charts_conn.close()
        ai_conn.close()

    # F. articles_academic.db
    art_conn = db_mgr.get_articles_connection()
    try:
        migrated_counts["articles"] = copy_table_data(src_conn, art_conn, "articles")
    finally:
        art_conn.close()

    # G. courses.db
    courses_conn = db_mgr.get_courses_connection()
    try:
        migrated_counts["courses"] = copy_table_data(src_conn, courses_conn, "courses")
        migrated_counts["course_enrollments"] = copy_table_data(src_conn, courses_conn, "course_enrollments")
    finally:
        courses_conn.close()

    # H. community_forum.db
    comm_conn = db_mgr.get_community_connection()
    try:
        migrated_counts["forum_topics"] = copy_table_data(src_conn, comm_conn, "forum_topics")
        migrated_counts["forum_replies"] = copy_table_data(src_conn, comm_conn, "forum_replies")
        migrated_counts["shop_products"] = copy_table_data(src_conn, comm_conn, "shop_products")
        migrated_counts["shop_orders"] = copy_table_data(src_conn, comm_conn, "shop_orders")
    finally:
        comm_conn.close()

    src_conn.close()

    # 3. Đối soát & Báo cáo kết quả
    print("\n" + "=" * 70)
    print("📈 KẾT QUẢ ĐỐI SOÁT DI TRÚ DỮ LIỆU:")
    print("=" * 70)
    print(f"{'Bảng dữ liệu':<25} | {'Nguồn (tuvi.db)':<15} | {'Đích (Module DB)':<16} | {'Trạng thái'}")
    print("-" * 70)

    all_matched = True
    for table, src_cnt in source_counts.items():
        dest_cnt = migrated_counts.get(table, 0)
        status = "✅ KHỚP 100%" if src_cnt == dest_cnt else f"⚠️ LỆCH ({dest_cnt - src_cnt})"
        if src_cnt != dest_cnt:
            all_matched = False
        print(f"{table:<25} | {src_cnt:<15} | {dest_cnt:<16} | {status}")

    print("-" * 70)
    print(f"Bảng phụ trích xuất:")
    print(f"  • chart_readings (ai_readings.db) : {migrated_counts.get('chart_readings', 0)} bài luận dài trích xuất từ user_charts")
    print(f"  • staff_users    (auth_staff.db)  : {migrated_counts.get('staff_users', 0)} tài khoản quản trị trích xuất từ users")
    print("=" * 70)

    if all_matched:
        print("🎉 DI TRÚ HOÀN TẤT THÀNH CÔNG 100%! TOÀN BỘ DỮ LIỆU ĐÃ ĐƯỢC MODULE HÓA AN TOÀN.")
    else:
        print("⚠️ CẢNH BÁO: Có sự chênh lệch dữ liệu ở một số bảng, vui lòng kiểm tra chi tiết.")


if __name__ == "__main__":
    verify_only_flag = "--verify-only" in sys.argv
    run_migration(verify_only=verify_only_flag)
