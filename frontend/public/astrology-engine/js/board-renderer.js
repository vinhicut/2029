// Bảng mapping class màu sắc đặc biệt cho 14 Chính Tinh theo 5 sắc tố Ngũ Hành phẳng
const STAR_COLOR_CLASS_MAP = {
    'Vũ Khúc': 'sao-vu-khuc',
    'Thất Sát': 'sao-that-sat',
    'Thiên Cơ': 'sao-thien-co',
    'Thiên Lương': 'sao-thien-luong',
    'Thiên Đồng': 'sao-thien-dong',
    'Thiên Tướng': 'sao-thien-tuong',
    'Thái Âm': 'sao-thai-am',
    'Tham Lang': 'sao-tham-lang',
    'Cự Môn': 'sao-cu-mon',
    'Phá Quân': 'sao-pha-quan',
    'Liêm Trinh': 'sao-liem-trinh',
    'Thái Dương': 'sao-thai-duong',
    'Tử Vi': 'sao-tu-vi',
    'Thiên Phủ': 'sao-thien-phu'
};

/**
 * board-renderer.js
 * Quản lý vẽ giao diện lá số, 12 cung Địa Bàn, Thiên Bàn trung tâm,
 * hệ thống tương tác Cung số (Tam Hợp - Xung Chiếu - Nhị Hợp)
 * và giao diện Cổ Thư Di Động (Mobile Viewport Reader).
 */

window._generatedTuViIds = window._generatedTuViIds || new Set();

let currentChartData = null;
window.currentChartData = null;
window.activePalacePos = null;

function getCurrentChartData() {
    return currentChartData;
}

function setCurrentChartData(chart) {
    currentChartData = chart;
    window.currentChartData = chart;
}

/**
 * Trích xuất ký tự viết tắt tên người dùng (viết hoa, chuẩn ASCII)
 */
function getInitials(name) {
    if (!name || typeof name !== 'string') return "HA";
    let clean = name.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim();
    if (!clean) return "HA";
    let words = clean.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return "HA";
    let initials = words.map(w => w[0].toUpperCase()).join("");
    return initials || "HA";
}

/**
 * Sinh 8 chữ số ngẫu nhiên duy nhất tuyệt đối (Strict Unique)
 */
function generateStrictUniqueIdDigits() {
    let digits = "";
    let attempts = 0;
    while (attempts < 1000) {
        attempts++;
        const now = Date.now();
        const perf = (typeof performance !== "undefined" && performance.now) ? performance.now() : Math.random() * 1000;
        const rand = (typeof crypto !== "undefined" && crypto.getRandomValues)
            ? (crypto.getRandomValues(new Uint32Array(1))[0] % 100000000)
            : Math.floor(Math.random() * 100000000);

        const mixed = Math.abs(Math.floor((now ^ Math.floor(perf * 1000) ^ rand ^ (attempts * 7919)))) % 100000000;
        digits = String(mixed).padStart(8, '0');

        if (!window._generatedTuViIds.has(digits)) {
            window._generatedTuViIds.add(digits);
            return digits;
        }
    }
    return String(Math.floor(10000000 + Math.random() * 90000000));
}

/**
 * Cập nhật tên đương số trực tiếp trên Thiên Bàn
 */
function updateBoardNameOnly(name) {
    const safeName = (name && name.trim()) ? name.trim() : "Vô Danh";
    const nameEl = document.getElementById("tb-name");
    if (nameEl) {
        nameEl.innerText = safeName;
    }
    if (currentChartData) {
        if (currentChartData.thien_ban) {
            currentChartData.thien_ban.ho_ten = safeName;
        }
        if (!currentChartData.idDigits) {
            currentChartData.idDigits = generateStrictUniqueIdDigits();
        }
        const initials = getInitials(safeName);
        const idCode = `${initials}-${currentChartData.idDigits}`;
        currentChartData.idCode = idCode;
        const idCodeEl = document.getElementById("tb-id-code");
        if (idCodeEl) {
            idCodeEl.innerText = idCode;
        }
    }
    const mobileNameEl = document.querySelector(".mobile-tb-name");
    if (mobileNameEl) {
        mobileNameEl.innerText = safeName;
    }
}

/**
 * Điều khiển trạng thái làm nổi bật cung và các cung liên đới (Bản Cung, Tam Hợp, Xung Chiếu, Nhị Hợp)
 */
