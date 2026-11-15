# -*- coding: utf-8 -*-
"""
Models for Buddhism Module.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any


@dataclass
class Quote:
    id: int
    quote: str              # Buddha's verse / teaching
    author: str             # Buddha Shakyamuni, Bodhisattva, Patriarch
    source: str             # Canonical sutra / chapter
    reflection: str         # Mindful daily contemplation
    practice: str           # Daily practical action / mindfulness practice

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Sutra:
    id: str                 # "kinh-bat-nha", "chu-dai-bi", "kinh-pho-mon", "kinh-phap-cu"
    title: str              # Vietnamese title
    sanskrit_name: str      # Sanskrit name
    description: str        # Background and context
    full_text: str          # Chanting text (Hán Việt & phonetic text)
    meaning: str            # Core meaning & commentary
    verses_count: int       # Number of verses
    sections: List[Dict[str, str]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
