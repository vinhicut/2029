/**
 * export-engine.js
 * Quản lý xuất bản lá số: PDF CMYK chuẩn in offset, PDF Đen trắng in laser, và Ảnh 4K A4 (300 DPI).
 * Đã loại bỏ chuỗi Base64 218KB, sử dụng trực tiếp tài nguyên logo và sửa lỗi watermark.
 */

function showExportToast(_msg, _spinning = true) {}

function hideExportToast(_delay = 2500) {}

let _isExportInProgress = false;

const EXPORT_SPINNER_SVG = `<svg class="btn-export-spinner" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
const EXPORT_DONE_SVG = `<svg class="btn-export-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

function isMobileExportViewport() {
    if (document.body.classList.contains('viewport-mobile')) return true;
    if (typeof window !== 'undefined' && window.innerWidth <= 580) return true;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    return false;
}

function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function sleepMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function yieldToMainThread() {
    await sleepMs(0);
}

function resolveTriggerButton(triggerBtn, fallbackClass) {
    if (triggerBtn && triggerBtn.nodeType === 1) return triggerBtn;
    const evtTarget = typeof window !== 'undefined' && window.event && window.event.target && window.event.target.closest
        ? window.event.target.closest('.btn-export')
        : null;
    if (evtTarget) return evtTarget;
    if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('btn-export')) {
        return document.activeElement;
    }
    if (fallbackClass) {
        return document.querySelector(`.btn-export.${fallbackClass}`);
    }
    return null;
}

function setExportButtonsDisabled(disabled) {
    document.querySelectorAll('.btn-export').forEach((btn) => {
        btn.disabled = disabled;
    });
}

function restoreExportButtonIcon(btn) {
    if (!btn) return;
    if (btn.dataset.origIconHtml) {
        const curIcon = btn.querySelector('.btn-export-spinner, .btn-export-icon');
        if (curIcon) {
            curIcon.outerHTML = btn.dataset.origIconHtml;
        }
        delete btn.dataset.origIconHtml;
    }
}

function setExportButtonVisualState(activeBtn, phase) {
    const allBtns = Array.from(document.querySelectorAll('.btn-export'));
    allBtns.forEach((btn) => {
        btn.classList.remove('is-export-pressing', 'is-exporting', 'is-export-muted', 'is-export-done');
        if (phase === 'idle') {
            btn.disabled = false;
            restoreExportButtonIcon(btn);
            return;
        }
        if (activeBtn && btn === activeBtn) {
            btn.disabled = false;
            if (!btn.dataset.origIconHtml) {
                const iconEl = btn.querySelector('.btn-export-icon');
                if (iconEl) btn.dataset.origIconHtml = iconEl.outerHTML;
            }
            if (phase === 'pressing') {
                btn.classList.add('is-export-pressing');
                const curIcon = btn.querySelector('.btn-export-icon, .btn-export-spinner');
                if (curIcon && !curIcon.classList.contains('btn-export-spinner')) {
                    curIcon.outerHTML = EXPORT_SPINNER_SVG;
                }
            } else if (phase === 'exporting') {
                btn.classList.add('is-exporting');
                const curIcon = btn.querySelector('.btn-export-icon, .btn-export-spinner');
                if (curIcon && !curIcon.classList.contains('btn-export-spinner')) {
                    curIcon.outerHTML = EXPORT_SPINNER_SVG;
                }
            } else if (phase === 'done') {
                btn.classList.add('is-export-done');
                const curIcon = btn.querySelector('.btn-export-icon, .btn-export-spinner');
                if (curIcon) {
                    curIcon.outerHTML = EXPORT_DONE_SVG;
                }
            }
        } else {
            btn.classList.add('is-export-muted');
            btn.disabled = true;
        }
    });
}

/**
 * Điều phối xuất tệp ưu tiên phản hồi UI tức thì trên Mobile:
 * 1) Phát hiệu ứng nhấn nút + spinner ngay ở frame 0.
 * 2) Nhường trình duyệt hoàn tất animation phản hồi (~240ms trên Mobile) trước khi bắt đầu html2canvas/pixel loop.
 * 3) Trả kết quả bằng hiệu ứng hoàn tất trước khi khôi phục trạng thái nghỉ.
 */
