/**

 * ui-controller.js

 * Điều khiển bảng nhập liệu, trạng thái lịch âm/dương, debounce và lớp phủ loading.

 * Độc lập hóa trường họ tên để không kích hoạt request tính toán thừa.

 */

let tuviLoadingStartTime = 0;

const MIN_LOADING_TIME = 350; // ms

if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.parent && window.parent !== window) {
    document.documentElement.classList.add('is-embedded');
}

let _createContainerHeightTimer = null;

/**
 * Chuyển tiếp chiều cao mượt mà cho khung panel bên trái khi thêm/bớt phần tử con.
 */
function animateCreateContainerHeight(mutateFn) {
    const container = document.getElementById('createViewTransitionContainer');
    const formPane = document.getElementById('createFormViewPane');
    if (!container || (typeof isTuViViewTransitioning !== 'undefined' && isTuViViewTransitioning) || (formPane && formPane.style.display === 'none')) {
        if (typeof mutateFn === 'function') mutateFn();
        return;
    }

    if (_createContainerHeightTimer) {
        clearTimeout(_createContainerHeightTimer);
        _createContainerHeightTimer = null;
    }

    const startH = Math.round(container.getBoundingClientRect().height);
    container.style.transition = '';
    container.style.height = 'auto';

    if (typeof mutateFn === 'function') mutateFn();

    const endH = Math.round(container.getBoundingClientRect().height);
    if (!startH || Math.abs(endH - startH) < 2) {
        container.style.height = '';
        container.style.transition = '';
        if (typeof isTuViViewTransitioning === 'undefined' || !isTuViViewTransitioning) {
            container.classList.remove('is-view-animating');
        }
        return;
    }

    // Khi khung giãn rộng (ví dụ hiện khối Lưu lá số), báo chiều cao đích 1 lần trước khi co về startH để trang cha không giật từng nấc
    if (endH > startH && typeof _executeNotifyParentHeight === 'function') {
        _executeNotifyParentHeight();
    }

    container.classList.add('is-view-animating');
    container.style.height = startH + 'px';
    void container.offsetHeight;

    container.style.transition = 'height 520ms cubic-bezier(0.22, 1, 0.36, 1)';
    container.style.height = endH + 'px';

    _createContainerHeightTimer = setTimeout(() => {
        container.style.transition = 'none';
        container.style.height = '';
        void container.offsetHeight;
        container.style.transition = '';
        if (typeof isTuViViewTransitioning === 'undefined' || !isTuViViewTransitioning) {
            container.classList.remove('is-view-animating');
        }
        _createContainerHeightTimer = null;
        if (typeof notifyParentHeight === 'function') {
            notifyParentHeight();
        }
    }, 530);
}

/**
 * Hoán đổi mượt mà giữa hai nút hành động chính (Lập lá số <-> Luận giải lá số).
 */
function swapActionButtons(hideBtn, showBtn, options = {}) {
    const forceEnter = Boolean(options && options.forceEnter);

    if (hideBtn && hideBtn !== showBtn) {
        if (document.activeElement === hideBtn && typeof hideBtn.blur === 'function') {
            hideBtn.blur();
        }
        if (hideBtn._swapTimer) {
            clearTimeout(hideBtn._swapTimer);
            hideBtn._swapTimer = null;
        }
        const isHideVisible = getComputedStyle(hideBtn).display !== 'none' && !hideBtn.classList.contains('is-hidden');
        hideBtn.classList.remove('btn-reappear', 'is-btn-entering', 'is-generating');
        if ('disabled' in hideBtn) hideBtn.disabled = false;

        if (isHideVisible) {
            hideBtn.classList.add('is-btn-exiting');
            hideBtn.style.display = 'flex';
            hideBtn._swapTimer = setTimeout(() => {
                hideBtn.classList.remove('is-btn-exiting');
                hideBtn.classList.add('is-hidden');
                hideBtn.style.display = 'none';
                hideBtn._swapTimer = null;
            }, 330);
        } else {
            hideBtn.classList.remove('is-btn-exiting');
            hideBtn.classList.add('is-hidden');
            hideBtn.style.display = 'none';
        }
    }

    if (showBtn) {
        if (showBtn._swapTimer) {
            clearTimeout(showBtn._swapTimer);
            showBtn._swapTimer = null;
        }
        const wasHidden = forceEnter ||
            getComputedStyle(showBtn).display === 'none' ||
            showBtn.classList.contains('is-hidden') ||
            showBtn.classList.contains('is-btn-exiting');

        showBtn.classList.remove('is-btn-exiting', 'is-hidden', 'is-generating');
        if ('disabled' in showBtn) showBtn.disabled = false;
        showBtn.style.display = 'flex';

        if (wasHidden) {
            showBtn.classList.remove('btn-reappear', 'is-btn-entering');
            void showBtn.offsetWidth;
            showBtn.classList.add('btn-reappear', 'is-btn-entering');
            showBtn._swapTimer = setTimeout(() => {
                showBtn.classList.remove('is-btn-entering');
                showBtn._swapTimer = null;
            }, 430);
        }
    }
}

function showTuViLoading() {

    tuviLoadingStartTime = Date.now();

    const overlay = document.getElementById("tuviLoadingOverlay");

    const board = document.getElementById("tuviBoard");

    if (overlay) {

        overlay.classList.remove("hidden");
        // Đã loại bỏ void overlay.offsetWidth để khử Forced Synchronous Reflow

    }

    if (board) board.classList.add("is-updating");

}

async function hideTuViLoading() {

    const elapsedTime = Date.now() - tuviLoadingStartTime;

    const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

    if (remainingTime > 0) {

        await new Promise(resolve => setTimeout(resolve, remainingTime));

    }

    const overlay = document.getElementById("tuviLoadingOverlay");

    const board = document.getElementById("tuviBoard");

    if (overlay) overlay.classList.add("hidden");

    if (board) board.classList.remove("is-updating");

}

function debounce(func, wait = 300) {

    let timeout;

    return function (...args) {

        clearTimeout(timeout);

        timeout = setTimeout(() => func.apply(this, args), wait);

    };

}

function populateSelect(id, start, end, selected) {

    const select = document.getElementById(id);

    if (!select) return;

    select.innerHTML = "";

    for (let i = start; i <= end; i++) {

        let val = i.toString().padStart(2, '0');

        let option = new Option(val, i);

        if (i === selected) option.selected = true;

        select.add(option);

    }

    if (typeof syncMobileSelectTrigger === 'function') {
        syncMobileSelectTrigger(select);
    }

}

function updateDaysInMonth() {

    let year = parseInt(document.getElementById("txtYear").value) || 2006;

    let month = parseInt(document.getElementById("txtMonth").value) || 1;

    let isSolar = document.querySelector('input[name="calendar"]:checked')?.value === "solar";

    let maxDays = 31;

    if (isSolar) {

        maxDays = new Date(year, month, 0).getDate();

    } else {

        maxDays = 30;

    }

    const daySelect = document.getElementById("txtDay");

    if (!daySelect) return;

    let currentDay = parseInt(daySelect.value) || 1;

    if (daySelect.options.length !== maxDays) {

        daySelect.innerHTML = "";

        for (let i = 1; i <= maxDays; i++) {

            let val = i.toString().padStart(2, '0');

            let option = new Option(val, i);

            if (i === currentDay) option.selected = true;

            daySelect.add(option);

        }

        if (currentDay > maxDays) {

            currentDay = maxDays;

            daySelect.value = currentDay;

        }

    }

    if (typeof syncMobileSelectTrigger === 'function') {
        syncMobileSelectTrigger(daySelect);
    }

}

function initDropdowns() {

    populateSelect("txtYear", 1900, 2100, 2006);

    populateSelect("txtMonth", 1, 12, 1);

    populateSelect("txtDay", 1, 31, 1);

    populateSelect("txtHour", 0, 23, 0);

    populateSelect("txtMinute", 0, 59, 0);

    populateSelect("txtLimitYear", 2000, 2100, 2027);

}

function toggleCalendarType() {

    const calRadio = document.querySelector('input[name="calendar"]:checked');

    let isLunar = calRadio ? (calRadio.value === "lunar") : false;

    const leapRow = document.getElementById("rowLeapMonth");

    if (!leapRow) return;

    const isCurrentlyHidden = getComputedStyle(leapRow).display === "none";
    const isCurrentlyCollapsing = leapRow.dataset.leapState === "collapsing";
    const isCurrentlyExpanding = leapRow.dataset.leapState === "expanding";

    if (isLunar && !isCurrentlyHidden && !isCurrentlyCollapsing) return;
    if (!isLunar && (isCurrentlyHidden || isCurrentlyCollapsing)) return;

    if (leapRow._revealTimer) {
        clearTimeout(leapRow._revealTimer);
        leapRow._revealTimer = null;
    }
    if (leapRow._notifyTimer) {
        clearTimeout(leapRow._notifyTimer);
        leapRow._notifyTimer = null;
    }

    leapRow.classList.remove("is-leap-entering");

    if (isLunar) {
        leapRow.dataset.leapState = "expanding";
        const startH = isCurrentlyHidden ? 0 : Math.round(leapRow.getBoundingClientRect().height);
        const cs = isCurrentlyHidden ? null : getComputedStyle(leapRow);
        const startMarginTop = isCurrentlyHidden ? "-9px" : cs.marginTop;
        const startOpacity = isCurrentlyHidden ? "0" : cs.opacity;
        const startTransform = isCurrentlyHidden ? "translateY(-4px)" : cs.transform;

        leapRow.style.transition = "none";
        leapRow.style.display = "flex";
        leapRow.style.height = "auto";
        leapRow.style.marginTop = "0px";
        const targetH = Math.round(leapRow.offsetHeight) || 26;

        leapRow.style.overflow = "hidden";
        leapRow.style.pointerEvents = "none";
        leapRow.style.height = startH + "px";
        leapRow.style.marginTop = startMarginTop;
        leapRow.style.opacity = startOpacity;
        leapRow.style.transform = startTransform === "none" ? "translateY(-4px)" : startTransform;
        void leapRow.offsetHeight;

        leapRow.style.transition = [
            "height 420ms cubic-bezier(0.22, 1, 0.36, 1)",
            "margin-top 420ms cubic-bezier(0.22, 1, 0.36, 1)",
            "opacity 360ms cubic-bezier(0.22, 1, 0.36, 1)",
            "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)"
        ].join(", ");
        leapRow.style.height = targetH + "px";
        leapRow.style.marginTop = "0px";
        leapRow.style.opacity = "1";
        leapRow.style.transform = "translateY(0)";

        if (typeof notifyParentHeight === "function") {
            leapRow._notifyTimer = setTimeout(notifyParentHeight, 220);
        }

        leapRow._revealTimer = setTimeout(() => {
            leapRow.style.transition = "";
            leapRow.style.height = "";
            leapRow.style.marginTop = "";
            leapRow.style.opacity = "";
            leapRow.style.transform = "";
            leapRow.style.overflow = "";
            leapRow.style.pointerEvents = "";
            delete leapRow.dataset.leapState;
            leapRow._revealTimer = null;
            if (typeof notifyParentHeight === "function") notifyParentHeight();
        }, 430);
    } else {
        leapRow.dataset.leapState = "collapsing";
        const cs = getComputedStyle(leapRow);
        const startH = isCurrentlyExpanding
            ? Math.round(leapRow.getBoundingClientRect().height)
            : (Math.round(leapRow.getBoundingClientRect().height) || leapRow.offsetHeight || 26);
        const startMarginTop = isCurrentlyExpanding ? cs.marginTop : "0px";
        const startOpacity = isCurrentlyExpanding ? cs.opacity : "1";
        const startTransform = isCurrentlyExpanding && cs.transform !== "none" ? cs.transform : "translateY(0)";

        leapRow.style.transition = "none";
        leapRow.style.overflow = "hidden";
        leapRow.style.pointerEvents = "none";
        leapRow.style.height = startH + "px";
        leapRow.style.marginTop = startMarginTop;
        leapRow.style.opacity = startOpacity;
        leapRow.style.transform = startTransform;
        void leapRow.offsetHeight;

        leapRow.style.transition = [
            "height 400ms cubic-bezier(0.22, 1, 0.36, 1)",
            "margin-top 400ms cubic-bezier(0.22, 1, 0.36, 1)",
            "opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            "transform 380ms cubic-bezier(0.4, 0, 0.2, 1)"
        ].join(", ");
        leapRow.style.height = "0px";
        leapRow.style.marginTop = "-9px";
        leapRow.style.opacity = "0";
        leapRow.style.transform = "translateY(-4px)";

        if (typeof notifyParentHeight === "function") {
            leapRow._notifyTimer = setTimeout(notifyParentHeight, 200);
        }

        leapRow._revealTimer = setTimeout(() => {
            leapRow.style.display = "none";
            leapRow.style.transition = "";
            leapRow.style.height = "";
            leapRow.style.marginTop = "";
            leapRow.style.opacity = "";
            leapRow.style.transform = "";
            leapRow.style.overflow = "";
            leapRow.style.pointerEvents = "";
            delete leapRow.dataset.leapState;
            leapRow._revealTimer = null;
            if (typeof notifyParentHeight === "function") notifyParentHeight();
        }, 410);
    }

}

function collectInputParams() {

    let name = document.getElementById("txtName") ? (document.getElementById("txtName").value.trim() || "Vô Danh") : "Vô Danh";

    let gender = document.querySelector('input[name="gender"]:checked')?.value || "Nam";

    let isSolar = (document.querySelector('input[name="calendar"]:checked')?.value === "solar");

    let isLeapMonthInput = document.getElementById("chkIsLeap") ? document.getElementById("chkIsLeap").checked : false;

    let year = parseInt(document.getElementById("txtYear")?.value) || 2006;

    let month = parseInt(document.getElementById("txtMonth")?.value) || 1;

    let day = parseInt(document.getElementById("txtDay")?.value) || 1;

    let hour = parseInt(document.getElementById("txtHour")?.value) || 0;

    let minute = parseInt(document.getElementById("txtMinute")?.value) || 0;

    let limitYear = parseInt(document.getElementById("txtLimitYear")?.value) || 2027;

    const params = {

        name,

        gender,

        is_solar: isSolar,

        isSolar: isSolar,

        day,

        month,

        year,

        hour,

        minute,

        is_leap_month_input: isLeapMonthInput,

        isLeapMonthInput: isLeapMonthInput,

        limit_year: limitYear,

        limitYear

    };

    return params;

}

let currentTuViUIState = 'preview'; // 'preview' | 'input-changed' | 'generated'

function isPreviewName(name) {

    if (!name) return true;

    const n = name.trim().toLowerCase();

    return n === "www.tuvihongan.com" || n === "ww.tuvihongan.com" || n === "tuvihongan.com";

}

function syncBodyTuViStateClass(state) {
    document.body.classList.remove('tuvi-state-preview', 'tuvi-state-input-changed', 'tuvi-state-generated');
    if (state) {
        document.body.classList.add(`tuvi-state-${state}`);
    }
}

let _mobileAuxHeightTimer = null;

function animateMobileAuxHeight(mutateFn) {
    const mobileContainer = document.getElementById('mobileAuxContainer');
    const isMobileView = document.body.classList.contains('viewport-mobile');
    if (!mobileContainer || !isMobileView) {
        if (typeof mutateFn === 'function') mutateFn();
        return;
    }

    if (_mobileAuxHeightTimer) {
        clearTimeout(_mobileAuxHeightTimer);
        _mobileAuxHeightTimer = null;
    }

    const startH = Math.round(mobileContainer.getBoundingClientRect().height);
    mobileContainer.style.transition = 'none';
    mobileContainer.style.height = 'auto';

    if (typeof mutateFn === 'function') mutateFn();

    const endH = Math.round(mobileContainer.getBoundingClientRect().height);
    if (Math.abs(endH - startH) < 2) {
        mobileContainer.style.height = '';
        mobileContainer.style.transition = '';
        mobileContainer.classList.remove('is-mobile-aux-animating');
        return;
    }

    mobileContainer.classList.add('is-mobile-aux-animating');
    mobileContainer.style.height = startH + 'px';
    void mobileContainer.offsetHeight;

    mobileContainer.style.transition = 'height 460ms cubic-bezier(0.22, 1, 0.36, 1)';
    mobileContainer.style.height = endH + 'px';

    if (typeof notifyParentHeight === 'function') {
        notifyParentHeight();
        setTimeout(notifyParentHeight, 230);
    }

    _mobileAuxHeightTimer = setTimeout(() => {
        mobileContainer.style.transition = 'none';
        mobileContainer.style.height = '';
        void mobileContainer.offsetHeight;
        mobileContainer.style.transition = '';
        mobileContainer.classList.remove('is-mobile-aux-animating');
        _mobileAuxHeightTimer = null;
        if (typeof notifyParentHeight === 'function') {
            notifyParentHeight();
        }
    }, 475);
}

function setPanelFooterNote(mode = 'default', animate = false) {
    const footerNote = document.getElementById('panelFooterNote') || document.querySelector('.panel-footer-note');
    if (!footerNote) return;
    const prevMode = footerNote.dataset.noteMode || 'default';
    if (prevMode === mode && footerNote.textContent.trim().length > 0) return;

    const inputPanel = document.querySelector('.input-panel');
    const startH = (animate && inputPanel) ? Math.round(inputPanel.getBoundingClientRect().height) : 0;

    footerNote.dataset.noteMode = mode;
    if (mode === 'generated') {
        footerNote.innerHTML = '<span class="panel-footer-line">Nhấp chọn ô cung để hiển thị</span> <span class="panel-footer-line">các mối tương quan trong lá số.</span>';
    } else {
        footerNote.textContent = 'An sao theo Tử Vi Đẩu Số Tân Biên 1956';
    }

    if (animate) {
        footerNote.classList.remove('is-note-swapping');
        void footerNote.offsetWidth;
        footerNote.classList.add('is-note-swapping');
        if (footerNote._swapTimer) clearTimeout(footerNote._swapTimer);
        footerNote._swapTimer = setTimeout(() => {
            footerNote.classList.remove('is-note-swapping');
            footerNote._swapTimer = null;
        }, 340);

        if (inputPanel && startH > 0 && !inputPanel.classList.contains('is-tab-animating')) {
            const endH = Math.round(inputPanel.getBoundingClientRect().height);
            if (Math.abs(endH - startH) >= 2) {
                inputPanel.classList.add('is-tab-animating');
                inputPanel.style.height = startH + 'px';
                void inputPanel.offsetHeight;
                inputPanel.style.transition = 'height 320ms cubic-bezier(0.22, 1, 0.36, 1)';
                inputPanel.style.height = endH + 'px';
                setTimeout(() => {
                    inputPanel.style.transition = 'none';
                    inputPanel.style.height = '';
                    void inputPanel.offsetHeight;
                    inputPanel.style.transition = '';
                    inputPanel.classList.remove('is-tab-animating');
                    if (typeof notifyParentHeight === 'function') notifyParentHeight();
                }, 335);
            }
        }
    }
}

