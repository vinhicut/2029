/**

 * app.js

 * Điểm khởi nhập chính của ứng dụng Frontend.

 * Điều phối gọi API Backend /api/calculate, khởi tạo các bộ điều khiển và xử lý sự kiện toàn cục.

 */



let currentRequestId = 0;

const OVERLAY_BUFFER_TIME = 200; // ms

let isInitialLoad = true;



async function generateTuVi(isUserClick = false) {
    // Kiểm tra lá số trùng khớp 100% trong lịch sử trước khi tạo mới
    if (isUserClick && typeof checkFormDuplicateWithHistory === 'function') {
        const matchResult = checkFormDuplicateWithHistory();
        if (matchResult && matchResult.index >= 0) {
            if (typeof handleNavigateToDuplicateHistory === 'function') {
                await handleNavigateToDuplicateHistory(matchResult.index);
            }
            return;
        }
    }

    const isFirstTime = isInitialLoad && !isUserClick;

    const requestId = ++currentRequestId;



    // Ẩn lớp phủ mờ thông báo

    if (typeof hideTuViStaleNotice === "function") {

        hideTuViStaleNotice();

    }



    // Giữ nút ở trạng thái đang xử lý khi user bấm để hoán đổi mượt sang nút Luận giải khi hoàn tất

    const btnGen = document.getElementById("btnGenerateTuVi");

    if (btnGen) {

        if (isUserClick) {

            if (document.activeElement === btnGen && typeof btnGen.blur === "function") {
                btnGen.blur();
            }

            btnGen.classList.add("is-generating");

            btnGen.disabled = true;

        } else {

            btnGen.classList.remove("btn-reappear", "is-btn-entering", "is-btn-exiting", "is-generating");

            btnGen.disabled = false;

        }

    }



    // BƯỚC 1: KÍCH HOẠT MÀN CHE LOADING

    if (typeof showTuViLoading === "function") {

        showTuViLoading();

    }



    const bufferPromise = new Promise(resolve => setTimeout(resolve, OVERLAY_BUFFER_TIME));



    // Thu thập tham số đầu vào

    const payload = (typeof collectInputParams === "function")

        ? collectInputParams()

        : {};



    const apiUrl = (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http"))

        ? `${window.location.origin}/api/calculate`

        : "http://localhost:8080/api/calculate";



    let chartData = null;



    try {

        // BƯỚC 2: GỌI API LẤY DỮ LIỆU TÍNH TOÁN

        try {

            const res = await fetch(apiUrl, {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify(payload)

            });

            if (!res.ok) throw new Error("Lỗi HTTP " + res.status);

            chartData = await res.json();

        } catch (apiErr) {

            console.warn("Lỗi gọi API từ origin chính, thử fallback localhost:8080...", apiErr);

            const resLocal = await fetch("http://localhost:8080/api/calculate", {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify(payload)

            });

            if (resLocal.ok) {

                chartData = await resLocal.json();

            }

        }



        if (requestId !== currentRequestId) {

            return;

        }



        // BƯỚC 3: ĐỢI THỜI GIAN ĐỆM ĐẢM BẢO MÀN CHE ĐÃ PHỦ KÍN

        await bufferPromise;



        if (requestId !== currentRequestId) {

            return;

        }



        // BƯỚC 4: RENDER DỮ LIỆU LÁ SỐ MỚI BÊN DƯỚI MÀN CHE

        if (chartData) {

            // Xác định số điện thoại hotline luân phiên cho lá số

            if (!chartData.hotline) {

                if (isFirstTime) {

                    const currentPhone = document.querySelector(".tb-header-phone")?.textContent?.trim();

                    chartData.hotline = currentPhone || (typeof getNextOrRandomHotline === "function" ? getNextOrRandomHotline() : "0924.616.199");

                } else {

                    chartData.hotline = (typeof getNextOrRandomHotline === "function") ? getNextOrRandomHotline() : "0924.616.199";

                }

            }



            // Lưu trữ ngầm Markdown phục vụ Quản trị viên và AI luận giải

            window.__tuviMarkdownAdmin = chartData.markdown_admin || chartData.markdown || '';

            window.__tuviMarkdownAI = chartData.markdown_ai || '';

            window.__tuviMarkdown = chartData.markdown_admin || chartData.markdown || '';



            // Thông báo ngầm cho ứng dụng cha (React App / Admin Context)

            if (window.parent && window.parent !== window) {

                try {

                    window.parent.postMessage({

                        type: 'TUVI_MARKDOWN_GENERATED',

                        markdown_admin: chartData.markdown_admin,

                        markdown_ai: chartData.markdown_ai,

                        chartData: chartData

                    }, '*');

                } catch {

                    /* cross-origin guard */

                }

            }



            if (typeof renderTuViBoard === "function") {

                if (typeof invalidateChartImageCache === "function") invalidateChartImageCache();

                renderTuViBoard(chartData);

            }



            // TỰ ĐỘNG XUẤT ẢNH TỜ LÁ SỐ ĐỂ PHỤC VỤ CỘT PREVIEW TRONG GIAO DIỆN AI

            if (window.location.search.includes('view=export-image') || window.location.search.includes('view=chart')) {

                setTimeout(async () => {

                    try {

                        if (typeof captureTuviBoard === 'function') {

                            const canvas = await captureTuviBoard(4);

                            if (canvas) {

                                const dataUrl = canvas.toDataURL('image/png');

                                if (window.parent && window.parent !== window) {

                                    window.parent.postMessage({

                                        type: 'TUVI_CHART_IMAGE_GENERATED',

                                        chartImageUrl: dataUrl,

                                        markdown_ai: chartData.markdown_ai,

                                        chartData: chartData

                                    }, '*');

                                }

                            }

                        }

                    } catch (exportErr) {

                        console.warn('[TuVi] Tự động xuất ảnh thất bại:', exportErr);

                    }

                }, 300);

            }



            // QUẢN LÝ TRẠNG THÁI GIAO DIỆN CỘT PHẢI (UI STATE FLOW)

            // Trạng thái 1: Khi khởi tạo ban đầu (Preview Mode) hoặc tên mang giá trị mặc định xem trước (không do user nhấn Lập lá số)

            // Trạng thái 3: Khi người dùng nhấn Lập lá số và hệ thống trả về kết quả thành công

            if (isUserClick || !isFirstTime) {

                if (typeof setTuViUIState === "function") {

                    setTuViUIState('generated');

                }

                // TỰ ĐỘNG LƯU LÁ SỐ VÀO DATABASE NẾU NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP GOOGLE

                if (typeof isPreviewName !== "function" || !isPreviewName(payload.name)) {
                    autoSaveChartToUserAccount(chartData, payload);
                }

            } else if (typeof isPreviewName === "function" && isPreviewName(payload.name)) {

                if (typeof setTuViUIState === "function") {

                    setTuViUIState('preview');

                }

            } else {

                if (typeof setTuViUIState === "function") {

                    setTuViUIState('generated');

                }

            }

            isInitialLoad = false;

        }

    } catch (err) {

        console.error("Không thể cập nhật lá số:", err);

        // Trường hợp lỗi thì cho hiện lại nút Lập lá số để người dùng bấm thử lại

        if (typeof setTuViUIState === "function") {

            setTuViUIState('input-changed');

        }

    } finally {

        if (requestId === currentRequestId) {

            const btnGenEl = document.getElementById("btnGenerateTuVi");
            if (btnGenEl) {
                btnGenEl.classList.remove("is-generating");
                btnGenEl.disabled = false;
            }

            // BƯỚC 5: HẠ MÀN CHE

            if (typeof hideTuViLoading === "function") {

                await hideTuViLoading();

            }

            if (typeof notifyParentHeight === "function") {

                notifyParentHeight();

            }

        }

    }

}



// Xử lý sự kiện co giãn màn hình

window.addEventListener('resize', () => {

    if (typeof syncResponsiveWidths === "function") {

        syncResponsiveWidths();

    }

    const cur = window.getCurrentChartData ? window.getCurrentChartData() : window.currentChartData;

    if (cur) {

        if (typeof updateMenhTaiQuanTriangle === "function") {

            updateMenhTaiQuanTriangle(cur.menhPos);

        }

        if (typeof positionTuanTrietBadges === "function") {

            positionTuanTrietBadges(cur.tuan_cung, cur.triet_cung);

        }

    }

    if (typeof notifyParentHeight === "function") {

        notifyParentHeight();

    }

});



// Xử lý chuẩn bị in

window.addEventListener('beforeprint', () => {

    const cur = window.getCurrentChartData ? window.getCurrentChartData() : window.currentChartData;

    if (cur) {

        if (typeof updateMenhTaiQuanTriangle === "function") {

            updateMenhTaiQuanTriangle(cur.menhPos);

        }

        if (typeof positionTuanTrietBadges === "function") {

            positionTuanTrietBadges(cur.tuan_cung, cur.triet_cung);

        }

    }

});



// Khởi chạy khi tài liệu HTML sẵn sàng

document.addEventListener("DOMContentLoaded", () => {

    if (window.location.search.includes('view=chart') || window.location.search.includes('mode=chart')) {

        document.body.classList.add('mode-chart-view');

        if (typeof hideTuViStaleNotice === "function") hideTuViStaleNotice();

    }

    if (typeof initDropdowns === "function") initDropdowns();

    if (typeof initEventListeners === "function") initEventListeners();

    if (typeof updateDaysInMonth === "function") updateDaysInMonth();



    // Dọn bỏ dữ liệu refill form cũ (nếu có) và khôi phục vị trí tab/lịch sử nếu người dùng quay lại
    try {
        localStorage.removeItem('tuvi_user_form_inputs');
        sessionStorage.removeItem('tuvi_user_form_inputs');
    } catch (_e) {}

    const restoredPosition = (typeof restoreSavedPagePosition === "function")
        ? restoreSavedPagePosition()
        : false;

    if (!restoredPosition) {
        if (typeof setTuViUIState === "function") setTuViUIState('preview');

        generateTuVi(false);
    }

    if (typeof notifyParentHeight === "function") {

        notifyParentHeight();

        setTimeout(notifyParentHeight, 200);

        setTimeout(notifyParentHeight, 800);

    }

});



window.addEventListener('load', () => {

    if (typeof notifyParentHeight === "function") {

        notifyParentHeight();

        setTimeout(notifyParentHeight, 300);

    }

});



if (typeof ResizeObserver !== 'undefined') {

    const ro = new ResizeObserver(() => {

        const transContainer = document.getElementById('createViewTransitionContainer');
        if (transContainer && transContainer.classList.contains('is-view-animating')) {
            return;
        }
        if (typeof isTuViViewTransitioning !== 'undefined' && isTuViViewTransitioning) {
            return;
        }

        if (typeof notifyParentHeight === "function") notifyParentHeight();

    });

    document.addEventListener("DOMContentLoaded", () => {

        const boardWrap = document.querySelector('.tuvi-board-wrapper');

        const inputPan = document.querySelector('.input-panel');

        if (boardWrap) ro.observe(boardWrap);

        if (inputPan) ro.observe(inputPan);

    });

}



// Lắng nghe yêu cầu xuất ảnh và đồng bộ từ ứng dụng cha

window.addEventListener('message', async (e) => {

    if (!e.data || typeof e.data !== 'object') return;



    if (e.data.type === 'REQUEST_EXPORT_CHART_IMAGE') {

        try {

            if (typeof captureTuviBoard === 'function') {

                const canvas = await captureTuviBoard(4);

                if (canvas) {

                    const dataUrl = canvas.toDataURL('image/png');

                    if (window.parent && window.parent !== window) {

                        window.parent.postMessage({

                            type: 'TUVI_CHART_IMAGE_GENERATED',

                            chartImageUrl: dataUrl

                        }, '*');

                    }

                }

            }

        } catch (err) {

            console.warn('[TuVi] Không thể xuất ảnh theo yêu cầu:', err);

        }

    }



    // Nhận thông báo trạng thái đăng nhập thay đổi từ React

    if (e.data.type === 'TUVI_AUTH_CHANGED') {
        const prevToken = localStorage.getItem('tuvi_token') || '';
        const nextToken = e.data.token || '';
        if (nextToken) {
            localStorage.setItem('tuvi_token', nextToken);
        } else if (e.data.token === null || e.data.token === '') {
            localStorage.removeItem('tuvi_token');
        }
        if (e.data.user) {
            localStorage.setItem('tuvi_user', typeof e.data.user === 'string' ? e.data.user : JSON.stringify(e.data.user));
        } else if (e.data.user === null) {
            localStorage.removeItem('tuvi_user');
        }
        if (prevToken !== nextToken && typeof loadUserChartHistory === 'function') {
            loadUserChartHistory({ force: true, resetSelection: true });
        }
    }



    // Nhận lệnh chuyển tab từ React

    if (e.data.type === 'TUVI_SWITCH_TAB' && e.data.tabKey) {

        if (typeof switchTuViTab === 'function') {

            switchTuViTab(e.data.tabKey);

        }

    }

});



async function autoSaveChartToUserAccount(chartData, payload) {
    let token = localStorage.getItem('tuvi_token');
    if (!token && window.parent && window.parent !== window) {
        try {
            token = window.parent.localStorage.getItem('tuvi_token');
        } catch (_e) {}
    }

    if (!token || !chartData) return;

    try {
        const apiUrl = (window.location.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http"))
            ? `${window.location.origin}/api/user/charts`
            : "http://localhost:8080/api/user/charts";

        const hoTen = chartData.thien_ban?.ho_ten || payload.name || "Vô Danh";
        const chartCode = chartData.id_code || chartData.idCode || `HA-${payload.year || 2000}${String(payload.month || 1).padStart(2, '0')}${String(payload.day || 1).padStart(2, '0')}`;
        chartData.idCode = chartCode;
        chartData.id_code = chartCode;

        const bodyData = {
            chart_code: chartCode,
            ho_ten: hoTen,
            gioi_tinh: payload.gender || "Nam",
            ngay_sinh: payload.day || 1,
            thang_sinh: payload.month || 1,
            nam_sinh: payload.year || 2000,
            gio_sinh: payload.hour || 0,
            phut_sinh: payload.minute || 0,
            loai_lich: (payload.isSolar || payload.is_solar) ? "duong_lich" : "am_lich",
            thang_nhuan: (payload.isLeapMonthInput || payload.is_leap_month_input) ? 1 : 0,
            nam_xem_han: payload.limitYear || payload.limit_year || 2026,
            input_data: payload,
            chart_data: chartData
        };



        const res = await fetch(apiUrl, {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                'Authorization': `Bearer ${token}`

            },

            body: JSON.stringify(bodyData)

        });



        if (res.ok) {

            const data = await res.json();

            if (data?.data?.chart_code) {
                chartData.idCode = data.data.chart_code;
                chartData.id_code = data.data.chart_code;

                const idEl = document.getElementById("tb-id-code");

                if (idEl) idEl.innerText = data.data.chart_code;

            }

            // Đánh dấu cập nhật lại danh sách lịch sử mà vẫn bảo toàn lựa chọn đang thao tác

            if (typeof loadUserChartHistory === 'function') {

                loadUserChartHistory({ force: true, preserveSelection: true });

            }

        }

    } catch (saveErr) {

        console.warn('[TuVi] Tự động lưu lá số vào tài khoản thất bại:', saveErr);

    }

}



window.autoSaveChartToUserAccount = autoSaveChartToUserAccount;

window.generateTuVi = generateTuVi;





