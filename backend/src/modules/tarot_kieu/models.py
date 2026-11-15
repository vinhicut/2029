# -*- coding: utf-8 -*-
"""
Models for Tarot Kiều module.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


@dataclass
class KieuVerse:
    id: int
    lines: List[str]
    start_line_no: int
    context: str
    interpretations: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DivinationResult:
    topic: str
    inquiry: str
    verses: List[Dict[str, Any]]
    interpretation: str
    advice: str
    created_at: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
