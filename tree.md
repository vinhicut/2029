# TÀI LIỆU CẤU TRÚC PHÁT TRIỂN & TRIỂN KHAI DOCKER (TREE.MD)
**Dự án**: Website Tử Vi Hồng Ân  
**Phiên bản tài liệu**: 04 Giờ 02 Phút Ngày 13 Tháng 11 Năm 2026  
**Mục tiêu**: Định hình cấu trúc thư mục môi trường phát triển (Local Development) và mô hình triển khai máy chủ độc lập qua Docker Container (Production Deployment), đảm bảo tính nhất quán đa nền tảng (Windows local <-> Linux Server).

---

## PHẦN 1: CẤU TRÚC THƯ MỤC MÔI TRƯỜNG PHÁT TRIỂN & TỆP CẤU HÌNH QUAN TRỌNG

### 1.1. Sơ đồ Cây Thư mục Cấp Module (High-level Modular Tree)

Dưới đây là cấu trúc tổng quan phân cấp module của dự án tại môi trường phát triển. Cấu trúc được thiết kế theo mô hình Monorepo tách biệt rõ ràng giữa Backend (Python Standard Library & Flask API), Frontend (React 19 + Tailwind v4 + Vite SPA), Bảo mật (DevSecOps) và Triển khai (Deployment Scripts/Docker):

