# -*- coding: utf-8 -*-
"""
Models for Feng Shui module.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


@dataclass
class KuaResult:
    birth_year: int
    gender: str
    kua_number: int
    menh_quai: str
    cung_phi: str
    dong_tay_trach: str  # "Đông Tứ Trạch" | "Tây Tứ Trạch"
    element: str  # Kim, Mộc, Thủy, Hỏa, Thổ
    favorable_directions: List[Dict[str, str]] = field(default_factory=list)
    unfavorable_directions: List[Dict[str, str]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CompassDirection:
    name: str
    son_huong: str
    degree_start: float
    degree_end: float
    element: str
    nature: str  # "Cát" | "Hung" | "Trung tính"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
