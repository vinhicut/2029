---
trigger: always_on
description: Quy tắc điều phối luồng làm việc bắt buộc cho AI Agent tại dự án Website Tử Vi Hồng Ân. Bao gồm phân tích ngữ cảnh, lưu trữ nhật ký phiên làm việc, chuẩn hóa thiết kế và bảng màu Á Đông, quy chuẩn ngôn ngữ, loại bỏ lưu trữ prompt và bỏ qua quy trình build kiểm tra tự động.
---

# Quy Chuẩn & Luồng Làm Việc AI Agent (Tử Vi Hồng Ân)

Tất cả các AI Agent khi tham gia phát triển, bảo trì hoặc tái cấu trúc mã nguồn trong dự án **Website Tử Vi Hồng Ân** bắt buộc phải tuân thủ nghiêm ngặt 6 điều khoản cốt lõi dưới đây:

---

## 1. Quy Trình Phân Tích Ngữ Cảnh & Thực Thi Chuẩn Hóa (4 Giai Đoạn Tuần Tự)
Trước khi chỉnh sửa mã nguồn, thêm tính năng hoặc chạy lệnh terminal, Agent **BẮT BUỘC** thực hiện đầy đủ và tuần tự quy trình 4 giai đoạn dưới đây để nắm vững toàn cảnh dự án:

### Giai đoạn 1: Định vị cấu trúc dự án (Project Mapping)
- Đọc tệp `super_tree.md` đầu tiên trong mọi phiên làm việc (có thể tham chiếu thêm `tree.md` cho kiến trúc cấp module/Docker).
- Phân tích cây thư mục để xác định chính xác cấu trúc module, phạm vi ảnh hưởng và các tệp/thư mục cần tương tác trước khi thực hiện bất kỳ thao tác nào.

### Giai đoạn 2: Truy xuất lịch sử tác vụ (Context History Retrieval)
- Đọc tệp `.agent/walkthroughs_values.txt` theo thứ tự từ dưới lên trên (Bottom-Up) để ưu tiên thông tin mới nhất (có thể tham khảo thêm `.agent/plans_values.txt` khi cần đối chiếu kế hoạch tổng thể).
- Lọc và xác định tối đa **3–5 bản ghi walkthrough gần nhất** có độ tương đồng hoặc liên quan trực tiếp đến yêu cầu hiện tại của người dùng.

### Giai đoạn 3: Phân tích chi tiết giải pháp (Deep Walkthrough Inspection)
- Truy cập thư mục `.agent/walkthroughs/` và đọc chi tiết các tệp walkthrough tương ứng với danh sách đã lọc ở Giai đoạn 2.
- Đối chiếu các quyết định kỹ thuật, giải pháp đã triển khai, các ràng buộc và bài học kinh nghiệm từ các phiên trước.

### Giai đoạn 4: Tổng hợp ngữ cảnh và thực thi (Context Synthesis & Execution)
- Kết nối toàn bộ ngữ cảnh thu thập được: cấu trúc cây tệp (`super_tree.md`), lịch sử thực thi (`.agent/walkthroughs_values.txt`), giải pháp chuyên sâu (`.agent/walkthroughs/`) và chỉ thị hiện tại của người dùng.
- Tôn trọng kiến trúc hiện hữu: đảm bảo mọi thay đổi (động cơ an sao, interpreter phú thơ, giao diện React, bảo mật DevSecOps) đồng nhất với định hướng Monorepo và không làm phá vỡ logic sẵn có.
- Lập kế hoạch hành động chi tiết và bắt đầu tiến hành xử lý yêu cầu kỹ thuật với đầy đủ bối cảnh dự án.

---

## 2. Ngôn Ngữ & Thuật Ngữ Nghiệp Vụ (Language Standards)
- **Giao diện website (UI/UX)**: Bắt buộc **100% Tiếng Việt có dấu**, văn phong trang trọng, thanh nhã, tôn trọng tính nguyên bản của thuật ngữ cổ điển Đông Á.
- **Tài liệu Kỹ thuật, Walkthroughs & Plans**: Viết bằng **Tiếng Việt** kết hợp các thuật ngữ kỹ thuật chuyên ngành chuẩn quốc tế khi cần làm rõ.
- **Mã nguồn (Source Code)**:
  - Tên biến, tên hàm, class kỹ thuật nền tảng: Sử dụng **Tiếng Anh** theo chuẩn Clean Code.

---

#
## 4. Bỏ Qua Quy Trình Build Lại Để Kiểm Tra Khi Không Được Yêu Cầu (Skip Build for Verification)
- **Tuyệt đối KHÔNG tự ý build**: Agent **KHÔNG ĐƯỢC TỰ Ý** chạy các lệnh build tốn thời gian như `npm run build`, `vite build`, `docker build`, `docker-compose build` chỉ để kiểm tra cú pháp hoặc xác minh mã sau mỗi lượt chỉnh sửa.
- **Ngoại lệ duy nhất**: Chỉ thực thi quy trình build khi người dùng **yêu cầu trực tiếp** (ví dụ: *"hãy build lại frontend"*, *"đóng gói bản phát hành"*) hoặc trước khi bàn giao một cột mốc release chính thức có sự phê duyệt của người dùng.

---

## 6. Quản Lý Nhật Ký & Tài Liệu Phiên Làm Việc (Session Walkthroughs)
- **Nhật ký Phiên Làm Việc (`.agent/walkthroughs/`)**:
  - Ghi nhận lại các thay đổi quan trọng sau mỗi phiên làm việc hoặc tác vụ lớn.
  - Quy ước đặt tên tệp: `<DD>_<MM>_<YYYY>_W<No>.md` (ví dụ: `06_11_2026_W1.md`).
  - Nội dung: Tóm tắt mục tiêu đã hoàn thành, danh sách tệp thêm/sửa/xóa, điểm lưu ý kỹ thuật và cách kiểm tra chức năng.
- **Đồng bộ Chỉ mục Nhật ký (`.agent/walkthroughs_values.txt`)**:
  - Ngay sau khi tạo mới hoặc chỉnh sửa tệp trong `.agent/walkthroughs/`, **BẮT BUỘC** bổ sung (thêm vào cuối tệp theo đúng trình tự thời gian) hoặc cập nhật mục tương ứng trong `.agent/walkthroughs_values.txt` (đồng thời cập nhật tổng số tệp ở phần tiêu đề đầu tệp nếu có thêm tệp mới).
  - Mỗi mục phải tuân thủ đúng cấu trúc chuẩn hóa 4 trường, ngăn cách rõ ràng bằng đường kẻ `--------------------------------------------------------------------------------`:
    1. `Tên tệp`: `walkthroughs/<tên_tệp>.md`
    2. `Phân loại chỉnh sửa`: Gán nhãn phạm vi kỹ thuật (Frontend, Backend, UI/UX, Database, API, Engine Tử Vi, AI/Prompting, DevSecOps, Deployment, Testing, Documentation,...).
    3. `Trang/Thành phần ảnh hưởng`: Liệt kê cụ thể tên trang chính thức của website, route/URL hoặc module/tệp/endpoint bị tác động.
    4. `Nội dung chỉnh sửa`: Tóm tắt cực kỳ ngắn gọn nhưng đầy đủ các thay đổi, tính năng mới hoặc lỗi đã xử lý.
- **Đồng bộ Sơ Đồ Cây (`tree.md` / `super_tree.md`)**:
  - Cập nhật sơ đồ thư mục khi có biến động về cấu trúc tệp tin (thêm module mới, tái cơ cấu phân hệ).
  - Giữ định dạng cột ngay ngắn, thẩm mỹ và nhất quán.
