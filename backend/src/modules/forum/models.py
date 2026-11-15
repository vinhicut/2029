# -*- coding: utf-8 -*-
"""
Models for Forum module.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


@dataclass
class ForumReply:
    topic_id: int
    author_name: str
    content: str
    author_id: Optional[int] = None
    id: Optional[int] = None
    created_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ForumTopic:
    category: str
    title: str
    author_name: str
    content: str
    author_id: Optional[int] = None
    chart_code: Optional[str] = None
    view_count: int = 0
    reply_count: int = 0
    replies: List[Dict[str, Any]] = field(default_factory=list)
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
