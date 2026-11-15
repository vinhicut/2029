# markdown_exporter.py
"""
Module xuất đặc tả lá số Tử Vi Đẩu Số sang định dạng Markdown.
Hỗ trợ 2 định dạng chuyên biệt:
1. export_admin_markdown: Bảng biểu trực quan thuần túy tiếng Việt và học thuật Tử Vi
   cho Ban Quản trị và Chuyên gia luận giải đối soát (tuyệt đối không có thuật ngữ lập trình/kỹ thuật).
2. export_ai_markdown: Cấu trúc cô đọng token, tính toán sẵn ma trận Tam Phương Tứ Chính
   giúp mô hình AI (LLM) luận giải chính xác 100%, không bị ảo giác toạ độ.
"""

from typing import Dict, Any, List
from .constants import CHI_DISPLAY, SAO_NGU_HANH
from .models import ChartContext

NGU_HANH_VI = {
    "kim": "Kim",
    "moc": "Mộc",
    "thuy": "Thủy",
    "hoa": "Hỏa",
    "tho": "Thổ"
}

BRIGHTNESS_VI = {
    "M": "Miếu",
    "V": "Vượng",
    "Đ": "Đắc",
    "B": "Bình",
    "H": "Hãm"
}

SAO_LUU_NAME_VI = {
    "L.Thái Tuế": "Lưu Thái Tuế",
    "L.Tang Môn": "Lưu Tang Môn",
    "L.Bạch Hổ": "Lưu Bạch Hổ",
    "L.Thiên Khốc": "Lưu Thiên Khốc",
    "L.Thiên Hư": "Lưu Thiên Hư",
    "L.Lộc Tồn": "Lưu Lộc Tồn",
    "L.Kình Dương": "Lưu Kình Dương",
    "L.Đà La": "Lưu Đà La",
    "L.Thiên Mã": "Lưu Thiên Mã",
    "L.Hóa Lộc": "Lưu Hóa Lộc",
    "L.Hóa Quyền": "Lưu Hóa Quyền",
    "L.Hóa Khoa": "Lưu Hóa Khoa",
    "L.Hóa Kỵ": "Lưu Hóa Kỵ"
}

NHI_HOP_MAP = {
    0: 1, 1: 0,
    2: 11, 11: 2,
    3: 10, 10: 3,
    4: 9, 9: 4,
    5: 8, 8: 5,
    6: 7, 7: 6
}

def _format_chinh_tinh_admin(stars: List[Dict[str, Any]]) -> str:
    if not stars:
        return "*(Vô Chính Diệu)*"
    res = []
    for s in stars:
        ten = s.get("ten", "")
        dt_raw = s.get("dac_tinh", "")
        dt = BRIGHTNESS_VI.get(dt_raw, dt_raw)
        nh_raw = s.get("ngu_hanh", SAO_NGU_HANH.get(ten, ""))
        nh = NGU_HANH_VI.get(nh_raw, nh_raw)
        if dt and nh:
            res.append(f"{ten} ({dt} - {nh})")
        elif dt:
            res.append(f"{ten} ({dt})")
        elif nh:
            res.append(f"{ten} ({nh})")
        else:
            res.append(ten)
    return ", ".join(res)

def _format_phu_tinh_admin(stars: List[Dict[str, Any]]) -> str:
    if not stars:
        return "-"
    res = []
    for s in stars:
        ten = s.get("ten", "")
        dt_raw = s.get("dac_tinh", "")
        dt = BRIGHTNESS_VI.get(dt_raw, dt_raw)
        nh_raw = s.get("ngu_hanh", SAO_NGU_HANH.get(ten, ""))
        nh = NGU_HANH_VI.get(nh_raw, nh_raw)
        if dt and nh:
            res.append(f"{ten} ({dt} - {nh})")
        elif dt:
            res.append(f"{ten} ({dt})")
        else:
            res.append(ten)
    return ", ".join(res)

def _format_sao_luu_admin(stars: List[Dict[str, Any]]) -> str:
    if not stars:
        return "-"
    res = []
    for s in stars:
        raw_name = s.get("ten", "")
        vi_name = SAO_LUU_NAME_VI.get(raw_name, raw_name)
        res.append(vi_name)
    return ", ".join(res)

def _get_khong_vong_admin(cung_data: Dict[str, Any]) -> str:
    has_tuan = cung_data.get("has_tuan", False)
    has_triet = cung_data.get("has_triet", False)
    if has_tuan and has_triet:
        return "**TUẦN TRIỆT ĐỒNG CUNG**"
    elif has_tuan:
        return "**TUẦN KHÔNG**"
    elif has_triet:
        return "**TRIỆT KHÔNG**"
    return "-"

