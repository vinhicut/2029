# -*- coding: utf-8 -*-
# routes_ai.py
"""
Flask Blueprint API cho phân hệ AI Luận Giải Tử Vi Đẩu Số (Tử Vi Hồng Ân).
Endpoint:
  - POST /api/ai/interpret-chart : Luận giải lá số dựa trên bản đặc tả Markdown AI.
  - GET  /api/ai/status          : Trả về trạng thái cấu hình mô hình và Mock Engine.
"""

import unicodedata
import json
import logging
import re
from flask import Blueprint, request, jsonify, Response, stream_with_context, g
from modules.astrology.interpreter.service import TuViInterpreterService
from modules.auth.auth import (
    get_current_user_from_request,
    get_token_from_request,
    is_admin_or_developer,
    is_developer_user,
    login_required,
)
from core.db import (
    deduct_session_sandbox_ai_credit,
    deduct_user_ai_credit,
    get_qa_accumulated_tokens,
    update_chart_reading,
    update_qa_accumulated_tokens,
)
from modules.astrology.interpreter.config import (
    AI_MODEL_NAME,
    THINKING_LEVEL,
    MAX_OUTPUT_TOKENS,
    QA_MAX_OUTPUT_TOKENS,
    REQUEST_TIMEOUT_MS,
    TARGET_MIN_WORDS,
    TARGET_MAX_WORDS,
    TARGET_OPTIMAL_WORDS,
    MAX_WORDS_LIMIT,
    MAX_CHARS_LIMIT,
    MOCK_LLM_SERVICE,
    GEMINI_API_KEY
)

logger = logging.getLogger(__name__)
ai_bp = Blueprint("ai_interpreter", __name__, url_prefix="/api/ai")
service = TuViInterpreterService()
_CHART_HASH_RE = re.compile(r"^[a-zA-Z0-9_-]{4,128}$")
MAX_CHART_CACHE_BYTES = 512 * 1024

@ai_bp.route("/user-quota", methods=["GET"])
def get_user_quota():
    """Lấy số lượt luận giải AI khả dụng của người dùng."""
    user = get_current_user_from_request()
    if not user:
        return jsonify({
            "status": "success",
            "logged_in": False,
            "credits": 0,
            "ai_credits": 0,
            "is_admin": False,
            "unlimited": False,
            "is_sandbox": False,
            "is_developer": False
        }), 200

    is_dev = is_developer_user(user)
    is_sandbox = bool(is_dev and user.get("is_sandbox"))
    is_admin = False if is_sandbox else bool(
        user.get("role") in ("admin", "manager", "developer")
        or user.get("account_type") in ("admin", "developer")
    )
    credits = 999999 if is_admin else int(user.get("ai_credits") or 0)
    return jsonify({
        "status": "success",
        "logged_in": True,
        "user": {
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role"),
            "is_developer": is_dev,
            "is_sandbox": is_sandbox
        },
        "credits": credits,
        "ai_credits": credits,
        "is_admin": is_admin,
        "unlimited": is_admin,
        "is_sandbox": is_sandbox,
        "is_developer": is_dev
    }), 200

@ai_bp.route("/status", methods=["GET"])
def get_ai_status():
    """Kiểm tra cấu hình và tình trạng sẵn sàng của hệ thống AI Luận Giải."""
    return jsonify({
        "status": "ready",
        "model": AI_MODEL_NAME,
        "thinking_level": THINKING_LEVEL,
        "max_output_tokens": MAX_OUTPUT_TOKENS,
        "qa_max_output_tokens": QA_MAX_OUTPUT_TOKENS,
        "request_timeout_ms": REQUEST_TIMEOUT_MS,
        "length_standards": {
            "optimal_words": TARGET_OPTIMAL_WORDS,
            "max_words": MAX_WORDS_LIMIT,
            "max_chars_with_spaces": MAX_CHARS_LIMIT,
            "target_word_range": {
                "min": TARGET_MIN_WORDS,
                "max": TARGET_MAX_WORDS
            }
        },
        "target_word_range": {
            "min": TARGET_MIN_WORDS,
            "max": TARGET_MAX_WORDS
        },
        "is_mock_mode": service.use_mock,
        "has_api_key": bool(GEMINI_API_KEY),
        "supported_input_format": "markdown_ai (TUVI_MARKDOWN_GENERATED)"
    })


