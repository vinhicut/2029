# BẢN SƠ ĐỒ CÂY CHI TIẾT (SUPER_TREE.MD)
**Dự án**: Website Tử Vi Hồng Ân  
**Phiên bản tài liệu**: 04 Giờ 02 Phút Ngày 13 Tháng 11 Năm 2026  

---

## SƠ ĐỒ CÂY THƯ MỤC VÀ TỆP TIN CHI TIẾT(EXHAUSTIVE FILE-LEVEL TREE)

```
tu-vi-hong-an-web/
├── .env                                                    # Biến môi trường cục bộ (Bảo mật - Git ignored)
├── .gitignore                                              # Quy tắc bỏ qua tệp nhạy cảm và thư viện phụ thuộc
├── tree.md                                                 # Tài liệu cấu trúc phát triển & triển khai Docker
├── super_tree.md                                           # Bản đồ chi tiết toàn diện & giới hạn thực thi AI (SSOT)
│
├── .agent/                                                 # Quy chuẩn quy trình & Nhật ký phiên làm việc AI
│   ├── rules/
│   │   └── agent_workflow_rules.md                         # Quy chuẩn 4 giai đoạn & quản lý nhật ký phiên làm việc
│   ├── walkthroughs_values.txt                             # Chỉ mục tổng hợp 144 nhật ký phiên làm việc
│   └── walkthroughs/                                       # Thư mục lưu trữ 144 báo cáo walkthrough chi tiết
│
├── .github/                                                # Cấu hình tự động hóa GitHub
│   └── workflows/
│       └── ci.yml                                          # CI Pipeline: Kiểm thử tự động & build frontend/backend
│
├── security/                                               # Phân hệ An ninh mạng & Quản trị Bí mật (DevSecOps)
│   ├── devsecops/
│   │   ├── csp_headers.conf                                # Cấu hình Content Security Policy chống XSS
│   │   ├── generate_csp.py                                 # Script sinh mã băm SHA-256 cho CSP headers
│   │   ├── package_wasm.py                                 # Script đóng gói thuật toán WebAssembly bảo mật
│   │   ├── README.md                                       # Hướng dẫn quy trình DevSecOps và kiểm toán an ninh
│   │   ├── vault_secrets.py                                # Tiện ích nạp và giải mã bí mật an toàn
│   │   └── wasm_manifest.json                              # Manifest kiểm soát tính toàn vẹn chữ ký số WASM
│   ├── keys-and-secrets/
│   │   ├── client_secret_714306691526-iq2uodqu69fdcdalibn2ipgia2t4lqvs.apps.googleusercontent.com.json # Google OAuth Web Client Secret
│   │   └── firebase-service-account.json                   # Chứng thực quyền riêng tư Firebase Admin SDK
│   └── policies/
│       └── Deployment_Security_Guide.md                    # Hướng dẫn tuân thủ an toàn thông tin khi deploy
│
├── deployment/                                             # Tài nguyên Triển khai Máy chủ & Hạ tầng
│   ├── HUONG_DAN_TRIEN_KHAI_VA_CAP_NHAT.md                 # Tài liệu hướng dẫn chi tiết deploy, cập nhật UI/UX, Backend & bảng giá
│   ├── docker/
│   │   ├── docker-compose.yml                              # File điều phối khởi chạy hệ thống container
│   │   └── Dockerfile                                      # Bản thiết kế build container môi trường cục bộ
│   ├── nginx/
│   │   └── nginx.conf                                      # Cấu hình máy chủ Proxy ngược, SSL và Cache
│   ├── scripts/
│   │   ├── backup_sqlite.py                                # Kịch bản sao lưu online SQLite WAL, kiểm tra toàn vẹn & dọn session hết hạn
│   │   ├── start.bat                                       # Script khởi chạy nhanh môi trường trên Windows (gọi start.py)
│   │   └── start.py                                        # Kịch bản Python hợp nhất đa năng (Local, LAN, Android ADB, IP, Firewall)
│   └── ssl/                                                # Thư mục chứng chỉ SSL/TLS (.gitignore)
│
├── backend/                                                # PHÂN HỆ MÁY CHỦ & ĐỘNG CƠ TÍNH TOÁN (PYTHON)
│   ├── .env                                                # Biến môi trường mật của Backend (Port, Keys, DB)
│   ├── .env.example                                        # Mẫu khai báo biến môi trường cho Backend
│   ├── requirements.txt                                    # Khai báo các thư viện Python chuẩn cần thiết
│   └── src/
│       ├── server.py                                       # Máy chủ HTTP Flask chính, định tuyến và static serving
│       ├── core/                                           # Lõi cấu hình và cơ sở dữ liệu
│       │   ├── config.py                                   # Nạp cấu hình môi trường, phân giải path tuyệt đối
│       │   ├── customer_store.py                           # Lưu trữ thống nhất tài khoản khách, nhật ký lá số & chat
│       │   ├── db.py                                       # Cổng giao tiếp Facade SQLite (Dual-Mode: Modular & Monolithic)
│       │   ├── db_manager.py                               # Trình quản lý kết nối 10 CSDL module hóa & ATTACH hợp nhất
│       │   └── firebase_db.py                              # Kết nối và xử lý thao tác với Firebase Firestore/Realtime
│       ├── data/
│       │   ├── tuvi.db                                     # Tệp cơ sở dữ liệu SQLite cục bộ (chế độ monolithic & backup)
│       │   ├── databases/                                  # Thư mục lưu trữ 10 CSDL chuyên biệt Domain-Driven Design
│       │   │   ├── auth_staff.db                           # Phân hệ Quản trị viên, Lập trình viên, Cộng tác viên (admin_sessions)
│       │   │   ├── customers_pii.db                        # Phân hệ Khách hàng & PII (users, sessions, accounts, contacts)
│       │   │   ├── cskh_chat.db                            # Phân hệ CSKH (tin nhắn chat trực tiếp 1-1 trên website)
│       │   │   ├── billing.db                              # Phân hệ Giao dịch & Đơn hàng (billing_orders, transactions)
│       │   │   ├── charts.db                               # Phân hệ Dữ liệu Lá số (user_charts không kèm bài luận dài)
│       │   │   ├── ai_readings.db                          # Phân hệ Luận giải AI (toàn văn reading_markdown 7000-8000 từ & QA)
│       │   │   ├── articles_academic.db                    # Phân hệ Bài viết học thuật 14 chính tinh & Chuyên mục
│       │   │   ├── buddhism.db                             # Phân hệ Phật pháp & Tĩnh tâm (buddhism_articles mở rộng CMS)
│       │   │   ├── courses.db                              # Phân hệ Khóa học đào tạo & Danh sách ghi danh học viên
│       │   │   └── community_forum.db                      # Phân hệ Diễn đàn thảo luận & Shop vật phẩm phong thủy
│       │   └── storage/                                    # Thư mục lưu trữ ảnh lá số khách hàng & ảnh bài viết CMS
│       ├── scripts/                                        # Các kịch bản bảo trì & di trú hệ thống
│       │   └── migrate_modular_databases.py                # Kịch bản di trú dữ liệu tự động từ tuvi.db sang 10 CSDL module
│       └── modules/                                        # Các module dịch vụ nghiệp vụ (Domain Modules)
│           ├── admin/                                      # Quản trị hệ thống
│           │   ├── admin_db.py                             # Thao tác dữ liệu bảng thống kê và tài khoản admin
│           │   └── routes_admin.py                         # Endpoints API /api/admin quản trị và thống kê
│           ├── articles/                                   # Bài viết học thuật
│           │   ├── __init__.py                             # Điểm xuất Blueprint articles_bp
│           │   ├── models.py                               # Model dữ liệu bài viết và chuyên mục
│           │   ├── repository.py                           # Thao tác đọc/ghi dữ liệu bài viết vào DB
│           │   ├── routes.py                               # Endpoints API /api/articles xem danh sách và chi tiết
│           │   └── service.py                              # Nghiệp vụ xử lý bài viết và bài viết liên quan
│           ├── astrology/                                  # Động cơ Tử Vi Đẩu Số & Trí tuệ nhân tạo
│           │   ├── api/
│           │   │   ├── __init__.py                         # Điểm xuất Blueprint API astrology
│           │   │   ├── routes_ai.py                        # Endpoints API /api/ai/reading, /api/ai/ask (hỏi đáp AI) và /api/ai/status
│           │   │   └── routes_charts.py                    # Endpoints API /api/calculate và /api/charts
│           │   ├── engine/                                 # LÕI THUẬT TOÁN TÍNH TOÁN AN SAO (VÙNG ĐỎ)
│           │   │   ├── __init__.py                         # Điểm xuất hàm calculate_tuvi_chart
│           │   │   ├── constants.py                        # Bảng hằng số Can Chi, Ngũ Hành, 12 Cung, Tinh Đẩu
│           │   │   ├── context_pruner.py                   # Cắt tỉa và cô đọng dữ liệu lá số trước khi gửi AI
│           │   │   ├── core.py                             # Thuật toán tìm Cục, Mệnh, Thân và an 14 Chính Tinh
│           │   │   ├── han_van.py                          # Thuật toán tính Đại Vận, Lưu Niên, Tiểu Hạn, Nguyệt Hạn
│           │   │   ├── lunar_calendar.py                   # Thuật toán chuyển đổi Dương lịch - Âm lịch, Tiết khí
│           │   │   ├── markdown_exporter.py                # Xuất cấu trúc lá số thành văn bản Markdown chuẩn mực
│           │   │   ├── models.py                           # Cấu trúc dữ liệu Python đại diện cho Lá Số & Cung Vị
│           │   │   ├── sao_chinh.py                        # Quy tắc an và độ đắc hãm của 14 Chính Tinh
│           │   │   ├── sao_phu.py                          # Quy tắc an 110+ Phụ Tinh, Tứ Hóa, Vòng Tràng Sinh
│           │   │   └── thien_ban.py                        # Bố cục 12 Cung Địa Bàn và thiết lập Thiên Bàn
│           │   ├── exporter/
│           │   │   └── export_pdf.py                       # Bộ xuất bản PDF luận giải vô hạn
│           │   └── interpreter/                            # BỘ GIẢI ĐOÁN TRÍ TUỆ NHÂN TẠO GEMINI
│           │       ├── __init__.py                         # Điểm xuất module giải đoán AI
│           │       ├── benchmark.py                        # Đo lường tốc độ xử lý và độ trễ phản hồi của AI
│           │       ├── config.py                           # Cấu hình tham số model Gemini (token, thinking level)
│           │       ├── mock_service.py                     # Dịch vụ giả lập luận giải AI phục vụ test offline
│           │       ├── prompt_compiler.py                  # Trình biên dịch prompt luận giải chuyên sâu
│           │       ├── service.py                          # Dịch vụ chính tương tác với Google Gemini API
│           │       └── resources/
│           │           ├── 50_cach_cuc_chuan_hoa.md        # Tri thức 50 cách cục đặc biệt Tử Vi Đẩu Số
│           │           ├── 50_cach_cuc_index.json          # Chỉ mục tra cứu nhanh điều kiện hình thành cách cục
│           │           ├── classical_aphorisms_kb.md       # Kho tri thức ca quyết & câu phú kinh điển toàn diện (14 chính tinh, đại cách cục, Tuần/Triệt)
│           │           ├── destiny_interpretation.md       # Cấu trúc dàn ý mẫu phân tích cung Mệnh/Thân
│           │           ├── pronoun_rules.json              # Quy tắc xưng hô trang trọng và chuẩn mực của AI
│           │           ├── van_han_phu_index.json          # Chỉ mục ma trận tra cứu vi mô 93 câu phú vận hạn theo bộ sao
│           │           └── van_han_phu_tho.md              # Kho ca quyết & phú thơ vận hạn chuẩn hóa 9 chuyên đề (ZX-01)
│           ├── auth/                                       # Xác thực & Phân quyền
│           │   ├── admin_auth.py                           # Kiểm tra quyền quản trị viên và phiên admin
│           │   ├── auth.py                                 # Xác thực Google OAuth ID Token và phiên làm việc
│           │   └── routes_auth.py                          # Endpoints API /api/auth (login, logout, session)
│           ├── billing/                                    # Thanh toán VietQR & SePay Gateway
│           │   ├── __init__.py                             # Điểm xuất Blueprint billing_bp
│           │   ├── models.py                               # Model đơn hàng (Order) và giao dịch (Transaction)
│           │   ├── repository.py                           # Thao tác đọc ghi đơn hàng thanh toán trong database
│           │   ├── routes.py                               # Endpoints API /api/billing/orders và /webhook
│           │   └── service.py                              # Xử lý sinh mã QR VietQR và xác thực SePay Webhook
│           ├── buddhism/                                   # Phật giáo & Tĩnh tâm
│           │   ├── __init__.py                             # Điểm xuất Blueprint buddhism_bp
│           │   ├── models.py                               # Model kinh kệ, danh ngôn và câu niệm Phật
│           │   ├── repository.py                           # Đọc danh sách bài kinh và lời dạy Phật giáo
│           │   ├── routes.py                               # Endpoints API /api/buddhism lấy kinh văn ngẫu nhiên
│           │   └── service.py                              # Logic chọn lọc câu kệ theo năng lượng ngày
│           ├── contact/                                    # Liên hệ & Đặt lịch
│           │   ├── __init__.py                             # Điểm xuất Blueprint contact_bp và booking_bp
│           │   ├── models.py                               # Model tin nhắn liên hệ và phiếu đặt lịch tư vấn
│           │   ├── repository.py                           # Lưu trữ lịch hẹn và phản hồi khách hàng
│           │   ├── routes.py                               # Endpoints API /api/contact và /api/booking
│           │   └── service.py                              # Gửi email thông báo đặt lịch qua giao thức SMTP
│           ├── courses/                                    # Đào tạo & Khóa học
│           │   ├── __init__.py                             # Điểm xuất Blueprint courses_bp
│           │   ├── models.py                               # Model khóa học Tử Vi và danh sách học viên
│           │   ├── repository.py                           # Truy vấn danh mục khóa học đào tạo
│           │   ├── routes.py                               # Endpoints API /api/courses tra cứu thông tin khóa học
│           │   └── service.py                              # Quản lý tuyển sinh và ghi danh học tập
│           ├── feng_shui/                                  # Phong thủy Bát Trạch & La Kinh
│           │   ├── __init__.py                             # Điểm xuất Blueprint feng_shui_bp
│           │   ├── models.py                               # Model Cung Phi, Hướng Nhà và Tương Hợp Tuổi
│           │   ├── repository.py                           # Tra cứu số học Bát Quái và 60 Hoa Giáp
│           │   ├── routes.py                               # Endpoints API /api/feng-shui tính hướng cát hung
│           │   └── service.py                              # Thuật toán tính quái số mệnh và độ hợp phối ngẫu
│           ├── forum/                                      # Diễn đàn học thuật
│           │   ├── __init__.py                             # Điểm xuất Blueprint forum_bp
│           │   ├── models.py                               # Model bài thảo luận lá số và bình luận
│           │   ├── repository.py                           # Lưu trữ và truy vấn câu hỏi diễn đàn
│           │   ├── routes.py                               # Endpoints API /api/forum đăng bài và trao đổi
│           │   └── service.py                              # Kiểm duyệt nội dung và sắp xếp bài thảo luận
│           ├── lunar_calendar/                             # Lịch Vạn Sự & Tiết Khí
│           │   ├── __init__.py                             # Điểm xuất Blueprint lunar_calendar_bp
│           │   ├── models.py                               # Model ngày Hoàng/Hắc Đạo, Thập Nhị Trực, Nhị Thập Bát Tú
│           │   ├── repository.py                           # Kho dữ liệu thần sát và sao cát hung theo ngày
│           │   ├── routes.py                               # Endpoints API /api/lunar-calendar tra cứu ngày đẹp
│           │   └── service.py                              # Tính toán ngũ hành ngày, việc nên làm và kiêng cữ
│           ├── chat/
│           │   └── routes_chat.py                          # Proxy API tin nhắn chat khách hàng
│           ├── shop/                                       # Cửa hàng vật phẩm phong thủy
│           │   ├── __init__.py                             # Điểm xuất Blueprint shop_bp
│           │   ├── models.py                               # Model vật phẩm trợ mệnh, giá bán và tồn kho
│           │   ├── repository.py                           # Đọc ghi danh mục sản phẩm vào cơ sở dữ liệu
│           │   ├── routes.py                               # Endpoints API /api/shop tra cứu và đặt mua
│           │   └── service.py                              # Xử lý giỏ hàng và liên kết thanh toán đơn hàng
│           └── tarot_kieu/                                 # Bói Kiều chiêm nghiệm
│               ├── __init__.py                             # Điểm xuất Blueprint tarot_kieu_bp
│               ├── models.py                               # Model 216 quẻ bói thi ca Truyện Kiều
│               ├── repository.py                           # Kho dữ liệu câu thơ Kiều và lời bình giải
│               ├── routes.py                               # Endpoints API /api/tarot-kieu rút thẻ chiêm đoán
│               └── service.py                              # Thuật toán bốc quẻ ngẫu nhiên và giải đoán tâm sự
│
└── frontend/                                               # PHÂN HỆ GIAO DIỆN NGƯỜI DÙNG (REACT 19 + VITE)
    ├── .oxlintrc.json                                      # Cấu hình linter siêu tốc Oxlint cho React JSX
    ├── index.html                                          # Điểm vào HTML chính của Single Page App
    ├── package.json                                        # Khai báo dependencies npm và các script build
    ├── package-lock.json                                   # Khóa phiên bản chuẩn xác của node packages
    ├── vite.config.js                                      # Cấu hình Vite, thư mục build releases/dist và proxy
    │
    ├── public/                                             # Tài nguyên tĩnh phục vụ trực tiếp không qua build
    │   ├── Avatar.jpg                                      # Ảnh đại diện thương hiệu Tử Vi Hồng Ân
    │   ├── qr-qronly-sepay.png                             # Mã QR SePay phục vụ cổng thanh toán chuyển khoản
    │   ├── BatQuai.png                                     # Đồ hình Bát Quái trận đồ phong thủy
    │   ├── khoa-hoc-tu-vi-co-ban-ngang.png                 # Banner khóa học Tử Vi cơ bản
    │   ├── khoa-hoc-tu-vi-co-ban.jpg                       # Ảnh minh họa khóa học Tử Vi cơ bản
    │   ├── logo.png                                        # Logo Hồng Ân định dạng PNG trong suốt
    │   ├── astrology-engine/                               # Động cơ độc lập chạy trên trình duyệt (Iframe)
    │   │   ├── laso-tuvi.html                              # Trang render lá số độc lập
    │   │   ├── css/
    │   │   │   ├── board.css                               # Style lưới Thiên Bàn 12 Cung cổ điển
    │   │   │   ├── controls.css                            # Style thanh điều khiển và lịch sử lá số
    │   │   │   ├── print.css                               # Style tối ưu xuất bản in lá số ra giấy A4
    │   │   │   └── theme.css                               # Biến màu sắc ngũ hành và phông nền cổ
    │   │   └── js/
    │   │       ├── app.js                                  # Điểm khởi chạy của engine độc lập
    │   │       ├── board-renderer.js                       # Logic vẽ các cung vị và sao lên DOM
    │   │       ├── constants.js                            # Hằng số sao, cung và ngũ hành phía client
    │   │       ├── dpop.js                                 # Cơ chế xác thực DPoP cho API client
    │   │       ├── export-engine.js                        # Xuất ảnh lá số chất lượng cao PNG/PDF
    │   │       ├── geometry.js                             # Thuật toán tính toán tọa độ đường nối cung
    │   │       └── ui-controller.js                        # Bộ điều khiển giao diện lá số & lịch sử
    │   ├── qimen/                                          # Tài nguyên đồ họa Kỳ Môn Độn Giáp
    │   │   ├── ke-do.webp                                  # Hình minh họa Cửu Diệu: Kế Đô tinh quân
    │   │   ├── la-hau.webp                                 # Hình minh họa Cửu Diệu: La Hầu tinh quân
    │   │   ├── moc-duc.webp                                # Hình minh họa Cửu Diệu: Mộc Đức tinh quân
    │   │   ├── thai-am.webp                                # Hình minh họa Cửu Diệu: Thái Âm tinh quân
    │   │   ├── thai-bach.webp                              # Hình minh họa Cửu Diệu: Thái Bạch tinh quân
    │   │   ├── thai-duong.webp                             # Hình minh họa Cửu Diệu: Thái Dương tinh quân
    │   │   ├── tho-tu.webp                                 # Hình minh họa Cửu Diệu: Thổ Tú tinh quân
    │   │   ├── thuy-dieu.webp                              # Hình minh họa Cửu Diệu: Thủy Diệu tinh quân
    │   │   └── van-hon.webp                                # Hình minh họa Cửu Diệu: Vân Hớn tinh quân
    │   └── tarot-kieu/                                     # Tài nguyên phục vụ tính năng Bói Kiều
    │       ├── nen-tarot-kieu.png                          # Phông nền thư tịch cổ trải bài Kiều
    │       ├── wheel.png                                   # Bánh xe vận mệnh quay quẻ
    │       ├── cards/                                      # Thư mục chứa 210 ảnh minh họa thẻ bài thơ Kiều tự do
    │       ├── cards-at-binh-dinh-mau/                     # 4 nhóm chủ đề (60 ảnh quẻ Ất/Bính/Đinh/Mậu)
    │       ├── cards-can-kham-can/                         # 3 nhóm chủ đề (45 ảnh quẻ Cấn/Khảm/Càn)
    │       ├── cards-chan-ton/                             # 2 nhóm chủ đề (30 ảnh quẻ Chấn/Tốn)
    │       ├── cards-giap-thien-di/                        # 1 nhóm chủ đề (15 ảnh quẻ Giáp Thiên Di)
    │       ├── cards-ky-canh-tan-nham-quy/                 # 5 nhóm chủ đề (75 ảnh quẻ Kỷ/Canh/Tân/Nhâm/Quý)
    │       └── cards-ly-khon-doai/                         # 3 nhóm chủ đề (45 ảnh quẻ Ly/Khôn/Đoài)
    │
    └── src/                                                # Toàn bộ mã nguồn phát triển React Frontend
        ├── main.jsx                                        # Entry point khởi tạo React DOM và nạp root component
        ├── app/                                            # Cấu trúc ứng dụng cấp cao nhất
        │   ├── App.css                                     # Stylesheet toàn cục của ứng dụng
        │   ├── App.jsx                                     # Component chủ lực: Routing, State, Global Modals
        │   └── index.css                                   # Cấu hình Tailwind v4, motion tokens và phông chữ toàn cục
        │
        ├── features/                                       # Các module chức năng giao diện (Features)
        │   ├── astrology/                                  # Giao diện Lá Số Tử Vi & AI Giải Đoán
        │   │   ├── AiInterpretationGeminiView.css          # Giao diện hiển thị bài luận giải, popover gợi ý & animation
        │   │   ├── AiInterpretationGeminiView.jsx          # Component hiển thị bài luận giải, thanh nhập liệu & streaming
        │   │   ├── LaSoTuVi.css                            # Style lưới 12 Cung và phối màu ngũ hành lá số
        │   │   ├── LaSoTuVi.jsx                            # Giao diện hiển thị lá số hoàn chỉnh
        │   │   ├── LaSoTuViContainer.jsx                   # Container điều phối nhập ngày sinh và gọi API
        │   │   ├── components/
        │   │   │   ├── AiConfirmChartCard.css              # Style thẻ xác nhận thông tin đương số trước khi luận giải
        │   │   │   ├── AiConfirmChartCard.jsx              # Thẻ xác nhận thông tin đương số & kiểm tra hạn mức
        │   │   │   ├── AiReadingPodcastView.css            # Style trình phát âm thanh luận giải
        │   │   │   ├── AiReadingPodcastView.jsx            # Trình phát giọng đọc AI Podcast lá số
        │   │   │   ├── AstrologyChartView.css              # Style cho khung xem lá số
        │   │   │   └── AstrologyChartView.jsx              # Khung iframe tích hợp Astrology Engine
        │   │   ├── constants/
        │   │   │   └── astrologyConfig.js                  # Cấu hình danh mục gói dịch vụ và thông số AI
        │   │   └── services/
        │   │       ├── aiReadingClient.js                  # Client giao tiếp API /api/ai/reading & SSE streaming
        │   │       ├── audioPodcastService.js              # Xử lý luồng âm thanh podcast AI
        │   │       ├── chartDataBridge.js                  # Cầu nối đồng bộ dữ liệu liên trang & Hash URL
        │   │       ├── chartEventBridge.js                 # Đồng bộ sự kiện từ iframe lá số sang React
        │   │       └── indexedDbStorage.js                 # Bộ nhớ đệm IndexedDB lưu trữ lá số và bài luận
        │   ├── auth/                                       # Đăng nhập & Xác thực
        │   │   ├── AuthModal.css                           # Giao diện modal đăng nhập Google
        │   │   └── AuthModal.jsx                           # Modal đăng nhập tài khoản và Google OAuth One-Tap
        │   ├── bai-viet/                                   # Chuyên mục & Bài viết Tử Vi học thuật
        │   │   ├── CategoryPage.css & CategoryPage.jsx     # Trang danh mục bài viết theo chủ đề
        │   │   ├── CuMon.jsx, PhaQuan.jsx, ThatSat.jsx, ThienLuong.jsx # Bài luận giải chuyên sâu các chính tinh
        │   │   ├── KhamThienGiamThaiDuong.css & KhamThienGiamThaiDuong.jsx # Bài nghiên cứu sao Thái Dương theo cổ thư
        │   │   └── KhamThienTuViThienTuong.css & KhamThienTuViThienTuong.jsx # Bài nghiên cứu Khâm Thiên Giám Thiên Tướng
        │   ├── billing/                                    # Thanh toán VietQR & SePay
        │   │   ├── Billing.css                             # Giao diện hiển thị quét mã QR chuyển khoản
        │   │   ├── api/billingApi.js                       # Client gọi API tạo đơn và kiểm tra trạng thái đơn
        │   │   ├── components/PaymentModal.jsx             # Modal hiển thị mã VietQR động thanh toán
        │   │   └── hooks/usePaymentPolling.js              # Hook tự động thăm dò (polling) kết quả thanh toán
        │   ├── ky-mon/                                     # Kỳ Môn Độn Giáp (giao diện đang dùng)
        │   │   ├── QimenArticles.css & QimenPage.jsx       # Giao diện tra cứu và an bàn Kỳ Môn Độn Giáp
        │   │   └── qimenArticles.js & qimenOriginalDetails.js # Dữ liệu bài viết và chi tiết Bát Môn/Cửu Tinh/Bát Thần
        │   ├── lich-van-su/                                # Lịch Vạn Sự & Âm Dương Lịch (đang dùng)
        │   │   ├── LichVanSu.css & LichVanSu.jsx           # Giao diện và điều phối Lịch Vạn Sự
        │   │   ├── components/
        │   │   │   ├── common/CalendarTabNav.jsx           # Thanh điều hướng tab Lịch Vạn Sự
        │   │   │   ├── converter/DualDateSyncBar.jsx       # Thanh chuyển đổi đồng bộ Dương lịch - Âm lịch
        │   │   │   ├── daily/
        │   │   │   │   ├── DailyTearCalendar.jsx           # Bloc lịch xé ngày truyền thống
        │   │   │   │   ├── DayDeitiesAndStars.jsx          # Thông tin Thần Sát, Trực, Nhị Thập Bát Tú trong ngày
        │   │   │   │   ├── DepartureAndConflicts.jsx       # Hướng xuất hành & tuổi xung khắc trong ngày
        │   │   │   │   ├── HourlyFortuneMatrix.jsx         # Bảng giờ Hoàng Đạo / Hắc Đạo trong ngày
        │   │   │   │   └── MiniMonthCalendar.jsx           # Lịch tháng thu gọn điều hướng nhanh
        │   │   │   ├── goodDays/GoodDayFilterView.jsx      # Bộ lọc tìm ngày tốt theo công việc
        │   │   │   └── monthly/
        │   │   │       ├── MonthlyCalendarGrid.jsx         # Lưới lịch tháng Âm - Dương đầy đủ
        │   │   │       └── MonthlyDayInspector.jsx         # Khung xem chi tiết ngày được chọn trên lưới tháng
        │   │   ├── core/
        │   │   │   ├── index.js                            # Điểm xuất API lõi Lịch Vạn Sự
        │   │   │   ├── astronomy/                          # julianDay.js, lunarSolarConverter.js, solarTerms.js
        │   │   │   ├── deities/                            # catHungStars.js, hoangDaoHacDao.js, lucDieu.js, nhiThapBatTu.js, thapNhiKienTru.js
        │   │   │   ├── divination/                         # conflictResolver.js, departureDirections.js, lyThuanPhongHours.js
        │   │   │   ├── evaluation/                         # dayScoringEngine.js, taskAdvisor.js
        │   │   │   ├── holidays/                           # vietnameseHolidays.js
        │   │   │   └── sexagenary/                         # canChiCalculator.js, canChiTables.js
        │   │   └── hooks/
        │   │       ├── useDateConverterSync.js             # Hook đồng bộ bộ chuyển đổi ngày Âm - Dương
        │   │       ├── useGoodDayFinder.js                 # Hook tìm kiếm ngày hoàng đạo theo tiêu chí
        │   │       └── useLichVanSu.js                     # Hook trạng thái trung tâm Lịch Vạn Sự
        │   ├── phat-phap/                                  # Phật pháp ứng dụng
        │   │   └── PhatPhapPage.css & PhatPhapPage.jsx     # Trang chuyên mục và bài viết Phật pháp
        │   ├── phong-thuy/                                 # Phong thủy Bát Trạch & La Bàn (đang dùng)
        │   │   ├── index.js                                # Barrel export phân hệ Phong Thủy
        │   │   ├── PhongThuyWidget.jsx                     # Widget điều phối chính Phong Thủy Bát Trạch
        │   │   ├── Header.jsx, SelectorBar.jsx, OverviewCard.jsx # Thanh chọn tuổi, giới tính & tổng quan cung mệnh
        │   │   ├── InteractiveCompass.jsx                  # La bàn phong thủy 360 độ tương tác
        │   │   ├── DirectionsSection.jsx                   # Phân tích 8 hướng Bát Trạch (Sinh Khí, Thiên Y, ...)
        │   │   ├── HomeLayoutGuide.jsx                     # Hướng dẫn bố trí công năng nhà ở hợp mệnh
        │   │   ├── SingleHomeownerGuide.jsx                # Tư vấn hướng nhà cho gia chủ độc thân
        │   │   ├── SpouseCompatibilitySection.jsx          # Phân tích hợp tuổi phối ngẫu
        │   │   └── fengShuiData.js, fengShuiLogic.js, sixtyHoaGiap.js # Dữ liệu & thuật toán 60 Hoa Giáp, Bát Quái
        │   └── tarot-kieu/                                 # Bói Kiều Chiêm Nghiệm
        │       ├── BoiKieu.css                             # Giao diện huyền ảo với hiệu ứng hoa đào rơi
        │       └── BoiKieu.jsx                             # Component rút quẻ và xem lời bình Truyện Kiều
        │
        ├── pages/                                          # Các trang điều hướng chính (Pages)
        │   ├── admin/                                      # Quản trị hệ thống & Cộng tác viên
        │   │   ├── ManagementGuard.jsx                     # Bảo vệ route /quan-ly theo vai trò tài khoản
        │   │   ├── AdminDashboard.css & AdminDashboard.jsx # Bảng điều khiển thống kê quản trị viên
        │   │   ├── QuanLy.css & QuanLy.jsx                 # Trang quản lý tổng hợp (/quan-ly)
        │   │   ├── UserManagement.css & UserManagement.jsx # Quản lý người dùng và phân quyền
        │   │   ├── AdminChatPanel.css & AdminChatPanel.jsx # Bảng trả lời chat CSKH trực tiếp
        │   │   └── ArticleManager.css, ArticleManagerFormatting.css, ArticleManagerWord.css, ArticleManager.jsx # Trình soạn thảo & quản lý bài viết CMS
        │   ├── courses/                                    # Đào tạo & Khóa học
        │   │   ├── CoursesPage.css & CoursesPage.jsx       # Trang danh sách khóa học Tử Vi
        │   │   └── CourseArticlePage.jsx                   # Trang chi tiết nội dung bài học
        │   ├── home/
        │   │   ├── homeData.js                             # Dữ liệu dùng chung Trang chủ (12 cung, 4 bước Thiên Bàn, Ngũ Hành, gói dịch vụ)
        │   │   ├── Home.jsx                                # Bộ điều phối Trang chủ (Desktop > 580px & Mobile <= 580px)
        │   │   ├── HomeMobile.css                          # Stylesheet hiệu ứng cuộn & chạm tối ưu riêng cho thiết bị di động
        │   │   ├── HomeMobile.jsx                          # Giao diện Trang chủ Scrollytelling tối ưu riêng cho Mobile (<= 580px)
        │   │   ├── HomeScrollytelling.css                  # Stylesheet hiệu ứng cuộn, parallax & SVG scrollytelling
        │   │   └── ScrollyThienBan.jsx                     # Chương II & III (Desktop): Sticky Thiên Bàn 12 cung & Biểu đồ Ngũ Hành
        │   └── policy/
        │       ├── Policy.css                               # Stylesheet cho trang Chính sách Bảo vệ Dữ liệu & Điều khoản Thương mại
        │       └── Policy.jsx                               # Trang điều khoản dịch vụ, chính sách NĐ 13/2023 và tự xuất/xóa dữ liệu
        │
        └── shared/                                         # Các thành phần và tiện ích dùng chung (Shared)
            ├── assets/                                     # Phông chữ Việt hóa cổ điển và biểu tượng
            │   ├── ha-logo.png                             # Logo nhận diện thương hiệu Tử Vi Hồng Ân
            │   ├── ICIEL-Lordish-Regular.otf               # Phông chữ Gothic/Thư pháp hoàng cung
            │   ├── MTD-Avelina.otf                         # Phông chữ trang trọng dùng cho tiêu đề lớn
            │   └── UVN-HOA-KY.ttf                          # Phông chữ Việt hóa cổ điển thời khắc bản gỗ
            ├── constants/                                  # Hằng số cấu hình dùng chung trên Frontend
            │   └── legalInfo.js                            # Thông tin định danh chủ quản & liên hệ DPO dùng chung (Footer, Policy)
            ├── motion/                                     # Hệ thống chuyển trang đồng bộ (View Transitions API & Fallback)
            │   ├── pageTransition.js                       # Phân loại hướng chuyển cảnh (peer, drill-down/up) & startViewTransition
            │   └── useGlobalPageTransitions.js             # Hook bắt điều hướng nội bộ, xử lý popstate & fallback CSS
            ├── persistence/                                # Hệ thống lưu trữ & khôi phục cuộn trang, trạng thái phiên
            │   ├── index.js                                # Điểm xuất (barrel export) các hook và tiện ích persistence
            │   ├── scrollRestoration.js                    # Động cơ khôi phục cuộn bất đồng bộ (ResizeObserver/MutationObserver)
            │   ├── storageManager.js                       # Quản lý Web Storage an toàn (TTL, LRU, chống QuotaExceededError, lọc nhạy cảm)
            │   ├── usePersistedState.js                    # Các hook usePersistedState, useFormDraft, useUrlQueryState
            │   └── useScrollRestoration.js                 # Hook useScrollRestoration & useContainerScrollPersistence
            ├── ui/                                         # Thành phần giao diện dùng chung
            │   ├── ArticleBody.css & ArticleBody.jsx       # Trình hiển thị nội dung bài viết có cấu trúc
            │   ├── ChatWidget.css & ChatWidget.jsx         # Widget chat hỗ trợ khách hàng toàn trang
            │   ├── Footer.css & Footer.jsx                 # Chân trang hiển thị thông tin và liên kết
            │   ├── GoogleAvatar.jsx                        # Hiển thị ảnh đại diện Google người dùng
            │   ├── Navbar.jsx                              # Thanh điều hướng menu chính của website
            │   ├── QuickInsights.jsx                       # Widget gợi ý nhanh
            │   └── UnderDevelopment.css & UnderDevelopment.jsx # Component thông báo tính năng đang hoàn thiện
            └── utils/                                      # Hàm tiện ích dùng chung
                ├── articleContent.js                       # Tiện ích phân tích và chuẩn hóa rich text bài viết
                ├── authRoles.js                            # Tiện ích kiểm tra quyền Nhà phát triển, Quản trị viên, Cộng tác viên
                ├── scrollLock.js                           # Tiện ích khóa cuộn trang nền khi mở Modal (Desktop & Mobile)
                └── viewportScale.js                        # Bộ điều phối scale giao diện Desktop (> 580px) & Mobile (<= 580px) toàn trang
```

