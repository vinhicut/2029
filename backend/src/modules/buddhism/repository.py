# -*- coding: utf-8 -*-
"""
Repository containing authentic Vietnamese Buddhist Sutras and Daily Wisdom.
"""

from typing import List, Optional
from .models import Sutra, Quote

# ==============================================================================
# 1. BỐN ĐẠI BẢN KINH CỐT TỦY (SUTRAS)
# ==============================================================================

SUTRAS_DATA: List[Sutra] = [
    Sutra(
        id="kinh-bat-nha",
        title="Bát Nhã Ba La Mật Đa Tâm Kinh",
        sanskrit_name="Prajñāpāramitā Hṛdaya Sūtra",
        description="Bản kinh cốt tủy của Phật giáo Đại Thừa, đúc kết tuệ giác thâm sâu về tính Không (Śūnyatā), giúp phá vỡ vô minh, vượt qua mọi khổ ách trần gian.",
        verses_count=260,
        meaning=(
            "Kinh Bát Nhã chỉ rõ rằng vạn pháp do duyên sinh nên tự tính là Không. "
            "'Sắc bất dị Không, Không bất dị Sắc' – hình tướng vật chất và bản thể chân không chẳng hề tách rời. "
            "Khi hành giả thấu suốt tính Không, tâm sẽ dứt sạch sợ hãi, điên đảo mộng tưởng, đạt tới cảnh giới Niết Bàn cứu cánh."
        ),
        full_text=(
            "QUÁN TỰ TẠI BỒ TÁT\n"
            "Hành thâm Bát Nhã Ba La Mật Đa thời,\n"
            "Chiếu kiến ngũ uẩn giai không,\n"
            "Độ nhất thiết khổ ách.\n\n"
            "Xá Lợi Tử! Sắc bất dị không, không bất dị sắc;\n"
            "Sắc tức thị không, không tức thị sắc.\n"
            "Thọ, tưởng, hành, thức, diệc phục như thị.\n\n"
            "Xá Lợi Tử! Thị chư pháp không tướng:\n"
            "Bất sanh, bất diệt, bất cấu, bất tịnh, bất tăng, bất giảm.\n"
            "Thị cố không trung vô sắc, vô thọ, tưởng, hành, thức;\n"
            "Vô nhãn, nhĩ, tỷ, thiệt, thân, ý;\n"
            "Vô sắc, thanh, hương, vị, xúc, pháp;\n"
            "Vô nhãn giới nãi chí vô ý thức giới;\n"
            "Vô vô minh, diệc vô vô minh tận,\n"
            "Nãi chí vô lão tử, diệc vô lão tử tận;\n"
            "Vô khổ, tập, diệt, đạo;\n"
            "Vô trí diệc vô đắc.\n\n"
            "Dĩ vô sở đắc cố, Bồ Đề Tát Đỏa y Bát Nhã Ba La Mật Đa cố,\n"
            "Tâm vô quái ngại; vô quái ngại cố, vô hữu khủng bố,\n"
            "Viễn ly điên đảo mộng tưởng, cứu cánh Niết Bàn.\n\n"
            "Tam thế chư Phật y Bát Nhã Ba La Mật Đa cố,\n"
            "Đắc A Nậu Đa La Tam Miệu Tam Bồ Đề.\n\n"
            "Cố tri Bát Nhã Ba La Mật Đa, thị đại thần chú, thị đại minh chú,\n"
            "Thị vô thượng chú, thị vô đẳng đẳng chú,\n"
            "Năng trừ nhất thiết khổ, chân thật bất hư.\n\n"
            "Cố thuyết Bát Nhã Ba La Mật Đa chú, tức thuyết chú viết:\n"
            "Yết đế, yết đế, Ba la yết đế, Ba la tăng yết đế, Bồ đề tát bà ha."
        ),
        sections=[
            {"title": "Khai Thị Ngũ Uẩn Giai Không", "text": "Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời, chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách."},
            {"title": "Thực Tướng Của Vạn Pháp", "text": "Xá Lợi Tử! Sắc bất dị không, không bất dị sắc; sắc tức thị không, không tức thị sắc. Thọ, tưởng, hành, thức, diệc phục như thị."},
            {"title": "Dứt Sạch Điên Đảo Mộng Tưởng", "text": "Tâm vô quái ngại; vô quái ngại cố, vô hữu khủng bố, viễn ly điên đảo mộng tưởng, cứu cánh Niết Bàn."},
            {"title": "Đại Minh Chân Ngôn", "text": "Yết đế, yết đế, Ba la yết đế, Ba la tăng yết đế, Bồ đề tát bà ha."}
        ]
    ),
    Sutra(
        id="chu-dai-bi",
        title="Đại Bi Tâm Đà Ra Ni (Chú Đại Bi)",
        sanskrit_name="Nīlakaṇṭha Dhāraṇī",
        description="Mật chú gồm 84 câu linh ứng kết tinh từ đại bi tâm của Đức Quán Thế Âm Bồ Tát, có công năng tiêu trừ nghiệp chướng, giải trừ hiểm nạn, ban vui cứu khổ cho muôn loài.",
        verses_count=84,
        meaning=(
            "Chú Đại Bi là hiện thân của tình thương vô lượng. Người thành tâm thấu hiểu và trì tụng Chú Đại Bi sẽ được mười phương chư Phật hộ niệm, "
            "tâm Bồ Đề tăng trưởng, tiêu trừ các ác nghiệp tiền khiên và được hưởng an vui cát tường."
        ),
        full_text=(
            "Nam mô Hắc Ra Đát Na Đa Ra Dạ Da.\n"
            "Nam mô A Rị Da, Bà Lô Kiết Đế Thước Bát Ra Da,\n"
            "Bồ Đề Tát Đỏa Bà Da, Ma Ha Tát Đỏa Bà Da,\n"
            "Ma Ha Ca Lô Ni Ca Da.\n"
            "Án, Tát Bàn Ra Phạt Duệ, Số Đát Na Đát Tỏa.\n"
            "Nam mô Tất Kiết Lật Đỏa Y Mông A Rị Da,\n"
            "Bà Lô Kiết Đế Thất Phật Ra Lăng Đà Bà.\n"
            "Nam mô Na Ra Cẩn Trì, Hê Rị Ma Ha Bàn Đà Sa Mế,\n"
            "Tát Bà A Tha Đậu Du Bằng, A Thệ Dựng,\n"
            "Tát Bà Tát Đa, Na Ma Bà Tát Đa, Na Ma Bà Già,\n"
            "Ma Phạt Đạt Đậu, Đát Điệt Tha.\n"
            "Án, A Bà Lô Hê, Lô Ca Đế, Ca Ra Đế, Di Hê Rị,\n"
            "Ma Ha Bồ Đề Tát Đỏa, Tát Bà Tát Bà,\n"
            "Ma Ra Ma Ra, Ma Hê Ma Hê Rị Đà Dựng,\n"
            "Cu Lô Cu Lô Kiết Mông, Độ Lô Độ Lô Phạt Xà Da Đế,\n"
            "Ma Ha Phạt Xà Da Đế, Đà Ra Đà Ra,\n"
            "Địa Rị Ni, Thất Phật Ra Da, Giá Ra Giá Ra,\n"
            "Mạ Mạ Phạt Ma Ra, Mục Đế Lệ, Y Hê Y Hê,\n"
            "Thất Na Thất Na, A Ra Sâm Phật Ra Xá Lợi,\n"
            "Phạt Sa Phạt Sâm, Phật Ra Xá Da,\n"
            "Hô Lô Hô Lô Ma Ra, Hô Lô Hô Lô Hê Rị,\n"
            "Ta Ra Ta Ra, Tất Rị Tất Rị, Tô Rô Tô Rô,\n"
            "Bồ Đề Dạ Bồ Đề Dạ, Bồ Đà Dạ Bồ Đà Dạ,\n"
            "Di Đế Rị Dạ, Na Ra Cẩn Trì, Địa Rị Sắc Ni Na,\n"
            "Ba Dạ Ma Na, Ta Bà Ha.\n"
            "Tất Đà Dạ, Ta Bà Ha.\n"
            "Ma Ha Tất Đà Dạ, Ta Bà Ha.\n"
            "Tất Đà Dũ Nghệ, Thất Bàn Ra Dạ, Ta Bà Ha.\n"
            "Na Ra Cẩn Trì, Ta Bà Ha.\n"
            "Ma Ra Na Ra, Ta Bà Ha.\n"
            "Tất Ra Tăng A Mục Khê Da, Ta Bà Ha.\n"
            "Ta Bà Ma Ha A Tất Đà Dạ, Ta Bà Ha.\n"
            "Giả Kiết Ra A Tất Đà Dạ, Ta Bà Ha.\n"
            "Ba Đà Ma Kiết Tất Đà Dạ, Ta Bà Ha.\n"
            "Na Ra Cẩn Trì Bàn Đà Ra Dạ, Ta Bà Ha.\n"
            "Ma Bà Lợi Thắng Kiết Ra Dạ, Ta Bà Ha.\n"
            "Nam mô Hắc Ra Đát Na Đa Ra Dạ Da.\n"
            "Nam mô A Rị Da, Bà Lô Kiết Đế, Thước Bàn Ra Dạ, Ta Bà Ha.\n"
            "Án, Tất Điện Đô, Mạn Đà Ra, Bạt Đà Dạ, Ta Bà Ha."
        ),
        sections=[
            {"title": "Đoạn 1: Quy Mạng Tam Bảo & Bồ Tát Quán Âm", "text": "Nam mô Hắc Ra Đát Na Đa Ra Dạ Da. Nam mô A Rị Da, Bà Lô Kiết Đế Thước Bát Ra Da, Bồ Đề Tát Đỏa Bà Da..."},
            {"title": "Đoạn 2: Tán Thán Tâm Từ Bi Cứu Khổ", "text": "Án, A Bà Lô Hê, Lô Ca Đế, Ca Ra Đế, Di Hê Rị, Ma Ha Bồ Đề Tát Đỏa, Tát Bà Tát Bà..."},
            {"title": "Đoạn 3: Các Biến Chân Ngôn Thành Tựu Viên Mãn", "text": "Tất Đà Dạ, Ta Bà Ha. Ma Ha Tất Đà Dạ, Ta Bà Ha. Tất Đà Dũ Nghệ, Thất Bàn Ra Dạ, Ta Bà Ha..."},
            {"title": "Đoạn 4: Hồi Hướng Cát Tường", "text": "Nam mô Hắc Ra Đát Na Đa Ra Dạ Da. Nam mô A Rị Da, Bà Lô Kiết Đế, Thước Bàn Ra Dạ, Ta Bà Ha. Án, Tất Điện Đô, Mạn Đà Ra, Bạt Đà Dạ, Ta Bà Ha."}
        ]
    ),
    Sutra(
        id="kinh-pho-mon",
        title="Kinh Phổ Môn (Phẩm Bồ Tát Quán Thế Âm)",
        sanskrit_name="Saddharmapuṇḍarīka Sūtra - Samantamukha Parivarta",
        description="Trích từ Diệu Pháp Liên Hoa Kinh, mô tả 32 ứng hóa thân cùng hạnh nguyện tầm thanh cứu khổ không cùng tận của Đức Bồ Tát Quán Thế Âm.",
        verses_count=120,
        meaning=(
            "Kinh Phổ Môn dạy về đức tin và lòng từ bi. Khi chúng sinh gặp nguy nan, chìm trong biển khổ lửa dữ hay tâm ma khuấy động, "
            "nếu nhất tâm xưng niệm danh hiệu Quán Thế Âm Bồ Tát liền được cứu thoát an lành."
        ),
        full_text=(
            "Lúc bấy giờ, ngài Vô Tận Ý Bồ Tát liền từ chỗ ngồi đứng dậy, trệch áo vai hữu, chắp tay hướng về phía Phật mà bạch rằng:\n"
            "'Thế Tôn! Bồ Tát Quán Thế Âm do nhân duyên gì mà tên là Quán Thế Âm?'\n\n"
            "Phật bảo ngài Vô Tận Ý Bồ Tát: 'Thiện nam tử! Nếu có vô lượng trăm nghìn muôn ức chúng sinh chịu các khổ não, "
            "nghe danh hiệu Bồ Tát Quán Thế Âm này, một lòng xưng danh, Bồ Tát liền quán sát âm thanh ấy khiến cho tất cả đều được giải thoát.'\n\n"
            "Nếu có người trì danh hiệu Bồ Tát Quán Thế Âm, dẫu vào trong lửa lớn, lửa chẳng đốt được, nhờ sức uy thần của Bồ Tát.\n"
            "Nếu bị nước lớn cuốn trôi, xưng danh hiệu ngài liền được chỗ cạn.\n"
            "Nếu có người vì cầu trân bảo mà vào biển lớn, gặp cuồng phong thổi dạt vào nước quỷ La Sát, trong đó nếu có một người xưng danh hiệu Bồ Tát Quán Thế Âm, thảy đều thoát khỏi nạn La Sát.\n\n"
            "Vô Tận Ý! Quán Thế Âm Bồ Tát có sức uy thần rộng lớn như thế, làm lợi ích lớn cho muôn loài!"
        ),
        sections=[
            {"title": "Hỏi Về Nhân Duyên Danh Hiệu Quán Thế Âm", "text": "Ngài Vô Tận Ý Bồ Tát bạch Phật: 'Thế Tôn! Bồ Tát Quán Thế Âm do nhân duyên gì mà tên là Quán Thế Âm?'"},
            {"title": "Tầm Thanh Cứu Bảy Mối Nguy Nan", "text": "Lửa lớn không cháy, nước cuốn được cạn, gió dữ tai nạn đều được tiêu trừ khi xưng danh hiệu ngài."},
            {"title": "32 Ứng Hóa Thân Tùy Duyên Độ Hóa", "text": "Cần hiện thân Phật liền hiện thân Phật, cần hiện thân Bồ Tát, Phạm Vương, Cư Sĩ... liền tùy cơ thuyết pháp."}
        ]
    ),
    Sutra(
        id="kinh-phap-cu",
        title="Kinh Pháp Cú (Dhammapada)",
        sanskrit_name="Dhammapada",
        description="Bộ kinh thi vị và gần gũi nhất trong Đại Tạng Pali, chứa đựng 423 lời dạy bất hủ của Đức Phật về điều phục tâm ý, nghiệp báo và con đường giải thoát an lạc.",
        verses_count=423,
        meaning=(
            "Kinh Pháp Cú là kim chỉ nam soi rọi từng hành vi thường nhật: 'Ý dẫn đầu các pháp'. "
            "Chiến thắng vạn quân không bằng tự chiến thắng chính mình; gieo nhân thiện gặt quả lành, tâm an thì vạn sự an định."
        ),
        full_text=(
            "Phẩm Song Yếu (Kệ 1 & 2):\n"
            "1. Ý dẫn đầu các pháp,\n"
            "Ý làm chủ, ý tạo.\n"
            "Nếu với ý ô nhiễm,\n"
            "Nói lên hay hành động,\n"
            "Khổ não bước theo sau,\n"
            "Như xe chân vật kéo.\n\n"
            "2. Ý dẫn đầu các pháp,\n"
            "Ý làm chủ, ý tạo.\n"
            "Nếu với ý thanh tịnh,\n"
            "Nói lên hay hành động,\n"
            "An lạc bước theo sau,\n"
            "Như bóng không rời hình.\n\n"
            "Phẩm Không Phóng Dật (Kệ 21):\n"
            "Không phóng dật: đường sống;\n"
            "Phóng dật: đường đưa chết.\n"
            "Người không phóng dật: sống mãi;\n"
            "Kẻ phóng dật: như chết rồi.\n\n"
            "Phẩm Tâm (Kệ 35):\n"
            "Tâm khó thấy, tế nhị,\n"
            "Theo các dục quay cuồng.\n"
            "Người trí phòng hộ tâm,\n"
            "Tâm hộ, đưa an lạc."
        ),
        sections=[
            {"title": "Phẩm Song Yếu – Nhân Quả Của Tâm", "text": "Ý dẫn đầu các pháp. Tâm ô nhiễm chuốc khổ đau; tâm thanh tịnh gặt hái an lạc vĩnh hằng."},
            {"title": "Phẩm Không Phóng Dật – Tinh Tấn Giải Thoát", "text": "Không phóng dật là con đường bất tử; buông lung lười biếng dẫn tới suy bại trầm luân."},
            {"title": "Phẩm Tâm – Điều Phục Vọng Niệm", "text": "Tâm như vượn chuyền cành, người trí biết phòng hộ và rèn luyện tâm để đạt định tĩnh."}
        ]
    )
]

