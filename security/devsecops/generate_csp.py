#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
security/devsecops/generate_csp.py
Trình sinh tự động cấu hình Content Security Policy (CSP) cho Nginx dựa trên
chữ ký băm SHA-256 trong wasm_manifest.json và danh mục domain hợp lệ của Tử Vi Hồng Ân.
"""

import argparse
import base64
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

BASE_CSP = {
    "default-src": ["'self'"],
    "script-src": [
        "'self'",
        "'unsafe-inline'",
        "https://accounts.google.com",
        "https://apis.google.com",
    ],
    "wasm-unsafe-eval": ["'self'"],
    "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://accounts.google.com",
    ],
    "font-src": [
        "'self'",
        "data:",
        "https://fonts.gstatic.com",
    ],
    "img-src": [
        "'self'",
        "data:",
        "blob:",
        "https://*.googleusercontent.com",
        "https://img.vietqr.io",
    ],
    "connect-src": [
        "'self'",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
    ],
    "frame-src": [
        "'self'",
        "https://accounts.google.com",
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'self'"],
}


def generate_csp(manifest_path: Path, csp_output: Path) -> None:
    print(f"[*] Đang tạo Content Security Policy (CSP) từ {manifest_path}...")

    csp_policy = {k: list(v) for k, v in BASE_CSP.items()}

    if not manifest_path.exists():
        print(f"[-] Lỗi: Không tìm thấy tệp manifest tại {manifest_path}.", file=sys.stderr)
        sys.exit(1)

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        for filename, info in manifest.get("files", {}).items():
            if filename.endswith(".js") or filename.endswith(".wasm"):
                hex_hash = info["sha256"]
                b64_hash = base64.b64encode(bytes.fromhex(hex_hash)).decode("utf-8")
                token = f"'sha256-{b64_hash}'"
                if token not in csp_policy["script-src"]:
                    csp_policy["script-src"].append(token)
                print(f"  -> Đã thêm mã băm SHA-256 cho {filename} vào script-src")

        csp_string_parts = [
            f"{directive} {' '.join(sources)}"
            for directive, sources in csp_policy.items()
        ]
        csp_string = "; ".join(csp_string_parts) + ";"

        csp_output.parent.mkdir(parents=True, exist_ok=True)
        with open(csp_output, "w", encoding="utf-8") as f:
            f.write(f'add_header Content-Security-Policy "{csp_string}" always;\n')

        print(f"[+] Đã xuất cấu hình CSP thành công tại: {csp_output}")
    except json.JSONDecodeError as e:
        print(f"[-] Lỗi phân tích JSON trong manifest: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[-] Lỗi khi sinh CSP: {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Trình sinh cấu hình CSP động cho Nginx")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=SCRIPT_DIR / "wasm_manifest.json",
        help="Đường dẫn tới tệp wasm_manifest.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=SCRIPT_DIR / "csp_headers.conf",
        help="Đường dẫn xuất tệp cấu hình csp_headers.conf",
    )
    args = parser.parse_args()
    generate_csp(args.manifest.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
