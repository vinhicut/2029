# -*- coding: utf-8 -*-
"""
Models for Articles module.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class Article:
    slug: str
    title: str
    category: str
    author: str = "Tử Vi Việt Nam"
    date: Optional[str] = None
    excerpt: str = ""
    content_html: str = ""
    tags: List[str] = field(default_factory=list)
    cover_image: Optional[str] = None
    is_published: bool = True
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Article":
        tags = data.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        return cls(
            id=data.get("id"),
            slug=data.get("slug", ""),
            title=data.get("title", ""),
            category=data.get("category", "Tử Vi"),
            author=data.get("author", "Tử Vi Việt Nam"),
            date=data.get("date"),
            excerpt=data.get("excerpt", ""),
            content_html=data.get("content_html", "") or data.get("contentHtml", ""),
            tags=tags,
            cover_image=data.get("cover_image") or data.get("coverImage"),
            is_published=bool(data.get("is_published", True)),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )
