# -*- coding: utf-8 -*-
"""
Repository for Contact & Booking module.
"""

import sqlite3
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from core.config import DATABASE_MODE
from core.db import get_connection
from core.db_manager import DatabaseManager
from .models import ContactMessage

logger = logging.getLogger(__name__)

_db_manager = DatabaseManager()

def _get_contact_conn():
    if DATABASE_MODE == "modular":
        return _db_manager.get_customers_pii_connection()
    return get_connection()


class ContactRepository:
    def __init__(self):
        self._in_memory_submissions: List[Dict[str, Any]] = []
        self._init_table()

    def _init_table(self):
        try:
            conn = _get_contact_conn()
            try:
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS contact_submissions (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL,
                            phone TEXT NOT NULL,
                            email TEXT,
                            service TEXT,
                            topic TEXT,
                            preferred_date TEXT,
                            message TEXT,
                            type TEXT DEFAULT 'contact',
                            status TEXT DEFAULT 'pending',
                            created_at TEXT NOT NULL
                        )
                    """)
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions(created_at DESC)")
            finally:
                conn.close()
        except Exception as e:
            logger.warning(f"Could not initialize contact_submissions table in SQLite: {e}")

    def save_submission(self, data: Dict[str, Any], submission_type: str = "contact") -> Optional[int]:
        created_at = datetime.utcnow().isoformat()
        name = str(data.get("name", "")).strip()
        phone = str(data.get("phone", "")).strip()
        email = str(data.get("email", "")).strip() or None if data.get("email") else None
        service = str(data.get("service", "")).strip() or None if data.get("service") else None
        topic = str(data.get("topic", "")).strip() or None if data.get("topic") else None
        preferred_date = str(data.get("preferred_date") or data.get("date", "")).strip() or None if (data.get("preferred_date") or data.get("date")) else None
        message = str(data.get("message") or data.get("note", "")).strip() or None if (data.get("message") or data.get("note")) else None

        try:
            conn = _get_contact_conn()
            try:
                with conn:
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO contact_submissions (name, phone, email, service, topic, preferred_date, message, type, status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                    """, (name, phone, email, service, topic, preferred_date, message, submission_type, created_at))
                    inserted_id = cur.lastrowid
                    return inserted_id
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error saving contact submission to SQLite: {e}. Falling back to memory.")
            record = {
                "id": len(self._in_memory_submissions) + 1,
                "name": name,
                "phone": phone,
                "email": email,
                "service": service,
                "topic": topic,
                "preferred_date": preferred_date,
                "message": message,
                "type": submission_type,
                "status": "pending",
                "created_at": created_at
            }
            self._in_memory_submissions.append(record)
            return record["id"]

    def list_submissions(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        try:
            conn = _get_contact_conn()
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, name, phone, email, service, topic, preferred_date, message, type, status, created_at
                    FROM contact_submissions
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?
                """, (limit, offset))
                return [dict(r) for r in cur.fetchall()]
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error reading contact submissions: {e}")
            return self._in_memory_submissions[offset:offset + limit]
