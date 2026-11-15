#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
           🌟 BỘ ĐIỀU KHIỂN & KHỞI CHẠY HỆ THỐNG - TỬ VI HỒNG ÂN 🌟
=============================================================================
Kịch bản khởi chạy tinh gọn, tối ưu tốc độ và đồng bộ thời gian thực (Hot-Reload):
  1. Backend Core API (Flask - Cổng 8080)
  2. Frontend Dev Server (Vite - Cổng 5173 - Host 0.0.0.0)
     -> Phục vụ trực tiếp cho cả máy tính (localhost:5173) và mọi thiết bị
        truy cập trong mạng nội bộ (http://<IP_LAN>:5173).
     -> Cập nhật tức thì (HMR / Live Reload) khi thay đổi code hoặc bấm tải lại trang,
        loại bỏ hoàn toàn tình trạng bị cố định phiên bản tĩnh (cache dist).
  3. Tự động kiểm tra tường lửa Windows và giải phóng cổng kết nối.
  4. Hiển thị bảng IP kết nối và tự động sao chép link LAN vào Clipboard.
=============================================================================
"""

import os
import sys
import re
import time
import socket
import shutil
import subprocess
import webbrowser
from typing import List, Tuple, Dict, Any

# Đảm bảo đầu ra console trên Windows luôn hiển thị đúng Unicode Tiếng Việt
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# =============================================================================
# 0. ĐƯỜNG DẪN HỆ THỐNG & CẤU HÌNH TRUNG TÂM
# =============================================================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(SCRIPT_DIR) == "scripts":
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
else:
    PROJECT_ROOT = os.path.abspath(SCRIPT_DIR)

FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend", "src")
SERVER_SCRIPT = os.path.join(BACKEND_DIR, "server.py")

BACKEND_PORT = 8080
FRONTEND_PORT = 5173


# =============================================================================
# 1. QUẢN LÝ TIẾN TRÌNH & CỔNG KẾT NỐI (PORT & PROCESS MANAGEMENT)
# =============================================================================
def free_port(port: int) -> None:
    """Giải phóng cổng trên Windows nếu bị chiếm bởi bất kỳ tiến trình nào."""
    if os.name == "nt":
        try:
            output = subprocess.check_output(
                f"netstat -ano | findstr :{port}",
                shell=True,
                text=True,
                stderr=subprocess.DEVNULL,
            )
            current_pid = os.getpid()
            pids = set()
            for line in output.strip().splitlines():
                parts = line.split()
                if len(parts) >= 5:
                    local_addr = parts[1]
                    state = parts[3].upper()
                    if local_addr.endswith(f":{port}") or local_addr.endswith(f"]:{port}") or "LISTENING" in state:
                        pid = parts[-1]
                        if pid.isdigit() and int(pid) != 0 and int(pid) != current_pid:
                            pids.add(pid)
            for pid in pids:
                print(f"🧹 Đang giải phóng cổng {port} (tiến trình PID {pid})...")
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
                time.sleep(0.3)
        except Exception:
            pass


# =============================================================================
# 2. PHÂN TÍCH MẠNG, IP NỘI BỘ & CLIPBOARD (NETWORK & CLIPBOARD)
# =============================================================================
class NetworkManager:
    """Quản lý thông tin mạng, IP nội bộ và các card mạng."""

    @staticmethod
    def get_primary_lan_ip() -> str:
        """Tìm địa chỉ IP LAN chính được định tuyến ra ngoài."""
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        except Exception:
            ip = "127.0.0.1"
        finally:
            s.close()
        return ip

    @staticmethod
    def get_network_adapters_windows() -> List[Tuple[str, str]]:
        """Phân tích chi tiết tên card mạng và địa chỉ IPv4 từ ipconfig trên Windows."""
        adapters = []
        if os.name != "nt":
            return adapters
        try:
            output = subprocess.check_output("ipconfig", text=True, errors="ignore")
            current_adapter = "Card mạng mặc định"
            for line in output.splitlines():
                line_stripped = line.strip()
                if line and not line.startswith(" ") and not line.startswith("\t"):
                    current_adapter = line_stripped.rstrip(":")
                elif "IPv4" in line:
                    match = re.search(r":\s*([\d\.]+)", line)
                    if match:
                        ip = match.group(1).strip()
                        if not ip.startswith("127.") and not ip.startswith("169.254."):
                            adapters.append((current_adapter, ip))
        except Exception:
            pass
        return adapters


def copy_to_clipboard(text: str) -> bool:
    """Sao chép chuỗi văn bản vào bộ nhớ tạm (Clipboard) Windows / đa nền tảng."""
    try:
        if os.name == "nt":
            subprocess.run("clip", input=text.strip().encode("utf-8"), check=True, capture_output=True)
            return True
        elif sys.platform == "darwin":
            subprocess.run("pbcopy", input=text.strip().encode("utf-8"), check=True, capture_output=True)
            return True
        else:
            for cmd in ["xclip -selection clipboard", "xsel -b"]:
                try:
                    subprocess.run(cmd.split(), input=text.strip().encode("utf-8"), check=True, capture_output=True)
                    return True
                except Exception:
                    continue
    except Exception:
        pass
    return False


def display_server_ip(port: int = 5173, auto_copy: bool = True) -> Dict[str, Any]:
    """Hiển thị bảng thông tin kết nối và sao chép URL mặc định vào Clipboard."""
    hostname = socket.gethostname()
    primary_ip = NetworkManager.get_primary_lan_ip()
    adapters = NetworkManager.get_network_adapters_windows()
    local_dev_url = f"http://127.0.0.1:{port}"
    lan_dev_url = f"http://{primary_ip}:{port}" if primary_ip and primary_ip != "127.0.0.1" else local_dev_url

    # Mặc định sao chép link LAN thực tế để gửi cho các thiết bị khác
    copied = False
    target_copy = lan_dev_url if primary_ip and primary_ip != "127.0.0.1" else local_dev_url
    if auto_copy:
        copied = copy_to_clipboard(target_copy)

    box_width = 74
    print()
    print("╔" + "═" * (box_width - 2) + "╗")
    print("║" + " 🌐 THÔNG TIN TRUY CẬP WEBSITE TỬ VI HỒNG ÂN (LIVE RELOAD) ".center(box_width - 2) + "║")
    print("╠" + "═" * (box_width - 2) + "╣")
    print(f"║ 💻 Tên máy chủ (Hostname): {hostname:<{box_width - 30}}║")
    if primary_ip and primary_ip != "127.0.0.1":
        print(f"║ 📡 Địa chỉ IP mạng Wi-Fi:  {primary_ip:<{box_width - 30}}║")
    print("╠" + "─" * (box_width - 2) + "╢")
    print("║ 🖥️  TRUY CẬP TRÊN MÁY TÍNH NÀY (LOCALHOST):                           ║")
    print(f"║    👉 {local_dev_url:<{box_width - 10}}║")
    if primary_ip and primary_ip != "127.0.0.1":
        print("║" + " " * (box_width - 2) + "║")
        print("║ 📱 ĐIỆN THOẠI / TABLET CÙNG WI-FI (KHÔNG DÙNG 127.0.0.1):             ║")
        print(f"║    👉 {lan_dev_url:<{box_width - 10}}║")
    print("║    ⚡ Chế độ: Live Reload / HMR - Cập nhật tức thì khi tải lại trang! ║")

    if adapters:
        print("║" + " " * (box_width - 2) + "║")
        print("║ 📶 DANH SÁCH CÁC CARD MẠNG KHẢ DỤNG:                                  ║")
        for adapter_name, ip in adapters:
            is_primary = " (Chính)" if ip == primary_ip else ""
            line_str = f"   • {adapter_name}: {ip}{is_primary}"
            if len(line_str) > box_width - 5:
                line_str = line_str[:box_width - 8] + "..."
            print(f"║ {line_str}".ljust(box_width - 1) + "║")

    if copied:
        print("╠" + "─" * (box_width - 2) + "╢")
        print("║ 📋 ĐÃ TỰ ĐỘNG SAO CHÉP LIÊN KẾT CHO ĐIỆN THOẠI VÀO CLIPBOARD!         ║")
        print(f"║    👉 {target_copy:<{box_width - 10}}║")
        print("║    (Bạn có thể nhấn Ctrl + V để dán ngay qua Zalo/tin nhắn)           ║")

    print("╚" + "═" * (box_width - 2) + "╝\n")

    print("📌 HƯỚNG DẪN KẾT NỐI:")
    print(f"   • Trên máy tính này: Mở {local_dev_url}")
    if primary_ip and primary_ip != "127.0.0.1":
        print(f"   • Trên điện thoại / máy tính bảng (cùng mạng Wi-Fi): Mở {lan_dev_url}")
        print("     ⚠️  LƯU Ý: Điện thoại KHÔNG THỂ truy cập bằng 127.0.0.1 vì đó là địa chỉ nội bộ của riêng máy tính!")
    print("   • Mọi chỉnh sửa code sẽ tự động cập nhật thời gian thực (Hot-Reload) trên mọi thiết bị!\n")

    return {
        "hostname": hostname,
        "primary_ip": primary_ip,
        "local_dev_url": local_dev_url,
        "lan_dev_url": lan_dev_url,
        "copied": str(copied),
    }


# =============================================================================
# 3. QUẢN LÝ TƯỜNG LỬA (WINDOWS DEFENDER FIREWALL)
# =============================================================================
class FirewallManager:
    """Kiểm tra và hỗ trợ cấu hình mở port trên tường lửa Windows."""

    RULE_NAME = "Tu Vi Hong An - Web Server"

    @staticmethod
    def is_windows_admin() -> bool:
        """Kiểm tra tiến trình hiện tại có quyền Administrator không."""
        if os.name != "nt":
            return False
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except Exception:
            return False

    @classmethod
    def check_and_configure_firewall(cls, ports: List[int]) -> bool:
        """Kiểm tra quy tắc tường lửa và tự động cấu hình nếu có quyền."""
        if os.name != "nt":
            return True

        ports_str = ",".join(str(p) for p in ports)
        try:
            check_cmd = f'netsh advfirewall firewall show rule name="{cls.RULE_NAME}"'
            result = subprocess.run(check_cmd, shell=True, capture_output=True, text=True)

            if "No rules match" in result.stdout or "No rules match" in result.stderr or result.returncode != 0:
                print(f"🛡️  Đang kiểm tra tường lửa Windows cho các cổng: {ports_str}...")
                if cls.is_windows_admin():
                    add_cmd = (
                        f'netsh advfirewall firewall add rule name="{cls.RULE_NAME}" '
                        f'dir=in action=allow protocol=TCP localport={ports_str} profile=any'
                    )
                    add_res = subprocess.run(add_cmd, shell=True, capture_output=True, text=True)
                    if add_res.returncode == 0:
                        print(f"✅ Đã mở các cổng {ports_str} trên Windows Firewall thành công!")
                        return True
                else:
                    print(f"💡 Lưu ý tường lửa Windows: Để điện thoại kết nối được, mở PowerShell (Run as Administrator) và chạy:")
                    print(f'   netsh advfirewall firewall add rule name="{cls.RULE_NAME}" dir=in action=allow protocol=TCP localport={ports_str} profile=any')
                    return False
            return True
        except Exception:
            return False


# =============================================================================
# 4. KHỞI CHẠY HỆ THỐNG TINH GỌN (LEAN RUNNER)
# =============================================================================
def main():
    """Khởi chạy hệ thống gọn nhẹ, đồng bộ trực tiếp với Vite Dev Server."""
    os.chdir(PROJECT_ROOT)

    print("=" * 74)
    print("🚀 KHỞI ĐỘNG HỆ THỐNG WEBSITE TỬ VI HỒNG ÂN (TỰ ĐỘNG CẬP NHẬT LAN)")
    print(f"📂 Thư mục dự án: {PROJECT_ROOT}")
    print("=" * 74)

    # 1. Dọn dẹp tiến trình cũ chiếm dụng cổng 8080 và 5173
    free_port(BACKEND_PORT)
    free_port(FRONTEND_PORT)

    # 2. Cấu hình tường lửa cho cổng 8080 và 5173
    FirewallManager.check_and_configure_firewall([BACKEND_PORT, FRONTEND_PORT])

    # 3. Kiểm tra node_modules
    node_modules_path = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.exists(node_modules_path):
        print("📦 Chưa tìm thấy node_modules. Đang cài đặt thư viện (npm install)...")
        npm_cmd = shutil.which("npm.cmd") or shutil.which("npm") or "npm"
        try:
            subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR, check=True)
            print("✅ Cài đặt thư viện frontend hoàn tất!")
        except Exception as e:
            print(f"❌ Lỗi khi cài đặt thư viện frontend: {e}")
            input("Nhấn Enter để thoát...")
            sys.exit(1)

    # 4. Khởi chạy Backend Core Engine (Flask API trên Port 8080)
    backend_process = None
    if os.path.exists(SERVER_SCRIPT):
        print("🔮 Đang khởi động Backend Core Engine (Port 8080)...")
        backend_process = subprocess.Popen([sys.executable, "-u", SERVER_SCRIPT], cwd=BACKEND_DIR)

        # Chờ Health Check
        health_url = f"http://127.0.0.1:{BACKEND_PORT}/api/health"
        backend_ready = False
        import urllib.request
        for _ in range(15):
            time.sleep(0.3)
            if backend_process.poll() is not None:
                print(f"❌ Backend tiến trình đã dừng đột ngột (Exit Code: {backend_process.returncode})!")
                break
            try:
                with urllib.request.urlopen(health_url, timeout=1) as resp:
                    if resp.status == 200:
                        backend_ready = True
                        break
            except Exception:
                continue

        if backend_ready:
            print(f"✅ Backend Core API đã sẵn sàng tại http://127.0.0.1:{BACKEND_PORT}!")
        else:
            print("⚠️  Backend chưa phản hồi health-check, tiếp tục tiến trình...")
    else:
        print(f"⚠️  Không tìm thấy {SERVER_SCRIPT}, bỏ qua backend.")

    # 5. Khởi chạy Vite Dev Server với --host (Port 5173 lắng nghe 0.0.0.0 cho mọi thiết bị)
    local_dev_url = f"http://127.0.0.1:{FRONTEND_PORT}"
    print(f"⚡ Đang khởi động Vite development server (Port {FRONTEND_PORT} --host)...")
    vite_bin = os.path.join(FRONTEND_DIR, "node_modules", "vite", "bin", "vite.js")
    node_exe = shutil.which("node.exe") or shutil.which("node") or "node"
    npm_path = shutil.which("npm.cmd") if os.name == "nt" else shutil.which("npm")

    if os.path.exists(vite_bin) and os.path.exists(node_exe):
        vite_cmd = [node_exe, vite_bin, "--host"]
    elif npm_path:
        vite_cmd = [npm_path, "run", "dev", "--", "--host"]
    else:
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        vite_cmd = [npm_cmd, "run", "dev", "--", "--host"]

    vite_process = subprocess.Popen(vite_cmd, cwd=FRONTEND_DIR)

    # 6. Chờ Frontend sẵn sàng và tự động mở trình duyệt trên máy tính
    print("🌐 Đang chờ Vite sẵn sàng để tự động mở trình duyệt...")
    opened = False
    import urllib.request
    import urllib.error
    # Thử qua 127.0.0.1 hoặc localhost
    check_urls = [local_dev_url, f"http://localhost:{FRONTEND_PORT}"]
    for _ in range(40):
        time.sleep(0.3)
        for check_url in check_urls:
            try:
                with urllib.request.urlopen(check_url, timeout=1) as response:
                    if response.status == 200:
                        print(f"🎉 Website đã sẵn sàng tại {local_dev_url}!")
                        webbrowser.open(local_dev_url)
                        opened = True
                        break
            except (urllib.error.URLError, ConnectionResetError, OSError):
                continue
        if opened:
            break

    if not opened:
        print(f"👉 Mở trình duyệt tại: {local_dev_url}")
        webbrowser.open(local_dev_url)

    # 7. Hiển thị thông tin kết nối và sao chép URL vào Clipboard
    display_server_ip(port=FRONTEND_PORT, auto_copy=True)

    primary_ip = NetworkManager.get_primary_lan_ip()
    lan_ip_str = f"http://{primary_ip}:{FRONTEND_PORT}" if primary_ip and primary_ip != "127.0.0.1" else local_dev_url

    print("=" * 74)
    print("💡 HỆ THỐNG ĐANG HOẠT ĐỘNG HOÀN TOÀN:")
    print(f"   👉 URL Mặc Định:            {local_dev_url}")
    if primary_ip and primary_ip != "127.0.0.1":
        print(f"   👉 Thiết Bị Mạng Wi-Fi:     {lan_ip_str}")
    print("   👉 Thay đổi mã nguồn sẽ được cập nhật thời gian thực (Hot-Reload / F5).")
    print("   👉 Nhấn Ctrl + C để dừng tất cả dịch vụ an toàn.")
    print("=" * 74 + "\n")

    try:
        vite_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Đang dừng hệ thống...")
        if vite_process:
            vite_process.terminate()
        if backend_process:
            backend_process.terminate()
        print("👋 Đã dừng toàn bộ dịch vụ an toàn.")


if __name__ == "__main__":
    main()