@ai_bp.route("/interpret-chart", methods=["POST"])
def interpret_chart_endpoint():
    """
    Tiếp nhận chuỗi markdown_ai của lá số và tiến hành luận giải chuyên sâu.
    Kiểm tra và trừ lượt luận giải của tài khoản (Admin có vô số lượt).
    """
    user = get_current_user_from_request()
    is_sandbox = bool(user and is_developer_user(user) and user.get("is_sandbox"))
    is_admin = False if is_sandbox else is_admin_or_developer(user)
    
    if not is_admin:
        if not user:
            return jsonify({
                "success": False,
                "code": "UNAUTHORIZED",
                "error": "Vui lòng đăng nhập tài khoản để sử dụng tính năng Luận giải AI."
            }), 401

        current_credits = int(user.get("ai_credits", 0))
        if current_credits <= 0:
            return jsonify({
                "success": False,
                "code": "OUT_OF_CREDITS",
                "error": "Tài khoản của bạn đã hết lượt luận giải lá số bằng AI. Vui lòng nạp thêm lượt để tiếp tục."
            }), 403

    data = request.get_json(silent=True) or {}
    markdown_ai = (data.get("markdown_ai") or "").strip()
    
    if not markdown_ai:
        return jsonify({
            "success": False,
            "error": "Thiếu dữ liệu markdown_ai! AI Luận Giải chỉ tiếp nhận bản đặc tả Markdown AI của lá số đã lập thành công."
        }), 400
        
    norm_md = unicodedata.normalize('NFC', markdown_ai).upper()
    valid_markers = [
        "DỮ LIỆU TINH BÀN",
        "ĐẶC TẢ LÁ SỐ",
        "TINH BAN TU VI",
        "TỨ TRỤ:"
    ]
    if not any(m in norm_md for m in valid_markers):
        return jsonify({
            "success": False,
            "error": "Định dạng markdown_ai không đúng chuẩn Tử Vi Hồng Ân."
        }), 400

    age = data.get("age")
    gender = data.get("gender")

    try:
        extended_quota = bool(data.get("extended_quota", False))
        result = service.interpret_chart(markdown_ai, age=age, gender=gender, extended_quota=extended_quota)
        
        # Tự động lưu bài luận giải vào lá số của người dùng
        chart_code = str(data.get("chart_code") or "").strip()
        chart_id = data.get("chart_id")
        reading_text = result.get("reading", "")
        if user and user.get("id") and reading_text:
            try:
                update_chart_reading(user_id=user["id"], chart_code=chart_code, reading_markdown=reading_text, chart_id=chart_id)
            except Exception:
                pass

        # Trừ 1 lượt sau khi luận giải thành công (Admin không bị trừ; Sandbox trừ vào phiên giả lập)
        if is_sandbox:
            _, remaining = deduct_session_sandbox_ai_credit(get_token_from_request())
            result["remaining_credits"] = remaining
            result["unlimited"] = False
        elif not is_admin and user and user.get("id"):
            success_deduct, remaining = deduct_user_ai_credit(user["id"])
            result["remaining_credits"] = remaining
            result["unlimited"] = False
        else:
            result["remaining_credits"] = 999999
            result["unlimited"] = True

        return jsonify(result), 200
    except Exception:
        logger.exception("Lỗi trong quá trình luận giải AI")
        return jsonify({
            "success": False,
            "error": "Hệ thống AI tạm thời gián đoạn. Vui lòng thử lại sau ít phút."
        }), 500


# Bộ nhớ đệm tạm thời cho các yêu cầu Deep-link / F5 qua chartHash
SERVER_CHART_CACHE = {}

@ai_bp.route("/chart-cache/<chart_hash>", methods=["GET"])
def get_chart_cache_endpoint(chart_hash):
    """Truy xuất thông tin lá số theo chartHash khi người dùng vào thẳng link hoặc F5."""
    if not _CHART_HASH_RE.match(str(chart_hash or "")):
        return jsonify({"success": False, "error": "Mã định danh lá số không hợp lệ."}), 400
    if chart_hash in SERVER_CHART_CACHE:
        return jsonify({"success": True, "data": SERVER_CHART_CACHE[chart_hash]}), 200
    return jsonify({"success": False, "error": "Không tìm thấy dữ liệu lá số trong bộ đệm máy chủ."}), 404