function setTuViUIState(state) {

    const previousState = currentTuViUIState;
    currentTuViUIState = state;
    syncBodyTuViStateClass(state);

    const isMobileView = document.body.classList.contains('viewport-mobile');

    const actionSec = document.getElementById("actionSection");

    const btnGen = document.getElementById("btnGenerateTuVi");

    const btnLuanGiai = document.getElementById("btnOpenLuanGiai");
    const btnAlreadyInterpreted = document.getElementById("btnAlreadyInterpreted");

    const exportSec = document.getElementById("exportSection");

    const luanGiaiOptions = document.getElementById("luanGiaiOptions");

    const mobileContainer = document.getElementById("mobileAuxContainer");

    const mobileActionPane = document.getElementById("mobileActionPane");

    function hideMobileServiceOptions() {
        if (!luanGiaiOptions) return;
        luanGiaiOptions.classList.remove('is-expanded', 'is-mobile-entering');
        luanGiaiOptions.style.display = 'none';
    }

    function showMobileServiceOptionsDirectly(shouldAnimate = false) {
        if (!isMobileView || !luanGiaiOptions) return;
        if (mobileContainer) mobileContainer.classList.remove('collapsed-view');
        if (mobileActionPane) {
            mobileActionPane.style.display = 'flex';
            mobileActionPane.style.visibility = 'visible';
            mobileActionPane.style.position = 'relative';
            mobileActionPane.style.animation = '';
        }
        luanGiaiOptions.classList.add('is-expanded');
        luanGiaiOptions.style.display = 'flex';
        luanGiaiOptions.style.position = 'relative';
        luanGiaiOptions.style.top = '';
        luanGiaiOptions.style.left = '';
        luanGiaiOptions.style.width = '';
        luanGiaiOptions.style.zIndex = '';
        luanGiaiOptions.style.visibility = 'visible';
        luanGiaiOptions.style.animation = '';

        if (shouldAnimate) {
            luanGiaiOptions.classList.remove('is-mobile-entering');
            void luanGiaiOptions.offsetWidth;
            luanGiaiOptions.classList.add('is-mobile-entering');
            if (luanGiaiOptions._mobileEnterTimer) clearTimeout(luanGiaiOptions._mobileEnterTimer);
            luanGiaiOptions._mobileEnterTimer = setTimeout(() => {
                luanGiaiOptions.classList.remove('is-mobile-entering');
                luanGiaiOptions._mobileEnterTimer = null;
            }, 600);
        }
    }

    if (state === 'preview') {

        setPanelFooterNote('default', false);

        // Trạng thái 1: Khởi tạo ban đầu (Preview Mode - Dữ liệu mẫu)
        // Ẩn hoàn toàn: Nút "Lập lá số", khối "Lưu lá số dưới dạng:", nút "Luận giải" và 2 thẻ dịch vụ luận giải
        const runPreviewMutate = () => {
            if (actionSec) actionSec.style.display = 'none';

            if (btnGen) {
                btnGen.style.display = 'none';
                btnGen.classList.remove('btn-reappear', 'is-btn-entering', 'is-btn-exiting', 'is-generating');
                btnGen.disabled = false;
                btnGen.classList.add('is-hidden');
            }

            if (btnLuanGiai) {
                btnLuanGiai.style.display = 'none';
                btnLuanGiai.classList.remove('btn-reappear', 'is-btn-entering', 'is-btn-exiting');
            }

            if (exportSec) {
                exportSec.classList.remove('is-section-entering', 'is-mobile-entering');
                exportSec.style.display = 'none';
            }

            hideMobileServiceOptions();
        };

        if (isMobileView) {
            animateMobileAuxHeight(runPreviewMutate);
        } else {
            animateCreateContainerHeight(runPreviewMutate);
        }

    } 

    else if (state === 'input-changed') {
        setPanelFooterNote('default', previousState === 'generated');

        const btnGenWasHidden = !btnGen ||
            getComputedStyle(btnGen).display === 'none' ||
            btnGen.classList.contains('is-hidden') ||
            btnGen.classList.contains('is-btn-exiting');

        const runInputChangedMutate = () => {
            if (exportSec) {
                exportSec.classList.remove('is-section-entering', 'is-mobile-entering');
                exportSec.style.display = 'none';
            }

            // Mở lại panel nếu đang ở chế độ collapsed
            const inputPanel = document.querySelector('.input-panel');
            if (inputPanel && inputPanel.classList.contains('collapsed-view')) {
                inputPanel.classList.remove('collapsed-view');
            }

            if (btnLuanGiai && isMobileView) {
                btnLuanGiai.style.display = 'none';
            }

            // Cập nhật trạng thái trùng khớp trước khi chạy hiệu ứng nút vào để chuyển thẳng không nhấp nháy
            if (typeof checkFormDuplicateWithHistory === 'function') {
                checkFormDuplicateWithHistory({ suppressContentSwap: btnGenWasHidden });
            }

            if (isMobileView) {
                const isDup = Boolean(btnGen && btnGen.classList.contains('is-duplicate-match'));
                if (actionSec) actionSec.style.display = isDup ? 'flex' : 'none';
                if (btnGen && !isDup) {
                    btnGen.style.display = 'none';
                    btnGen.classList.add('is-hidden');
                }
                hideMobileServiceOptions();
            } else {
                if (actionSec) actionSec.style.display = 'flex';
                hideMobileServiceOptions();
                swapActionButtons(btnLuanGiai, btnGen, { forceEnter: btnGenWasHidden });
            }
        };

        if (isMobileView) {
            animateMobileAuxHeight(runInputChangedMutate);
        } else {
            animateCreateContainerHeight(runInputChangedMutate);
        }
    }else if (state === 'generated') {

        // Trạng thái 3: Lập lá số thành công (Generated Successfully)
        // Trên Desktop: hiển thị nút "Luận giải" thay thế vị trí nút "Lập lá số"
        // Trên Mobile: ẩn nút "Luận giải lá số", phát hiệu ứng xuất hiện mượt mà cho khối Lưu lá số & 2 dịch vụ dưới lá số
        const exportWasHidden = !exportSec || getComputedStyle(exportSec).display === 'none';
        const shouldAnimateMobile = isMobileView && (previousState !== 'generated' || exportWasHidden);

        const runGeneratedMutate = () => {
            const hasInterpreted = typeof getCurrentChartAiSession === 'function' && Boolean(getCurrentChartAiSession());

            if (isMobileView) {
                if (hasInterpreted) {
                    hideMobileServiceOptions();
                    if (actionSec) actionSec.style.display = 'flex';
                    if (btnGen) {
                        btnGen.style.display = 'none';
                        btnGen.classList.add('is-hidden');
                        btnGen.classList.remove('btn-reappear', 'is-btn-entering', 'is-btn-exiting', 'is-generating');
                    }
                    if (btnLuanGiai) {
                        btnLuanGiai.style.display = 'none';
                        btnLuanGiai.classList.remove('btn-reappear', 'is-btn-entering', 'is-btn-exiting');
                    }
                    if (btnAlreadyInterpreted) {
                        btnAlreadyInterpreted.style.display = 'flex';
                        btnAlreadyInterpreted.classList.remove('is-hidden', 'is-btn-exiting');
                    }
                } else {
                    if (btnAlreadyInterpreted) btnAlreadyInterpreted.style.display = 'none';
                    if (actionSec) actionSec.style.display = 'none';
                    if (btnGen) {
                        btnGen.style.display = 'none';
                        btnGen.classList.add('is-hidden');
                        btnGen.classList.remove('btn-reappear', 'is-btn-entering', 'is-btn-exiting', 'is-generating');
                    }
                    if (btnLuanGiai) {
                        btnLuanGiai.style.display = 'none';
                        btnLuanGiai.classList.remove('btn-reappear', 'is-btn-entering', 'is-btn-exiting');
                    }
                    showMobileServiceOptionsDirectly(shouldAnimateMobile);
                }
            } else {
                if (actionSec) actionSec.style.display = 'flex';
                if (hasInterpreted && btnAlreadyInterpreted) {
                    if (btnLuanGiai) {
                        btnLuanGiai.style.display = 'none';
                        btnLuanGiai.classList.remove('btn-reappear', 'is-btn-entering', 'is-btn-exiting');
                    }
                    swapActionButtons(btnGen, btnAlreadyInterpreted, { forceEnter: previousState !== 'generated' });
                } else {
                    if (btnAlreadyInterpreted) btnAlreadyInterpreted.style.display = 'none';
                    swapActionButtons(btnGen, btnLuanGiai, { forceEnter: previousState !== 'generated' });
                }
            }

            if (exportSec) {
                exportSec.style.display = 'flex';
                if (exportWasHidden) {
                    const enterCls = isMobileView ? 'is-mobile-entering' : 'is-section-entering';
                    exportSec.classList.remove('is-section-entering', 'is-mobile-entering');
                    void exportSec.offsetWidth;
                    exportSec.classList.add(enterCls);
                    if (exportSec._revealTimer) clearTimeout(exportSec._revealTimer);
                    exportSec._revealTimer = setTimeout(() => {
                        exportSec.classList.remove('is-section-entering', 'is-mobile-entering');
                        exportSec._revealTimer = null;
                    }, 480);
                }
            }
        };

        if (isMobileView) {
            animateMobileAuxHeight(runGeneratedMutate);
        } else {
            animateCreateContainerHeight(runGeneratedMutate);
        }

        if (isMobileView && typeof schedulePrewarmChartImage === 'function') {
            schedulePrewarmChartImage(200);
        }

        setPanelFooterNote('generated', previousState !== 'generated');

    }

    if (typeof notifyParentHeight === "function") {

        notifyParentHeight();

    }

}

function handleTuViInputChange() {
    const prevState = currentTuViUIState;
    setTuViUIState('input-changed');
    const overlay = document.getElementById("tuviStaleOverlay");
    if (overlay) {
        overlay.classList.remove("hidden");
    }
    const params = collectInputParams();

    // Chỉ đối chiếu lại khi đang ở sẵn trạng thái sửa form; chuyển từ generated đã được setTuViUIState kiểm tra
    if (prevState === 'input-changed' && typeof checkFormDuplicateWithHistory === 'function') {
        checkFormDuplicateWithHistory();
    }
}

function showGenerateButton() {

    setTuViUIState('input-changed');

}

function hideGenerateButton() {

    const btn = document.getElementById("btnGenerateTuVi");

    if (btn) {

        btn.classList.remove("btn-reappear");

        btn.classList.add("is-hidden");

        btn.style.display = 'none';

    }

}

function showTuViStaleNotice() {

    handleTuViInputChange();

}

function hideTuViStaleNotice() {

    const overlay = document.getElementById("tuviStaleOverlay");

    if (overlay) {

        overlay.classList.add("hidden");

    }

}

function initEventListeners() {

    // 1. Họ và tên: Cập nhật tên và kích hoạt Trạng thái 2

    const nameEl = document.getElementById("txtName");

    if (nameEl) {

        nameEl.addEventListener("input", (e) => {

            if (typeof updateBoardNameOnly === "function") {

                updateBoardNameOnly(e.target.value);

            }

            handleTuViInputChange();

        });

    }

    // 2. Giới tính

    document.querySelectorAll('input[name="gender"]').forEach(el => {

        el.addEventListener("change", () => {

            handleTuViInputChange();

        });

    });

    // 3. Loại lịch (Dương lịch / Âm lịch)

    document.querySelectorAll('input[name="calendar"]').forEach(el => {

        el.addEventListener("change", () => {

            toggleCalendarType();

            updateDaysInMonth();

            handleTuViInputChange();

        });

    });

    // 4. Tháng nhuận

    const leapEl = document.getElementById("chkIsLeap");

    if (leapEl) {

        leapEl.addEventListener("change", () => {

            handleTuViInputChange();

        });

    }

    // 5. Năm sinh, Tháng sinh, Ngày sinh

    const yearEl = document.getElementById("txtYear");

    if (yearEl) {

        yearEl.addEventListener("change", () => {

            updateDaysInMonth();

            handleTuViInputChange();

        });

    }

    const monthEl = document.getElementById("txtMonth");

    if (monthEl) {

        monthEl.addEventListener("change", () => {

            updateDaysInMonth();

            handleTuViInputChange();

        });

    }

    const dayEl = document.getElementById("txtDay");

    if (dayEl) {

        dayEl.addEventListener("change", () => {

            handleTuViInputChange();

        });

    }

    // 6. Giờ sinh, Phút sinh

    const hourEl = document.getElementById("txtHour");

    if (hourEl) {

        hourEl.addEventListener("change", () => {

            handleTuViInputChange();

        });

    }

    const minuteEl = document.getElementById("txtMinute");

    if (minuteEl) {

        minuteEl.addEventListener("change", () => {

            handleTuViInputChange();

        });

    }

    // 7. Năm xem hạn

    const limitYearEl = document.getElementById("txtLimitYear");

    if (limitYearEl) {

        limitYearEl.addEventListener("change", () => {

            handleTuViInputChange();

        });

    }

    // 8. Đồng bộ số điện thoại Hotline ngẫu nhiên theo phiên (Session-based)

    syncBoardHotline();

    // 9. Bộ chọn thả xuống gọn nhẹ trên Mobile (tránh danh sách toàn màn hình mặc định của Chrome)
    initMobileAnchoredSelects();

    // 10. Khởi tạo trạng thái ban đầu (Trạng thái 1: Preview Mode)

    setTuViUIState('preview');

}

const MOBILE_SELECT_IDS = ['txtDay', 'txtMonth', 'txtYear', 'txtHour', 'txtMinute', 'txtLimitYear'];
let _mobileSelectPopoverEl = null;
let _activeMobileSelect = null;
let _activeMobileTrigger = null;
let _mobileSelectGlobalBound = false;

function ensureMobileSelectPopover() {
    if (_mobileSelectPopoverEl && document.body.contains(_mobileSelectPopoverEl)) {
        return _mobileSelectPopoverEl;
    }
    const existing = document.getElementById('mobileSelectPopover');
    if (existing) {
        _mobileSelectPopoverEl = existing;
        return existing;
    }
    const pop = document.createElement('div');
    pop.id = 'mobileSelectPopover';
    pop.className = 'mobile-select-popover';
    pop.setAttribute('role', 'listbox');
    const list = document.createElement('div');
    list.className = 'mobile-select-list';
    pop.appendChild(list);
    document.body.appendChild(pop);
    _mobileSelectPopoverEl = pop;
    return pop;
}

function closeMobileSelectPopover() {
    if (_mobileSelectPopoverEl) {
        _mobileSelectPopoverEl.classList.remove('is-open', 'is-above');
    }
    if (_activeMobileTrigger) {
        _activeMobileTrigger.classList.remove('is-open');
        _activeMobileTrigger.setAttribute('aria-expanded', 'false');
    }
    _activeMobileSelect = null;
    _activeMobileTrigger = null;
}

function syncMobileSelectTrigger(selectEl) {
    if (!selectEl) return;
    const trigger = selectEl._mobileTriggerEl;
    if (!trigger) return;
    const valSpan = trigger.querySelector('.mobile-select-value');
    if (!valSpan) return;
    const selIdx = selectEl.selectedIndex;
    const optText = selIdx >= 0 && selectEl.options[selIdx]
        ? selectEl.options[selIdx].text
        : (selectEl.value || '');
    valSpan.textContent = optText;
}

function syncMobileSelectTriggers() {
    MOBILE_SELECT_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el) syncMobileSelectTrigger(el);
    });
}

function openMobileSelectPopover(selectEl, triggerEl) {
    if (!selectEl || !triggerEl) return;
    if (_activeMobileSelect === selectEl && _mobileSelectPopoverEl?.classList.contains('is-open')) {
        closeMobileSelectPopover();
        return;
    }

    closeMobileSelectPopover();

    const pop = ensureMobileSelectPopover();
    const listEl = pop.querySelector('.mobile-select-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    const currentValue = String(selectEl.value);
    let selectedBtn = null;

    Array.from(selectEl.options).forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mobile-select-option';
        btn.setAttribute('role', 'option');
        btn.dataset.value = opt.value;
        btn.textContent = opt.text;
        const isSel = String(opt.value) === currentValue;
        if (isSel) {
            btn.classList.add('is-selected');
            btn.setAttribute('aria-selected', 'true');
            selectedBtn = btn;
        }
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (String(selectEl.value) !== String(opt.value)) {
                selectEl.value = opt.value;
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            syncMobileSelectTriggers();
            closeMobileSelectPopover();
        });
        frag.appendChild(btn);
    });

    listEl.appendChild(frag);
    _activeMobileSelect = selectEl;
    _activeMobileTrigger = triggerEl;
    triggerEl.classList.add('is-open');
    triggerEl.setAttribute('aria-expanded', 'true');

    const rect = triggerEl.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const docClientW = document.documentElement.clientWidth || window.innerWidth;

    const minW = selectEl.id === 'txtYear' ? 106 : (selectEl.id === 'txtLimitYear' ? rect.width : 84);
    const popWidth = Math.min(Math.max(rect.width, minW), docClientW - 20);
    const idealLeft = rect.left + scrollX + (rect.width - popWidth) / 2;
    const clampedLeft = Math.min(Math.max(10, idealLeft), Math.max(10, docClientW - popWidth - 10));

    pop.style.width = `${Math.round(popWidth)}px`;
    pop.style.left = `${Math.round(clampedLeft)}px`;
    pop.classList.remove('is-above');
    pop.classList.add('is-open');

    const popHeight = pop.offsetHeight || 220;
    const docHeight = Math.max(document.documentElement.scrollHeight || 0, window.innerHeight || 0);
    const belowTop = rect.bottom + scrollY + 5;
    const aboveTop = rect.top + scrollY - popHeight - 5;

    if (belowTop + popHeight > docHeight - 8 && aboveTop >= 8) {
        pop.style.top = `${Math.round(aboveTop)}px`;
        pop.classList.add('is-above');
    } else {
        pop.style.top = `${Math.round(belowTop)}px`;
    }

    if (selectedBtn) {
        listEl.scrollTop = Math.max(0, selectedBtn.offsetTop - (listEl.clientHeight - selectedBtn.offsetHeight) / 2);
    } else {
        listEl.scrollTop = 0;
    }
}

function initMobileAnchoredSelects() {
    const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

    MOBILE_SELECT_IDS.forEach((id) => {
        const selectEl = document.getElementById(id);
        if (!selectEl) return;

        let wrap = selectEl.closest('.mobile-select-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'mobile-select-wrap';
            if (id === 'txtYear') wrap.classList.add('mobile-select-wrap--year');
            if (id === 'txtLimitYear') wrap.classList.add('mobile-select-wrap--full');
            wrap.dataset.for = id;

            selectEl.parentNode.insertBefore(wrap, selectEl);
            wrap.appendChild(selectEl);

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'mobile-select-trigger';
            trigger.setAttribute('aria-haspopup', 'listbox');
            trigger.setAttribute('aria-expanded', 'false');
            trigger.setAttribute('aria-label', selectEl.title || (id === 'txtLimitYear' ? 'Năm xem hạn' : id));
            trigger.dataset.selectId = id;

            const valSpan = document.createElement('span');
            valSpan.className = 'mobile-select-value';
            trigger.appendChild(valSpan);

            trigger.insertAdjacentHTML(
                'beforeend',
                '<svg class="mobile-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
            );

            wrap.appendChild(trigger);
            selectEl._mobileTriggerEl = trigger;

            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openMobileSelectPopover(selectEl, trigger);
            });

            selectEl.addEventListener('change', () => {
                syncMobileSelectTriggers();
            });
        }

        if (valueDesc && valueDesc.get && valueDesc.set && !selectEl._hasMobileValueHook) {
            selectEl._hasMobileValueHook = true;
            Object.defineProperty(selectEl, 'value', {
                configurable: true,
                enumerable: true,
                get() {
                    return valueDesc.get.call(this);
                },
                set(nextVal) {
                    valueDesc.set.call(this, nextVal);
                    syncMobileSelectTrigger(this);
                }
            });
        }

        syncMobileSelectTrigger(selectEl);
    });

    if (!_mobileSelectGlobalBound) {
        _mobileSelectGlobalBound = true;
        document.addEventListener('pointerdown', (e) => {
            if (!_mobileSelectPopoverEl?.classList.contains('is-open')) return;
            if (e.target.closest('#mobileSelectPopover') || e.target.closest('.mobile-select-trigger')) {
                return;
            }
            closeMobileSelectPopover();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && _mobileSelectPopoverEl?.classList.contains('is-open')) {
                closeMobileSelectPopover();
            }
        });
        window.addEventListener('blur', () => {
            closeMobileSelectPopover();
        });
    }
}

function syncBoardHotline() {

    try {

        const phoneEl = document.getElementById("tb-phone") || document.querySelector(".tb-header-phone");

        if (!phoneEl) return;

        const curChart = (typeof getCurrentChartData === "function") ? getCurrentChartData() : window.currentChartData;

        if (curChart && curChart.hotline) {

            phoneEl.textContent = curChart.hotline;

            return;

        }

        const savedHotline = sessionStorage.getItem("tuvi_hotline");

        if (savedHotline && savedHotline.length === 10) {

            phoneEl.textContent = `${savedHotline.slice(0, 4)}.${savedHotline.slice(4, 7)}.${savedHotline.slice(7)}`;

        } else if (typeof getNextOrRandomHotline === "function") {

            phoneEl.textContent = getNextOrRandomHotline();

        }

    } catch (_e) {}

}