# ==============================================================================
# 2. LỜI VÀNG ĐỨC PHẬT HẰNG NGÀY (DAILY QUOTES - 31 CÂU)
# ==============================================================================

DAILY_QUOTES: List[Quote] = [
    Quote(
        id=1,
        quote="Ý dẫn đầu các pháp, ý làm chủ, ý tạo. Nếu với ý thanh tịnh, nói lên hay hành động, an lạc bước theo sau, như bóng không rời hình.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Phẩm Song Yếu (Kệ 2)",
        reflection="Mỗi suy nghĩ khởi lên trong tâm là một hạt giống đang được gieo mầm. Hãy quan sát ý nghĩ trước khi chúng biến thành lời nói hay hành động.",
        practice="Hôm nay, trước khi nói bất kỳ điều gì khi cảm xúc dâng trào, hãy dừng lại hít thở sâu 3 hơi để soi chiếu xem ý niệm ấy xuất phát từ từ bi hay sân giận."
    ),
    Quote(
        id=2,
        quote="Hận thù diệt hận thù, đời này không thể có. Từ bi diệt hận thù, là định luật ngàn thu.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 5",
        reflection="Lấy bạo lực đáp lại bạo lực chỉ nối dài chuỗi ân oán trùng trùng. Chỉ có tình thương và sự tha thứ mới hàn gắn được vết thương.",
        practice="Hôm nay, hãy thầm gửi một lời chúc bình an đến một người mà bạn từng cảm thấy khó tha thứ."
    ),
    Quote(
        id=3,
        quote="Chiến thắng vạn quân giặc trên chiến trường không bằng tự chiến thắng chính mình. Chiến thắng chính mình là chiến công oanh liệt nhất.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 103",
        reflection="Kẻ thù nguy hiểm nhất không ở bên ngoài, mà chính là những thói quen xấu, lòng tham lam và sự lười biếng bên trong ta.",
        practice="Nhận diện một thói quen chưa tốt của bản thân hôm nay và kiên quyết nói 'Không' với nó ít nhất một lần."
    ),
    Quote(
        id=4,
        quote="Quá khứ không truy tìm, tương lai không ước vọng. Quá khứ đã đoạn tận, tương lai lại chưa đến. Chỉ có pháp hiện tại, tuệ quán chính là đây.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Nhất Dạ Hiền Giả (Bhaddekaratta Sutta)",
        reflection="Đắm chìm trong tiếc nuối quá khứ hay lo âu viển vông về tương lai chỉ làm tiêu hao sinh lực. Sự sống đích thực chỉ hiện hữu trong giây phút hiện tại.",
        practice="Khi ăn cơm hay đi dạo hôm nay, hãy buông điện thoại xuống và cảm nhận trọn vẹn hương vị thức ăn cùng từng bước chân chạm đất."
    ),
    Quote(
        id=5,
        quote="Không có con đường dẫn tới hòa bình, hòa bình chính là con đường.",
        author="Thiền Sư Thích Nhất Hạnh",
        source="Tập văn Giảng Luận",
        reflection="Bình an nội tâm không phải là cái đích xa xôi sau khi giải quyết hết mọi rắc rối, mà là thái độ tĩnh lặng ta mang theo trong từng công việc mỗi ngày.",
        practice="Dành ra 5 phút giữa giờ làm việc để tĩnh tọa, mỉm cười và thả lỏng toàn bộ cơ thể."
    ),
    Quote(
        id=6,
        quote="Chớ khinh điều ác nhỏ, cho rằng không tai họa. Từng giọt nước nhỏ rơi, dần tràn đầy chum lớn.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 121",
        reflection="Một lời nói mỉa mai, một hành vi gian lận nhỏ tích tụ lâu ngày sẽ biến thành chướng ngại lớn lao trong vận số.",
        practice="Cẩn trọng trong từng hành vi nhỏ: không vứt rác bừa bãi, không nói lời cộc cằn với người thân cận."
    ),
    Quote(
        id=7,
        quote="Hãy chớ khinh việc thiện, cho rằng chẳng có phúc. Từng giọt nước nhỏ rơi, dần tràn đầy chum lớn. Người trí tích thiện dần, tràn đầy phúc an vui.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 122",
        reflection="Mỗi nụ cười chân thành, mỗi cử chỉ giúp đỡ tận tâm dù bé nhỏ đều là từng đồng vốn quý báu gửi vào ngân hàng phúc đức vũ trụ.",
        practice="Thực hiện ít nhất một việc tốt vô điều kiện trong ngày hôm nay mà không mong cầu ai khen ngợi."
    ),
    Quote(
        id=8,
        quote="Hạnh phúc không có sẵn. Nó đến từ chính những hành động của bạn.",
        author="Đức Đạt Lai Lạt Ma thứ 14",
        source="Nghệ Thuật Sống Hạnh Phúc",
        reflection="Đừng chờ đợi hoàn cảnh hoàn hảo mới cảm thấy hạnh phúc. Hạnh phúc nảy mầm từ lòng biết ơn và sự sẻ chia chân thành.",
        practice="Viết ra giấy hoặc ghi nhớ trong tâm trí 3 điều bạn cảm thấy biết ơn sâu sắc trong ngày hôm nay."
    ),
    Quote(
        id=9,
        quote="Này các Tỳ-kheo, hãy tự mình thắp đuốc lên mà đi. Hãy lấy Chánh pháp làm ngọn đuốc, lấy Chánh pháp làm chỗ nương tựa.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Đại Bát Niết Bàn (Mahaparinibbana Sutta)",
        reflection="Không ai có thể tu thay hay sống thay cuộc đời của bạn. Trí tuệ chân thật đến từ sự tự thân chứng nghiệm và thực hành đạo lý.",
        practice="Chủ động chịu trách nhiệm 100% cho mọi kết quả trong cuộc sống của mình, không than vãn đổ lỗi cho số mệnh."
    ),
    Quote(
        id=10,
        quote="Tất cả các pháp hữu vi đều là vô thường. Khi nhận thức rõ điều này với tuệ giác, người ấy sẽ viễn ly khổ đau.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 277",
        reflection="Hiểu về sự vô thường giúp ta không bám chấp vào thành bại, xem thăng trầm thế gian như mây trôi qua đỉnh núi.",
        practice="Nhìn vào một sự việc không như ý vừa xảy ra và thầm nhủ: 'Điều này rồi cũng sẽ qua đi'."
    ),
    Quote(
        id=11,
        quote="Lòng từ bi không chỉ là cảm xúc thương hại, mà là ý chí hành động kiên quyết để xoa dịu nỗi đau của muôn loài.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Từ Bi (Karaniya Metta Sutta)",
        reflection="Tình thương chân thật phải đi liền với sự bao dung và hành động cụ thể, đem lại niềm vui và sự an ủi cho tha nhân.",
        practice="Lắng nghe một người đang có tâm sự buồn phiền một cách trọn vẹn mà không ngắt lời hay phán xét."
    ),
    Quote(
        id=12,
        quote="Người nói nhiều chưa hẳn đã là trí. Người an tĩnh, không sợ hãi, không oán thù, ấy mới là bậc trí.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 258",
        reflection="Sự thông thái thể hiện qua nội tâm lắng đọng và cách đối nhân xử thế khoan dung, không nằm ở tài ăn nói ba hoa.",
        practice="Hôm nay hãy thực tập im lặng nhiều hơn, lắng nghe sâu sắc hơn trước khi đưa ra ý kiến cá nhân."
    ),
    Quote(
        id=13,
        quote="Như hoa tươi đẹp sắc, nhưng lại không có hương; lời nói khéo không làm, chẳng mang lại kết quả.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 51",
        reflection="Triết lý hay chỉ thực sự tỏa sáng khi biến thành hành động tử tế thực tế trong đời sống hàng ngày.",
        practice="Biến một lời hứa hoặc kế hoạch tốt đẹp mà bạn đã trì hoãn lâu nay thành hành động ngay trong hôm nay."
    ),
    Quote(
        id=14,
        quote="Tâm an thì cảnh nào cũng an. Tâm loạn thì dẫu ở cung vàng điện ngọc cũng ngập tràn khổ não.",
        author="Thiền Tông Cổ Đức",
        source="Thiền Môn Khai Thị",
        reflection="Cảnh giới bên ngoài là tấm gương phản chiếu tâm thức bên trong. Chỉnh sửa tâm mình dễ hơn thay đổi cả thế giới.",
        practice="Mỗi khi cảm thấy bực dọc với ngoại cảnh, hãy quay về quan sát tâm mình trước tiên."
    ),
    Quote(
        id=15,
        quote="Sức khỏe là món quà lớn nhất, sự thỏa mãn là của cải lớn nhất, lòng trung thành là mối quan hệ tốt nhất.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 204",
        reflection="Biết đủ (tri túc) là suối nguồn của sự giàu có đích thực. Người biết đủ dù nằm trên đất cát vẫn thấy an lạc thảnh thơi.",
        practice="Hài lòng với những gì mình đang có hôm nay và tạm gác lại những ham muốn mua sắm chưa thực sự cần thiết."
    ),
    Quote(
        id=16,
        quote="Không có ngọn lửa nào thiêu đốt dữ dội bằng ngọn lửa tham ái. Không có chiếc lưới nào bủa vây chặt chẽ bằng sự vô minh.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 251",
        reflection="Tham lam khiến con người mù quáng, lao vào cạm bẫy danh lợi để rồi chuốc lấy thống khổ khôn cùng.",
        practice="Tập buông bớt một chấp niệm về danh vọng hay sự hơn thua với đồng nghiệp trong công việc."
    ),
    Quote(
        id=17,
        quote="Người gieo nhân thiện như người trồng hoa thơm, ong bướm tự tìm đến, hương thơm bay ngược chiều gió.",
        author="Kinh Tăng Chi Bộ",
        source="Anguttara Nikaya",
        reflection="Phúc đức của người sống thiện lương có sức lan tỏa diệu kỳ, làm ấm áp lòng người và thu hút quý nhân phù trợ.",
        practice="Nói một lời khen ngợi chân thành hoặc động viên tinh thần một ai đó xung quanh bạn."
    ),
    Quote(
        id=18,
        quote="Khi bạn nhận ra vạn vật đều thay đổi, bạn sẽ không còn cố bám víu vào bất cứ điều gì nữa.",
        author="Lão Tử & Phật Triết",
        source="Đạo Đức & Pháp Hoa Cảnh Giới",
        reflection="Buông bỏ không phải là từ bỏ tất cả, mà là không để tâm bị lệ thuộc hay đau khổ bởi sự đổi thay của thế sự.",
        practice="Thả lỏng đôi bàn tay, hít thở và mở lòng chấp nhận một sự thay đổi ngoài dự kiến trong ngày hôm nay."
    ),
    Quote(
        id=19,
        quote="Một ngọn nến có thể thắp sáng hàng ngàn ngọn nến khác mà không bị tàn lụi. Hạnh phúc không bao giờ vơi đi khi được san sẻ.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh 42 Chương",
        reflection="Chia sẻ tri thức, tình thương và vật chất không làm ta nghèo đi mà làm giàu thêm tâm hồn cao quý.",
        practice="Chia sẻ một phần bữa ăn, một cuốn sách hay hoặc một nụ cười ấm áp tới người bên cạnh."
    ),
    Quote(
        id=20,
        quote="Nhẫn nhục là giáp trụ kiên cố nhất. Người có đức nhẫn có thể vượt qua mọi hiểm nguy và cảm hóa được lòng người.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Di Giáo",
        reflection="Chữ Nhẫn không phải là nhu nhược hèn kém, mà là đỉnh cao của bản lĩnh và định lực nội tâm phi thường.",
        practice="Khi gặp điều trái ý hôm nay, hãy mỉm cười nhẫn nại thêm 10 giây trước khi đưa ra phản ứng."
    ),
    Quote(
        id=21,
        quote="Bằng sự nỗ lực, chánh niệm, tự chế và phòng hộ, người trí tự xây cho mình một hòn đảo mà nước lũ không thể dâng ngập.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 25",
        reflection="Xây dựng nội tâm vững chãi bằng giới hạnh và thiền tập là cách bảo vệ bản thân an toàn nhất trước sóng gió cuộc đời.",
        practice="Dành 15 phút buổi tối đọc kinh sách hoặc nghe một bài giảng pháp thoại nuôi dưỡng tâm hồn."
    ),
    Quote(
        id=22,
        quote="Ánh sáng mặt trời, mặt trăng và sự thật là ba thứ không bao giờ có thể bị che giấu lâu dài.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Bách Dụ",
        reflection="Sự thật và nhân quả luôn vận hành công minh. Sống chân thật ngay thẳng thì lòng không hổ thẹn với trời đất.",
        practice="Giữ trọn sự trung thực trong mọi giao dịch và lời nói hôm nay, dẫu trong việc nhỏ nhất."
    ),
    Quote(
        id=23,
        quote="Người nâng đỡ kẻ khác chính là người đang nâng đỡ chính bản thân mình trên nấc thang tiến hóa tâm linh.",
        author="Bồ Tát Long Thọ",
        source="Bảo Hành Vương Chánh Luận",
        reflection="Chúng sinh và vạn vật vốn đồng một thể tánh. Lợi tha chính là tự lợi chân chính và lâu bền nhất.",
        practice="Chủ động hỗ trợ một người đang gặp khó khăn trong công việc mà không đợi họ phải lên tiếng nhờ vả."
    ),
    Quote(
        id=24,
        quote="Giống như một tảng đá kiên cố không bao giờ bị rung chuyển bởi gió bão, người trí cũng không hề dao động trước lời khen chê.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Pháp Cú - Kệ số 81",
        reflection="Thế gian luôn đầy rẫy khen chê thị phi. Giữ vững la bàn đạo đức nội tâm giúp ta không bị cuốn theo miệng lưỡi trần gian.",
        practice="Đón nhận lời khen với tâm khiêm tốn và đón nhận lời chê với tâm cầu tiến, không hờn dỗi tức tối."
    ),
    Quote(
        id=25,
        quote="Phúc đức tổ tiên để lại là cội rễ, tài năng con cháu là cành lá. Chăm sóc cội rễ đạo đức thì cành lá tự khắc sum suê.",
        author="Cổ Đức Gia Huấn",
        source="Truyền Thống Đông Phương",
        reflection="Biết ơn và hướng về tổ tiên nguồn cội bằng lối sống thiện lành là phương thức tích phúc sâu dày nhất cho dòng họ.",
        practice="Thắp một nén tâm hương tưởng nhớ tổ tiên, hoặc gọi điện thăm hỏi, thể hiện lòng hiếu thảo với cha mẹ."
    ),
    Quote(
        id=26,
        quote="Mọi sự khổ đau trên đời đều bắt nguồn từ mong muốn bản thân được hạnh phúc. Mọi sự an vui trên đời đều bắt nguồn từ mong muốn người khác được hạnh phúc.",
        author="Bồ Tát Tịch Thiên (Shantideva)",
        source="Nhập Bồ Đề Hành Luận (Bodhicaryavatara)",
        reflection="Ích kỷ vị kỷ chỉ sinh ra lo sợ và tranh giành. Mở rộng dung lượng trái tim để thương yêu muôn loài đem lại an lạc bất tận.",
        practice="Gửi lời chúc thầm kín: 'Cầu mong cho tất cả mọi người hôm nay đều được bình an, khỏe mạnh và hạnh phúc'."
    ),
    Quote(
        id=27,
        quote="Cuộc đời tựa như một giấc chiêm bao. Đừng để những ảo ảnh mộng mị làm hoen ố viên ngọc tâm thanh tịnh của chính mình.",
        author="Kinh Kim Cương Bát Nhã",
        source="Vajracchedikā Prajñāpāramitā Sūtra",
        reflection="Như giọt sương mai, như tia chớp lóe, thế giới hiện tượng chóng vánh đổi thay. Trí tuệ sáng suốt giúp ta mỉm cười đi qua nhân thế.",
        practice="Tập nhìn mọi thử thách bằng thái độ nhẹ nhàng như đang xem một thước phim sinh động."
    ),
    Quote(
        id=28,
        quote="Mỗi buổi sớm mai thức dậy là một cơ hội tuyệt vời để tái sinh trong sự tỉnh thức và lòng từ bi vô lượng.",
        author="Thiền Sư Nhất Hạnh",
        source="Thơ Thiền",
        reflection="Thức dậy mỉm cười, 24 giờ tinh khôi đang mở ra trước mắt. Hãy bước vào ngày mới với đôi mắt thương yêu và tâm hồn trong sáng.",
        practice="Ngay khi mở mắt thức dậy sáng mai, hãy nở một nụ cười và hít thở sâu trước khi bước xuống giường."
    ),
    Quote(
        id=29,
        quote="Gặp nghịch duyên hãy xem như trả nợ kiếp xưa; gặp thuận duyên hãy xem như bài học nhắc nhở tiếp tục tích đức.",
        author="Ấn Quang Đại Sư",
        source="Ấn Quang Văn Sao",
        reflection="Thấu hiểu nhân quả sâu sắc giúp tâm ta thanh thản trước mọi tai ương hoạn nạn, không một lời oán trời trách người.",
        practice="Thay vì phàn nàn về một trục trặc bất ngờ, hãy xem đó là cơ hội tiêu trừ nghiệp chướng và rèn luyện chữ Nhẫn."
    ),
    Quote(
        id=30,
        quote="Thân như điện ảnh hữu hoàn vô, Vạn mộc xuân vinh thu hựu khô. Nhậm vận thịnh suy vô bố úy, Thịnh suy như lộ thảo đầu phô.",
        author="Thiền Sư Vạn Hạnh (Thời Lý)",
        source="Thơ Thiền Lý Trần",
        reflection="Thân như bóng chớp có rồi không, cây cối xuân tươi thu héo hon. Tùy duyên thịnh suy lòng không sợ, thịnh suy như hạt sương đầu ngọn cỏ.",
        practice="Đứng vững trước mọi biến thiên thăng trầm của đời sống với tâm thái tự tại tiêu dao của bậc đạt đạo."
    ),
    Quote(
        id=31,
        quote="Tâm bao dung lượng lớn thì phúc trạch sâu dày. Trí tuệ quang minh thì bóng tối vô minh tự khắc tan biến.",
        author="Đức Phật Thích Ca Mâu Ni",
        source="Kinh Hoa Nghiêm (Avatamsaka Sūtra)",
        reflection="Dung lượng trái tim quyết định tầm vóc phúc báo. Mở rộng tâm hồn đón nhận mọi người và vạn vật là đỉnh cao của phúc tuệ song tu.",
        practice="Bao dung tha thứ cho một thiếu sót của người khác trong ngày hôm nay mà không một lời chỉ trích."
    )
]


def get_all_sutras() -> List[Sutra]:
    return SUTRAS_DATA


def find_sutra_by_id(sutra_id: str) -> Optional[Sutra]:
    for s in SUTRAS_DATA:
        if s.id == sutra_id:
            return s
    return None


def get_all_quotes() -> List[Quote]:
    return DAILY_QUOTES