function setPalaceActiveFocus(pos, chart) {
    chart = chart || currentChartData;
    window.activePalacePos = pos;
    const board = document.getElementById("tuviBoard");
    if (!board) return;

    // Xóa huy hiệu và class tương tác cũ
    board.querySelectorAll(".palace-rel-tag").forEach(t => t.remove());
    board.querySelectorAll(".house").forEach(h => {
        h.classList.remove(
            "is-active-palace",
            "is-triad-palace",
            "is-opposite-palace",
            "is-harmonic-palace",
            "is-related",
            "is-hovered"
        );
    });

    // Cập nhật phím bấm trên Mobile selector
    document.querySelectorAll(".mobile-palace-btn").forEach(btn => {
        btn.classList.remove("active", "triad", "opposite", "harmonic");
    });

    if (pos === null || pos === undefined || isNaN(pos)) {
        board.classList.remove("has-active-focus");
        if (typeof renderPalaceRelationLines === "function") {
            renderPalaceRelationLines(null, chart ? chart.menhPos : null);
        }
        if (typeof updateMobilePalaceInspector === "function" && chart) {
            updateMobilePalaceInspector(chart.menhPos !== undefined ? chart.menhPos : 0, chart);
        }
        // Xóa nội dung nhãn sau khi animation trượt xuống hoàn tất để không gián đoạn thị giác
        setTimeout(() => {
            if (window.activePalacePos === null) {
                board.querySelectorAll(".footer-relation-badge").forEach(b => {
                    b.textContent = "";
                });
            }
        }, 250);
        return;
    }

    pos = Number(pos);
    board.classList.add("has-active-focus");

    if (typeof calculatePalaceRelationships === "function") {
        const rel = calculatePalaceRelationships(pos);
        if (rel) {
            // 1. Ô Gốc / Ô Đang Xem (Xanh dương đậm #2563EB)
            const actEl = document.getElementById(`house-${rel.active}`);
            if (actEl) {
                actEl.classList.add("is-active-palace", "is-related");
                const bEl = document.getElementById(`footer-badge-${rel.active}`);
                if (bEl) bEl.textContent = "ĐANG XEM";
            }
            const actBtn = document.getElementById(`mPalaceBtn-${rel.active}`);
            if (actBtn) actBtn.classList.add("active");

            // 2. Tam Hợp (Xanh ngọc lục bảo #059669)
            rel.triad.forEach(tPos => {
                const tEl = document.getElementById(`house-${tPos}`);
                if (tEl) {
                    tEl.classList.add("is-triad-palace", "is-related");
                    const bEl = document.getElementById(`footer-badge-${tPos}`);
                    if (bEl) bEl.textContent = "TAM HỢP";
                }
                const tBtn = document.getElementById(`mPalaceBtn-${tPos}`);
                if (tBtn) tBtn.classList.add("triad");
            });

            // 3. Xung Chiếu (Đỏ cam nổi bật #DC2626)
            const oppEl = document.getElementById(`house-${rel.opposite}`);
            if (oppEl) {
                oppEl.classList.add("is-opposite-palace", "is-related");
                const bEl = document.getElementById(`footer-badge-${rel.opposite}`);
                if (bEl) bEl.textContent = "XUNG CHIẾU";
            }
            const oppBtn = document.getElementById(`mPalaceBtn-${rel.opposite}`);
            if (oppBtn) oppBtn.classList.add("opposite");

            // 4. Nhị Hợp (Tím đậm sang trọng #7C3AED)
            const harmEl = document.getElementById(`house-${rel.harmonic}`);
            if (harmEl) {
                harmEl.classList.add("is-harmonic-palace", "is-related");
                const bEl = document.getElementById(`footer-badge-${rel.harmonic}`);
                if (bEl) bEl.textContent = "NHỊ HỢP";
            }
            const harmBtn = document.getElementById(`mPalaceBtn-${rel.harmonic}`);
            if (harmBtn) harmBtn.classList.add("harmonic");
        }
    }

    if (typeof renderPalaceRelationLines === "function") {
        renderPalaceRelationLines(pos, chart ? chart.menhPos : null);
    }

    if (typeof updateMobilePalaceInspector === "function" && chart) {
        updateMobilePalaceInspector(pos, chart);
    }
}

/**
 * Cập nhật thẻ chi tiết Bản Cung và danh sách cung hội chiếu trên Mobile Reader
 */
