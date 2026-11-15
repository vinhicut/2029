from typing import Dict, Any
import unicodedata
import re
import hashlib

from .models import ChartContext
from .thien_ban import init_thien_ban, init_dia_ban
from .sao_chinh import an_sao_chinh
from .sao_phu import an_sao_phu
from .han_van import an_han_van
from .constants import CHI_DISPLAY
from .markdown_exporter import export_admin_markdown, export_ai_markdown

def get_initials(name: str) -> str:
    if not name:
        return "HA"
    clean = unicodedata.normalize("NFD", name)
    clean = re.sub(r"[\u0300-\u036f]", "", clean)
    clean = clean.replace("đ", "d").replace("Đ", "D")
    clean = re.sub(r"[^a-zA-Z0-9\s]", "", clean).strip()
    if not clean:
        return "HA"
    words = [w for w in clean.split() if w]
    if not words:
        return "HA"
    initials = "".join([w[0].upper() for w in words])
    return initials or "HA"

def generate_id_code(name: str, params: Dict[str, Any]) -> str:
    if params.get("id_code"):
        return str(params["id_code"])
    if params.get("idCode"):
        return str(params["idCode"])
    if params.get("id_digits"):
        return f"{get_initials(name)}-{params['id_digits']}"
    if params.get("idDigits"):
        return f"{get_initials(name)}-{params['idDigits']}"
    
    seed = f"{name}_{params.get('gender')}_{params.get('day')}_{params.get('month')}_{params.get('year')}_{params.get('hour')}_{params.get('minute')}_{params.get('limit_year')}"
    h = int(hashlib.md5(seed.encode('utf-8')).hexdigest()[:8], 16)
    digits = f"{h % 100000000:08d}"
    return f"{get_initials(name)}-{digits}"

def calculate_tuvi_chart(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Hàm tính toán toàn bộ lá số Tử Vi. Orchestrator gọi các module con.
    """
    ctx = ChartContext()
    
    # 1. & 2. Khởi tạo Thiên Bàn (Lịch, 4 Trụ, Mệnh Thân, Cục)
    init_thien_ban(params, ctx)
    
    # Sinh mã định danh lá số
    id_code = generate_id_code(ctx.name, params)
    ctx.id_code = id_code
    
    # 3. Khởi tạo 12 cung Địa Bàn
    init_dia_ban(ctx)
    
    # 4. An 14 Chính Tinh
    an_sao_chinh(ctx)
    
    # 5. An Phụ Tinh (Lục sát, lục bại, tứ hóa, ...)
    an_sao_phu(ctx)
    
    # 6. An Hạn Vận & Sao Lưu
    an_han_van(ctx)
    
    can_year = ctx.can_chi_nam_str() if hasattr(ctx, 'can_chi_nam_str') else f"{ctx.can_year_idx} {ctx.chi_year_idx}" # fallback
    
    return {
        "menhPos": ctx.menh_pos,
        "thanPos": ctx.than_pos,
        "thien_ban": {
            "ho_ten": ctx.name,
            "gioi_tinh": ctx.gender,
            "duong_lich": {
                "ngay": ctx.orig_solar_day,
                "thang": ctx.orig_solar_month,
                "nam": ctx.orig_solar_year,
                "gio": ctx.hour,
                "phut": ctx.minute
            },
            "am_lich": {
                "ngay": ctx.calc_lunar_day,
                "thang": ctx.calc_lunar_month,
                "nam": ctx.calc_lunar_year,
                "thang_nhuan": ctx.calc_is_leap,
                "orig_ngay": ctx.orig_lunar_day,
                "orig_thang": ctx.orig_lunar_month,
                "orig_nam": ctx.orig_lunar_year,
                "orig_thang_nhuan": ctx.orig_is_leap,
                "is_late_zi": ctx.is_late_zi,
                "calc_ngay": ctx.calc_lunar_day,
                "calc_thang": ctx.calc_lunar_month,
                "calc_nam": ctx.calc_lunar_year,
                "calc_thang_nhuan": ctx.calc_is_leap,
                "can_chi_nam": f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_year_idx]} {CHI_DISPLAY[ctx.chi_year_idx]}",
                "can_chi_thang": f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_month_idx]} {CHI_DISPLAY[ctx.chi_month_idx]}",
                "can_chi_ngay": f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_day_idx]} {CHI_DISPLAY[ctx.chi_day_idx]}",
                "can_chi_gio": f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_hour_idx]} {CHI_DISPLAY[ctx.hour_chi_idx]}"
            },
            "nam_xem_han": {
                "nam": ctx.limit_year,
                "can_chi": f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.limit_can_idx]} {CHI_DISPLAY[ctx.limit_chi_idx]}",
                "tuoi_mu": ctx.tuoi_mu
            },
            "am_duong_menh": ctx.am_duong_menh,
            "menh_nap_am": ctx.menh_nap_am,
            "cuc": ctx.cuc_name,
            "chu_menh": ctx.chu_menh,
            "chu_than": ctx.chu_than,
            "am_duong_ly": ctx.am_duong_ly,
            "cuc_menh_tuong_quan": ctx.cuc_menh_tuong_quan,
            "than_cu": ctx.than_cu_name
        },
        "dia_ban": ctx.dia_ban,
        "tuan_cung": ctx.tuan_cung,
        "triet_cung": ctx.triet_cung,
        "current_dai_han": ctx.current_dai_han,
        "multi_year_transits": ctx.multi_year_transits,
        "id_code": id_code,
        "markdown_file_name": f"{id_code}.md",
        "markdown_admin": export_admin_markdown(ctx, params),
        "markdown_ai": export_ai_markdown(ctx, params),
        "markdown": export_admin_markdown(ctx, params)
    }
