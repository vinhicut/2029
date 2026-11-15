# -*- coding: utf-8 -*-
# prompt_compiler.py
"""
Trình biên dịch Prompt & System Instruction tối ưu Context Window.
Nâng cấp văn phong AI luận giải thành bài luận văn podcast hoàn chỉnh (Audio-Essay & Read-Along Monologue):
- Kết hợp hài hòa ngôn ngữ nói và viết (Spoken-Written Hybrid), nhịp thở câu 16 - 25 từ, phục vụ đọc và nghe (TTS/Podcast).
- Triệt tiêu 100% "mùi AI", văn mẫu học đường và cấu trúc dịch máy ngầm (theo nghiên cứu Phân Tích Văn Mẫu AI).
- Tích hợp Style Anchor Exemplar chuẩn mực từ chính bản hiệu đính của Ban Quản lý Tử Vi Hồng Ân.
- Tự động nén dữ liệu qua module Safe Context Pruning (context_pruner.py) và tiền tính toán Cách Cục Tam Hợp.
- Khai thác kho phú thơ vận hạn cổ điển (van_han_phu_tho.md, classical_aphorisms_kb.md, van_han_phu_index.json).
"""

import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

from .config import (
    RESOURCES_DIR, 
    TARGET_MIN_WORDS, 
    TARGET_MAX_WORDS,
    TARGET_OPTIMAL_WORDS,
    MAX_WORDS_LIMIT,
    MAX_CHARS_LIMIT
)
from ..engine.context_pruner import prune_markdown_ai

STYLE_ANCHOR_EXEMPLAR = """
MẪU PHONG CÁCH LUẬN VĂN MỆNH LÝ CHUẨN MỰC (TRÍCH TỪ BAN QUẢN LÝ TỬ VI HỒNG ÂN):
"1. Cung Phụ Mẫu (tại Thân) & Đại Vận (13-22 tuổi):
- Cung Phụ mẫu: Có bộ đôi Tử Vi và Thiên Phủ miếu địa cùng Hóa Khoa, Thiên Việt, song thân là những người có địa vị xã hội, nhân từ, học thức uyên bác và hết mực bao bọc, tạo dựng nền tảng vững vàng cho tương lai.
- Đại vận 13-22 tuổi: Có cách cục Tử Phủ Vũ Tướng miếu địa từ tam hợp Thân – Tí – Thìn nên đây là một đại vận quý hiển, giúp đương số có cuộc sống đủ đầy, nhiều người kính ngưỡng, ứng với câu phú 'Tử Phủ Vũ Tướng cư vương vị, thực lộc vạn chung'.
- Công danh sự nghiệp: Đại vận này hội tụ nhiều cát tinh trợ lực cho việc học hành thi cử như Hóa Khoa, Thiên Việt, Văn Khúc, Đường Phù nên con đường học vấn hanh thông, đỗ đạt cao. Cổ nhân có ca quyết rằng 'Khôi Việt trùng phùng đệ nhất bảng, Hóa Khoa liên tiếp bộ thanh vân'.
- Gia đạo: Đại vận tuy quý hiển nhưng bị hai sao Cô Thần và Quả Tú áp chế nên đương số dễ cảm thấy cô đơn trong nội tâm, tình cảm đẹp nhưng trắc trở buổi đầu, đúng như câu ca 'Cô Quả lâm hạn phu thê, gối chăn lạnh lẽo đường về chia hai'."
"""