function updateMobilePalaceInspector(pos, chart) {
    if (!chart || !chart.dia_ban) return;
    const c = chart.dia_ban[pos];
    if (!c) return;

    // Header thẻ
    const titleEl = document.getElementById("mActivePalaceTitle");
    if (titleEl) titleEl.textContent = `${c.cung_chi} - ${c.ten_cung}`;

    const daiHanEl = document.getElementById("mActivePalaceDaiHan");
    if (daiHanEl) daiHanEl.textContent = `Đại Hạn: ${c.dai_han}`;

    // Danh sách Chính Tinh
    const ctContainer = document.getElementById("mActiveChinhTinhList");
    if (ctContainer) {
        ctContainer.innerHTML = "";
        if (c.chinh_tinh && c.chinh_tinh.length > 0) {
            c.chinh_tinh.forEach(s => {
                const chip = document.createElement("span");
                const dtText = s.dac_tinh ? ` (${s.dac_tinh})` : "";
                chip.className = `mobile-chinh-tinh-chip ${s.ngu_hanh}`;
                chip.textContent = `${s.ten}${dtText}`;
                ctContainer.appendChild(chip);
            });
        } else {
            const chip = document.createElement("span");
            chip.className = "mobile-chinh-tinh-chip";
            chip.style.color = "var(--kim)";
            chip.textContent = "Vô Chính Diệu";
            ctContainer.appendChild(chip);
        }
    }

    // Cột Cát tinh & Sát tinh
    const totCol = document.getElementById("mActiveTotCol");
    if (totCol) {
        totCol.innerHTML = "";
        c.phu_tinh_tot.forEach(s => {
            const it = document.createElement("div");
            it.className = `star-item ${s.ngu_hanh}`;
            it.textContent = s.dac_tinh ? `${s.ten} (${s.dac_tinh})` : s.ten;
            totCol.appendChild(it);
        });
        c.sao_luu.filter(l => l.loai === "tot").forEach(l => {
            const it = document.createElement("div");
            it.className = "star-item tho luu";
            it.textContent = l.ten;
            totCol.appendChild(it);
        });
    }

    const xauCol = document.getElementById("mActiveXauCol");
    if (xauCol) {
        xauCol.innerHTML = "";
        c.phu_tinh_xau.forEach(s => {
            const it = document.createElement("div");
            it.className = `star-item ${s.ngu_hanh || 'hoa'} sat`;
            it.textContent = s.dac_tinh ? `${s.ten} (${s.dac_tinh})` : s.ten;
            xauCol.appendChild(it);
        });
        c.sao_luu.filter(l => l.loai === "xau").forEach(l => {
            const it = document.createElement("div");
            it.className = "star-item hoa luu";
            it.textContent = l.ten;
            xauCol.appendChild(it);
        });
    }

    // Chân thẻ
    const tieuHanEl = document.getElementById("mActiveTieuHan");
    if (tieuHanEl) tieuHanEl.textContent = `Tiểu hạn: ${c.tieu_han_chi}`;

    const trangSinhEl = document.getElementById("mActiveTrangSinh");
    if (trangSinhEl) trangSinhEl.textContent = c.trang_sinh;

    const nguyetHanEl = document.getElementById("mActiveNguyetHan");
    if (nguyetHanEl) nguyetHanEl.textContent = `Tháng hạn: Th.${c.nguyet_han_thang}`;

    // Danh sách Cung Hội Chiếu (Tam Hợp, Xung Chiếu, Nhị Hợp)
    if (typeof calculatePalaceRelationships === "function") {
        const rel = calculatePalaceRelationships(pos);
        if (rel) {
            const relContainer = document.getElementById("mRelItemsList");
            if (relContainer) {
                relContainer.innerHTML = "";

                function createRelBox(targetPos, typeName, typeClass, badgeClass) {
                    const tc = chart.dia_ban[targetPos];
                    if (!tc) return;
                    const box = document.createElement("div");
                    box.className = `mobile-rel-item ${typeClass}`;
                    box.onclick = () => setPalaceActiveFocus(targetPos, chart);
                    box.style.cursor = "pointer";

                    const mainStars = (tc.chinh_tinh && tc.chinh_tinh.length > 0)
                        ? tc.chinh_tinh.map(s => s.dac_tinh ? `${s.ten}(${s.dac_tinh})` : s.ten).join(", ")
                        : "Vô Chính Diệu";

                    box.innerHTML = `
                        <div class="mobile-rel-head">
                            <span>${tc.cung_chi} - ${tc.ten_cung}</span>
                            <span class="mobile-rel-tag-badge ${badgeClass}">${typeName}</span>
                        </div>
                        <div class="mobile-rel-stars">Chính tinh: <strong>${mainStars}</strong> | Đại hạn: ${tc.dai_han}</div>
                    `;
                    relContainer.appendChild(box);
                }

                // 2 Cung Tam Hợp
                rel.triad.forEach(tPos => {
                    createRelBox(tPos, "TAM HỢP", "rel-triad", "badge-triad");
                });

                // 1 Cung Xung Chiếu
                createRelBox(rel.opposite, "XUNG CHIẾU", "rel-opposite", "badge-opposite");

                // 1 Cung Nhị Hợp
                createRelBox(rel.harmonic, "NHỊ HỢP", "rel-harmonic", "badge-harmonic");
            }
        }
    }
}

/**
 * Khởi tạo giao diện Mobile Reader độc lập
 */
