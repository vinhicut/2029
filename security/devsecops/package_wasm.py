#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
security/devsecops/package_wasm.py
Đóng gói module Rust WebAssembly (Wasm) và xuất bảng băm SHA-256 vào wasm_manifest.json.
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]


def calculate_sha256(file_path: Path) -> str:
    """Tính giá trị băm SHA-256 của tệp."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def build_wasm(rust_dir: Path) -> None:
    """Biên dịch dự án Rust sang WebAssembly."""
    print(f"[*] Đang biên dịch Wasm từ {rust_dir}...")
    if not rust_dir.exists():
        print(f"[-] Lỗi: Thư mục Rust Wasm {rust_dir} không tồn tại.", file=sys.stderr)
        sys.exit(1)

    env = os.environ.copy()
    if "CARGO_TARGET_DIR" not in env:
        env["CARGO_TARGET_DIR"] = os.path.join(tempfile.gettempdir(), "cargo-target-wasm")

    wasm_build_cmd = ["wasm-pack", "build", "--target", "web", "--release"]
    try:
        subprocess.run(wasm_build_cmd, cwd=rust_dir, check=True, env=env)
        print("[+] Biên dịch Wasm bằng wasm-pack hoàn tất.")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[*] 'wasm-pack' không khả dụng, chuyển sang cargo build --target wasm32-unknown-unknown...")
        cargo_build_cmd = ["cargo", "build", "--target", "wasm32-unknown-unknown", "--release"]
        subprocess.run(cargo_build_cmd, cwd=rust_dir, check=True, env=env)

        target_dir = Path(env["CARGO_TARGET_DIR"]) / "wasm32-unknown-unknown" / "release"
        pkg_dir = rust_dir / "pkg"
        pkg_dir.mkdir(parents=True, exist_ok=True)

        for wasm_file in target_dir.glob("*.wasm"):
            shutil.copy2(wasm_file, pkg_dir / wasm_file.name)
            print(f"[+] Đã sao chép {wasm_file.name} tới {pkg_dir / wasm_file.name}")


def package_and_hash(rust_dir: Path, frontend_assets_dir: Path, manifest_file: Path) -> None:
    """Sao chép các tệp Wasm sang thư mục public của Frontend và cập nhật wasm_manifest.json."""
    print("[*] Đang đóng gói Wasm và tính toán mã băm SHA-256...")
    os.makedirs(frontend_assets_dir, exist_ok=True)
    os.makedirs(manifest_file.parent, exist_ok=True)

    pkg_dir = rust_dir / "pkg"
    manifest = {"files": {}}

    if not pkg_dir.exists():
        print(f"[-] Lỗi: Không tìm thấy thư mục gói Wasm {pkg_dir}.", file=sys.stderr)
        sys.exit(1)

    has_files = False
    for file_path in pkg_dir.glob("*"):
        if file_path.is_file():
            has_files = True
            dest_path = frontend_assets_dir / file_path.name
            shutil.copy2(file_path, dest_path)

            file_hash = calculate_sha256(dest_path)
            try:
                rel_dest = str(dest_path.resolve().relative_to(PROJECT_ROOT))
            except ValueError:
                rel_dest = str(dest_path)
            manifest["files"][file_path.name] = {
                "sha256": file_hash,
                "path": rel_dest,
            }
            print(f"  -> Đã sao chép {file_path.name} (SHA256: {file_hash})")

    if not has_files:
        print(f"[-] Lỗi: Không có tệp nào trong {pkg_dir}.", file=sys.stderr)
        sys.exit(1)

    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=4, ensure_ascii=False)
    print(f"[+] Đã lưu manifest Wasm tại {manifest_file}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Đóng gói và ký băm SHA-256 cho Wasm")
    parser.add_argument(
        "--rust-dir",
        type=Path,
        default=PROJECT_ROOT / "frontend" / "wasm-crypto",
        help="Đường dẫn thư mục mã nguồn Rust Wasm",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=PROJECT_ROOT / "frontend" / "public" / "wasm",
        help="Thư mục đầu ra chứa tệp Wasm cho Frontend",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=SCRIPT_DIR / "wasm_manifest.json",
        help="Đường dẫn lưu tệp wasm_manifest.json",
    )
    args = parser.parse_args()
    build_wasm(args.rust_dir.resolve())
    package_and_hash(args.rust_dir.resolve(), args.out_dir.resolve(), args.manifest.resolve())


if __name__ == "__main__":
    main()
