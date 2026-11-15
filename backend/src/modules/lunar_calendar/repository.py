# -*- coding: utf-8 -*-
"""
Repository for Lunar Calendar reference constants.
"""

CAN_LIST = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"]
CHI_LIST = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"]

TRUC_12 = [
    "Kiến", "Trừ", "Mãn", "Bình", "Định", "Chấp", "Phá", "Nguy", "Thành", "Thu", "Khai", "Bế"
]

HOANG_DAO_MAP = {
    # Chi ngày -> Các giờ Hoàng Đạo (Tý..Hợi tương ứng 0..11)
    "Tý": ["Tý (23-1)", "Sửu (1-3)", "Mão (5-7)", "Ngọ (11-13)", "Thân (15-17)", "Dậu (17-19)"],
    "Sửu": ["Dần (3-5)", "Mão (5-7)", "Tỵ (9-11)", "Thân (15-17)", "Tuất (19-21)", "Hợi (21-23)"],
    "Dần": ["Tý (23-1)", "Sửu (1-3)", "Thìn (7-9)", "Tỵ (9-11)", "Mùi (13-15)", "Tuất (19-21)"],
    "Mão": ["Tý (23-1)", "Dần (3-5)", "Mão (5-7)", "Ngọ (11-13)", "Mùi (13-15)", "Dậu (17-19)"],
    "Thìn": ["Dần (3-5)", "Thìn (7-9)", "Tỵ (9-11)", "Thân (15-17)", "Dậu (17-19)", "Hợi (21-23)"],
    "Tỵ": ["Sửu (1-3)", "Thìn (7-9)", "Ngọ (11-13)", "Mùi (13-15)", "Tuất (19-21)", "Hợi (21-23)"],
    "Ngọ": ["Tý (23-1)", "Sửu (1-3)", "Mão (5-7)", "Ngọ (11-13)", "Thân (15-17)", "Dậu (17-19)"],
    "Mùi": ["Dần (3-5)", "Mão (5-7)", "Tỵ (9-11)", "Thân (15-17)", "Tuất (19-21)", "Hợi (21-23)"],
    "Thân": ["Tý (23-1)", "Sửu (1-3)", "Thìn (7-9)", "Tỵ (9-11)", "Mùi (13-15)", "Tuất (19-21)"],
    "Dậu": ["Tý (23-1)", "Dần (3-5)", "Mão (5-7)", "Ngọ (11-13)", "Mùi (13-15)", "Dậu (17-19)"],
    "Tuất": ["Dần (3-5)", "Thìn (7-9)", "Tỵ (9-11)", "Thân (15-17)", "Dậu (17-19)", "Hợi (21-23)"],
    "Hợi": ["Sửu (1-3)", "Thìn (7-9)", "Ngọ (11-13)", "Mùi (13-15)", "Tuất (19-21)", "Hợi (21-23)"]
}

TIET_KHI_LIST = [
    "Xuân Phân", "Thanh Minh", "Cốc Vũ", "Lập Hạ", "Tiểu Mãn", "Mang Chủng",
    "Hạ Chí", "Tiểu Thử", "Đại Thử", "Lập Thu", "Xử Thử", "Bạch Lộ",
    "Thu Phân", "Hàn Lộ", "Sương Giáng", "Lập Đông", "Tiểu Tuyết", "Đại Tuyết",
    "Đông Chí", "Tiểu Hàn", "Đại Hàn", "Lập Xuân", "Vũ Thủy", "Kinh Trập"
]