// Điều chỉnh bố cục linh hoạt giữa Máy tính (>1024px) và Điện thoại (<=1024px)

// ========================================================

// HỆ THỐNG ĐIỀU PHỐI KHUNG NHÌN ĐẶC BIỆT (VIEWPORT ENGINE)

// Quản lý 2 trạng thái độc lập:

// 1. Desktop Mode (Width > Height): Co giãn tỷ lệ đồng nhất (Fixed Aspect Ratio Scaling)

// 2. Mobile Mode (Width <= Height): Chuyển tiếp liền mạch sang MobileTuViView

// ========================================================

let externalViewport = null;

function getEffectiveViewport() {
    const docW = document.documentElement ? document.documentElement.clientWidth : 0;
    const winW = window.innerWidth || 0;
    const clientW = docW > 0 ? docW : winW;

    let finalW = clientW || 1167;
    if (externalViewport && externalViewport.width > 0) {
        if (clientW > 0) {
            finalW = Math.min(externalViewport.width, clientW);
        } else {
            finalW = externalViewport.width;
        }
    }

    const clientH = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 768);
    const finalH = (externalViewport && externalViewport.height > 0) ? externalViewport.height : clientH;

    return { width: finalW, height: finalH };
}

function updateViewportEngine() {

    try {

        const stageViewport = document.getElementById('tuviStageViewport');

        const desktopStage = document.getElementById('tuviDesktopStage');

        const board = document.getElementById('tuviBoard');

        const wrapper = document.querySelector('.tuvi-board-wrapper');

        const mobileView = document.getElementById('mobileTuViView');

        if (mobileView) mobileView.style.display = 'none';

        const vp = getEffectiveViewport();

        const containerW = vp.width || window.innerWidth || document.documentElement.clientWidth || 375;

        const isMobileMode = (containerW <= 580);

        const isChartOnly = window.location.search.includes('view=chart') || 

                            window.location.search.includes('mode=chart') ||

                            document.body.classList.contains('mode-chart-view');

        if (isChartOnly) {

            document.body.classList.add('mode-chart-view');

            const staleOverlay = document.getElementById('tuviStaleOverlay');

            if (staleOverlay) {

                staleOverlay.classList.add('hidden');

                staleOverlay.style.display = 'none';

            }

            if (board && wrapper) {
                const BASE_WIDTH = 737;
                const BASE_HEIGHT = 1013;
                const availW = Math.max(240, (window.innerWidth || document.documentElement.clientWidth || 600) - 16);
                const availH = Math.max(240, (window.innerHeight || document.documentElement.clientHeight || 800) - 16);
                let sc = Math.min(availW / BASE_WIDTH, availH / BASE_HEIGHT);
                sc = Math.floor(sc * 1000) / 1000;
                board.style.width = `${BASE_WIDTH}px`;
                board.style.height = `${BASE_HEIGHT}px`;
                board.style.transform = `scale(${sc})`;
                board.style.transformOrigin = 'top left';
                wrapper.style.width = `${Math.round(BASE_WIDTH * sc)}px`;
                wrapper.style.height = `${Math.round(BASE_HEIGHT * sc)}px`;
                wrapper.style.margin = 'auto';
            }
            return;

        }

        if (isMobileMode) {

            // === CHẾ ĐỘ MOBILE: BẢNG NHẬP LIỆU Ở TRÊN, LÁ SỐ Ở DƯỚI ===

            document.body.classList.remove('viewport-desktop');

            document.body.classList.add('viewport-mobile');

            if (stageViewport && desktopStage) {

                stageViewport.style.display = 'block';

                stageViewport.style.width = '100%';

                stageViewport.style.height = 'auto';

                desktopStage.style.display = 'flex';

                desktopStage.style.flexDirection = 'column';

                desktopStage.style.width = '100%';

                desktopStage.style.minWidth = '0';

                desktopStage.style.transform = 'none';

                // Co giãn tờ lá số A4 chuẩn tỉ lệ theo chiều rộng màn hình mobile

                if (board && wrapper) {
                    const BASE_WIDTH = 737;
                    const BASE_HEIGHT = 1013;
                    const safePad = Math.max(16, (containerW <= 360 ? 12 : 24));
                    const maxAllowedW = Math.min(containerW - safePad, 520);
                    const targetW = Math.max(220, Math.floor(maxAllowedW));
                    const scaleBoard = Math.max(0.3, Math.min(1.0, targetW / BASE_WIDTH));
                    const targetH = Math.ceil(BASE_HEIGHT * scaleBoard);

                    // Bù trừ độ dày viền, rãnh lưới và bán kính bo góc theo tỷ lệ scale để nét viền khép kín 100%, không đứt đoạn hay lẹm góc
                    const mobileBorder = +(2 / scaleBoard).toFixed(2);
                    const mobileGap = +(1.5 / scaleBoard).toFixed(2);
                    const mobileRadius = +(8 / scaleBoard).toFixed(2);
                    const mobileHouseInnerRadius = +(6 / scaleBoard).toFixed(2);

                    board.style.width = `${BASE_WIDTH}px`;
                    board.style.height = `${BASE_HEIGHT}px`;
                    board.style.setProperty('--mobile-board-border', `${mobileBorder}px`);
                    board.style.setProperty('--mobile-board-gap', `${mobileGap}px`);
                    board.style.setProperty('--mobile-board-radius', `${mobileRadius}px`);
                    board.style.setProperty('--mobile-house-inner-radius', `${mobileHouseInnerRadius}px`);

                    wrapper.style.width = `${targetW}px`;
                    wrapper.style.height = `${targetH}px`;
                    wrapper.style.borderRadius = '8px';
                    wrapper.style.margin = '0 auto';

                    // Căn chỉnh chiều rộng khu vực dịch vụ & lưu lá số bằng đúng chiều rộng tờ lá số phía trên
                    const mobileAux = document.getElementById('mobileAuxContainer');
                    if (mobileAux) {
                        mobileAux.style.setProperty('width', `${targetW}px`, 'important');
                        mobileAux.style.setProperty('max-width', `${targetW}px`, 'important');
                    }

                    if (typeof window.setGestureBaseScale === 'function') {
                        window.setGestureBaseScale(scaleBoard);
                    } else {
                        board.style.transform = `scale(${scaleBoard})`;
                        board.style.transformOrigin = 'top left';
                    }
                }

            }

            // Di chuyển cụm nút Luận giải và Lưu lá số xuống dưới tờ lá số

            relocateAuxiliaryActions(true);
            syncStaleNoticeLabel();

        } else {

            // === CHẾ ĐỘ DESKTOP: BẢO TOÀN SÂN KHẤU CỘT TRÁI & CỘT PHẢI ===

            if (typeof closeMobileSelectPopover === 'function') closeMobileSelectPopover();

            document.body.classList.remove('viewport-mobile');

            document.body.classList.add('viewport-desktop');

            if (stageViewport && desktopStage) {

                stageViewport.style.display = 'block';

                desktopStage.style.display = 'flex';

                desktopStage.style.flexDirection = 'row';

                desktopStage.style.width = '1167px';

                desktopStage.style.minWidth = '1167px';

                if (board) {
                    board.style.width = '737px';
                    board.style.height = '1013px';
                    board.style.transform = '';
                    board.style.transformOrigin = 'top left';
                    board.style.removeProperty('--mobile-board-border');
                    board.style.removeProperty('--mobile-board-gap');
                    board.style.removeProperty('--mobile-board-radius');
                    board.style.removeProperty('--mobile-house-inner-radius');
                }
                if (wrapper) {
                    wrapper.style.width = '737px';
                    wrapper.style.height = '1013px';
                    wrapper.style.borderRadius = '';
                    wrapper.style.margin = '';
                    wrapper.classList.remove('is-zoomed');
                }

                const mobileAux = document.getElementById('mobileAuxContainer');
                if (mobileAux) {
                    mobileAux.style.width = '';
                    mobileAux.style.maxWidth = '';
                }

                const STAGE_BASE_WIDTH = 1167;

                const STAGE_BASE_HEIGHT = 1025;

                const scale = Math.min(1.0, Math.max(0.3, containerW / STAGE_BASE_WIDTH));

                desktopStage.style.transform = `scale(${scale})`;

                desktopStage.style.transformOrigin = 'top left';

                stageViewport.style.width = `${Math.ceil(STAGE_BASE_WIDTH * scale)}px`;

                stageViewport.style.height = `${Math.ceil(STAGE_BASE_HEIGHT * scale)}px`;

            }

            // Trả cụm nút về lại bảng nhập liệu bên phải

            relocateAuxiliaryActions(false);
            syncStaleNoticeLabel();

        }

    } catch (err) {

        console.warn('updateViewportEngine warning:', err);

    }

    try {

        if (typeof window.adjustPalaceHeaderLayout === 'function') {

            window.adjustPalaceHeaderLayout();

        }

    } catch (_e) {}

}

/**

 * Điều phối di chuyển cụm Luận giải & Lưu lá số giữa Mobile (dưới lá số) và Desktop (cột phải)

 */

function relocateAuxiliaryActions(isMobile) {
    try {
        const actionSec = document.getElementById("actionSection");
        const exportSec = document.getElementById("exportSection");
        const luanGiaiOptions = document.getElementById("luanGiaiOptions");
        const mobileContainer = document.getElementById("mobileAuxContainer");
        const mobileActionPane = document.getElementById("mobileActionPane");
        const tabContentCreate = document.getElementById("tabContentCreate");
        const formViewPane = document.getElementById("createFormViewPane");
        const transitionContainer = document.getElementById("createViewTransitionContainer");
        const btnGen = document.getElementById("btnGenerateTuVi");
        const btnLuanGiai = document.getElementById("btnOpenLuanGiai");
    const btnAlreadyInterpreted = document.getElementById("btnAlreadyInterpreted");

        // Không ẩn nút lập lá số nếu đang ở trạng thái trùng khớp lịch sử
        if (btnGen) {
            if (isMobile && !btnGen.classList.contains("is-duplicate-match")) {
                btnGen.style.display = 'none';
            }
        }

        if (isMobile && mobileContainer) {
            // Chuyển actionSec, exportSec vào mobileActionPane (hoặc mobileContainer nếu chưa có mobileActionPane)
            const targetActionParent = mobileActionPane || mobileContainer;
            if (actionSec && actionSec.parentElement !== targetActionParent) {
                targetActionParent.appendChild(actionSec);
            }
            if (exportSec && exportSec.parentElement !== targetActionParent) {
                targetActionParent.appendChild(exportSec);
            }
            // Chuyển luanGiaiOptions vào mobileContainer (đồng cấp với mobileActionPane)
            if (luanGiaiOptions && luanGiaiOptions.parentElement !== mobileContainer) {
                mobileContainer.appendChild(luanGiaiOptions);
            }

            if (btnLuanGiai) btnLuanGiai.style.display = 'none';
            if (actionSec && (!btnGen || !btnGen.classList.contains("is-duplicate-match"))) {
                actionSec.style.display = 'none';
            }

            if (currentActiveTab === 'create') {
                mobileContainer.classList.remove('collapsed-view');
                if (formViewPane) {
                    formViewPane.style.display = 'flex';
                    formViewPane.style.visibility = 'visible';
                }
                if (mobileActionPane) {
                    mobileActionPane.style.display = 'flex';
                    mobileActionPane.style.visibility = 'visible';
                    mobileActionPane.style.position = 'relative';
                    mobileActionPane.style.animation = '';
                }
                if (luanGiaiOptions) {
                    if (currentTuViUIState === 'generated') {
                        luanGiaiOptions.classList.add('is-expanded');
                        luanGiaiOptions.style.display = 'flex';
                        luanGiaiOptions.style.position = 'relative';
                        luanGiaiOptions.style.top = '';
                        luanGiaiOptions.style.left = '';
                        luanGiaiOptions.style.width = '';
                        luanGiaiOptions.style.zIndex = '';
                        luanGiaiOptions.style.visibility = 'visible';
                        luanGiaiOptions.style.animation = '';
                    } else {
                        luanGiaiOptions.classList.remove('is-expanded');
                        luanGiaiOptions.style.display = 'none';
                    }
                }
            }
        } else if (!isMobile) {
            // Trả về vị trí cũ trong createFormViewPane / createViewTransitionContainer
            const targetFormParent = formViewPane || tabContentCreate;
            if (actionSec && actionSec.parentElement !== targetFormParent) {
                targetFormParent.appendChild(actionSec);
            }
            if (exportSec && exportSec.parentElement !== targetFormParent) {
                targetFormParent.appendChild(exportSec);
            }

            const targetOptionsParent = transitionContainer || tabContentCreate;
            if (luanGiaiOptions && luanGiaiOptions.parentElement !== targetOptionsParent) {
                targetOptionsParent.appendChild(luanGiaiOptions);
            }

            if (currentActiveTab === 'create' && typeof setTuViUIState === 'function') {
                if (luanGiaiOptions) {
                    luanGiaiOptions.classList.remove('is-expanded');
                    luanGiaiOptions.style.display = 'none';
                }
                setTuViUIState(currentTuViUIState || 'preview');
            }
        }
    } catch (e) {
        console.warn("[relocateAuxiliaryActions] Error:", e);
    }
}

function syncResponsiveWidths() {

    updateViewportEngine();

}

// Báo cáo chiều cao thực tế về trang cha để tự động co giãn iframe (Zero scrollbars & rAF debounced)

let lastReportedTuViHeight = 0;
let _notifyParentHeightRaf = null;

function _executeNotifyParentHeight() {
    try {
        if (!window.parent || window.parent === window) return;

        let h = 960;
        const isMobile = document.body.classList.contains('viewport-mobile');
        const stageViewport = document.getElementById('tuviStageViewport');

        if (isMobile) {
            const stageEl = document.getElementById('tuviDesktopStage');
            const inputPanel = document.querySelector('.input-panel');
            const outputPanel = document.querySelector('.output-panel');
            const mobileAux = document.getElementById('mobileAuxContainer');

            let totalContentHeight = 0;
            if (inputPanel && outputPanel) {
                const inputH = inputPanel.offsetHeight || 0;
                const outputH = outputPanel.offsetHeight || 0;
                totalContentHeight = inputH + 16 + outputH;
            } else if (stageEl) {
                totalContentHeight = stageEl.offsetHeight || 0;
            }

            let auxBottom = 0;
            if (mobileAux && mobileAux.style.display !== 'none') {
                auxBottom = (mobileAux.offsetTop || 0) + (mobileAux.offsetHeight || 0);
            }

            const measuredH = Math.max(totalContentHeight, auxBottom);
            h = Math.max(400, Math.ceil(measuredH) + 28);

        } else if (stageViewport) {
            const stageHeight = parseInt(stageViewport.style.height, 10);
            const baseStage = (stageHeight > 0 ? stageHeight : 1025);
            const inputPanelEl = document.querySelector('.input-panel');
            const panelH = inputPanelEl ? (inputPanelEl.offsetTop || 0) + (inputPanelEl.offsetHeight || 0) : 0;
            h = Math.max(300, Math.max(baseStage, panelH) + 24);

        } else {
            h = Math.max(680, (document.body ? document.body.scrollHeight : 960) + 20);
        }

        // Nâng ngưỡng từ 4px lên 10px để triệt tiêu hoàn toàn dao động co giãn
        if (Math.abs(h - lastReportedTuViHeight) >= 10) {
            lastReportedTuViHeight = h;
            window.parent.postMessage({ type: 'TUVI_IFRAME_RESIZE', height: h }, '*');
        }
    } catch (_e) {}
}

function notifyParentHeight() {
    if (_notifyParentHeightRaf) {
        cancelAnimationFrame(_notifyParentHeightRaf);
    }
    _notifyParentHeightRaf = requestAnimationFrame(() => {
        _notifyParentHeightRaf = null;
        _executeNotifyParentHeight();
    });
}

window.addEventListener('message', (e) => {
    if (!e.data) return;

    if (e.data.type === 'REQUEST_TUVI_HEIGHT') {
        notifyParentHeight();
    } else if (e.data.type === 'TUVI_PARENT_VIEWPORT') {
        if (e.data.width && e.data.height) {
            externalViewport = { width: e.data.width, height: e.data.height };
            updateViewportEngine();
            notifyParentHeight();
        }
    }
});

// =========================================================================

// KHỐI ĐIỀU KHIỂN LUẬN GIẢI: THU GỌN CỘT PHẢI & HIỆU ỨNG ÁNH SÁNG ĐỘNG

// =========================================================================

let isTuViViewTransitioning = false;
let _luanGiaiPressTimer = null;
let _luanGiaiTransitionTimer = null;

