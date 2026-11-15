import sqlite3
import datetime
from core.config import DATABASE_MODE
from core.db import get_connection, FIREBASE_ACTIVE
from core.db_manager import DatabaseManager
import core.firebase_db as firebase_db
from firebase_admin import firestore

_db_manager = DatabaseManager()

def _is_modular():
    return DATABASE_MODE == "modular"

def _get_staff_conn():
    return _db_manager.get_auth_staff_connection() if _is_modular() else get_connection()

def _get_charts_conn():
    return _db_manager.get_charts_connection() if _is_modular() else get_connection()

def save_admin_session(session_id: str, admin_email: str):
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    # SQLite
    conn = _get_staff_conn()
    try:
        with conn:
            conn.execute("INSERT INTO admin_sessions (session_id, admin_email, start_time) VALUES (?, ?, ?)", (session_id, admin_email, now_str))
    finally:
        conn.close()

    # Firebase
    if FIREBASE_ACTIVE and firebase_db.db:
        try:
            firebase_db.db.collection("admin_sessions").document(session_id).set({
                "session_id": session_id,
                "admin_email": admin_email,
                "start_time": now_str,
                "end_time": None
            })
        except Exception as e:
            print("Firebase Error save_admin_session:", e)

def end_admin_session(session_id: str):
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    # SQLite
    conn = _get_staff_conn()
    try:
        with conn:
            conn.execute("UPDATE admin_sessions SET end_time = ? WHERE session_id = ?", (now_str, session_id))
    finally:
        conn.close()

    # Firebase
    if FIREBASE_ACTIVE and firebase_db.db:
        try:
            firebase_db.db.collection("admin_sessions").document(session_id).update({
                "end_time": now_str
            })
        except Exception as e:
            print("Firebase Error end_admin_session:", e)

def cleanup_admin_test_data(session_id: str):
    # Xoá các lá số tạo bởi admin này
    # SQLite
    if _is_modular():
        charts_conn = _get_charts_conn()
        chart_codes = []
        try:
            with charts_conn:
                rows = charts_conn.execute("SELECT chart_code FROM user_charts WHERE admin_session_id = ?", (session_id,)).fetchall()
                chart_codes = [r['chart_code'] for r in rows]
                charts_conn.execute("DELETE FROM user_charts WHERE admin_session_id = ?", (session_id,))
        finally:
            charts_conn.close()

        if chart_codes:
            ai_conn = _db_manager.get_ai_readings_connection()
            try:
                placeholders = ",".join("?" for _ in chart_codes)
                with ai_conn:
                    ai_conn.execute(f"DELETE FROM chart_readings WHERE chart_code IN ({placeholders})", chart_codes)
            except Exception:
                pass
            finally:
                ai_conn.close()
    else:
        conn = get_connection()
        try:
            with conn:
                conn.execute("DELETE FROM user_charts WHERE admin_session_id = ?", (session_id,))
        finally:
            conn.close()

    # Firebase
    if FIREBASE_ACTIVE and firebase_db.db:
        try:
            charts_ref = firebase_db.db.collection("user_charts").where("admin_session_id", "==", session_id).get()
            batch = firebase_db.db.batch()
            for doc in charts_ref:
                batch.delete(doc.reference)
            batch.commit()
        except Exception as e:
            print("Firebase Error cleanup_admin_test_data:", e)

def get_admin_sessions():
    conn = _get_staff_conn()
    try:
        with conn:
            # Tự động đóng các phiên quản trị treo/quá 24 giờ để tránh ghi nhận phiên bất thường
            conn.execute("""
                UPDATE admin_sessions 
                SET end_time = datetime(start_time, '+8 hours')
                WHERE end_time IS NULL 
                  AND start_time < datetime('now', '-24 hours')
            """)
        cur = conn.cursor()
        cur.execute("SELECT session_id, admin_email, start_time, end_time FROM admin_sessions ORDER BY id DESC LIMIT 100")
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()