function renderMobileTuViView(chart) {
    const mobileView = document.getElementById("mobileTuViView");
    if (!mobileView || !chart) return;

    const tb = chart.thien_ban;
    const db = chart.dia_ban;
    const lYear = (tb.am_lich.calc_nam !== undefined) ? tb.am_lich.calc_nam : tb.am_lich.nam;
    const lMonth = (tb.am_lich.calc_thang !== undefined) ? tb.am_lich.calc_thang : tb.am_lich.thang;
    const lDay = (tb.am_lich.calc_ngay !== undefined) ? tb.am_lich.calc_ngay : tb.am_lich.ngay;
    const lHour = tb.am_lich.can_chi_gio || "";

    mobileView.innerHTML = `
        <!-- 1. THẺ THIÊN BÀN TÓM TẮT -->
        <div class="mobile-tb-card">
            <div class="mobile-tb-head">
                <span class="mobile-tb-name">${tb.ho_ten}</span>
                <span class="mobile-tb-age">${tb.nam_xem_han.tuoi_mu} tuổi (${tb.nam_xem_han.can_chi})</span>
            </div>
            <div class="mobile-tb-meta-grid">
                <div class="mobile-tb-meta-item"><span class="mobile-tb-lbl">Âm lịch:</span><span>${tb.am_lich.can_chi_nam} (Th.${lMonth}, Ng.${lDay})</span></div>
                <div class="mobile-tb-meta-item"><span class="mobile-tb-lbl">Giờ sinh:</span><span>${lHour}</span></div>
                <div class="mobile-tb-meta-item"><span class="mobile-tb-lbl">Bản Mệnh:</span><span class="hoa" style="font-weight:700;">${tb.menh_nap_am}</span></div>
                <div class="mobile-tb-meta-item"><span class="mobile-tb-lbl">Cục:</span><span>${tb.cuc}</span></div>
                <div class="mobile-tb-meta-item"><span class="mobile-tb-lbl">Mệnh lý:</span><span>${tb.am_duong_ly}</span></div>
                <div class="mobile-tb-meta-item"><span class="mobile-tb-lbl">Thân cư:</span><span>${tb.than_cu}</span></div>
            </div>
            <div class="mobile-tb-actions">
                <button type="button" class="mobile-action-btn btn-primary" onclick="toggleMobileFullBoard(true)">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                    <span>Xem Đồ Hình A4</span>
                </button>
                <button type="button" class="mobile-action-btn" onclick="scrollToTuViForm()">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>Lập Lá Số Khác</span>
                </button>
            </div>
        </div>

        <!-- 2. BỘ CHỌN 12 CUNG DẠNG MA TRẬN PHÍM BẤM -->
        <div class="mobile-palace-selector-section">
            <div class="mobile-selector-title">BẤM CHỌN CUNG ĐỂ XEM HỘI CHIẾU (TAM HỢP - XUNG - HỢP)</div>
            <div class="mobile-palace-strip" id="mPalaceStripContainer"></div>
        </div>

        <!-- 3. THẺ CHI TIẾT BẢN CUNG ĐANG CHỌN -->
        <div class="mobile-active-palace-card" id="mActivePalaceCard">
            <div class="mobile-card-header">
                <span class="mobile-card-cung-title" id="mActivePalaceTitle">CUNG MỆNH</span>
                <span class="mobile-card-dai-han" id="mActivePalaceDaiHan">Đại Hạn: 0</span>
            </div>
            <div class="mobile-card-chinh-tinh-list" id="mActiveChinhTinhList"></div>
            <div class="mobile-card-phu-tinh-grid">
                <div class="mobile-phu-tinh-col">
                    <div class="mobile-phu-tinh-col-title">Cát Tinh</div>
                    <div id="mActiveTotCol"></div>
                </div>
                <div class="mobile-phu-tinh-col">
                    <div class="mobile-phu-tinh-col-title">Sát Tinh & Bại Tinh</div>
                    <div id="mActiveXauCol"></div>
                </div>
            </div>
            <div class="mobile-card-footer">
                <span id="mActiveTieuHan">Tiểu hạn: -</span>
                <span id="mActiveTrangSinh" style="color:var(--c-ink); font-weight:700;">-</span>
                <span id="mActiveNguyetHan">Tháng hạn: -</span>
            </div>
        </div>

        <!-- 4. DANH SÁCH CÁC CUNG HỘI CHIẾU -->
        <div class="mobile-relations-section">
            <div class="mobile-selector-title">CÁC CUNG HỘI CHIẾU LIÊN ĐỚI</div>
            <div class="mobile-rel-grid" id="mRelItemsList"></div>
        </div>
    `;

    // Render 12 nút chọn cung
    const stripContainer = document.getElementById("mPalaceStripContainer");
    if (stripContainer) {
        stripContainer.innerHTML = "";
        const tuanSet = new Set(chart.tuan_cung || []);
        const trietSet = new Set(chart.triet_cung || []);

        for (let i = 0; i < 12; i++) {
            const c = db[i];
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "mobile-palace-btn" + (i === chart.menhPos ? " active" : "");
            btn.id = `mPalaceBtn-${i}`;

            let extraTag = "";
            if (i === chart.menhPos) extraTag = " (M)";
            else if (c.ten_cung.includes("Thân")) extraTag = " (Thân)";
            else if (tuanSet.has(i) && trietSet.has(i)) extraTag = " [T.Tr]";
            else if (tuanSet.has(i)) extraTag = " [Tuần]";
            else if (trietSet.has(i)) extraTag = " [Triệt]";

            btn.innerHTML = `
                <span class="p-btn-chi">${c.cung_chi}</span>
                <span class="p-btn-name">${c.ten_cung}${extraTag}</span>
            `;
            btn.onclick = () => setPalaceActiveFocus(i, chart);
            stripContainer.appendChild(btn);
        }
    }

    // Mặc định nạp Cung Mệnh vào thẻ đọc chi tiết
    updateMobilePalaceInspector(chart.menhPos !== undefined ? chart.menhPos : 0, chart);
}