function toggleLuanGiaiCollapse(shouldCollapse = true) {
    const mobileContainer = document.getElementById('mobileAuxContainer');
    const optionsView = document.getElementById('luanGiaiOptions');
    const actionSec = document.getElementById('actionSection');
    const exportSec = document.getElementById('exportSection');
    const btnOpenLuanGiai = document.getElementById('btnOpenLuanGiai');
    const btnGen = document.getElementById('btnGenerateTuVi');

    if (!optionsView) return;

    // Hủy các timer dở dang để hỗ trợ ngắt tương tác giữa chừng (Interruptible Retargeting)
    if (_luanGiaiPressTimer) {
        clearTimeout(_luanGiaiPressTimer);
        _luanGiaiPressTimer = null;
    }
    if (_luanGiaiTransitionTimer) {
        clearTimeout(_luanGiaiTransitionTimer);
        _luanGiaiTransitionTimer = null;
    }

    const isMobileView = mobileContainer && optionsView.parentElement === mobileContainer;
    const container = isMobileView ? mobileContainer : document.getElementById('createViewTransitionContainer');
    const baseView = isMobileView
        ? (document.getElementById('mobileActionPane') || actionSec)
        : document.getElementById('createFormViewPane');

    if (!container || !baseView) {
        if (shouldCollapse) {
            optionsView.classList.add('is-expanded');
            optionsView.style.display = 'flex';
        } else {
            optionsView.classList.remove('is-expanded');
            optionsView.style.display = 'none';
        }
        if (typeof notifyParentHeight === "function") notifyParentHeight();
        return;
    }

    if (shouldCollapse) {
        // =========================================================================
        // CHIỀU TIẾN: VIEW GỐC -> BẢNG GÓI LUẬN GIẢI (INTERRUPTIBLE SPRING ANIMATION)
        // =========================================================================
        if (btnOpenLuanGiai) btnOpenLuanGiai.classList.add('is-btn-pressing');

        _luanGiaiPressTimer = setTimeout(() => {
            if (btnOpenLuanGiai) btnOpenLuanGiai.classList.remove('is-btn-pressing');
            isTuViViewTransitioning = true;

            const currentContainerHeight = Math.round(container.getBoundingClientRect().height || baseView.offsetHeight);
            container.classList.add('is-view-animating');
            container.style.transition = 'none';
            container.style.height = currentContainerHeight + 'px';

            // Đo kích thước đích chuẩn xác của Options View với chiều rộng khớp 100% container
            optionsView.classList.add('is-expanded');
            optionsView.style.display = 'flex';
            optionsView.style.position = 'absolute';
            optionsView.style.top = '0';
            optionsView.style.left = '0';
            optionsView.style.width = '100%';
            optionsView.style.zIndex = '10';
            optionsView.style.visibility = 'hidden';

            const hTarget = Math.round(optionsView.offsetHeight);

            void container.offsetHeight; // reflow

            container.style.transition = 'height 580ms cubic-bezier(0.22, 1, 0.36, 1)';
            container.style.height = hTarget + 'px';

            optionsView.style.visibility = 'visible';
            optionsView.style.animation = 'overlaySlideInRight 580ms cubic-bezier(0.22, 1, 0.36, 1) forwards';
            baseView.style.animation = 'baseSlideOutLeft 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards';

            if (typeof notifyParentHeight === "function") {
                notifyParentHeight();
                setTimeout(notifyParentHeight, 290);
                setTimeout(notifyParentHeight, 590);
            }

            _luanGiaiTransitionTimer = setTimeout(() => {
                container.style.transition = 'none';
                baseView.style.display = 'none';
                baseView.style.animation = '';
                optionsView.style.position = 'relative';
                optionsView.style.top = '';
                optionsView.style.left = '';
                optionsView.style.width = '';
                optionsView.style.zIndex = '';
                optionsView.style.animation = '';
                container.style.height = 'auto';
                void container.offsetHeight;
                container.style.transition = '';
                container.classList.remove('is-view-animating');
                isTuViViewTransitioning = false;
                _luanGiaiTransitionTimer = null;
                if (typeof notifyParentHeight === "function") notifyParentHeight();
                if (typeof schedulePrewarmChartImage === "function") schedulePrewarmChartImage(120);
            }, 590);

        }, 40);

    } else {
        // =========================================================================
        // CHIỀU LÙI: BẢNG GÓI LUẬN GIẢI -> VIEW GỐC (INTERRUPTIBLE SPRING ANIMATION)
        // =========================================================================
        const backBtn = optionsView.querySelector('.btn-luan-giai-back');
        if (backBtn) backBtn.classList.add('is-btn-pressing');

        _luanGiaiPressTimer = setTimeout(() => {
            if (backBtn) backBtn.classList.remove('is-btn-pressing');
            isTuViViewTransitioning = true;

            const currentContainerHeight = Math.round(container.getBoundingClientRect().height || optionsView.offsetHeight);
            container.classList.add('is-view-animating');
            container.style.transition = 'none';
            container.style.height = currentContainerHeight + 'px';

            // Khôi phục trạng thái chuẩn của các nút con
            if (typeof currentTuViUIState !== 'undefined' && currentTuViUIState === 'generated') {
                if (actionSec) actionSec.style.display = 'flex';
                if (btnGen) {
                    btnGen.style.display = 'none';
                    btnGen.classList.add('is-hidden');
                    btnGen.classList.remove('btn-reappear');
                }
                if (btnOpenLuanGiai) {
                    btnOpenLuanGiai.style.display = 'flex';
                    btnOpenLuanGiai.classList.remove('btn-reappear');
                }
                if (exportSec) exportSec.style.display = 'flex';
            }

            // Đặt optionsView sang absolute ngay sau khi container đã khóa chiều cao, tránh giật frame đầu
            optionsView.style.position = 'absolute';
            optionsView.style.top = '0';
            optionsView.style.left = '0';
            optionsView.style.width = '100%';
            optionsView.style.zIndex = '10';

            baseView.style.display = 'flex';
            baseView.style.visibility = 'hidden';
            baseView.style.position = 'relative';
            baseView.style.zIndex = '1';

            const hTarget = Math.round(baseView.offsetHeight);

            void container.offsetHeight; // reflow

            container.style.transition = 'height 640ms cubic-bezier(0.22, 1, 0.36, 1)';
            container.style.height = hTarget + 'px';

            baseView.style.visibility = 'visible';

            optionsView.style.animation = 'overlaySlideOutRight 640ms cubic-bezier(0.22, 1, 0.36, 1) forwards';
            baseView.style.animation = 'baseSlideInLeft 640ms cubic-bezier(0.22, 1, 0.36, 1) forwards';

            if (typeof notifyParentHeight === "function") {
                notifyParentHeight();
                setTimeout(notifyParentHeight, 320);
                setTimeout(notifyParentHeight, 650);
            }

            _luanGiaiTransitionTimer = setTimeout(() => {
                container.style.transition = 'none';
                optionsView.classList.remove('is-expanded');
                optionsView.style.display = 'none';
                optionsView.style.animation = '';
                optionsView.style.position = '';
                optionsView.style.top = '';
                optionsView.style.left = '';
                optionsView.style.width = '';
                optionsView.style.zIndex = '';
                baseView.style.animation = '';
                container.style.height = 'auto';
                void container.offsetHeight;
                container.style.transition = '';
                container.classList.remove('is-view-animating');
                isTuViViewTransitioning = false;
                _luanGiaiTransitionTimer = null;
                if (typeof notifyParentHeight === "function") {
                    notifyParentHeight();
                    setTimeout(notifyParentHeight, 80);
                    setTimeout(notifyParentHeight, 220);
                }
            }, 650);

        }, 40);
    }
}

function getCurrentChartCacheKey() {
    const idCode = document.getElementById('tb-id-code')?.innerText || '';
    const mdLen = (window.__tuviMarkdownAI || '').length;
    return `${idCode}::${mdLen}`;
}

function invalidateChartImageCache() {
    window.__tuviCachedChartImageUrl = '';
    window.__tuviCachedChartKey = '';
}

async function prewarmChartImageCache() {
    const targetKey = getCurrentChartCacheKey();
    if (window.__tuviCachedChartImageUrl && window.__tuviCachedChartKey === targetKey) {
        return window.__tuviCachedChartImageUrl;
    }
    if (window.__tuviChartCapturePromise) {
        return window.__tuviChartCapturePromise;
    }
    if (typeof captureTuviBoard !== 'function') return '';

    window.__tuviChartCapturePromise = (async () => {
        try {
            const canvas = await captureTuviBoard(2);
            if (!canvas) return '';
            const dataUrl = canvas.toDataURL('image/png');
            if (getCurrentChartCacheKey() === targetKey) {
                window.__tuviCachedChartImageUrl = dataUrl;
                window.__tuviCachedChartKey = targetKey;
            }
            if (window.parent && window.parent !== window) {
                try {
                    const curChart = (typeof getCurrentChartData === 'function')
                        ? getCurrentChartData()
                        : (window.currentChartData || null);
                    window.parent.postMessage({
                        type: 'TUVI_MARKDOWN_GENERATED',
                        markdown_ai: window.__tuviMarkdownAI || curChart?.markdown_ai || '',
                        chartData: curChart,
                        chartImageUrl: dataUrl
                    }, '*');
                } catch (_e) {}
            }
            return dataUrl;
        } catch (err) {
            console.warn('[TuVi] Tự động xuất ảnh lá số ngầm thất bại:', err);
            return '';
        } finally {
            window.__tuviChartCapturePromise = null;
        }
    })();

    return window.__tuviChartCapturePromise;
}

function schedulePrewarmChartImage(delayMs = 200) {
    if (window.__tuviPrewarmTimer) {
        clearTimeout(window.__tuviPrewarmTimer);
    }
    window.__tuviPrewarmTimer = setTimeout(() => {
        window.__tuviPrewarmTimer = null;
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => { prewarmChartImageCache(); }, { timeout: 600 });
        } else {
            prewarmChartImageCache();
        }
    }, delayMs);
}

async function selectLuanGiaiOption(type) {

    if (!window.parent || window.parent === window) return;

    if (type === 'ai') {

        const curChart = (typeof getCurrentChartData === "function") 

            ? getCurrentChartData() 

            : (window.currentChartData || null);

        const mdAi = window.__tuviMarkdownAI || curChart?.markdown_ai || '';

        const targetKey = getCurrentChartCacheKey();
        const cachedImageUrl = (window.__tuviCachedChartKey === targetKey && window.__tuviCachedChartImageUrl)
            ? window.__tuviCachedChartImageUrl
            : '';

        // Mở ngay modal Chi tiết gói dịch vụ ở frame bấm, không để html2canvas chặn UI
        window.parent.postMessage({ 

            type: 'TUVI_OPEN_AI_MODAL',

            markdown_ai: mdAi,

            chartData: curChart,

            chartImageUrl: cachedImageUrl

        }, '*');

        // Nếu ảnh lá số chưa có sẵn trong cache, chụp ngầm sau khi hiệu ứng mở modal bắt đầu
        if (!cachedImageUrl) {
            schedulePrewarmChartImage(260);
        }

    } else if (type === 'master') {
        const curChart = (typeof getCurrentChartData === "function")
            ? getCurrentChartData()
            : (window.currentChartData || null);
        const chartCode = curChart?.id_code
            || curChart?.idCode
            || document.getElementById('tb-id-code')?.innerText?.trim()
            || '';
        const hotline = curChart?.hotline
            || document.getElementById('tb-phone')?.innerText?.trim()
            || document.querySelector('.tb-header-phone')?.textContent?.trim()
            || '';

        window.parent.postMessage({
            type: 'TUVI_OPEN_CONSULTATION_MODAL',
            chartData: curChart,
            chartCode,
            hotline
        }, '*');

    }

}

// ==========================================================================

// QUẢN LÝ TAB & LỊCH SỬ LÁ SỐ / LUẬN GIẢI AI

// ==========================================================================

let currentActiveTab = 'create'; // 'create' | 'history'

let userChartHistoryList = [];

let selectedHistoryIndex = -1;

let currentAiMatchedSession = null;

let historyLoadedOnce = false;

let historyNeedsRefresh = false;

let historyLastToken = '';

const tabViewState = {
    create: null,
    history: null
};

const TUVI_PAGE_POS_KEY = 'tuvi_page_position';

function persistPagePosition() {
    try {
        if (
            currentActiveTab === 'history' &&
            !(tabViewState.history && tabViewState.history.needsBoardRestore) &&
            typeof saveHistoryTabState === 'function'
        ) {
            saveHistoryTabState();
        }
        const hist = tabViewState.history;
        const payload = {
            activeTab: currentActiveTab === 'history' ? 'history' : 'create',
            history: hist ? {
                selectedIndex: typeof hist.selectedIndex === 'number' ? hist.selectedIndex : -1,
                selectedChartCode: hist.selectedChartCode || '',
                expandedOptionsIndex: typeof hist.expandedOptionsIndex === 'number' ? hist.expandedOptionsIndex : -1,
                scrollTop: hist.scrollTop || 0,
                paneScrollTop: hist.paneScrollTop || 0
            } : null
        };
        sessionStorage.setItem(TUVI_PAGE_POS_KEY, JSON.stringify(payload));
    } catch (_e) {}
}

function loadSavedPagePosition() {
    try {
        const raw = sessionStorage.getItem(TUVI_PAGE_POS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (_e) {
        return null;
    }
}

function restoreSavedPagePosition() {
    const saved = loadSavedPagePosition();
    if (!saved || saved.activeTab !== 'history') return false;

    const hist = saved.history && typeof saved.history === 'object' ? saved.history : null;
    if (hist) {
        tabViewState.history = {
            selectedIndex: typeof hist.selectedIndex === 'number' ? hist.selectedIndex : -1,
            selectedChartCode: hist.selectedChartCode || '',
            expandedOptionsIndex: typeof hist.expandedOptionsIndex === 'number' ? hist.expandedOptionsIndex : -1,
            scrollTop: hist.scrollTop || 0,
            paneScrollTop: hist.paneScrollTop || 0,
            boardSnapshot: null,
            needsBoardRestore: true
        };
    }

    if (typeof switchTuViTab === 'function') {
        switchTuViTab('history');
        return true;
    }
    return false;
}

(function initHistoryPositionPersistenceListeners() {
    let scrollTimer = null;
    const scheduleSave = () => {
        if (currentActiveTab !== 'history') return;
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            persistPagePosition();
        }, 120);
    };

    document.addEventListener('DOMContentLoaded', () => {
        const itemsWrapper = document.getElementById('historyItemsWrapper');
        const paneHistory = document.getElementById('tabContentHistory');
        if (itemsWrapper) itemsWrapper.addEventListener('scroll', scheduleSave, { passive: true });
        if (paneHistory) paneHistory.addEventListener('scroll', scheduleSave, { passive: true });
    });

    window.addEventListener('pagehide', persistPagePosition);
    window.addEventListener('beforeunload', persistPagePosition);
})();

function getHistoryAuthToken() {
    let token = localStorage.getItem('tuvi_token') || '';
    if (!token && window.parent && window.parent !== window) {
        try {
            token = window.parent.localStorage.getItem('tuvi_token') || '';
        } catch (_e) {}
    }
    return token;
}

function captureCurrentBoardSnapshot() {
    const curChart = (typeof getCurrentChartData === 'function')
        ? getCurrentChartData()
        : (window.currentChartData || null);
    if (!curChart) return null;
    const idCodeEl = document.getElementById('tb-id-code');
    return {
        chartData: curChart,
        markdownAdmin: window.__tuviMarkdownAdmin || curChart.markdown_admin || curChart.markdown || '',
        markdownAi: window.__tuviMarkdownAI || curChart.markdown_ai || '',
        markdown: window.__tuviMarkdown || curChart.markdown_admin || curChart.markdown || '',
        idCode: curChart.idCode || curChart.id_code || (idCodeEl ? idCodeEl.innerText : '')
    };
}

function restoreBoardSnapshot(snapshot) {
    if (!snapshot || !snapshot.chartData) return;
    const currentChart = (typeof getCurrentChartData === 'function')
        ? getCurrentChartData()
        : (window.currentChartData || null);
    const currentId = currentChart?.idCode || currentChart?.id_code || '';
    const targetId = snapshot.idCode || snapshot.chartData.idCode || snapshot.chartData.id_code || '';

    if (currentChart === snapshot.chartData && currentId === targetId) {
        return;
    }

    window.__tuviMarkdownAdmin = snapshot.markdownAdmin || '';
    window.__tuviMarkdownAI = snapshot.markdownAi || '';
    window.__tuviMarkdown = snapshot.markdown || '';

    if (typeof invalidateChartImageCache === 'function') {
        invalidateChartImageCache();
    }
    if (typeof renderTuViBoard === 'function') {
        renderTuViBoard(snapshot.chartData);
    }
    const idCodeEl = document.getElementById('tb-id-code');
    if (idCodeEl && targetId) {
        idCodeEl.innerText = targetId;
    }
}

function captureCreateFormSnapshot() {
    const calRadio = document.querySelector('input[name="calendar"]:checked');
    const genderRadio = document.querySelector('input[name="gender"]:checked');
    return {
        rawName: document.getElementById('txtName')?.value ?? '',
        gender: genderRadio ? genderRadio.value : 'Nam',
        isSolar: calRadio ? (calRadio.value === 'solar') : true,
        isLeapMonthInput: Boolean(document.getElementById('chkIsLeap')?.checked),
        year: document.getElementById('txtYear')?.value ?? '',
        month: document.getElementById('txtMonth')?.value ?? '',
        day: document.getElementById('txtDay')?.value ?? '',
        hour: document.getElementById('txtHour')?.value ?? '',
        minute: document.getElementById('txtMinute')?.value ?? '',
        limitYear: document.getElementById('txtLimitYear')?.value ?? ''
    };
}

function restoreCreateFormSnapshot(snap) {
    if (!snap) return;
    const nameEl = document.getElementById('txtName');
    if (nameEl) nameEl.value = snap.rawName ?? '';

    document.querySelectorAll('input[name="gender"]').forEach((r) => {
        r.checked = (r.value === (snap.gender || 'Nam'));
    });

    const isSolar = snap.isSolar !== undefined ? Boolean(snap.isSolar) : true;
    document.querySelectorAll('input[name="calendar"]').forEach((r) => {
        r.checked = (r.value === (isSolar ? 'solar' : 'lunar'));
    });

    const leapRow = document.getElementById('rowLeapMonth');
    if (leapRow) {
        if (leapRow._revealTimer) {
            clearTimeout(leapRow._revealTimer);
            leapRow._revealTimer = null;
        }
        delete leapRow.dataset.leapState;
        leapRow.style.transition = '';
        leapRow.style.height = '';
        leapRow.style.marginTop = '';
        leapRow.style.opacity = '';
        leapRow.style.transform = '';
        leapRow.style.overflow = '';
        leapRow.style.pointerEvents = '';
        leapRow.style.display = isSolar ? 'none' : 'flex';
    }

    const leapChk = document.getElementById('chkIsLeap');
    if (leapChk) leapChk.checked = Boolean(snap.isLeapMonthInput);

    const yEl = document.getElementById('txtYear');
    if (yEl && snap.year !== '') yEl.value = snap.year;

    const mEl = document.getElementById('txtMonth');
    if (mEl && snap.month !== '') mEl.value = snap.month;

    if (typeof updateDaysInMonth === 'function') updateDaysInMonth();

    const dEl = document.getElementById('txtDay');
    if (dEl && snap.day !== '') dEl.value = snap.day;

    const hEl = document.getElementById('txtHour');
    if (hEl && snap.hour !== '') hEl.value = snap.hour;

    const minEl = document.getElementById('txtMinute');
    if (minEl && snap.minute !== '') minEl.value = snap.minute;

    const limEl = document.getElementById('txtLimitYear');
    if (limEl && snap.limitYear !== '') limEl.value = snap.limitYear;
}

function saveCreateTabState() {
    const luanGiaiOptions = document.getElementById('luanGiaiOptions');
    const overlay = document.getElementById('tuviStaleOverlay');
    const prevBoard = tabViewState.create?.boardSnapshot || null;
    const currentBoard = captureCurrentBoardSnapshot();
    tabViewState.create = {
        formSnapshot: captureCreateFormSnapshot(),
        uiState: currentTuViUIState,
        isOptionsExpanded: Boolean(luanGiaiOptions && luanGiaiOptions.classList.contains('is-expanded')),
        staleOverlayVisible: Boolean(overlay && !overlay.classList.contains('hidden')),
        boardSnapshot: currentBoard || prevBoard
    };
}

function saveHistoryTabState() {
    const items = document.querySelectorAll('.tuvi-history-item');
    let expandedOptionsIndex = -1;
    items.forEach((item, idx) => {
        if (item.classList.contains('is-luan-giai-expanded')) {
            expandedOptionsIndex = idx;
        }
    });
    const exportSec = document.getElementById('historyExportSection');
    const aiCard = document.getElementById('historyAiActionCard');
    const aiTitle = document.getElementById('historyAiTitle');
    const itemsWrapper = document.getElementById('historyItemsWrapper');
    const paneHistory = document.getElementById('tabContentHistory');
    const selectedChart = (selectedHistoryIndex >= 0 && Array.isArray(userChartHistoryList))
        ? userChartHistoryList[selectedHistoryIndex]
        : null;

    tabViewState.history = {
        selectedIndex: selectedHistoryIndex,
        selectedChartCode: selectedChart ? (selectedChart.chart_code || '') : (tabViewState.history?.selectedChartCode || ''),
        expandedOptionsIndex,
        exportVisible: Boolean(exportSec && getComputedStyle(exportSec).display !== 'none'),
        aiCardVisible: Boolean(aiCard && getComputedStyle(aiCard).display !== 'none'),
        aiTitleText: aiTitle ? aiTitle.innerText : '',
        scrollTop: itemsWrapper ? itemsWrapper.scrollTop : 0,
        paneScrollTop: paneHistory ? paneHistory.scrollTop : 0,
        boardSnapshot: (selectedHistoryIndex >= 0 ? captureCurrentBoardSnapshot() : null) || tabViewState.history?.boardSnapshot || null,
        needsBoardRestore: Boolean(tabViewState.history?.needsBoardRestore)
    };
}

let deleteCountdownTimer = null;

let deleteSecondsRemaining = 10;

let deleteTargetChartId = null;

let deleteTargetChartCode = '';

function updateTabSlidingIndicator(tabKey) {

    const nav = document.querySelector('.tuvi-tab-nav');

    if (nav) {

        nav.classList.toggle('is-history', tabKey === 'history');

        nav.classList.toggle('is-create', tabKey !== 'history');

    }

    const pill = document.getElementById('tabSlidingPill');

    if (pill) {

        pill.style.width = '';

        pill.style.transform = '';

        pill.style.left = '';

    }

}

let _tabPanelHeightTimer = null;

