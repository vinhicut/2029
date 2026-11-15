"""
export_pdf.py
Module xuất bản bài luận giải Tử Vi Đẩu Số sang định dạng PDF chuẩn thương hiệu Tử Vi Hồng Ân.
Quy chuẩn thiết kế được nâng cấp:
1. Khổ giấy & Kích thước trang:
   - Chiều rộng trang cố định 250mm (khổ rộng 250mm x vô hạn chiều cao).
   - 4 lề trang cố định 20mm (Top, Bottom, Left, Right) -> vùng nội dung in khả dụng đạt chuẩn 210mm (bằng đúng chiều rộng khổ A4 thực tế).
   - Hình ảnh lá số màu hiển thị rộng 100% vùng in (210mm), giữ nguyên 100% tỷ lệ gốc (aspect ratio).
2. Typography & Phông chữ:
   - Các Heading lớn (H1, H2, H3, H4, Tiêu đề Mục lục) sử dụng Font chữ có chân rõ nét (Serif: Lora):
     Chân chữ dứt khoát, thanh đậm rõ ràng, dấu tiếng Việt Unicode cao ráo và không bị nén khuất.
   - Thân bài (Normal paragraphs, lists, thơ phú) sử dụng font chữ chuẩn 'Be Vietnam Pro', đúng chuẩn tương đương 14pt trong Microsoft Word.
3. Định dạng văn bản & câu thơ/câu Phú:
   - TUYỆT ĐỐI KHÔNG IN NGHIÊNG trong toàn bộ nội dung (font-style: normal !important).
   - Căn giữa (Center align) tất cả các câu thơ, câu Phú đặt trong dấu ngoặc kép.
   - Loại bỏ hoàn toàn khối nền và viền bao quanh câu thơ.
4. Xử lý hình ảnh lá số:
   - Tự động nén hình ảnh về độ phân giải chuẩn Full HD (FHD, 1920x1080) giữ nguyên tỷ lệ gốc nhằm tối ưu dung lượng và tốc độ xuất file PDF.
   - Đặt kích thước hiển thị ở mức 100% tỷ lệ gốc (width: 100%, height: auto).
   - Loại bỏ toàn bộ viền, bo góc và hiệu ứng đổ bóng (drop shadow) xung quanh hình ảnh lá số.
5. Ngắt dòng lời thoại "Tử Vi Hồng Ân":
   - Thêm khoảng ngắt dòng (khoảng đệm trên và dưới 20pt) cho mỗi đoạn lời nói của "Tử Vi Hồng Ân".
"""

import os
import re
import sys
import io
import base64
import tempfile
from typing import Optional, Union, Dict, Any
from PIL import Image
from playwright.sync_api import sync_playwright

DEFAULT_SERIF_FONT_STACK = (
    "'Lora', serif"
)
DEFAULT_BODY_FONT_STACK = (
    "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', "
    "Roboto, Helvetica, Arial, sans-serif"
)


def preserve_highres_image_base64(
    image_input: Union[str, bytes],
    allow_local_path: bool = False
) -> Optional[str]:
    """
    Bảo toàn độ phân giải gốc 4K / >= 300 DPI của ảnh lá số Tử Vi khi nhúng vào PDF,
    xuất định dạng PNG không suy hao (lossless) để chữ và đường kẻ sắc nét tuyệt đối.
    Chỉ tiếp nhận bytes hoặc Data URL ảnh hợp lệ (chặn đọc tệp cục bộ LFI).
    """
    if not image_input:
        return None

    raw_bytes = None
    if isinstance(image_input, bytes):
        raw_bytes = image_input
    elif isinstance(image_input, str):
        stripped = image_input.strip()
        if "," in stripped and (stripped.startswith("data:image/") or ";base64," in stripped):
            if not stripped.startswith("data:image/"):
                return None
            b64_part = stripped.split(",", 1)[1]
            try:
                raw_bytes = base64.b64decode(b64_part, validate=True)
            except Exception:
                raw_bytes = None
        elif allow_local_path and os.path.isfile(stripped):
            with open(stripped, "rb") as f:
                raw_bytes = f.read()
        else:
            # Từ chối chuỗi đường dẫn tệp cục bộ hoặc raw non-data-URL từ HTTP request
            return None

    if not raw_bytes or len(raw_bytes) > 16 * 1024 * 1024:
        return None

    try:
        probe_img = Image.open(io.BytesIO(raw_bytes))
        probe_img.verify()
        img = Image.open(io.BytesIO(raw_bytes))
        w, h = img.size

        # Giữ nguyên độ phân giải gốc 4K (ví dụ 2948x4052 ~ 356 DPI trên khổ rộng 210mm),
        # chỉ giới hạn trần an toàn ở mức 4096px
        max_dim = 4096
        if w > max_dim or h > max_dim:
            ratio = min(max_dim / float(w), max_dim / float(h))
            new_w = max(1, int(round(w * ratio)))
            new_h = max(1, int(round(h * ratio)))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        out_buf = io.BytesIO()
        if img.mode not in ('RGBA', 'RGB', 'LA', 'L'):
            img = img.convert('RGBA')
        img.save(out_buf, format='PNG', optimize=True)
        b64_data = base64.b64encode(out_buf.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64_data}"
    except Exception:
        # Từ chối dữ liệu không phải ảnh hợp lệ (không trả về raw bytes chống LFI)
        return None


