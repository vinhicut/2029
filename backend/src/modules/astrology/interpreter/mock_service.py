# -*- coding: utf-8 -*-
# mock_service.py
"""
Động cơ Giả Lập Luận Giải AI Podcast (MockTuViInterpreterService).
Phục vụ trải nghiệm toàn diện và kiểm thử hệ thống 100% khi chưa cấu hình GEMINI_API_KEY.
Tạo bài luận văn podcast (Audio-Essay & Read-Along Monologue) chuẩn mực dài 2.200 - 2.600 từ,
đạt 100% tiêu chí kiểm định của validate_reading.py:
- Spoken-Written Hybrid: Nhịp thở câu 16 - 25 từ, âm điệu truyền cảm, giàu tính văn học.
- Đầy đủ 5 đề mục La Mã, 11 cung phụ, 3 năm tiểu vận và hệ thống câu dẫn thương hiệu verbatim in nghiêng.
"""

import time
import re
from typing import Dict, Any, Optional

from .config import TARGET_MIN_WORDS, TARGET_MAX_WORDS, THINKING_LEVEL
from .prompt_compiler import PromptCompiler
from .benchmark import count_words

class MockTuViInterpreterService:
    def __init__(self):
        self.compiler = PromptCompiler()

    def generate_reading(self, markdown_ai: str, age: Optional[int] = None, gender: Optional[str] = None) -> Dict[str, Any]:
        """
        Sinh bài luận văn podcast giả lập chuẩn mực 2.000 - 2.800 từ dựa trên thông tin thực tế từ markdown_ai.
        """
        start_time = time.time()
        
        # Bóc tách metadata từ markdown_ai
        meta = self.compiler.extract_metadata_from_markdown(markdown_ai)
        actual_age = age if age is not None else meta.get("age", 28)
        actual_gender = gender if gender is not None else meta.get("gender", "Nam")
        client_name = meta.get("name", "Hữu Duyên")
        pronoun = self.compiler.get_pronoun(actual_age, actual_gender)
        intimate = self.compiler.get_intimate_pronoun(pronoun)
        
        nap_am = meta.get("nap_am") or "Tích Lịch Hỏa"
        cuc = meta.get("cuc_menh") or meta.get("cuc") or "Thổ ngũ cục"
        menh_cung = meta.get("menh_cung") or "Dần"
        than_cu = meta.get("than_cu") or "Thân cư Phúc Đức"
        limit_year = meta.get("limit_year") or 2026
        
        # Lấy 3 câu Trung Cung mẫu từ kho tri thức
        snippets = self.compiler.get_destiny_snippets(nap_am, cuc, than_cu, pronoun)
        
        # Mô phỏng độ trễ suy luận nhẹ
        time.sleep(0.3)

        # Bóc tách thông tin tiền tính toán Vận hạn 3 năm & Đại vận từ markdown_ai
        dh_detail = "Chu kỳ 10 năm hiện tại"
        m_dh_block = re.search(r"### A\. ĐẠI VẬN HIỆN TẠI\s*\(([^)]+)\)\n-\s*(?:\*\*)?Vị trí(?:\*\*)?:\s*([^\n]+)", markdown_ai)
        if m_dh_block:
            dh_range = m_dh_block.group(1).strip()
            dh_loc = m_dh_block.group(2).strip()
            dh_detail = f"{dh_range}, {dh_loc}"

        def parse_year_block(letter: str, default_y: int):
            pat = rf"### {letter}\. VẬN HẠN NĂM (\d+)\s*\(([^)]+)\)\n-\s*(?:\*\*)?Cung Tiểu Hạn(?:\*\*)?:\s*([^\n]+).*?-\s*(?:\*\*)?Cung Lưu Thái Tuế(?:\*\*)?:\s*([^\n]+)"
            m = re.search(pat, markdown_ai, re.DOTALL)
            if m:
                year_val = m.group(1).strip()
                can_chi_age = m.group(2).strip()
                th_info = re.sub(r"\s*\(Can Chi:[^)]+\)", "", m.group(3).strip())
                ltt_info = re.sub(r"\s*\(Can Chi:[^)]+\)", "", m.group(4).strip())
                m_int = re.search(rf"### {letter}\..*?Trùng tụ sao.*?:\s*([^\n]+)", markdown_ai, re.DOTALL)
                special = m_int.group(1).strip() if m_int else ""
                special_short = special.split(";")[0].strip() if special else ""
                return {
                    "year": year_val,
                    "header": f"Năm {year_val} ({can_chi_age})",
                    "cung_han": f"Tiểu Hạn tại {th_info}, Lưu Thái Tuế tại {ltt_info}.",
                    "special": f"Lưu ý: {special_short}." if special_short else ""
                }
            return {
                "year": str(default_y),
                "header": f"Năm {default_y}",
                "cung_han": "Vận trình chuyển dịch qua các cung hạn lưu niên.",
                "special": ""
            }

        y_b = parse_year_block("B", limit_year)
        y_c = parse_year_block("C", limit_year + 1)
        y_d = parse_year_block("D", limit_year + 2)

        # Xây dựng bài luận văn Podcast Spoken-Written Hybrid hoàn chỉnh chuẩn 2.500 từ
        reading_text = f"""## I. TỔNG QUAN LÁ SỐ (LUẬN VỀ TRUNG CUNG)

"Mến chào {pronoun}, Tử Vi Hồng Ân xin được giải đoán mệnh vận của {intimate} như sau:"

Khi tiếp cận một lá số Tử Vi Đẩu Số, điểm khởi đầu quan trọng nhất không phải là những chi tiết vụn vặt, mà là bức tranh toàn cảnh tại khu vực Trung cung. Đây chính là hạt nhân năng lượng gốc rễ quy định cấu trúc bản thể và dòng chảy số mệnh của một đời người:

- **Bản Mệnh Nạp Âm ({nap_am}):** {snippets['nap_am_text']} Nguồn nội lực này mang lại cho {intimate} sự kiên định bền bỉ, phong thái đĩnh đạc và tinh thần trách nhiệm cao trước mọi hoàn cảnh.
- **Tương Quan Mệnh - Cục ({cuc}):** {snippets['cuc_menh_text']} Hoàn cảnh thực tế tôi luyện cho {intimate} khả năng thích ứng linh hoạt và bản lĩnh vững vàng vượt qua mọi thử thách.
- **Vị Trí Thân Cư ({than_cu}):** {snippets['than_cu_text']} Khi một người biết sống chan hòa và gieo mầm thiện lành, cuộc sống tự khắc sẽ đón nhận nhiều cơ duyên cát lợi.

---

## II. LUẬN GIẢI TAM HỢP (MỆNH - TÀI - QUAN)

"Tiếp theo luận tới Tam Hợp Mệnh-Tài-Quan của {pronoun}:"

Trong cấu trúc tinh bàn, trục tam hợp Mệnh, Tài Bạch và Quan Lộc giữ vai trò hạt nhân tựa như một chiếc kiềng ba chân vững chãi. Ba cung vị này gắn kết chặt chẽ giữa nội lực bản thân, nguồn tài chính và sự nghiệp:

- **Thế Đứng Tam Hợp:** Tọa lạc tại cung {menh_cung}, tam hợp của {pronoun} hội tụ trường năng lượng phong phú, kết hợp giữa tư duy thực tiễn và tính kỷ luật ("Cơ Nguyệt Đồng Lương tối hỷ Dần Thân hội"). Cấu trúc này rất thuận lợi cho các lĩnh vực chuyên môn sâu, công tác quản trị hoặc nghiên cứu.
- **Thế Giáp Cung Nâng Đỡ:** Bản mệnh được bao bọc bởi các phúc tinh và quý tinh giáp biên; gia đình và người thân cận luôn là điểm tựa ấm áp cho {intimate}.
- **Yếu Tố Tôi Luyện Ý Chí:** Thuở trẻ đòi hỏi {intimate} nỗ lực tự thân ("Tang Tuế Điếu, đa sầu đa hận"). Nhờ có nghị lực phò trợ, {pronoun} luôn giữ sự mẫn tiệp để vượt qua thử thách ("Thiên Mã nhập mệnh mẫn tiệp đa năng"), tiền vận vất vả nhưng trung hậu vận hưng thịnh.

"Bây giờ, Tử Vi Hồng Ân xin luận giải ba cung Mệnh, Tài Bạch và Quan Lộc cho {pronoun}:"

### 1. Cung Mệnh
- **Cốt Cách & Nội Lực:** Cung Mệnh tọa thủ tại {menh_cung} mang trường năng lượng sâu sắc, tư duy sáng suốt và trực giác nhạy bén. {pronoun} là người coi trọng chữ tín, làm việc gì cũng suy xét thấu đáo và nỗ lực hoàn thành trọn vẹn những trọng trách đã nhận lời ("tác sự tất hữu thành").
- **Cát Tinh Phò Trợ:** Các cát tinh hội chiếu mang lại phong thái đĩnh đạc. Trong tập thể, {pronoun} được tin tưởng giao phó trọng trách và được mọi người quý mến.
- **Sát Tinh & Thách Thức:** Sự xuất hiện của sát tinh phụ trợ phản ánh nội tâm đôi khi có những nỗi niềm ưu tư riêng. {pronoun} cần học cách mở lòng, giải tỏa căng thẳng và không nên ôm đồm quá nhiều việc một mình.
- **Lời Dặn Bản Mệnh:** Giữ gìn sự điềm tĩnh và kiên trì trau dồi chuyên môn sở trường chính là chiếc chìa khóa vạn năng giúp {intimate} mở toang cánh cửa thành công vững chắc.

### 2. Cung Tài Bạch
- **Dòng Tiền & Nguồn Lực:** Dòng chảy từ Mệnh dẫn lối sang cung Tài Bạch, phản ánh phương thức tích lũy tài chính. Thuở trẻ nguồn tài chính có lúc biến động, chi tiêu nhiều cho các kế hoạch phát triển bản thân.
- **Phương Thức Tích Lũy:** Nhờ có quý nhân tương trợ, nguồn thu nhập của {intimate} gắn liền với năng lực thực chất, sự chu đáo và chữ tín hơn là trông chờ vào may rủi.
- **Rủi Ro Dòng Tiền & Ca Quyết:** Đôi lúc tiền tài có sự tán tụ bất ngờ ngoài dự liệu, cổ nhân từng đúc kết câu ca quyết nhắc nhở:
> "Tang Môn, Tuế Phá, Điếu Khách hội đồng,  
> Cư vào Tài Bạch, long đong cõi đời.  
> Kiếm tiền nước mắt rơi rơi,  
> Tiền tài như nước cuốn trôi về nguồn."
- **Định Hướng Quản Trị Tài Chính:** {pronoun} nên thực hành kỷ luật chi tiêu chặt chẽ, trích lập quỹ dự phòng và tránh đầu tư mạo hiểm; nguồn tích lũy sẽ gia tăng vững chắc theo thời gian.

### 3. Cung Quan Lộc
- **Môi Trường & Chí Hướng:** Cung Quan Lộc đại diện cho đường hướng nghề nghiệp. {pronoun} là người tận tâm, có tinh thần tổ chức khoa học và trách nhiệm nghề nghiệp cao.
- **Cạnh Tranh & Thử Thách:** Môi trường làm việc khó tránh khỏi những lúc cạnh tranh gay gắt. Đôi khi sự lương thiện của {intimate} có thể bị người khác xem nhẹ nếu thiếu đi ranh giới rõ ràng.
- **Cơ Duyên Bứt Phá:** Nhờ có cát tinh định hướng và sự bền bỉ của bản thân, {pronoun} luôn tìm thấy giải pháp vượt qua khó khăn ("Qua cơn bĩ cực tới hồi thái lai"). Khi kiên định theo đuổi con đường đã chọn, đường công danh của {intimate} sẽ ngày càng rộng mở.

---

## III. LUẬN GIẢI ĐẠI VẬN & TIỂU VẬN 3 NĂM

"TỬ VI HỒNG ÂN xin luận giải Đại vận và tiểu vận của {pronoun}:"

### 1. Về Đại vận
- **Trọng Tâm Vận Trình ({dh_detail}):** Đại vận mười năm hiện tại là khúc quanh quan trọng trên hành trình gây dựng sự nghiệp. Trường năng lượng mang lại nhiều cơ hội mở rộng quan hệ nhưng đòi hỏi tính kỷ luật cao.
- **Cơ Hội Đan Xen Thách Thức:** Công việc có bước chuyển biến tích cực, uy tín cá nhân được khẳng định. Dẫu vậy áp lực trách nhiệm gia tăng đòi hỏi {intimate} phải biết cân đối giữa công việc và nghỉ ngơi hợp lý.
- **Lời Khuyên Ứng Vận:** Hãy luôn giữ thái độ khiêm nhường, làm việc theo quy trình chuẩn mực và trau dồi tri thức để đón nhận trọn vẹn phúc khí cát lành của chu kỳ vận hạn.

### 2. Về Tiểu vận 3 năm liên tiếp
- **Năm Thứ Nhất ({y_b['header']}):**
  - **Cung hạn & Tinh bàn:** {y_b['cung_han']} {y_b['special']}
  - **Vận trình & Công việc:** Dòng chảy năng lượng năm nay mang đến nhiều sự đổi mới trong phương thức làm việc. {pronoun} có cơ duyên tiếp cận những dự án mới hoặc mở rộng phạm vi phụ trách.
  - **Tài chính & Sức khỏe:** Thu nhập duy trì ổn định nhưng xuất hiện các khoản chi cần thiết cho gia đình; cần quản lý dòng tiền có kế hoạch và chú ý ngủ nghỉ điều độ.
- **Năm Thứ Hai ({y_c['header']}):**
  - **Cung hạn & Tinh bàn:** {y_c['cung_han']} {y_c['special']}
  - **Vận trình & Công việc:** Nhịp vận có xu hướng tăng tốc, những nỗ lực tích lũy từ năm trước bắt đầu đơm hoa kết trái. Các mối quan hệ hợp tác diễn ra hanh thông, thuận lợi.
  - **Tài chính & Lưu ý:** Tài lộc khởi sắc rõ nét, tích lũy được khoản thặng dư đáng kể nếu kiên định với định hướng chuyên môn; cẩn trọng rà soát kỹ văn bản và hợp đồng pháp lý.
- **Năm Thứ Ba ({y_d['header']}):**
  - **Cung hạn & Tinh bàn:** {y_d['cung_han']} {y_d['special']}
  - **Vận trình & Công việc:** Giai đoạn củng cố thành quả và tái cấu trúc các mục tiêu dài hạn. Công việc dần đi vào quỹ đạo ổn định, uy tín cá nhân được nâng cao.
  - **Tài chính & Ứng xử:** Dòng tiền lưu thông an toàn; thích hợp tích lũy tài sản mang tính bảo toàn cao, dành thêm thời gian gắn kết gia đình và hướng tâm bồi đắp phúc thiện.

---

## IV. LUẬN GIẢI CÁC CUNG VÀ ĐẠI VẬN CÒN LẠI

### 1. Cung Phụ Mẫu
- **Cục Diện Tinh Bàn:** Tọa lạc với sự đan xen giữa cát tinh và sát tinh, phản ánh mối liên kết với cha mẹ rất sâu nặng nhưng đôi lúc tồn tại khoảng cách thế hệ trong quan điểm sống.
- **Lời Dặn Hòa Hợp:** {pronoun} nên lấy chữ Hiếu làm đầu, luôn chủ động lắng nghe, nhẫn nại sẻ chia và dành sự quan tâm ân cần tới đấng sinh thành để gia đạo luôn ấm êm thuận hòa.

### 2. Cung Phúc Đức
- **Cục Diện Tinh Bàn:** Là cung trọng điểm an Thân của {pronoun}, đóng vai trò như chiếc rễ nâng đỡ toàn bộ thân cây mệnh vận. Dòng họ có phúc ấm của tổ tiên chở che, song đòi hỏi bản thân phải biết sống lương thiện để duy trì nguồn phúc lành dài lâu.
- **Lời Dặn Cốt Lõi:** "Tử Vi Hồng Ân khuyên {intimate} nên tu dưỡng thân tâm, làm điều thiện, tránh điều dữ, đặc biệt tránh làm các việc phi pháp, tín tâm cầu khẩn Thần Phật gia trì để tích âm đức cho mình và kích hoạt các cát tinh giúp {intimate} vượt qua mọi nghịch cảnh."

### 3. Cung Điền Trạch
- **Cục Diện Tinh Bàn:** Khắc họa rõ nét duyên phận với đất đai, nhà cửa và tài sản cố định. Tiềm năng tích lũy điền sản phát triển mạnh mẽ từ trung vận trở đi ("Thiên Phủ lòng lành hay tích trữ, Thiên Tướng uy nghi dạ thẳng ngay").
- **Lời Dặn Ứng Xử:** Cần giữ sự cẩn trọng khi giao dịch bất động sản vào những năm có sát tinh lưu chiếu; giữ gìn không gian sống ngăn nắp, thanh tịnh để đón vượng khí.

### 4. Cung Nô Bộc
- **Cục Diện Tinh Bàn:** Bạn bè và đồng nghiệp có nhiều người tài năng, chân thành hỗ trợ. Tuy nhiên trong môi trường rộng lớn khó tránh khỏi một vài cá nhân đố kỵ, thêu dệt thị phi.
- **Lời Dặn Giao Tế:** Chọn bạn mà chơi, đối đãi chân thành nhưng cần giữ khoảng cách an toàn, đặc biệt tỉnh táo trước những vấn đề tài chính liên đới.

### 5. Cung Thiên Di
- **Cục Diện Tinh Bàn:** Biểu thị môi trường đối ngoại và cơ hội khi bước chân ra ngoài xã hội. Khi đi xa, {pronoun} thể hiện phong thái đĩnh đạc, được người ngoài nể trọng và sẵn lòng tương trợ ("phụ biếu triều đình").
- **Lời Dặn Xuất Hành:** Chuẩn bị kỹ càng trước các chuyến công tác xa; thực hành dĩ hòa vi quý và kiềm chế nóng giận khi gặp va chạm ngoài xã hội.

### 6. Cung Tật Ách
- **Cục Diện Tinh Bàn:** Báo hiệu những lưu ý về sức khỏe thể chất và tinh thần. Thể trạng nhìn chung ổn định nhưng cần lưu ý hệ tiêu hóa và chứng căng thẳng do áp lực công việc kéo dài.
- **Lời Dặn Phòng Ngừa:** Duy trì lối sống lành mạnh, ăn uống thanh đạm, tập luyện thể thao điều độ và thăm khám định kỳ để bảo toàn nguồn sinh lực dồi dào.

### 7. Cung Tử Tức
- **Cục Diện Tinh Bàn:** Con cái sau này thông minh, hiếu động, có cá tính độc lập và ý chí vươn lên mạnh mẽ trong học tập.
- **Lời Dặn Giáo Dưỡng:** Cha mẹ nên làm người bạn đồng hành kiên nhẫn, định hướng bằng tình thương và sự thấu cảm thay vì áp đặt khuôn mẫu cứng nhắc.

### 8. Cung Phu Thê
- **Cục Diện Tinh Bàn:** Người bạn đời là người có trách nhiệm, cùng chung chí hướng xây dựng tổ ấm. Tuy nhiên trong đời sống hôn nhân khó tránh khỏi những lúc bất đồng do cái tôi của đôi bên đều lớn.
- **Lời Dặn Hòa Hợp:** Vợ chồng cần thực hành sự nhẫn nại, tu dưỡng khẩu nghiệp và biết lắng nghe, bao dung cho nhau để giữ trọn đạo nghĩa phu thê dài lâu.

### 9. Cung Huynh Đệ
- **Cục Diện Tinh Bàn:** Anh chị em trong gia đình hòa thuận, có người thành đạt và sẵn lòng đùm bọc, tương trợ lẫn nhau khi cần kíp.
- **Lời Dặn Gắn Kết:** Thường xuyên thăm hỏi, gắn kết tình thân vì *"trong nhà có ấm thì ngoài mới êm"*, lấy tình nghĩa ruột thịt làm trọng.

---

## V. TỔNG KẾT

"Tới đây, Tử Vi Hồng Ân xin có đôi lời tổng quan về mệnh vận của {intimate}:"

- **Đúc Kết Hành Trình:** {pronoun} là một cá nhân sở hữu nội lực mạnh mẽ, tư duy thực tế và giàu lòng nhân văn. Dẫu chặng đường đời có trải qua những khúc quanh thử thách, nhưng với bản lĩnh kiên cường, tính kỷ luật cùng sự che chở của phúc đức tổ tiên, {intimate} hoàn toàn có thể chuyển hóa mọi khó khăn thành đòn bẩy vươn lên xây dựng cuộc sống hưng thịnh, viên mãn ("Qua cơn bĩ cực tới hồi thái lai").
- **Định Hướng Nhân Sinh:** Mệnh số chỉ là tấm bản đồ thiên hướng, còn sự tu dưỡng đạo đức, nỗ lực tự thân và tâm thế sống thiện lương mới là yếu tố quyết định chất lượng cuộc đời theo nguyên lý "Đức năng thắng số". {pronoun} hãy kiên trì phát huy sở trường, sống bao dung và hành thiện tích đức để bảo toàn phúc lộc trường tồn.

"TỬ VI HỒNG ÂN hoan hỷ hữu duyên luận giải vận mệnh cho {pronoun}, {pronoun} hãy tải về máy để tham khảo. Nếu cần hỏi đáp chi tiết hơn về vận mệnh của mình, TỬ VI HỒNG ÂN mời {pronoun} đặt lịch luận giải trực tiếp với các quý thầy đã nghiên cứu, luận giải và chiêm nghiệm Tử Vi nhiều năm của TỬ VI HỒNG ÂN qua các số Zalo của trang này."
"""

        # Tính toán dung lượng và đo lường
        word_count = count_words(reading_text)
        duration_sec = round(time.time() - start_time, 2)

        return {
            "success": True,
            "reading_markdown": reading_text.strip(),
            "word_count": word_count,
            "duration_seconds": duration_sec,
            "metadata": {
                "name": client_name,
                "gender": actual_gender,
                "age": actual_age,
                "pronoun": pronoun,
                "nap_am": nap_am,
                "cuc": cuc,
                "menh_cung": menh_cung,
                "than_cu": than_cu,
                "limit_year": limit_year
            },
            "benchmark": {
                "total_words": word_count,
                "word_count": word_count,
                "is_standard_range": (TARGET_MIN_WORDS <= word_count <= TARGET_MAX_WORDS),
                "duration_seconds": duration_sec,
                "promptTokenCount": 1250,
                "candidatesTokenCount": int(word_count * 1.35),
                "thoughtsTokenCount": 9500 if THINKING_LEVEL == "HIGH" else (3000 if THINKING_LEVEL == "MEDIUM" else 500),
                "totalTokenCount": 1250 + int(word_count * 1.35) + (9500 if THINKING_LEVEL == "HIGH" else (3000 if THINKING_LEVEL == "MEDIUM" else 500)),
                "cachedContentTokenCount": 0
            }
        }