def export_admin_markdown(ctx: ChartContext, raw_input: Dict[str, Any]) -> str:
    """
    Sinh bảng Markdown chuẩn mực tiếng Việt phục vụ Ban Quản trị và Chuyên gia đối soát.
    Tuyệt đối không chứa tiếng Anh hoặc thuật ngữ code.
    """
    name = ctx.name or raw_input.get("name") or "Chưa đặt tên"
    gender = ctx.gender or raw_input.get("gender") or "Nam"
    
    # Bóc tách thông tin nhập ban đầu
    is_solar_input = raw_input.get("is_solar", True) if "is_solar" in raw_input else raw_input.get("isSolar", True)
    calendar_type_str = "Dương lịch" if is_solar_input else "Âm lịch"
    
    raw_day = raw_input.get("day", ctx.orig_solar_day if is_solar_input else ctx.orig_lunar_day)
    raw_month = raw_input.get("month", ctx.orig_solar_month if is_solar_input else ctx.orig_lunar_month)
    raw_year = raw_input.get("year", ctx.orig_solar_year if is_solar_input else ctx.orig_lunar_year)
    raw_hour = raw_input.get("hour", ctx.hour)
    raw_minute = raw_input.get("minute", ctx.minute)
    is_leap = raw_input.get("is_leap_month_input", False) or raw_input.get("isLeapMonthInput", False) or raw_input.get("thang_nhuan", 0)
    leap_str = "Có (Tháng nhuận)" if is_leap else "Không"
    limit_year = ctx.limit_year or raw_input.get("limit_year", 2026)

    # 4 Trụ Can Chi
    can_year_str = f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_year_idx]} {CHI_DISPLAY[ctx.chi_year_idx]}"
    can_month_str = f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_month_idx]} {CHI_DISPLAY[ctx.chi_month_idx]}"
    can_day_str = f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_day_idx]} {CHI_DISPLAY[ctx.chi_day_idx]}"
    can_hour_str = f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_hour_idx]} {CHI_DISPLAY[ctx.hour_chi_idx]}"
    
    tuan_str = ", ".join([f"Cung {CHI_DISPLAY[c]}" for c in ctx.tuan_cung]) if ctx.tuan_cung else "Không có"
    triet_str = ", ".join([f"Cung {CHI_DISPLAY[c]}" for c in ctx.triet_cung]) if ctx.triet_cung else "Không có"
    
    menh_cung_name = CHI_DISPLAY[ctx.menh_pos]
    than_cung_name = CHI_DISPLAY[ctx.than_pos]

    lines = []
    lines.append("# HỒ SƠ ĐẶC TẢ LÁ SỐ TỬ VI ĐẨU SỐ (BẢN QUẢN TRỊ VIÊN)")
    lines.append("- **Hệ thống**: Tử Vi Hồng Ân (tuvihongan.com)")
    lines.append(f"- **Đương số**: {name} ({gender})")
    lines.append(f"- **Mục đích**: Hồ sơ tra cứu, đối chiếu dữ liệu và thẩm định cách cục tử vi dành cho Ban Quản trị và Chuyên gia luận giải")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # BẢNG 1: THÔNG TIN GỐC DO ĐƯƠNG SỐ CUNG CẤP
    lines.append("## BẢNG 1: THÔNG TIN GỐC DO ĐƯƠNG SỐ CUNG CẤP")
    lines.append("")
    lines.append("| Số Thứ Tự | Hạng Mục Đăng Ký | Thông Tin Cung Cấp |")
    lines.append("| :---: | :--- | :--- |")
    lines.append(f"| 1 | **Họ và tên đương số** | {name} |")
    lines.append(f"| 2 | **Giới tính** | {gender} |")
    lines.append(f"| 3 | **Loại lịch sử dụng** | {calendar_type_str} |")
    lines.append(f"| 4 | **Ngày sinh** | Ngày {int(raw_day):02d} |")
    lines.append(f"| 5 | **Tháng sinh** | Tháng {int(raw_month):02d} |")
    lines.append(f"| 6 | **Năm sinh** | Năm {int(raw_year)} |")
    lines.append(f"| 7 | **Giờ sinh** | {int(raw_hour):02d} giờ |")
    lines.append(f"| 8 | **Phút sinh** | {int(raw_minute):02d} phút |")
    lines.append(f"| 9 | **Tháng nhuận** | {leap_str} |")
    lines.append(f"| 10 | **Năm xem hạn** | Năm {limit_year} |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # BẢNG 2: THIÊN BÀN - BÁT TỰ TỨ TRỤ VÀ CÁCH CỤC BẢN MỆNH
    lines.append("## BẢNG 2: THIÊN BÀN - BÁT TỰ TỨ TRỤ VÀ CÁCH CỤC BẢN MỆNH")
    lines.append("")
    lines.append("| Hạng Mục Mệnh Lý | Thông Số Quy Đổi Và Xác Lập | Ý Nghĩa Mệnh Lý & Chiêm Đoán |")
    lines.append("| :--- | :--- | :--- |")
    lines.append(f"| **Ngày giờ sinh Dương lịch** | Ngày {ctx.orig_solar_day:02d} tháng {ctx.orig_solar_month:02d} năm {ctx.orig_solar_year} lúc {ctx.hour:02d} giờ {ctx.minute:02d} phút | Khung giờ {CHI_DISPLAY[ctx.hour_chi_idx]} |")
    lines.append(f"| **Ngày giờ sinh Âm lịch** | Ngày {ctx.calc_lunar_day:02d} tháng {ctx.calc_lunar_month:02d} năm {can_year_str} (Giờ {can_hour_str}) | Tiết khí tính toán theo lịch thiên văn |")
    lines.append(f"| **Năm sinh Can Chi** | **Năm {can_year_str}** | Mệnh Nạp Âm: {ctx.menh_nap_am} |")
    lines.append(f"| **Tháng sinh Can Chi** | **Tháng {can_month_str}** | Nguyệt Lệnh |")
    lines.append(f"| **Ngày sinh Can Chi** | **Ngày {can_day_str}** | Nhật Chủ |")
    lines.append(f"| **Giờ sinh Can Chi** | **Giờ {can_hour_str}** | Thời Thụ |")
    lines.append(f"| **Âm Dương Bản Mệnh** | **{ctx.am_duong_menh}** | Phân định Dương Nam, Dương Nữ, Âm Nam, Âm Nữ |")
    lines.append(f"| **Bản Mệnh (Nạp Âm)** | **{ctx.menh_nap_am}** | Hành: {ctx.menh_hanh} |")
    lines.append(f"| **Cục Số** | **{ctx.cuc_name}** | Khởi đầu đại hạn 10 năm tại số tuổi: {ctx.cuc_so} tuổi |")
    lines.append(f"| **Vị Trí Cung Mệnh** | **Đóng tại Cung {menh_cung_name}** | Cung vị bản Mệnh Tiên Thiên |")
    lines.append(f"| **Vị Trí Cung Thân** | **Đóng tại Cung {than_cung_name}** | **{ctx.than_cu_name}** |")
    lines.append(f"| **Âm Dương Lý** | **{ctx.am_duong_ly}** | Sự tương hợp giữa Âm Dương can năm và tính chất cung Mệnh |")
    lines.append(f"| **Mệnh - Cục Tương Quan** | **{ctx.cuc_menh_tuong_quan}** | Tương tác giữa bản Mệnh với môi trường hoàn cảnh xã hội |")
    lines.append(f"| **Sao Chủ Mệnh** | **{ctx.chu_menh}** | Quản lý bản chất, thiên tư và hình thể cốt cách |")
    lines.append(f"| **Sao Chủ Thân** | **{ctx.chu_than}** | Quản lý hành động, nghị lực và hậu vận |")
    lines.append(f"| **Vị Trí Tuần Không Án Ngữ** | **{tuan_str}** | Đóng tại 2 cung kế tiếp theo vòng Tuần Triệt |")
    lines.append(f"| **Vị Trí Triệt Không Án Ngữ** | **{triet_str}** | Đóng tại 2 cung cố định theo Can năm sinh |")
    lines.append(f"| **Năm Xem Hạn** | **Năm {limit_year} ({['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.limit_can_idx]} {CHI_DISPLAY[ctx.limit_chi_idx]})** | **{ctx.tuoi_mu} tuổi mụ** |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # BẢNG 3: ĐỊA BÀN - CHI TIẾT TINH BÀN 12 CUNG SỐ
    lines.append("## BẢNG 3: ĐỊA BÀN - CHI TIẾT TINH BÀN 12 CUNG SỐ")
    lines.append("")
    lines.append("| STT | Địa Chi | Cung Chức | Can Chi | Chính Tinh (Độ Sáng - Ngũ Hành) | Cát Tinh & Quý Tinh | Sát Tinh & Hung Bại Tinh | Vòng Tràng Sinh | Đại Hạn | Tiểu Hạn | Sao Lưu Năm Hạn | Không Vong Án Ngữ |")
    lines.append("| :---: | :---: | :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: |")

    for i in range(12):
        c = ctx.dia_ban[i]
        cung_chi = c["cung_chi"]
        ten_cung = c["ten_cung"]
        if c["is_than"] and "THÂN" not in ten_cung:
            ten_cung = f"{ten_cung} (THÂN)"
        if i == ctx.menh_pos or c["is_than"]:
            ten_cung = f"**{ten_cung}**"
            
        can_chi_cung = c["can_chi_cung"]
        chinh_tinh_str = _format_chinh_tinh_admin(c["chinh_tinh"])
        phu_tot_str = _format_phu_tinh_admin(c["phu_tinh_tot"])
        phu_xau_str = _format_phu_tinh_admin(c["phu_tinh_xau"])
        sao_luu_str = _format_sao_luu_admin(c["sao_luu"])
        khong_vong_str = _get_khong_vong_admin(c)
        trang_sinh_str = c.get("trang_sinh", "-")
        dai_han_str = f"{c['dai_han']} - {c['dai_han'] + 9}" if c.get("dai_han") is not None else "-"
        tieu_han_str = c.get("tieu_han_chi", "-")
        
        lines.append(f"| {i+1} | **{cung_chi}** | {ten_cung} | {can_chi_cung} | {chinh_tinh_str} | {phu_tot_str} | {phu_xau_str} | {trang_sinh_str} | {dai_han_str} | {tieu_han_str} | {sao_luu_str} | {khong_vong_str} |")

    lines.append("")
    lines.append("---")
    lines.append("")

    # BẢNG 4: MA TRẬN ĐỐI CHIẾU TAM PHƯƠNG TỨ CHÍNH VÀ NHỊ HỢP 12 CUNG
    lines.append("## BẢNG 4: MA TRẬN ĐỐI CHIẾU TAM PHƯƠNG TỨ CHÍNH VÀ NHỊ HỢP 12 CUNG")
    lines.append("")
    lines.append("| Cung Chức Đang Xét | Địa Chi | Cung Đối Xung (Chính Chiếu) | Cung Tam Hợp Thứ Nhất | Cung Tam Hợp Thứ Hai | Cung Nhị Hợp | Tổng Luận Phối Chiếu Cách Cục |")
    lines.append("| :--- | :---: | :--- | :--- | :--- | :--- | :--- |")

    for i in range(12):
        c = ctx.dia_ban[i]
        cung_chi = c["cung_chi"]
        ten_cung = c["ten_cung"]
        if i == ctx.menh_pos:
            cung_desc = f"**{ten_cung}**"
        elif c["is_than"]:
            cung_desc = f"**{ten_cung}**"
        else:
            cung_desc = ten_cung
            
        dx_idx = (i + 6) % 12
        th1_idx = (i + 4) % 12
        th2_idx = (i + 8) % 12
        nh_idx = NHI_HOP_MAP.get(i, (i + 6) % 12)
        
        c_dx = ctx.dia_ban[dx_idx]
        c_th1 = ctx.dia_ban[th1_idx]
        c_th2 = ctx.dia_ban[th2_idx]
        c_nh = ctx.dia_ban[nh_idx]
        
        dx_str = f"{c_dx['cung_chi']} ({c_dx['ten_cung']})"
        th1_str = f"{c_th1['cung_chi']} ({c_th1['ten_cung']})"
        th2_str = f"{c_th2['cung_chi']} ({c_th2['ten_cung']})"
        nh_str = f"{c_nh['cung_chi']} ({c_nh['ten_cung']})"
        
        # Mô tả tóm lược sao chính cung & sao chiếu
        main_stars = [s['ten'] for s in c['chinh_tinh']]
        main_str = " & ".join(main_stars) if main_stars else "Vô Chính Diệu"
        dx_main = [s['ten'] for s in c_dx['chinh_tinh']]
        dx_main_str = " & ".join(dx_main) if dx_main else "Vô Chính Diệu"
        
        eval_str = f"Bản cung {main_str}, cung đối diện mượn chiếu {dx_main_str}"
        lines.append(f"| {cung_desc} | **{cung_chi}** | {dx_str} | {th1_str} | {th2_str} | {nh_str} | {eval_str} |")

    lines.append("")
    return "\n".join(lines)


# -------------------------------------------------------------
# -------------------------------------------------------------
# PHẦN EXPORT CHO AI (LLM STRUCTURED CONTEXT DATA)
# -------------------------------------------------------------

def _format_star_dense(s: Dict[str, Any]) -> str:
    ten = s.get("ten", "")
    dt = s.get("dac_tinh", "")
    dt_str = BRIGHTNESS_VI.get(dt, dt)
    nh_raw = SAO_NGU_HANH.get(ten) or s.get("ngu_hanh", "")
    nh = NGU_HANH_VI.get(nh_raw, nh_raw.capitalize() if nh_raw else "Thổ")
    if dt_str:
        return f"{ten} [{dt_str} - {nh}]"
    return f"{ten} [{nh}]"

def _format_cung_ban_cung(c: Dict[str, Any]) -> str:
    chinh = [_format_star_dense(s) for s in c.get("chinh_tinh", [])]
    chinh_str = ", ".join(chinh) if chinh else "Vô Chính Diệu"
    
    cat = [_format_star_dense(s) for s in c.get("phu_tinh_tot", [])]
    cat_str = ", ".join(cat) if cat else "Không"
    
    sat = [_format_star_dense(s) for s in c.get("phu_tinh_xau", [])]
    sat_str = ", ".join(sat) if sat else "Không"
    
    luu = []
    for s in c.get("sao_luu", []):
        t = s.get("ten", "")
        clean_name = t.replace("L.", "")
        nh_raw = SAO_NGU_HANH.get(clean_name, "tho")
        nh = NGU_HANH_VI.get(nh_raw, "Thổ")
        luu.append(f"{t} [{nh}]")
    luu_str = ", ".join(luu) if luu else "Không"
    
    ts = c.get("trang_sinh", "-")
    kv = _get_khong_vong_admin(c)
    
    return f"Chính tinh: {chinh_str} | Cát tinh: {cat_str} | Sát tinh: {sat_str} | Sao lưu: {luu_str} | Tràng sinh: {ts} | Không vong: {kv}"

def _format_cung_chieu_stars(c: Dict[str, Any], include_luu: bool = True) -> str:
    stars = []
    for s in c.get("chinh_tinh", []):
        stars.append(_format_star_dense(s))
    for s in c.get("phu_tinh_tot", []):
        stars.append(_format_star_dense(s))
    for s in c.get("phu_tinh_xau", []):
        stars.append(_format_star_dense(s))
    if include_luu:
        for s in c.get("sao_luu", []):
            t = s.get("ten", "")
            clean_name = t.replace("L.", "")
            nh_raw = SAO_NGU_HANH.get(clean_name, "tho")
            nh = NGU_HANH_VI.get(nh_raw, "Thổ")
            stars.append(f"{t} [{nh}]")
    return ", ".join(stars) if stars else "Không"

def _append_cung_chi_tiet(lines: List[str], ctx: ChartContext, cung_idx: int, cung_title: str):
    c = ctx.dia_ban[cung_idx]
    dx_idx = (cung_idx + 6) % 12
    th1_idx = (cung_idx + 4) % 12
    th2_idx = (cung_idx + 8) % 12
    nh_idx = NHI_HOP_MAP.get(cung_idx, (cung_idx + 6) % 12)
    gp1_idx = (cung_idx - 1 + 12) % 12
    gp2_idx = (cung_idx + 1) % 12

    dx = ctx.dia_ban[dx_idx]
    th1 = ctx.dia_ban[th1_idx]
    th2 = ctx.dia_ban[th2_idx]
    nh = ctx.dia_ban[nh_idx]
    gp1 = ctx.dia_ban[gp1_idx]
    gp2 = ctx.dia_ban[gp2_idx]

    dh_val = c.get("dai_han")
    if isinstance(dh_val, int):
        if dh_val >= 85 and any(cung_title.startswith(f"{n}.") for n in range(1, 10)) and "Cung Mệnh" not in cung_title and "Cung Tài Bạch" not in cung_title and "Cung Quan Lộc" not in cung_title:
            dh_suffix = f" - Đại Vận: {dh_val} - {dh_val + 9} tuổi [CHỈ LUẬN BẢN CUNG & GIA ĐẠO, KHÔNG LUẬN ĐẠI VẬN & CÔNG DANH]"
        else:
            dh_suffix = f" - Đại Vận: {dh_val} - {dh_val + 9} tuổi"
    else:
        dh_suffix = ""
    lines.append(f"### {cung_title} ({c['ten_cung']} tại {c['cung_chi']} - Can Chi: {c['can_chi_cung']}{dh_suffix})")
    lines.append(f"- Tọa thủ: {_format_cung_ban_cung(c)}")
    lines.append(f"- Chính chiếu (Cung {dx['cung_chi']} - {dx['ten_cung']}): {_format_cung_chieu_stars(dx)}")
    lines.append(f"- Tam hợp 1 (Cung {th1['cung_chi']} - {th1['ten_cung']}): {_format_cung_chieu_stars(th1)}")
    lines.append(f"- Tam hợp 2 (Cung {th2['cung_chi']} - {th2['ten_cung']}): {_format_cung_chieu_stars(th2)}")
    lines.append(f"- Nhị hợp (Cung {nh['cung_chi']} - {nh['ten_cung']}): {_format_cung_chieu_stars(nh)}")
    lines.append(f"- Giáp cung (Cung {gp1['cung_chi']} & Cung {gp2['cung_chi']}): Cung {gp1['cung_chi']}: {_format_cung_chieu_stars(gp1)} | Cung {gp2['cung_chi']}: {_format_cung_chieu_stars(gp2)}")
    lines.append("")

def export_ai_markdown(ctx: ChartContext, raw_input: Dict[str, Any]) -> str:
    """
    Sinh cấu trúc Markdown đặc thù chuẩn hoá cao độ cho LLM luận giải.
    - Cấu trúc khớp 1:1 theo thứ tự bài luận giải (Phần I đến Phần V).
    - Ngôn ngữ học thuật chuẩn xác, không chứa chú thích dặn dò hay từ ngữ ngoài lề.
    - Định dạng phân tách trường nhất quán với dấu ' | ', phân biệt rạch ròi các nhóm sao.
    - Đầy đủ 12 cung chi tiết (Tam hợp Mệnh-Tài-Quan và 9 cung phụ còn lại).
    - Bổ sung mã lá số đồng bộ với tên file markdown.
    """
    name = ctx.name or raw_input.get("name") or "Chưa đặt tên"
    gender = ctx.gender or raw_input.get("gender") or "Nam"
    id_code = getattr(ctx, "id_code", "") or "HA-00000000"
    
    can_year_str = f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_year_idx]} {CHI_DISPLAY[ctx.chi_year_idx]}"
    can_month_str = f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_month_idx]} {CHI_DISPLAY[ctx.chi_month_idx]}"
    can_day_str = f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_day_idx]} {CHI_DISPLAY[ctx.chi_day_idx]}"
    can_hour_str = f"{['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.can_hour_idx]} {CHI_DISPLAY[ctx.hour_chi_idx]}"
    
    tuan_str = ", ".join([CHI_DISPLAY[c] for c in ctx.tuan_cung])
    triet_str = ", ".join([CHI_DISPLAY[c] for c in ctx.triet_cung])

    dh_info = getattr(ctx, "current_dai_han", {})
    transits = getattr(ctx, "multi_year_transits", [])

    lines = []
    lines.append("# DỮ LIỆU TINH BÀN TỬ VI ĐẨU SỐ")
    lines.append(f"- Mã lá số: {id_code}")
    lines.append(f"- Đương số: {name} | Giới tính: {gender} ({ctx.am_duong_menh})")
    lines.append(f"- Dương lịch: {ctx.orig_solar_day:02d}/{ctx.orig_solar_month:02d}/{ctx.orig_solar_year} lúc {ctx.hour:02d}:{ctx.minute:02d}")
    lines.append(f"- Âm lịch: {ctx.calc_lunar_day:02d}/{ctx.calc_lunar_month:02d}/{can_year_str} (Giờ {can_hour_str})")
    lines.append(f"- Tứ trụ: {can_year_str} • {can_month_str} • {can_day_str} • {can_hour_str}")
    lines.append(f"- Bản mệnh: {ctx.menh_nap_am} ({ctx.menh_hanh}) | Cục số: {ctx.cuc_name} (Số {ctx.cuc_so}) | Mệnh Cục: {ctx.cuc_menh_tuong_quan} | Âm Dương lý: {ctx.am_duong_ly}")
    lines.append(f"- Vị trí Mệnh: Cung {CHI_DISPLAY[ctx.menh_pos]} | Thân cư: {ctx.than_cu_name} (Cung {CHI_DISPLAY[ctx.than_pos]}) | Chủ Mệnh: {ctx.chu_menh} | Chủ Thân: {ctx.chu_than}")
    lines.append(f"- Tuần Không: Cung {tuan_str} | Triệt Không: Cung {triet_str}")
    if dh_info:
        lines.append(f"- Đại vận hiện tại: {dh_info.get('tuoi_start', 0)} - {dh_info.get('tuoi_end', 9)} tuổi (Đóng tại Cung {dh_info.get('cung_chi', '')} - {dh_info.get('ten_cung', '')})")
    lines.append(f"- Năm xem hạn gốc: {ctx.limit_year} ({['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][ctx.limit_can_idx]} {CHI_DISPLAY[ctx.limit_chi_idx]}) - {ctx.tuoi_mu} tuổi mụ")
    if transits:
        t_strs = [f"Năm {t['year']} ({t['can_chi']} - {t['tuoi_mu']}t)" for t in transits]
        lines.append(f"- Vận hạn 3 năm liên tiếp: {' • '.join(t_strs)}")
    lines.append("")

    # PHẦN II: TAM HỢP MỆNH - TÀI - QUAN
    lines.append("## II. TAM HỢP MỆNH - TÀI - QUAN")
    _append_cung_chi_tiet(lines, ctx, ctx.menh_pos, "1. Cung Mệnh")
    _append_cung_chi_tiet(lines, ctx, (ctx.menh_pos + 8) % 12, "2. Cung Tài Bạch")
    _append_cung_chi_tiet(lines, ctx, (ctx.menh_pos + 4) % 12, "3. Cung Quan Lộc")

    # PHẦN III: ĐẠI VẬN VÀ TIỂU VẬN 3 NĂM LIÊN TIẾP
    lines.append("## III. ĐẠI VẬN VÀ TIỂU VẬN 3 NĂM LIÊN TIẾP")
    if dh_info:
        dh_pos = dh_info.get("cung_idx", ctx.menh_pos)
        dh_cung = ctx.dia_ban[dh_pos]
        dh_dx = ctx.dia_ban[(dh_pos + 6) % 12]
        dh_th1 = ctx.dia_ban[(dh_pos + 4) % 12]
        dh_th2 = ctx.dia_ban[(dh_pos + 8) % 12]
        lines.append(f"### A. ĐẠI VẬN HIỆN TẠI (10 NĂM: {dh_info.get('tuoi_start', 0)} - {dh_info.get('tuoi_end', 9)} TUỔI)")
        lines.append(f"- Vị trí: Cung {dh_cung['ten_cung']} tại {dh_cung['cung_chi']} (Can Chi: {dh_cung['can_chi_cung']})")
        lines.append(f"- Tọa thủ: {_format_cung_ban_cung(dh_cung)}")
        lines.append(f"- Hội chiếu Tam Phương Tứ Chính: Chính chiếu (Cung {dh_dx['cung_chi']} - {dh_dx['ten_cung']}): {_format_cung_chieu_stars(dh_dx)} | Tam hợp 1 (Cung {dh_th1['cung_chi']} - {dh_th1['ten_cung']}): {_format_cung_chieu_stars(dh_th1)} | Tam hợp 2 (Cung {dh_th2['cung_chi']} - {dh_th2['ten_cung']}): {_format_cung_chieu_stars(dh_th2)}")
        lines.append("")

    letters = ["B", "C", "D"]
    for idx, t in enumerate(transits):
        let = letters[idx] if idx < len(letters) else chr(66 + idx)
        th_idx = t["tieu_han_pos"]
        ltt_idx = t["luu_thai_tue_pos"]
        
        th_cung = ctx.dia_ban[th_idx]
        th_dx = ctx.dia_ban[(th_idx + 6) % 12]
        th_th1 = ctx.dia_ban[(th_idx + 4) % 12]
        th_th2 = ctx.dia_ban[(th_idx + 8) % 12]

        ltt_cung = ctx.dia_ban[ltt_idx]
        ltt_dx = ctx.dia_ban[(ltt_idx + 6) % 12]
        ltt_th1 = ctx.dia_ban[(ltt_idx + 4) % 12]
        ltt_th2 = ctx.dia_ban[(ltt_idx + 8) % 12]

        th_luu = [s["ten"] for s in t["sao_luu_by_cung"].get(str(th_idx), t["sao_luu_by_cung"].get(th_idx, []))]
        th_luu_str = ", ".join(th_luu) if th_luu else "Không"

        ltt_luu = [s["ten"] for s in t["sao_luu_by_cung"].get(str(ltt_idx), t["sao_luu_by_cung"].get(ltt_idx, []))]
        ltt_luu_str = ", ".join(ltt_luu) if ltt_luu else "Không"

        lines.append(f"### {let}. VẬN HẠN NĂM {t['year']} ({t['can_chi']} - {t['tuoi_mu']} TUỔI MỤ)")
        lines.append(f"- Cung Tiểu Hạn: Cung {th_cung['ten_cung']} tại {th_cung['cung_chi']} (Can Chi: {th_cung['can_chi_cung']})")
        lines.append(f"  + Tọa thủ: Sao gốc: {_format_cung_chieu_stars(th_cung, include_luu=False)} | Sao lưu năm: {th_luu_str} | Tràng sinh: {th_cung.get('trang_sinh','-')} | Không vong: {_get_khong_vong_admin(th_cung)}")
        lines.append(f"  + Hội chiếu Tam phương tứ chính: Chính chiếu (Cung {th_dx['cung_chi']} - {th_dx['ten_cung']}): {_format_cung_chieu_stars(th_dx, include_luu=False)} | Tam hợp 1 (Cung {th_th1['cung_chi']} - {th_th1['ten_cung']}): {_format_cung_chieu_stars(th_th1, include_luu=False)} | Tam hợp 2 (Cung {th_th2['cung_chi']} - {th_th2['ten_cung']}): {_format_cung_chieu_stars(th_th2, include_luu=False)}")
        
        lines.append(f"- Cung Lưu Thái Tuế: Cung {ltt_cung['ten_cung']} tại {ltt_cung['cung_chi']} (Can Chi: {ltt_cung['can_chi_cung']})")
        lines.append(f"  + Tọa thủ: Sao gốc: {_format_cung_chieu_stars(ltt_cung, include_luu=False)} | Sao lưu năm: {ltt_luu_str} | Không vong: {_get_khong_vong_admin(ltt_cung)}")
        lines.append(f"  + Hội chiếu Tam phương tứ chính: Chính chiếu (Cung {ltt_dx['cung_chi']}): {_format_cung_chieu_stars(ltt_dx, include_luu=False)} | Tam hợp (Cung {ltt_th1['cung_chi']} & Cung {ltt_th2['cung_chi']}): {_format_cung_chieu_stars(ltt_th1, include_luu=False)} | {_format_cung_chieu_stars(ltt_th2, include_luu=False)}")
        
        if t.get("special_interactions"):
            lines.append(f"  + Trùng tụ sao và biến động: {'; '.join(t['special_interactions'])}")
        lines.append("")

    # PHẦN IV: CÁC CUNG ĐỊA BÀN CÒN LẠI (9 CUNG PHỤ)
    lines.append("## IV. CÁC CUNG ĐỊA BÀN CÒN LẠI")
    phu_palaces = [
        ("1. Cung Phụ Mẫu", (ctx.menh_pos + 1) % 12),
        ("2. Cung Phúc Đức", (ctx.menh_pos + 2) % 12),
        ("3. Cung Điền Trạch", (ctx.menh_pos + 3) % 12),
        ("4. Cung Nô Bộc", (ctx.menh_pos + 5) % 12),
        ("5. Cung Thiên Di", (ctx.menh_pos + 6) % 12),
        ("6. Cung Tật Ách", (ctx.menh_pos + 7) % 12),
        ("7. Cung Tử Tức", (ctx.menh_pos + 9) % 12),
        ("8. Cung Phu Thê", (ctx.menh_pos + 10) % 12),
        ("9. Cung Huynh Đệ", (ctx.menh_pos + 11) % 12),
    ]
    for p_label, p_idx in phu_palaces:
        _append_cung_chi_tiet(lines, ctx, p_idx, p_label)

    # PHẦN V: MA TRẬN TỔNG HỢP TINH BÀN
    lines.append("## V. MA TRẬN TỔNG HỢP TINH BÀN")
    lines.append("### 1. Ma Trận 12 Cung Địa Bàn Gốc")
    lines.append("| Chi | Cung | CanChi | ChínhTinh | CátTinh | SátTinh | TràngSinh | ĐạiHạn | TiểuHạn | SaoLưu | KhôngVong |")
    lines.append("|:---:|:---|:---:|:---|:---|:---|:---:|:---:|:---:|:---|:---:|")

    for i in range(12):
        c = ctx.dia_ban[i]
        cung_chi = c["cung_chi"]
        ten_cung = c["ten_cung"]
        can_chi = c["can_chi_cung"]
        
        chinh = [_format_star_dense(s) for s in c["chinh_tinh"]]
        chinh_str = ", ".join(chinh) if chinh else "Vô Chính Diệu"
        
        cat = [_format_star_dense(s) for s in c["phu_tinh_tot"]]
        cat_str = ", ".join(cat) if cat else "-"
        
        sat = [_format_star_dense(s) for s in c["phu_tinh_xau"]]
        sat_str = ", ".join(sat) if sat else "-"
        
        luu = [s["ten"] for s in c["sao_luu"]]
        luu_str = ", ".join(luu) if luu else "-"
        
        kv = []
        if c.get("has_tuan"): kv.append("Tuần")
        if c.get("has_triet"): kv.append("Triệt")
        kv_str = "+".join(kv) if kv else "-"
        
        dh = f"{c['dai_han']}" if c.get("dai_han") is not None else "-"
        th = c.get("tieu_han_chi", "-")
        ts = c.get("trang_sinh", "-")
        
        lines.append(f"| {cung_chi} | {ten_cung} | {can_chi} | {chinh_str} | {cat_str} | {sat_str} | {ts} | {dh} | {th} | {luu_str} | {kv_str} |")

    lines.append("")

    if transits and len(transits) >= 3:
        y0, y1, y2 = transits[0], transits[1], transits[2]
        lines.append(f"### 2. Ma Trận Biến Thiên Sao Lưu 3 Năm Liên Tiếp")
        lines.append(f"| Chi | Cung | Sao Lưu {y0['year']} ({y0['can_chi']}) | Sao Lưu {y1['year']} ({y1['can_chi']}) | Sao Lưu {y2['year']} ({y2['can_chi']}) |")
        lines.append("|:---:|:---|:---|:---|:---|")
        for i in range(12):
            c = ctx.dia_ban[i]
            chi = c["cung_chi"]
            cung_name = c["ten_cung"]
            s0 = [s["ten"] for s in y0["sao_luu_by_cung"].get(str(i), y0["sao_luu_by_cung"].get(i, []))]
            s1 = [s["ten"] for s in y1["sao_luu_by_cung"].get(str(i), y1["sao_luu_by_cung"].get(i, []))]
            s2 = [s["ten"] for s in y2["sao_luu_by_cung"].get(str(i), y2["sao_luu_by_cung"].get(i, []))]
            s0_str = ", ".join(s0) if s0 else "-"
            s1_str = ", ".join(s1) if s1 else "-"
            s2_str = ", ".join(s2) if s2 else "-"
            lines.append(f"| {chi} | {cung_name} | {s0_str} | {s1_str} | {s2_str} |")
        lines.append("")

    return "\n".join(lines)