function switchTuViTab(tabKey) {
    if (typeof closeMobileSelectPopover === 'function') closeMobileSelectPopover();
    const prevTab = currentActiveTab;
    const isTabChanged = (prevTab !== tabKey);

    // Lưu lại toàn bộ trạng thái dữ liệu và giao diện của tab đang rời khỏi
    if (currentActiveTab === 'create' && tabKey !== 'create') {
        saveCreateTabState();
    } else if (currentActiveTab === 'history' && tabKey === 'create') {
        saveHistoryTabState();
    }

    // Dọn các timer chuyển cảnh view nếu người dùng đổi tab giữa chừng
    if (typeof _luanGiaiPressTimer !== 'undefined' && _luanGiaiPressTimer) {
        clearTimeout(_luanGiaiPressTimer);
        _luanGiaiPressTimer = null;
    }
    if (typeof _luanGiaiTransitionTimer !== 'undefined' && _luanGiaiTransitionTimer) {
        clearTimeout(_luanGiaiTransitionTimer);
        _luanGiaiTransitionTimer = null;
    }
    if (_tabPanelHeightTimer) {
        clearTimeout(_tabPanelHeightTimer);
        _tabPanelHeightTimer = null;
    }
    if (typeof isTuViViewTransitioning !== 'undefined') {
        isTuViViewTransitioning = false;
    }

    const inputPanel = document.querySelector('.input-panel');
    let startPanelH = 0;
    if (inputPanel && isTabChanged) {
        inputPanel.style.transition = 'none';
        inputPanel.style.height = 'auto';
        startPanelH = Math.round(inputPanel.getBoundingClientRect().height);
    }

    currentActiveTab = tabKey;
    updateTabSlidingIndicator(tabKey);
    persistPagePosition();

    const btnCreate = document.getElementById("tabBtnCreate");
    const btnHistory = document.getElementById("tabBtnHistory");
    const paneCreate = document.getElementById("tabContentCreate");
    const paneHistory = document.getElementById("tabContentHistory");

    const mobileContainer = document.getElementById("mobileAuxContainer");
    const mobileActionPane = document.getElementById("mobileActionPane");
    const actionSec = document.getElementById("actionSection");
    const exportSec = document.getElementById("exportSection");
    const luanGiaiOptions = document.getElementById("luanGiaiOptions");
    const formViewPane = document.getElementById("createFormViewPane");
    const transitionContainer = document.getElementById("createViewTransitionContainer");
    const btnGen = document.getElementById("btnGenerateTuVi");
    const btnLuanGiai = document.getElementById("btnOpenLuanGiai");
    const btnAlreadyInterpreted = document.getElementById("btnAlreadyInterpreted");
    const overlay = document.getElementById('tuviStaleOverlay');

    if (tabKey === 'create') {
        const savedCreate = tabViewState.create;
        if (savedCreate) {
            restoreCreateFormSnapshot(savedCreate.formSnapshot);
            currentTuViUIState = savedCreate.uiState;
        } else {
            const hasExistingChart = Boolean((typeof getCurrentChartData === 'function') ? getCurrentChartData() : window.currentChartData);
            if (!hasExistingChart) {
                if (typeof setTuViUIState === 'function') setTuViUIState('preview');
                if (typeof generateTuVi === 'function') generateTuVi(false);
            }
        }

        document.body.classList.remove('tab-history-active');
        document.body.classList.add('tab-create-active');
        document.body.classList.remove('luan-giai-collapsed-active');

        if (inputPanel) inputPanel.classList.remove('collapsed-view');
        if (mobileContainer) {
            mobileContainer.classList.remove('collapsed-view');
            mobileContainer.style.removeProperty('display');
            mobileContainer.style.height = 'auto';
            mobileContainer.style.transition = '';
            if (isTabChanged) {
                mobileContainer.classList.remove('is-mobile-aux-entering');
                void mobileContainer.offsetWidth;
                mobileContainer.classList.add('is-mobile-aux-entering');
                setTimeout(() => {
                    if (mobileContainer) mobileContainer.classList.remove('is-mobile-aux-entering');
                }, 360);
            }
        }

        if (mobileActionPane) {
            mobileActionPane.style.display = 'flex';
            mobileActionPane.style.visibility = 'visible';
            mobileActionPane.style.position = 'relative';
            mobileActionPane.style.animation = '';
        }

        if (actionSec) actionSec.style.removeProperty('display');
        if (exportSec) exportSec.style.removeProperty('display');

        const isMobileView = document.body.classList.contains('viewport-mobile');

        // Khôi phục đúng màn hình đang mở của tab Lập lá số (Form hoặc Bảng gói luận giải)
        const hasInterpreted = typeof getCurrentChartAiSession === 'function' && Boolean(getCurrentChartAiSession());
        const shouldKeepOptionsOpen = Boolean(
            isMobileView
                ? (currentTuViUIState === 'generated' && !hasInterpreted)
                : (savedCreate && savedCreate.isOptionsExpanded && !hasInterpreted)
        );
        if (shouldKeepOptionsOpen && luanGiaiOptions) {
            if (formViewPane) {
                formViewPane.style.display = isMobileView ? 'flex' : 'none';
                formViewPane.style.visibility = 'visible';
                formViewPane.style.position = 'relative';
                formViewPane.style.animation = '';
            }
            luanGiaiOptions.classList.add('is-expanded');
            luanGiaiOptions.style.display = 'flex';
            luanGiaiOptions.style.position = 'relative';
            luanGiaiOptions.style.top = '';
            luanGiaiOptions.style.left = '';
            luanGiaiOptions.style.width = '';
            luanGiaiOptions.style.zIndex = '';
            luanGiaiOptions.style.visibility = 'visible';
            luanGiaiOptions.style.animation = '';
        } else {
            if (luanGiaiOptions) {
                luanGiaiOptions.classList.remove('is-expanded');
                luanGiaiOptions.style.removeProperty('display');
                luanGiaiOptions.style.removeProperty('animation');
                luanGiaiOptions.style.position = '';
                luanGiaiOptions.style.top = '';
                luanGiaiOptions.style.left = '';
                luanGiaiOptions.style.width = '';
                luanGiaiOptions.style.zIndex = '';
            }
            if (formViewPane) {
                formViewPane.style.display = 'flex';
                formViewPane.style.visibility = 'visible';
                formViewPane.style.position = 'relative';
                formViewPane.style.animation = '';
            }
        }

        if (transitionContainer) {
            transitionContainer.style.height = 'auto';
            transitionContainer.style.transition = '';
            transitionContainer.classList.remove('is-view-animating');
        }

        if (btnCreate) {
            btnCreate.classList.add("active");
            btnCreate.setAttribute("aria-selected", "true");
        }
        if (btnHistory) {
            btnHistory.classList.remove("active");
            btnHistory.setAttribute("aria-selected", "false");
        }
        if (paneHistory) {
            paneHistory.classList.remove("active", "is-entering-left", "is-entering-right");
            paneHistory.style.display = "none";
        }
        if (paneCreate) {
            paneCreate.style.display = "flex";
            paneCreate.classList.remove("active", "is-entering-left", "is-entering-right");
            void paneCreate.offsetWidth;
            paneCreate.classList.add("active");
            if (isTabChanged) {
                paneCreate.classList.add("is-entering-left");
            }
        }

        // Khôi phục trạng thái nút & vùng xuất của tab Lập lá số
        syncBodyTuViStateClass(currentTuViUIState);
        if (currentTuViUIState === 'generated') {
            if (hasInterpreted) {
                if (actionSec) actionSec.style.display = "flex";
                if (btnGen) {
                    btnGen.style.display = "none";
                    btnGen.classList.add("is-hidden");
                    btnGen.classList.remove("btn-reappear", "is-btn-entering", "is-btn-exiting", "is-generating");
                }
                if (btnLuanGiai) {
                    btnLuanGiai.style.display = "none";
                    btnLuanGiai.classList.remove("is-btn-entering");
                }
                if (btnAlreadyInterpreted) {
                    btnAlreadyInterpreted.style.display = "flex";
                    btnAlreadyInterpreted.classList.remove("is-hidden", "is-btn-exiting");
                }
            } else if (isMobileView) {
                if (btnAlreadyInterpreted) btnAlreadyInterpreted.style.display = "none";
                if (actionSec) actionSec.style.display = "none";
                if (btnGen) {
                    btnGen.style.display = "none";
                    btnGen.classList.add("is-hidden");
                    btnGen.classList.remove("btn-reappear", "is-btn-entering", "is-btn-exiting", "is-generating");
                }
                if (btnLuanGiai) btnLuanGiai.style.display = "none";
            } else {
                if (btnAlreadyInterpreted) btnAlreadyInterpreted.style.display = "none";
                if (actionSec) actionSec.style.display = "flex";
                if (btnGen) {
                    btnGen.style.display = "none";
                    btnGen.classList.add("is-hidden");
                    btnGen.classList.remove("btn-reappear", "is-btn-entering", "is-btn-exiting", "is-generating");
                }
                if (btnLuanGiai) {
                    btnLuanGiai.style.display = "flex";
                    btnLuanGiai.classList.remove("is-btn-exiting");
                }
            }
            if (exportSec) exportSec.style.display = "flex";
            setPanelFooterNote('generated');
        } else if (currentTuViUIState === 'input-changed') {
            if (btnAlreadyInterpreted) btnAlreadyInterpreted.style.display = "none";
            if (btnLuanGiai) {
                btnLuanGiai.style.display = "none";
                btnLuanGiai.classList.remove("is-btn-entering");
            }
            if (exportSec) exportSec.style.display = "none";
            setPanelFooterNote('default');
            if (typeof checkFormDuplicateWithHistory === 'function') {
                checkFormDuplicateWithHistory({ suppressContentSwap: true });
            }
            if (isMobileView) {
                const isDup = Boolean(btnGen && btnGen.classList.contains('is-duplicate-match'));
                if (actionSec) actionSec.style.display = isDup ? "flex" : "none";
                if (btnGen && !isDup) {
                    btnGen.style.display = "none";
                    btnGen.classList.add("is-hidden");
                }
            } else {
                if (actionSec) actionSec.style.display = "flex";
                if (btnGen) {
                    btnGen.style.display = "flex";
                    btnGen.classList.remove("is-hidden", "is-btn-exiting", "is-generating");
                }
            }
        } else {
            if (actionSec) actionSec.style.display = "none";
            if (btnGen) btnGen.style.display = "none";
            if (btnLuanGiai) btnLuanGiai.style.display = "none";
            if (exportSec) exportSec.style.display = "none";
            setPanelFooterNote('default');
        }

        if (savedCreate) {
            if (overlay) {
                overlay.classList.toggle('hidden', !savedCreate.staleOverlayVisible);
            }
            if (savedCreate.boardSnapshot) {
                restoreBoardSnapshot(savedCreate.boardSnapshot);
            }
        }
    } else {
        document.body.classList.add('tab-history-active');
        document.body.classList.remove('tab-create-active');
        // Ẩn cụm nút và dịch vụ của tab Lập lá số (cả trên Mobile lẫn Desktop)
        if (mobileContainer) mobileContainer.style.setProperty('display', 'none', 'important');
        if (actionSec) actionSec.style.setProperty('display', 'none', 'important');
        if (exportSec) exportSec.style.setProperty('display', 'none', 'important');
        if (luanGiaiOptions) luanGiaiOptions.style.setProperty('display', 'none', 'important');

        if (btnCreate) {
            btnCreate.classList.remove("active");
            btnCreate.setAttribute("aria-selected", "false");
        }
        if (btnHistory) {
            btnHistory.classList.add("active");
            btnHistory.setAttribute("aria-selected", "true");
        }
        if (paneCreate) {
            paneCreate.classList.remove("active", "is-entering-left", "is-entering-right");
            paneCreate.style.display = "none";
        }
        if (paneHistory) {
            paneHistory.style.display = "flex";
            paneHistory.classList.remove("active", "is-entering-left", "is-entering-right");
            void paneHistory.offsetWidth;
            paneHistory.classList.add("active");
            if (isTabChanged) {
                paneHistory.classList.add("is-entering-right");
            }
        }

        const currentToken = getHistoryAuthToken();
        const tokenChanged = currentToken !== historyLastToken;
        const shouldPreserveInitialRestore = Boolean(tabViewState.history && tabViewState.history.needsBoardRestore);
        if (tokenChanged && !shouldPreserveInitialRestore) {
            tabViewState.history = null;
            selectedHistoryIndex = -1;
            historyLoadedOnce = false;
        }

        if (!historyLoadedOnce || historyNeedsRefresh || tokenChanged) {
            loadUserChartHistory({ force: true, preserveSelection: !tokenChanged || shouldPreserveInitialRestore });
        } else {
            // Giữ nguyên 100% DOM và tiến trình của tab Lịch sử, chỉ khôi phục vị trí cuộn & tờ lá số đang chọn
            const savedHist = tabViewState.history;
            if (savedHist) {
                const itemsWrapper = document.getElementById('historyItemsWrapper');
                if (itemsWrapper && savedHist.scrollTop) {
                    itemsWrapper.scrollTop = savedHist.scrollTop;
                }
                if (savedHist.paneScrollTop) {
                    paneHistory.scrollTop = savedHist.paneScrollTop;
                }
                if (savedHist.boardSnapshot) {
                    restoreBoardSnapshot(savedHist.boardSnapshot);
                    if (overlay) overlay.classList.add('hidden');
                }
            }
        }
    }

    // Chuyển tiếp chiều cao mượt mà cho .input-panel khi đổi tab (đặc biệt trên Mobile để cột lá số bên dưới không bị giật cục)
    if (inputPanel && startPanelH > 0 && isTabChanged) {
        const endPanelH = Math.round(inputPanel.getBoundingClientRect().height);
        if (Math.abs(endPanelH - startPanelH) >= 2) {
            inputPanel.classList.add('is-tab-animating');
            inputPanel.style.height = startPanelH + 'px';
            void inputPanel.offsetHeight;
            inputPanel.style.transition = 'height 340ms cubic-bezier(0.22, 1, 0.36, 1)';
            inputPanel.style.height = endPanelH + 'px';

            _tabPanelHeightTimer = setTimeout(() => {
                inputPanel.style.transition = 'none';
                inputPanel.style.height = '';
                void inputPanel.offsetHeight;
                inputPanel.style.transition = '';
                inputPanel.classList.remove('is-tab-animating');
                _tabPanelHeightTimer = null;
                if (typeof notifyParentHeight === "function") notifyParentHeight();
            }, 350);
        } else {
            inputPanel.style.transition = '';
            inputPanel.style.height = '';
        }
    }

    if (typeof notifyParentHeight === "function") {
        notifyParentHeight();
        setTimeout(notifyParentHeight, 160);
        setTimeout(notifyParentHeight, 360);
    }
}

function requestParentGoogleAuth() {

    if (window.parent && window.parent !== window) {

        window.parent.postMessage({ type: 'TUVI_OPEN_AUTH_MODAL' }, '*');

    }

}

function getCurrentChartAiSession() {
    const chartData = window.currentChartData || null;
    const input = chartData?.input || {};
    const chartCode = (typeof activeChartCode !== 'undefined' && activeChartCode)
        || chartData?.idCode
        || chartData?.id_code
        || chartData?.chart_code
        || '';

    const normName = (v) => String(v || '').trim().toLowerCase();
    const normGender = (v) => {
        const g = String(v || '').trim().toLowerCase();
        return (g === 'nu' || g === 'nữ' || g === 'female' || g === 'f') ? 'nu' : 'nam';
    };

    const nameVal = input.name || document.getElementById('name')?.value || '';
    const genderRaw = input.gender || document.getElementById('gender')?.value || 'nam';
    const genderNorm = normGender(genderRaw);
    const isLunar = (input.calendar_type === 'am') || (document.getElementById('calendar_type')?.value === 'am');

    const birthYear = String(isLunar ? (input.lunar_year || document.getElementById('birth_year')?.value || '') : (input.solar_year || document.getElementById('birth_year')?.value || ''));
    const birthMonth = String(isLunar ? (input.lunar_month || document.getElementById('birth_month')?.value || '') : (input.solar_month || document.getElementById('birth_month')?.value || ''));
    const birthDay = String(isLunar ? (input.lunar_day || document.getElementById('birth_day')?.value || '') : (input.solar_day || document.getElementById('birth_day')?.value || ''));
    const birthHour = String(input.birth_hour ?? document.getElementById('birth_hour')?.value ?? '');

    // 1. Ưu tiên tìm bản ghi đầy đủ trong lịch sử theo chart_code hoặc trùng khớp thông tin
    if (typeof userChartHistoryList !== 'undefined' && Array.isArray(userChartHistoryList)) {
        if (chartCode) {
            const matchedByCode = userChartHistoryList.find(c => c.chart_code === chartCode);
            if (matchedByCode) {
                const session = getAiSessionForChart(matchedByCode);
                if (session) return session;
            }
        }

        // Fallback: 2 lá số trùng khớp thông tin nhưng khác mã
        const targetName = normName(nameVal);
        const matchedByInfo = userChartHistoryList.find(c => {
            if (normName(c.ho_ten) !== targetName) return false;
            if (normGender(c.gioi_tinh) !== genderNorm) return false;
            if (String(c.nam_sinh || '') !== birthYear) return false;
            if (String(c.thang_sinh || '') !== birthMonth) return false;
            if (String(c.ngay_sinh || '') !== birthDay) return false;
            if (String(c.gio_sinh ?? '') !== birthHour) return false;
            return Boolean(getAiSessionForChart(c));
        });
        if (matchedByInfo) {
            return getAiSessionForChart(matchedByInfo);
        }
    }

    const chartItem = {
        chart_code: chartCode,
        ho_ten: nameVal,
        gioi_tinh: genderNorm === 'nu' ? 'Nữ' : 'Nam',
        nam_sinh: birthYear,
        thang_sinh: birthMonth,
        ngay_sinh: birthDay,
        gio_sinh: birthHour,
    };

    return getAiSessionForChart(chartItem);
}

function openCurrentInterpretedSession() {
    const aiSession = getCurrentChartAiSession();
    if (!aiSession) return;
    try {
        localStorage.setItem('tuvi_active_ai_session', JSON.stringify(aiSession));
    } catch (_e) {}
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'OPEN_AI_SESSION', session: aiSession }, '*');
    } else {
        window.location.href = '/luan-giai-ai';
    }
}