```
tu-vi-hong-an-web/
├── .agent/                                 # Quy chuẩn AI Agent & Nhật ký phiên làm việc (walkthroughs)
├── .github/                                # Quy trình CI/CD tự động hóa kiểm thử và build
│   └── workflows/                          # GitHub Actions workflow definitions
├── backend/                                # Phân hệ Máy chủ Dịch vụ & Động cơ Tính toán (Python)
│   └── src/                                # Toàn bộ mã nguồn thực thi Backend
│       ├── core/                           # Cấu hình trung tâm, kết nối DBManager (Dual-Mode) & Firebase
│       ├── data/                           # Lưu trữ dữ liệu cục bộ
│       │   ├── databases/                  # 10 CSDL SQLite chuyên biệt Domain-Driven Design (DDD)
│       │   ├── storage/                    # Lưu trữ ảnh lá số khách hàng & ảnh bài viết CMS
│       │   └── tuvi.db                     # CSDL SQLite nguyên khối dự phòng (chế độ monolithic)
│       ├── scripts/                        # Kịch bản bảo trì & di trú dữ liệu (migrate_modular_databases.py)
│       └── modules/                        # 14 Module nghiệp vụ độc lập (Domain-Driven Design)
│           ├── admin/                      # Module quản trị hệ thống và thống kê
│           ├── articles/                   # Module bài viết kiến thức tử vi & chính tinh
│           ├── astrology/                  # Động cơ an sao 14 chính tinh, 110+ phụ tinh & Gemini AI
│           │   ├── api/                    # Endpoint REST/SSE API tính lá số, giải đoán AI & hỏi đáp Q&A
│           │   ├── engine/                 # Lõi thuật toán an sao, can chi, lịch âm dương, context pruner
│           │   ├── exporter/               # Bộ xuất bản PDF vô hạn (210mm, 4 lề 20mm, nhúng ảnh lá số 4K)
│           │   └── interpreter/            # Bộ biên dịch prompt, kho phú thơ 50 cách cục & ca quyết vận hạn
│           ├── auth/                       # Module xác thực Google OAuth2 & phân quyền Admin/Cộng tác viên
│           ├── billing/                    # Cổng thanh toán SePay, QR VietQR tự động
│           ├── buddhism/                   # Module kinh kệ Phật pháp & bài viết tĩnh tâm
│           ├── chat/                       # Proxy API tin nhắn chat hỗ trợ khách hàng
│           ├── contact/                    # Module liên hệ & đặt lịch tư vấn chuyên gia
│           ├── courses/                    # Module quản lý khóa học đào tạo Tử Vi
│           ├── feng_shui/                  # Module phong thủy Bát Trạch & La bàn tương tác
│           ├── forum/                      # Module diễn đàn đàm đạo học thuật Tử Vi
│           ├── lunar_calendar/             # Module Lịch Vạn Sự, ngày tốt xấu, trực, sao cát hung
│           ├── shop/                       # Module thương mại vật phẩm phong thủy trợ mệnh
│           └── tarot_kieu/                 # Module bói Kiều 216 quẻ thi ca chiêm nghiệm
├── deployment/                             # Cấu hình triển khai hạ tầng & kịch bản khởi chạy
│   ├── docker/                             # Dockerfile và Docker Compose đa môi trường
│   ├── nginx/                              # Reverse Proxy Nginx, Rate Limiting & SSL
│   ├── scripts/                            # Kịch bản khởi chạy hợp nhất đa năng (Local, LAN HTTPS, ADB, Firewall)
│   └── ssl/                                # Thư mục chứng chỉ SSL/TLS tự ký cho LAN (.gitignore)
├── frontend/                               # Phân hệ Giao diện Người dùng (React 19 + Vite)
│   ├── public/                             # Tài nguyên tĩnh công khai (ảnh, astrology-engine iframe, qimen, tarot-kieu)
│   └── src/                                # Toàn bộ mã nguồn giao diện React
│       ├── app/                            # Cấu hình ứng dụng, Routing, Tailwind v4 và Global Modals
│       ├── features/                       # Các tính năng giao diện theo phân hệ nghiệp vụ
│       │   ├── astrology/                  # Giao diện lập lá số, Thiên Bàn 12 Cung & Gemini AI Split View
│       │   ├── auth/                       # Modal đăng nhập Google OAuth & hiển thị hạn mức dịch vụ
│       │   ├── bai-viet/                   # Chuyên mục & bài viết học thuật 14 chính tinh
│       │   ├── billing/                    # Modal thanh toán VietQR & polling kết quả SePay
│       │   ├── ky-mon/                     # Giao diện Kỳ Môn Độn Giáp & kho bài viết Cửu Diệu
│       │   ├── lich-van-su/                # Giao diện Lịch Vạn Sự, bloc lịch ngày, tháng & chọn ngày tốt
│       │   ├── phat-phap/                  # Giao diện chuyên mục & bài viết Phật pháp
│       │   ├── phong-thuy/                 # La bàn phong thủy 360 độ và tra cứu hướng nhà Bát Trạch
│       │   └── tarot-kieu/                 # Trải nghiệm rút thẻ Bói Kiều tương tác
│       ├── pages/                          # Các trang hiển thị chính của ứng dụng
│       │   ├── admin/                      # Trang quản trị & cộng tác viên (/admin, /quan-ly)
│       │   ├── courses/                    # Trang danh sách và chi tiết khóa học
│       │   ├── home/                       # Trang chủ Scrollytelling Desktop (> 580px) & Mobile (<= 580px)
│       │   └── policy/                     # Trang điều khoản dịch vụ & chính sách bảo mật
│       └── shared/                         # Thành phần dùng chung toàn ứng dụng
│           ├── assets/                     # Phông chữ Việt hóa cổ điển, logo chính thức
│           ├── motion/                     # Hệ thống chuyển trang đồng bộ (View Transitions API & Fallback)
│           ├── persistence/                # Hệ thống khôi phục cuộn trang & lưu trữ phiên (TTL/LRU)
│           ├── ui/                         # Layout components: Navbar, Footer, ChatWidget, ArticleBody
│           └── utils/                      # Hàm tiện ích: authRoles, articleContent, viewportScale
└── security/                               # Quản lý an ninh mạng & bí mật hệ thống (DevSecOps)
    ├── devsecops/                          # Chính sách CSP headers, script đóng gói & giải mã bí mật
    ├── keys-and-secrets/                   # Chứng chỉ Firebase Service Account, Google OAuth Client Secrets
    └── policies/                           # Hướng dẫn an ninh triển khai và xử lý sự cố
```

---

### 1.2. Danh mục các Tệp Cấu hình Quan trọng (Critical Configuration Files)

#### 1. Cấu hình Cấp Gốc (Root Level Configuration)

| Tệp tin | Vai trò & Trách nhiệm kiến trúc | Biến môi trường & Thiết lập quan trọng |
| :--- | :--- | :--- |
| `.gitignore` | Ngăn chặn rò rỉ mã nguồn nhạy cảm, chứng chỉ bảo mật, cơ sở dữ liệu SQLite, tệp nhật ký (logs), thư viện phụ thuộc (`node_modules`, `.venv`, `__pycache__`) và các bản build trung gian lên Git repository. | Khóa tuyệt đối các định dạng: `.env`, `.env.*`, `client_secret*.json`, `firebase-service-account*.json`, `*.db`, `*.log`. Ngoại lệ duy nhất được phép commit: `!.env.example`. |
| `tree.md` | Tài liệu kiến trúc cấp cao mô tả cấu trúc thư mục phát triển và sơ đồ triển khai trên hệ điều hành Linux sử dụng Docker. | Bản tài liệu này. |
| `super_tree.md` | Bản đồ chi tiết toàn diện đến từng tệp tin và quy định giới hạn vùng thực thi cho AI Coding Agents ("Single Source of Truth"). | Định nghĩa ranh giới an toàn: Vùng được phép sửa đổi vs Vùng cấm xâm phạm (Lõi tính toán giải thuật an sao). |