async function runDeferredExport(triggerBtn, fallbackClass, exportTaskFn, errorLabel) {
    if (_isExportInProgress) return;
    _isExportInProgress = true;

    const activeBtn = resolveTriggerButton(triggerBtn, fallbackClass);
    const isMobile = isMobileExportViewport();
    let succeeded = false;

    try {
        setExportButtonVisualState(activeBtn, 'pressing');
        await nextFrame();
        await sleepMs(105);

        setExportButtonVisualState(activeBtn, 'exporting');
        await nextFrame();
        await sleepMs(isMobile ? 160 : 50);

        await exportTaskFn();
        succeeded = true;
    } catch (e) {
        console.error(errorLabel || 'Lỗi khi xuất lá số:', e);
    } finally {
        if (succeeded && activeBtn) {
            setExportButtonVisualState(activeBtn, 'done');
            await sleepMs(650);
        }
        setExportButtonVisualState(null, 'idle');
        _isExportInProgress = false;
    }
}

function getExportFileName(ext, variant = '') {
    const nameEl = document.getElementById('txtName');
    let name = nameEl ? nameEl.value.trim() : '';
    if (!name && window.currentChartData && window.currentChartData.thien_ban) {
        name = window.currentChartData.thien_ban.ho_ten || '';
    }
    const safeName = name.replace(/[/\\:*?"<>|]/g, '').trim() || 'La-so-Tu-Vi';
    const suffix = variant ? ` ${variant}` : '';
    return `${safeName}${suffix}.${ext}`;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 150);
}

const EXPORT_BOARD_WIDTH = 737;
const EXPORT_BOARD_HEIGHT = 1013;

let _inlinedExportCssPromise = null;

function shouldIncludeExportSheet(sheet) {
    if (!sheet) return false;
    const href = (sheet.href || '').toLowerCase();
    if (!href) return true;
    if (href.includes('controls.css') || href.includes('print.css')) return false;
    return href.includes('theme.css') || href.includes('board.css') || href.includes('fonts.googleapis.com');
}

function filterDesktopMediaCssText(rules) {
    const out = [];
    for (const rule of Array.from(rules || [])) {
        if (typeof CSSMediaRule !== 'undefined' && rule instanceof CSSMediaRule) {
            const cond = (rule.conditionText || rule.media?.mediaText || '').toLowerCase();
            if (cond.includes('max-width') || cond.includes('hover: none') || cond.includes('pointer: coarse') || cond.includes('print')) {
                continue;
            }
        }
        out.push(rule.cssText);
    }
    return out.join('\n');
}

async function fetchWithTimeout(url, timeoutMs = 3000) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const resp = await fetch(url, controller ? { signal: controller.signal } : undefined);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function inlineExternalAssetUrls(cssText) {
    const urlMatches = [...new Set([...cssText.matchAll(/url\((['"]?)(https?:\/\/[^'")]+)\1\)/g)].map(m => m[2]))];
    let embeddedCount = 0;
    await Promise.all(urlMatches.map(async (url) => {
        try {
            const resp = await fetchWithTimeout(url, 3000);
            const blob = await resp.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const fr = new FileReader();
                fr.onloadend = () => resolve(fr.result);
                fr.onerror = reject;
                fr.readAsDataURL(blob);
            });
            if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                cssText = cssText.split(url).join(dataUrl);
                embeddedCount++;
            }
        } catch (_err) {
            /* Bỏ qua từng font lẻ nếu lỗi mạng; kiểm tra embeddedCount phía dưới */
        }
    }));
    cssText = cssText.replace(/url\((['"]?)\.\.\/assets\/[^'")]+?\1\)/g, 'none');
    return { cssText, totalExternalUrls: urlMatches.length, embeddedCount };
}

function getExportBaseCss() {
    if (_inlinedExportCssPromise) return _inlinedExportCssPromise;
    _inlinedExportCssPromise = (async () => {
        const chunks = [];
        for (const sheet of Array.from(document.styleSheets || [])) {
            if (!shouldIncludeExportSheet(sheet)) continue;
            try {
                chunks.push(filterDesktopMediaCssText(sheet.cssRules));
            } catch (_corsErr) {
                if (sheet.href) {
                    try {
                        const resp = await fetchWithTimeout(sheet.href, 3000);
                        chunks.push(await resp.text());
                    } catch (_fetchErr) {}
                }
            }
        }
        const rawCss = chunks.join('\n');
        const inlined = await inlineExternalAssetUrls(rawCss);
        if (inlined.totalExternalUrls > 0 && inlined.embeddedCount === 0) {
            _inlinedExportCssPromise = null;
            return null;
        }
        const normalizedCss = `${inlined.cssText}
            *, *::before, *::after {
                animation: none !important;
                transition: none !important;
            }
            .badge-tuan-triet:not(.is-hidden) {
                opacity: 1 !important;
            }
            .rel-line-triad, .rel-line-opposite, .rel-line-harmonic {
                opacity: 1 !important;
                stroke-dashoffset: 0 !important;
            }
        `.replace(/]]>/g, ']]]]><![CDATA[>');
        return normalizedCss;
    })();
    return _inlinedExportCssPromise;
}

function buildNormalizedBoardClone(wrapper, options = {}) {
    const cloneWrapper = wrapper.cloneNode(true);
    cloneWrapper.classList.remove('is-zoomed');
    cloneWrapper.querySelectorAll('script').forEach(s => s.remove());
    cloneWrapper.style.transform = 'none';
    cloneWrapper.style.transformOrigin = 'top left';
    cloneWrapper.style.width = `${EXPORT_BOARD_WIDTH}px`;
    cloneWrapper.style.height = `${EXPORT_BOARD_HEIGHT}px`;
    cloneWrapper.style.margin = '0';
    cloneWrapper.style.padding = '0';
    cloneWrapper.style.boxSizing = 'content-box';
    cloneWrapper.style.zoom = '1';
    cloneWrapper.style.overflow = 'hidden';
    cloneWrapper.style.borderRadius = '8px';
    cloneWrapper.style.contain = 'none';

    const cloneBoard = cloneWrapper.querySelector('#tuviBoard');
    if (cloneBoard) {
        cloneBoard.classList.remove('is-updating');
        cloneBoard.style.opacity = '1';
        cloneBoard.style.transform = 'none';
        cloneBoard.style.transformOrigin = 'top left';
        cloneBoard.style.width = `${EXPORT_BOARD_WIDTH}px`;
        cloneBoard.style.height = `${EXPORT_BOARD_HEIGHT}px`;
        cloneBoard.style.contain = 'none';
        cloneBoard.style.setProperty('--mobile-board-border', '2px');
        cloneBoard.style.setProperty('--mobile-board-gap', '2px');
        cloneBoard.style.setProperty('--mobile-board-radius', '8px');
        cloneBoard.style.setProperty('--mobile-house-inner-radius', '6px');
        cloneBoard.querySelectorAll('.house.is-hovered').forEach(h => h.classList.remove('is-hovered'));
    }

    const cloneStale = cloneWrapper.querySelector('#tuviStaleOverlay');
    if (cloneStale) cloneStale.remove();
    const cloneLoading = cloneWrapper.querySelector('#tuviLoadingOverlay');
    if (cloneLoading) cloneLoading.remove();

    if (options.watermarkOpacity) {
        const cloneWm = cloneWrapper.querySelector('.tb-watermark-bg');
        if (cloneWm) cloneWm.style.opacity = options.watermarkOpacity;
    }

    return cloneWrapper;
}

async function captureBoardViaForeignObject(wrapper, scale = 3.5, options = {}) {
    const cssText = await getExportBaseCss();
    if (!cssText) return null;

    const cloneWrapper = buildNormalizedBoardClone(wrapper, options);
    const xhtml = new XMLSerializer().serializeToString(cloneWrapper);
    const outW = Math.round(EXPORT_BOARD_WIDTH * scale);
    const outH = Math.round(EXPORT_BOARD_HEIGHT * scale);

    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${EXPORT_BOARD_WIDTH} ${EXPORT_BOARD_HEIGHT}"><foreignObject x="0" y="0" width="${EXPORT_BOARD_WIDTH}" height="${EXPORT_BOARD_HEIGHT}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${EXPORT_BOARD_WIDTH}px;height:${EXPORT_BOARD_HEIGHT}px;background:#ffffff;margin:0;padding:0;"><style><![CDATA[${cssText}]]></style>${xhtml}</div></foreignObject></svg>`;
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);

    const img = new Image();
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('SVG foreignObject load failed'));
        img.src = svgDataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);

    // Xác minh canvas không bị tainted trước khi trả về cho bước đọc pixel PDF/PNG
    ctx.getImageData(0, 0, 1, 1);
    return canvas;
}

function resolveTuanTrietBadgesForHtml2Canvas(cloneBoard) {
    if (!cloneBoard) return;
    const innerW = EXPORT_BOARD_WIDTH - 4;
    const innerH = EXPORT_BOARD_HEIGHT - 4;
    const badgeW = 36;
    const badgeH = 18;

    cloneBoard.querySelectorAll('.badge-tuan-triet:not(.is-hidden)').forEach((badge) => {
        const rawTop = badge.style.top || '50%';
        const rawLeft = badge.style.left || '50%';

        const resolveCoord = (expr, totalPx) => {
            const calcMatch = expr.match(/calc\(\s*([\d.]+)%\s*([+-])\s*([\d.]+)px\s*\)/i);
            if (calcMatch) {
                const base = (parseFloat(calcMatch[1]) / 100) * totalPx;
                const delta = parseFloat(calcMatch[3]);
                return calcMatch[2] === '-' ? base - delta : base + delta;
            }
            if (expr.endsWith('%')) {
                return (parseFloat(expr) / 100) * totalPx;
            }
            return parseFloat(expr) || 0;
        };

        let y = resolveCoord(rawTop, innerH) + 2;
        let x = resolveCoord(rawLeft, innerW) + 2;
        const h = badge.classList.contains('badge-tab-up') ? 17 : badgeH;

        x -= badgeW * 0.5;
        if (badge.classList.contains('badge-tab-up')) {
            y -= h;
        } else if (!badge.classList.contains('badge-tab-down')) {
            y -= h * 0.5;
        }

        badge.style.top = `${y.toFixed(2)}px`;
        badge.style.left = `${x.toFixed(2)}px`;
        badge.style.transform = 'none';
        badge.style.animation = 'none';
    });
}

async function captureBoardViaHtml2Canvas(wrapper, scale = 3.5, options = {}) {
    const origCreatePattern = CanvasRenderingContext2D.prototype.createPattern;
    CanvasRenderingContext2D.prototype.createPattern = function(image, repetition) {
        if (image && (image.width === 0 || image.height === 0)) {
            const fallback = document.createElement('canvas');
            fallback.width = 1;
            fallback.height = 1;
            return origCreatePattern.call(this, fallback, repetition);
        }
        return origCreatePattern.call(this, image, repetition);
    };

    const offscreen = document.createElement('div');
    offscreen.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: -10000px !important;
        width: ${EXPORT_BOARD_WIDTH}px !important;
        height: ${EXPORT_BOARD_HEIGHT}px !important;
        z-index: -9999 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        overflow: visible !important;
    `;

    const h2cFixStyle = document.createElement('style');
    h2cFixStyle.textContent = `
        #tuviExportCloneRoot *, #tuviExportCloneRoot *::before, #tuviExportCloneRoot *::after {
            animation: none !important;
            transition: none !important;
        }
        #tuviExportCloneRoot .badge-tuan-triet:not(.is-hidden) {
            opacity: 1 !important;
            display: block !important;
            text-align: center !important;
            line-height: 16px !important;
            padding: 0 !important;
        }
        #tuviExportCloneRoot .rel-line-triad,
        #tuviExportCloneRoot .rel-line-opposite,
        #tuviExportCloneRoot .rel-line-harmonic {
            opacity: 1 !important;
            stroke-dashoffset: 0 !important;
        }
        #tuviExportCloneRoot .house.is-active-palace::after {
            box-shadow: none !important;
            border: 2px solid #2563eb !important;
            background: rgba(37, 99, 235, 0.03) !important;
        }
        #tuviExportCloneRoot .house.is-triad-palace::after {
            box-shadow: none !important;
            border: 2px solid #059669 !important;
            background: rgba(5, 150, 105, 0.03) !important;
        }
        #tuviExportCloneRoot .house.is-opposite-palace::after {
            box-shadow: none !important;
            border: 2px solid #dc2626 !important;
            background: rgba(220, 38, 38, 0.03) !important;
        }
        #tuviExportCloneRoot .house.is-harmonic-palace::after {
            box-shadow: none !important;
            border: 2px solid #7c3aed !important;
            background: rgba(124, 58, 237, 0.03) !important;
        }
    `;

    const cloneWrapper = buildNormalizedBoardClone(wrapper, options);
    cloneWrapper.id = 'tuviExportCloneRoot';
    resolveTuanTrietBadgesForHtml2Canvas(cloneWrapper.querySelector('#tuviBoard'));

    offscreen.appendChild(h2cFixStyle);
    offscreen.appendChild(cloneWrapper);
    document.body.appendChild(offscreen);

    try {
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => setTimeout(r, 60));

        return await html2canvas(cloneWrapper, {
            scale: scale,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 0
        });
    } finally {
        CanvasRenderingContext2D.prototype.createPattern = origCreatePattern;
        offscreen.remove();
    }
}

// Chụp canvas lá số độ nét cao chuẩn in ấn 300 DPI — đồng nhất 100% với giao diện web
async function captureTuviBoard(scale = 3.5, options = {}) {
    const wrapper = document.querySelector('.tuvi-board-wrapper');
    if (!wrapper) throw new Error('Không tìm thấy .tuvi-board-wrapper');

    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
    }

    try {
        const foCanvas = await captureBoardViaForeignObject(wrapper, scale, options);
        if (foCanvas) return foCanvas;
    } catch (foErr) {
        console.warn('[TuVi] Chuyển sang bộ chụp dự phòng html2canvas:', foErr);
    }

    return captureBoardViaHtml2Canvas(wrapper, scale, options);
}

function rgbToCmyk(r, g, b) {
    const r_ = r / 255;
    const g_ = g / 255;
    const b_ = b / 255;
    const k = 1 - Math.max(r_, g_, b_);
    if (k >= 0.9999) {
        return [0, 0, 0, 255];
    }
    const c = Math.round(((1 - r_ - k) / (1 - k)) * 255);
    const m = Math.round(((1 - g_ - k) / (1 - k)) * 255);
    const y = Math.round(((1 - b_ - k) / (1 - k)) * 255);
    const kVal = Math.round(k * 255);
    return [c, m, y, kVal];
}

function rgbToGrayscale(r, g, b) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    if (gray > 248) {
        return 255;
    } else if (gray >= 215) {
        return Math.min(250, Math.round(gray));
    } else {
        return Math.max(0, Math.round(gray * 0.82));
    }
}

async function generatePdfDocument({
    pageWidthPt = 595.28,
    pageHeightPt = 841.89,
    marginPt = 20,
    imgWidthPx,
    imgHeightPx,
    colorSpace = 'DeviceCMYK',
    bitsPerComponent = 8,
    rawBytes
}) {
    let streamData = rawBytes;
    let isCompressed = false;

    if (typeof CompressionStream !== 'undefined') {
        try {
            const cs = new CompressionStream('deflate');
            const writer = cs.writable.getWriter();
            writer.write(rawBytes);
            writer.close();
            const reader = cs.readable.getReader();
            const chunks = [];
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            let total = 0;
            chunks.forEach(c => total += c.length);
            const res = new Uint8Array(total);
            let offset = 0;
            chunks.forEach(c => {
                res.set(c, offset);
                offset += c.length;
            });
            streamData = res;
            isCompressed = true;
        } catch (e) {
            console.warn('Nén FlateDecode không khả dụng, sử dụng raw stream:', e);
        }
    }

    const maxW = pageWidthPt - 2 * marginPt;
    const maxH = pageHeightPt - 2 * marginPt;
    const imgRatio = (imgWidthPx && imgHeightPx) ? (imgWidthPx / imgHeightPx) : (EXPORT_BOARD_WIDTH / EXPORT_BOARD_HEIGHT);
    let drawW = maxW;
    let drawH = drawW / imgRatio;
    if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * imgRatio;
    }
    const imgWidthPt = drawW.toFixed(2);
    const imgHeightPt = drawH.toFixed(2);
    const x = ((pageWidthPt - drawW) / 2).toFixed(2);
    const y = ((pageHeightPt - drawH) / 2).toFixed(2);
    const contentStr = `q\n${imgWidthPt} 0 0 ${imgHeightPt} ${x} ${y} cm\n/Im1 Do\nQ\n`;
    const contentBytes = new TextEncoder().encode(contentStr);

    const filterLine = isCompressed ? '/Filter /FlateDecode\n' : '';
    const chunks = [];
    const offsets = [];
    let currentOffset = 0;

    function append(data) {
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        chunks.push(bytes);
        currentOffset += bytes.length;
    }

    append('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    offsets[1] = currentOffset;
    append('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    offsets[2] = currentOffset;
    append('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    offsets[3] = currentOffset;
    append(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] /Contents 5 0 R /Resources << /XObject << /Im1 4 0 R >> >> >>\nendobj\n`);

    offsets[4] = currentOffset;
    append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidthPx} /Height ${imgHeightPx} /ColorSpace /${colorSpace} /BitsPerComponent ${bitsPerComponent} ${filterLine}/Length ${streamData.length} >>\nstream\n`);
    append(streamData);
    append('\nendstream\nendobj\n');

    offsets[5] = currentOffset;
    append(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    append(contentBytes);
    append('endstream\nendobj\n');

    const startxref = currentOffset;
    append('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) {
        append(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    }
    append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`);

    return new Blob(chunks, { type: 'application/pdf' });
}

async function exportPdfCmyk(triggerBtn) {
    return runDeferredExport(triggerBtn, 'btn-cmyk', async () => {
        const canvas = await captureTuviBoard(3.5);
        await yieldToMainThread();

        const w = canvas.width;
        const h = canvas.height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, w, h);
        const rgba = imgData.data;

        await yieldToMainThread();

        const totalPixels = w * h;
        const cmykBytes = new Uint8Array(totalPixels * 4);
        const CHUNK_PIXELS = isMobileExportViewport() ? 250000 : totalPixels;

        let srcIdx = 0;
        let dstIdx = 0;
        for (let i = 0; i < totalPixels; i++) {
            const cmyk = rgbToCmyk(rgba[srcIdx], rgba[srcIdx + 1], rgba[srcIdx + 2]);
            cmykBytes[dstIdx] = cmyk[0];
            cmykBytes[dstIdx + 1] = cmyk[1];
            cmykBytes[dstIdx + 2] = cmyk[2];
            cmykBytes[dstIdx + 3] = cmyk[3];
            srcIdx += 4;
            dstIdx += 4;
            if ((i + 1) % CHUNK_PIXELS === 0 && i + 1 < totalPixels) {
                await yieldToMainThread();
            }
        }

        await yieldToMainThread();
        const pdfBlob = await generatePdfDocument({
            pageWidthPt: 595.28,
            pageHeightPt: 841.89,
            marginPt: 20,
            imgWidthPx: w,
            imgHeightPx: h,
            colorSpace: 'DeviceCMYK',
            rawBytes: cmykBytes
        });

        const filename = getExportFileName('pdf');
        downloadBlob(pdfBlob, filename);
    }, 'Lỗi khi xuất PDF CMYK:');
}

async function exportPdfGrayscale(triggerBtn) {
    return runDeferredExport(triggerBtn, 'btn-bw', async () => {
        const canvas = await captureTuviBoard(3.5, { watermarkOpacity: '0.14' });
        await yieldToMainThread();

        const w = canvas.width;
        const h = canvas.height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, w, h);
        const rgba = imgData.data;

        await yieldToMainThread();

        const totalPixels = w * h;
        const grayBytes = new Uint8Array(totalPixels);
        const CHUNK_PIXELS = isMobileExportViewport() ? 250000 : totalPixels;

        let srcIdx = 0;
        for (let i = 0; i < totalPixels; i++) {
            grayBytes[i] = rgbToGrayscale(rgba[srcIdx], rgba[srcIdx + 1], rgba[srcIdx + 2]);
            srcIdx += 4;
            if ((i + 1) % CHUNK_PIXELS === 0 && i + 1 < totalPixels) {
                await yieldToMainThread();
            }
        }

        await yieldToMainThread();
        const pdfBlob = await generatePdfDocument({
            pageWidthPt: 595.28,
            pageHeightPt: 841.89,
            marginPt: 20,
            imgWidthPx: w,
            imgHeightPx: h,
            colorSpace: 'DeviceGray',
            rawBytes: grayBytes
        });

        const filename = getExportFileName('pdf', '(Đen trắng)');
        downloadBlob(pdfBlob, filename);
    }, 'Lỗi khi xuất PDF Grayscale:');
}

async function exportImage4K(triggerBtn) {
    return runDeferredExport(triggerBtn, 'btn-img4k', async () => {
        const boardCanvas = await captureTuviBoard(3.5);
        await yieldToMainThread();

        const A4_WIDTH = 2480;
        const A4_HEIGHT = 3508;

        const a4Canvas = document.createElement('canvas');
        a4Canvas.width = A4_WIDTH;
        a4Canvas.height = A4_HEIGHT;

        const ctx = a4Canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

        const minMargin = 85;
        const maxAvailableWidth = A4_WIDTH - 2 * minMargin;
        const maxAvailableHeight = A4_HEIGHT - 2 * minMargin;

        const boardRatio = boardCanvas.width / boardCanvas.height;
        let targetWidth = maxAvailableWidth;
        let targetHeight = targetWidth / boardRatio;

        if (targetHeight > maxAvailableHeight) {
            targetHeight = maxAvailableHeight;
            targetWidth = targetHeight * boardRatio;
        }

        targetWidth = Math.round(targetWidth);
        targetHeight = Math.round(targetHeight);

        const posX = Math.round((A4_WIDTH - targetWidth) / 2);
        const posY = Math.round((A4_HEIGHT - targetHeight) / 2);

        ctx.drawImage(
            boardCanvas,
            0, 0, boardCanvas.width, boardCanvas.height,
            posX, posY, targetWidth, targetHeight
        );

        await yieldToMainThread();

        const rawBlob = await new Promise((resolve, reject) => {
            a4Canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Không thể chuyển canvas sang blob PNG'));
            }, 'image/png');
        });

        const finalBlob = await embedDpiInPngBlob(rawBlob, 300);

        const filename = getExportFileName('png');
        downloadBlob(finalBlob, filename);
    }, 'Lỗi khi xuất ảnh 4K:');
}

async function embedDpiInPngBlob(blob, dpi = 300) {
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        if (bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
            return blob;
        }

        const ppm = Math.round(dpi / 0.0254);

        const physChunk = new Uint8Array(21);
        const view = new DataView(physChunk.buffer);
        view.setUint32(0, 9);
        physChunk[4] = 0x70; physChunk[5] = 0x48; physChunk[6] = 0x59; physChunk[7] = 0x73;
        view.setUint32(8, ppm);
        view.setUint32(12, ppm);
        physChunk[16] = 1;

        const crcTable = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            crcTable[i] = c;
        }
        let crc = 0 ^ (-1);
        for (let i = 4; i < 17; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ physChunk[i]) & 0xFF];
        }
        crc = (crc ^ (-1)) >>> 0;
        view.setUint32(17, crc);

        const dataView = new DataView(arrayBuffer);
        const ihdrLen = dataView.getUint32(8);
        const ihdrEnd = 8 + 4 + 4 + ihdrLen + 4;

        const newBytes = new Uint8Array(bytes.length + 21);
        newBytes.set(bytes.subarray(0, ihdrEnd), 0);
        newBytes.set(physChunk, ihdrEnd);
        newBytes.set(bytes.subarray(ihdrEnd), ihdrEnd + 21);

        return new Blob([newBytes], { type: 'image/png' });
    } catch (e) {
        console.warn('Không thể nhúng pHYs chunk vào PNG:', e);
        return blob;
    }
}

window.exportPdfCmyk = exportPdfCmyk;
window.exportPdfGrayscale = exportPdfGrayscale;
window.exportImage4K = exportImage4K;
window.captureTuviBoard = captureTuviBoard;
window.getExportFileName = getExportFileName;
window.downloadBlob = downloadBlob;
