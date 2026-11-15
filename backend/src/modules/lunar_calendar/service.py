# -*- coding: utf-8 -*-
"""
Service for Lunar Calendar module.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from modules.astrology.engine.lunar_calendar import convert_solar_to_lunar, convert_lunar_to_solar, jdn
from .repository import CAN_LIST, CHI_LIST, TRUC_12, HOANG_DAO_MAP, TIET_KHI_LIST
from .models import DayInfo


class LunarCalendarService:
    @staticmethod
    def get_can_chi_year(lunar_year: int) -> str:
        can = CAN_LIST[(lunar_year + 6) % 10]
        chi = CHI_LIST[(lunar_year + 8) % 12]
        return f"{can} {chi}"

    @staticmethod
    def get_can_chi_day(solar_day: int, solar_month: int, solar_year: int) -> str:
        jd = jdn(solar_day, solar_month, solar_year)
        can = CAN_LIST[(jd + 9) % 10]
        chi = CHI_LIST[(jd + 1) % 12]
        return f"{can} {chi}"

    @staticmethod
    def get_day_info(date_str: Optional[str] = None) -> DayInfo:
        if date_str:
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                dt = datetime.now()
        else:
            dt = datetime.now()

        s_day, s_month, s_year = dt.day, dt.month, dt.year
        lunar = convert_solar_to_lunar(s_day, s_month, s_year, timezone=7.0)
        l_day, l_month, l_year, is_leap = lunar[0], lunar[1], lunar[2], bool(lunar[3])

        can_chi_y = LunarCalendarService.get_can_chi_year(l_year)
        can_chi_d = LunarCalendarService.get_can_chi_day(s_day, s_month, s_year)
        chi_d = can_chi_d.split()[-1]

        # Can Chi Tháng
        can_nam_idx = (l_year + 6) % 10
        can_thang_idx = (can_nam_idx * 2 + l_month) % 10
        chi_thang_idx = (l_month + 1) % 12
        can_chi_m = f"{CAN_LIST[can_thang_idx]} {CHI_LIST[chi_thang_idx]}"

        # Trực & Tiết Khí
        jd = jdn(s_day, s_month, s_year)
        truc_val = TRUC_12[(jd) % 12]
        tiet_khi_val = TIET_KHI_LIST[(s_month * 2 - 2) % len(TIET_KHI_LIST)]

        hoang_dao = HOANG_DAO_MAP.get(chi_d, ["Tý (23-1)", "Mão (5-7)", "Ngọ (11-13)", "Dậu (17-19)"])
        all_hours = ["Tý (23-1)", "Sửu (1-3)", "Dần (3-5)", "Mão (5-7)", "Thìn (7-9)", "Tỵ (9-11)",
                     "Ngọ (11-13)", "Mùi (13-15)", "Thân (15-17)", "Dậu (17-19)", "Tuất (19-21)", "Hợi (21-23)"]
        hac_dao = [h for h in all_hours if h not in hoang_dao]

        favorable = ["Cầu tài lộc", "Xuất hành", "Khai trương", "Cúng tế", "Giao dịch"]
        unfavorable = ["Khởi công động thổ", "Tranh chấp", "Kiện tụng"]

        return DayInfo(
            solar_date=dt.strftime("%Y-%m-%d"),
            lunar_date=f"{l_day:02d}/{l_month:02d}/{l_year}",
            lunar_day=l_day,
            lunar_month=l_month,
            lunar_year=l_year,
            is_leap_month=is_leap,
            can_chi_year=can_chi_y,
            can_chi_month=can_chi_m,
            can_chi_day=can_chi_d,
            tiet_khi=tiet_khi_val,
            truc=truc_val,
            hoang_dao_hours=hoang_dao,
            hac_dao_hours=hac_dao,
            favorable_actions=favorable,
            unfavorable_actions=unfavorable
        )

    @staticmethod
    def get_month_grid(year: int, month: int) -> List[Dict[str, Any]]:
        days_in_month = []
        import calendar
        _, num_days = calendar.monthrange(year, month)
        for d in range(1, num_days + 1):
            lunar = convert_solar_to_lunar(d, month, year, timezone=7.0)
            can_chi_d = LunarCalendarService.get_can_chi_day(d, month, year)
            days_in_month.append({
                "solar_day": d,
                "solar_date": f"{year}-{month:02d}-{d:02d}",
                "lunar_day": lunar[0],
                "lunar_month": lunar[1],
                "lunar_year": lunar[2],
                "is_leap": bool(lunar[3]),
                "can_chi_day": can_chi_d
            })
        return days_in_month

    @staticmethod
    def convert_date(direction: str, day: int, month: int, year: int, is_leap: bool = False) -> Dict[str, Any]:
        if direction == "solar_to_lunar":
            lunar = convert_solar_to_lunar(day, month, year, timezone=7.0)
            return {
                "input": {"solar_day": day, "solar_month": month, "solar_year": year},
                "output": {
                    "lunar_day": lunar[0],
                    "lunar_month": lunar[1],
                    "lunar_year": lunar[2],
                    "is_leap": bool(lunar[3]),
                    "can_chi_year": LunarCalendarService.get_can_chi_year(lunar[2])
                }
            }
        else:
            solar = convert_lunar_to_solar(day, month, year, 1 if is_leap else 0, timezone=7.0)
            return {
                "input": {"lunar_day": day, "lunar_month": month, "lunar_year": year, "is_leap": is_leap},
                "output": {
                    "solar_day": solar[0],
                    "solar_month": solar[1],
                    "solar_year": solar[2]
                }
            }


lunar_calendar_service = LunarCalendarService()
