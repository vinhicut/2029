#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
deployment/scripts/backup_sqlite.py
Công cụ sao lưu an toàn (Online SQLite Backup API) cho toàn bộ 10 CSDL modular + tuvi.db,
kiểm tra toàn vẹn (PRAGMA integrity_check), nén .tar.gz, xoay vòng bản sao lưu cũ,
và dọn dẹp phiên đăng nhập đã hết hạn.
"""

import argparse
import os
import shutil
import sqlite3
import sys
import tarfile
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path


DEFAULT_DATA_DIR = Path(__file__).resolve().parents[2] / "backend" / "src" / "data"


def find_sqlite_files(data_dir: Path) -> list[Path]:
    """Thu thập toàn bộ tệp .db trong thư mục dữ liệu (bao gồm data/databases/)."""
    if not data_dir.exists():
        return []
    return sorted(p for p in data_dir.rglob("*.db") if p.is_file())


def purge_expired_sessions(db_files: list[Path]) -> int:
    """Xóa các phiên đăng nhập đã hết hạn khỏi bảng sessions nếu tồn tại."""
    now_iso = datetime.now(timezone.utc).isoformat()
    total_purged = 0
    for db_path in db_files:
        if db_path.name not in {"customers_pii.db", "tuvi.db"}:
            continue
        conn = None
        try:
            conn = sqlite3.connect(str(db_path), timeout=15.0)
            conn.execute("PRAGMA busy_timeout = 10000;")
            has_table = conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='sessions';"
            ).fetchone()
            if has_table:
                cur = conn.execute("DELETE FROM sessions WHERE expires_at < ?;", (now_iso,))
                conn.commit()
                total_purged += max(cur.rowcount, 0)
        finally:
            if conn is not None:
                conn.close()
    return total_purged


def backup_single_db(src_path: Path, dst_path: Path) -> str:
    """Sao lưu online chuẩn WAL bằng sqlite3.Connection.backup() và kiểm tra toàn vẹn."""
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    src_conn = sqlite3.connect(str(src_path), timeout=30.0)
    dst_conn = sqlite3.connect(str(dst_path))
    try:
        src_conn.execute("PRAGMA busy_timeout = 15000;")
        src_conn.backup(dst_conn, pages=256)
        check_row = dst_conn.execute("PRAGMA integrity_check;").fetchone()
        return str(check_row[0]) if check_row else "unknown"
    finally:
        dst_conn.close()
        src_conn.close()


def prune_old_archives(backup_dir: Path, retention_days: int) -> list[Path]:
    """Xóa các tệp sao lưu .tar.gz cũ hơn retention_days ngày."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    removed = []
    for archive in sorted(backup_dir.glob("tuvi_sqlite_backup_*.tar.gz")):
        mtime = datetime.fromtimestamp(archive.stat().st_mtime, tz=timezone.utc)
        if mtime < cutoff:
            archive.unlink()
            removed.append(archive)
    return removed


def run_backup(data_dir: Path, backup_dir: Path, retention_days: int, purge_sessions: bool) -> int:
    db_files = find_sqlite_files(data_dir)
    if not db_files:
        print(f"[WARN] Không tìm thấy tệp *.db nào trong {data_dir}")
        return 1

    if purge_sessions:
        purged = purge_expired_sessions(db_files)
        print(f"[INFO] Đã dọn dẹp {purged} phiên đăng nhập hết hạn.")

    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    archive_path = backup_dir / f"tuvi_sqlite_backup_{stamp}.tar.gz"

    with tempfile.TemporaryDirectory(prefix="tuvi_bk_") as tmp_dir:
        tmp_root = Path(tmp_dir)
        failed_checks = []
        for db_path in db_files:
            rel_path = db_path.relative_to(data_dir)
            snap_path = tmp_root / rel_path
            status = backup_single_db(db_path, snap_path)
            print(f"[BACKUP] {rel_path} -> integrity_check={status}")
            if status.lower() != "ok":
                failed_checks.append((str(rel_path), status))

        if failed_checks:
            print(f"[ERROR] Kiểm tra toàn vẹn thất bại: {failed_checks}", file=sys.stderr)
            return 2

        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(tmp_root, arcname="data")

    removed = prune_old_archives(backup_dir, retention_days)
    size_kb = archive_path.stat().st_size / 1024.0
    print(f"[OK] Đã tạo bản sao lưu: {archive_path} ({size_kb:.1f} KB). Đã xoay vòng {len(removed)} tệp cũ.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Sao lưu an toàn hệ thống SQLite WAL Tử Vi Hồng Ân.")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR, help="Thư mục chứa dữ liệu SQLite")
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=DEFAULT_DATA_DIR.parent.parent / "backups",
        help="Thư mục lưu trữ tệp .tar.gz sao lưu",
    )
    parser.add_argument("--retention-days", type=int, default=30, help="Số ngày lưu giữ bản sao lưu")
    parser.add_argument("--skip-purge-sessions", action="store_true", help="Bỏ qua dọn dẹp phiên hết hạn")
    args = parser.parse_args()

    return run_backup(
        data_dir=args.data_dir.resolve(),
        backup_dir=args.backup_dir.resolve(),
        retention_days=max(1, args.retention_days),
        purge_sessions=not args.skip_purge_sessions,
    )


if __name__ == "__main__":
    raise SystemExit(main())
