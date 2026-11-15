#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
security/devsecops/vault_secrets.py
Tiện ích nạp biến môi trường bí mật từ HashiCorp Vault (AppRole / Token)
và ghi an toàn vào backend/.env với quyền hạn chế (0600).
"""

import argparse
import os
import sys
from pathlib import Path
import hvac
import requests

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]

VAULT_ADDR = os.environ.get("VAULT_ADDR", "http://127.0.0.1:8200")
ROLE_ID = os.environ.get("VAULT_ROLE_ID")
SECRET_ID = os.environ.get("VAULT_SECRET_ID")


def authenticate_vault(client: hvac.Client) -> bool:
    """Xác thực với HashiCorp Vault thông qua AppRole hoặc VAULT_TOKEN."""
    if not ROLE_ID or not SECRET_ID:
        if not os.environ.get("VAULT_TOKEN"):
            print("[-] Lỗi: Chưa cấu hình VAULT_ROLE_ID/VAULT_SECRET_ID hoặc VAULT_TOKEN.", file=sys.stderr)
            return False
        return True

    try:
        response = client.auth.approle.login(role_id=ROLE_ID, secret_id=SECRET_ID)
        print("[+] Xác thực HashiCorp Vault thành công (AppRole).")
        client.token = response["auth"]["client_token"]
        return True
    except hvac.exceptions.InvalidRequest as e:
        print(f"[-] Xác thực Vault thất bại: {e}", file=sys.stderr)
        return False
    except requests.exceptions.RequestException as e:
        print(f"[-] Không thể kết nối tới Vault tại {VAULT_ADDR}: {e}", file=sys.stderr)
        return False


def fetch_and_inject_secrets(
    client: hvac.Client,
    secrets_path: str,
    mount_point: str = "secret",
    env_file_path: Path = PROJECT_ROOT / "backend" / ".env",
) -> bool:
    """Đọc secrets từ KV v2 trên Vault và cập nhật vào tệp .env với quyền 0600."""
    print(f"[*] Đang tải secrets từ {mount_point}/data/{secrets_path}...")
    try:
        read_response = client.secrets.kv.v2.read_secret_version(
            mount_point=mount_point,
            path=secrets_path,
            raise_on_deleted_version=True,
        )
        secrets = read_response["data"]["data"]

        existing_env = {}
        if env_file_path.exists():
            with open(env_file_path, "r", encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if "=" in stripped and not stripped.startswith("#"):
                        key, val = stripped.split("=", 1)
                        existing_env[key.strip()] = val.strip()

        existing_env.update(secrets)
        env_file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(env_file_path, "w", encoding="utf-8") as f:
            f.write("# Tệp .env được sinh tự động từ HashiCorp Vault qua DevSecOps Pipeline\n")
            for key, val in existing_env.items():
                f.write(f"{key}={val}\n")

        try:
            os.chmod(env_file_path, 0o600)
        except OSError:
            pass

        print(f"[+] Đã nạp thành công secrets vào {env_file_path}")
        return True
    except hvac.exceptions.InvalidPath:
        print(f"[-] Không tìm thấy đường dẫn secret trên Vault: {secrets_path}", file=sys.stderr)
        return False
    except hvac.exceptions.Forbidden:
        print(f"[-] Bị từ chối quyền truy cập vào {secrets_path}.", file=sys.stderr)
        return False
    except requests.exceptions.RequestException as e:
        print(f"[-] Lỗi kết nối mạng với Vault: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[-] Lỗi không xác định khi tải secrets: {e}", file=sys.stderr)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Trình nạp biến môi trường từ HashiCorp Vault")
    parser.add_argument("--path", type=str, required=True, help="Đường dẫn secret trên Vault (ví dụ: tuvi/production)")
    parser.add_argument("--mount", type=str, default="secret", help="Điểm gắn KV engine (mặc định: secret)")
    parser.add_argument(
        "--env-file",
        type=Path,
        default=PROJECT_ROOT / "backend" / ".env",
        help="Đường dẫn tệp .env đích (mặc định: backend/.env)",
    )
    args = parser.parse_args()

    client = hvac.Client(url=VAULT_ADDR)
    if not authenticate_vault(client):
        sys.exit(1)
    if not fetch_and_inject_secrets(client, args.path, args.mount, args.env_file.resolve()):
        sys.exit(1)


if __name__ == "__main__":
    main()
