# Công Cụ Tự Động Hóa An Toàn Thông Tin (DevSecOps) — Tử Vi Hồng Ân

Thư mục `security/devsecops/` chứa các kịch bản Python phục vụ tự động hóa kiểm soát an ninh trong quy trình CI/CD và triển khai máy chủ Production của **Website Tử Vi Hồng Ân**.

---

## 1. Danh Mục Tệp & Kịch Bản Trong `security/devsecops/`

### 1.1. `package_wasm.py`
Tự động hóa biên dịch và đóng gói mô-đun mật mã WebAssembly (`e2ee_wasm.wasm`):
- Biên dịch mã nguồn Rust bằng `wasm-pack` (hoặc fallback sang `cargo build --target wasm32-unknown-unknown --release`).
- Tính toán mã băm mật mã `SHA-256` cho từng tệp đầu ra.
- Sao chép tài nguyên Wasm sang `frontend/public/wasm/` và ghi nhận danh mục chữ ký số vào `security/devsecops/wasm_manifest.json`.

```bash
python3 security/devsecops/package_wasm.py
```

### 1.2. `generate_csp.py`
Tự động sinh chính sách `Content-Security-Policy` (CSP) chuẩn Nginx từ `wasm_manifest.json`:
- Chuyển đổi mã băm `SHA-256` hex của các tệp `.wasm`/`.js` sang định dạng Base64 (`'sha256-...'`) và đưa vào chỉ thị `script-src`.
- Tích hợp sẵn danh sách tên miền hợp lệ của hệ thống Tử Vi Hồng Ân:
  - Google OAuth / Identity Services (`https://accounts.google.com`, `https://apis.google.com`, `https://oauth2.googleapis.com`)
  - Google Fonts (`https://fonts.googleapis.com`, `https://fonts.gstatic.com`)
  - Ảnh đại diện Google & mã thanh toán VietQR (`https://*.googleusercontent.com`, `https://img.vietqr.io`)
- Xuất kết quả ra tệp `security/devsecops/csp_headers.conf` để nhúng vào `deployment/nginx/nginx.conf`.

```bash
python3 security/devsecops/generate_csp.py
```

### 1.3. `vault_secrets.py`
Kết nối và kéo biến môi trường bí mật từ **HashiCorp Vault** (KV v2) về tệp `backend/.env`:
- Hỗ trợ xác thực máy-với-máy qua **Vault AppRole** (`VAULT_ROLE_ID`, `VAULT_SECRET_ID`) hoặc `VAULT_TOKEN`.
- Tự động thiết lập quyền tệp `0600` (`chmod 600 backend/.env`) ngay sau khi ghi để ngăn người dùng khác trên máy chủ Linux đọc trộm khóa bí mật.

```bash
export VAULT_ADDR="https://vault.tuvihongan.com:8200"
export VAULT_ROLE_ID="<role_id>"
export VAULT_SECRET_ID="<secret_id>"
python3 security/devsecops/vault_secrets.py --path tuvi/production --mount secret
```

### 1.4. `wasm_manifest.json` & `csp_headers.conf`
- `wasm_manifest.json`: Lưu trữ mã băm SHA-256 chuẩn đối chiếu toàn vẹn của `e2ee_wasm.wasm`.
- `csp_headers.conf`: Chỉ thị `add_header Content-Security-Policy ... always;` sẵn sàng `include` trực tiếp vào cấu hình Nginx.

---

## 2. Tích Hợp Trong Quy Trình CI/CD & Triển Khai Production

```yaml
# Ví dụ tích hợp trong GitHub Actions / GitLab CI
steps:
  - name: Nạp biến môi trường từ Vault (tuỳ chọn)
    run: python3 security/devsecops/vault_secrets.py --path tuvi/production

  - name: Sinh cấu hình CSP động từ Wasm Manifest
    run: python3 security/devsecops/generate_csp.py

  - name: Kiểm tra cú pháp Python Backend & Scripts
    run: python3 -m py_compile backend/src/server.py security/devsecops/*.py deployment/scripts/backup_sqlite.py
```

Để xem hướng dẫn bảo mật toàn diện cấp độ kiến trúc, tường lửa, phân quyền, SePay Webhook và tuân thủ Nghị định 13/2023/NĐ-CP, vui lòng tham khảo:
- `security/policies/Deployment_Security_Guide.md`
- `deployment/HUONG_DAN_TRIEN_KHAI_VA_CAP_NHAT.md`
