# -*- coding: utf-8 -*-
"""
Repository & calculation tables for Feng Shui module.
"""

from typing import Dict, List, Any

KUA_MAPPINGS = {
    1: {
        "menh_quai": "Khảm", "cung_phi": "Khảm Thủy", "element": "Thủy",
        "dong_tay_trach": "Đông Tứ Trạch",
        "favorable": [
            {"direction": "Đông Nam", "star": "Sinh Khí", "meaning": "Thu hút tài lộc, danh tiếng, thăng quan phát tài"},
            {"direction": "Đông", "star": "Thiên Y", "meaning": "Cải thiện sức khỏe, trường thọ, gặp quý nhân phù trợ"},
            {"direction": "Nam", "star": "Diên Niên", "meaning": "Củng cố các mối quan hệ tình cảm, gia đạo hòa thuận"},
            {"direction": "Bắc", "star": "Phục Vị", "meaning": "Củng cố sức mạnh tinh thần, bản thân tiến bộ, may mắn"}
        ],
        "unfavorable": [
            {"direction": "Tây", "star": "Họa Hại", "meaning": "Thị phi, thất bại, không may mắn"},
            {"direction": "Đông Bắc", "star": "Ngũ Quỷ", "meaning": "Mất nguồn thu nhập, mất việc làm, cãi lộn"},
            {"direction": "Tây Bắc", "star": "Lục Sát", "meaning": "Xáo trộn trong quan hệ tình cảm, thù hận, kiện tụng"},
            {"direction": "Tây Nam", "star": "Tuyệt Mệnh", "meaning": "Phá sản, bệnh tật chết người"}
        ]
    },
    2: {
        "menh_quai": "Khôn", "cung_phi": "Khôn Thổ", "element": "Thổ",
        "dong_tay_trach": "Tây Tứ Trạch",
        "favorable": [
            {"direction": "Đông Bắc", "star": "Sinh Khí", "meaning": "Phú quý, tài lộc dồi dào, con cái thành đạt"},
            {"direction": "Tây", "star": "Thiên Y", "meaning": "Gia đình thịnh vượng, khỏe mạnh, an khang"},
            {"direction": "Tây Bắc", "star": "Diên Niên", "meaning": "Gia đạo yên vui, trường thọ, bền vững"},
            {"direction": "Tây Nam", "star": "Phục Vị", "meaning": "Vững vàng bản tâm, phúc lộc vững bền"}
        ],
        "unfavorable": [
            {"direction": "Đông", "star": "Họa Hại", "meaning": "Tổn hao tài vật, thị phi khẩu thiệt"},
            {"direction": "Đông Nam", "star": "Ngũ Quỷ", "meaning": "Hỏa hoạn, trộm cắp, khẩu thiệt"},
            {"direction": "Nam", "star": "Lục Sát", "meaning": "Bất hòa nội bộ, kiện tụng, tai ách"},
            {"direction": "Bắc", "star": "Tuyệt Mệnh", "meaning": "Tổn nhân khẩu, bệnh tật liên miên"}
        ]
    },
    3: {
        "menh_quai": "Chấn", "cung_phi": "Chấn Mộc", "element": "Mộc",
        "dong_tay_trach": "Đông Tứ Trạch",
        "favorable": [
            {"direction": "Nam", "star": "Sinh Khí", "meaning": "Công danh rạng rỡ, thăng tiến vượt bậc"},
            {"direction": "Bắc", "star": "Thiên Y", "meaning": "Thân thể cường tráng, phúc lộc dồi dào"},
            {"direction": "Đông Nam", "star": "Diên Niên", "meaning": "Hôn nhân bền vững, con cháu hiếu thuận"},
            {"direction": "Đông", "star": "Phục Vị", "meaning": "Tăng cường định lực, bình an may mắn"}
        ],
        "unfavorable": [
            {"direction": "Tây Nam", "star": "Họa Hại", "meaning": "Thị phi, trắc trở mưu cầu"},
            {"direction": "Tây Bắc", "star": "Ngũ Quỷ", "meaning": "Bất an, tranh chấp, tổn tài"},
            {"direction": "Đông Bắc", "star": "Lục Sát", "meaning": "Tình duyên lận đận, tai tiếng"},
            {"direction": "Tây", "star": "Tuyệt Mệnh", "meaning": "Đại hung, tai biến nguy hiểm"}
        ]
    },
    4: {
        "menh_quai": "Tốn", "cung_phi": "Tốn Mộc", "element": "Mộc",
        "dong_tay_trach": "Đông Tứ Trạch",
        "favorable": [
            {"direction": "Bắc", "star": "Sinh Khí", "meaning": "Tài lộc dồi dào, hiển đạt vinh hoa"},
            {"direction": "Nam", "star": "Thiên Y", "meaning": "Tránh bệnh tật, trường thọ an vui"},
            {"direction": "Đông", "star": "Diên Niên", "meaning": "Gia hòa vạn sự hưng"},
            {"direction": "Đông Nam", "star": "Phục Vị", "meaning": "Tâm tính ôn hòa, học hành đỗ đạt"}
        ],
        "unfavorable": [
            {"direction": "Tây Bắc", "star": "Họa Hại", "meaning": "Bất hòa thị phi, thất thoát"},
            {"direction": "Tây Nam", "star": "Ngũ Quỷ", "meaning": "Hao tài tốn của, bệnh tật"},
            {"direction": "Tây", "star": "Lục Sát", "meaning": "Gia đạo xáo trộn, ưu phiền"},
            {"direction": "Đông Bắc", "star": "Tuyệt Mệnh", "meaning": "Tai họa khôn lường, tuyệt khí"}
        ]
    },
    6: {
        "menh_quai": "Càn", "cung_phi": "Càn Kim", "element": "Kim",
        "dong_tay_trach": "Tây Tứ Trạch",
        "favorable": [
            {"direction": "Tây", "star": "Sinh Khí", "meaning": "Tài vận hanh thông, đại cát đại lợi"},
            {"direction": "Đông Bắc", "star": "Thiên Y", "meaning": "Quý nhân nâng đỡ, khỏe mạnh trường thọ"},
            {"direction": "Tây Nam", "star": "Diên Niên", "meaning": "Vợ chồng hòa thuận, nhân duyên tốt lành"},
            {"direction": "Tây Bắc", "star": "Phục Vị", "meaning": "Khí chất uy nghiêm, gia đạo bình yên"}
        ],
        "unfavorable": [
            {"direction": "Đông Nam", "star": "Họa Hại", "meaning": "Thất bại trong công việc, khẩu thiệt"},
            {"direction": "Đông", "star": "Ngũ Quỷ", "meaning": "Tai nạn, thị phi, tranh cãi"},
            {"direction": "Bắc", "star": "Lục Sát", "meaning": "Trắc trở tình duyên, kiện cáo"},
            {"direction": "Nam", "star": "Tuyệt Mệnh", "meaning": "Hung hiểm cùng cực, đại kỵ"}
        ]
    },
    7: {
        "menh_quai": "Đoài", "cung_phi": "Đoài Kim", "element": "Kim",
        "dong_tay_trach": "Tây Tứ Trạch",
        "favorable": [
            {"direction": "Tây Bắc", "star": "Sinh Khí", "meaning": "Tài lộc phong túc, đại hưng gia nghiệp"},
            {"direction": "Tây Nam", "star": "Thiên Y", "meaning": "Sức khỏe an khang, tiêu trừ bệnh tật"},
            {"direction": "Đông Bắc", "star": "Diên Niên", "meaning": "Hòa thuận viên mãn, phúc đức sâu dày"},
            {"direction": "Tây", "star": "Phục Vị", "meaning": "Thanh nhàn an lạc, may mắn tự nhiên"}
        ],
        "unfavorable": [
            {"direction": "Bắc", "star": "Họa Hại", "meaning": "Bất hòa trong nhà, tổn hao"},
            {"direction": "Nam", "star": "Ngũ Quỷ", "meaning": "Tổn tài thương thân, hỏa hoạn"},
            {"direction": "Đông Nam", "star": "Lục Sát", "meaning": "Thị phi, trục trặc gia đạo"},
            {"direction": "Đông", "star": "Tuyệt Mệnh", "meaning": "Tai họa khôn lường, suy thoái"}
        ]
    },
    8: {
        "menh_quai": "Cấn", "cung_phi": "Cấn Thổ", "element": "Thổ",
        "dong_tay_trach": "Tây Tứ Trạch",
        "favorable": [
            {"direction": "Tây Nam", "star": "Sinh Khí", "meaning": "Vận may liên tiếp, thăng tiến sự nghiệp"},
            {"direction": "Tây Bắc", "star": "Thiên Y", "meaning": "Khí lực dồi dào, bình an vô sự"},
            {"direction": "Tây", "star": "Diên Niên", "meaning": "Gia đình hòa hợp, trăm năm hạnh phúc"},
            {"direction": "Đông Bắc", "star": "Phục Vị", "meaning": "Ý chí kiên định, công việc ổn định"}
        ],
        "unfavorable": [
            {"direction": "Nam", "star": "Họa Hại", "meaning": "Trắc trở mưu cầu, thị phi"},
            {"direction": "Bắc", "star": "Ngũ Quỷ", "meaning": "Thất thoát tiền của, bệnh tật"},
            {"direction": "Đông", "star": "Lục Sát", "meaning": "Trục trặc tình cảm, điều tiếng"},
            {"direction": "Đông Nam", "star": "Tuyệt Mệnh", "meaning": "Bại liệt tiêu điều, đại hung"}
        ]
    },
    9: {
        "menh_quai": "Ly", "cung_phi": "Ly Hỏa", "element": "Hỏa",
        "dong_tay_trach": "Đông Tứ Trạch",
        "favorable": [
            {"direction": "Đông", "star": "Sinh Khí", "meaning": "Trí tuệ minh mẫn, phát tài phát lộc"},
            {"direction": "Đông Nam", "star": "Thiên Y", "meaning": "Thân tâm an lạc, tiêu trừ nghiệp bệnh"},
            {"direction": "Bắc", "star": "Diên Niên", "meaning": "Quan hệ êm đẹp, quý nhân tương trợ"},
            {"direction": "Nam", "star": "Phục Vị", "meaning": "Rực rỡ danh tiếng, hanh thông"}
        ],
        "unfavorable": [
            {"direction": "Đông Bắc", "star": "Họa Hại", "meaning": "Hiểu lầm thị phi, hao tổn"},
            {"direction": "Tây", "star": "Ngũ Quỷ", "meaning": "Tai họa bất ngờ, tranh chấp"},
            {"direction": "Tây Nam", "star": "Lục Sát", "meaning": "Xáo trộn tinh thần, phiền não"},
            {"direction": "Tây Bắc", "star": "Tuyệt Mệnh", "meaning": "Đại kỵ nguy hại, suy bại"}
        ]
    }
}