---

## BẢNG TRA CỨU VAI TRÒ CHI TIẾT THEO TỪNG TỆP TIN & MODULE (FILE-TO-ROLE LOOKUP MATRIX)

### Phân hệ Cốt lõi Backend (`backend/src/core/`)

| Đường dẫn tệp | Vai trò cốt lõi | Đầu vào / Đầu ra chính | Tác vụ bị giới hạn đối với AI |
| :--- | :--- | :--- | :--- |
| `backend/src/core/config.py` | Trung tâm nạp biến môi trường, tự động xác định đường dẫn thư mục gốc `PROJECT_ROOT`, danh sách email quản trị viên `MANAGER_EMAILS`, cổng mạng và CORS. | In: `.env`<br>Out: Các hằng số cấu hình hệ thống | Không được hardcode credentials mật vào file này. |
| `backend/src/core/db.py` | Cổng giao tiếp Facade SQLite cung cấp trọn vẹn CRUD, hỗ trợ chế độ Dual-Mode (`modular` và `monolithic`) với chữ ký hàm bất biến 100%. | In: Tham số nghiệp vụ<br>Out: Dict/List bản ghi dữ liệu | Không thay đổi chữ ký hàm để đảm bảo an toàn cho các tầng gọi bên trên. |
| `backend/src/core/db_manager.py` | Trình quản lý kết nối 10 CSDL module hóa độc lập theo DDD và cung cấp kết nối `get_unified_connection` qua SQLite ATTACH DATABASE cho báo cáo liên bảng. | In: Tên domain<br>Out: SQLite Connection tương ứng | Đảm bảo bật WAL mode và PRAGMA foreign_keys = ON trên mọi kết nối. |
| `backend/src/core/firebase_db.py` | Quản lý kết nối Firebase Admin SDK, tương tác với Firestore/Realtime Database để đồng bộ người dùng và lá số. | In: Service Account JSON<br>Out: Firebase App instance | Phải giữ cơ chế fallback tự động khi không tìm thấy credential file. |
| `backend/src/core/customer_store.py` | Lưu trữ hợp nhất tài khoản khách Google (`customers_pii.db`), nhật ký & ảnh lá số (`charts.db`) và chat (`cskh_chat.db`). | In: Dict/JSON từ API<br>Out: Bản ghi SQLite & tệp ảnh JPEG | Validate kích thước/định dạng ảnh và kiểm tra phân quyền ở tầng route. |