@ai_bp.route("/chart-cache", methods=["POST"])
def set_chart_cache_endpoint():
    """Lưu đệm thông tin lá số lên máy chủ (có kiểm tra định dạng và giới hạn dung lượng)."""
    data = request.get_json(silent=True) or {}
    chart_hash = str(data.get("chart_hash") or "").strip()
    payload = data.get("payload")
    if not _CHART_HASH_RE.match(chart_hash) or not isinstance(payload, dict):
        return jsonify({"success": False, "error": "Tham số chart_hash hoặc payload không hợp lệ."}), 400
    try:
        serialized_size = len(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
    except Exception:
        return jsonify({"success": False, "error": "Dữ liệu payload không thể tuần tự hóa."}), 400
    if serialized_size > MAX_CHART_CACHE_BYTES:
        return jsonify({"success": False, "error": "Dung lượng dữ liệu lá số vượt quá giới hạn cho phép."}), 413

    SERVER_CHART_CACHE[chart_hash] = payload
    if len(SERVER_CHART_CACHE) > 1000:
        first_key = next(iter(SERVER_CHART_CACHE))
        del SERVER_CHART_CACHE[first_key]
    return jsonify({"success": True}), 200

@ai_bp.route("/stream-interpret-chart", methods=["POST"])
def stream_interpret_chart_endpoint():
    """
    Luận giải trực tiếp thời gian thực qua Server-Sent Events (SSE).
    Đẩy từng chunk văn bản về client ngay khi mô hình Gemini sinh ra.
    """
    user = get_current_user_from_request()
    is_sandbox = bool(user and is_developer_user(user) and user.get("is_sandbox"))
    is_admin = False if is_sandbox else is_admin_or_developer(user)
    
    if not is_admin:
        if not user:
            return jsonify({
                "success": False,
                "code": "UNAUTHORIZED",
                "error": "Vui lòng đăng nhập tài khoản để sử dụng tính năng Luận giải AI."
            }), 401

        current_credits = int(user.get("ai_credits", 0))
        if current_credits <= 0:
            return jsonify({
                "success": False,
                "code": "OUT_OF_CREDITS",
                "error": "Tài khoản của bạn đã hết lượt luận giải lá số bằng AI. Vui lòng nạp thêm lượt để tiếp tục."
            }), 403

    data = request.get_json(silent=True) or {}
    markdown_ai = (data.get("markdown_ai") or "").strip()
    
    if not markdown_ai:
        return jsonify({
            "success": False,
            "error": "Thiếu dữ liệu markdown_ai!"
        }), 400

    age = data.get("age")
    gender = data.get("gender")

    remaining = 999999
    if is_sandbox:
        success_deduct, remaining = deduct_session_sandbox_ai_credit(get_token_from_request())
        if not success_deduct:
            return jsonify({"success": False, "error": "Không thể trừ lượt sử dụng giả lập."}), 403
    elif not is_admin and user and user.get("id"):
        success_deduct, remaining = deduct_user_ai_credit(user["id"])
        if not success_deduct:
            return jsonify({"success": False, "error": "Không thể trừ lượt sử dụng."}), 403

    extended_quota = bool(data.get("extended_quota", False))

    chart_code = str(data.get("chart_code") or "").strip()
    chart_id = data.get("chart_id")

    def generate_sse():
        # Phát tín hiệu bắt đầu kết nối
        start_payload = json.dumps({"type": "start", "status": "connected", "remaining_credits": remaining, "unlimited": is_admin})
        yield f"data: {start_payload}\n\n"
        
        full_reading = []
        try:
            for text_chunk in service.generate_streaming_reading(markdown_ai, age=age, gender=gender, extended_quota=extended_quota):
                full_reading.append(text_chunk)
                chunk_payload = json.dumps({"type": "chunk", "text": text_chunk})
                yield f"data: {chunk_payload}\n\n"
            
            # Tự động lưu toàn bộ bài luận giải tích lũy vào lá số
            complete_reading = "".join(full_reading).strip()
            if user and user.get("id") and complete_reading:
                try:
                    update_chart_reading(user_id=user["id"], chart_code=chart_code, reading_markdown=complete_reading, chart_id=chart_id)
                except Exception:
                    pass

            done_payload = json.dumps({"type": "done", "status": "completed"})
            yield f"data: {done_payload}\n\n"
        except Exception:
            logger.exception("Lỗi trong luồng SSE luận giải AI")
            err_payload = json.dumps({"type": "error", "error": "Quá trình luận giải gặp gián đoạn kỹ thuật. Vui lòng thử lại."})
            yield f"data: {err_payload}\n\n"

    return Response(stream_with_context(generate_sse()), content_type="text/event-stream")

@ai_bp.route("/ask", methods=["POST"])
@login_required
def ask_question_endpoint():
    """
    Tiếp nhận câu hỏi hỏi đáp tiếp nối sau khi đương số đã nhận bài luận giải lá số.
    Hạn mức độc lập tối đa: 10000 tokens (QA_MAX_OUTPUT_TOKENS) được đồng bộ phía Server.
    """
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"success": False, "error": "Vui lòng nhập câu hỏi của bạn."}), 400
    if len(question) > 2000:
        return jsonify({"success": False, "error": "Câu hỏi quá dài (tối đa 2.000 ký tự)."}), 400

    markdown_ai = (data.get("markdown_ai") or "").strip()[:120000]
    reading_text = (data.get("reading_text") or "").strip()[:120000]
    history = data.get("history") or []
    if not isinstance(history, list):
        history = []
    age = data.get("age")
    gender = data.get("gender")
    chart_code = str(data.get("chart_code") or "default_qa").strip()[:64] or "default_qa"

    user_id = g.current_user["id"]
    is_admin = is_admin_or_developer(g.current_user)
    server_tokens = 0 if is_admin else get_qa_accumulated_tokens(user_id, chart_code)
    try:
        client_tokens = max(0, int(data.get("accumulated_tokens", 0) or 0))
    except (TypeError, ValueError):
        client_tokens = 0
    accumulated_tokens = 0 if is_admin else max(server_tokens, client_tokens)

    try:
        res = service.answer_followup_question(
            question=question,
            markdown_ai=markdown_ai,
            reading_text=reading_text,
            history=history[-10:],
            age=age,
            gender=gender,
            accumulated_tokens=accumulated_tokens
        )
        if not is_admin and res.get("success"):
            updated_total = update_qa_accumulated_tokens(
                user_id=user_id,
                chart_code=chart_code,
                new_total_tokens=int(res.get("accumulated_tokens", accumulated_tokens) or accumulated_tokens),
                question=question,
                answer=res.get("answer", "")
            )
            res["accumulated_tokens"] = updated_total
            res["quota_exceeded"] = updated_total >= QA_MAX_OUTPUT_TOKENS
        return jsonify(res), 200
    except Exception:
        logger.exception("Lỗi trong quá trình phản hồi câu hỏi AI")
        return jsonify({
            "success": False,
            "error": "Không thể phản hồi câu hỏi lúc này. Vui lòng thử lại sau."
        }), 500