function getAiSessionForChart(chartItem) {
    if (!chartItem) return null;
    const chartCode = chartItem.chart_code || chartItem.idCode || chartItem.id_code || '';
    const name = (chartItem.ho_ten || '').trim().toLowerCase();
    const gender = chartItem.gioi_tinh || 'Nam';
    const y = chartItem.nam_sinh || '';
    const m = chartItem.thang_sinh || '';
    const d = chartItem.ngay_sinh || '';
    const h = chartItem.gio_sinh ?? '';
    const targetKey = `${name}_${gender}_${y}_${m}_${d}_${h}`;

    try {
        const raw = localStorage.getItem('tuvi_chat_sessions');
        if (raw) {
            const sessions = JSON.parse(raw);
            if (Array.isArray(sessions)) {
                // 1. Tìm theo chartCode
                let found = sessions.find(s => chartCode && (s.chartCode === chartCode || s.chartData?.idCode === chartCode || s.chartData?.id_code === chartCode));
                if (found) return found;

                // 2. Tìm theo chartKey
                found = sessions.find(s => s.chartKey === targetKey);
                if (found) return found;
            }
        }
    } catch (_e) {}

    // 3. Fallback: Nếu có reading_markdown từ database
    if (chartItem && chartItem.reading_markdown) {
        const reading = chartItem.reading_markdown;
        const blocks = reading.split(/\n(?=## )/);
        const virtualSession = {
            sessionId: `db_${chartItem.id || chartCode}`,
            id: `db_${chartItem.id || chartCode}`,
            title: chartItem.ho_ten ? `Luận giải lá số: ${chartItem.ho_ten}` : 'Luận giải lá số',
            chartCode: chartCode,
            chartKey: targetKey,
            reading: reading,
            markdown: reading,
            markdownAi: chartItem.chart_data?.markdown_ai || '',
            chartData: chartItem.chart_data || null,
            renderedBlocks: blocks,
            createdAt: chartItem.created_at || chartItem.updated_at || new Date().toISOString(),
            fromDatabase: true
        };
        try {
            const raw = localStorage.getItem('tuvi_chat_sessions');
            const list = raw ? JSON.parse(raw) : [];
            if (Array.isArray(list) && !list.some(s => s.sessionId === virtualSession.sessionId)) {
                list.unshift(virtualSession);
                localStorage.setItem('tuvi_chat_sessions', JSON.stringify(list));
            }
        } catch (_e) {}
        return virtualSession;
    }

    return null;
}
function formatHistoryDate(isoString) {

    if (!isoString) return '';

    try {

        const d = new Date(isoString);

        const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

        return `${time} - ${date}`;

    } catch {

        return isoString;

    }

}

async function loadUserChartHistory(options = {}) {
    const force = Boolean(options && options.force);
    const resetSelection = Boolean(options && options.resetSelection);
    const preserveSelection = (options && options.preserveSelection !== undefined)
        ? Boolean(options.preserveSelection)
        : !resetSelection;

    const authNotice = document.getElementById("historyAuthNotice");

    const mainView = document.getElementById("historyMainView");

    const loadingState = document.getElementById("historyLoadingState");

    const emptyState = document.getElementById("historyEmptyState");

    const itemsWrapper = document.getElementById("historyItemsWrapper");

    const countBadge = document.getElementById("historyCountBadge");

    const token = getHistoryAuthToken();

    if (!token) {
        const hadPendingBoardRestore = Boolean(tabViewState.history && tabViewState.history.needsBoardRestore);
        historyLoadedOnce = false;
        historyNeedsRefresh = false;
        historyLastToken = '';
        selectedHistoryIndex = -1;
        tabViewState.history = null;

        if (hadPendingBoardRestore) {
            if (typeof setTuViUIState === "function") setTuViUIState('preview');
            if (typeof generateTuVi === "function") generateTuVi(false);
        }

        if (authNotice) authNotice.style.display = "flex";

        if (mainView) mainView.style.display = "none";

        if (typeof notifyParentHeight === "function") notifyParentHeight();

        return;

    }

    if (!force && historyLoadedOnce && !historyNeedsRefresh && token === historyLastToken) {
        if (authNotice) authNotice.style.display = "none";
        if (mainView) mainView.style.display = "flex";
        if (typeof notifyParentHeight === "function") notifyParentHeight();
        return;
    }

    if (resetSelection) {
        selectedHistoryIndex = -1;
        tabViewState.history = null;
    }

    const prevSavedHistory = preserveSelection
        ? (tabViewState.history || (selectedHistoryIndex >= 0 ? {
            selectedIndex: selectedHistoryIndex,
            selectedChartCode: userChartHistoryList[selectedHistoryIndex]?.chart_code || '',
            expandedOptionsIndex: Array.from(document.querySelectorAll('.tuvi-history-item')).findIndex((el) => el.classList.contains('is-luan-giai-expanded'))
        } : null))
        : null;

    if (authNotice) authNotice.style.display = "none";

    if (mainView) mainView.style.display = "flex";

    // Chỉ hiện loading & xóa trắng danh sách khi tải lần đầu hoặc đổi tài khoản, tránh chớp màn hình khi cập nhật ngầm
    if (!historyLoadedOnce || token !== historyLastToken) {
        if (loadingState) loadingState.style.display = "flex";
        if (itemsWrapper) itemsWrapper.innerHTML = "";
    }

    if (emptyState) emptyState.style.display = "none";

    try {

        const apiUrl = (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http"))

            ? `${window.location.origin}/api/user/charts`

            : "http://localhost:8080/api/user/charts";

        const res = await fetch(apiUrl, {

            headers: {

                'Authorization': `Bearer ${token}`

            }

        });

        if (loadingState) loadingState.style.display = "none";

        if (!res.ok) {

            throw new Error("Lỗi HTTP " + res.status);

        }

        const data = await res.json();

        const charts = data.data || [];

        userChartHistoryList = charts;
        historyLoadedOnce = true;
        historyNeedsRefresh = false;
        historyLastToken = token;

        if (currentTuViUIState === 'generated' && typeof setTuViUIState === 'function') {
            setTuViUIState('generated');
        }

        if (prevSavedHistory && charts.length > 0) {
            let restoredIdx = -1;
            if (prevSavedHistory.selectedChartCode) {
                restoredIdx = charts.findIndex((c) => c.chart_code === prevSavedHistory.selectedChartCode);
            }
            if (restoredIdx === -1 && prevSavedHistory.selectedIndex >= 0 && prevSavedHistory.selectedIndex < charts.length) {
                restoredIdx = prevSavedHistory.selectedIndex;
            }
            selectedHistoryIndex = restoredIdx;
        } else if (resetSelection) {
            selectedHistoryIndex = -1;
        }

        if (countBadge) {

            countBadge.innerText = `${charts.length} lá số`;

        }

        // Ẩn khối 'Lưu lá số' khi chưa chọn lá số nào trong lịch sử

        const exportSection = document.getElementById("historyExportSection");

        if (exportSection) {

            exportSection.style.display = (selectedHistoryIndex >= 0) ? "flex" : "none";

        }

        if (charts.length === 0) {
            selectedHistoryIndex = -1;
            if (prevSavedHistory && prevSavedHistory.needsBoardRestore) {
                prevSavedHistory.needsBoardRestore = false;
                if (tabViewState.history) tabViewState.history.needsBoardRestore = false;
                if (typeof generateTuVi === "function") generateTuVi(false);
            }
            if (emptyState) emptyState.style.display = "flex";

            if (exportSection) exportSection.style.display = "none";

            if (itemsWrapper) itemsWrapper.innerHTML = "";

            if (typeof notifyParentHeight === "function") notifyParentHeight();

            return;

        }

        renderHistoryItems(charts);

        if (prevSavedHistory && prevSavedHistory.needsBoardRestore) {
            prevSavedHistory.needsBoardRestore = false;
            if (tabViewState.history) tabViewState.history.needsBoardRestore = false;
            if (selectedHistoryIndex >= 0) {
                await selectHistoryChart(selectedHistoryIndex);
            } else if (typeof generateTuVi === "function") {
                generateTuVi(false);
            }
        }

        // Khôi phục lại thẻ dịch vụ đang mở rộng trong ô lịch sử nếu có
        if (prevSavedHistory && selectedHistoryIndex >= 0 && prevSavedHistory.expandedOptionsIndex >= 0) {
            const renderedItems = document.querySelectorAll('.tuvi-history-item');
            if (renderedItems[selectedHistoryIndex]) {
                renderedItems[selectedHistoryIndex].classList.add('is-luan-giai-expanded');
            }
        }

        if (prevSavedHistory && prevSavedHistory.scrollTop && itemsWrapper) {
            itemsWrapper.scrollTop = prevSavedHistory.scrollTop;
        }
        const paneHistoryEl = document.getElementById('tabContentHistory');
        if (prevSavedHistory && prevSavedHistory.paneScrollTop && paneHistoryEl) {
            paneHistoryEl.scrollTop = prevSavedHistory.paneScrollTop;
        }

    } catch (err) {

        console.warn("[TuVi] Không thể tải lịch sử lá số:", err);
        if (prevSavedHistory && prevSavedHistory.needsBoardRestore) {
            prevSavedHistory.needsBoardRestore = false;
            if (tabViewState.history) tabViewState.history.needsBoardRestore = false;
            if (typeof generateTuVi === "function") generateTuVi(false);
        }

        if (loadingState) loadingState.style.display = "none";

        if (emptyState) {

            emptyState.innerText = "Không thể tải danh sách lá số lúc này. Vui lòng thử lại sau.";

            emptyState.style.display = "flex";

        }

    } finally {

        if (typeof notifyParentHeight === "function") notifyParentHeight();

    }

}

function renderHistoryItems(charts) {
    const itemsWrapper = document.getElementById("historyItemsWrapper");
    if (!itemsWrapper) return;
    itemsWrapper.innerHTML = "";

    const curChart = (typeof getCurrentChartData === "function") ? getCurrentChartData() : (window.currentChartData || null);
    const activeChartCode = curChart?.idCode || '';

    charts.forEach((chart, index) => {
        const aiSession = getAiSessionForChart(chart);
        const hasAi = Boolean(aiSession);
        const isActive = (selectedHistoryIndex === index) || (activeChartCode && chart.chart_code === activeChartCode);

        const itemEl = document.createElement("div");
        itemEl.className = `tuvi-history-item ${isActive ? 'is-active' : ''}`;
        itemEl.onclick = () => selectHistoryChart(index);

        itemEl.innerHTML = `
            <div class="history-item-top">
                <div class="history-item-left">
                    <div class="history-item-primary-row">
                        <span class="history-item-name" title="${chart.ho_ten}">${chart.ho_ten}</span>
                        ${hasAi ? '<span class="history-ai-pill">ĐÃ LUẬN GIẢI</span>' : ''}
                    </div>
                    <div class="history-item-secondary-row">
                        ${chart.chart_code ? `<span class="history-meta-code">${chart.chart_code}</span><span class="history-meta-sep">•</span>` : ''}
                        <span class="history-meta-time">${formatHistoryDate(chart.updated_at || chart.created_at)}</span>
                    </div>
                </div>
                <div class="history-item-right" onclick="event.stopPropagation()">
                    <button type="button" class="btn-item-delete" title="Xóa lá số khỏi lịch sử" onclick="deleteChartDirectly('${chart.id}', '${chart.chart_code}')">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="history-item-action-wrapper">
                <div class="history-item-action-inner">
                    ${hasAi ? `
                <div class="history-item-ai-section">
                                        <button type="button" class="btn-resume-ai-history" onclick="event.stopPropagation(); handleOpenAiFromHistory(${index})">
                        <span>Xem bài luận giải</span>
                    </button>
                </div>
            ` : `
                <div class="history-item-unpaid-section">
                    <div class="history-luan-giai-trigger-wrap">
                        <button type="button" class="btn-history-luan-giai" onclick="event.stopPropagation(); toggleHistoryLuanGiai(${index}, true)">
                            
                            <span>LUẬN GIẢI LÁ SỐ</span>
                        </button>
                    </div>
                    <div class="history-item-options-accordion">
                        <div class="history-item-options-inner">
                            <!-- GÓI 1: LUẬN GIẢI AI -->
                            <div class="form-section luan-giai-card card-ai history-sub-card" onclick="event.stopPropagation(); handleHistorySelectOption('ai', ${index})" role="button" tabindex="0" aria-label="Luận giải AI">
                                <div class="card-badge-top">
                                    <span class="badge-tag badge-tag-ai">LUẬN GIẢI AI</span>
                                    <span class="card-price card-price-ai">199.000đ</span>
                                </div>
                                <div class="card-content">
                                    <div class="card-desc-intro">Bài luận giải 7000-8000 từ</div>
                                    <ul class="card-feature-list">
                                        <li>
                                            <svg class="feature-icon feature-icon-ai" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                            </svg>
                                            <span>12 cung mệnh</span>
                                        </li>
                                        <li>
                                            <svg class="feature-icon feature-icon-ai" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                            </svg>
                                            <span>10 năm Đại vận &amp; 3 năm Tiểu vận</span>
                                        </li>
                                        <li>
                                            <svg class="feature-icon feature-icon-ai" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                            </svg>
                                            <span>Trao đổi trực tiếp với AI</span>
                                        </li>
                                        <li>
                                            <svg class="feature-icon feature-icon-ai" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                            </svg>
                                            <span>Tư vấn phong thủy</span>
                                        </li>
                                        <li>
                                            <svg class="feature-icon feature-icon-ai" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                            </svg>
                                            <span>Hóa giải sao xấu</span>
                                        </li>
                                    </ul>
                                    <div class="card-scope-badge scope-badge-ai">
                                        <svg class="scope-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        <span>Áp dụng: <strong>01 Lá số / gói</strong></span>
                                    </div>
                                    <div class="card-action-btn btn-action-ai">
                                        <span>LUẬN GIẢI NGAY</span>
                                    </div>
                                </div>
                            </div>

                            <!-- GÓI 2: LUẬN GIẢI TRỰC TIẾP -->
                            <div class="form-section luan-giai-card card-master history-sub-card" onclick="event.stopPropagation(); handleHistorySelectOption('master', ${index})" role="button" tabindex="0" aria-label="Luận giải trực tiếp">
                                <div class="card-badge-top">
                                    <span class="badge-tag badge-tag-master">LUẬN GIẢI TRỰC TIẾP</span>
                                    <span class="card-price card-price-master">500.000đ</span>
                                </div>
                                <div class="card-content">
                                    <div class="card-desc-intro" style="margin-bottom: 8px;">
                                        Trực tiếp đàm thoại cùng Thầy Tử Vi Hồng Ân.
                                    </div>
                                    <ul class="card-feature-list">
                                        <li>
                                            <svg class="feature-icon feature-icon-master" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                            </svg>
                                            <span>Luận giải bản mệnh, đại vận, tiểu vận, phu thê, tử tức, phúc đức, định hướng sự nghiệp, v.v.</span>
                                        </li>
                                    </ul>
                                    <div class="card-scope-badge scope-badge-master">
                                        <svg class="scope-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        <span>Áp dụng: <strong>01 Lá số / gói</strong></span>
                                    </div>
                                    <div class="card-action-btn btn-action-master">
                                        <span>ĐẶT LỊCH NGAY</span>
                                    </div>
                                </div>
                            </div>

                            <!-- NÚT THU GỌN GÓI DỊCH VỤ -->
                            <div class="history-luan-giai-back-box">
                                <button type="button" class="btn-history-luan-giai-back" onclick="event.stopPropagation(); toggleHistoryLuanGiai(${index}, false)">
                                    <svg class="btn-back-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="18 15 12 9 6 15"></polyline>
                                    </svg>
                                    <span>Thu gọn gói dịch vụ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `}
                </div>
            </div>
        `;
        itemsWrapper.appendChild(itemEl);
    });

    if (typeof notifyParentHeight === "function") {
        notifyParentHeight();
    }
}

function populateFormWithInputData(inputData) {

    if (!inputData) return;

    const nameEl = document.getElementById("txtName");

    if (nameEl && inputData.name) nameEl.value = inputData.name;

    const genderVal = inputData.gender || "Nam";

    const genderRadios = document.querySelectorAll('input[name="gender"]');

    genderRadios.forEach(r => { r.checked = (r.value === genderVal); });

    const isSolar = (inputData.is_solar !== undefined) ? inputData.is_solar : ((inputData.isSolar !== undefined) ? inputData.isSolar : true);

    const calRadios = document.querySelectorAll('input[name="calendar"]');

    calRadios.forEach(r => { r.checked = (r.value === (isSolar ? "solar" : "lunar")); });

    toggleCalendarType();

    const isLeap = Boolean(inputData.is_leap_month_input || inputData.isLeapMonthInput);

    const leapChk = document.getElementById("chkIsLeap");

    if (leapChk) leapChk.checked = isLeap;

    if (inputData.year) {

        const yEl = document.getElementById("txtYear");

        if (yEl) yEl.value = inputData.year;

    }

    if (inputData.month) {

        const mEl = document.getElementById("txtMonth");

        if (mEl) mEl.value = inputData.month;

    }

    updateDaysInMonth();

    if (inputData.day) {

        const dEl = document.getElementById("txtDay");

        if (dEl) dEl.value = inputData.day;

    }

    if (inputData.hour !== undefined) {

        const hEl = document.getElementById("txtHour");

        if (hEl) hEl.value = inputData.hour;

    }

    if (inputData.minute !== undefined) {

        const minEl = document.getElementById("txtMinute");

        if (minEl) minEl.value = inputData.minute;

    }

    if (inputData.limit_year || inputData.limitYear) {

        const limEl = document.getElementById("txtLimitYear");

        if (limEl) limEl.value = inputData.limit_year || inputData.limitYear;

    }

}

async function selectHistoryChart(index) {
    if (index < 0 || index >= userChartHistoryList.length) return;
    selectedHistoryIndex = index;
    persistPagePosition();

    // Hiển thị khối Lưu lá số khi người dùng đã chọn một lá số cụ thể
    const exportSec = document.getElementById("historyExportSection");
    if (exportSec) {
        exportSec.style.display = "flex";
    }

    const chart = userChartHistoryList[index];

    // Cập nhật highlight trong danh sách: chỉ item được chọn mới có is-active
    const items = document.querySelectorAll('.tuvi-history-item');
    items.forEach((item, idx) => {
        if (idx === index) {
            // Chỉ chạm thu nhỏ khi chọn thẻ mới, không thu nhỏ khối đã mở rộng
            if (!item.classList.contains('is-active') && !item.classList.contains('is-luan-giai-expanded')) {
                item.classList.add('is-item-tapping');
                setTimeout(() => item.classList.remove('is-item-tapping'), 80);
            }
            item.classList.add('is-active');
        } else {
            item.classList.remove('is-active');
            item.classList.remove('is-luan-giai-expanded', 'is-luan-giai-collapsing');
        }
    });

    if (typeof notifyParentHeight === "function") {
        notifyParentHeight();
        setTimeout(notifyParentHeight, 80);
        setTimeout(notifyParentHeight, 180);
        setTimeout(notifyParentHeight, 330);
    }

    // Kiểm tra xem lá số này đã có phiên luận giải AI hay chưa
    const aiSession = getAiSessionForChart(chart);
    currentAiMatchedSession = aiSession;
    const aiCard = document.getElementById("historyAiActionCard");
    const aiTitle = document.getElementById("historyAiTitle");
    if (aiSession) {
        if (aiCard) aiCard.style.display = "flex";
        if (aiTitle) {
            const rawTitle = (aiSession.title || chart.ho_ten || '').replace(/^Luận giải lá số:\s*/i, '').trim();
            aiTitle.innerText = rawTitle ? `Lá số: ${rawTitle}` : `Lá số: ${chart.ho_ten}`;
        }
    } else {
        if (aiCard) aiCard.style.display = "none";
    }

    // Chuẩn bị tham số đầu vào để dựng lại lá số động
    let inputData = chart.input_data;
    if (!inputData || typeof inputData !== 'object') {
        inputData = {
            name: chart.ho_ten,
            gender: chart.gioi_tinh === 'nu' ? 'nu' : 'nam',
            solar_day: chart.ngay_sinh,
            solar_month: chart.thang_sinh,
            solar_year: chart.nam_sinh,
            lunar_day: chart.ngay_sinh,
            lunar_month: chart.thang_sinh,
            lunar_year: chart.nam_sinh,
            birth_hour: chart.gio_sinh,
            birth_minute: chart.phut_sinh,
            view_year: chart.nam_xem || new Date().getFullYear(),
            calendar_type: chart.lich_xem === 'am' ? 'am' : 'duong',
            is_leap_month_input: Boolean(chart.thang_nhuan),
            isLeapMonthInput: Boolean(chart.thang_nhuan)
        };
    }

    // Chỉ đồng bộ ngược vào form tab 'Lập lá số' nếu đang đứng ở tab 'create', tránh ghi đè dữ liệu form của người dùng
    if (currentActiveTab === 'create') {
        populateFormWithInputData(inputData);
    }

    // Gọi dựng lại lá số động, gắn mã lá số gốc
    await generateTuViFromHistory(inputData, chart.chart_code);

    saveHistoryTabState();

    if (typeof notifyParentHeight === "function") {
        notifyParentHeight();
        setTimeout(notifyParentHeight, 200);
    }
}

/**
 * Mở rộng hoặc thu gọn khối dịch vụ luận giải trong ô lịch sử lá số
 */
function toggleHistoryLuanGiai(index, shouldExpand) {
    const items = document.querySelectorAll('.tuvi-history-item');
    if (!items || !items[index]) return;
    const targetItem = items[index];

    // Hủy các timer dở dang để bảo toàn trạng thái khi click dồn dập
    if (targetItem._collapseTimer) {
        clearTimeout(targetItem._collapseTimer);
        targetItem._collapseTimer = null;
    }
    if (targetItem._pressTimer) {
        clearTimeout(targetItem._pressTimer);
        targetItem._pressTimer = null;
    }

    if (shouldExpand) {
        const triggerBtn = targetItem.querySelector('.btn-history-luan-giai');
        if (triggerBtn) triggerBtn.classList.add('is-btn-pressing');

        targetItem._pressTimer = setTimeout(() => {
            if (triggerBtn) triggerBtn.classList.remove('is-btn-pressing');
            items.forEach((item, idx) => {
                if (idx !== index) item.classList.remove('is-luan-giai-expanded', 'is-luan-giai-collapsing');
            });
            targetItem.classList.remove('is-luan-giai-collapsing');
            targetItem.classList.add('is-luan-giai-expanded');

            if (typeof notifyParentHeight === "function") {
                notifyParentHeight();
                setTimeout(notifyParentHeight, 350);
            }
            if (typeof schedulePrewarmChartImage === "function") {
                schedulePrewarmChartImage(450);
            }
        }, 80);
    } else {
        const backBtn = targetItem.querySelector('.btn-history-luan-giai-back');
        if (backBtn) backBtn.classList.add('is-btn-pressing');

        // Kích hoạt animation thu gọn (Collapse/Exit) đồng bộ mượt mà
        targetItem.classList.add('is-luan-giai-collapsing');
        targetItem.classList.remove('is-luan-giai-expanded');

        if (typeof notifyParentHeight === "function") {
            notifyParentHeight();
            setTimeout(notifyParentHeight, 360);
            setTimeout(notifyParentHeight, 760);
        }

        targetItem._collapseTimer = setTimeout(() => {
            targetItem.classList.remove('is-luan-giai-collapsing');
            if (backBtn) backBtn.classList.remove('is-btn-pressing');
            targetItem._collapseTimer = null;
            if (typeof notifyParentHeight === "function") {
                notifyParentHeight();
            }
        }, 760);
    }
}

/**
 * Xử lý khi người dùng chọn gói Luận giải AI hoặc Master từ ô lịch sử
 */
async function handleHistorySelectOption(type, index) {
    if (selectedHistoryIndex !== index) {
        await selectHistoryChart(index);
    }
    selectLuanGiaiOption(type);
}

async function generateTuViFromHistory(inputData, originalChartCode) {

    if (typeof showTuViLoading === "function") showTuViLoading();

    if (typeof hideTuViStaleNotice === "function") hideTuViStaleNotice();

    const apiUrl = (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http"))

        ? `${window.location.origin}/api/calculate`

        : "http://localhost:8080/api/calculate";

    try {

        let chartData = null;

        try {

            const res = await fetch(apiUrl, {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify(inputData)

            });

            if (res.ok) chartData = await res.json();

        } catch {

            const resLocal = await fetch("http://localhost:8080/api/calculate", {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify(inputData)

            });

            if (resLocal.ok) chartData = await resLocal.json();

        }

        if (chartData) {

            // Đảm bảo gắn chính xác mã lá số gốc của phiên đó vào Thiên bàn

            if (originalChartCode) {

                chartData.idCode = originalChartCode;

            }

            window.__tuviMarkdownAdmin = chartData.markdown_admin || chartData.markdown || '';

            window.__tuviMarkdownAI = chartData.markdown_ai || '';

            window.__tuviMarkdown = chartData.markdown_admin || chartData.markdown || '';

            if (typeof invalidateChartImageCache === "function") invalidateChartImageCache();

            setPanelFooterNote('generated');

            if (typeof renderTuViBoard === "function") {

                renderTuViBoard(chartData);

            }

            const idCodeEl = document.getElementById("tb-id-code");

            if (idCodeEl && originalChartCode) {

                idCodeEl.innerText = originalChartCode;

            }

                        if (window.parent && window.parent !== window) {
                try {
                    window.parent.postMessage({
                        type: 'TUVI_MARKDOWN_GENERATED',
                        markdown_admin: chartData.markdown_admin,
                        markdown_ai: chartData.markdown_ai,
                        chartData: chartData
                    }, '*');
                } catch {}
            }

            // Chỉ cập nhật giao diện tab Lập lá số nếu đang ở tab Lập lá số; bảo toàn nguyên trạng thái của tab Lập lá số khi đang xem Lịch sử
            if (currentActiveTab === 'create') {
                currentTuViUIState = 'generated';
                syncBodyTuViStateClass('generated');
                const isMobileView = document.body.classList.contains('viewport-mobile');
                const actionSec = document.getElementById("actionSection");
                const btnGen = document.getElementById("btnGenerateTuVi");
                const btnLuanGiai = document.getElementById("btnOpenLuanGiai");
    const btnAlreadyInterpreted = document.getElementById("btnAlreadyInterpreted");
                const exportSec = document.getElementById("exportSection");
                const luanGiaiOptions = document.getElementById("luanGiaiOptions");
                if (btnGen) {
                    btnGen.style.display = "none";
                    btnGen.classList.add("is-hidden");
                }
                if (isMobileView) {
                    if (actionSec) actionSec.style.display = "none";
                    if (btnLuanGiai) btnLuanGiai.style.display = "none";
                    if (luanGiaiOptions) {
                        luanGiaiOptions.classList.add("is-expanded");
                        luanGiaiOptions.style.display = "flex";
                        luanGiaiOptions.style.position = "relative";
                        luanGiaiOptions.style.visibility = "visible";
                    }
                } else {
                    if (actionSec) actionSec.style.display = "flex";
                    if (btnLuanGiai) {
                        btnLuanGiai.style.display = "flex";
                    }
                    if (luanGiaiOptions) {
                        luanGiaiOptions.classList.remove("is-expanded");
                        luanGiaiOptions.style.setProperty("display", "none", "important");
                    }
                }
                if (exportSec) exportSec.style.display = "flex";
                document.body.classList.remove("luan-giai-collapsed-active");
                const inputPanelHist = document.querySelector('.input-panel');
                if (inputPanelHist) inputPanelHist.classList.remove('collapsed-view');
            }
        }

    } catch (err) {

        console.error("Lỗi khi dựng lại lá số từ lịch sử:", err);

    } finally {

        if (typeof hideTuViLoading === "function") {

            await hideTuViLoading();

        }

        if (typeof notifyParentHeight === "function") {

            notifyParentHeight();

        }

    }

}

function handleOpenAiFromHistory(chartIndex) {

    if (typeof chartIndex === "number" && chartIndex >= 0 && Array.isArray(userChartHistoryList) && userChartHistoryList[chartIndex]) {

        const targetChart = userChartHistoryList[chartIndex];

        const targetSession = getAiSessionForChart(targetChart);

        if (targetSession) {

            currentAiMatchedSession = targetSession;

        }

        if (selectedHistoryIndex !== chartIndex) {

            selectHistoryChart(chartIndex);

        }

    }

    if (!currentAiMatchedSession) return;

    const targetChart = (typeof chartIndex === "number" && userChartHistoryList?.[chartIndex]) ? userChartHistoryList[chartIndex] : null;

    const curChart = (typeof getCurrentChartData === "function") ? getCurrentChartData() : (window.currentChartData || null);

    const chartToSend = targetChart || curChart;

    const mdAi = window.__tuviMarkdownAI || chartToSend?.markdown_ai || curChart?.markdown_ai || '';

    if (window.parent && window.parent !== window) {

        window.parent.postMessage({

            type: 'TUVI_OPEN_AI_SESSION',

            sessionId: currentAiMatchedSession.sessionId,

            markdown_ai: mdAi,

            chartData: chartToSend,

            chartImageUrl: currentAiMatchedSession.chartImageUrl || ''

        }, '*');

    }

}

// ==========================================================================

// MODAL CẢNH BÁO XÓA LÁ SỐ ĐẾM NGƯỢC 10 GIÂY

// ==========================================================================

async function deleteChartDirectly(chartId, chartCode) {

    if (!chartId) return;

    let token = localStorage.getItem('tuvi_token');
    if (!token && window.parent && window.parent !== window) {
        try {
            token = window.parent.localStorage.getItem('tuvi_token');
        } catch (_e) {}
    }

    if (!token) {

        requestParentGoogleAuth();

        return;

    }

    try {

        const apiUrl = (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http"))

            ? `${window.location.origin}/api/user/charts/${chartId}`

            : `http://localhost:8080/api/user/charts/${chartId}`;

        const res = await fetch(apiUrl, {

            method: 'DELETE',

            headers: {

                'Authorization': `Bearer ${token}`

            }

        });

        if (res.ok) {

            // Xóa phiên AI tương ứng khỏi localStorage (Yêu cầu: xóa toàn bộ dữ liệu luận giải nếu có của lá số đó)

            try {

                const raw = localStorage.getItem('tuvi_chat_sessions');

                if (raw) {

                    let sessions = JSON.parse(raw);

                    sessions = sessions.filter(s => s.chartCode !== chartCode && s.chartData?.idCode !== chartCode);

                    localStorage.setItem('tuvi_chat_sessions', JSON.stringify(sessions));

                }

            } catch {}

            // Tải lại danh sách lịch sử trực tiếp và giữ nguyên lựa chọn còn lại (nếu chưa bị xóa)

            const deletedSelected = (selectedHistoryIndex >= 0 && userChartHistoryList[selectedHistoryIndex]?.chart_code === chartCode);
            if (deletedSelected) {
                selectedHistoryIndex = -1;
                if (tabViewState.history) {
                    tabViewState.history.selectedIndex = -1;
                    tabViewState.history.selectedChartCode = '';
                    tabViewState.history.expandedOptionsIndex = -1;
                }
                const aiCard = document.getElementById('historyAiActionCard');
                if (aiCard) aiCard.style.display = 'none';
            }

            await loadUserChartHistory({ force: true, preserveSelection: !deletedSelected });
            saveHistoryTabState();

        } else {

            console.warn('[TuVi] Không thể xóa lá số:', res.status);

        }

    } catch (err) {

        console.error('[TuVi] Lỗi kết nối khi xóa lá số:', err);

    }

}

function openDeleteConfirm(chartId, chartCode) {

    deleteChartDirectly(chartId, chartCode);

}

function _unused_old_openDeleteConfirm(chartId, chartCode) {

    deleteTargetChartId = chartId;

    deleteTargetChartCode = chartCode;

    const modal = document.getElementById("deleteConfirmModal");

    const codeEl = document.getElementById("deleteModalChartCode");

    const secEl = document.getElementById("deleteModalSeconds");

    const btnDel = document.getElementById("btnExecuteDelete");

    if (codeEl) codeEl.innerText = chartCode || `ID ${chartId}`;

    if (modal) modal.classList.remove("hidden");

    deleteSecondsRemaining = 10;

    if (secEl) secEl.innerText = "10s";

    if (btnDel) {

        btnDel.disabled = true;

        btnDel.classList.add("is-locked");

        btnDel.innerText = "Xóa bỏ hoàn toàn (10s)";

    }

    if (deleteCountdownTimer) clearInterval(deleteCountdownTimer);

    deleteCountdownTimer = setInterval(() => {

        deleteSecondsRemaining--;

        if (secEl) secEl.innerText = `${deleteSecondsRemaining}s`;

        if (btnDel) {

            if (deleteSecondsRemaining > 0) {

                btnDel.innerText = `Xóa bỏ hoàn toàn (${deleteSecondsRemaining}s)`;

            } else {

                btnDel.innerText = "Xóa bỏ hoàn toàn";

                btnDel.disabled = false;

                btnDel.classList.remove("is-locked");

                clearInterval(deleteCountdownTimer);

                deleteCountdownTimer = null;

            }

        }

    }, 1000);

}

function closeDeleteConfirmModal() {

    const modal = document.getElementById("deleteConfirmModal");

    if (modal) modal.classList.add("hidden");

    if (deleteCountdownTimer) {

        clearInterval(deleteCountdownTimer);

        deleteCountdownTimer = null;

    }

    deleteTargetChartId = null;

    deleteTargetChartCode = '';

}

async function executeConfirmedDelete() {

    if (!deleteTargetChartId) return;

    const btnDel = document.getElementById("btnExecuteDelete");

    if (btnDel) {

        btnDel.disabled = true;

        btnDel.innerText = "Đang xóa...";

    }

    let token = localStorage.getItem('tuvi_token');
    if (!token && window.parent && window.parent !== window) {
        try {
            token = window.parent.localStorage.getItem('tuvi_token');
        } catch (_e) {}
    }

    const targetId = deleteTargetChartId;

    const targetCode = deleteTargetChartCode;

    try {

        const apiUrl = (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http"))

            ? `${window.location.origin}/api/user/charts/${targetId}`

            : `http://localhost:8080/api/user/charts/${targetId}`;

        const res = await fetch(apiUrl, {

            method: 'DELETE',

            headers: {

                'Authorization': `Bearer ${token}`

            }

        });

        if (res.ok) {

            // Xóa phiên AI tương ứng khỏi localStorage nếu có

            try {

                const raw = localStorage.getItem('tuvi_chat_sessions');

                if (raw) {

                    let sessions = JSON.parse(raw);

                    sessions = sessions.filter(s => s.chartCode !== targetCode && s.chartData?.idCode !== targetCode);

                    localStorage.setItem('tuvi_chat_sessions', JSON.stringify(sessions));

                }

            } catch {}

            closeDeleteConfirmModal();

            loadUserChartHistory();

        } else {

            alert("Không thể xóa lá số này. Vui lòng thử lại.");

            closeDeleteConfirmModal();

        }

    } catch (err) {

        console.error("Lỗi khi xóa lá số:", err);

        alert("Lỗi kết nối khi xóa lá số.");

        closeDeleteConfirmModal();

    }

}

window.showTuViLoading = showTuViLoading;

window.hideTuViLoading = hideTuViLoading;

window.showTuViStaleNotice = showTuViStaleNotice;

window.hideTuViStaleNotice = hideTuViStaleNotice;

window.debounce = debounce;

window.populateSelect = populateSelect;

window.updateDaysInMonth = updateDaysInMonth;

window.initDropdowns = initDropdowns;

window.toggleCalendarType = toggleCalendarType;

window.collectInputParams = collectInputParams;

window.initEventListeners = initEventListeners;

window.notifyParentHeight = notifyParentHeight;

window.syncResponsiveWidths = syncResponsiveWidths;

window.showGenerateButton = showGenerateButton;

window.hideGenerateButton = hideGenerateButton;

window.toggleLuanGiaiCollapse = toggleLuanGiaiCollapse;

window.selectLuanGiaiOption = selectLuanGiaiOption;

window.setTuViUIState = setTuViUIState;

window.isPreviewName = isPreviewName;

window.handleTuViInputChange = handleTuViInputChange;

// Expose Tab & History APIs

window.switchTuViTab = switchTuViTab;

window.updateTabSlidingIndicator = updateTabSlidingIndicator;

window.requestParentGoogleAuth = requestParentGoogleAuth;

window.loadUserChartHistory = loadUserChartHistory;

window.selectHistoryChart = selectHistoryChart;

window.handleOpenAiFromHistory = handleOpenAiFromHistory;

window.openDeleteConfirm = openDeleteConfirm;

window.closeDeleteConfirmModal = closeDeleteConfirmModal;

window.executeConfirmedDelete = executeConfirmedDelete;

window.populateFormWithInputData = populateFormWithInputData;

window.deleteChartDirectly = deleteChartDirectly;

// Tự động đồng bộ Viewport & Chiều cao khi kích thước cửa sổ thay đổi
window.addEventListener('resize', () => {
    updateViewportEngine();
    notifyParentHeight();
});
window.addEventListener('orientationchange', () => {
    updateViewportEngine();
    notifyParentHeight();
});

// Khởi tạo tab sliding indicator, viewport engine và kích thước ban đầu
if (typeof updateTabSlidingIndicator === 'function') {
    updateTabSlidingIndicator('create');
}
if (typeof updateViewportEngine === 'function') {
    updateViewportEngine();
}
if (typeof notifyParentHeight === 'function') {
    notifyParentHeight();
}

window.toggleHistoryLuanGiai = toggleHistoryLuanGiai;
window.handleHistorySelectOption = handleHistorySelectOption;

// ==========================================================================
// TÍNH NĂNG PHÁT HIỆN LÁ SỐ TRÙNG LẶP TRONG LỊCH SỬ TRƯỚC KHI TẠO MỚI
// ==========================================================================
let matchedDuplicateHistoryChart = null;
let matchedDuplicateHistoryIndex = -1;

/**
 * Chuẩn hóa họ tên để so khớp chính xác
 */
function normalizeNameForMatch(name) {
    if (!name) return '';
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Chuẩn hóa giới tính về 'nam' hoặc 'nu'
 */
function normalizeGenderForMatch(g) {
    if (!g) return 'nam';
    const s = g.toString().toLowerCase().trim();
    return (s === 'nu' || s === 'nữ' || s === 'female' || s === 'f') ? 'nu' : 'nam';
}

/**
 * Xác định lá số lịch sử là dương lịch hay âm lịch
 */
function getChartIsSolarForMatch(chart) {
    if (chart.input_data) {
        if (chart.input_data.is_solar !== undefined) return Boolean(chart.input_data.is_solar);
        if (chart.input_data.isSolar !== undefined) return Boolean(chart.input_data.isSolar);
        if (chart.input_data.calendar_type) {
            return chart.input_data.calendar_type === 'duong' || chart.input_data.calendar_type === 'solar';
        }
    }
    if (chart.loai_lich) {
        return chart.loai_lich === 'duong_lich' || chart.loai_lich === 'duong';
    }
    if (chart.lich_xem) {
        return chart.lich_xem === 'duong' || chart.lich_xem === 'solar';
    }
    return true;
}

/**
 * Kiểm tra 100% khớp các trường dữ liệu giữa form nhập và bản ghi lịch sử
 */
function isChartExactMatch(params, chart) {
    if (!params || !chart) return false;

    // 1. Họ và tên
    const inputName = normalizeNameForMatch(params.name);
    const chartName = normalizeNameForMatch((chart.input_data && chart.input_data.name) || chart.ho_ten);
    if (!inputName || isPreviewName(inputName)) return false;
    if (inputName !== chartName) return false;

    // 2. Giới tính
    const inputGender = normalizeGenderForMatch(params.gender);
    const chartGender = normalizeGenderForMatch((chart.input_data && chart.input_data.gender) || chart.gioi_tinh);
    if (inputGender !== chartGender) return false;

    // 3. Loại lịch (Dương lịch / Âm lịch)
    const inputIsSolar = Boolean(params.is_solar !== undefined ? params.is_solar : params.isSolar);
    const chartIsSolar = getChartIsSolarForMatch(chart);
    if (inputIsSolar !== chartIsSolar) return false;

    // 4. Tháng nhuận (nếu là Âm lịch)
    if (!inputIsSolar) {
        const inputIsLeap = Boolean(params.is_leap_month_input || params.isLeapMonthInput);
        const chartIsLeap = Boolean((chart.input_data && (chart.input_data.is_leap_month_input || chart.input_data.isLeapMonthInput)) || chart.thang_nhuan);
        if (inputIsLeap !== chartIsLeap) return false;
    }

    // 5. Ngày, Tháng, Năm sinh
    const inputDay = parseInt(params.day, 10);
    const chartDay = parseInt((chart.input_data && (chart.input_data.day || chart.input_data.solar_day || chart.input_data.lunar_day)) || chart.ngay_sinh, 10);
    if (inputDay !== chartDay) return false;

    const inputMonth = parseInt(params.month, 10);
    const chartMonth = parseInt((chart.input_data && (chart.input_data.month || chart.input_data.solar_month || chart.input_data.lunar_month)) || chart.thang_sinh, 10);
    if (inputMonth !== chartMonth) return false;

    const inputYear = parseInt(params.year, 10);
    const chartYear = parseInt((chart.input_data && (chart.input_data.year || chart.input_data.solar_year || chart.input_data.lunar_year)) || chart.nam_sinh, 10);
    if (inputYear !== chartYear) return false;

    // 6. Giờ, Phút sinh
    const inputHour = parseInt(params.hour, 10) || 0;
    const chartHour = parseInt((chart.input_data && (chart.input_data.hour !== undefined ? chart.input_data.hour : chart.input_data.birth_hour)) !== undefined ? (chart.input_data.hour ?? chart.input_data.birth_hour) : chart.gio_sinh, 10) || 0;
    if (inputHour !== chartHour) return false;

    const inputMinute = parseInt(params.minute, 10) || 0;
    const chartMinute = parseInt((chart.input_data && (chart.input_data.minute !== undefined ? chart.input_data.minute : chart.input_data.birth_minute)) !== undefined ? (chart.input_data.minute ?? chart.input_data.birth_minute) : chart.phut_sinh, 10) || 0;
    if (inputMinute !== chartMinute) return false;

    // 7. Năm xem hạn
    const inputLimitYear = parseInt(params.limit_year || params.limitYear, 10) || 0;
    const chartLimitYear = parseInt((chart.input_data && (chart.input_data.limit_year || chart.input_data.limitYear || chart.input_data.view_year)) || chart.nam_xem_han || chart.nam_xem, 10) || 0;
    if (inputLimitYear && chartLimitYear && inputLimitYear !== chartLimitYear) return false;

    return true;
}

/**
 * Kiểm tra dữ liệu form hiện tại có trùng với bất kỳ bản ghi lịch sử nào không
 */
function checkFormDuplicateWithHistory(options = {}) {
    const suppressContentSwap = Boolean(options && options.suppressContentSwap);
    const btnGen = document.getElementById("btnGenerateTuVi");
    const staleNotice = document.querySelector("#tuviStaleOverlay .tuvi-stale-notice");
    if (!btnGen) return null;

    // QUY TẮC CỐT LÕI: Nút lập lá số / trùng khớp chỉ hiển thị khi người dùng ĐANG SỬA FORM (input-changed)
    // Khi đang xem lá số đã lập (generated), nút lập lá số ẩn đi (tính năng chuẩn của trang), không kích hoạt trùng khớp.
    if (typeof currentTuViUIState !== 'undefined' && currentTuViUIState === 'generated') {
        if (!btnGen.classList.contains('is-btn-exiting')) {
            btnGen.style.display = 'none';
            btnGen.classList.add('is-hidden');
        }
        btnGen.classList.remove('is-duplicate-match');
        matchedDuplicateHistoryChart = null;
        matchedDuplicateHistoryIndex = -1;
        return null;
    }

    if (!Array.isArray(userChartHistoryList) || userChartHistoryList.length === 0) {
        resetDuplicateButtonState(btnGen, staleNotice, suppressContentSwap);
        matchedDuplicateHistoryChart = null;
        matchedDuplicateHistoryIndex = -1;
        return null;
    }

    const currentParams = collectInputParams();
    const inputName = (currentParams.name || '').trim();
    if (!inputName || isPreviewName(inputName)) {
        resetDuplicateButtonState(btnGen, staleNotice, suppressContentSwap);
        matchedDuplicateHistoryChart = null;
        matchedDuplicateHistoryIndex = -1;
        return null;
    }

    let foundIndex = -1;
    let foundChart = null;
    for (let i = 0; i < userChartHistoryList.length; i++) {
        const chart = userChartHistoryList[i];
        if (isChartExactMatch(currentParams, chart)) {
            foundIndex = i;
            foundChart = chart;
            break;
        }
    }

    if (foundChart && foundIndex !== -1) {
        matchedDuplicateHistoryChart = foundChart;
        matchedDuplicateHistoryIndex = foundIndex;
        applyDuplicateButtonState(btnGen, staleNotice, foundChart, suppressContentSwap);
        return { chart: foundChart, index: foundIndex };
    } else {
        matchedDuplicateHistoryChart = null;
        matchedDuplicateHistoryIndex = -1;
        resetDuplicateButtonState(btnGen, staleNotice, suppressContentSwap);
        return null;
    }
}

function syncStaleNoticeLabel(staleNoticeEl) {
    const el = staleNoticeEl || document.querySelector("#tuviStaleOverlay .tuvi-stale-notice");
    if (!el) return;
    const isMobileView = document.body.classList.contains("viewport-mobile");
    const isDup = el.classList.contains("is-duplicate-match");
    const labelSpan = el.querySelector("span");
    if (labelSpan) {
        if (isDup) {
            labelSpan.textContent = isMobileView ? "ĐÃ LẬP TRƯỚC ĐÓ" : "LÁ SỐ ĐÃ CÓ TRONG LỊCH SỬ - BẤM ĐỂ XEM";
        } else {
            labelSpan.textContent = isMobileView ? "LẬP LÁ SỐ" : "BẤM NÚT LẬP LÁ SỐ ĐỂ XEM";
        }
    }
}

/**
 * Thiết lập style và nhãn cho nút khi phát hiện trùng khớp
 */
function applyDuplicateButtonState(btnGen, staleNotice, matchedChart, suppressContentSwap = false) {
    if (!btnGen) return;

    // Chỉ hiển thị nút trùng khớp nếu người dùng thực sự đang chỉnh sửa form
    if (typeof currentTuViUIState !== 'undefined' && currentTuViUIState !== 'input-changed') {
        return;
    }

    const wasDuplicate = btnGen.classList.contains("is-duplicate-match");
    btnGen.classList.add("is-duplicate-match");
    btnGen.style.display = "flex";
    btnGen.classList.remove("is-hidden");
    const actionSec = document.getElementById("actionSection");
    if (actionSec) {
        actionSec.style.display = "flex";
    }

    if (!wasDuplicate) {
        btnGen.innerHTML = `
            <span class="btn-content-inner">
                <span>Lá số trùng khớp với lịch sử</span>
            </span>
        `;
        if (!suppressContentSwap) {
            const inner = btnGen.querySelector(".btn-content-inner");
            if (inner) {
                inner.classList.add("is-content-swapping");
                setTimeout(() => inner.classList.remove("is-content-swapping"), 370);
            }
        }
    }
    btnGen.setAttribute("title", `Lá số của "${matchedChart.ho_ten}" đã tồn tại trong lịch sử. Bấm để xem lại.`);

    if (staleNotice) {
        if (!staleNotice.classList.contains("is-duplicate-match")) {
            staleNotice.classList.add("is-duplicate-match");
            staleNotice.innerHTML = `
                <svg class="stale-duplicate-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>LÁ SỐ ĐÃ CÓ TRONG LỊCH SỬ - BẤM ĐỂ XEM</span>
            `;
        }
        syncStaleNoticeLabel(staleNotice);
    }
}

/**
 * Khôi phục nút về trạng thái mặc định khi dữ liệu không còn trùng khớp
 */
function resetDuplicateButtonState(btnGen, staleNotice, suppressContentSwap = false) {
    if (!btnGen) return;

    if (btnGen.classList.contains("is-duplicate-match")) {
        btnGen.classList.remove("is-duplicate-match");
        btnGen.innerHTML = `
            <span class="btn-content-inner">
                <svg class="btn-play-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                </svg>
                <span>LẬP LÁ SỐ</span>
            </span>
        `;
        if (!suppressContentSwap) {
            const inner = btnGen.querySelector(".btn-content-inner");
            if (inner) {
                inner.classList.add("is-content-swapping");
                setTimeout(() => inner.classList.remove("is-content-swapping"), 370);
            }
        }
        btnGen.removeAttribute("title");
    }

    if (staleNotice) {
        if (staleNotice.classList.contains("is-duplicate-match")) {
            staleNotice.classList.remove("is-duplicate-match");
            staleNotice.innerHTML = `
                <svg class="stale-play-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                </svg>
                <span>BẤM NÚT LẬP LÁ SỐ ĐỂ XEM</span>
            `;
        }
        syncStaleNoticeLabel(staleNotice);
    }
}

/**
 * Xử lý khi người dùng click vào nút trùng khớp:
 * Chuyển tab sang Lịch sử, tự động cuộn đến và chọn lá số tương ứng
 */
async function handleNavigateToDuplicateHistory(targetIndex) {
    if (targetIndex < 0 || !Array.isArray(userChartHistoryList) || !userChartHistoryList[targetIndex]) return;

    // 1. Ẩn stale overlay trên tờ lá số (nếu có)
    if (typeof hideTuViStaleNotice === "function") {
        hideTuViStaleNotice();
    }

    // 2. Chuyển sang tab Lịch sử lá số & luận giải
    if (typeof switchTuViTab === "function") {
        switchTuViTab('history');
    }

    if (!historyLoadedOnce && typeof loadUserChartHistory === "function") {
        await loadUserChartHistory({ force: true, preserveSelection: false });
    }

    // 3. Tự động chọn lá số trùng khớp và vẽ lên bàn tử vi
    if (typeof selectHistoryChart === "function") {
        await selectHistoryChart(targetIndex);
    }

    // 4. Chỉ cuộn nội bộ danh sách lịch sử nếu vùng danh sách có thanh cuộn riêng, tránh scrollIntoView làm giật trang cha
    setTimeout(() => {
        const items = document.querySelectorAll('.tuvi-history-item');
        if (items && items[targetIndex]) {
            const targetEl = items[targetIndex];
            const itemsWrapper = document.getElementById('tuviHistoryList');
            if (itemsWrapper && itemsWrapper.scrollHeight > itemsWrapper.clientHeight + 2) {
                const targetTop = targetEl.offsetTop - Math.max(0, (itemsWrapper.clientHeight - targetEl.offsetHeight) / 2);
                itemsWrapper.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            }

            targetEl.classList.remove('duplicate-matched-focus');
            void targetEl.offsetWidth; // Force Reflow
            targetEl.classList.add('duplicate-matched-focus');
            setTimeout(() => {
                targetEl.classList.remove('duplicate-matched-focus');
            }, 3000);
        }
    }, 120);
}

/**
 * Tải trước lịch sử lá số ngầm để phục vụ phát hiện trùng lặp ngay khi người dùng nhập form
 */
async function prefetchUserChartHistory() {
    let token = localStorage.getItem('tuvi_token');
    if (!token && window.parent && window.parent !== window) {
        try {
            token = window.parent.localStorage.getItem('tuvi_token');
        } catch (_e) {}
    }
    if (!token) return;

    try {
        const apiUrl = (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http"))
            ? `${window.location.origin}/api/user/charts`
            : "http://localhost:8080/api/user/charts";
        const res = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.ok) {
            const data = await res.json();
            userChartHistoryList = data.data || [];
            // Chỉ đối chiếu nếu người dùng đang chỉnh sửa form
            if (typeof currentTuViUIState !== 'undefined' && currentTuViUIState === 'input-changed') {
                checkFormDuplicateWithHistory();
            }
        }
    } catch (_err) {
        // Im lặng bỏ qua lỗi fetch ngầm
    }
}

window.checkFormDuplicateWithHistory = checkFormDuplicateWithHistory;
window.handleNavigateToDuplicateHistory = handleNavigateToDuplicateHistory;
window.prefetchUserChartHistory = prefetchUserChartHistory;

// Khởi chạy tải trước lịch sử người dùng để phát hiện trùng lặp
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        prefetchUserChartHistory();
    });
} else {
    prefetchUserChartHistory();
}

// =========================================================================
// FEATURE F10: MOBILE TOUCH GESTURE CONTROLLER (PINCH-TO-ZOOM & PAN 12 CUNG)
// Hỗ trợ zoom 1.0x - 2.5x, pan 1 ngón khi zoom, double-tap reset 1.0x,
// triệt tiêu xung đột với tap chọn cung qua pha Capture.
// =========================================================================

(function initMobileTouchGestureController() {
    let currentBaseScale = 1.0;
    let currentZoom = 1.0;
    let panX = 0;
    let panY = 0;

    let isPinching = false;
    let initialPinchDist = 0;
    let initialZoom = 1.0;
    let initialPanX = 0;
    let initialPanY = 0;
    let pinchMidX = 0;
    let pinchMidY = 0;

    let startTouchX = 0;
    let startTouchY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let hasMoved = false;

    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    let rAFScheduled = false;

    function getElements() {
        const wrapper = document.querySelector('.tuvi-board-wrapper');
        const board = document.getElementById('tuviBoard');
        return { wrapper, board };
    }

    function clampPan() {
        const { wrapper } = getElements();
        if (!wrapper) return;
        const BASE_WIDTH = 737;
        const BASE_HEIGHT = 1013;
        const totalScale = currentBaseScale * currentZoom;
        const scaledW = BASE_WIDTH * totalScale;
        const scaledH = BASE_HEIGHT * totalScale;
        const viewportW = BASE_WIDTH * currentBaseScale;
        const viewportH = BASE_HEIGHT * currentBaseScale;

        const minPanX = Math.min(0, viewportW - scaledW);
        const minPanY = Math.min(0, viewportH - scaledH);

        panX = Math.min(0, Math.max(minPanX, panX));
        panY = Math.min(0, Math.max(minPanY, panY));
    }

    function applyTransform(animated = false) {
        const { wrapper, board } = getElements();
        if (!board) return;

        if (wrapper) {
            wrapper.classList.toggle('is-zoomed', currentZoom > 1.01);
        }

        if (animated) {
            board.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1)';
            setTimeout(() => {
                if (board) board.style.transition = '';
            }, 260);
        } else {
            board.style.transition = 'none';
        }

        const totalScale = currentBaseScale * currentZoom;
        board.style.transformOrigin = '0 0';
        board.style.transform = `translate3d(${panX.toFixed(2)}px, ${panY.toFixed(2)}px, 0) scale(${totalScale.toFixed(4)})`;
    }

    function requestApplyTransform() {
        if (rAFScheduled) return;
        rAFScheduled = true;
        requestAnimationFrame(() => {
            applyTransform(false);
            rAFScheduled = false;
        });
    }

    function resetGestureState(animated = false) {
        currentZoom = 1.0;
        panX = 0;
        panY = 0;
        isPinching = false;
        hasMoved = false;
        applyTransform(animated);
    }

    // Export hàm cập nhật baseScale cho updateViewportEngine()
    window.setGestureBaseScale = function(scale) {
        currentBaseScale = scale || 1.0;
        if (currentZoom <= 1.01) {
            panX = 0;
            panY = 0;
            applyTransform(false);
        } else {
            clampPan();
            applyTransform(false);
        }
    };

    window.resetMobileBoardZoom = function() {
        resetGestureState(true);
    };

    function attachListeners() {
        const { wrapper } = getElements();
        if (!wrapper || wrapper._touchGestureAttached) return;
        wrapper._touchGestureAttached = true;

        // 1. touchstart
        wrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Khởi đầu véo 2 ngón
                isPinching = true;
                hasMoved = true;
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                initialZoom = currentZoom;
                initialPanX = panX;
                initialPanY = panY;

                const rect = wrapper.getBoundingClientRect();
                pinchMidX = (t1.clientX + t2.clientX) / 2 - rect.left;
                pinchMidY = (t1.clientY + t2.clientY) / 2 - rect.top;
                e.preventDefault();
            } else if (e.touches.length === 1) {
                isPinching = false;
                hasMoved = false;
                const t = e.touches[0];
                startTouchX = t.clientX;
                startTouchY = t.clientY;
                lastTouchX = t.clientX;
                lastTouchY = t.clientY;
            }
        }, { passive: false });

        // 2. touchmove
        wrapper.addEventListener('touchmove', (e) => {
            if (isPinching && e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                if (initialPinchDist > 0) {
                    const factor = dist / initialPinchDist;
                    const nextZoom = Math.min(2.5, Math.max(1.0, initialZoom * factor));
                    const zoomRatio = nextZoom / initialZoom;
                    panX = pinchMidX - (pinchMidX - initialPanX) * zoomRatio;
                    panY = pinchMidY - (pinchMidY - initialPanY) * zoomRatio;
                    currentZoom = nextZoom;
                    clampPan();
                    requestApplyTransform();
                }
                e.preventDefault();
            } else if (!isPinching && e.touches.length === 1) {
                const t = e.touches[0];
                const dx = t.clientX - lastTouchX;
                const dy = t.clientY - lastTouchY;
                const totalMove = Math.hypot(t.clientX - startTouchX, t.clientY - startTouchY);

                if (totalMove > 8) {
                    hasMoved = true;
                }

                if (currentZoom > 1.02) {
                    panX += dx;
                    panY += dy;
                    clampPan();
                    requestApplyTransform();
                    lastTouchX = t.clientX;
                    lastTouchY = t.clientY;
                    e.preventDefault(); // Giữ vuốt pan mượt mà trong lá số, không cuộn trang
                }
            }
        }, { passive: false });

        // 3. touchend
        wrapper.addEventListener('touchend', (e) => {
            if (isPinching && e.touches.length < 2) {
                isPinching = false;
                if (currentZoom < 1.05) {
                    resetGestureState(true);
                }
                return;
            }

            if (!isPinching && e.changedTouches.length === 1) {
                const t = e.changedTouches[0];
                const now = Date.now();
                const timeDiff = now - lastTapTime;
                const tapDist = Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY);

                // Nhận diện Double-Tap
                if (!hasMoved && timeDiff < 300 && tapDist < 24) {
                    if (currentZoom > 1.05) {
                        resetGestureState(true);
                    } else {
                        // Zoom nhanh 1.8x vào điểm double-tap
                        const rect = wrapper.getBoundingClientRect();
                        const tapX = t.clientX - rect.left;
                        const tapY = t.clientY - rect.top;
                        currentZoom = 1.8;
                        panX = tapX - tapX * 1.8;
                        panY = tapY - tapY * 1.8;
                        clampPan();
                        applyTransform(true);
                    }
                    lastTapTime = 0;
                    e.preventDefault();
                    return;
                }

                lastTapTime = now;
                lastTapX = t.clientX;
                lastTapY = t.clientY;
            }
        });

        // 4. Triệt tiêu sự kiện Click giả mạo khi vừa thực hiện Pan (Capture Phase)
        wrapper.addEventListener('click', (e) => {
            if (hasMoved) {
                e.stopPropagation();
                e.preventDefault();
                hasMoved = false;
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachListeners);
    } else {
        attachListeners();
    }
})();


// Đồng bộ hiển thị giá hoặc nhãn "Đã mua - Bạn có <x> lượt sử dụng" trên trang /la-so-tu-vi
(function initLuanGiaiQuotaBadgeSync() {
    async function syncLuanGiaiCardPrices() {
        try {
            const token = localStorage.getItem('tuvi_token');
            if (!token) {
                resetCardPrices();
                return;
            }
            const res = await fetch('/api/ai/user-quota', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const quota = await res.json();
            const isLoggedIn = Boolean(quota && (quota.logged_in || token));
            const aiCredits = Number(quota?.ai_credits || 0);
            const consultationCredits = Number(quota?.consultation_credits || 0);

            function updateCardQuotaUI(cardSelector, priceSelector, defaultPrice, credits) {
                document.querySelectorAll(cardSelector).forEach((card) => {
                    const priceEl = card.querySelector(priceSelector);
                    const scopeEl = card.querySelector('.card-scope-badge');
                    let quotaBlock = card.querySelector('.card-purchased-quota-block');

                    if (isLoggedIn && credits > 0) {
                        if (priceEl) {
                            priceEl.style.display = 'none';
                        }
                        if (scopeEl) {
                            if (!quotaBlock) {
                                quotaBlock = document.createElement('div');
                                quotaBlock.className = 'card-purchased-quota-block';
                                scopeEl.insertAdjacentElement('afterend', quotaBlock);
                            }
                            quotaBlock.textContent = `Đã mua - Bạn có ${credits} lượt sử dụng`;
                            quotaBlock.style.display = 'flex';
                        }
                    } else {
                        if (priceEl) {
                            priceEl.textContent = defaultPrice;
                            priceEl.style.display = '';
                        }
                        if (quotaBlock) {
                            quotaBlock.style.display = 'none';
                        }
                    }
                });
            }

            updateCardQuotaUI('.card-ai', '.card-price-ai', '199.000đ', aiCredits);
            updateCardQuotaUI('.card-master', '.card-price-master', '500.000đ', consultationCredits);
        } catch (_err) {
            // Giữ nguyên giá mặc định nếu lỗi mạng
        }
    }

    function resetCardPrices() {
        document.querySelectorAll('.card-price-ai').forEach((el) => {
            el.textContent = '199.000đ';
            el.style.display = '';
        });
        document.querySelectorAll('.card-price-master').forEach((el) => {
            el.textContent = '500.000đ';
            el.style.display = '';
        });
        document.querySelectorAll('.card-purchased-quota-block').forEach((el) => {
            el.style.display = 'none';
        });
    }

    window.syncLuanGiaiCardPrices = syncLuanGiaiCardPrices;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncLuanGiaiCardPrices);
    } else {
        syncLuanGiaiCardPrices();
    }

    window.addEventListener('storage', syncLuanGiaiCardPrices);
    window.addEventListener('tuvi:quota-updated', syncLuanGiaiCardPrices);
    window.addEventListener('tuvi-auth-updated', syncLuanGiaiCardPrices);
    window.addEventListener('tuvi:auth-logout', resetCardPrices);
    window.addEventListener('message', (event) => {
        if (event?.data?.type === 'TUVI_QUOTA_UPDATED') {
            syncLuanGiaiCardPrices();
        }
    });
})();
