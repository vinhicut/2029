# HƯỚNG DẪN BẢO MẬT TRIỂN KHAI & TUÂN THỦ AN TOÀN THÔNG TIN (DEFENSE-IN-DEPTH)

> **Dự án:** Website Tử Vi Hồng Ân (`tuvihongan.com`)  
> **Cập nhật lần cuối:** 13/11/2026  
> **Kiến trúc bảo mật:** Defense-in-Depth, Zero-Trust API Auth (`HttpOnly` Cookie + Bearer Token), Role-Based Access Control (`ManagementGuard` + `@permission_required`), Dynamic CSP & Security Headers, SePay HMAC Webhook Verification, Playwright SSRF/LFI Guard, và tuân thủ Nghị định 13/2023/NĐ-CP.

---

## 1. CẤU TRÚC PHÂN HỆ AN NINH & TRIỂN KHAI TRONG MONOREPO

```text
tu-vi-hong-an-web/
├── security/                                  # Phân hệ An ninh mạng & Quản trị Bí mật (DevSecOps)
│   ├── devsecops/
│   │   ├── csp_headers.conf                   # Chỉ thị Content-Security-Policy chuẩn cho Nginx
│   │   ├── generate_csp.py                    # Kịch bản sinh CSP động từ wasm_manifest.json
│   │   ├── package_wasm.py                    # Kịch bản biên dịch & ký băm SHA-256 cho Wasm
│   │   ├── vault_secrets.py                   # Tiện ích kéo secrets từ HashiCorp Vault (chmod 0600)
│   │   ├── wasm_manifest.json                 # Manifest kiểm soát tính toàn vẹn SHA-256 của Wasm
│   │   └── README.md                          # Tài liệu hướng dẫn sử dụng bộ công cụ DevSecOps
│   ├── keys-and-secrets/                      # Thư mục lưu khóa dịch vụ cục bộ (Đã chặn trong .gitignore)
│   └── policies/
│       └── Deployment_Security_Guide.md       # Tài liệu chính sách & kiến trúc bảo mật này
│
├── deployment/                                # Hạ tầng Triển khai Máy chủ Linux & Container
│   ├── HUONG_DAN_TRIEN_KHAI_VA_CAP_NHAT.md    # Sổ tay vận hành deploy & cập nhật UI/Backend/Bảng giá
│   ├── docker/
│   │   ├── Dockerfile                         # Multi-stage build chạy dưới quyền non-root (appuser)
│   │   └── docker-compose.yml                 # Điều phối container (bind loopback 127.0.0.1:8080)
│   ├── nginx/
│   │   └── nginx.conf                         # Reverse Proxy, TLS 1.2/1.3, 4 vùng Rate Limit, CSP
│   └── scripts/
│       ├── backup_sqlite.py                   # Sao lưu online 10 CSDL SQLite WAL + PRAGMA integrity_check
│       ├── start.py                           # Kịch bản khởi chạy môi trường phát triển
│       └── start.bat
│
├── backend/                                   # Phân hệ Máy chủ Python Flask & Động cơ Tử Vi
│   ├── .env.example                           # Mẫu cấu hình biến môi trường bảo mật
│   ├── requirements.txt                       # Danh sách thư viện phụ thuộc đã ghim phiên bản an toàn
│   └── src/
│       ├── server.py                          # Điểm vào WSGI, Rate Limiter, Security Headers, Error Handler
│       ├── core/                              # config.py, db_manager.py (10 DB WAL), db.py, customer_store.py
│       └── modules/                           # auth/, admin/, astrology/, billing/, articles/, contact/, ...
│
└── frontend/                                  # Phân hệ Giao diện React 19 + Vite (sourcemap: false)
    ├── public/astrology-engine/js/dpop.js     # Ký định danh DPoP (RFC 9449 / WebCrypto P-256)
    └── src/                                   # Mã nguồn giao diện, ManagementGuard, Consent & NĐ 13/2023 UI
```

---

## 2. CÁC LỚP BẢO VỆ CỐT LÕI (SECURITY CONTROLS)

