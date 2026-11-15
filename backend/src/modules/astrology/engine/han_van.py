# han_van.py
"""
Tính Đại Vận, Tiểu Vận, Nguyệt Vận, Vòng Tràng Sinh và Hệ Thống 13 Sao Lưu Đa Niên.
Hỗ trợ:
1. An trọn bộ 13 Sao Lưu cho năm xem hạn gốc (kích hoạt đầy đủ Lưu Tứ Hóa: Lộc, Quyền, Khoa, Kỵ).
2. Tính toán ma trận biến động vận hạn đa niên cho 3 năm liên tiếp (N, N+1, N+2).
3. Tự động phát hiện trùng tụ sao (Star Clash / Synergy) giữa sao lưu và sao cố định.
"""

from typing import Dict, Any, List
from .constants import CAN, CHI_DISPLAY, TU_HOA_TABLE
from .models import ChartContext

def an_han_van(ctx: ChartContext):
    """
    Tính Đại Hạn, Tiểu Hạn, Nguyệt Hạn, Vòng Tràng Sinh, 13 Sao Lưu năm hạn
    và Ma trận Vận hạn 3 năm liên tiếp (N, N+1, N+2).
    """
    # 1. Đại Hạn 12 cung
    for i in range(12):
        idx = (ctx.menh_pos + ctx.step_dir * i + 1200) % 12
        ctx.dia_ban[idx]["dai_han"] = ctx.cuc_so + i * 10

    # 2. Tiểu Hạn gốc
    if ctx.chi_year_idx in [2, 6, 10]:
        tieu_han_start = 4
    elif ctx.chi_year_idx in [8, 0, 4]:
        tieu_han_start = 10
    elif ctx.chi_year_idx in [5, 9, 1]:
        tieu_han_start = 7
    else:
        tieu_han_start = 1
        
    tieu_han_step = 1 if ctx.gender == "Nam" else -1
    for i in range(12):
        if tieu_han_step == 1:
            b = (i - tieu_han_start + ctx.chi_year_idx) % 12
        else:
            b = (tieu_han_start - i + ctx.chi_year_idx) % 12
        ctx.dia_ban[i]["tieu_han_chi"] = CHI_DISPLAY[b]
        
    if tieu_han_step == 1:
        limit_tieu_han_cung = (tieu_han_start + ctx.tuoi_mu - 1) % 12
    else:
        limit_tieu_han_cung = (tieu_han_start - (ctx.tuoi_mu - 1) + 1200) % 12
        
    # 3. Nguyệt Hạn
    month_1_cung = (limit_tieu_han_cung - ctx.calc_lunar_month + 1 + ctx.hour_chi_idx + 1200) % 12
    for m in range(1, 13):
        c_idx = (month_1_cung + (m - 1)) % 12
        ctx.dia_ban[c_idx]["nguyet_han_thang"] = m
        
    # 4. Vòng Tràng Sinh
    if ctx.cuc_so in [2, 5]:
        ts_start = 8
    elif ctx.cuc_so == 3:
        ts_start = 11
    elif ctx.cuc_so == 4:
        ts_start = 5
    else:
        ts_start = 2
        
    trang_sinh_names = ['Trường Sinh', 'Mộc Dục', 'Quan Đới', 'Lâm Quan', 'Đế Vượng', 'Suy', 
                        'Bệnh', 'Tử', 'Mộ', 'Tuyệt', 'Thai', 'Dưỡng']
    for i in range(12):
        p = (ts_start + ctx.step_dir * i + 1200) % 12
        ctx.dia_ban[p]["trang_sinh"] = trang_sinh_names[i]

    # 5. Xác định Cung Đại Vận hiện tại (theo tuổi mụ năm xem hạn)
    current_dh_idx = None
    for i in range(12):
        dh_start = ctx.dia_ban[i].get("dai_han")
        if dh_start is not None and dh_start <= ctx.tuoi_mu < dh_start + 10:
            current_dh_idx = i
            break
            
    if current_dh_idx is not None:
        c_dh = ctx.dia_ban[current_dh_idx]
        ctx.current_dai_han = {
            "cung_idx": current_dh_idx,
            "cung_chi": c_dh["cung_chi"],
            "can_chi_cung": c_dh["can_chi_cung"],
            "ten_cung": c_dh["ten_cung"],
            "tuoi_start": c_dh["dai_han"],
            "tuoi_end": c_dh["dai_han"] + 9
        }
    else:
        ctx.current_dai_han = {
            "cung_idx": ctx.menh_pos,
            "cung_chi": CHI_DISPLAY[ctx.menh_pos],
            "can_chi_cung": ctx.dia_ban[ctx.menh_pos]["can_chi_cung"],
            "ten_cung": ctx.dia_ban[ctx.menh_pos]["ten_cung"],
            "tuoi_start": ctx.cuc_so,
            "tuoi_end": ctx.cuc_so + 9
        }

    # 6. An Trọn Bộ 13 Sao Lưu cho Năm Xem Hạn Gốc (vào ctx.dia_ban)
    an_13_sao_luu_nam_goc(ctx)

    # 7. Tính Toán Ma Trận Vận Hạn 3 Năm Liên Tiếp (N, N+1, N+2)
    ctx.multi_year_transits = calculate_3_year_transits(
        ctx=ctx,
        tieu_han_start=tieu_han_start,
        tieu_han_step=tieu_han_step
    )