function renderTuViBoard(chart) {
    setCurrentChartData(chart);
    let tb = chart.thien_ban;
    let db = chart.dia_ban;

    if (!chart.idDigits) {
        chart.idDigits = generateStrictUniqueIdDigits();
    }
    const initials = getInitials(tb.ho_ten);
    const idCode = `${initials}-${chart.idDigits}`;
    chart.idCode = idCode;

    const idCodeEl = document.getElementById("tb-id-code");
    if (idCodeEl) {
        idCodeEl.innerText = idCode;
    }

    if (!chart.hotline) {
        chart.hotline = (typeof getNextOrRandomHotline === "function")
            ? getNextOrRandomHotline()
            : "0924.616.199";
    }
    const phoneEl = document.getElementById("tb-phone") || document.querySelector(".tb-header-phone");
    if (phoneEl) {
        phoneEl.innerText = chart.hotline;
    }

    // Cập nhật Thiên Bàn (Desktop)
    const nameEl = document.getElementById("tb-name");
    if (nameEl) nameEl.innerText = tb.ho_ten;

    const sYearEl = document.getElementById("tb-solar-year");
    if (sYearEl) sYearEl.innerText = tb.duong_lich.nam;

    const lYearEl = document.getElementById("tb-lunar-year");
    if (lYearEl) lYearEl.innerText = tb.am_lich.can_chi_nam;

    let lYear = (tb.am_lich.calc_nam !== undefined) ? tb.am_lich.calc_nam : tb.am_lich.nam;
    const lYearTag = document.getElementById("tb-lunar-year-tag");
    if (lYearTag) lYearTag.innerText = `(N.${lYear})`;

    const sMonthEl = document.getElementById("tb-solar-month");
    if (sMonthEl) sMonthEl.innerText = String(tb.duong_lich.thang).padStart(2, '0');

    const lMonthEl = document.getElementById("tb-lunar-month");
    if (lMonthEl) lMonthEl.innerText = tb.am_lich.can_chi_thang;

    let lMonth = (tb.am_lich.calc_thang !== undefined) ? tb.am_lich.calc_thang : tb.am_lich.thang;
    let lIsLeap = (tb.am_lich.calc_thang_nhuan !== undefined) ? tb.am_lich.calc_thang_nhuan : tb.am_lich.thang_nhuan;
    const lMonthTag = document.getElementById("tb-lunar-month-tag");
    if (lMonthTag) lMonthTag.innerText = `(Th.${lMonth}${lIsLeap ? 'N' : ''})`;

    const sDayEl = document.getElementById("tb-solar-day");
    if (sDayEl) sDayEl.innerText = String(tb.duong_lich.ngay).padStart(2, '0');

    const lDayEl = document.getElementById("tb-lunar-day");
    if (lDayEl) lDayEl.innerText = tb.am_lich.can_chi_ngay;

    let lDay = (tb.am_lich.calc_ngay !== undefined) ? tb.am_lich.calc_ngay : tb.am_lich.ngay;
    const lDayTag = document.getElementById("tb-lunar-day-tag");
    if (lDayTag) lDayTag.innerText = `(Ng.${lDay})`;

    let solarHourStr = `${String(tb.duong_lich.gio).padStart(2, '0')}:${String(tb.duong_lich.phut).padStart(2, '0')}`;
    const sHourEl = document.getElementById("tb-solar-hour");
    if (sHourEl) sHourEl.innerText = solarHourStr;

    const lHourEl = document.getElementById("tb-lunar-hour");
    if (lHourEl) lHourEl.innerText = tb.am_lich.can_chi_gio;

    const lHourTag = document.getElementById("tb-lunar-hour-tag");
    if (lHourTag) lHourTag.innerText = `(G.${solarHourStr})`;

    const sWatchEl = document.getElementById("tb-solar-watch");
    if (sWatchEl) sWatchEl.innerText = tb.nam_xem_han.nam;

    const lWatchEl = document.getElementById("tb-lunar-watch");
    if (lWatchEl) lWatchEl.innerText = tb.nam_xem_han.can_chi;

    const tuoiMuEl = document.getElementById("tb-tuoi-mu");
    if (tuoiMuEl) tuoiMuEl.innerText = `${tb.nam_xem_han.tuoi_mu} tuổi`;

    const amDuongEl = document.getElementById("tb-am-duong");
    if (amDuongEl) amDuongEl.innerText = tb.am_duong_menh;

    const menhEl = document.getElementById("tb-menh");
    if (menhEl) menhEl.innerText = tb.menh_nap_am;

    const cucEl = document.getElementById("tb-cuc");
    if (cucEl) cucEl.innerText = tb.cuc;

    const chuMenhEl = document.getElementById("tb-chu-menh");
    if (chuMenhEl) chuMenhEl.innerText = tb.chu_menh;

    const chuThanEl = document.getElementById("tb-chu-than");
    if (chuThanEl) chuThanEl.innerText = tb.chu_than;

    const amDuongLyEl = document.getElementById("tb-am-duong-ly");
    if (amDuongLyEl) amDuongLyEl.innerText = tb.am_duong_ly;

    const cucMenhLyEl = document.getElementById("tb-cuc-menh-ly");
    if (cucMenhLyEl) cucMenhLyEl.innerText = tb.cuc_menh_tuong_quan;

    const thanCuEl = document.getElementById("tb-than-cu");
    if (thanCuEl) thanCuEl.innerText = tb.than_cu;

    // Click vào Thiên Bàn để hủy chọn cung đang khóa
    const thienBanEl = document.getElementById("thien-ban");
    if (thienBanEl) {
        thienBanEl.onclick = () => {
            setPalaceActiveFocus(null, chart);
        };
    }

    // Xóa 12 Cung cũ
    const board = document.getElementById("tuviBoard");
    if (!board) return;
    const existingHouses = board.querySelectorAll(".house");
    existingHouses.forEach(h => h.remove());

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 12; i++) {
        let c = db[i];
        let houseEl = document.createElement("div");
        houseEl.className = "house";
        houseEl.id = `house-${i}`;

        // Gắn sự kiện click / hover tương tác
        houseEl.onclick = (e) => {
            e.stopPropagation();
            if (window.activePalacePos === i) {
                setPalaceActiveFocus(null, chart);
            } else {
                setPalaceActiveFocus(i, chart);
            }
        };

        houseEl.onmouseenter = () => {
            if (window.activePalacePos === null) {
                houseEl.classList.add("is-hovered");
            }
        };

        houseEl.onmouseleave = () => {
            houseEl.classList.remove("is-hovered");
        };

        // Header
        let chiHanh = (window.CHI_HANH && window.CHI_HANH[i]) ? window.CHI_HANH[i] : "";
        let headerHtml = `
            <div class="house-header">
                <div class="house-header-left ${chiHanh}">
                    <span class="chi-cung">${c.cung_chi}</span>
                </div>
                <div class="cung-name-wrap">
                    <span class="cung-name">${c.ten_cung}</span>
                </div>
                <div class="house-header-right">
                    <span class="dai-han">${c.dai_han}</span>
                </div>
            </div>`;

        // Chính tinh
        let chinhTinhHtml = `<div class="chinh-tinh-box">`;
        if (c.chinh_tinh.length > 0) {
            c.chinh_tinh.forEach(s => {
                let dtClass = s.dac_tinh ? `dac-tinh` : '';
                let dtText = s.dac_tinh ? `(${s.dac_tinh})` : '';
                let starColorCls = STAR_COLOR_CLASS_MAP[s.ten] || "";
                chinhTinhHtml += `<div class="chinh-tinh-item ${s.ngu_hanh} ${starColorCls}">${s.ten}<span class="${dtClass}">${dtText}</span></div>`;
            });
        } else {
            chinhTinhHtml += `<div class="chinh-tinh-item vo-chinh-dieu"></div>`;
        }
        chinhTinhHtml += `</div>`;

        // Phụ tinh
        const priTot = window.PHU_TINH_PRIORITY_TOT || {};
        const priXau = window.PHU_TINH_PRIORITY_XAU || {};
        const saoNguHanh = window.SAO_NGU_HANH || {};

        const sortedTot = [...c.phu_tinh_tot].sort((a, b) => {
            const pA = priTot[a.ten] !== undefined ? priTot[a.ten] : 99;
            const pB = priTot[b.ten] !== undefined ? priTot[b.ten] : 99;
            return pA - pB;
        });

        const sortedXau = [...c.phu_tinh_xau].sort((a, b) => {
            const pA = priXau[a.ten] !== undefined ? priXau[a.ten] : 99;
            const pB = priXau[b.ten] !== undefined ? priXau[b.ten] : 99;
            return pA - pB;
        });

        let leftColHtml = `<div class="phu-tinh-col left">`;
        sortedTot.forEach(s => {
            let dt = s.dac_tinh ? ` (${s.dac_tinh})` : '';
            leftColHtml += `<span class="star-item ${s.ngu_hanh}">${s.ten}${dt}</span>`;
        });
        c.sao_luu.filter(l => l.loai === "tot").forEach(l => {
            let baseName = l.ten.replace("L.", "");
            let hanh = saoNguHanh[baseName] || "tho";
            leftColHtml += `<span class="star-item ${hanh} luu">${l.ten}</span>`;
        });
        leftColHtml += `</div>`;

        let rightColHtml = `<div class="phu-tinh-col right">`;
        sortedXau.forEach(s => {
            let dt = s.dac_tinh ? ` (${s.dac_tinh})` : '';
            let cls = s.ngu_hanh || 'hoa';
            rightColHtml += `<span class="star-item ${cls}">${s.ten}${dt}</span>`;
        });
        c.sao_luu.filter(l => l.loai === "xau").forEach(l => {
            let baseName = l.ten.replace("L.", "");
            let hanh = saoNguHanh[baseName] || "hoa";
            rightColHtml += `<span class="star-item ${hanh} luu">${l.ten}</span>`;
        });
        rightColHtml += `</div>`;

        let phuTinhGridHtml = `<div class="phu-tinh-grid">${leftColHtml}${rightColHtml}</div>`;

        // Chân cung (Hỗ trợ hệ thống Footer Động)
        let footerHtml = `
            <div class="house-footer" id="house-footer-${i}">
                <div class="footer-default-content">
                    <span class="tieu-han-label">${c.tieu_han_chi}</span>
                    <span class="trang-sinh-label">${c.trang_sinh}</span>
                    <span class="nguyet-han-label">Th.${c.nguyet_han_thang}</span>
                </div>
                <div class="footer-relation-badge" id="footer-badge-${i}"></div>
            </div>`;

        houseEl.innerHTML = headerHtml + chinhTinhHtml + phuTinhGridHtml + footerHtml;
        fragment.appendChild(houseEl);
    }

    board.appendChild(fragment);

    // Kẻ tam giác nét đứt Mệnh - Tài - Quan
    if (typeof updateMenhTaiQuanTriangle === "function") {
        updateMenhTaiQuanTriangle(chart.menhPos);
    }

    // Định vị huy hiệu Tuần và Triệt
    if (typeof positionTuanTrietBadges === "function") {
        positionTuanTrietBadges(chart.tuan_cung, chart.triet_cung);
    }

    // Khởi tạo giao diện Mobile Reader
    renderMobileTuViView(chart);
    if (window.requestAnimationFrame) {
        requestAnimationFrame(adjustPalaceHeaderLayout);
    } else {
        adjustPalaceHeaderLayout();
    }
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            adjustPalaceHeaderLayout();
        });
    }

    const jsonEl = document.getElementById("jsonOutputContent");
    if (jsonEl) jsonEl.innerText = JSON.stringify(chart, null, 2);
}

