# -*- coding: utf-8 -*-
"""
Service for Tarot Kiều module.
"""

import random
from datetime import datetime
from typing import List, Optional, Dict, Any
from .repository import TarotKieuRepository
from .models import KieuVerse, DivinationResult


class TarotKieuService:
    def __init__(self, repository: Optional[TarotKieuRepository] = None):
        self.repository = repository or TarotKieuRepository()

    def draw(self, topic: str = "Tình Duyên", inquiry: str = "") -> DivinationResult:
        verses = self.repository.get_all()
        selected = random.choice(verses) if verses else None

        topic_key_map = {
            "tình duyên": "love",
            "công danh": "career",
            "gia đạo": "family",
            "vận hạn": "general"
        }
        tk = topic_key_map.get(topic.strip().lower(), "general")

        if selected:
            interp = selected.interpretations.get(tk, selected.interpretations.get("general", ""))
            adv = selected.interpretations.get("advice", "Giữ tâm thanh thản, vạn sự tùy duyên.")
            v_dicts = [selected.to_dict()]
        else:
            interp = "Vạn sự hanh thông, phúc đức vững bền."
            adv = "Tùy duyên bất biến."
            v_dicts = []

        return DivinationResult(
            topic=topic,
            inquiry=inquiry,
            verses=v_dicts,
            interpretation=interp,
            advice=adv,
            created_at=datetime.utcnow().isoformat()
        )

    def get_daily_verse(self, date_str: Optional[str] = None) -> Dict[str, Any]:
        verses = self.repository.get_all()
        if not verses:
            return {}

        if date_str:
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                dt = datetime.utcnow()
        else:
            dt = datetime.utcnow()

        idx = (dt.timetuple().tm_yday - 1) % len(verses)
        v = verses[idx]
        return {
            "date": dt.strftime("%Y-%m-%d"),
            "verse": v.to_dict(),
            "daily_reflection": v.interpretations.get("advice", "Tâm an vạn sự an.")
        }

    def list_all_verses(self) -> List[Dict[str, Any]]:
        return [v.to_dict() for v in self.repository.get_all()]


tarot_kieu_service = TarotKieuService()