def an_13_sao_luu_nam_goc(ctx: ChartContext):
    """
    An đầy đủ trọn bộ 13 Sao Lưu (kích hoạt toàn diện Lưu Tứ Hóa) cho năm xem hạn gốc.
    """
    can_idx = ctx.limit_can_idx
    chi_idx = ctx.limit_chi_idx

    # 9 Sao Lưu thông thường
    ctx.add_luu("L.Thái Tuế", chi_idx, False)
    ctx.add_luu("L.Tang Môn", (chi_idx + 2) % 12, False)
    ctx.add_luu("L.Bạch Hổ", (chi_idx + 8) % 12, False)
    ctx.add_luu("L.Thiên Khốc", (6 - chi_idx + 120) % 12, False)
    ctx.add_luu("L.Thiên Hư", (6 + chi_idx) % 12, False)

    luu_loc_ton_pos = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][can_idx]
    ctx.add_luu("L.Lộc Tồn", luu_loc_ton_pos, True)
    ctx.add_luu("L.Kình Dương", (luu_loc_ton_pos + 1) % 12, False)
    ctx.add_luu("L.Đà La", (luu_loc_ton_pos - 1 + 120) % 12, False)

    luu_thien_ma_pos = [2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5][chi_idx]
    ctx.add_luu("L.Thiên Mã", luu_thien_ma_pos, True)

    # Trọn bộ 4 sao Lưu Tứ Hóa (Lộc, Quyền, Khoa, Kỵ)
    tu_hoa = TU_HOA_TABLE[can_idx]
    # 0: Hóa Lộc (tốt), 1: Hóa Quyền (tốt), 2: Hóa Khoa (tốt), 3: Hóa Kỵ (xấu)
    tu_hoa_specs = [
        ("L.Hóa Lộc", tu_hoa[0], True),
        ("L.Hóa Quyền", tu_hoa[1], True),
        ("L.Hóa Khoa", tu_hoa[2], True),
        ("L.Hóa Kỵ", tu_hoa[3], False)
    ]
    for luu_name, host_star, is_good in tu_hoa_specs:
        host_pos = ctx.all_star_positions.get(host_star)
        if host_pos is not None:
            ctx.add_luu(luu_name, host_pos, is_good)


def calculate_3_year_transits(ctx: ChartContext, tieu_han_start: int, tieu_han_step: int) -> List[Dict[str, Any]]:
    """
    Tính toán chi tiết vận hạn và 13 sao lưu cho 3 năm liên tiếp (N, N+1, N+2).
    """
    years = [ctx.limit_year, ctx.limit_year + 1, ctx.limit_year + 2]
    res = []

    for y in years:
        can_idx = (y - 4 + 1000) % 10
        chi_idx = (y - 4 + 1200) % 12
        can_name = CAN[can_idx]
        chi_name = CHI_DISPLAY[chi_idx]
        can_chi_str = f"{can_name} {chi_name}"
        tuoi_mu = y - ctx.calc_lunar_year + 1

        # Cung Tiểu Hạn
        if tieu_han_step == 1:
            th_pos = (tieu_han_start + tuoi_mu - 1) % 12
        else:
            th_pos = (tieu_han_start - (tuoi_mu - 1) + 1200) % 12

        # Cung Lưu Thái Tuế
        ltt_pos = chi_idx

        # Tính 13 sao lưu của năm y
        sao_luu_by_cung: Dict[str, List[Dict[str, Any]]] = {str(i): [] for i in range(12)}
        sao_luu_list: List[Dict[str, Any]] = []

        def _add(name: str, pos: int, is_good: bool):
            item = {"ten": name, "pos": pos, "cung_chi": CHI_DISPLAY[pos], "loai": "tot" if is_good else "xau"}
            sao_luu_by_cung[str(pos)].append(item)
            sao_luu_list.append(item)

        _add("L.Thái Tuế", chi_idx, False)
        _add("L.Tang Môn", (chi_idx + 2) % 12, False)
        _add("L.Bạch Hổ", (chi_idx + 8) % 12, False)
        _add("L.Thiên Khốc", (6 - chi_idx + 120) % 12, False)
        _add("L.Thiên Hư", (6 + chi_idx) % 12, False)

        loc_ton_pos = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][can_idx]
        _add("L.Lộc Tồn", loc_ton_pos, True)
        _add("L.Kình Dương", (loc_ton_pos + 1) % 12, False)
        _add("L.Đà La", (loc_ton_pos - 1 + 120) % 12, False)

        thien_ma_pos = [2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5][chi_idx]
        _add("L.Thiên Mã", thien_ma_pos, True)

        tu_hoa = TU_HOA_TABLE[can_idx]
        tu_hoa_specs = [
            ("L.Hóa Lộc", tu_hoa[0], True),
            ("L.Hóa Quyền", tu_hoa[1], True),
            ("L.Hóa Khoa", tu_hoa[2], True),
            ("L.Hóa Kỵ", tu_hoa[3], False)
        ]
        for luu_name, host_star, is_good in tu_hoa_specs:
            host_pos = ctx.all_star_positions.get(host_star)
            if host_pos is not None:
                _add(luu_name, host_pos, is_good)

        # Quét trùng tụ sao (Star Clash / Synergy)
        interactions = []
        for pos in range(12):
            c_data = ctx.dia_ban[pos]
            c_luu = sao_luu_by_cung[str(pos)]
            c_luu_names = [s["ten"] for s in c_luu]
            base_tot = [s["ten"] for s in c_data.get("phu_tinh_tot", [])]
            base_xau = [s["ten"] for s in c_data.get("phu_tinh_xau", [])]
            all_base = base_tot + base_xau

            cung_desc = f"{c_data['ten_cung']} ({c_data['cung_chi']})"

            if "L.Lộc Tồn" in c_luu_names and "Lộc Tồn" in all_base:
                interactions.append(f"Song Lộc trùng phùng tại {cung_desc} (Cát lợi tài lộc tăng vọt)")
            if "L.Hóa Lộc" in c_luu_names and "Hóa Lộc" in all_base:
                interactions.append(f"Song Hóa Lộc tại {cung_desc} (Cơ duyên tài chính bùng nổ)")
            if "L.Hóa Kỵ" in c_luu_names and "Hóa Kỵ" in all_base:
                interactions.append(f"Song Hóa Kỵ tại {cung_desc} (Ám tinh kích hoạt mạnh, đề phòng thị phi, hao tài)")
            if "L.Kình Dương" in c_luu_names and "Kình Dương" in all_base:
                interactions.append(f"Trùng Kình Dương tại {cung_desc} (Thử thách xung đột, va chạm hoặc thương tích)")
            if "L.Đà La" in c_luu_names and "Đà La" in all_base:
                interactions.append(f"Trùng Đà La tại {cung_desc} (Trì trệ bế tắc, cẩn thận tranh chấp kéo dài)")
            if "L.Tang Môn" in c_luu_names and "Tang Môn" in all_base:
                interactions.append(f"Song Tang tại {cung_desc} (Gia đạo ưu tư, phiền muộn)")
            if "L.Bạch Hổ" in c_luu_names and "Bạch Hổ" in all_base:
                interactions.append(f"Song Hổ tại {cung_desc} (Áp lực tinh thần hoặc rủi ro pháp lý)")
            if "L.Thiên Mã" in c_luu_names and "Thiên Mã" in all_base:
                interactions.append(f"Song Mã hội tụ tại {cung_desc} (Biến động dịch chuyển nhiều)")

        res.append({
            "year": y,
            "can_idx": can_idx,
            "chi_idx": chi_idx,
            "can_name": can_name,
            "chi_name": chi_name,
            "can_chi": can_chi_str,
            "tuoi_mu": tuoi_mu,
            "tieu_han_pos": th_pos,
            "tieu_han_chi": CHI_DISPLAY[th_pos],
            "tieu_han_cung": ctx.dia_ban[th_pos]["ten_cung"],
            "luu_thai_tue_pos": ltt_pos,
            "luu_thai_tue_chi": CHI_DISPLAY[ltt_pos],
            "luu_thai_tue_cung": ctx.dia_ban[ltt_pos]["ten_cung"],
            "sao_luu_list": sao_luu_list,
            "sao_luu_by_cung": sao_luu_by_cung,
            "special_interactions": interactions
        })

    return res
