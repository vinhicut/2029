# -*- coding: utf-8 -*-
"""
Service for Feng Shui module.
"""

from typing import List, Optional, Dict, Any
from .repository import KUA_MAPPINGS, SON_HUONG_24
from .models import KuaResult, CompassDirection


class FengShuiService:
    @staticmethod
    def calculate_kua(year: int, gender: str) -> KuaResult:
        gender_normalized = str(gender).strip().lower()
        is_male = gender_normalized in ["nam", "male", "m", "1"]

        # Sum the last two digits or all digits
        s = sum(int(d) for d in str(year))
        while s > 9:
            s = sum(int(d) for d in str(s))

        if year < 2000:
            if is_male:
                kua = 10 - s
            else:
                kua = s + 5
        else:
            if is_male:
                kua = 9 - s
            else:
                kua = s + 6

        while kua > 9:
            kua -= 9
        while kua <= 0:
            kua += 9

        # Handle Kua 5: Male -> 2 (Khon), Female -> 8 (Can)
        if kua == 5:
            kua = 2 if is_male else 8

        mapping = KUA_MAPPINGS.get(kua, KUA_MAPPINGS[1])

        return KuaResult(
            birth_year=year,
            gender="Nam" if is_male else "Nữ",
            kua_number=kua,
            menh_quai=mapping["menh_quai"],
            cung_phi=mapping["cung_phi"],
            dong_tay_trach=mapping["dong_tay_trach"],
            element=mapping["element"],
            favorable_directions=mapping["favorable"],
            unfavorable_directions=mapping["unfavorable"]
        )

    @staticmethod
    def get_compass_guides() -> List[Dict[str, Any]]:
        return SON_HUONG_24

    @staticmethod
    def evaluate_spouse_compatibility(male_year: int, female_year: int) -> Dict[str, Any]:
        kua_male = FengShuiService.calculate_kua(male_year, "Nam")
        kua_female = FengShuiService.calculate_kua(female_year, "Nữ")

        # Bat Trach compatibility table based on Kua pairing
        same_trach = (kua_male.dong_tay_trach == kua_female.dong_tay_trach)
        score = 85 if same_trach else 65

        pair_summary = "Cát lợi, vợ chồng đồng hướng trạch khí, dễ hòa thuận tích lũy tài sản." if same_trach else "Cần phối hướng bếp và hướng ban thờ để hóa giải xung khắc trạch khí."

        return {
            "male": kua_male.to_dict(),
            "female": kua_female.to_dict(),
            "same_trach": same_trach,
            "compatibility_score": score,
            "summary": pair_summary
        }


feng_shui_service = FengShuiService()
