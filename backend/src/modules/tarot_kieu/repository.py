# -*- coding: utf-8 -*-
"""
Repository for Tarot Kiều module (Truyện Kiều Divination).
"""

from typing import List, Dict, Any, Optional
from .models import KieuVerse

KIEU_VERSES_DATA = [
    {
        "id": 1,
        "start_line_no": 1,
        "lines": [
            "Trăm năm trong cõi người ta,",
            "Chữ tài chữ mệnh khéo là ghét nhau.",
            "Trải qua một cuộc bể dâu,",
            "Những điều trông thấy mà đau đớn lòng."
        ],
        "context": "Mở đầu thi phẩm Truyện Kiều, đúc kết quy luật biến thiên của trời đất và định mệnh con người.",
        "interpretations": {
            "general": "Vận trình đang ở giai đoạn chuyển biến lớn, cần giữ tâm định tĩnh trước mọi biến động thời cuộc.",
            "love": "Tình duyên có thử thách sóng gió, cần sự kiên nhẫn và thấu hiểu thay vì vội vã phán xét.",
            "career": "Công việc gặp biến động, không nên nóng vội mở rộng, cần củng cố nền tảng nội lực vững chắc.",
            "family": "Gia đạo cần sự nhường nhịn, lắng nghe tâm tư của nhau để vượt qua khúc quanh.",
            "advice": "Hãy lấy đức hạnh và sự nhẫn nại làm gốc, bão giông rồi sẽ qua đi."
        }
    },
    {
        "id": 2,
        "start_line_no": 133,
        "lines": [
            "Người đâu gặp gỡ làm chi,",
            "Trăm năm biết có duyên gì hay không?",
            "Ngổn ngang trăm mối bên lòng,",
            "Nên câu tuyệt diệu ngụ trong tính tình."
        ],
        "context": "Khoảnh khắc Thúy Kiều tương ngộ Kim Trọng tại hội Đạp Thanh, khởi đầu mối tiền duyên tương tư.",
        "interpretations": {
            "general": "Điềm báo của sự gặp gỡ định mệnh, có cơ duyên bất ngờ mở ra trong cuộc sống.",
            "love": "Ý trung nhân xuất hiện hoặc mối quan hệ bước sang nấc thang mới đầy rung động và thấu cảm.",
            "career": "Gặp gỡ quý nhân hoặc đối tác tri kỷ cùng chung chí hướng, tạo tiền đề hợp tác lâu dài.",
            "family": "Có tin vui từ phương xa, gia đình đón nhận thêm niềm hoan hỷ gắn kết.",
            "advice": "Hãy mở lòng đón nhận nhân duyên, chân thành đối đãi sẽ gặt hái quả ngọt."
        }
    },
    {
        "id": 3,
        "start_line_no": 2737,
        "lines": [
            "Hoa trôi bèo dạt đã đành,",
            "Biết duyên sương gió có thành chăng ai?",
            "Rằng: Trong nét mặt nụ cười,",
            "Vẫn còn vương vấn một trời mộng xưa."
        ],
        "context": "Tâm trạng hoài niệm, chiêm nghiệm sau bao thăng trầm bể dâu để hướng về tương lai an định.",
        "interpretations": {
            "general": "Giai đoạn buông xả quá khứ, chữa lành tổn thương để tái sinh năng lượng tích cực.",
            "love": "Những khúc mắc cũ đang dần được tháo gỡ, cần bao dung để hàn gắn hoặc thanh thản buông tay.",
            "career": "Sau thời gian trì trệ, cơ hội mới đang manh nha xuất hiện, hãy chuẩn bị tâm thế vững vàng.",
            "family": "Gia đạo dần tìm lại sự bình yên sau những ngày lo toan vất vả.",
            "advice": "Không chấp niệm dĩ vãng, sống trọn vẹn trong phút giây hiện tại là con đường sáng nhất."
        }
    },
    {
        "id": 4,
        "start_line_no": 3241,
        "lines": [
            "Thiện căn ở tại lòng ta,",
            "Chữ tâm kia mới bằng ba chữ tài.",
            "Lời quê chắp nhặt dông dài,",
            "Mua vui cũng được một vài trống canh."
        ],
        "context": "Đoạn kết bất hủ của đại thi hào Nguyễn Du khẳng định sức mạnh cứu rỗi của Tâm thiện và Đức năng.",
        "interpretations": {
            "general": "Đại cát hanh thông. Mọi khó khăn đều được hóa giải nhờ phúc đức và thiện tâm.",
            "love": "Tình cảm chân thành vượt qua mọi rào cản, đôi bên hòa hợp gắn kết bền chặt.",
            "career": "Làm ăn chân chính, giữ chữ tín sẽ được trời giúp người thương, công danh viên mãn.",
            "family": "Phúc lộc tràn đầy, gia đạo an khang thịnh vượng, con cháu hiếu thảo.",
            "advice": "Tiếp tục tích đức hành thiện, chia sẻ phúc lành tới mọi người xung quanh."
        }
    }
]


class TarotKieuRepository:
    def __init__(self):
        self._verses = [KieuVerse(
            id=d["id"],
            lines=d["lines"],
            start_line_no=d["start_line_no"],
            context=d["context"],
            interpretations=d["interpretations"]
        ) for d in KIEU_VERSES_DATA]

    def get_all(self) -> List[KieuVerse]:
        return self._verses

    def get_by_id(self, verse_id: int) -> Optional[KieuVerse]:
        for v in self._verses:
            if v.id == verse_id:
                return v
        return None