SON_HUONG_24 = [
    {"son_huong": "Nhâm", "direction": "Bắc", "deg_start": 337.5, "deg_end": 352.5, "element": "Thủy"},
    {"son_huong": "Tý", "direction": "Bắc", "deg_start": 352.5, "deg_end": 7.5, "element": "Thủy"},
    {"son_huong": "Quý", "direction": "Bắc", "deg_start": 7.5, "deg_end": 22.5, "element": "Thủy"},
    {"son_huong": "Sửu", "direction": "Đông Bắc", "deg_start": 22.5, "deg_end": 37.5, "element": "Thổ"},
    {"son_huong": "Cấn", "direction": "Đông Bắc", "deg_start": 37.5, "deg_end": 52.5, "element": "Thổ"},
    {"son_huong": "Dần", "direction": "Đông Bắc", "deg_start": 52.5, "deg_end": 67.5, "element": "Mộc"},
    {"son_huong": "Giáp", "direction": "Đông", "deg_start": 67.5, "deg_end": 82.5, "element": "Mộc"},
    {"son_huong": "Mão", "direction": "Đông", "deg_start": 82.5, "deg_end": 97.5, "element": "Mộc"},
    {"son_huong": "Ất", "direction": "Đông", "deg_start": 97.5, "deg_end": 112.5, "element": "Mộc"},
    {"son_huong": "Thìn", "direction": "Đông Nam", "deg_start": 112.5, "deg_end": 127.5, "element": "Thổ"},
    {"son_huong": "Tốn", "direction": "Đông Nam", "deg_start": 127.5, "deg_end": 142.5, "element": "Mộc"},
    {"son_huong": "Tỵ", "direction": "Đông Nam", "deg_start": 142.5, "deg_end": 157.5, "element": "Hỏa"},
    {"son_huong": "Bính", "direction": "Nam", "deg_start": 157.5, "deg_end": 172.5, "element": "Hỏa"},
    {"son_huong": "Ngọ", "direction": "Nam", "deg_start": 172.5, "deg_end": 187.5, "element": "Hỏa"},
    {"son_huong": "Đinh", "direction": "Nam", "deg_start": 187.5, "deg_end": 202.5, "element": "Hỏa"},
    {"son_huong": "Mùi", "direction": "Tây Nam", "deg_start": 202.5, "deg_end": 217.5, "element": "Thổ"},
    {"son_huong": "Khôn", "direction": "Tây Nam", "deg_start": 217.5, "deg_end": 232.5, "element": "Thổ"},
    {"son_huong": "Thân", "direction": "Tây Nam", "deg_start": 232.5, "deg_end": 247.5, "element": "Kim"},
    {"son_huong": "Canh", "direction": "Tây", "deg_start": 247.5, "deg_end": 262.5, "element": "Kim"},
    {"son_huong": "Dậu", "direction": "Tây", "deg_start": 262.5, "deg_end": 277.5, "element": "Kim"},
    {"son_huong": "Tân", "direction": "Tây", "deg_start": 277.5, "deg_end": 292.5, "element": "Kim"},
    {"son_huong": "Tuất", "direction": "Tây Bắc", "deg_start": 292.5, "deg_end": 307.5, "element": "Thổ"},
    {"son_huong": "Càn", "direction": "Tây Bắc", "deg_start": 307.5, "deg_end": 322.5, "element": "Kim"},
    {"son_huong": "Hợi", "direction": "Tây Bắc", "deg_start": 322.5, "deg_end": 337.5, "element": "Thủy"}
]