### Phân hệ Động cơ Tử Vi Đẩu Số (`backend/src/modules/astrology/`)

| Đường dẫn tệp | Vai trò cốt lõi | Đầu vào / Đầu ra chính | Tác vụ bị giới hạn đối với AI |
| :--- | :--- | :--- | :--- |
| `engine/core.py` | Thuật toán cốt lõi tính toán Cục (Thủy Nhị Cục, Mộc Tam Cục, Kim Tứ Cục, Thổ Ngũ Cục, Hỏa Lục Cục), tìm vị trí Cung Mệnh, Thân và an 14 Chính Tinh (Tử Vi, Liêm Trinh, Thiên Đồng, Vũ Khúc, Thái Dương, Thiên Cơ, Thiên Phủ, Thái Âm, Tham Lang, Cự Môn, Thiên Tướng, Thiên Lương, Thất Sát, Phá Quân). | In: Ngày/Tháng/Năm/Giờ Âm lịch, Giới tính<br>Out: Tọa độ cung của 14 Chính Tinh | **VÙNG ĐỎ**: Nghiêm cấm thay đổi công thức toán học cổ truyền. |
| `engine/constants.py` | Hằng số chuẩn 10 Thiên Can, 12 Địa Chi, Ngũ Hành, Âm Dương, tên 14 Chính Tinh và 110+ Phụ Tinh. | In: None<br>Out: Dict/List hằng số | Tuyệt đối không xóa hoặc đổi tên các hằng số tiêu chuẩn. |
| `engine/han_van.py` | Thuật toán tính Đại Hạn (10 năm), Tiểu Hạn (1 năm), Nguyệt Hạn (1 tháng), Thời Hạn (theo giờ). | In: Cung Mệnh, Cục, Năm sinh, Tuổi xem<br>Out: Vị trí hạn và danh sách sao lưu | Nghiêm cấm thay đổi chiều an thuận/nghịch theo Âm Nam/Dương Nữ. |
| `engine/lunar_calendar.py` | Thuật toán chuyển đổi Dương lịch - Âm lịch chuẩn xác cao, tính Tiết khí và Can Chi ngày giờ. | In: Ngày, Tháng, Năm, Giờ Dương lịch<br>Out: Ngày, Tháng, Năm, Giờ Âm lịch, Tháng Nhuận | Giữ nguyên thuật toán tính số ngày Julius và thuật toán Hồ Ngọc Đức. |
| `engine/sao_chinh.py` | Quy tắc xác định độ đắc, miếu, vượng, hãm của 14 Chính Tinh trên từng cung vị Địa Bàn. | In: Vị trí sao, Vị trí cung<br>Out: Trạng thái Đắc/Miếu/Vượng/Hãm | Tuyệt đối không thay đổi bảng trạng thái sao đã được chuẩn hóa. |
| `engine/sao_phu.py` | Thuật toán an 110+ Phụ Tinh: Lục Sát Tinh, Lục Cát Tinh, Tứ Hóa, Vòng Thái Tuế, Vòng Tràng Sinh, Vòng Lộc Tồn. | In: Can/Chi Năm, Tháng, Ngày, Giờ sinh<br>Out: Danh sách phụ tinh phân bổ vào 12 Cung | Không làm xáo trộn thứ tự và nhóm phân loại sao. |
| `interpreter/prompt_compiler.py` | Biên dịch toàn bộ dữ liệu lá số phức tạp thành prompt có cấu trúc chặt chẽ nạp vào mô hình AI Gemini. | In: Lá số JSON, Bảng 50 cách cục<br>Out: System Prompt & User Prompt tối ưu | Chỉ được tối ưu hóa văn phong, không cắt giảm thông tin sao quan trọng. |
| `interpreter/service.py` | Dịch vụ gọi API Google Gemini (hỗ trợ streaming hoặc đồng bộ), tích hợp cơ chế retry và suy luận logic sâu. | In: Compiled Prompt, API Key<br>Out: Bài luận giải chi tiết 12 cung định dạng Markdown | Phải có cơ chế bắt lỗi khi hết quota hoặc mất kết nối mạng. |
| `interpreter/resources/classical_aphorisms_kb.md` | Tuyển tập ca quyết và câu phú kinh điển Tử Vi Đẩu Số (14 chính tinh, đại cách cục, Tuần Triệt). | In: Tri thức cổ thư<br>Out: Câu phú đối chiếu tiên thiên | Giữ nguyên văn bản Hán Việt chuẩn, không sửa đổi ý tứ cổ thư. |
| `interpreter/resources/van_han_phu_tho.md` | Toàn văn kho phú thơ vận hạn 9 chuyên đề (Phát tài, Khoa bảng, Suy bại, Tật ách, Lao lý, Hỷ sự, Cầu tự, Gia đạo, Nguy nan) chuẩn hóa từ tài liệu ZX-01. | In: Tài liệu ZX-01<br>Out: Toàn văn phú thơ vận hạn | Tuân thủ bộ lọc đạo đức, hướng dẫn phòng ngừa hiểm họa tích cực. |
| `interpreter/resources/van_han_phu_index.json` | Chỉ mục ma trận tra cứu vi mô (Micro-Context Index) 93 câu phú vận hạn theo từ khóa và bộ sao. | In: Tinh bàn vận hạn<br>Out: 1 - 2 câu phú vận hạn tối ưu token | Không nạp toàn bộ file vào prompt; chỉ trích xuất theo chỉ mục. |