#### 2. Cấu hình Phân hệ Backend (`backend/`)

| Tệp tin | Vai trò & Trách nhiệm kiến trúc | Biến môi trường & Thiết lập quan trọng |
| :--- | :--- | :--- |
| `backend/requirements.txt` | Khai báo các thư viện phụ thuộc của Python runtime. Được tối ưu hóa cao độ để ưu tiên sử dụng Python Standard Library, chỉ bổ sung các thư viện tối cần thiết cho bảo mật, xác thực và máy chủ WSGI. | `cryptography>=41.0.0` (mã hóa dữ liệu AES-256), `flask>=3.0.0`, `werkzeug>=3.0.0`, `firebase-admin>=6.2.0`, `gunicorn>=21.2.0` (dành cho production container). |
| `backend/.env.example` (và `backend/.env`) | Tệp mẫu và tệp chứa giá trị cấu hình thực tế cho backend khi chạy tại máy phát triển cục bộ. | - `HOST=0.0.0.0`<br>- `PORT=8080`<br>- `CORS_ORIGIN=*`<br>- `DATABASE_MODE=modular` (10 CSDL DDD) hoặc `monolithic` (`tuvi.db`) |
| `backend/src/core/config.py` | Điểm nạp biến môi trường tập trung, phân giải đường dẫn tuyệt đối đa nền tảng, thiết lập danh sách quyền quản trị viên, đường dẫn database SQLite và Firebase credentials. | - `PROJECT_ROOT`: Tự động tìm thư mục gốc không phụ thuộc OS.<br>- `MANAGER_EMAILS`: Danh sách email quản trị viên có quyền truy cập trang `/admin`.<br>- `FIREBASE_CREDENTIALS_PATH`: Đường dẫn tới tệp Service Account JSON. |
| **Cấu hình Firebase Admin SDK** | Xác thực máy chủ backend với Google Cloud / Firebase để đồng bộ dữ liệu người dùng, lưu trữ lá số và phân quyền bảo mật. | - `FIREBASE_PROJECT_ID=tu-vi-hong`<br>- `FIREBASE_CREDENTIALS_PATH=security/keys-and-secrets/firebase-service-account.json`<br>- Tự động fallback sang Google Application Default Credentials (ADC) khi chạy trên GCP. |
| **Cấu hình SePay Webhook & Gateway** | Tích hợp cổng thanh toán tự động VietQR qua ngân hàng số SePay. Tự động xác thực webhook và cập nhật trạng thái đơn hàng. | - `SEPAY_API_KEY`: Khóa API bí mật xác thực webhook từ SePay Server gửi về.<br>- `SEPAY_BANK_NAME`: Tên viết tắt ngân hàng thụ hưởng (ví dụ: `MB`, `VCB`).<br>- `SEPAY_ACCOUNT_NO`: Số tài khoản ngân hàng nhận tiền.<br>- `SEPAY_ACCOUNT_NAME`: Tên chủ tài khoản in hoa không dấu.<br>- `HOTLINE`: Số điện thoại hỗ trợ kỹ thuật khách hàng. |
| **Cấu hình Google Gemini AI API** | Cung cấp năng lực luận giải lá số Tử Vi Đẩu Số và hỏi đáp Q&A tự động hóa cấp cao qua Google Gemini. | - `GEMINI_API_KEY`: API Key từ Google AI Studio / Vertex AI.<br>- `AI_MODEL_NAME` / `QA_MODEL_NAME=gemini-3.8-flash` (Thinking: `HIGH` cho luận giải, `LOW` cho Q&A).<br>- `MOCK_LLM_SERVICE=false`: Bật/tắt chế độ giả lập offline.<br>- `MAX_OUTPUT_TOKENS` / `EXTENDED_MAX_OUTPUT_TOKENS` (lên tới 32768) & `QA_MAX_OUTPUT_TOKENS=10000`.<br>- `EXTENDED_REQUEST_TIMEOUT_MS=900000`. |