@ai_bp.route("/export-pdf", methods=["POST"])
@login_required
def export_pdf_endpoint():
    """
    Xuất bản bài luận giải Tử Vi Đẩu Số sang định dạng PDF chuẩn thương hiệu Tử Vi Hồng Ân.
    Yêu cầu đăng nhập và chỉ tiếp nhận chart_image dạng Base64 Data URL hợp lệ (chống LFI/SSRF).
    """
    import os
    import tempfile
    from modules.astrology.exporter.export_pdf import export_tuvi_to_pdf

    data = request.get_json(silent=True) or {}
    markdown_text = (data.get("markdown_text") or "").strip()
    if not markdown_text:
        return jsonify({"success": False, "error": "Thiếu nội dung bài luận giải markdown_text."}), 400
    if len(markdown_text) > 300000:
        return jsonify({"success": False, "error": "Nội dung bài luận vượt quá giới hạn cho phép."}), 413

    chart_image = data.get("chart_image")
    if chart_image is not None:
        if not isinstance(chart_image, str) or not chart_image.strip().startswith("data:image/"):
            return jsonify({"success": False, "error": "Định dạng ảnh lá số phải là Base64 Data URL hợp lệ."}), 400
        if len(chart_image) > 12 * 1024 * 1024:
            return jsonify({"success": False, "error": "Dung lượng ảnh lá số vượt quá giới hạn cho phép."}), 413

    title = str(data.get("title") or "Luận Giải Tử Vi Hồng Ân")[:150]
    raw_download_name = str(data.get("filename") or "Luan_Giai_Tu_Vi_Hong_An.pdf")
    safe_base = re.sub(r"[^a-zA-Z0-9._-]", "_", os.path.basename(raw_download_name)).strip("._")
    download_name = (safe_base if safe_base.lower().endswith(".pdf") else f"{safe_base or 'Luan_Giai_Tu_Vi_Hong_An'}.pdf")[:120]

    temp_pdf_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            temp_pdf_path = f.name

        export_res = export_tuvi_to_pdf(
            markdown_text=markdown_text,
            output_pdf_path=temp_pdf_path,
            chart_image_path_or_bytes=chart_image,
            title=title,
            page_width_mm=250.0,
            margin_mm=20.0,
            paged=False,
            allow_local_path=False
        )

        if not export_res.get("success") or not os.path.exists(temp_pdf_path):
            return jsonify({"success": False, "error": "Không thể kết xuất tài liệu PDF."}), 500

        with open(temp_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        response = Response(pdf_bytes, mimetype="application/pdf")
        response.headers["Content-Disposition"] = f'attachment; filename="{download_name}"'
        response.headers["Content-Length"] = str(len(pdf_bytes))
        return response

    except Exception:
        logger.exception("Lỗi khi xuất PDF bài luận giải")
        return jsonify({"success": False, "error": "Không thể kết xuất tài liệu PDF lúc này."}), 500
    finally:
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            try:
                os.remove(temp_pdf_path)
            except Exception:
                pass
