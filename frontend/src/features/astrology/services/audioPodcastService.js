// audioPodcastService.js
/**
 * Trình quản lý phát Audio Podcast / Giọng đọc AI TTS cho bài luận văn Tử Vi.
 * Sử dụng Web SpeechSynthesis API bản địa, tự động nhận diện giọng tiếng Việt và chia nhỏ câu theo nhịp thở 16 - 25 từ.
 * Hỗ trợ:
 * - Sub-pixel rAF fractional progress calculation (0.0 -> 1.0) (F17)
 * - Seamless non-disruptive playback rate switching (tiếp tục câu đang nói, không phát lại từ đầu) (F18)
 * - Real-time timeline scrubbing theo tỉ lệ ký tự thực tế (F18)
 */

import { sanitizeVietnameseReading } from './aiReadingClient';

export class AudioPodcastService {
  constructor({ onProgress, onStateChange, onComplete } = {}) {
    this.onProgress = onProgress || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.onComplete = onComplete || (() => {});

    this.sentences = [];
    this.sentenceStartChars = [];
    this.totalChars = 0;
    this.currentIndex = 0;
    this.currentCharIndex = 0;
    this.currentSentenceCharOffset = 0;
    this.sentenceStartTime = null;
    this.pauseTime = null;
    this._isRateSwitching = false;

    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 1.0;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voice = null;

    if (this.synth) {
      this._initVoice();
      if (typeof window !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this._initVoice();
      }
    }
  }

