# -*- coding: utf-8 -*-
"""
Repository for Billing module.
"""

import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from core.config import DATABASE_MODE
from core.db import get_connection
from core.db_manager import DatabaseManager
from .models import Order, Transaction, OrderStatus

logger = logging.getLogger(__name__)

_db_manager = DatabaseManager()

def _get_billing_conn():
    if DATABASE_MODE == "modular":
        return _db_manager.get_billing_connection()
    return get_connection()


class BillingRepository:
    def __init__(self):
        self._in_memory_orders: Dict[str, Order] = {}
        self._in_memory_transactions: Dict[int, Transaction] = {}
        self._init_tables()

    def _init_tables(self):
        try:
            conn = _get_billing_conn()
            try:
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS billing_orders (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            order_code TEXT UNIQUE NOT NULL,
                            amount INTEGER NOT NULL,
                            description TEXT,
                            service_type TEXT NOT NULL DEFAULT 'consultation',
                            user_id TEXT,
                            status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
                            qr_url TEXT,
                            is_sandbox INTEGER NOT NULL DEFAULT 0,
                            created_at TEXT NOT NULL,
                            paid_at TEXT
                        )
                    """)
                    order_cols = {row["name"] for row in conn.execute("PRAGMA table_info(billing_orders)").fetchall()}
                    if "is_sandbox" not in order_cols:
                        conn.execute("ALTER TABLE billing_orders ADD COLUMN is_sandbox INTEGER NOT NULL DEFAULT 0")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_orders_code ON billing_orders(order_code)")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_orders_status ON billing_orders(status)")

                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS billing_transactions (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            sepay_id INTEGER UNIQUE,
                            gateway TEXT,
                            transaction_date TEXT,
                            account_number TEXT,
                            order_code TEXT,
                            transfer_type TEXT,
                            transfer_amount INTEGER,
                            reference_code TEXT,
                            raw_payload TEXT,
                            is_sandbox INTEGER NOT NULL DEFAULT 0,
                            processed_at TEXT NOT NULL
                        )
                    """)
                    tx_cols = {row["name"] for row in conn.execute("PRAGMA table_info(billing_transactions)").fetchall()}
                    if "is_sandbox" not in tx_cols:
                        conn.execute("ALTER TABLE billing_transactions ADD COLUMN is_sandbox INTEGER NOT NULL DEFAULT 0")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_transactions_sepay_id ON billing_transactions(sepay_id)")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_billing_transactions_order_code ON billing_transactions(order_code)")
            finally:
                conn.close()
        except Exception as e:
            logger.warning(f"Could not initialize SQLite billing tables: {e}")

    def create_order(self, order: Order) -> int:
        now = datetime.utcnow().isoformat()
        if not order.created_at:
            order.created_at = now

        try:
            conn = _get_billing_conn()
            try:
                with conn:
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO billing_orders (order_code, amount, description, service_type, user_id, status, qr_url, is_sandbox, created_at, paid_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        order.order_code, order.amount, order.description, order.service_type,
                        order.user_id, order.status, order.qr_url, 1 if order.is_sandbox else 0,
                        order.created_at, order.paid_at
                    ))
                    order_id = cur.lastrowid
                    order.id = order_id
                    return order_id
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error creating billing order in SQLite: {e}. Falling back to memory.")
            order.id = len(self._in_memory_orders) + 1
            self._in_memory_orders[order.order_code] = order
            return order.id

    def get_order_by_code(self, order_code: str) -> Optional[Order]:
        try:
            conn = _get_billing_conn()
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, order_code, amount, description, service_type, user_id, status, qr_url, COALESCE(is_sandbox, 0) AS is_sandbox, created_at, paid_at
                    FROM billing_orders WHERE order_code = ?
                """, (order_code,))
                row = cur.fetchone()
                if row:
                    return Order.from_dict(dict(row))
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error getting billing order by code from SQLite: {e}")

        return self._in_memory_orders.get(order_code)

    def get_order_by_id(self, order_id: int) -> Optional[Order]:
        try:
            conn = _get_billing_conn()
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, order_code, amount, description, service_type, user_id, status, qr_url, COALESCE(is_sandbox, 0) AS is_sandbox, created_at, paid_at
                    FROM billing_orders WHERE id = ?
                """, (order_id,))
                row = cur.fetchone()
                if row:
                    return Order.from_dict(dict(row))
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error getting billing order by id from SQLite: {e}")

        for o in self._in_memory_orders.values():
            if o.id == order_id:
                return o
        return None

    def update_order_status(self, order_code: str, status: str, paid_at: Optional[str] = None) -> bool:
        try:
            conn = _get_billing_conn()
            try:
                with conn:
                    cur = conn.cursor()
                    if paid_at:
                        cur.execute("""
                            UPDATE billing_orders SET status = ?, paid_at = ? WHERE order_code = ?
                        """, (status, paid_at, order_code))
                    else:
                        cur.execute("""
                            UPDATE billing_orders SET status = ? WHERE order_code = ?
                        """, (status, order_code))
                    updated = cur.rowcount > 0
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error updating order status in SQLite: {e}")
            updated = False

        if order_code in self._in_memory_orders:
            self._in_memory_orders[order_code].status = status
            if paid_at:
                self._in_memory_orders[order_code].paid_at = paid_at
            updated = True

        return updated

    def get_transaction_by_sepay_id(self, sepay_id: int) -> Optional[Transaction]:
        if not sepay_id:
            return None
        try:
            conn = _get_billing_conn()
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, sepay_id, gateway, transaction_date, account_number, order_code, transfer_type, transfer_amount, reference_code, raw_payload, processed_at
                    FROM billing_transactions WHERE sepay_id = ?
                """, (sepay_id,))
                row = cur.fetchone()
                if row:
                    d = dict(row)
                    return Transaction(**d)
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error checking transaction in SQLite: {e}")

        return self._in_memory_transactions.get(sepay_id)

    def save_transaction(self, tx: Transaction) -> int:
        try:
            conn = _get_billing_conn()
            try:
                with conn:
                    cur = conn.cursor()
                    cur.execute("""
                        INSERT INTO billing_transactions (sepay_id, gateway, transaction_date, account_number, order_code, transfer_type, transfer_amount, reference_code, raw_payload, is_sandbox, processed_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        tx.sepay_id, tx.gateway, tx.transaction_date, tx.account_number, tx.order_code,
                        tx.transfer_type, tx.transfer_amount, tx.reference_code, tx.raw_payload,
                        1 if tx.is_sandbox else 0, tx.processed_at
                    ))
                    tx_id = cur.lastrowid
                    tx.id = tx_id
                    return tx_id
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error saving transaction in SQLite: {e}")
            tx.id = len(self._in_memory_transactions) + 1
            if tx.sepay_id:
                self._in_memory_transactions[tx.sepay_id] = tx
            return tx.id
