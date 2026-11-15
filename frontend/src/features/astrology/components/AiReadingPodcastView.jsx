// AiReadingPodcastView.jsx
/**
 * Giao diện Bài Luận Văn Podcast (Audio-Essay & Read-Along Monologue) Chuẩn Tử Vi Hồng Ân.
 * Tái cấu trúc thay thế UI Chatbox bong bóng cũ:
 * 1. Không gian đọc văn học thoáng đãng, sang trọng (Editorial Typography).
 * 2. Đọc bằng mắt (chủ yếu) kết hợp nghe bằng tai (Thanh điều khiển Audio Podcast / Giọng đọc AI TTS).
 * 3. Bảo mật Zero-Key: Gọi API qua backend nội bộ /api/ai/interpret-chart.
 * 4. F17: Cập nhật GPU scaleX mượt mà 60/120 FPS sub-pixel rAF, triệt tiêu layout shift.
 * 5. F18: Pointer drag scrubbing và chuyển tốc độ [1.0, 1.25, 1.5] liền mạch không ngắt câu.
 * 6. F19: Phản hồi xúc giác nút bấm active:scale(0.97) trong 120ms.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Copy,
  Check,
  Download,
  Headphones,
  RefreshCw,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { PODCAST_SECTIONS, ZALO_CONTACTS } from '../constants/astrologyConfig';
import { fetchAiInterpretation, sanitizeVietnameseReading } from '../services/aiReadingClient';
import { AudioPodcastService } from '../services/audioPodcastService';
import './AiReadingPodcastView.css';

const PLAYBACK_RATES = [1.0, 1.25, 1.5];

export default function AiReadingPodcastView({ onBack, markdownAi, chartData }) {
  const [loading, setLoading] = useState(false);
  const [readingData, setReadingData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Trạng thái Trình phát Audio Podcast
  const [playerState, setPlayerState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const [progressPercent, setProgressPercent] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const audioServiceRef = useRef(null);
  const contentContainerRef = useRef(null);
  const progressBarBgRef = useRef(null);
  const progressFillRef = useRef(null);
  const isDraggingRef = useRef(false);
  const displayPercentRef = useRef(0);
  const rafIdRef = useRef(null);

  const handleLoadReading = useCallback(async () => {
    setLoading(true);
    setError(null);

    const age = chartData?.am_lich?.nam_xem_han
      ? (chartData.am_lich.nam_xem_han - (chartData.am_lich.nam_sinh || chartData.duong_lich?.year || 1996) + 1)
      : (chartData?.tuoi_mu || 28);
    const gender = chartData?.gioi_tinh || 'Nam';

    try {
      const data = await fetchAiInterpretation({
        markdownAi,
        age,
        gender
      });
      setReadingData(data);
    } catch (err) {
      console.error('Lỗi khi tải AI Luận Giải:', err);
      setError(err.message || 'Đã xảy ra lỗi trong quá trình kết nối với AI.');
    } finally {
      setLoading(false);
    }
  }, [markdownAi, chartData]);

  // 1. Tải bản luận giải AI khi vào trang
  useEffect(() => {
    if (markdownAi && !readingData && !loading) {
      handleLoadReading();
    }
  }, [markdownAi, readingData, loading, handleLoadReading]);

  // 2. Khởi tạo Trình phát Audio khi có nội dung Markdown (F17 & F18)
  useEffect(() => {
    if (readingData?.reading_markdown) {
      audioServiceRef.current = new AudioPodcastService({
        onProgress: (idx, total, pct, progressRatio) => {
          if (typeof progressRatio === 'number' && progressFillRef.current && !isDraggingRef.current) {
            progressFillRef.current.style.transform = `scaleX(${progressRatio})`;
          }
          displayPercentRef.current = pct;
          setProgressPercent(pct);
        },
        onStateChange: (st) => {
          setPlayerState(st);
          if (st === 'idle' && progressFillRef.current && !isDraggingRef.current) {
            progressFillRef.current.style.transform = 'scaleX(0)';
          }
        },
        onComplete: () => {
          setPlayerState('idle');
          if (progressFillRef.current) {
            progressFillRef.current.style.transform = 'scaleX(1)';
          }
          displayPercentRef.current = 100;
          setProgressPercent(100);
        }
      });
      audioServiceRef.current.prepareText(readingData.reading_markdown);
    }

    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.destroy();
      }
    };
  }, [readingData]);

  // 3. Vòng lặp rAF 60/120 FPS cập nhật sub-pixel mượt mà khi đang phát (F17)
  useEffect(() => {
    if (playerState !== 'playing') {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const tick = () => {
      if (audioServiceRef.current && !isDraggingRef.current) {
        const progress = audioServiceRef.current.getCurrentProgress();
        if (progressFillRef.current) {
          progressFillRef.current.style.transform = `scaleX(${progress})`;
        }
        const pct = Math.round(progress * 100);
        if (pct !== displayPercentRef.current) {
          displayPercentRef.current = pct;
          setProgressPercent(pct);
        }
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [playerState]);

  // 4. Xử lý Play / Pause Audio
  function handleTogglePlay() {
    if (!audioServiceRef.current) return;
    if (playerState === 'playing') {
      audioServiceRef.current.pause();
    } else {
      audioServiceRef.current.play();
    }
  }

  function handleStop() {
    if (audioServiceRef.current) {
      audioServiceRef.current.stop();
    }
    if (progressFillRef.current) {
      progressFillRef.current.style.transform = 'scaleX(0)';
    }
    displayPercentRef.current = 0;
    setProgressPercent(0);
  }

  function handleChangeSpeed() {
    if (!audioServiceRef.current) return;
    const nextIdx = (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length;
    const nextRate = PLAYBACK_RATES[nextIdx];
    setPlaybackRate(nextRate);
    audioServiceRef.current.setRate(nextRate);
  }

  // 5. Pointer Drag Scrubber Handlers (F18)
  const updateScrub = useCallback((clientX) => {
    if (!progressBarBgRef.current) return 0;
    const rect = progressBarBgRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    // Cập nhật GPU transform trực tiếp tức thì 120 FPS
    if (progressFillRef.current) {
      progressFillRef.current.style.transform = `scaleX(${ratio})`;
    }
    const pct = Math.round(ratio * 100);
    if (pct !== displayPercentRef.current) {
      displayPercentRef.current = pct;
      setProgressPercent(pct);
    }
    return ratio;
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (!progressBarBgRef.current || !audioServiceRef.current) return;
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_err) {
      // Bỏ qua lỗi nếu pointer capture không khả dụng
    }
    updateScrub(e.clientX);
  }, [updateScrub]);

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    updateScrub(e.clientX);
  }, [updateScrub]);

  const handlePointerUp = useCallback((e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_err) {
      // Bỏ qua lỗi
    }
    const finalRatio = updateScrub(e.clientX);
    if (audioServiceRef.current) {
      audioServiceRef.current.jumpToRatio(finalRatio);
    }
  }, [updateScrub]);

  const handlePointerCancel = useCallback((e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_err) {
      // Bỏ qua lỗi
    }
    const finalRatio = updateScrub(e.clientX);
    if (audioServiceRef.current) {
      audioServiceRef.current.jumpToRatio(finalRatio);
    }
  }, [updateScrub]);

  // 6. Nhảy nhanh đến các đề mục La Mã (I đến V)
  function handleJumpToSection(sec) {
    const el = document.getElementById(sec.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // 7. Sao chép và tải về
  function handleCopyAll() {
    if (!readingData?.reading_markdown) return;
    navigator.clipboard.writeText(sanitizeVietnameseReading(readingData.reading_markdown));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadMarkdown() {
    if (!readingData?.reading_markdown) return;
    const cleanMd = sanitizeVietnameseReading(readingData.reading_markdown);
    const blob = new Blob([cleanMd], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Luan-Giai-Tu-Vi-${readingData.metadata?.name || 'Hong-An'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 8. Biên dịch Markdown sang cấu trúc HTML có ID định danh cho 5 phần
  const renderedContentHtml = useMemo(() => {
    const raw = sanitizeVietnameseReading(readingData?.reading_markdown || '');
    if (!raw) return '';

    // Xử lý blockquote liên tục (đặc biệt là bài thơ phú 4 câu)
    let processed = raw.replace(/(?:^>[ \t]?(?:.*(?:\r?\n|$)))+/gm, (block) => {
      const lines = block
        .split(/\r?\n/)
        .map(l => l.replace(/^>[ \t]?/, '').trim())
        .filter(Boolean);
      const innerText = lines.join('<br />');
      const isPoem = innerText.startsWith('*') && innerText.endsWith('*');
      const cleanInner = isPoem ? innerText.slice(1, -1) : innerText;
      return `<blockquote class="${isPoem ? 'podcast-poem' : 'podcast-quote'}">${cleanInner}</blockquote>\n\n`;
    });

    // Gán ID cho 5 đề mục chính và định dạng các thẻ cơ bản
    processed = processed
      .replace(/^##\s*I\.\s*(.*$)/gim, '<h2 id="sec-1" class="podcast-h2">## I. $1</h2>')
      .replace(/^##\s*II\.\s*(.*$)/gim, '<h2 id="sec-2" class="podcast-h2">## II. $1</h2>')
      .replace(/^##\s*III\.\s*(.*$)/gim, '<h2 id="sec-3" class="podcast-h2">## III. $1</h2>')
      .replace(/^##\s*IV\.\s*(.*$)/gim, '<h2 id="sec-4" class="podcast-h2">## IV. $1</h2>')
      .replace(/^##\s*V\.\s*(.*$)/gim, '<h2 id="sec-5" class="podcast-h2">## V. $1</h2>')
      .replace(/^###\s*(.*$)/gim, '<h3 class="podcast-h3">### $1</h3>')
      .replace(/^---$/gim, '<hr class="podcast-hr" />')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="podcast-italic">$1</em>')
      .replace(/^\s*[-*]\s+(.*$)/gim, '<li class="podcast-li">$1</li>');

    const paragraphs = processed.split('\n\n');
    return paragraphs.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h2') || trimmed.startsWith('<h3') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) {
        return trimmed;
      }
      if (trimmed.startsWith('<li')) {
        return `<ul class="podcast-ul">${trimmed}</ul>`;
      }
      return `<p class="podcast-p">${trimmed}</p>`;
    }).join('\n');
  }, [readingData]);

  return (
    <div className="podcast-page-root">
      {/* 1. TOP STICKY BAR */}
      <header className="podcast-topbar">
        <button
          type="button"
          className="podcast-back-btn"
          onClick={onBack}
          aria-label="Quay lại lá số"
        >
          <ArrowLeft size={16} />
          <span>Quay lại lá số</span>
        </button>

        <div className="podcast-brand-badge">
          <Sparkles size={16} />
          <span>Tử Vi Hồng Ân • Podcast Mệnh Vận 1-1</span>
        </div>

        {/* CÁC NÚT NHẢY NHANH ĐỀ MỤC */}
        <nav className="podcast-nav-pills" aria-label="Điều hướng đề mục bài viết">
          {PODCAST_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              className="podcast-pill-btn"
              onClick={() => handleJumpToSection(sec)}
            >
              {sec.label}
            </button>
          ))}
        </nav>

        {/* THAO TÁC COPY & DOWNLOAD */}
        <div className="podcast-actions">
          <button
            type="button"
            className="podcast-action-btn"
            onClick={handleCopyAll}
            title="Sao chép toàn bộ bài luận giải"
          >
            {copied ? <Check size={15} color="#22c55e" /> : <Copy size={15} />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
          </button>
          <button
            type="button"
            className="podcast-action-btn"
            onClick={handleDownloadMarkdown}
            title="Tải tệp Markdown (.md) về máy"
          >
            <Download size={15} />
            <span>Tải .md</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN READING AREA */}
      <main className="podcast-main-container" ref={contentContainerRef}>
        {loading && (
          <div className="podcast-loading-wrap">
            <div className="podcast-spinner" />
            <h3 className="podcast-loading-title">Đang chiêm nghiệm tinh bàn...</h3>
            <p className="podcast-loading-desc">
              Tử Vi Hồng Ân đang phối hợp 12 cung địa bàn, trục tam hợp Mệnh - Tài - Quan và vận hạn 3 năm liên tiếp để biên soạn bài luận văn podcast hoàn chỉnh.
            </p>
          </div>
        )}

        {error && (
          <div className="podcast-error-wrap">
            <h3 className="podcast-loading-title" style={{ color: '#ef4444' }}>
              Không thể tải bài luận giải
            </h3>
            <p className="podcast-loading-desc">{error}</p>
            <button
              type="button"
              className="podcast-retry-btn"
              onClick={handleLoadReading}
            >
              <RefreshCw size={15} style={{ display: 'inline', marginRight: 6 }} />
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && readingData && (
          <>
            {/* HERO BANNER */}
            <section className="podcast-hero-header">
              <p className="podcast-eyebrow">Audio-Essay & Read-Along Monologue</p>
              <h1 className="podcast-main-title">
                Bài Luận Văn Mệnh Vận: {readingData.metadata?.name || 'Hữu Duyên'}
              </h1>

              <div className="podcast-meta-tags">
                <span className="podcast-tag">Bản Mệnh: {readingData.metadata?.nap_am}</span>
                <span className="podcast-tag">Cục Số: {readingData.metadata?.cuc}</span>
                <span className="podcast-tag">{readingData.metadata?.than_cu}</span>
                <span className="podcast-tag">Năm xem hạn: {readingData.metadata?.limit_year}</span>
                <span className="podcast-tag">Dung lượng: {readingData.benchmark?.word_count || readingData.word_count || 2700} từ</span>
                {Boolean(readingData.benchmark?.thoughtsTokenCount) && (
                  <span 
                    className="podcast-tag" 
                    title={`Thinking Tokens: ${readingData.benchmark.thoughtsTokenCount.toLocaleString()} | Candidates Tokens: ${(readingData.benchmark.candidatesTokenCount || 0).toLocaleString()}`}
                  >
                    ✨ Suy luận sâu: {readingData.benchmark.thoughtsTokenCount.toLocaleString()} tokens
                  </span>
                )}
              </div>
            </section>

            {/* BÀI VIẾT NGHỊ LUẬN TOÀN TRANG */}
            <article
              className="podcast-essay-content"
              dangerouslySetInnerHTML={{ __html: renderedContentHtml }}
            />

            {/* KHỐI KÊU GỌI HÀNH ĐỘNG (CTA) */}
            <section className="podcast-cta-card">
              <h3 className="podcast-cta-title">Tư Vấn Chuyên Sâu Cùng Quý Thầy Tử Vi Hồng Ân</h3>
              <p className="podcast-cta-desc">
                Nếu cần trao đổi chi tiết hơn về các cơ duyên, vận hạn hoặc định hướng quan trọng trong đời, Tử Vi Hồng Ân mời {readingData.metadata?.pronoun || 'Quý anh'} kết nối trực tiếp với các Thầy qua Zalo.
              </p>
              <div className="podcast-cta-buttons">
                {ZALO_CONTACTS.map((contact) => (
                  <a
                    key={contact.phone}
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="podcast-zalo-btn"
                  >
                    <MessageCircle size={17} />
                    <span>{contact.label}: {contact.phone}</span>
                  </a>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* 3. DOCKED BOTTOM AUDIO PODCAST PLAYER */}
      {!loading && !error && readingData && (
        <aside className="podcast-docked-player" aria-label="Thanh điều khiển Audio Podcast">
          <div className="podcast-player-left">
            <button
              type="button"
              className="podcast-play-btn"
              onClick={handleTogglePlay}
              aria-label={playerState === 'playing' ? 'Tạm dừng giọng đọc' : 'Bắt đầu nghe giọng đọc'}
            >
              {playerState === 'playing' ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
            </button>
            <div className="podcast-player-status">
              <span className="podcast-status-title">
                {playerState === 'playing' ? 'Đang phát Giọng đọc Podcast' : (playerState === 'paused' ? 'Đang tạm dừng' : 'Giọng đọc Podcast 1-1')}
              </span>
              <span className="podcast-status-sub">
                Ngôn ngữ nói & viết hài hòa • Nhịp thở 16 - 25 từ
              </span>
            </div>
          </div>

          <div className="podcast-player-center">
            <span className="podcast-progress-text">{progressPercent}%</span>
            <div
              ref={progressBarBgRef}
              className="podcast-progress-bar-bg"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              role="slider"
              aria-label="Tiến độ phát bài luận"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              tabIndex={0}
              onKeyDown={(e) => {
                if (!audioServiceRef.current) return;
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const newRatio = Math.min(1, (displayPercentRef.current + 5) / 100);
                  audioServiceRef.current.jumpToRatio(newRatio);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const newRatio = Math.max(0, (displayPercentRef.current - 5) / 100);
                  audioServiceRef.current.jumpToRatio(newRatio);
                }
              }}
            >
              <div
                ref={progressFillRef}
                className="podcast-progress-bar-fill"
              />
            </div>
            <Headphones size={16} color="#d4af37" />
          </div>

          <div className="podcast-player-right">
            <button
              type="button"
              className="podcast-speed-btn"
              onClick={handleChangeSpeed}
              title="Thay đổi tốc độ đọc"
            >
              {playbackRate}x
            </button>
            {playerState !== 'idle' && (
              <button
                type="button"
                className="podcast-stop-btn"
                onClick={handleStop}
                title="Dừng phát và quay về đầu"
              >
                <Square size={16} />
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
