# -*- coding: utf-8 -*-
"""
Models for Lunar Calendar module.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


@dataclass
class DayInfo:
    solar_date: str  # YYYY-MM-DD
    lunar_date: str  # DD/MM/YYYY
    lunar_day: int
    lunar_month: int
    lunar_year: int
    is_leap_month: bool
    can_chi_year: str
    can_chi_month: str
    can_chi_day: str
    tiet_khi: str
    truc: str
    hoang_dao_hours: List[str] = field(default_factory=list)
    hac_dao_hours: List[str] = field(default_factory=list)
    favorable_actions: List[str] = field(default_factory=list)
    unfavorable_actions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
