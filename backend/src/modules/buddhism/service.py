# -*- coding: utf-8 -*-
"""
Service for Buddhism module.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from .repository import (
    get_all_sutras, find_sutra_by_id,
    get_all_quotes
)
from .models import Sutra, Quote


class BuddhismService:
    @staticmethod
    def get_daily_quote(date_str: Optional[str] = None) -> Dict[str, Any]:
        quotes = get_all_quotes()
        if not quotes:
            return {}

        if date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                target_date = datetime.utcnow()
        else:
            target_date = datetime.utcnow()

        day_of_year = target_date.timetuple().tm_yday
        index = (day_of_year - 1) % len(quotes)
        quote_obj = quotes[index]

        result = quote_obj.to_dict()
        result["date"] = target_date.strftime("%Y-%m-%d")
        result["day_of_year"] = day_of_year
        return result

    @staticmethod
    def get_sutras() -> List[Dict[str, Any]]:
        return [
            {
                "id": s.id,
                "title": s.title,
                "sanskrit_name": s.sanskrit_name,
                "description": s.description,
                "verses_count": s.verses_count
            }
            for s in get_all_sutras()
        ]

    @staticmethod
    def get_sutra_detail(sutra_id: str) -> Optional[Dict[str, Any]]:
        s = find_sutra_by_id(sutra_id)
        return s.to_dict() if s else None


buddhism_service = BuddhismService()