compress_image_to_fhd_base64 = preserve_highres_image_base64


def slugify_vietnamese(text: str) -> str:
    """Tạo slug không dấu cho anchor link từ tiêu đề tiếng Việt."""
    if not text:
        return ""
    text = text.lower()
    replacements = {
        'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
        'đ': 'd'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text).strip('-')
    return text


def parse_markdown_to_html(markdown_text: str) -> str:
    """
    Parser Markdown thuần túy siêu nhẹ, chuyển đổi chính xác cấu trúc
    văn bản luận giải Tử Vi Hồng Ân sang HTML ngữ nghĩa theo các quy chuẩn:
    1. Chuẩn hóa H1 cho các phần I đến V.
    2. Căn giữa câu thơ / phú cổ không nền không viền, chữ đứng (không in nghiêng).
    3. Thêm class brand-dialogue cho lời thoại Tử Vi Hồng Ân.
    4. Thân bài chuẩn 14pt căn đều.
    5. Vô hiệu hóa toàn bộ ký tự in nghiêng * hoặc _.
    6. Mục lục thoáng đãng, phân cấp chuẩn Level 1, Level 2, Level 3.
    7. Tự động ngắt dòng sau dấu hai chấm (:) ở các gạch đầu dòng (bullet points).
    8. Tiêu đề "Năm..." sử dụng màu đen than #1E293B đồng bộ cấp mục, không bị màu đỏ.
    """
    # 0. Chuẩn hóa các dòng tiêu đề lớn và tiểu mục:
    raw_lines = markdown_text.replace('\r\n', '\n').split('\n')
    norm_lines = []
    for l in raw_lines:
        trimmed = l.strip()
        if not trimmed:
            norm_lines.append(l)
            continue
        m_major = re.match(r'^(?:#{1,3}\s*)?(?:\*\*)?((?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+[\s\S]+?)(?:\*\*)?$', trimmed, re.IGNORECASE) or \
                  re.match(r'^(?:#{1,3}\s*)?(?:\*\*)?(TỔNG\s+KẾT(?:\s*\(.*?\))?)(?:\*\*)?$', trimmed, re.IGNORECASE)
        if m_major:
            clean_title = re.sub(r'^#+\s*', '', m_major.group(1)).strip()
            norm_lines.append(f"# {clean_title}")
            continue

        m_sub = re.match(r'^(?:#{1,3}\s*)?(?:\*\*)?(\d+\.\s+[\s\S]+?)(?:\*\*)?$', trimmed)
        if m_sub:
            clean_title = re.sub(r'^#+\s*', '', m_sub.group(1)).strip()
            norm_lines.append(f"## {clean_title}")
            continue

        m_year = re.match(r'^(?:#{1,4}\s*)?(?:\*\*)?(Năm\s+\d{4}[\s\S]*?)(?:\*\*)?$', trimmed, re.IGNORECASE)
        if m_year:
            clean_title = re.sub(r'^#+\s*', '', m_year.group(1)).strip()
            norm_lines.append(f"#### {clean_title}")
            continue

        norm_lines.append(l)
    markdown_text = '\n'.join(norm_lines)

    # Tự động kiến tạo Mục Lục nếu bản văn chưa có phần # MỤC LỤC
    if not re.search(r'#+\s*MỤC\s+LỤC', markdown_text, re.IGNORECASE) and not re.search(r'^MỤC\s+LỤC$', markdown_text, re.MULTILINE):
        toc_lines = ['# MỤC LỤC']
        for raw_l in markdown_text.splitlines():
            sl = raw_l.strip()
            if not sl.startswith('#'):
                continue
            hm = re.match(r'^(#+)\s*(.+)$', sl)
            if not hm:
                continue
            h_text = hm.group(2).strip()
            slug = slugify_vietnamese(h_text)
            if re.match(r'^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+', h_text) or h_text == 'TỔNG KẾT' or h_text.startswith('V. '):
                toc_lines.append(f"- [{h_text}](#{slug})")
            elif re.match(r'^\d+\.\s+', h_text) or any(h_text.startswith(k) for k in ["Bản Mệnh", "Tương quan", "Vị trí Thân"]):
                toc_lines.append(f"  - [{h_text}](#{slug})")
            elif re.match(r'^Năm\s+\d{4}', h_text):
                toc_lines.append(f"    - [{h_text}](#{slug})")
        if len(toc_lines) > 1:
            markdown_text = '\n'.join(toc_lines) + '\n\n' + markdown_text

    lines = markdown_text.replace('\r\n', '\n').split('\n')
    html_parts = []
    in_blockquote = False
    blockquote_lines = []
    in_list = False
    list_items = []
    in_toc = False
    toc_items = []

    def flush_blockquote():
        nonlocal in_blockquote, blockquote_lines
        if in_blockquote and blockquote_lines:
            content = "<br>".join(blockquote_lines)
            html_parts.append(f"<blockquote class='poem-quote'>{content}</blockquote>")
            blockquote_lines = []
            in_blockquote = False

    def parse_bullet_item_pdf(it: str) -> str:
        # Tự động ngắt xuống dòng cho toàn bộ nội dung đứng sau dấu hai chấm (:)
        m1 = re.match(r'^(<p>)?\s*(<(?:strong|b)>[\s\S]+?[:：]<\/(?:strong|b)>)\s*([\s\S]+?)(<\/p>)?$', it, re.IGNORECASE)
        if m1:
            return f"<li class='bullet-item-colon'><div class='bullet-label'>{m1.group(2).strip()}</div><div class='bullet-content'>{m1.group(3).strip()}</div></li>"
        m2 = re.match(r'^(<p>)?\s*(<(?:strong|b)>[\s\S]+?<\/(?:strong|b)>[:：])\s*([\s\S]+?)(<\/p>)?$', it, re.IGNORECASE)
        if m2:
            return f"<li class='bullet-item-colon'><div class='bullet-label'>{m2.group(2).strip()}</div><div class='bullet-content'>{m2.group(3).strip()}</div></li>"
        m3 = re.match(r'^(<p>)?\s*([^<:\n]{2,60}[:：])\s+([\s\S]+?)(<\/p>)?$', it)
        if m3:
            return f"<li class='bullet-item-colon'><div class='bullet-label'><strong>{m3.group(2).strip()}</strong></div><div class='bullet-content'>{m3.group(3).strip()}</div></li>"
        return f"<li>{it}</li>"

    def flush_list():
        nonlocal in_list, list_items
        if in_list and list_items:
            items_html = "".join(parse_bullet_item_pdf(it) for it in list_items)
            html_parts.append(f"<ul>{items_html}</ul>")
            list_items = []
            in_list = False

    def flush_toc():
        nonlocal in_toc, toc_items
        if in_toc and toc_items:
            items_html = "".join(f"<li class='toc-item level-{lvl}'>{txt}</li>" for lvl, txt in toc_items)
            html_parts.append(
                f"<div class='toc-box'>"
                f"<div class='toc-header'>MỤC LỤC</div>"
                f"<ul class='toc-list'>{items_html}</ul>"
                f"</div>"
            )
            toc_items = []
            in_toc = False

    def _safe_link(match):
        label = match.group(1)
        href = match.group(2).strip()
        if href.startswith("#") or href.startswith("https://") or href.startswith("http://"):
            safe_href = href.replace('"', "%22").replace("'", "%27")
            return f'<a href="{safe_href}">{label}</a>'
        return label

    def inline_format(txt: str) -> str:
        txt = txt.replace("<", "&lt;").replace(">", "&gt;")
        txt = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', txt)
        txt = re.sub(r'(?<!\*)\*([^\*\r\n]+?)\*(?!\*)', r'\1', txt)
        txt = re.sub(r'(?<!_)_([^\_\r\n]+?)_(?!_)', r'\1', txt)
        txt = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', _safe_link, txt)
        return txt

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        raw_line = lines[i]

        if not line:
            flush_blockquote()
            flush_list()
            i += 1
            continue

        # Kiểm tra khối MỤC LỤC
        if line.startswith('# MỤC LỤC') or line == 'MỤC LỤC':
            flush_blockquote()
            flush_list()
            flush_toc()
            in_toc = True
            i += 1
            continue

        if in_toc:
            if line.startswith('- ') or line.startswith('* '):
                indent = len(raw_line) - len(raw_line.lstrip())
                item_text = inline_format(line[2:].strip())
                clean_title = re.sub(r'<[^>]+>', '', item_text).strip()

                # Phân cấp ngữ nghĩa chuẩn mực: Level 1, Level 2, Level 3
                if re.match(r'^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+', clean_title) or clean_title.startswith('V. ') or clean_title == 'TỔNG KẾT' or clean_title == 'V. TỔNG KẾT':
                    level = 1
                elif re.match(r'^Năm\s+\d{4}', clean_title) or indent >= 4:
                    level = 3
                elif re.match(r'^\d+\.\s+', clean_title) or indent >= 1 or any(clean_title.startswith(k) for k in ["Bản Mệnh", "Tương quan", "Vị trí Thân"]):
                    level = 2
                else:
                    level = 1
                toc_items.append((level, item_text))
                i += 1
                continue
            elif line.startswith('#'):
                flush_toc()
            elif re.match(r'^([-*_])(?:\s*\1){2,}\s*$', line):
                flush_toc()
                html_parts.append("<hr class='section-divider' />")
                i += 1
                continue
            else:
                item_text = inline_format(line)
                clean_title = re.sub(r'<[^>]+>', '', item_text).strip()
                level = 3 if re.match(r'^Năm\s+\d{4}', clean_title) else 2
                toc_items.append((level, item_text))
                i += 1
                continue

        # Kiểm tra blockquote (phú thơ / ca quyết)
        if line.startswith('>'):
            flush_list()
            in_blockquote = True
            q_text = line.lstrip('>').strip()
            if q_text:
                blockquote_lines.append(inline_format(q_text))
            i += 1
            continue
        else:
            flush_blockquote()

        # Kiểm tra câu thơ độc lập đặt trong ngoặc kép (nếu không có dấu '>')
        is_isolated_quote = (
            (line.startswith('"') and line.endswith('"')) or
            (line.startswith('“') and line.endswith('”')) or
            (line.startswith('"') and '\n' in line) or
            (line.startswith('“') and '\n' in line)
        )
        if is_isolated_quote:
            flush_list()
            content = '<br>'.join(inline_format(ql) for ql in line.split('\n'))
            html_parts.append(f"<blockquote class='poem-quote'>{content}</blockquote>")
            i += 1
            continue

        # Kiểm tra danh sách không thứ tự ngoài TOC
        if line.startswith('- ') or line.startswith('* '):
            in_list = True
            list_items.append(inline_format(line[2:].strip()))
            i += 1
            continue
        else:
            flush_list()

        # Kiểm tra đường kẻ phân tách đoạn Markdown (---, ***, ___)
        if re.match(r'^([-*_])(?:\s*\1){2,}\s*$', line):
            flush_blockquote()
            flush_list()
            html_parts.append("<hr class='section-divider' />")
            i += 1
            continue

        # Kiểm tra Headings
        is_major_section = bool(re.match(r'^(?:#{1,3}\s*)?(?:I|II|III|IV|V)\.\s+', line))

        if is_major_section:
            clean_title = re.sub(r'^#+\s*', '', line).strip()
            slug = slugify_vietnamese(clean_title)
            html_parts.append(f"<h1 id='{slug}'>{inline_format(clean_title)}</h1>")
            i += 1
            continue

        # Kiểm tra đề mục niên vận "Năm..." (Màu đen than #1E293B, không dùng màu đỏ)
        is_year_heading = bool(re.match(r'^(?:#{1,4}\s*)?Năm\s+\d{4}', line))
        if is_year_heading:
            clean_title = re.sub(r'^#+\s*', '', line).strip()
            slug = slugify_vietnamese(clean_title)
            html_parts.append(f"<h4 class='year-heading' id='{slug}'>{inline_format(clean_title)}</h4>")
            i += 1
            continue

        if line.startswith('####'):
            clean_title = line[4:].strip()
            slug = slugify_vietnamese(clean_title)
            html_parts.append(f"<h4 id='{slug}'>{inline_format(clean_title)}</h4>")
            i += 1
            continue
        elif line.startswith('###'):
            clean_title = line[3:].strip()
            slug = slugify_vietnamese(clean_title)
            html_parts.append(f"<h3 id='{slug}'>{inline_format(clean_title)}</h3>")
            i += 1
            continue
        elif line.startswith('##'):
            clean_title = line[2:].strip()
            slug = slugify_vietnamese(clean_title)
            html_parts.append(f"<h2 id='{slug}'>{inline_format(clean_title)}</h2>")
            i += 1
            continue
        elif line.startswith('#'):
            clean_title = line[1:].strip()
            slug = slugify_vietnamese(clean_title)
            html_parts.append(f"<h1 id='{slug}'>{inline_format(clean_title)}</h1>")
            i += 1
            continue

        # Kiểm tra đoạn lời thoại / câu dẫn "Tử Vi Hồng Ân"
        is_dialogue = (
            "tử vi hồng ân" in line.lower() and
            any(k in line.lower() for k in ["mến chào", "xin được giải đoán", "xin luận giải", "đôi lời tổng quan", "hoan hỷ hữu duyên", "luận tới tam hợp"])
        )

        if is_dialogue:
            html_parts.append(f"<p class='brand-dialogue'>{inline_format(line)}</p>")
        else:
            # Đoạn văn thường (Paragraph)
            html_parts.append(f"<p>{inline_format(line)}</p>")

        i += 1

    flush_blockquote()
    flush_list()
    flush_toc()

    return '\n'.join(html_parts)