### Phân hệ Thanh toán & Webhook (`backend/src/modules/billing/`)

| Đường dẫn tệp | Vai trò cốt lõi | Đầu vào / Đầu ra chính | Tác vụ bị giới hạn đối với AI |
| :--- | :--- | :--- | :--- |
| `billing/routes.py` | Tiếp nhận yêu cầu tạo đơn hàng (`/api/billing/orders`) và nhận Webhook từ SePay (`/api/billing/webhook`). | In: HTTP Requests<br>Out: JSON trạng thái đơn / Kết quả Webhook | Bắt buộc kiểm tra xác thực webhook trước khi xử lý đơn hàng. |
| `billing/service.py` | Sinh mã VietQR chuyển khoản động, kiểm tra tính hợp lệ của mã đơn hàng `TVHAxxxxxx` và xác minh chữ ký SePay. | In: Số tiền, Nội dung thanh toán<br>Out: URL VietQR, Trạng thái đơn | Giữ nguyên quy tắc sinh mã đơn `TVHA` kèm 6 ký tự ngẫu nhiên. |
| `billing/repository.py` | Thao tác đọc ghi đơn hàng vào cơ sở dữ liệu (SQLite hoặc Firestore). | In: Order Object<br>Out: Kết quả cập nhật bản ghi | Đảm bảo tính toàn vẹn dữ liệu (transaction integrity). |