#### 3. Cấu hình Phân hệ Frontend (`frontend/`)

| Tệp tin | Vai trò & Trách nhiệm kiến trúc | Biến môi trường & Thiết lập quan trọng |
| :--- | :--- | :--- |
| `frontend/package.json` | Quản lý vòng đời dự án frontend, danh sách thư viện sản xuất (`react`, `react-dom`, `react-router-dom`, `lucide-react`, `@tailwindcss/vite`, `tailwindcss`), thư viện phát triển (`vite`, `oxlint`, `@vitejs/plugin-react`) và các scripts thực thi. | Scripts: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`, `"lint": "oxlint"`. |
| `frontend/vite.config.js` | Tệp cấu hình của Vite bundler. Thiết lập output directory (`releases/dist` khi chạy `vite build`), tắt sourcemap trên production để bảo vệ bản quyền, và cấu hình Reverse Proxy chuyển tiếp các request `/api` về backend cổng 8080. | - `build.outDir: '../releases/dist'`<br>- `build.sourcemap: false`<br>- `server.proxy['/api'].target: 'http://127.0.0.1:8080'` |
| `frontend/.oxlintrc.json` | Cấu hình bộ linter Oxlint viết bằng Rust siêu nhanh. Kiểm tra nghiêm ngặt các lỗi React Hooks và quy tắc tối ưu hóa re-render. | `plugins: ["react", "oxc"]`, `rules: { "react/rules-of-hooks": "error", "react/only-export-components": ["warn"] }`. |
| `frontend/index.html` | Điểm vào chính của ứng dụng Single Page Application. Khai báo viewport responsive, phông chữ hệ thống, favicon, tiêu đề SEO và phần tử gốc `<div id="root"></div>`. | Nạp module script thực thi: `<script type="module" src="/src/main.jsx"></script>`. |

---

## PHẦN 2: CẤU TRÚC THƯ MỤC TRIỂN KHAI MÁY CHỦ DOCKER (PRODUCTION DOCKER DEPLOYMENT TREE)

### 2.1. Sơ đồ Cây Thư mục Chuẩn hóa trên Linux Server (`/opt/tu-vi-hong-an-web/`)

Khi triển khai trên máy chủ Linux Production (Ubuntu Server / Debian), toàn bộ hệ thống được cô lập và vận hành dưới sự điều phối của **Docker Compose** và **Nginx Reverse Proxy**. Cấu trúc thư mục chuẩn trên máy chủ như sau:

```
/opt/tu-vi-hong-an-web/
├── docker-compose.yml                      # Cấu hình điều phối các container (Base orchestration)
├── docker-compose.prod.yml                 # Cấu hình override cho Production (Resource limits, logging)
├── docker/                                 # Chứa Dockerfile và cấu hình build container chuyên dụng
│   ├── backend/                            # Thư mục build container Backend
│   │   ├── Dockerfile                      # Multi-stage/Slim build Python WSGI Server
│   │   └── gunicorn.conf.py                # Cấu hình Gunicorn production (Workers, Threads, Keepalive)
│   ├── frontend/                           # Thư mục build container Frontend
│   │   ├── Dockerfile                      # Multi-stage build: Node 20 builder -> Nginx serving
│   │   └── nginx-frontend.conf             # Cấu hình Nginx nội bộ phục vụ static SPA
│   └── nginx/                              # Thư mục Nginx Edge Gateway (Reverse Proxy mặt ngoài)
│       ├── Dockerfile                      # Nginx official image kèm cấu hình tối ưu
│       ├── nginx.conf                      # Cấu hình chính của Nginx Reverse Proxy
│       └── conf.d/                         # Cấu hình chi tiết từng domain và bảo mật
│           ├── default.conf                # Định tuyến domain, proxy /api, cấu hình SSL Let's Encrypt
│           ├── rate_limit.conf             # Cấu hình Rate Limiting bảo vệ AI API & SePay Webhook
│           └── security_headers.conf       # Cấu hình HSTS, CSP, X-Frame-Options, XSS Protection
├── env/                                    # Thư mục chứa các biến môi trường Production (chmod 600)
│   ├── .env.backend.prod                   # Biến môi trường mật của Backend trên Production
│   └── .env.frontend.prod                  # Biến môi trường đóng gói vào Frontend Production
├── volumes/                                # Thư mục lưu trữ dữ liệu bền vững (Persistent Data Storage)
│   ├── certbot/                            # Lưu trữ chứng chỉ số SSL/TLS của Let's Encrypt
│   │   ├── conf/                           # Chứa certificates (fullchain.pem, privkey.pem)
│   │   └── www/                            # Thư mục challenge xác thực ACME của Certbot
│   ├── logs/                               # Thư mục nhật ký hoạt động hệ thống
│   │   ├── nginx/                          # Nhật ký truy cập và lỗi của Nginx (access.log, error.log)
│   │   ├── backend/                        # Nhật ký ứng dụng Backend và giao dịch SePay
│   │   └── audit/                          # Nhật ký kiểm toán bảo mật và truy cập Admin
│   ├── storage/                            # Dữ liệu ứng dụng bền vững
│   │   ├── sqlite/                         # Tệp tuvi.db lưu trữ dữ liệu fallback/cache
│   │   └── uploads/                        # Tệp tài nguyên người dùng tải lên (nếu có)
│   └── backups/                            # Bản sao lưu tự động định kỳ hàng ngày (Cron backup)
└── scripts/                                # Kịch bản vận hành & bảo trì trên máy chủ
    ├── deploy.sh                           # Script tự động pull code, build và reload containers
    ├── backup.sh                           # Script sao lưu database và logs nén .tar.gz
    └── certbot_renew.sh                    # Script tự động gia hạn chứng chỉ SSL Let's Encrypt