  _initVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Ưu tiên giọng tiếng Việt
    this.voice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI')) || null;
  }

  /**
   * Tách văn bản Markdown thành danh sách câu hoàn chỉnh theo nhịp thở êm tai,
   * đồng thời tính toán tổng ký tự và mảng offset ký tự cho việc scrub chính xác.
   */
  prepareText(markdownText) {
    if (!markdownText) {
      this.sentences = [];
      this.sentenceStartChars = [];
      this.totalChars = 0;
      return;
    }

    // Làm sạch ký tự ngoại lai (CJK, Hangul, Cyrillic...) và Markdown trước khi đưa vào SpeechSynthesis
    const cleanText = sanitizeVietnameseReading(markdownText)
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/^\s*>\s*/gm, '')
      .replace(/---/g, '')
      .trim();

    // Tách theo dấu chấm, chấm than, chấm hỏi, hoặc ngắt dòng
    const rawSegments = cleanText.split(/(?<=[.!?\n])\s+/);
    
    this.sentences = rawSegments
      .map(s => s.trim())
      .filter(s => s.length > 2 && !s.startsWith('#'));

    // Tính toán mảng vị trí ký tự đầu mỗi câu để scrub chính xác theo dung lượng nội dung
    let sum = 0;
    this.sentenceStartChars = [];
    for (let i = 0; i < this.sentences.length; i++) {
      this.sentenceStartChars.push(sum);
      sum += this.sentences[i].length;
    }
    this.totalChars = Math.max(1, sum);

    this.currentIndex = 0;
    this.currentCharIndex = 0;
    this.currentSentenceCharOffset = 0;
    this.sentenceStartTime = null;
    this.pauseTime = null;
    this._isRateSwitching = false;
  }

  /**
   * Tính toán tỉ lệ tiến độ sub-pixel tức thời (từ 0.0 đến 1.0) cho rAF 60/120 FPS.
   */
  getCurrentProgress() {
    if (!this.sentences || this.sentences.length === 0) return 0;
    if (this.currentIndex >= this.sentences.length) return 1;

    const sentenceStart = this.sentenceStartChars[this.currentIndex] || 0;
    const sentenceLen = this.sentences[this.currentIndex]?.length || 1;

    let intraChars = this.currentCharIndex || 0;

    // Khi đang phát và không tạm dừng: nội suy bước chạy theo thời gian thực (16 ký tự/giây x rate)
    if (this.isPlaying && !this.isPaused && this.sentenceStartTime) {
      const elapsedSec = (performance.now() - this.sentenceStartTime) / 1000;
      const estimatedChars = elapsedSec * 16 * this.rate;
      const timeBasedChars = Math.min(sentenceLen * 0.98, estimatedChars);
      intraChars = Math.max(intraChars, timeBasedChars);
    }

    const currentChars = sentenceStart + Math.min(sentenceLen, intraChars);
    return Math.max(0, Math.min(1, currentChars / this.totalChars));
  }

  play() {
    if (!this.synth || this.sentences.length === 0) return;

    if (this.isPaused) {
      this.synth.resume();
      if (this.pauseTime && this.sentenceStartTime) {
        // Cộng bù khoảng thời gian đã tạm dừng để giữ nhịp nội suy chính xác
        this.sentenceStartTime += (performance.now() - this.pauseTime);
      }
      this.pauseTime = null;
      this.isPaused = false;
      this.isPlaying = true;
      this.onStateChange('playing');
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.onStateChange('playing');
    this._speakCurrent();
  }

  pause() {
    if (!this.synth) return;
    this.synth.pause();
    this.pauseTime = performance.now();
    this.isPaused = true;
    this.isPlaying = false;
    this.onStateChange('paused');
  }

  stop() {
    if (!this.synth) return;
    this._isRateSwitching = false;
    this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentIndex = 0;
    this.currentCharIndex = 0;
    this.currentSentenceCharOffset = 0;
    this.sentenceStartTime = null;
    this.pauseTime = null;
    this.onStateChange('idle');
    this.onProgress(0, this.sentences.length, 0, 0);
  }

  /**
   * Thay đổi tốc độ phát không gián đoạn:
   * Nếu đang phát một câu, tiếp tục phát các từ còn lại với tốc độ mới mà KHÔNG phát lại từ đầu câu.
   */
  setRate(newRate) {
    const validRate = Number(newRate) || 1.0;
    this.rate = validRate;

    if (!this.synth || !this.isPlaying || this.currentIndex >= this.sentences.length) {
      return;
    }

    const currentText = this.sentences[this.currentIndex];
    if (!currentText) return;

    // Xác định vị trí ký tự đã nói đến
    let charIdx = this.currentCharIndex || 0;
    if (!charIdx && this.sentenceStartTime) {
      const elapsedSec = (performance.now() - this.sentenceStartTime) / 1000;
      const estimatedChars = Math.floor(elapsedSec * 16 * this.rate);
      charIdx = Math.min(currentText.length, estimatedChars);
    }

    const remaining = currentText.slice(charIdx).trim();

    // Nếu còn hơn 10 ký tự: ngắt và đọc tiếp phần còn lại với tốc độ mới
    if (remaining.length > 10) {
      this._isRateSwitching = true;
      this.synth.cancel();

      // Tick nhỏ 15ms để engine Web Speech giải phóng trạng thái hủy
      setTimeout(() => {
        this._speakRemaining(remaining, charIdx);
      }, 15);
    }
    // Nếu câu đã gần hết (< 10 ký tự), câu sẽ tự kết thúc và câu sau nhận tốc độ mới
  }

  _speakRemaining(remainingText, charOffset) {
    if (!this.synth || !this.isPlaying) {
      this._isRateSwitching = false;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(remainingText);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.lang = 'vi-VN';
    utterance.rate = this.rate;

    this.currentSentenceCharOffset = charOffset;
    this.currentCharIndex = charOffset;
    this.sentenceStartTime = performance.now();

    utterance.onboundary = (e) => {
      if (e.name === 'word' || typeof e.charIndex === 'number') {
        this.currentCharIndex = charOffset + e.charIndex;
      }
    };

    utterance.onend = () => {
      this._isRateSwitching = false;
      this.currentSentenceCharOffset = 0;
      this.currentCharIndex = 0;
      if (this.isPlaying && !this.isPaused) {
        this.currentIndex++;
        this._speakCurrent();
      }
    };

    utterance.onerror = (e) => {
      this._isRateSwitching = false;
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        this.currentSentenceCharOffset = 0;
        this.currentCharIndex = 0;
        this.currentIndex++;
        this._speakCurrent();
      }
    };

    this.synth.speak(utterance);
  }

  /**
   * Nhảy đến câu theo chỉ số nguyên.
   */
  jumpTo(index) {
    if (index >= 0 && index < this.sentences.length) {
      this.currentIndex = index;
      this.currentCharIndex = 0;
      this.currentSentenceCharOffset = 0;
      this.sentenceStartTime = performance.now();
      if (this.isPlaying) {
        this._isRateSwitching = false;
        this.synth.cancel();
        setTimeout(() => {
          this._speakCurrent();
        }, 15);
      } else {
        const progress = this.sentenceStartChars[this.currentIndex] / this.totalChars;
        const percent = Math.round(progress * 100);
        this.onProgress(this.currentIndex, this.sentences.length, percent, progress);
      }
    }
  }

  /**
   * Nhảy đến vị trí chính xác theo tỉ lệ kéo thả timeline (0.0 đến 1.0).
   */
  jumpToRatio(ratio) {
    if (this.sentences.length === 0) return;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const targetChar = Math.round(clampedRatio * this.totalChars);

    let targetIdx = this.sentences.length - 1;
    for (let i = 0; i < this.sentences.length; i++) {
      const start = this.sentenceStartChars[i];
      const end = (i + 1 < this.sentences.length) ? this.sentenceStartChars[i + 1] : this.totalChars;
      if (targetChar >= start && targetChar < end) {
        targetIdx = i;
        break;
      }
    }

    this.jumpTo(targetIdx);
  }

  _speakCurrent() {
    if (!this.synth || !this.isPlaying || this.currentIndex >= this.sentences.length) {
      this.isPlaying = false;
      this.isPaused = false;
      this.onStateChange('idle');
      this.onComplete();
      return;
    }

    const text = this.sentences[this.currentIndex];
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.lang = 'vi-VN';
    utterance.rate = this.rate;

    this.currentCharIndex = 0;
    this.currentSentenceCharOffset = 0;
    this.sentenceStartTime = performance.now();

    utterance.onboundary = (e) => {
      if (e.name === 'word' || typeof e.charIndex === 'number') {
        this.currentCharIndex = e.charIndex;
      }
    };

    const currentProgress = this.getCurrentProgress();
    const percent = Math.round(currentProgress * 100);
    this.onProgress(this.currentIndex, this.sentences.length, percent, currentProgress);

    utterance.onend = () => {
      if (this._isRateSwitching) return;
      if (this.isPlaying && !this.isPaused) {
        this.currentIndex++;
        this._speakCurrent();
      }
    };

    utterance.onerror = (e) => {
      if (this._isRateSwitching) return;
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        this.currentIndex++;
        this._speakCurrent();
      }
    };

    this.synth.speak(utterance);
  }

  destroy() {
    if (this.synth) {
      this._isRateSwitching = false;
      this.synth.cancel();
    }
  }
}