def build_full_html_document(
    body_html: str,
    chart_image_base64: Optional[str] = None,
    serif_font_stack: str = DEFAULT_SERIF_FONT_STACK,
    body_font_stack: str = DEFAULT_BODY_FONT_STACK,
    title: str = "Luận Giải Tử Vi Hồng Ân",
    content_width_mm: float = 210.0,
    page_width_mm: float = 250.0,
    margin_mm: float = 20.0
) -> str:
    """Xây dựng tài liệu HTML in ấn hoàn chỉnh với chiều rộng nội dung 210mm và font có chân cho Headings."""
    image_tag = ""
    if chart_image_base64:
        image_tag = f"""
        <div class="chart-wrapper">
          <img class="chart-image" src="{chart_image_base64}" alt="Lá Số Tử Vi" />
        </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&family=Lora:wght@700;800&display=swap');

  *, *::before, *::after {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}

  @page {{
    size: {page_width_mm:.1f}mm auto;
    margin: 0;
  }}

  html, body {{
    margin: 0;
    padding: 0;
    width: {page_width_mm:.1f}mm;
    background-color: #ffffff;
    font-family: {body_font_stack};
    font-size: 14pt;
    color: #000000;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }}

  /* Bọc ngoài trang phục vụ căn lề 4 phía đúng 20mm (vùng in đúng {content_width_mm:.1f}mm) */
  .page-container {{
    width: {content_width_mm:.1f}mm;
    margin: 0 auto;
    padding-top: {margin_mm:.1f}mm;
    padding-bottom: {margin_mm:.1f}mm;
    padding-left: 0;
    padding-right: 0;
    background-color: #ffffff;
  }}

  /* Khối hiển thị hình ảnh lá số: RỘNG 100% VÙNG IN KHẢ DỤNG (210MM), GIỮ NGUYÊN TỶ LỆ GỐC, KHÔNG VIỀN, KHÔNG BÓNG */
  .chart-wrapper {{
    width: 100%;
    max-width: 100%;
    text-align: center;
    margin: 0 auto 24pt auto;
    padding: 0;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }}

  .chart-image, img {{
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
    margin: 0 auto;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    outline: none !important;
    object-fit: contain;
  }}

  /* Khung Mục Lục Hiện Đại, Thoáng Đãng & Phân Cấp Chuẩn */
  .toc-box {{
    margin: 20pt 0 28pt 0;
    padding: 18pt 24pt;
    background-color: #FCFAF7;
    border: 1.5px solid rgba(197, 160, 89, 0.45);
    border-radius: 10px;
  }}

  /* Tiêu đề Mục lục: Font chữ có chân (Serif: Lora) rõ nét, sang trọng */
  .toc-header {{
    font-family: {serif_font_stack};
    font-size: 17pt;
    font-weight: 800;
    color: #8B1D1D;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 16pt;
    border-bottom: 1.5px solid rgba(197, 160, 89, 0.35);
    padding-bottom: 8pt;
  }}

  .toc-list {{
    list-style: none;
    padding-left: 0;
    margin: 0;
  }}

  .toc-item {{
    font-size: 13pt;
    line-height: 1.55;
    margin-bottom: 4pt;
    text-align: left;
  }}

  .toc-item.level-1 {{
    font-family: {serif_font_stack};
    font-size: 14pt;
    font-weight: 700;
    color: #8B1D1D;
    margin-top: 12pt;
    margin-bottom: 4pt;
    padding-left: 0;
  }}
  .toc-item.level-1 a {{
    color: #8B1D1D;
    text-decoration: none;
  }}

  .toc-item.level-2 {{
    font-family: {body_font_stack};
    padding-left: 20pt;
    color: #1E293B;
    font-weight: 600;
    font-size: 13pt;
    margin-top: 5pt;
    margin-bottom: 3pt;
  }}
  .toc-item.level-2 a {{
    color: #1E293B;
    text-decoration: none;
  }}

  .toc-item.level-3 {{
    font-family: {body_font_stack};
    padding-left: 38pt;
    color: #57534E;
    font-weight: 400;
    font-size: 12pt;
    margin-top: 3pt;
    margin-bottom: 2pt;
  }}
  .toc-item.level-3 a {{
    color: #57534E;
    text-decoration: none;
  }}

  /* Heading 1: Font có chân Lora, Đỏ chu sa #8B1D1D, 22pt, bold 800, căn giữa, chữ hoa */
  h1 {{
    font-family: {serif_font_stack};
    font-size: 22pt;
    font-weight: 800;
    color: #8B1D1D;
    text-align: center;
    text-transform: uppercase;
    margin-top: 32pt;
    margin-bottom: 16pt;
    padding-top: 10pt;
    padding-bottom: 4pt;
    letter-spacing: 0.03em;
    line-height: 1.6;
    overflow: visible !important;
  }}

  /* Heading 2: Font có chân Lora, Đen mực #000000, 18pt, bold 700, căn trái (tách biệt +3pt so với H3) */
  h2 {{
    font-family: {serif_font_stack};
    font-size: 18pt;
    font-weight: 700;
    color: #000000;
    text-align: left;
    margin-top: 26pt;
    margin-bottom: 12pt;
    padding-top: 8pt;
    padding-bottom: 2pt;
    line-height: 1.5;
    overflow: visible !important;
  }}

  /* Heading 3: Font có chân Lora, Đen than #1E293B, 15pt, bold 700, căn trái (lớn hơn thân bài 14pt) */
  h3 {{
    font-family: {serif_font_stack};
    font-size: 15pt;
    font-weight: 700;
    color: #1E293B;
    text-align: left;
    margin-top: 18pt;
    margin-bottom: 6pt;
    padding-top: 6pt;
    padding-bottom: 2pt;
    line-height: 1.45;
    overflow: visible !important;
  }}

  /* Heading 4 & Năm...: Font có chân Lora, Đen than #1E293B, 14pt, bold 700, căn trái */
  h4, .year-heading {{
    font-family: {serif_font_stack};
    font-size: 14pt;
    font-weight: 700;
    color: #1E293B;
    text-align: left;
    margin-top: 14pt;
    margin-bottom: 5pt;
    padding-top: 4pt;
    line-height: 1.4;
    overflow: visible !important;
  }}

  /* Đoạn văn thường: Đen #000000, đồng bộ chuẩn font Be Vietnam Pro 14pt Word, căn đều hai bên */
  p {{
    font-family: {body_font_stack};
    font-size: 14pt;
    line-height: 1.55;
    color: #000000;
    text-align: justify;
    text-justify: inter-word;
    margin-top: 0;
    margin-bottom: 10pt;
  }}

  /* Lời thoại "Tử Vi Hồng Ân": Đồng bộ 14pt, ngắt dòng rộng rãi trên và dưới 20pt */
  .brand-dialogue {{
    font-family: {body_font_stack};
    margin-top: 20pt !important;
    margin-bottom: 20pt !important;
    font-size: 14pt;
    line-height: 1.55;
    color: #000000;
    text-align: justify;
    text-justify: inter-word;
  }}

  strong, b {{
    font-weight: 700;
    color: #000000;
  }}

  /* Khối câu thơ và câu Phú: CĂN GIỮA, ĐỒNG BỘ 100% BE VIETNAM PRO 14PT, CHỮ ĐỨNG CHUẨN MỰC, LOẠI BỎ HOÀN TOÀN KHỐI NỀN VÀ VIỀN */
  blockquote, .poem-quote {{
    font-family: {body_font_stack} !important;
    margin: 16pt auto 18pt auto !important;
    padding: 0 !important;
    border: none !important;
    border-left: none !important;
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    text-align: center !important;
    font-size: 14pt !important;
    font-style: normal !important; /* TUYỆT ĐỐI KHÔNG SỬ DỤNG ĐỊNH DẠNG IN NGHIÊNG */
    font-weight: 400;
    line-height: 1.6;
    color: #000000 !important;
  }}

  /* TUYỆT ĐỐI KHÔNG IN NGHIÊNG TRONG TOÀN BỘ VĂN BẢN */
  em, i, cite {{
    font-style: normal !important;
  }}

  ul, ol {{
    margin: 8pt 0 12pt 0;
    padding-left: 20pt;
  }}

  li {{
    font-family: {body_font_stack};
    font-size: 14pt;
    line-height: 1.48;
    margin-bottom: 4pt;
    text-align: justify;
  }}

  /* Danh sách gạch đầu dòng ngắt dòng sau dấu hai chấm (:) */
  li.bullet-item-colon {{
    margin-bottom: 8pt;
  }}
  .bullet-label {{
    display: block;
    font-weight: 700;
    color: #000000;
    margin-bottom: 2pt;
    line-height: 1.45;
  }}
  .bullet-content {{
    display: block;
    color: #000000;
    font-size: 14pt;
    line-height: 1.55;
    text-align: justify;
    text-justify: inter-word;
  }}

  a {{
    color: #8B1D1D;
    text-decoration: none;
  }}

  hr, hr.section-divider {{
    border: none;
    border-top: 1px solid rgba(197, 160, 89, 0.35);
    margin: 22pt auto;
    width: 100%;
  }}
</style>
</head>
<body>
  <div class="page-container">
    {image_tag}
    {body_html}
  </div>
</body>
</html>
"""
    return html