### Phân hệ Giao diện Người dùng (`frontend/src/features/`)

| Thư mục Feature | Vai trò cốt lõi | Các Component / Hook chính | Điểm cần lưu ý cho AI |
| :--- | :--- | :--- | :--- |
| `features/astrology/` | Hiển thị lá số Thiên Bàn 12 Cung, kích hoạt và trình diễn bài luận giải trí tuệ nhân tạo Gemini 3.8 Flash. | `LaSoTuVi.jsx`, `AiInterpretationGeminiView.jsx`, `AiConfirmChartCard.jsx`, `AstrologyChartView.jsx` | Đảm bảo responsive trên cả mobile dọc và desktop màn hình lớn. |
| `features/billing/` | Cửa sổ hiển thị mã VietQR chuyển khoản ngân hàng, hướng dẫn khách thanh toán và tự động nhận diện thành công. | `PaymentModal.jsx`, `billingApi.js`, `usePaymentPolling.js` | Tự động hủy polling khi người dùng đóng modal để tránh lãng phí request. |
| `features/phong-thuy/` | La bàn phong thủy 360 độ tương tác, tra cứu hướng hợp mệnh theo Bát Trạch và độ hợp tuổi vợ chồng. | `InteractiveCompass.jsx`, `DirectionsSection.jsx`, `SpouseCompatibilitySection.jsx`, `fengShuiLogic.js` | Sử dụng CSS transform để la bàn xoay mượt mà, không giật lag. |
| `features/lich-van-su/` | Bộ Lịch Vạn Sự toàn diện: bloc lịch ngày cổ truyền, lưới tháng âm dương, tra cứu giờ hoàng đạo, tiết khí. | `LichVanSu.jsx`, `components/daily/*`, `components/monthly/*`, `components/goodDays/*` | Tách biệt rạch ròi giữa logic thiên văn (`core/`) và giao diện hiển thị (`components/`). |
| `features/tarot-kieu/` | Trải nghiệm chiêm nghiệm bốc quẻ thi ca Truyện Kiều với giao diện hoa đào rơi và diễn giải nhân duyên. | `BoiKieu.jsx`, `BoiKieu.css` | Tối ưu hóa tải 210 ảnh bài Kiều trong `public/tarot-kieu/cards/`. |
| `features/phat-phap/` | Không gian Phật pháp ứng dụng: chuyên mục, bài giảng và trích dẫn khai tuệ. | `PhatPhapPage.jsx`, `PhatPhapPage.css` | Giữ phông chữ trang nhã, màu sắc trầm ấm, trải nghiệm yên bình. |
| `features/ky-mon/` | Tra cứu lý thuyết và giao diện an bàn Kỳ Môn Độn Giáp chuyên sâu (Bát Môn, Cửu Tinh, Bát Thần). | `QimenPage.jsx`, `qimenOriginalDetails.js`, `qimenArticles.js` | Đảm bảo đồng bộ dữ liệu bài viết từ `features/ky-mon/qimenArticles.js` cho cả trang Kỳ Môn và Trang chủ (`Home.jsx`, `HomeMobile.jsx`). |
