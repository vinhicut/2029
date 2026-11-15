# -*- coding: utf-8 -*-
"""
Service for Forum module.
"""

from typing import List, Optional, Dict, Any, Tuple
from .repository import ForumRepository, FORUM_CATEGORIES
from .models import ForumTopic, ForumReply


class ForumService:
    def __init__(self, repository: Optional[ForumRepository] = None):
        self.repository = repository or ForumRepository()

    def get_categories(self) -> List[Dict[str, Any]]:
        return FORUM_CATEGORIES

    def list_topics(self, category: Optional[str] = None, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        offset = max(0, (page - 1) * page_size)
        topics = self.repository.list_topics(category, limit=page_size, offset=offset)
        return {
            "topics": topics,
            "page": page,
            "page_size": page_size,
            "total": len(topics)
        }

    def get_topic_detail(self, topic_id: int) -> Optional[Dict[str, Any]]:
        return self.repository.get_topic(topic_id)

    def create_topic(self, data: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        title = str(data.get("title", "")).strip()
        content = str(data.get("content", "")).strip()

        if not title or len(title) < 5:
            return False, "Tiêu đề bài viết cần ít nhất 5 ký tự.", None
        if not content or len(content) < 10:
            return False, "Nội dung bài viết cần ít nhất 10 ký tự.", None

        topic_id = self.repository.create_topic(data)
        return True, "Tạo chủ đề thảo luận thành công.", topic_id

    def add_reply(self, topic_id: int, data: Dict[str, Any]) -> Tuple[bool, str, Optional[int]]:
        content = str(data.get("content", "")).strip()
        if not content:
            return False, "Nội dung phản hồi không được để trống.", None

        topic = self.repository.get_topic(topic_id)
        if not topic:
            return False, f"Không tìm thấy chủ đề thảo luận #{topic_id}.", None

        reply_id = self.repository.add_reply(topic_id, data)
        return True, "Gửi phản hồi thành công.", reply_id


forum_service = ForumService()