### 2.1. Xác Thực (Authentication) & Phân Quyền (Authorization / RBAC)
1. **Không tồn tại Backdoor Token:** Toàn bộ cơ chế chấp nhận tiền tố giả lập (`admin_*`, `test_admin_*`) trong `backend/src/modules/auth/auth.py` và `admin_auth.py` đã bị loại bỏ hoàn toàn. Mọi phiên truy cập đều phải đối chiếu qua bảng `sessions` còn hạn trong `customers_pii.db`.
2. **Khóa Endpoint `dev-login`:** Endpoint `POST /api/auth/dev-login` mặc định trả về `403 FORBIDDEN`. Chỉ mở khi biến môi trường `ENABLE_DEV_LOGIN=true` **và** kết nối trực tiếp từ loopback (`127.0.0.1` / `::1`) không đi qua header `X-Forwarded-For`.
3. **Cookie Phiên An Toàn + Bearer Token:** Khi đăng nhập Google OAuth (`POST /api/auth/google`), máy chủ cấp đồng thời token phiên và thiết lập cookie `tuvi_token` với đầy đủ các cờ `HttpOnly; SameSite=Lax; Secure` (khi chạy qua HTTPS).
4. **Bảo vệ Route Quản trị 2 Lớp:**
   - **Frontend (`frontend/src/app/App.jsx`):** Toàn bộ nhánh `/admin/*` và `/quan-ly` được bọc bởi `<ManagementGuard requireAdmin>`.
   - **Backend:** Bảo vệ nghiêm ngặt bằng `@admin_required` hoặc `@permission_required("users" | "charts" | "chat" | "articles")`, bao gồm cả endpoint `GET /api/contact/messages`.

---

### 2.2. Bảo Vệ Endpoint AI, Chống LFI/SSRF Khi Xuất PDF & Cô Lập Dữ Liệu
1. **Bắt buộc xác thực trên các API tiêu tốn tài nguyên:** `/api/ai/ask` và `/api/ai/export-pdf` yêu cầu `@login_required`. Hạn mức token hỏi đáp Q&A được cộng dồn và kiểm tra trực tiếp trên máy chủ (`ai_qa_sessions` trong `ai_readings.db`), không tin tưởng giá trị `current_tokens` từ client.
2. **Chống Local File Inclusion (LFI) & SSRF trong trình xuất PDF (`export_pdf.py`):**
   - Hàm `preserve_highres_image_base64()` mặc định khóa `allow_local_path=False`, chỉ chấp nhận dữ liệu `bytes` hoặc chuỗi `data:image/(png|jpeg|webp);base64,...` và kiểm tra tính hợp lệ của ảnh bằng `Pillow` (`img.verify()`).
   - Trình duyệt headless Playwright khi kết xuất PDF được gắn bộ chặn route `_guard_route`, tự động hủy (`route.abort()`) mọi yêu cầu mạng ra bên ngoài hoặc truy cập `file://`, chỉ cho phép `data:` và `about:blank`.
3. **Cô lập tuyệt đối bài luận AI giữa các người dùng:** Bảng `chart_readings` trong `ai_readings.db` áp dụng khóa duy nhất `UNIQUE(user_id, chart_code)`, đảm bảo hai người dùng có cùng thông số ngày giờ sinh (`chart_code`) không bao giờ ghi đè hoặc đọc chéo bài luận giải của nhau.

---

### 2.3. An Toàn Giao Dịch Thanh Toán SePay & Bảng Giá Chuẩn
1. **Xác thực Webhook Fail-Closed (`backend/src/modules/billing/service.py`):**
   - Bắt buộc khai báo `SEPAY_API_KEY` trong `backend/.env`. Nếu thiếu khóa trên môi trường Production, mọi yêu cầu tới `/api/billing/webhook` đều bị từ chối (`401 Unauthorized`).
   - Sử dụng `hmac.compare_digest()` để so sánh khóa theo thời gian hằng số, chống tấn công Timing Attack.
2. **Chống Thao Túng Giá (Price Tampering Prevention):**
   - Máy chủ áp dụng bảng giá chuẩn `CANONICAL_SERVICE_PRICES` (`"lifetime": 199000`, `"ai_reading": 199000`, `"consultation": 500000`), tự động ghi đè mọi giá trị `amount` sai lệch gửi từ phía trình duyệt.
3. **Chống Dò Quét Đơn Hàng (Anti-Enumeration):**
   - Mã đơn hàng `TVHA` + 8 ký tự chữ-số được sinh bằng bộ tạo số ngẫu nhiên mật mã học `secrets.choice()`.
   - Endpoint `GET /api/billing/orders/<identifier>/status` chỉ cho phép tra cứu theo định dạng mã `order_code`, chặn việc dò quét theo `id` số nguyên tuần tự.

---

### 2.4. Kiểm Soát Tải Lên (File Upload Magic Bytes) & Chống Rò Rỉ Stack Trace
1. **Kiểm tra Magic Bytes & Cấu trúc Ảnh:**
   - `customer_store.py` (`save_customer_chart_image`) và `modules/articles/repository.py` (`save_article_image`) kiểm tra chữ ký byte đầu tệp (Magic Bytes cho JPEG `\xFF\xD8\xFF`, PNG, WebP, GIF) kết hợp `Pillow.Image.verify()` trước khi lưu xuống đĩa.
   - Giới hạn dung lượng request toàn cục tại Flask (`app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024` — 10 MB) và tại Nginx (`client_max_body_size 10M;`).
2. **Che giấu lỗi nội bộ (Sanitized Error Handling):**
   - Toàn bộ các khối `except Exception` tại tầng API và `@app.errorhandler(Exception)` trong `server.py` ghi nhận chi tiết vào log nội bộ (`logger.exception(...)`) nhưng chỉ trả về thông điệp Tiếng Việt chuẩn hóa cho client, tuyệt đối không trả về `str(e)` hay Python Traceback.
   - Bản build Frontend tắt hoàn toàn source maps (`sourcemap: false` trong `frontend/vite.config.js`).

---

### 2.5. Bảo Vệ Vòng Ngoài: CORS Whitelist, Rate Limiting & HTTP Security Headers
1. **CORS Whitelist:** Cấu hình qua `ALLOWED_ORIGINS` / `CORS_ORIGIN` (`https://tuvihongan.com,https://www.tuvihongan.com`), không sử dụng `*` trên Production.
2. **Giới hạn tần suất (Rate Limiting) 2 Tầng:**
   - **Tầng Nginx (`deployment/nginx/nginx.conf`):** Phân tách 4 vùng bộ nhớ (`auth_limit: 10r/m`, `ai_limit: 6r/m`, `webhook_limit: 30r/m`, `api_limit: 60r/m`).
   - **Tầng Ứng dụng (`backend/src/server.py`):** Bộ giới hạn cửa sổ trượt (Sliding Window In-Memory Rate Limiter) theo IP và nhóm đường dẫn, tự động trả `429 RATE_LIMITED` khi vượt ngưỡng.
3. **HTTP Security Headers:** Được áp dụng tại cả Nginx và Flask `after_request`:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Content-Security-Policy`: Đồng bộ với `security/devsecops/csp_headers.conf`.

---

### 2.6. Tuân Thủ Pháp Lý Về Bảo Vệ Dữ Liệu Cá Nhân (Nghị Định 13/2023/NĐ-CP)
1. **Cơ chế Đồng ý Tường minh (Explicit Consent):** Cửa sổ đăng nhập `AuthModal.jsx` trang bị 2 ô checkbox **không tích sẵn (un-pre-ticked)**:
   - Checkbox bắt buộc đồng ý *Điều khoản sử dụng* & *Chính sách bảo vệ dữ liệu cá nhân* (khóa nút Google Sign-In cho đến khi người dùng chủ động tích chọn).
   - Checkbox tùy chọn đăng ký nhận bản tin học thuật/ưu đãi tách biệt độc lập.
2. **Quyền Chủ thể Dữ liệu Tự Thực thi (Self-Service DSR):**
   - **Xuất dữ liệu cá nhân (`GET /api/auth/my-data/export`):** Cho phép người dùng tải về toàn bộ hồ sơ tài khoản, lá số đã lưu, đơn hàng và lịch sử chat dưới định dạng JSON.
   - **Xóa tài khoản & dữ liệu (`DELETE /api/auth/my-account`):** Yêu cầu xác nhận `{"confirm": true}`, tự động xóa sạch dữ liệu cá nhân trên các CSDL module và ẩn danh hóa chứng từ kế toán (`user_id = NULL` trên `billing_orders`).

---

## 3. CHECKLIST KIỂM SOÁT AN NINH & PHÁP LÝ TRƯỚC KHI GO-LIVE

| Mã | Hạng Mục Kiểm Tra | Trạng Thái Trong Mã Nguồn | Hành Động Khi Đưa Lên Server Thực Tế |
|:--:|:---|:---:|:---|
| 01 | **Xác thực & Phiên:** Không còn backdoor `admin_*`, khóa `dev-login`, cookie `HttpOnly` | `[x] ĐẠT` | Giữ `ENABLE_DEV_LOGIN=false` trong `backend/.env` |
| 02 | **Rate Limiting:** Chống Brute-force & cạn kiệt quota AI ở cả Nginx và Flask | `[x] ĐẠT` | Giữ `DISABLE_RATE_LIMIT=false` trong `backend/.env` |
| 03 | **Chống lộ thông tin:** `sourcemap: false`, che giấu `str(e)` và Stack Trace | `[x] ĐẠT` | Kiểm tra lại bằng `curl -I` sau khi deploy |
| 04 | **Kiểm soát Upload:** Kiểm tra Magic Bytes + Pillow `verify()`, giới hạn 10 MB | `[x] ĐẠT` | Đảm bảo thư mục `storage/` không có quyền thực thi script |
| 05 | **Chống LFI / SSRF:** Khóa đường dẫn cục bộ & chặn mạng ngoài trong Playwright PDF | `[x] ĐẠT` | Đã tích hợp tự động trong `export_pdf.py` |
| 06 | **Bảo mật Thanh toán:** Webhook SePay HMAC fail-closed & bảng giá chuẩn máy chủ | `[x] ĐẠT` | Khai báo `SEPAY_API_KEY` thật trong `backend/.env` |
| 07 | **Cô lập Dữ liệu:** `chart_readings` khóa theo `(user_id, chart_code)` | `[x] ĐẠT` | Tự động di trú khi `init_all_databases()` khởi chạy |
| 08 | **Hạ tầng & Cổng mạng:** Docker `appuser` non-root, cổng `8080` chỉ bind `127.0.0.1` | `[x] ĐẠT` | Bật `ufw` trên Linux chỉ mở `22`, `80`, `443` |
| 09 | **Sao lưu Tự động:** Kịch bản `backup_sqlite.py` kiểm tra `PRAGMA integrity_check` | `[x] ĐẠT` | Cài đặt `crontab` chạy hàng ngày lúc 03:00 sáng |
| 10 | **Tuân thủ Pháp lý:** Trang `/chinh-sach`, `/dieu-khoan`, Footer chủ quản, Consent & DSR | `[x] ĐẠT` | Cập nhật số ĐKKD/MST thật vào `legalInfo.js` khi có giấy phép |

---

## 4. QUY TRÌNH ỨNG PHÓ SỰ CỐ AN NINH (INCIDENT RESPONSE)

1. **Phong tỏa nhanh IP tấn công bất thường:**
   ```bash
   sudo ufw insert 1 deny from <IP_NGHI_VAN> to any
   ```
2. **Thu hồi toàn bộ phiên đăng nhập khi nghi ngờ lộ khóa hoặc rò rỉ token:**
   ```bash
   sqlite3 /var/www/tuvihongan/backend/src/data/databases/customers_pii.db "DELETE FROM sessions;"
   sqlite3 /var/www/tuvihongan/backend/src/data/databases/auth_staff.db "DELETE FROM admin_sessions;"
   ```
3. **Luân chuyển khóa bí mật (`SECRET_KEY`, `SEPAY_API_KEY`, `GEMINI_API_KEY`):**
   - Cập nhật khóa mới vào `backend/.env` (hoặc kéo từ Vault qua `python3 security/devsecops/vault_secrets.py`).
   - Khởi động lại dịch vụ Backend (`sudo systemctl restart tuvi-backend` hoặc `docker compose -f deployment/docker/docker-compose.yml up -d`).
4. **Kiểm tra tính toàn vẹn và phục hồi CSDL:**
   - Thực hiện theo hướng dẫn tại Mục 6 của tài liệu `deployment/HUONG_DAN_TRIEN_KHAI_VA_CAP_NHAT.md`.