```

### 2.2. Chi tiết Cấu hình Từng Thành phần Triển khai

#### 1. Cấu hình Điều phối Docker Compose (`docker-compose.prod.yml`)
Hệ thống sử dụng mạng Docker Bridge riêng biệt (`tuvi_internal_net`), tách biệt các container và không để lộ cổng backend trực tiếp ra Internet:
- **`tuvi_nginx_gateway`**: Điểm tiếp nhận duy nhất từ bên ngoài qua cổng 80 (HTTP) và 443 (HTTPS).
- **`tuvi_frontend_app`**: Container phục vụ mã nguồn tĩnh React đã được biên dịch tối ưu hóa.
- **`tuvi_backend_api`**: Container chạy ứng dụng Python Flask được giám sát bởi Gunicorn WSGI.
- **`certbot`**: Service định kỳ kiểm tra và gia hạn chứng chỉ SSL tự động.

#### 2. Cấu hình Backend Dockerfile (`docker/backend/Dockerfile`)
```dockerfile
FROM python:3.11-slim-bullseye AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_HOME=/app

WORKDIR $APP_HOME

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY backend/ .

# Tạo người dùng không đặc quyền (non-root) vì mục đích an toàn
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser $APP_HOME
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["gunicorn", "--config", "src/core/gunicorn.conf.py", "src.server:create_app()"]
```

#### 3. Cấu hình Frontend Multi-Stage Dockerfile (`docker/frontend/Dockerfile`)
```dockerfile
# Stage 1: Build mã nguồn React Vite
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --silent
COPY frontend/ .
RUN npm run build

# Stage 2: Serve tài nguyên tĩnh bằng Nginx chuyên dụng
FROM nginx:alpine-slim
COPY --from=builder /app/releases/dist /usr/share/nginx/html
COPY docker/frontend/nginx-frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
STOPSIGNAL SIGQUIT
CMD ["nginx", "-g", "daemon off;"]
```

#### 4. Cấu hình Nginx Reverse Proxy, SSL & Rate Limiting (`docker/nginx/nginx.conf`)
Bảo vệ toàn diện hệ thống với cấu hình Rate Limiting chống cạn kiệt tài nguyên đối với AI API và bảo đảm an toàn cho SePay Webhook:

```nginx
# Định nghĩa các vùng giới hạn tần suất (Rate Limiting Zones)
limit_req_zone $binary_remote_addr zone=ai_gemini_limit:10m rate=5r/m;       # Tối đa 5 yêu cầu/phút cho Gemini AI
limit_req_zone $binary_remote_addr zone=sepay_webhook_limit:10m rate=30r/m;  # Tối đa 30 yêu cầu/phút cho Webhook
limit_req_zone $binary_remote_addr zone=general_api_limit:10m rate=60r/m;    # Tối đa 60 yêu cầu/phút cho API thường