function scrollToTuViForm() {
    const mainPan = document.getElementById("mainInputPanel");
    if (mainPan) {
        mainPan.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function toggleMobileFullBoard(show) {
    const desktopStage = document.querySelector(".tuvi-desktop-stage");
    if (!desktopStage) return;
    if (show) {
        desktopStage.style.display = "flex";
        desktopStage.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
        desktopStage.style.display = "";
    }
}

window.renderTuViBoard = renderTuViBoard;
window.updateBoardNameOnly = updateBoardNameOnly;
window.getCurrentChartData = getCurrentChartData;
window.setCurrentChartData = setCurrentChartData;
window.getInitials = getInitials;
window.generateStrictUniqueIdDigits = generateStrictUniqueIdDigits;
window.setPalaceActiveFocus = setPalaceActiveFocus;
window.updateMobilePalaceInspector = updateMobilePalaceInspector;
window.renderMobileTuViView = renderMobileTuViView;
window.scrollToTuViForm = scrollToTuViForm;
window.toggleMobileFullBoard = toggleMobileFullBoard;


/**
 * Thuật toán đo đạc & tự động cân chỉnh layout cho Header từng ô cung (Dynamic Layout Adjustment)
 * Ưu tiên cân bằng thị giác sao cho tên cung gần chính giữa nhất (Visual Balanced Centering),
 * đồng thời bảo toàn độ cao (24px) và cỡ chữ chuẩn mực đồng nhất 100% trên toàn bộ 12 ô cung.
 * 
 * Bố cục 3 thành phần trên header ô cung:
 * - [Element A]: Tên cung (.cung-name-wrap / .cung-name)
 * - [Element B]: Nhãn phụ / Can Chi / Địa chi (.house-header-left, chứa "Thân" hoặc "Thìn")
 * - [Element C]: Đại hạn (.house-header-right / .dai-han)
 */
function adjustPalaceHeaderLayout() {
    const MIN_SAFE_GAP = (typeof window.TUVI_HEADER_MIN_SAFE_GAP === 'number')
        ? window.TUVI_HEADER_MIN_SAFE_GAP
        : 6.5; // Ngưỡng khoảng cách an toàn thị giác tối thiểu (px) giữa chữ "n" và tên cung

    const headers = document.querySelectorAll('.house-header');
    if (!headers || headers.length === 0) return;

    // Đo đạc tỷ lệ scale của lá số (nếu có CSS transform scale từ engine) để chuẩn hóa khoảng cách px
    let boardScale = 1;
    const board = document.getElementById('tuviBoard');
    if (board) {
        const transform = window.getComputedStyle(board).transform;
        if (transform && transform !== 'none') {
            const matrix = transform.match(/^matrix\(([^\)]+)\)$/);
            if (matrix) {
                const values = matrix[1].split(',').map(parseFloat);
                if (values[0] && values[0] > 0) {
                    boardScale = values[0];
                }
            }
        }
    }

    const candidateList = [];
    const nonCandidates = [];

    // === PHA 1: PHÂN LOẠI ỨNG VIÊN (KHÔNG CHẠM VÀO DOM STYLES ĐỂ TRÁNH DIRTY LAYOUT) ===
    headers.forEach(header => {
        const leftEl = header.querySelector('.house-header-left') || header.querySelector('.chi-cung');
        const wrapEl = header.querySelector('.cung-name-wrap');
        const nameEl = header.querySelector('.cung-name');
        if (!leftEl || !nameEl || !wrapEl) return;

        const palaceName = nameEl.textContent.trim();
        const tagText = (leftEl.textContent || '').trim().toUpperCase();

        // [Element A]: Tên cung dài từ 2 từ trở lên (hỗ trợ cả dấu cách và gạch nối như QUAN-THÂN)
        const wordTokens = palaceName.split(/[\s\-]+/).filter(Boolean);
        const isMultiWordName = palaceName.split(' ').length >= 2 || wordTokens.length >= 2;

        // [Element B]: Nhãn vị trí chứa "Thân" hoặc "Thìn" (có dấu / không dấu)
        const hasTargetTag = tagText.includes('THÂN') || tagText.includes('THÌN') ||
                             tagText.includes('THAN') || tagText.includes('THIN');

        if (!isMultiWordName || !hasTargetTag) {
            nonCandidates.push({ header, wrapEl });
        } else {
            candidateList.push({ header, leftEl, wrapEl, nameEl });
        }
    });

    // Đặt lại các phần tử không thỏa điều kiện (chỉ ghi nếu đang mang style hoặc class)
    nonCandidates.forEach(({ header, wrapEl }) => {
        if (wrapEl.style.transform) wrapEl.style.transform = '';
        if (header.classList.contains('is-visual-balanced')) header.classList.remove('is-visual-balanced');
        if (header.classList.contains('is-crowded')) header.classList.remove('is-crowded');
    });

    if (candidateList.length === 0) return;

    // Reset transform của các ứng viên về rỗng trước khi đo đạc vị trí tự nhiên (Batch Write 1)
    candidateList.forEach(item => {
        if (item.wrapEl.style.transform) item.wrapEl.style.transform = '';
        if (item.header.classList.contains('is-visual-balanced')) item.header.classList.remove('is-visual-balanced');
        if (item.header.classList.contains('is-crowded')) item.header.classList.remove('is-crowded');
    });

    // === PHA 2: BATCH READ HÀNG LOẠT (TUYỆT ĐỐI KHÔNG GHI DOM TRONG VÒNG LẶP NÀY) ===
    // Trình duyệt chỉ tính toán layout đúng 1 lần duy nhất cho toàn bộ danh sách!
    candidateList.forEach(item => {
        const { leftEl, nameEl } = item;

        const nameRect = nameEl.getBoundingClientRect();
        if (nameRect.width === 0 && nameRect.height === 0) {
            item.computedShift = null;
            return;
        }

        // Tọa độ X cạnh trái (chữ cái đầu tiên) của Element A (Tên cung)
        const x_start = nameRect.left;

        // Tọa độ X của ký tự "n" cuối cùng trong từ "Thân" / "Thìn" thuộc Element B
        let x_end = null;
        try {
            const walker = document.createTreeWalker(leftEl, NodeFilter.SHOW_TEXT, null, false);
            let node;
            let targetNode = null;
            let targetIndex = -1;

            while ((node = walker.nextNode())) {
                const val = node.nodeValue || '';
                const nIndex = Math.max(val.lastIndexOf('n'), val.lastIndexOf('N'));
                if (nIndex !== -1) {
                    targetNode = node;
                    targetIndex = nIndex;
                }
            }

            if (targetNode && targetIndex !== -1) {
                const range = document.createRange();
                range.setStart(targetNode, targetIndex);
                range.setEnd(targetNode, targetIndex + 1);
                const charRect = range.getBoundingClientRect();
                if (charRect && charRect.width > 0) {
                    x_end = charRect.right;
                }
            }
        } catch (err) {
            console.warn('[adjustPalaceHeaderLayout] Range API fallback getBoundingClientRect:', err);
        }

        if (x_end === null) {
            x_end = leftEl.getBoundingClientRect().right;
        }

        // Khoảng hở thực tế giữa chữ "n" (Element B) và cạnh trái Tên cung (Element A)
        const rawGap = x_start - x_end;
        const gap = boardScale > 0 ? (rawGap / boardScale) : rawGap;

        if (gap < MIN_SAFE_GAP) {
            const neededShift = Math.ceil(MIN_SAFE_GAP - gap);
            item.computedShift = Math.min(neededShift, 10);
        } else {
            item.computedShift = 0;
        }
    });

    // === PHA 3: BATCH WRITE HÀNG LOẠT (ÁP DỤNG TRANSFORMATION ĐÃ TÍNH TOÁN) ===
    candidateList.forEach(item => {
        if (item.computedShift === null) return;

        if (item.computedShift > 0) {
            const newTransform = `translateX(${item.computedShift}px)`;
            if (item.wrapEl.style.transform !== newTransform) {
                item.wrapEl.style.transform = newTransform;
            }
            if (!item.header.classList.contains('is-visual-balanced')) {
                item.header.classList.add('is-visual-balanced');
            }
        } else {
            if (item.wrapEl.style.transform) {
                item.wrapEl.style.transform = '';
            }
            if (item.header.classList.contains('is-visual-balanced')) {
                item.header.classList.remove('is-visual-balanced');
            }
        }
    });
}
window.adjustPalaceHeaderLayout = adjustPalaceHeaderLayout;

// Tự động kiểm tra lại khi resize hoặc xoay màn hình
window.addEventListener('resize', () => {
    if (window._tuviHeaderResizeDebounce) clearTimeout(window._tuviHeaderResizeDebounce);
    window._tuviHeaderResizeDebounce = setTimeout(adjustPalaceHeaderLayout, 80);
});
window.addEventListener('orientationchange', () => {
    setTimeout(adjustPalaceHeaderLayout, 150);
});
