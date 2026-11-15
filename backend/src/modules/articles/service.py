# -*- coding: utf-8 -*-
"""
Service for Articles module.
"""

from typing import List, Optional, Dict, Any
from .repository import ArticleRepository
from .models import Article


class ArticleService:
    def __init__(self, repository: Optional[ArticleRepository] = None):
        self.repository = repository or ArticleRepository()

    def list_articles(self, category: Optional[str] = None, tag: Optional[str] = None, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        offset = max(0, (page - 1) * page_size)
        articles = self.repository.list_articles(category=category, tag=tag, limit=page_size, offset=offset)
        return {
            "articles": [a.to_dict() for a in articles],
            "page": page,
            "page_size": page_size,
            "total": len(articles)
        }

    def get_article(self, slug: str) -> Optional[Dict[str, Any]]:
        article = self.repository.get_by_slug(slug)
        return article.to_dict() if article else None


article_service = ArticleService()