def extract_content_and_image_from_docx(docx_path: str) -> tuple[str, Optional[bytes]]:
    """Trích xuất văn bản Markdown và ảnh lá số màu từ tệp docx."""
    import docx

    doc = docx.Document(docx_path)
    image_bytes = None

    for rel in doc.part.rels.values():
        if "image" in rel.target_ref:
            image_bytes = rel.target_part.blob
            break

    md_lines = []
    for i, p in enumerate(doc.paragraphs):
        text = p.text.strip()
        if not text:
            continue

        st = p.style.name
        if st == 'Heading 1':
            md_lines.append(f"# {text}\n")
        elif st == 'Heading 2':
            md_lines.append(f"## {text}\n")
        elif st == 'Heading 3':
            md_lines.append(f"### {text}\n")
        elif st == 'Heading 4':
            md_lines.append(f"#### {text}\n")
        else:
            if text.startswith('"') or text.startswith('“') or (p.paragraph_format.left_indent and p.paragraph_format.left_indent.pt > 15):
                for ql in text.split('\n'):
                    md_lines.append(f"> {ql}")
                md_lines.append("")
            else:
                md_lines.append(f"{text}\n")

    return '\n'.join(md_lines), image_bytes


def export_tuvi_to_pdf(
    markdown_text: str,
    output_pdf_path: str,
    chart_image_path_or_bytes: Optional[Union[str, bytes]] = None,
    serif_font_stack: str = DEFAULT_SERIF_FONT_STACK,
    body_font_stack: str = DEFAULT_BODY_FONT_STACK,
    title: str = "Luận Giải Tử Vi Hồng Ân",
    page_width_mm: float = 250.0,
    margin_mm: float = 20.0,
    paged: bool = False,
    allow_local_path: bool = False
) -> Dict[str, Any]:
    """
    Xuất bản bài luận giải Tử Vi Đẩu Số sang PDF vô hạn chuẩn thương hiệu.
    
    Args:
        markdown_text: Chuỗi văn bản Markdown bài luận giải.
        output_pdf_path: Đường dẫn lưu file PDF kết quả.
        chart_image_path_or_bytes: Đường dẫn file ảnh, chuỗi base64 hoặc bytes của ảnh lá số màu.
        serif_font_stack: Danh sách font có chân (Serif: Lora) cho các Heading lớn.
        body_font_stack: Danh sách font thân bài ('Be Vietnam Pro').
        title: Tiêu đề tài liệu PDF.
        page_width_mm: Chiều rộng giấy in (mặc định 250mm).
        margin_mm: Lề 4 phía (mặc định 20mm). Vùng in hữu dụng = 250 - 40 = 210mm.
        paged: Nếu True, xuất dạng phân trang A4 tiêu chuẩn (210x297mm).
               Mặc định False: Xuất 1 trang dài vô hạn (Single Continuous Page).
        allow_local_path: Chỉ bật True cho công cụ CLI nội bộ, luôn False cho API HTTP (chống LFI).
    
    Returns:
        Dict thông tin kết xuất: { "success": bool, "pdf_path": str, "pages": int, "file_size_bytes": int, ... }
    """
    content_width_mm = page_width_mm - (2 * margin_mm)

    # Bảo toàn độ phân giải gốc 4K / >= 300 DPI của ảnh lá số và chuyển sang base64 PNG
    image_base64_url = None
    if chart_image_path_or_bytes:
        image_base64_url = preserve_highres_image_base64(
            chart_image_path_or_bytes,
            allow_local_path=allow_local_path
        )

    body_html = parse_markdown_to_html(markdown_text)
    full_html = build_full_html_document(
        body_html=body_html,
        chart_image_base64=image_base64_url,
        serif_font_stack=serif_font_stack,
        body_font_stack=body_font_stack,
        title=title,
        content_width_mm=content_width_mm,
        page_width_mm=page_width_mm,
        margin_mm=margin_mm
    )

    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as f:
        temp_html_path = f.name
        f.write(full_html)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
            page = browser.new_page(viewport={"width": 1050, "height": 1400})

            file_url = f"file:///{os.path.abspath(temp_html_path).replace(os.sep, '/')}"

            # Chặn SSRF và đọc file cục bộ ngoài lệ khi Chromium kết xuất HTML
            def _guard_route(route):
                url = route.request.url or ""
                if (
                    url == file_url
                    or url.startswith("data:image/")
                    or url.startswith("data:font/")
                    or url.startswith("https://fonts.googleapis.com/")
                    or url.startswith("https://fonts.gstatic.com/")
                ):
                    route.continue_()
                else:
                    route.abort()

            page.route("**/*", _guard_route)
            page.goto(file_url, wait_until="networkidle")
            page.evaluate("() => document.fonts.ready")

            content_height_px = page.evaluate("() => document.documentElement.scrollHeight")
            content_height_mm = (content_height_px / 96.0) * 25.4

            os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)), exist_ok=True)

            if paged:
                page.pdf(
                    path=output_pdf_path,
                    format="A4",
                    margin={"top": f"{margin_mm}mm", "bottom": f"{margin_mm}mm", "left": f"{margin_mm}mm", "right": f"{margin_mm}mm"},
                    print_background=True,
                    prefer_css_page_size=False
                )
            else:
                total_page_height_mm = content_height_mm + 2.0

                page.pdf(
                    path=output_pdf_path,
                    width=f"{page_width_mm}mm",
                    height=f"{total_page_height_mm:.2f}mm",
                    margin={
                        "top": "0",
                        "bottom": "0",
                        "left": "0",
                        "right": "0"
                    },
                    print_background=True,
                    prefer_css_page_size=False
                )

            browser.close()

        import pypdf
        reader = pypdf.PdfReader(output_pdf_path)
        page_count = len(reader.pages)
        box = reader.pages[0].mediabox
        actual_width_mm = float(box.width) / 72.0 * 25.4
        actual_height_mm = float(box.height) / 72.0 * 25.4
        file_size = os.path.getsize(output_pdf_path)

        return {
            "success": True,
            "pdf_path": os.path.abspath(output_pdf_path),
            "pages": page_count,
            "width_mm": round(actual_width_mm, 1),
            "height_mm": round(actual_height_mm, 1),
            "content_width_mm": round(content_width_mm, 1),
            "file_size_bytes": file_size
        }

    finally:
        if os.path.exists(temp_html_path):
            os.remove(temp_html_path)