server {
    listen 80;
    server_name tuvihongan.com www.tuvihongan.com;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name tuvihongan.com www.tuvihongan.com;

    ssl_certificate /etc/letsencrypt/live/tuvihongan.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tuvihongan.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 1. Phục vụ Frontend Static Assets
    location / {
        proxy_pass http://tuvi_frontend_app:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. Định tuyến Gemini AI API (Có Rate Limiting nghiêm ngặt)
    location /api/ai/ {
        limit_req zone=ai_gemini_limit burst=3 nodelay;
        proxy_pass http://tuvi_backend_api:8080/api/ai/;
        proxy_http_version 1.1;
        proxy_read_timeout 150s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. Định tuyến SePay Webhook (Có Rate Limiting chuyên biệt)
    location /api/billing/webhook {
        limit_req zone=sepay_webhook_limit burst=10 nodelay;
        proxy_pass http://tuvi_backend_api:8080/api/billing/webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. Định tuyến toàn bộ các API khác
    location /api/ {
        limit_req zone=general_api_limit burst=20 nodelay;
        proxy_pass http://tuvi_backend_api:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### 2.3. Luồng Ánh Xạ (Volume Mapping & Network Flow)

#### 1. Nguyên tắc Ánh xạ Ổ đĩa (Volume Mapping) & Giải quyết Xung đột Windows - Linux
- **Vấn đề xung đột đường dẫn**: Trên môi trường cục bộ Windows, đường dẫn mang dạng ký tự ổ đĩa và dấu gạch chéo ngược (ví dụ: `E:\Documents\Tử Vi Hồng Ân Website\backend`). Khi đưa vào Linux Container, đường dẫn này hoàn toàn không hợp lệ và gây lỗi sập ứng dụng nếu hardcode.
- **Giải pháp chuẩn hóa**:
  1. Toàn bộ mã nguồn Python sử dụng module chuẩn `pathlib.Path` hoặc hàm `os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))` được định nghĩa động trong `backend/src/core/config.py` dựa trên vị trí tệp đang chạy (`__file__`).
  2. Trong môi trường Docker Production, toàn bộ mã nguồn được đóng gói tĩnh vào ảnh Docker (`/app`), không mount volume mã nguồn trực tiếp nhằm bảo đảm hiệu năng đọc/ghi I/O tối đa trên Linux kernel.
  3. Chỉ có 3 thành phần sau được mount dạng volume ngoại vi ra thư mục máy chủ host (`/opt/tu-vi-hong-an-web/volumes/`):
     - `volumes/logs/` -> `/var/log/` (Nơi ghi log để tiện audit và luân chuyển log qua logrotate).
     - `volumes/storage/sqlite/` -> `/app/src/data/` (Nơi lưu trữ file cơ sở dữ liệu `tuvi.db` không bị xóa khi tái khởi động container).
     - `volumes/certbot/` -> `/etc/letsencrypt/` (Nơi chia sẻ chứng chỉ SSL giữa Certbot và Nginx).

#### 2. Sơ đồ Luồng Mạng (End-to-End Network Flow)

```
[ Người dùng Internet / Trình duyệt Web / Mobile App ]
                       │
                       │ (HTTPS Cổng 443 / SSL TLS v1.3)
                       ▼
    ┌────────────────────────────────────────────────────────┐
    │          Nginx Edge Gateway (Cổng 80/443)              │
    │  - Chặn tấn công DDoS, SSL Termination                 │
    │  - Rate Limiter: AI Limit (5r/m), Webhook (30r/m)      │
    └──────────┬──────────────────────────────┬──────────────┘
               │                              │
     (Request Giao diện /*)         (Request API /api/*)
               │                              │
               ▼                              ▼
    ┌──────────────────────┐       ┌────────────────────────┐
    │   Frontend Service   │       │    Backend Service     │
    │   (Nginx Alpine)     │       │ (Gunicorn / Flask API) │
    │   Port 80 (Internal) │       │   Port 8080 (Internal) │
    │                      │       │                        │
    │  - index.html        │       │  - Core Tu Vi Engine   │
    │  - JS / CSS Chunks   │       │  - SePay Webhook       │
    │  - Static Assets     │       │  - SQLite Fallback DB  │
    └──────────────────────┘       └───────────┬────────────┘
                                               │
                                 ┌─────────────┴─────────────┐
                                 │                           │
                                 ▼                           ▼
                     ┌───────────────────────┐   ┌───────────────────────┐
                     │   Google Gemini API   │   │   SePay Banking API   │
                     │  (Vertex AI / Studio) │   │  (VietQR Verification)│
                     └───────────────────────┘   └───────────────────────┘
```