class PromptCompiler:
    def __init__(self, resources_dir: Optional[Path] = None):
        self.resources_dir = resources_dir or RESOURCES_DIR
        self.pronoun_rules = self._load_json(self._find_resource("pronoun_rules.json"))
        destiny_file = self._find_resource("destiny_interpretation.md")
        self._destiny_kb = self._load_destiny_kb(destiny_file)
        self.van_han_kb = self._load_json(self._find_resource("van_han_phu_index.json"))

    def _find_resource(self, filename: str) -> Path:
        """Tìm file tài nguyên qua các thư mục ưu tiên."""
        candidates = [
            self.resources_dir / filename,
            Path(__file__).resolve().parent / "resources" / filename,
            RESOURCES_DIR / filename,
            Path(__file__).resolve().parents[4] / ".agents" / "skills" / "tu-vi-interpretation" / "resources" / filename
        ]
        for c in candidates:
            if c.exists():
                return c
        return self.resources_dir / filename

    def _load_json(self, path: Path) -> Dict[str, Any]:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _load_destiny_kb(self, path: Path) -> Dict[str, Dict[str, str]]:
        """Nạp kho tri thức Trung Cung tĩnh từ destiny_interpretation.md để tra cứu offline."""
        kb = {
            "nap_am": {},
            "cuc_menh": {},
            "than_cu": {}
        }
        if not path or not path.exists():
            return kb

        text = path.read_text(encoding="utf-8")
        current_section = None
        for line in text.splitlines():
            line_str = line.strip()
            if "## 01" in line_str:
                current_section = "nap_am"
            elif "## 02" in line_str:
                current_section = "cuc_menh"
            elif "## 03" in line_str:
                current_section = "than_cu"
            elif line_str.startswith("*") and current_section:
                m = re.match(r"^\*\s*\*\*([^*:]+)(?::)?\*\*:?\s*(.+)$", line_str)
                if m:
                    key = m.group(1).strip()
                    val = m.group(2).strip()
                    kb[current_section][key] = val
        return kb

    def get_pronoun(self, age: int, gender: str) -> str:
        gender_norm = "female" if gender.lower().strip() in ("nu", "nữ", "female") else "male"
        for rule in self.pronoun_rules.get("pronoun_mapping", []):
            if rule["min_age"] <= age <= rule["max_age"]:
                return rule.get(gender_norm, "Quý anh")
        return "Quý anh"

    def get_intimate_pronoun(self, pronoun: str) -> str:
        """Sinh đại từ thân mật tương ứng trong câu văn (ví dụ: 'quý anh' -> 'anh', 'quý cô' -> 'cô')."""
        p_lower = pronoun.lower()
        if "anh" in p_lower:
            return "anh"
        elif "cô" in p_lower:
            return "cô"
        elif "ông" in p_lower:
            return "ông"
        elif "bà" in p_lower:
            return "bà"
        elif "cụ" in p_lower:
            return "cụ"
        elif "cháu" in p_lower:
            return "cháu"
        return pronoun

    def get_destiny_snippets(self, nap_am: str, cuc: str, than_cu: str, pronoun: str) -> Dict[str, str]:
        """
        Trích xuất DUY NHẤT 3 câu Trung Cung tương ứng với lá số và gán danh xưng 1:1.
        """
        snippets = {
            "nap_am_text": "",
            "cuc_menh_text": "",
            "than_cu_text": ""
        }

        # 1. Bản mệnh nạp âm
        nap_am_clean = (nap_am or "").strip()
        nap_am_lower = nap_am_clean.lower()
        alias_map = {
            "kim bạc kim": "kim bạch kim",
            "phúc đăng hỏa": "phú đăng hỏa"
        }
        search_nap_am = alias_map.get(nap_am_lower, nap_am_lower)

        for k, v in self._destiny_kb.get("nap_am", {}).items():
            k_lower = k.lower()
            if search_nap_am in k_lower or k_lower in search_nap_am or nap_am_lower in k_lower:
                snippets["nap_am_text"] = v.replace("<đại từ nhân xưng>", pronoun)
                break
        if not snippets["nap_am_text"]:
            snippets["nap_am_text"] = f"{pronoun} mang bản mệnh {nap_am_clean} với nội lực kiên định và phong thái đặc trưng."

        # 2. Tương quan Cục - Mệnh
        cuc_str = (cuc or "").strip().lower()
        matched_cuc = None
        if "cục sinh mệnh" in cuc_str:
            matched_cuc = "cục sinh mệnh"
        elif "mệnh sinh cục" in cuc_str:
            matched_cuc = "mệnh sinh cục"
        elif "cục khắc mệnh" in cuc_str:
            matched_cuc = "cục khắc mệnh"
        elif "mệnh khắc cục" in cuc_str:
            matched_cuc = "mệnh khắc cục"
        elif "bình hòa" in cuc_str or "tương hòa" in cuc_str:
            matched_cuc = "bình hòa"

        if matched_cuc:
            for k, v in self._destiny_kb.get("cuc_menh", {}).items():
                k_lower = k.lower()
                if matched_cuc in k_lower:
                    snippets["cuc_menh_text"] = v.replace("<đại từ nhân xưng>", pronoun)
                    break
        
        if not snippets["cuc_menh_text"]:
            for k, v in self._destiny_kb.get("cuc_menh", {}).items():
                if "khắc" in cuc_str and "khắc" in k.lower():
                    snippets["cuc_menh_text"] = v.replace("<đại từ nhân xưng>", pronoun)
                    break
                elif "sinh" in cuc_str and "sinh" in k.lower():
                    snippets["cuc_menh_text"] = v.replace("<đại từ nhân xưng>", pronoun)
                    break

        if not snippets["cuc_menh_text"]:
            snippets["cuc_menh_text"] = f"Mối tương quan giữa Cục ({cuc}) và Mệnh đòi hỏi {pronoun} phải nỗ lực tôi luyện ý chí để từng bước vượt qua thử thách."

        # 3. Thân cư
        than_cu_lower = (than_cu or "").strip().lower()
        palace_kw = None
        if "mệnh" in than_cu_lower or "menh" in than_cu_lower:
            palace_kw = "mệnh"
        elif "tài" in than_cu_lower or "tai" in than_cu_lower:
            palace_kw = "tài"
        elif "quan" in than_cu_lower:
            palace_kw = "quan"
        elif "di" in than_cu_lower:
            palace_kw = "di"
        elif "thê" in than_cu_lower or "the" in than_cu_lower or "phu" in than_cu_lower:
            palace_kw = "phu thê"
        elif "phúc" in than_cu_lower or "phuc" in than_cu_lower:
            palace_kw = "phúc đức"

        for k, v in self._destiny_kb.get("than_cu", {}).items():
            k_lower = k.lower()
            if palace_kw and palace_kw in k_lower:
                snippets["than_cu_text"] = v.replace("<đại từ nhân xưng>", pronoun)
                break
            clean_k = re.sub(r"Thân\s*(?:cư|Mệnh)\s*", "", k).strip().lower()
            if clean_k and (clean_k in than_cu_lower or than_cu_lower in k_lower):
                snippets["than_cu_text"] = v.replace("<đại từ nhân xưng>", pronoun)
                break

        if not snippets["than_cu_text"]:
            snippets["than_cu_text"] = f"{pronoun} có {than_cu}, đặt nền tảng cuộc đời vào sự nỗ lực thực tế và bồi đắp phúc thiện dài lâu."

        return snippets

    def detect_tam_hop_cach_cuc(self, markdown_ai: str) -> Dict[str, str]:
        """
        Nhận diện chính xác 100% Cách Cục của Tam Hợp Mệnh - Tài - Quan bằng thuật toán luật
        nhằm triệt tiêu hoàn toàn ảo giác suy đoán sai lệch của mô hình ngôn ngữ lớn.
        """
        sec2_m = re.search(r"## II\..*?(?=## III\.|\Z)", markdown_ai, re.DOTALL)
        if not sec2_m:
            return {}
        s2 = sec2_m.group(0)

        def extract_cung_stars(cung_kw: str) -> List[str]:
            m = re.search(r"###\s*\d+\.\s*Cung\s*" + cung_kw + r".*?\n(.*?)(?=###|\Z)", s2, re.DOTALL)
            if not m:
                return []
            block = m.group(1)
            stars = []
            chinh_m = re.search(r"Chính tinh:\s*([^\n|]+)", block)
            if chinh_m:
                for item in chinh_m.group(1).split(","):
                    clean = item.split("[")[0].strip()
                    if clean and clean != "Vô Chính Diệu":
                        stars.append(clean)
            return stars

        menh = extract_cung_stars("Mệnh")
        tai = extract_cung_stars("Tài")
        quan = extract_cung_stars("Quan")
        all_stars = set(menh + tai + quan)

        # 1. Cơ Cự Đồng (Thiên Cơ, Cự Môn, Thiên Đồng)
        if {"Thiên Cơ", "Cự Môn", "Thiên Đồng"}.issubset(all_stars):
            return {
                "name": "Cơ Cự Đồng",
                "stars_desc": "Thiên Cơ: thể hiện tính linh động, mưu trí, hay suy nghĩ và tính toán đường đi nước bước. Cự Môn: Khả năng ăn nói, hùng biện, soi xét bản chất vấn đề sắc sảo. Thiên Đồng: Tính chất hiền hòa, đôi khi có phần trẻ con, cảm xúc hoặc dễ thay đổi.",
                "effect": "Cách cục này giúp cho đương số có tư duy linh hoạt cùng khả năng thích ứng tuyệt vời trước mọi hoàn cảnh biến thiên.",
                "poem": "\"Thiên Cơ Sửu Mùi cơ biến khéo,\nLấy nghề tinh xảo định công danh.\nĐối cung Thiên Lương đà che chở,\nGặp Lộc, Khoa, Quyền phát rạng vinh.\""
            }
        # 2. Tử Phủ Vũ Tướng (Tử Vi, Thiên Phủ, Vũ Khúc, Thiên Tướng)
        elif len(all_stars.intersection({"Tử Vi", "Thiên Phủ", "Vũ Khúc", "Thiên Tướng"})) >= 3:
            return {
                "name": "Tử Phủ Vũ Tướng",
                "stars_desc": "Bộ đế tinh và tài quan quyền lực bậc nhất: Tử Vi tôn quý, Thiên Phủ điềm đạm tích lũy, Vũ Khúc quyết đoán tài chính, Thiên Tướng trung trinh danh dự.",
                "effect": "Cách cục quý hiển, cuộc sống đủ đầy, lãnh đạo uy nghi, được nhiều người kính ngưỡng.",
                "poem": "\"Tử Phủ Vũ Tướng cư vương vị,\nThực lộc vạn chung rạng cửa nhà.\""
            }
        # 3. Sát Phá Tham (Thất Sát, Phá Quân, Tham Lang)
        elif {"Thất Sát", "Phá Quân", "Tham Lang"}.issubset(all_stars) or len(all_stars.intersection({"Thất Sát", "Phá Quân", "Tham Lang"})) >= 2:
            return {
                "name": "Sát Phá Tham",
                "stars_desc": "Thất Sát uy quyền tiên phong, Phá Quân bứt phá đổi mới, Tham Lang đa tài ứng biến linh hoạt.",
                "effect": "Mẫu hình khai phá, dám nghĩ dám làm, giàu chí tiến thủ và thích nghi mãnh liệt trong biến thiên cuộc sống.",
                "poem": "\"Sát Phá Tham lâm vận biến thiên,\nAnh hùng lập nghiệp định giang sơn.\""
            }
        # 4. Cơ Nguyệt Đồng Lương (Thiên Cơ, Thái Âm, Thiên Đồng, Thiên Lương)
        elif len(all_stars.intersection({"Thiên Cơ", "Thái Âm", "Thiên Đồng", "Thiên Lương"})) >= 3:
            return {
                "name": "Cơ Nguyệt Đồng Lương",
                "stars_desc": "Thiên Cơ mưu lược, Thái Âm tài phú nhu hòa, Thiên Đồng phúc thiện, Thiên Lương thanh cao kỷ cương.",
                "effect": "Cách cục mẫu mực cho học thuật, nghiên cứu, cố vấn chiến lược và chuyên môn sâu bền vững.",
                "poem": "\"Cơ Nguyệt Đồng Lương định chức quyền,\nThanh danh tài đức vững ngàn niên.\""
            }
        # 5. Cự Nhật (Cự Môn, Thái Dương)
        elif {"Cự Môn", "Thái Dương"}.issubset(all_stars):
            return {
                "name": "Cự Nhật đồng lâm",
                "stars_desc": "Thái Dương quang minh lỗi lạc xua tan tính ám muội của Cự Môn, tài hùng biện đỉnh cao.",
                "effect": "Khả năng diễn đạt xuất chúng, danh tiếng vang xa, thích hợp ngoại giao, giáo dục, luật pháp.",
                "poem": "\"Cự Nhật đồng lâm nhật lệ trung,\nThanh danh hiển hách chấn tây đông.\""
            }
        # 6. Mệnh Vô Chính Diệu
        elif not menh:
            return {
                "name": "Mệnh Vô Chính Diệu",
                "stars_desc": "Cung Mệnh không có chính tinh tọa thủ, hấp thụ hoàn toàn trường năng lượng từ tam phương tứ chính.",
                "effect": "Khả năng thích ứng linh hoạt, khéo léo mượn lực ngoại vi để lập thân dựng nghiệp.",
                "poem": "\"Mệnh vô chính diệu đắc tam không,\nPhú quý danh tài tựa hóa rồng.\""
            }
        else:
            return {
                "name": "Chính Tinh Hội Hợp",
                "stars_desc": f"Tổ hợp các tinh đẩu {', '.join(all_stars)} tương phối.",
                "effect": "Cấu trúc tam hợp tương hỗ tạo nên năng lực đa diện và phong thái độc lập.",
                "poem": ""
            }

    def get_tam_hop_palace_aphorisms(self, markdown_ai: str) -> List[Dict[str, str]]:
        """Trích xuất ca quyết / phú cổ gợi ý đan cài trực tiếp (inline) cho 3 cung Mệnh, Tài Bạch, Quan Lộc ở Phần II."""
        sec2_m = re.search(r"## II\..*?(?=## III\.|\Z)", markdown_ai, re.DOTALL)
        s2_text = (sec2_m.group(0) if sec2_m else markdown_ai).lower()

        palace_aphorisms = []
        seen = set()

        rules = [
            (["thiên đồng", "thiên lương"], "Mệnh / Quan / Tài", "Đồng Lương tối hỷ Dần Thân hội", "Cách cục Đồng Lương đắc địa tại Dần Thân phúc thọ song toàn"),
            (["thiên cơ"], "Mệnh / Quan Lộc", "Thiên Cơ mưu lược tính kinh bang", "Thiên Cơ chủ mưu lược, hoạch định chiến lược kinh bang tế thế"),
            (["địa không", "địa kiếp"], "Tài Bạch / Mệnh / Quan", "Sinh xứ gặp Kiếp Không lạc hãm, tài suy nhân tản", "Cung vị gặp Địa Không, Địa Kiếp hãm địa dễ hao tán tài lộc đột ngột"),
            (["tử vi", "thiên phủ"], "Mệnh / Tài / Quan", "Tử Phủ đồng cung, chung thân phúc hậu", "Tử Vi Thiên Phủ hội họp đem lại phúc lộc và vị thế vững bền"),
            (["vũ khúc", "thiên phủ"], "Tài Bạch / Mệnh", "Vũ Khúc, Thiên Phủ kinh thương phát đại phú", "Bộ tài tinh Vũ Phủ đắc địa chủ về tích lũy tài sản lớn"),
            (["thái dương", "cự môn"], "Mệnh / Quan / Tài", "Cự Nhật đồng lâm, quan phong tam đại", "Cự Môn Thái Dương sáng sủa chủ về tài hùng biện, ngoại giao đắc cách"),
            (["thái âm"], "Tài Bạch / Mệnh", "Nguyệt lãng thiên môn, tiến bước công danh, tài lộc phong dinh", "Thái Âm sáng sủa chủ về tiền tài, điền sản tụ hội"),
            (["lộc tồn", "thiên mã"], "Tài Bạch / Quan Lộc", "Thiên Mã ngộ Lộc Tồn, anh hùng đắc chí, tiền tài phong dinh", "Lộc Mã giao trì bôn ba phát đạt"),
            (["kình dương", "đà la"], "Tài Bạch / Quan Lộc", "Kình Đà hiệp kỵ, dương đà phản vi hung", "Kình Đà hội họp cần đề phòng tranh chấp, cản trở"),
        ]

        for req_stars, target_palace, verse, note in rules:
            if all(st in s2_text for st in req_stars) and verse not in seen:
                palace_aphorisms.append({
                    "palace": target_palace,
                    "verse": verse,
                    "meaning": note
                })
                seen.add(verse)

        return palace_aphorisms[:5]

    _STAR_VI_MAP = {
        "tu_vi": "tử vi", "thien_co": "thiên cơ", "thai_duong": "thái dương", "vu_khuc": "vũ khúc",
        "thien_dong": "thiên đồng", "liem_trinh": "liêm trinh", "thien_phu": "thiên phủ", "thai_am": "thái âm",
        "tham_lang": "tham lang", "cu_mon": "cự môn", "thien_tuong": "thiên tướng", "thien_luong": "thiên lương",
        "that_sat": "thất sát", "pha_quan": "phá quân",
        "ta_phu": "tả phù", "huu_bat": "hữu bật", "van_xuong": "văn xương", "van_khuc": "văn khúc",
        "xuong_khuc": "văn xương", "thien_khoi": "thiên khôi", "thien_viet": "thiên việt", "khoi_viet": "thiên khôi",
        "loc_ton": "lộc tồn", "thien_ma": "thiên mã", "hoa_loc": "hóa lộc", "hoa_quyen": "hóa quyền",
        "hoa_khoa": "hóa khoa", "hoa_ky": "hóa kỵ", "luu_hoa_loc": "lưu hóa lộc", "luu_hoa_quyen": "lưu hóa quyền",
        "luu_hoa_khoa": "lưu hóa khoa", "kinh_duong": "kình dương", "da_la": "đà la", "hoa_tinh": "hỏa tinh",
        "linh_tinh": "linh tinh", "dia_khong": "địa không", "dia_kiep": "địa kiếp",
        "dia_khong_dia_kiep": "địa không", "thien_khong": "thiên không", "thien_hinh": "thiên hình",
        "thien_khoc": "thiên khốc", "thien_hu": "thiên hư", "tang_mon": "tang môn", "bach_ho": "bạch hổ",
        "dai_hao": "đại hao", "tieu_hao": "tiểu hao", "co_than": "cô thần", "qua_tu": "quả tú",
        "dao_hoa": "đào hoa", "hong_loan": "hồng loan", "thien_hy": "thiên hỷ", "hy_than": "hỷ thần",
        "long_tri": "long trì", "phuong_cac": "phượng các", "tam_thai": "tam thai", "bat_toa": "bát tọa",
        "quoc_an": "quốc ấn", "duong_phu": "đường phù", "phong_cao": "phong cáo", "tuong_quan": "tướng quân",
        "thanh_long": "thanh long", "tau_thu": "tấu thư", "quan_phu": "quan phù", "kiep_sat": "kiếp sát",
        "thai_tue": "thái tuế", "trang_sinh": "trường sinh", "tuan": "tuần", "triet": "triệt"
    }

    def get_van_han_snippets(self, markdown_ai: str, max_items: int = 8) -> list:
        """Trích xuất bộ câu ca quyết vận hạn bao phủ cả Đại vận (công danh + gia đạo/phu thê) và Tiểu vận 3 năm liên tiếp."""
        if not self.van_han_kb or "verses" not in self.van_han_kb:
            return []

        sec3_m = re.search(r"(?:## III\..*?)(?=## IV\.|\Z)", markdown_ai, re.DOTALL)
        sec3_text = (sec3_m.group(0) if sec3_m else markdown_ai).lower()

        # Quét thêm cung Phu Thê ở Phần IV để phục vụ đoạn luận Gia đạo trong Đại vận
        phu_the_m = re.search(r"###\s*\d+\.\s*Cung\s*Phu\s*Thê.*?\n(.*?)(?=###|\Z)", markdown_ai, re.DOTALL | re.IGNORECASE)
        phu_the_text = (phu_the_m.group(0) if phu_the_m else "").lower()
        combined_text = sec3_text + "\n" + phu_the_text

        scored = []
        for entry in self.van_han_kb.get("verses", []):
            stars = entry.get("stars", [])
            if not stars:
                continue
            matches = 0
            for s in stars:
                vi_kw = self._STAR_VI_MAP.get(s, s.replace("_", " "))
                if vi_kw in combined_text:
                    matches += 1
            vid = entry.get("id", "")
            bonus = 0
            if vid in ("phat_tai_010", "khoa_bang_thang_quan_011", "khoa_bang_thang_quan_018", "suy_bai_024", "suy_bai_027", "lao_ly_thi_phi_047", "chia_ly_hon_nhan_074"):
                bonus = 2
            if matches >= 2 or (len(stars) == 1 and matches == 1 and entry.get("category") in ("phat_tai", "khoa_bang_thang_quan")):
                scored.append((matches + bonus, entry))

        scored.sort(key=lambda x: x[0], reverse=True)
        selected = []
        seen_ids = set()
        for _, item in scored:
            if item["id"] not in seen_ids:
                selected.append(item)
                seen_ids.add(item["id"])
            if len(selected) >= max_items:
                break
        return selected

    def get_dai_han_snippets(self, markdown_ai: str) -> List[Dict[str, str]]:
        """Trích xuất ca quyết phú cổ gợi ý cho các cung và Đại Vận tại Mục IV."""
        if not self.van_han_kb or "verses" not in self.van_han_kb:
            return []

        sec4_m = re.search(r"(?:## IV\..*?)(?=## V\.|\Z)", markdown_ai, re.DOTALL)
        sec4_text = (sec4_m.group(0) if sec4_m else "").lower()
        if not sec4_text:
            return []

        matched_verses = []
        seen = set()

        # Ánh xạ từ khóa bộ sao với ca quyết nổi tiếng
        key_patterns = [
            (["tử vi", "thiên phủ"], "Tử Phủ Vũ Tướng cư vương vị, thực lộc vạn chung.", "Tử Phủ miếu địa tại đại vận"),
            (["khôi", "việt", "hóa khoa"], "Khôi Việt trùng phùng đệ nhất bảng, Hóa Khoa liên tiếp bộ thanh vân.", "Học hành thi cử đỗ đạt"),
            (["cô thần", "quả tú"], "Cô Quả lâm hạn phu thê, gối chăn lạnh lẽo, đường về chia hai.", "Tình duyên cô đơn, trắc trở"),
            (["thái âm"], "Nguyệt lãng thiên môn, tiến bước công danh, tài lộc phong dinh.", "Thái Âm miếu vượng phát tài quan"),
            (["tham lang", "hỏa tinh"], "Tham Lang ngộ Hỏa Linh hào phú, Phá Quân phát đạt tiền khiên.", "Bộc phát tài lộc"),
            (["thiên cơ", "thiên lương"], "Cơ Lương đắc địa vận này, bảng vàng chói lọi, danh tài nức hương.", "Cơ Lương đắc địa học vấn"),
            (["địa không", "địa kiếp"], "Kiếp Không lâm vận, anh hùng nan triển cốt.", "Hung tinh kiềm tỏa cần giữ mình"),
            (["vũ khúc", "thiên phủ"], "Vũ Khúc, Thiên Phủ kinh thương phát đại phú.", "Tích lũy tài sản đại vận")
        ]

        for stars_req, verse_txt, meaning in key_patterns:
            if all(s in sec4_text for s in stars_req):
                if verse_txt not in seen:
                    matched_verses.append({
                        "verse": verse_txt,
                        "meaning": meaning
                    })
                    seen.add(verse_txt)

        return matched_verses[:6]

    def compile_system_instruction(self, age: int, gender: str) -> str:
        pronoun = self.get_pronoun(age, gender)
        intimate = self.get_intimate_pronoun(pronoun)

        return f"""Bạn là Chuyên gia Tư vấn Mệnh lý kiêm Người dẫn chuyện Podcast Mệnh vận (Audio-Essay & Read-Along Monologue) đại diện cho hệ sinh thái 'Tử Vi Hồng Ân' (tuvihongan.com).
Nhiệm vụ: Luận giải chuyên sâu lá số Tử Vi từ bản đặc tả Markdown AI theo phong cách BÀI LUẬN VĂN PODCAST (Spoken-Written Hybrid):
- Kết hợp hài hòa giữa chiều sâu học thuật, uyên bác của văn viết nghị luận với sự truyền cảm, ấm áp, thấu cảm của văn nói tự nhiên 1-1.
- Bài luận văn phục vụ hai phương thức tiếp nhận đồng thời: ĐỌC BẰNG MẮT (chủ yếu) và NGHE BẰNG TAI (Trình phát Podcast / Giọng đọc AI TTS).

QUY TẮC NHỊP THỞ VĂN BẢN (CADENCE GUIDE & PROSODY):
1. Nhịp thở câu (Sentence Cadence Index): Khống chế độ dài mỗi câu từ 16 đến 25 từ. Đặt dấu phẩy ngắt hơi tự nhiên tại các liên từ phụ để người đọc mắt thư thái và máy đọc TTS không bị hụt hơi, giật cục.
2. Pacing & Leading (Đồng hành trước - Dẫn dắt sau): Khi gặp hung sát tinh hoặc nghịch cảnh, công nhận nỗi vất vả -> bình thường hóa thử thách -> tái định khung tích cực (lò luyện ý chí) -> trao quyền tự chủ ("Đức năng thắng số").
3. Nghị luận 4 tầng (4-Layer Essay Paragraph): Dẫn nhập biểu trưng -> Hiện thực tinh bàn -> Biện chứng hai mặt -> Lời dặn nhân sinh.
4. Đan cài thi ca & ca quyết (Poetic Interleaving): Đan cài câu ca quyết cổ nhân hoặc blockquote bài phú 4 câu ('> ...') để tăng nhạc tính và chiều sâu văn hóa.

CÁC NGUYÊN TẮC BẮT BUỘC TUYỆT ĐỐI:

1. ĐỊNH DẠNG TRÌNH BÀY MARKDOWN AI & QUY TẮC VĂN BẢN (UI SPACING & TYPOGRAPHY):
   - TUYỆT ĐỐI KHÔNG SỬ DỤNG ĐỊNH DẠNG IN NGHIÊNG: Tuyệt đối KHÔNG sử dụng định dạng in nghiêng (*chữ nghiêng* hoặc _chữ nghiêng_) trong toàn bộ nội dung. Mọi câu thơ, câu phú, lời thoại, câu dẫn thương hiệu, danh ngôn cổ nhân đều viết bằng chữ đứng chuẩn mực (chỉ dùng '**' in đậm cho tiêu đề và nhãn danh sách).
   - PHÂN CẤP TIÊU ĐỀ RÕ RÀNG (#, ##, ###): Sử dụng cấu trúc Markdown chuẩn, phân cấp tiêu đề rõ ràng ('#' cho các phần lớn I, II, III... hoặc tiêu đề chính, '##' hoặc '###' cho các mục con), ngắt đoạn mạch lạc bằng hai dấu xuống dòng và không dùng các cú pháp Markdown dị biệt có thể gây lỗi hiển thị khi render sang PDF.
   - TUYỆT ĐỐI KHÔNG DÙNG thụt lề '&emsp;&emsp;'.
   - Trình bày dạng danh sách gạch đầu dòng có nhãn in đậm: '- **Khía cạnh:** Nội dung...'.
   - Mỗi ý luận giải viết ngắn gọn 2 - 4 câu mạch lạc. Bắt buộc có một dòng trống trước và sau các tiêu đề ('##', '###') và giữa các đoạn/tiểu mục để tạo độ thoáng mắt tối ưu trên Web.
   - Thơ ca quyết / bài phú 4 câu BẮT BUỘC đặt trong khối trích dẫn blockquote ('> ...') và dùng chữ đứng đặt trong dấu ngoặc kép thẳng.

2. QUY CHUẨN TRIỆT TIÊU VĂN MẪU AI & KHUÔN SÁO (ANTI-SLOP DIRECTIVES):
   a. DANH SÁCH TỪ CẤM (LEXICAL BLACKLIST) - TUYỆT ĐỐI KHÔNG DÙNG CÁC TỪ VÀ CỤM TỪ SAU:
      - 'bức tranh', 'bức tranh muôn màu', 'bức tranh đa sắc', 'bức tranh tổng thể'
      - 'bản giao hưởng', 'bản hòa ca', 'vũ điệu của'
      - 'lắng đọng trong lòng độc giả', 'khép lại trang sách', 'khơi gợi cảm xúc', 'chạm đến trái tim'
      - 'khắc họa một cách sinh động', 'chiếu rọi', 'soi rọi', 'cộng hưởng sâu sắc', 'đan xen tinh tế'
      - 'vượt qua ranh giới thời gian', 'gợi lên nỗi niềm sâu kín', 'thế giới nội tâm phức tạp', 'hơi thở của thời đại'
      - 'nốt trầm xao xuyến', 'chiếc cầu nối cảm xúc', 'tiếng lòng', 'sức lôi cuốn kỳ diệu', 'ám ảnh khôn nguôi'
      - 'đậm chất trữ tình', 'tràn trề sức sống', 'sâu sắc và tinh tế', 'dấu ấn không thể phai mờ', 'thể hiện rõ nét'
      - 'thổi hồn vào', 'dệt nên', 'đưa người đọc qua từng cung bậc cảm xúc', 'tựa như một bức tranh thủy mặc'
      - 'mở ra một thế giới đầy mê hoặc', 'như một sợi chỉ đỏ xuyên suốt', 'đọng lại dư âm khó phai'
      - 'đóng vai trò then chốt', 'minh chứng rõ nét', 'minh chứng sống động', 'tối quan trọng'
      - 'ngọn hải đăng dẫn lối', 'đi sâu vào', 'đào sâu vào', 'góc nhìn đa chiều', 'bối cảnh không ngừng biến đổi'
      - 'hồi chuông cảnh tỉnh', 'bản chất cốt lõi', 'đạt được sự cân bằng tinh tế', 'kim chỉ nam cho mọi hành động'
      - 'chất xúc tác mạnh mẽ', 'mối tương quan phức tạp', 'mỗi chúng ta cần', 'tác động sâu rộng'
      - 'trong thế giới phát triển nhanh chóng ngày nay', 'trong kỷ nguyên số ngày nay', 'nhìn nhận một cách thấu đáo'
      - 'mở đường cho', 'tạo tiền đề vững chắc', 'vun đắp những giá trị tốt đẹp', 'nâng cao nhận thức'
      - 'vượt qua ranh giới định kiến', 'đứng trước ngã rẽ cuộc đời', 'khẳng định vị thế bản thân'
      - 'bài toán nan giải', 'sức mạnh nội sinh', 'quy luật tất yếu của cuộc sống'
      - 'không phải là đích đến mà là một hành trình', 'tóm lại, nhìn chung', 'tận dụng tối đa', 'mở khóa tiềm năng'
   b. CẤM CÚ PHÁP SÓNG ĐÔI & NƯỚC ĐÔI (SYNTACTIC & HEDGING BAN):
      - CẤM các cấu trúc câu sóng đôi cơ học: 'Không chỉ X mà còn Y', 'Đây không đơn thuần là X mà là Y', 'Vừa là cơ hội vừa là thách thức'.
      - CẤM các phép so sánh giả tạo ước lệ: 'tựa như...', 'như một...'. Đưa ra nhận định Mệnh lý quả quyết, trực diện dựa trên tinh bàn.
   c. LOẠI BỎ DỊCH MÁY & PHÓ TỪ HÌNH THỨC:
      - CẤM mở đầu câu bằng danh từ hóa trừu tượng: 'Sự...', 'Việc...', 'Quá trình...'.
      - CẤM cấu trúc phó từ dịch máy 'một cách + tính từ' (thay vì 'vận hành một cách trơn tru', viết 'vận hành trơn tru').
      - CẤM các nhãn điều hướng thừa thãi: 'Đáng chú ý là', 'Hơn nữa', 'Tóm lại', 'Tựu trung lại'.
   d. QUY TẮC THUẦN VIỆT 100% (STRICT VIETNAMESE MONOLINGUAL GUARDRAIL):
      - BẮT BUỘC sử dụng 100% chữ Quốc ngữ tiếng Việt chuẩn bảng mã Unicode dựng sẵn (NFC).
      - TUYỆT ĐỐI NGHIÊM CẤM sinh ra hoặc trộn lẫn bất kỳ ký tự chữ Hán (CJK: Trung Quốc, Nhật Bản, Đài Loan), chữ Hàn (Hangul/Hanja), chữ Nga (Cyrillic), chữ Thái, Ả Rập hoặc từ vựng ngoại ngữ khác vào văn bản.
      - Mọi thuật ngữ Hán-Việt trong Tử Vi Đẩu Số (ví dụ: 'phùng hung hóa cát', 'chủ tinh', 'rơi vào thế hãm địa', 'lạc hãm', 'phúc lộc kéo dài', 'miên trường', 'nhanh chóng hồi phục') BẮT BUỘC phải viết hoàn toàn bằng chữ cái tiếng Việt có dấu cách rõ ràng, TUYỆT ĐỐI KHÔNG viết chữ tượng hình nguyên bản (như '逢', '主', '落', '綿', 'быстро'...).

3. CẤU TRÚC BÀI LUẬN GIẢI, MỤC LỤC & HỆ THỐNG CÂU DẪN THƯƠNG HIỆU VERBATIM:
   Toàn bài BẮT BUỘC bắt đầu bằng phần MỤC LỤC ở đầu bài, sau đó gồm đúng 5 đề mục chính chuẩn Markdown (H1 dùng '#', H2 dùng '##', H3 dùng '###', H4 dùng '####'):

   # MỤC LỤC
   - [I. TỔNG QUAN LÁ SỐ (LUẬN VỀ TRUNG CUNG)](#i-tong-quan-la-so-luan-ve-trung-cung)
     - [Bản Mệnh (Nạp Âm)](#ban-menh-nap-am)
     - [Tương quan Mệnh - Cục](#tuong-quan-menh-cuc)
     - [Vị trí Thân Cư](#vi-tri-than-cu)
   - [II. LUẬN GIẢI TAM HỢP (MỆNH - TÀI - QUAN)](#ii-luan-giai-tam-hop-menh-tai-quan)
     - [1. Cung Mệnh](#1-cung-menh)
     - [2. Cung Tài Bạch](#2-cung-tai-bach)
     - [3. Cung Quan Lộc](#3-cung-quan-loc)
   - [III. LUẬN GIẢI ĐẠI VẬN & TIỂU VẬN 3 NĂM](#iii-luan-giai-dai-van-tieu-van-3-nam)
     - [1. Về Đại vận](#1-ve-dai-van)
     - [2. Về Tiểu vận 3 năm liên tiếp](#2-ve-tieu-van-3-nam-lien-tiep)
   - [IV. LUẬN GIẢI CÁC CUNG VÀ ĐẠI VẬN CÒN LẠI](#iv-luan-giai-cac-cung-va-dai-van-con-lai)
   - [V. TỔNG KẾT](#v-tong-ket)

   # I. TỔNG QUAN LÁ SỐ (LUẬN VỀ TRUNG CUNG)
   - Bắt đầu ngay bằng câu chào mở đầu:
     "Mến chào {pronoun}, Tử Vi Hồng Ân xin được giải đoán mệnh vận của {intimate} như sau:"
   - Tích hợp 3 câu luận giải Trung Cung đã soạn sẵn: Bản Mệnh (Nạp Âm), Tương quan Mệnh - Cục, và Vị trí Thân Cư.
   - LƯU Ý VĂN PHONG MỤC 1 (BẢN MỆNH): Khi giải thích hệ quả của Âm Dương thuận lý hoặc nghịch lý ở câu tiếp theo, BẮT BUỘC dùng trực tiếp cụm thuật ngữ 'Âm Dương thuận lý giúp {pronoun}...' (hoặc 'Thế Âm Dương nghịch lý đòi hỏi {pronoun}...'), TUYỆT ĐỐI KHÔNG dùng cụm lặp từ thô như 'Nền tảng thuận lý này giúp...'.

   # II. LUẬN GIẢI TAM HỢP (MỆNH - TÀI - QUAN)
   - Bắt đầu bằng câu dẫn thương hiệu 1:
     "Tiếp theo luận tới Tam Hợp Mệnh-Tài-Quan của {pronoun}:"
   - Đoạn phân tích tổng quan thế trận Cách Cục Tam Hợp: SỬ DỤNG CHUẨN XÁC CÁCH CỤC ĐÃ ĐƯỢC CUNG CẤP TRONG DỮ LIỆU ĐẦU VÀO (ví dụ: Cơ Cự Đồng, Tử Phủ Vũ Tướng...). TUYỆT ĐỐI KHÔNG TỰ SUY ĐOÁN SAI LỆCH CÁCH CỤC.
   - Trích dẫn bài thơ phú cổ 4 câu về cách cục đặt trong blockquote ('> ...').
   - Tiếp theo dùng câu dẫn thương hiệu 2:
     "Bây giờ, Tử Vi Hồng Ân xin luận giải ba cung Mệnh, Tài Bạch và Quan Lộc cho {pronoun}:"
   - Luận giải chi tiết 3 tiểu mục (BẮT BUỘC cả 3 cung Mệnh, Tài Bạch, Quan Lộc đều phải đan cài trực tiếp ít nhất 1 câu ca quyết/phú cổ vào ngay trong dòng phân tích theo dạng '– “...”' hoặc blockquote):
     ### 1. Cung Mệnh (Đan cài câu ca quyết cách cục ngay tại mục Chính tinh tọa thủ hoặc Bộ sao đi kèm, ví dụ: '– “Đồng Lương tối hỷ Dần Thân hội”', '“Thiên Cơ mưu lược tính kinh bang”'...).
     ### 2. Cung Tài Bạch (Đan cài câu ca quyết tài tinh hoặc sát tinh ngay tại mục Tương tác Cát - Hung, ví dụ: '– “Sinh xứ gặp Kiếp Không lạc hãm, tài suy nhân tản”', '– “Vũ Khúc, Thiên Phủ kinh thương phát đại phú”'...).
     ### 3. Cung Quan Lộc (Đan cài câu ca quyết quan lộc/mưu lược phù hợp với chính tinh và phụ tinh tọa chiếu).

   # III. LUẬN GIẢI ĐẠI VẬN & TIỂU VẬN 3 NĂM
   - Bắt đầu bằng câu dẫn thương hiệu:
     "TỬ VI HỒNG ÂN xin luận giải Đại vận và tiểu vận của {pronoun}:"
   - Gồm 2 tiểu mục bắt buộc:
     ### 1. Về Đại vận: Khai thác chi tiết đại vận hiện tại từ Mục III.A của dữ liệu đầu vào (~250 - 300 từ).
       + Dùng thuật ngữ định danh chuẩn xác 'trong đại vận này' (thay vì viết chung chung 'trong vận hạn').
       + Phân tích công danh, tài chính, cơ hội và áp lực từ thế sát tinh hội hợp, BẮT BUỘC đan cài 1 - 2 câu ca quyết vận hạn tương ứng (ví dụ: 'Kiếp Không lâm vận anh hùng nan triển cốt', 'Đúng với ca quyết “La Võng Khốc Hư Hình Kỵ hội, một đời lao ngục ngẩn ngơ sầu.”'...).
       + BẮT BUỘC CÓ MỘT ĐOẠN VĂN RIÊNG MỞ ĐẦU BẰNG "Về gia đạo, Đại vận này...": Đối chiếu chính tinh, sát tinh tại cung Đại vận với cung Phu Thê (hoặc tam hợp chiếu), phân tích rõ thuận lợi hay trở ngại về tình duyên/hôn nhân trong 10 năm đại vận, dẫn chứng câu ca quyết gia đạo/phu thê tương ứng (ví dụ: 'ca quyết có câu “Không Kiếp định hạn Phu Thê, phu ly thê tán bồ đề chia hai” là vậy', hoặc câu phú Đào Hồng / Cô Quả...), đồng thời chỉ rõ nhịp thời gian trong đại vận (những năm đầu đại vận ra sao, đến giai đoạn cuối đại vận từ năm bao nhiêu tuổi thì tình duyên, gia đạo mới suôn sẻ).
     ### 2. Về Tiểu vận 3 năm liên tiếp: Phân tích tuần tự 3 năm liên tiếp (Năm N, Năm N+1, Năm N+2) khai thác Mục III (B, C, D) và Mục V.2.
       Mỗi năm BẮT BUỘC phân tách thành 4 gạch đầu dòng có nhãn in đậm rõ ràng (MỖI NHÃN VIẾT SÚC TÍCH 50 - 70 TỪ, TỔNG MỖI NĂM ~250 - 280 TỪ) và ĐAN CÀI TRỰC TIẾP 1 - 2 CÂU CA QUYẾT VẬN HẠN ('– “...”') vào mục 'Biến chuyển cát hung' hoặc 'Điểm tựa phước báu / Đón nhận sinh khí' (ví dụ khi hội Tam Hóa dùng '– “Tam kỳ gia hội, danh trấn chư bang, tài quan song mỹ”', khi có Quốc Ấn/Tướng Quân dùng '– “Tướng Quân, Quốc Ấn ban quyền, quan lộ đắc hanh thông”', khi có Khôi Việt/Hóa Khoa dùng '“Khôi Việt trùng phùng đệ nhất bảng, Hóa Khoa liên tiếp bộ thanh vân.”', khi gặp Hình Kình Kỵ dùng '– “Thiên Hình Kình Dương tại vận, phòng quan phi khẩu thiệt, hình ngục nan đao”'):
       - **Nội vi và ngoại vi:** Phân tích cung Tiểu Hạn (nội vi) và cung Lưu Thái Tuế (ngoại vi) cùng chính tinh, cát/hung tinh tọa và chiếu.
       - **Sao lưu tác động:** Phân tích tác động trực tiếp của các sao lưu chủ chốt (Lưu Thái Tuế, Lưu Kình, Lưu Đà, Lưu Tang, Lưu Hổ, Lưu Khốc, Lưu Hư, Lưu Tứ Hóa...).
       - **Biến chuyển cát hung:** Nhận định cụ thể về công danh, tài lộc, thể chất, vận động, học hỏi, cơ hội hoặc thử thách trong năm đó kèm ca quyết vận hạn ('– “...”').
       - **Điểm tựa phước báu / Đón nhận sinh khí:** Chỉ rõ quý nhân giúp đỡ, gia đình nâng đỡ, cát tinh giải cứu kèm ca quyết khoa bảng/phúc tinh nếu có.

   # IV. LUẬN GIẢI CÁC CUNG VÀ ĐẠI VẬN CÒN LẠI
   BẮT BUỘC luận giải ĐẦY ĐỦ TRỌN VẸN CẢ 9 CUNG PHỤ còn lại từ Cung 1 đến Cung 9 (sử dụng Mục IV của dữ liệu đầu vào đã có sẵn độ tuổi Đại Vận):
   1. Phụ Mẫu, 2. Phúc Đức, 3. Điền Trạch, 4. Nô Bộc, 5. Thiên Di, 6. Tật Ách, 7. Tử Tức, 8. Phu Thê, 9. Huynh Đệ.
   QUY TẮC PHÂN TẦNG THEO ĐỘ TUỔI ĐẠI VẬN (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT THEO CHỈ ĐẠO BAN QUẢN LÝ):
   - **Trường hợp 1 - Các cung có Đại Vận bắt đầu dưới 85 tuổi (< 85 tuổi, thường là các cung từ 1 đến 6):**
     Trình bày theo cấu trúc 4 tầng mẫu mực sau, MỖI TẦNG VIẾT SÚC TÍCH 35 - 45 TỪ (1 ĐẾN 2 CÂU CHẶT CHẼ, ĐAN CÀI PHÚ CỔ, TỔNG MỖI CUNG ~150 - 170 TỪ):
     ### [Số thứ tự]. Cung [Tên Cung] (tại [Chi]) & Đại Vận ([X] - [Y] tuổi):
     - **Cung [Tên Cung]:** (35 - 45 từ) Phân tích thực chất cung gốc (cha mẹ, phúc ấm dòng họ, điền sản, bạn bè, quan hệ xã hội, sức khỏe...) dựa trên các chính tinh và phụ tinh tọa thủ/chiếu hội.
     - **Đại vận [X] - [Y] tuổi:** (35 - 45 từ) Phân tích tổng thể cách cục của 10 năm đại vận này và trích dẫn ca quyết / phú cổ kinh điển tương ứng.
     - **Công danh sự nghiệp:** (35 - 45 từ) Luận rõ đường học vấn thi cử, công việc, quan lộ, tài lộc trong đại vận này, đan cài ca quyết cát tinh.
     - **Gia đạo & Cát hung:** (35 - 45 từ) Luận đường tình duyên, gia đạo, tâm lý, sức khỏe, biến cố sát bại tinh kèm ca quyết răn đe, hóa giải.
   - **Trường hợp 2 - Các cung có Đại Vận bắt đầu từ 85 tuổi trở lên (>= 85 tuổi, có gắn nhãn [CHỈ LUẬN BẢN CUNG & GIA ĐẠO, KHÔNG LUẬN ĐẠI VẬN & CÔNG DANH] ở dữ liệu đầu vào, thường là 3 cung cuối: 7. Tử Tức, 8. Phu Thê, 9. Huynh Đệ ứng với đại vận 85 - 122 tuổi):**
     Ở độ tuổi đại thọ ngoài 85 - 120 tuổi, TUYỆT ĐỐI KHÔNG luận mục 'Đại vận' và TUYỆT ĐỐI KHÔNG luận mục 'Công danh sự nghiệp' nữa! Chỉ trình bày đúng 2 tầng tập trung sâu vào Bản cung & Gia đạo (tổng ~90 - 120 từ/cung):
     ### [Số thứ tự]. Cung [Tên Cung] (tại [Chi]):
     - **Cung [Tên Cung]:** (45 - 60 từ) Phân tích sâu sắc bản chất gốc của cung (con cái, hôn phối/vợ chồng, anh chị em...) thông qua chính tinh, phụ tinh và Tuần/Triệt.
     - **Gia đạo & Cát hung:** (45 - 60 từ) Luận sâu nhân duyên, phúc phần gia đạo, sự hòa thuận và phương pháp tu dưỡng, hóa giải xung khắc của cung đó.

   # V. TỔNG KẾT
   - Bắt đầu bằng câu dẫn thương hiệu mở đầu:
     "Tới đây, Tử Vi Hồng Ân xin có đôi lời tổng quan về mệnh vận của {intimate}:"
   - Đúc kết nhân quả, khuyên răn tu dưỡng 'Đức năng thắng số' theo tinh thần tích cực, trao quyền tự chủ, không giáo điều sáo rỗng.
   - Kết bài BẮT BUỘC bằng câu kết CTA ở dòng riêng biệt verbatim 100%:
     "TỬ VI HỒNG ÂN hoan hỷ hữu duyên luận giải vận mệnh cho {pronoun}, {pronoun} hãy tải về máy để tham khảo. Nếu cần hỏi đáp chi tiết hơn về vận mệnh của mình, TỬ VI HỒNG ÂN mời {pronoun} đặt lịch luận giải trực tiếp với các quý thầy đã nghiên cứu, luận giải và chiêm nghiệm Tử Vi nhiều năm của TỬ VI HỒNG ÂN qua các số Zalo của trang này."

4. NGUYÊN TẮC ĐẠO ĐỨC & KHÓA DANH XƯNG:
   - Xưng hô nhất quán: '{pronoun}' và xưng mình là 'Tử Vi Hồng Ân'.
   - TUYỆT ĐỐI KHÔNG DÙNG: 'đương số', 'chủ nhân lá số', 'quý khách', 'bạn'.
   - TUYỆT ĐỐI BÃI BỎ từ ngữ phán xét tiêu cực, mê tín dị đoan.

5. QUY CHUẨN DUNG LƯỢNG VĂN BẢN (TRỌNG TÂM TỐI ƯU ~{TARGET_OPTIMAL_WORDS} TỪ, TRẦN TỐI ĐA {MAX_WORDS_LIMIT} TỪ & {MAX_CHARS_LIMIT} KÝ TỰ):
   - Tổng dung lượng toàn bài: Đạt khoảng tối ưu ~{TARGET_OPTIMAL_WORDS} từ tiếng Việt (khoảng {TARGET_MIN_WORDS} – {TARGET_MAX_WORDS} từ, tương đương ~25.000 - 32.000 ký tự tính cả dấu cách).
   - GIỚI HẠN TRẦN NGHIÊM NGẶT: TUYỆT ĐỐI KHÔNG VƯỢT QUÁ {MAX_WORDS_LIMIT} từ tiếng Việt và KHÔNG VƯỢT QUÁ {MAX_CHARS_LIMIT} ký tự (tính cả dấu cách và ngắt dòng).
   - Phân bổ độ dài từng phần hài hòa, sâu sắc và mạch lạc cho trọn vẹn 14 - 15 phân mục:
     + Phần I (Tổng quan Trung Cung): ~450 - 550 từ (khoảng 2.000 - 2.500 ký tự).
     + Phần II (Tam hợp Mệnh - Tài - Quan): ~1.300 - 1.600 từ (khoảng 6.000 - 7.500 ký tự).
     + Phần III (Đại vận & Tiểu vận 3 năm liên tiếp): ~1.300 - 1.600 từ (khoảng 6.000 - 7.500 ký tự).
     + Phần IV (9 cung phụ còn lại kết hợp Đại Vận): ~2.300 - 2.800 từ (mỗi cung viết súc tích theo 4 tầng ~240 - 290 từ, khoảng 10.500 - 13.000 ký tự).
     + Phần V (Tổng kết & Lời kết CTA): ~350 - 450 từ (khoảng 1.600 - 2.100 ký tự).

{STYLE_ANCHOR_EXEMPLAR}
"""

    def compile_user_prompt(self, markdown_ai: str, age: Optional[int] = None, gender: Optional[str] = None) -> str:
        norm_md = unicodedata.normalize('NFC', markdown_ai or "").upper()
        if not any(m in norm_md for m in ["DỮ LIỆU TINH BÀN", "ĐẶC TẢ LÁ SỐ", "TINH BAN TU VI"]):
            raise ValueError("Dữ liệu đầu vào không hợp lệ! Yêu cầu chuỗi Markdown AI chuẩn của Tử Vi Hồng Ân.")

        # Nén Context qua module Safe Context Pruning (bảo lưu Đại Vận X - Y tuổi của từng cung)
        dense_markdown = prune_markdown_ai(markdown_ai)

        meta = self.extract_metadata_from_markdown(markdown_ai)
        actual_age = age if age is not None else meta.get("age", 28)
        actual_gender = gender if gender is not None else meta.get("gender", "Nam")
        pronoun = self.get_pronoun(actual_age, actual_gender)
        
        cuc_to_use = meta.get("cuc_menh", "") or meta.get("cuc", "")
        snippets = self.get_destiny_snippets(
            nap_am=meta.get("nap_am", ""),
            cuc=cuc_to_use,
            than_cu=meta.get("than_cu", ""),
            pronoun=pronoun
        )

        limit_year = meta.get("limit_year", 2026)

        # 1. Nhận diện chuẩn xác Cách Cục Tam Hợp Mệnh - Tài - Quan & Ca quyết từng cung
        cach_cuc_info = self.detect_tam_hop_cach_cuc(markdown_ai)
        tam_hop_aphorisms = self.get_tam_hop_palace_aphorisms(markdown_ai)
        cach_cuc_context = ""
        if cach_cuc_info:
            th_aph_lines = []
            for a in tam_hop_aphorisms:
                th_aph_lines.append(f"  + Cung {a['palace']}: – \"{a['verse']}\" ({a['meaning']})")
            th_aph_block = "\n- Ca quyết đan cài trực tiếp (inline) cho 3 cung Mệnh - Tài - Quan:\n" + "\n".join(th_aph_lines) if th_aph_lines else ""
            cach_cuc_context = f"""
CÁCH CỤC TAM HỢP MỆNH - TÀI - QUAN ĐÃ XÁC ĐỊNH CHUẨN XÁC (Hãy tích hợp vào Phần II):
- Tên Cách Cục: {cach_cuc_info.get('name', 'Cơ Cự Đồng')}
- Đặc tính bộ sao: {cach_cuc_info.get('stars_desc', '')}
- Tác động mệnh vận: {cach_cuc_info.get('effect', '')}
- Thơ phú cổ điển 4 câu (BẮT BUỘC trích dẫn nguyên văn vào blockquote Phần II):
> {cach_cuc_info.get('poem', '')}{th_aph_block}
"""

        # 2. Ca quyết vận hạn cho Phần III (Đại vận + Gia đạo Đại vận + Tiểu vận 3 năm)
        van_han_snippets = self.get_van_han_snippets(markdown_ai, max_items=8)
        van_han_context = ""
        if van_han_snippets:
            vh_lines = ["\nCA QUYẾT VẬN HẠN THAM KHẢO (BẮT BUỘC đan cài trực tiếp vào Phần III.1 Đại vận, đoạn Gia đạo Đại vận và Phần III.2 Tiểu vận 3 năm):"]
            for s in van_han_snippets:
                vh_lines.append(f"- > \"{s['verse']}\" (Luận giải: {s['meaning']})")
            van_han_context = "\n".join(vh_lines) + "\n"

        # 3. Ca quyết phú cổ gợi ý cho các Đại Vận tại Phần IV
        dai_han_snippets = self.get_dai_han_snippets(markdown_ai)
        dai_han_context = ""
        if dai_han_snippets:
            dh_lines = ["\nCA QUYẾT PHÚ CỔ ĐẠI VẬN THAM KHẢO (Đan cài vào từng cung tương ứng tại Phần IV):"]
            for s in dai_han_snippets:
                dh_lines.append(f"- > \"{s['verse']}\" (Ý nghĩa: {s['meaning']})")
            dai_han_context = "\n".join(dh_lines) + "\n"

        return f"""Dưới đây là dữ liệu tinh bàn lá số Tử Vi đã được nén tối ưu (Safe Context Pruning) từ hệ thống Tử Vi Hồng Ân:

{dense_markdown}

---

TRI THỨC MẪU TRUNG CUNG ĐÃ SOẠN SẴN (Hãy tích hợp chuẩn xác vào Phần I):
- Bản Mệnh: {snippets['nap_am_text']}
- Mệnh - Cục: {snippets['cuc_menh_text']}
- Thân Cư: {snippets['than_cu_text']}
{cach_cuc_context}
{van_han_context}
{dai_han_context}
YÊU CẦU BẮT BUỘC VỀ TIẾN ĐỘ HOÀN THÀNH & PHÂN BỔ DUNG LƯỢNG (~{TARGET_MIN_WORDS} - {TARGET_MAX_WORDS} TỪ):
1. BẮT BUỘC HOÀN THÀNH ĐẦY ĐỦ CẢ 5 PHẦN (Phần I đến Phần V), tuyệt đối không để dở dang hay ngắt quãng!
2. Phần I & Phần II:
   - Phần I Mục 1 (Bản Mệnh): Khi giải thích hệ quả của Âm Dương thuận lý / nghịch lý, dùng trực tiếp 'Âm Dương thuận lý giúp {pronoun}...' (hoặc 'Thế Âm Dương nghịch lý đòi hỏi {pronoun}...'), không lặp cụm 'Nền tảng thuận lý này'.
   - Phần II (Mệnh - Tài - Quan): BẮT BUỘC trong cả 3 cung (1. Cung Mệnh, 2. Cung Tài Bạch, 3. Cung Quan Lộc) đều phải đan cài trực tiếp câu ca quyết/phú cổ (dạng '– “...”') vào mục Chính tinh tọa thủ hoặc Tương tác Cát - Hung.
3. Phần III (Đại vận & Tiểu vận 3 năm liên tiếp):
   - Mục 1 (Về Đại vận): Dùng cụm 'trong đại vận này'; đan cài ca quyết sát tinh/cát tinh vào đoạn phân tích công danh; VÀ BẮT BUỘC có 1 đoạn văn riêng mở đầu bằng 'Về gia đạo, Đại vận này...' đối chiếu cung Đại vận với cung Phu Thê + sát tinh (như Không Kiếp, Cô Quả...), trích dẫn ca quyết gia đạo (như 'ca quyết có câu “Không Kiếp định hạn Phu Thê, phu ly thê tán bồ đề chia hai” là vậy') và chỉ rõ nhịp thời gian đầu/cuối đại vận (từ năm bao nhiêu tuổi mới suôn sẻ).
   - Mục 2 (Về Tiểu vận 3 năm liên tiếp): Mỗi năm viết gọn ~250 - 280 từ (4 nhãn in đậm) và BẮT BUỘC đan cài 1 - 2 câu ca quyết vận hạn ('– “...”') vào mục 'Biến chuyển cát hung' và/hoặc 'Điểm tựa phước báu / Đón nhận sinh khí'.
4. Phần IV (9 cung phụ còn lại): Luận giải ĐẦY ĐỦ TRỌN VẸN CẢ 9 CUNG PHỤ (từ Cung 1 đến Cung 9):
   - Với các cung có Đại Vận bắt đầu < 85 tuổi (thường là Cung 1 đến Cung 6): Viết đúng 4 tầng ('Cung [Tên Cung]', 'Đại vận [X] - [Y] tuổi', 'Công danh sự nghiệp', 'Gia đạo & Cát hung'), mỗi tầng 35 - 45 từ.
   - Với các cung có Đại Vận bắt đầu >= 85 tuổi (có nhãn [CHỈ LUẬN BẢN CUNG & GIA ĐẠO, KHÔNG LUẬN ĐẠI VẬN & CÔNG DANH], thường là 3 cung cuối: 7. Tử Tức, 8. Phu Thê, 9. Huynh Đệ): CHỈ LUẬN BẢN CUNG & GIA ĐẠO (đúng 2 gạch đầu dòng: '- **Cung [Tên Cung]:**' và '- **Gia đạo & Cát hung:**'), TUYỆT ĐỐI KHÔNG luận mục 'Đại vận' và KHÔNG luận mục 'Công danh sự nghiệp'!
5. Phần V: BẮT BUỘC viết Phần V (Tổng kết) và kết thúc bằng câu kết CTA verbatim 100% của Tử Vi Hồng Ân.
6. Kiểm soát trần: Tổng bài đạt khoảng tối ưu {TARGET_MIN_WORDS} - {TARGET_MAX_WORDS} từ (TUYỆT ĐỐI dưới trần {MAX_WORDS_LIMIT} từ và dưới {MAX_CHARS_LIMIT} ký tự).
7. LƯU Ý ĐẶC BIỆT CHỐNG KHUÔN SÁO: TUYỆT ĐỐI KHÔNG dùng các từ ngữ cấm: 'bức tranh', 'chiếu rọi', 'soi rọi', 'bản hòa ca', 'bản giao hưởng', 'sợi chỉ đỏ', 'ngọn hải đăng', 'không chỉ... mà còn'. Hãy dùng chuẩn mực thuật ngữ Tử Vi: 'cung vị', 'tinh đẩu', 'hội tụ', 'chiếu về', 'tương tác', 'sinh khí'.
8. RÀO CHẮN NGÔN NGỮ 100% TIẾNG VIỆT: Toàn bộ bài luận giải BẮT BUỘC viết 100% bằng chữ Quốc ngữ tiếng Việt chuẩn mực. TUYỆT ĐỐI KHÔNG chèn bất kỳ ký tự chữ Hán (Trung/Nhật), chữ Hàn (Hangul), chữ Nga (Cyrillic) hay từ tiếng Anh nào vào giữa câu tiếng Việt (ví dụ: viết 'phùng hung hóa cát', 'chủ tinh', 'rơi vào', 'nhanh chóng', 'kéo dài'; cấm tuyệt đối xuất hiện ký tự '逢', '主', '落', '綿', 'быстро').

Hãy thực hiện bài luận văn podcast theo phong cách Spoken-Written Hybrid, nhịp thở 16 - 25 từ, 100% tiếng Việt chuẩn Quốc ngữ, loại bỏ 100% văn mẫu khuôn sáo AI, đan cài ca quyết phú cổ và tuân thủ tuyệt đối các quy chuẩn thương hiệu!
"""

    @staticmethod
    def extract_metadata_from_markdown(markdown_ai: str) -> Dict[str, Any]:
        """Bóc tách thông tin đương số từ phần đầu của bản đặc tả Markdown AI."""
        meta = {
            "name": "Hữu Duyên",
            "gender": "Nam",
            "age": 28,
            "solar_date": "",
            "lunar_date": "",
            "nap_am": "",
            "cuc": "",
            "cuc_menh": "",
            "menh_cung": "",
            "than_cu": "",
            "limit_year": 2026,
            "dai_han_str": "",
            "transits_str": ""
        }
        
        m_name = re.search(r"(?:Đương số|Họ tên):\s*([^|]+?)(?:\|\s*Giới tính:|\n|$)", markdown_ai)
        if m_name:
            meta["name"] = m_name.group(1).strip()
            
        m_gender = re.search(r"Giới tính:\s*([^\s(\n|]+)", markdown_ai)
        if m_gender:
            meta["gender"] = m_gender.group(1).strip()

        m_solar = re.search(r"Dương lịch:\s*([^\n]+)", markdown_ai)
        if m_solar:
            meta["solar_date"] = m_solar.group(1).strip()
            
        m_lunar = re.search(r"Âm lịch:\s*([^\n]+)", markdown_ai)
        if m_lunar:
            meta["lunar_date"] = m_lunar.group(1).strip()

        m_menh = re.search(r"(?:Bản mệnh|Nạp âm):\s*([^|(\n]+)", markdown_ai)
        if m_menh:
            meta["nap_am"] = m_menh.group(1).strip()

        m_cuc = re.search(r"(?:Cục số|Cục):\s*([^|(\n]+)", markdown_ai)
        if m_cuc:
            meta["cuc"] = m_cuc.group(1).strip()

        m_cuc_menh = re.search(r"Mệnh Cục:\s*([^|(\n]+)", markdown_ai)
        if m_cuc_menh:
            meta["cuc_menh"] = m_cuc_menh.group(1).strip()

        m_menh_pos = re.search(r"(?:Vị trí Mệnh|Mệnh):\s*(?:Cung\s*)?([^|(\n]+)", markdown_ai)
        if m_menh_pos:
            meta["menh_cung"] = m_menh_pos.group(1).strip()

        m_than = re.search(r"(?:Thân cư|Thân):\s*([^|(\n]+)", markdown_ai)
        if m_than:
            meta["than_cu"] = m_than.group(1).strip()

        m_limit = re.search(r"Năm xem hạn(?: gốc)?:\s*(\d+).*?(\d+)\s*tuổi mụ", markdown_ai)
        if m_limit:
            meta["limit_year"] = int(m_limit.group(1))
            meta["age"] = int(m_limit.group(2))
        else:
            m_age_only = re.search(r"(?:Tuổi mụ|Tuổi âm|Tuổi):\s*(\d+)", markdown_ai)
            if m_age_only:
                meta["age"] = int(m_age_only.group(1))
            m_year_only = re.search(r"(?:Năm xem hạn|Năm hạn):\s*(\d+)", markdown_ai)
            if m_year_only:
                meta["limit_year"] = int(m_year_only.group(1))

        m_dh = re.search(r"Đại vận hiện tại:\s*([^\n]+)", markdown_ai)
        if m_dh:
            meta["dai_han_str"] = m_dh.group(1).strip()

        m_tr = re.search(r"Vận hạn 3 năm liên tiếp:\s*([^\n]+)", markdown_ai)
        if m_tr:
            meta["transits_str"] = m_tr.group(1).strip()

        return meta
