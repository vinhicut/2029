/**
 * geometry.js
 * Tính toán tọa độ không gian: định vị huy hiệu Tuần/Triệt và hệ trục tương tác
 * Tam Hợp, Xung Chiếu, Nhị Hợp trên đồ hình ma trận Thiên Bàn.
 */

function getBoundaryPosition(c1, c2) {
    c1 = Number(c1);
    c2 = Number(c2);
    const pair = [c1, c2].sort((a, b) => a - b).join("-");
    const BOUNDARY_MAP = {
        "5-6": { top: "12.5%", left: "25%", orientation: "v", type: "divider-v" },
        "6-7": { top: "25%", left: "50%", orientation: "h", type: "tab-down" },
        "7-8": { top: "12.5%", left: "75%", orientation: "v", type: "divider-v" },
        "8-9": { top: "25%", left: "87.5%", orientation: "h", type: "divider-h" },
        "9-10": { top: "50%", left: "87.5%", orientation: "h", type: "divider-h" },
        "10-11": { top: "75%", left: "87.5%", orientation: "h", type: "divider-h" },
        "0-11": { top: "87.5%", left: "75%", orientation: "v", type: "divider-v" },
        "0-1": { top: "75%", left: "50%", orientation: "h", type: "tab-up" },
        "1-2": { top: "87.5%", left: "25%", orientation: "v", type: "divider-v" },
        "2-3": { top: "75%", left: "12.5%", orientation: "h", type: "divider-h" },
        "3-4": { top: "50%", left: "12.5%", orientation: "h", type: "divider-h" },
        "4-5": { top: "25%", left: "12.5%", orientation: "h", type: "divider-h" }
    };
    return BOUNDARY_MAP[pair] || { top: "50%", left: "50%", orientation: "h", type: "divider-h" };
}

function positionTuanTrietBadges(tuanCung, trietCung) {
    let tuan = document.getElementById("badgeTuan");
    let triet = document.getElementById("badgeTriet");
    const board = document.getElementById("tuviBoard");
    if (!board) return;

    if (!tuan) {
        tuan = document.createElement("div");
        tuan.id = "badgeTuan";
        tuan.className = "badge-tuan-triet badge-tuan";
        tuan.textContent = "Tuần";
        board.appendChild(tuan);
    } else if (tuan.parentElement !== board) {
        board.appendChild(tuan);
    }

    if (!triet) {
        triet = document.createElement("div");
        triet.id = "badgeTriet";
        triet.className = "badge-tuan-triet badge-triet";
        triet.textContent = "Triệt";
        board.appendChild(triet);
    } else if (triet.parentElement !== board) {
        board.appendChild(triet);
    }

    const hasTuan = Boolean(tuanCung && tuanCung.length >= 2 && tuanCung[0] !== undefined && tuanCung[0] !== null && tuanCung[1] !== undefined && tuanCung[1] !== null);
    const hasTriet = Boolean(trietCung && trietCung.length >= 2 && trietCung[0] !== undefined && trietCung[0] !== null && trietCung[1] !== undefined && trietCung[1] !== null);

    if (!hasTuan) {
        tuan.classList.add("is-hidden");
    } else {
        tuan.classList.remove("is-hidden");
    }

    if (!hasTriet) {
        triet.classList.add("is-hidden");
    } else {
        triet.classList.remove("is-hidden");
    }

    if (!hasTuan && !hasTriet) return;

    const pTuan = hasTuan ? getBoundaryPosition(tuanCung[0], tuanCung[1]) : null;
    const pTriet = hasTriet ? getBoundaryPosition(trietCung[0], trietCung[1]) : null;

    function applyBadgeStyle(el, pos) {
        if (!el || !pos) return;
        el.classList.remove("badge-tab-down", "badge-tab-up", "badge-divider-h", "badge-divider-v");
        if (pos.type === "tab-down") {
            el.classList.add("badge-tab-down");
        } else if (pos.type === "tab-up") {
            el.classList.add("badge-tab-up");
        } else if (pos.type === "divider-v") {
            el.classList.add("badge-divider-v");
        } else {
            el.classList.add("badge-divider-h");
        }
    }

    if (hasTuan) {
        applyBadgeStyle(tuan, pTuan);
    }
    if (hasTriet) {
        applyBadgeStyle(triet, pTriet);
    }

    const isCollision = Boolean(hasTuan && hasTriet && pTuan.top === pTriet.top && pTuan.left === pTriet.left);

    if (isCollision) {
        if (pTuan.orientation === "v") {
            tuan.style.top = `calc(${pTuan.top} - 11px)`;
            tuan.style.left = pTuan.left;
            triet.style.top = `calc(${pTuan.top} + 11px)`;
            triet.style.left = pTuan.left;
        } else {
            tuan.style.top = pTuan.top;
            tuan.style.left = `calc(${pTuan.left} - 23px)`;
            triet.style.top = pTuan.top;
            triet.style.left = `calc(${pTuan.left} + 23px)`;
        }
    } else {
        if (hasTuan) {
            tuan.style.top = pTuan.top;
            tuan.style.left = pTuan.left;
        }
        if (hasTriet) {
            triet.style.top = pTriet.top;
            triet.style.left = pTriet.left;
        }
    }
}

/**
 * Tính toán quan hệ mệnh lý giữa các cung trong Tử Vi Đẩu Số:
 * - Tam Hợp: (pos + 4) % 12 và (pos + 8) % 12
 * - Xung Chiếu: (pos + 6) % 12
 * - Nhị Hợp: (13 - pos) % 12 (Tý-Sửu, Dần-Hợi, Mão-Tuất, Thìn-Dậu, Tỵ-Thân, Ngọ-Mùi)
 */
function calculatePalaceRelationships(pos) {
    if (pos === undefined || pos === null || isNaN(pos)) return null;
    pos = Number(pos);
    const triad1 = (pos + 4) % 12;
    const triad2 = (pos + 8) % 12;
    const opposite = (pos + 6) % 12;
    const harmonic = (13 - pos) % 12;
    return {
        active: pos,
        triad: [triad1, triad2],
        opposite: opposite,
        harmonic: harmonic,
        allRelated: [pos, triad1, triad2, opposite, harmonic]
    };
}

/**
 * Tọa độ tiếp xúc của 12 cung lên khung viền Thiên Bàn (tỷ lệ 1000 x 1000)
 */
function getHouseContactPoint(pos) {
    // Tọa độ tiếp xúc chuẩn xác 100% trên hệ quy chiếu SVG viewBox="0 0 1000 1000" của Thiên Bàn
    // Tiếp giáp trực tiếp vào đúng tâm và các góc của 12 cung xung quanh
    const STATIC_COORDS = {
        0: { x: 750, y: 1000 },  // Cung Tý (mép đáy bên phải)
        1: { x: 250, y: 1000 },  // Cung Sửu (mép đáy bên trái)
        2: { x: 0,   y: 1000 },  // Cung Dần (góc trong dưới trái)
        3: { x: 0,   y: 750 },   // Cung Mão (mép trái bên dưới)
        4: { x: 0,   y: 250 },   // Cung Thìn (mép trái bên trên)
        5: { x: 0,   y: 0 },     // Cung Tỵ (góc trong trên trái)
        6: { x: 250, y: 0 },     // Cung Ngọ (mép đỉnh bên trái)
        7: { x: 750, y: 0 },     // Cung Mùi (mép đỉnh bên phải)
        8: { x: 1000, y: 0 },    // Cung Thân (góc trong trên phải)
        9: { x: 1000, y: 250 },  // Cung Dậu (mép phải bên trên)
        10: { x: 1000, y: 750 }, // Cung Tuất (mép phải bên dưới)
        11: { x: 1000, y: 1000 } // Cung Hợi (góc trong dưới phải)
    };
    return STATIC_COORDS[pos] || { x: 500, y: 500 };
}

/**
 * Kiểm tra 2 điểm tiếp xúc có nằm trên cùng 1 hàng ngoài (trên/dưới) hoặc 1 cột ngoài (trái/phải)
 * tức là cùng phía trên biên Thiên Bàn (không đối diện nhau qua trung cung).
 */
function isSameOuterEdge(p1, p2) {
    if (!p1 || !p2) return false;
    return (p1.y === 0 && p2.y === 0) ||
           (p1.y === 1000 && p2.y === 1000) ||
           (p1.x === 0 && p2.x === 0) ||
           (p1.x === 1000 && p2.x === 1000);
}

/**
 * Vẽ mạng lưới đường liên kết tương tác (Tam Hợp, Xung Chiếu, Nhị Hợp) trên Thiên Bàn
 * - activePos === null: Hiển thị tam giác nét đứt Mệnh-Tài-Quan gốc (Idle).
 * - activePos !== null: Hiển thị hệ trục khí chuyển của cung đang chọn.
 */
function renderPalaceRelationLines(activePos, menhPos) {
    const svg = document.getElementById("triangleMenhTaiQuan");
    const polyMenh = document.getElementById("polyMenhTaiQuan");
    if (!svg || !polyMenh) return;

    // Đảm bảo SVG luôn có overflow visible để không bị clip trên mobile Safari/WebKit
    svg.style.overflow = "visible";

    let group = document.getElementById("groupPalaceRelations");
    if (!group) {
        group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.id = "groupPalaceRelations";
        svg.appendChild(group);
    }

    // Xóa bỏ toàn bộ các chấm tròn đánh dấu điểm nối nếu còn tồn tại
    group.querySelectorAll(".rel-node-dot").forEach(el => el.remove());

    // 1. Trạng thái IDLE: Không khóa cung nào, vẽ tam giác Mệnh - Tài - Quan
    if (activePos === undefined || activePos === null || isNaN(activePos)) {
        polyMenh.style.display = "block";
        polyMenh.style.opacity = "1";
        group.style.display = "none";
        polyMenh.setAttribute("fill", "none");
        polyMenh.setAttribute("stroke", "rgba(28, 25, 23, 0.38)");
        polyMenh.setAttribute("stroke-width", "3.5");
        polyMenh.setAttribute("stroke-dasharray", "14 10");
        polyMenh.setAttribute("stroke-linejoin", "round");

        if (menhPos !== undefined && menhPos !== null && !isNaN(menhPos)) {
            const m = Number(menhPos);
            const q = (m + 4) % 12;
            const t = (m + 8) % 12;
            const pM = getHouseContactPoint(m);
            const pQ = getHouseContactPoint(q);
            const pT = getHouseContactPoint(t);
            polyMenh.setAttribute("points", `${pM.x.toFixed(1)},${pM.y.toFixed(1)} ${pQ.x.toFixed(1)},${pQ.y.toFixed(1)} ${pT.x.toFixed(1)},${pT.y.toFixed(1)}`);
        }
        return;
    }

    // 2. Trạng thái ACTIVE / HOVER: Khóa vào cung activePos
    polyMenh.style.display = "none";
    group.style.display = "block";

    const rel = calculatePalaceRelationships(activePos);
    if (!rel) return;

    const pAct = getHouseContactPoint(rel.active);
    const pTriad1 = getHouseContactPoint(rel.triad[0]);
    const pTriad2 = getHouseContactPoint(rel.triad[1]);
    const pOpp = getHouseContactPoint(rel.opposite);
    const pHarm = getHouseContactPoint(rel.harmonic);

    // 2.1. Tái sử dụng Polygon Tam Hợp
    let polyTriad = document.getElementById("relLineTriad");
    if (!polyTriad) {
        polyTriad = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polyTriad.id = "relLineTriad";
        polyTriad.setAttribute("class", "rel-line-triad");
        polyTriad.setAttribute("fill", "rgba(5, 150, 105, 0.04)");
        polyTriad.setAttribute("stroke", "#059669");
        polyTriad.setAttribute("stroke-width", "5.5");
        polyTriad.setAttribute("stroke-dasharray", "18 10");
        polyTriad.setAttribute("stroke-linejoin", "round");
        polyTriad.setAttribute("stroke-linecap", "round");
        group.appendChild(polyTriad);
    }
    polyTriad.setAttribute("points", `${pAct.x.toFixed(1)},${pAct.y.toFixed(1)} ${pTriad1.x.toFixed(1)},${pTriad1.y.toFixed(1)} ${pTriad2.x.toFixed(1)},${pTriad2.y.toFixed(1)}`);

    // 2.2. Tái sử dụng Line Xung Chiếu (ẩn nếu nằm cùng hàng/cột không đối diện)
    let lineOpp = document.getElementById("relLineOpp");
    if (!lineOpp) {
        lineOpp = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineOpp.id = "relLineOpp";
        lineOpp.setAttribute("class", "rel-line-opposite");
        lineOpp.setAttribute("fill", "none");
        lineOpp.setAttribute("stroke", "#dc2626");
        lineOpp.setAttribute("stroke-width", "5.5");
        lineOpp.setAttribute("stroke-dasharray", "18 10");
        lineOpp.setAttribute("stroke-linejoin", "round");
        lineOpp.setAttribute("stroke-linecap", "round");
        group.appendChild(lineOpp);
    }
    if (isSameOuterEdge(pAct, pOpp)) {
        lineOpp.style.display = "none";
    } else {
        lineOpp.style.display = "";
        lineOpp.setAttribute("x1", pAct.x.toFixed(1));
        lineOpp.setAttribute("y1", pAct.y.toFixed(1));
        lineOpp.setAttribute("x2", pOpp.x.toFixed(1));
        lineOpp.setAttribute("y2", pOpp.y.toFixed(1));
    }

    // 2.3. Tái sử dụng Line Nhị Hợp (ẩn nếu nằm cùng hàng/cột không đối diện)
    let lineHarm = document.getElementById("relLineHarm");
    if (!lineHarm) {
        lineHarm = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineHarm.id = "relLineHarm";
        lineHarm.setAttribute("class", "rel-line-harmonic");
        lineHarm.setAttribute("fill", "none");
        lineHarm.setAttribute("stroke", "#7c3aed");
        lineHarm.setAttribute("stroke-width", "5.0");
        lineHarm.setAttribute("stroke-dasharray", "14 9");
        lineHarm.setAttribute("stroke-linejoin", "round");
        lineHarm.setAttribute("stroke-linecap", "round");
        group.appendChild(lineHarm);
    }
    if (isSameOuterEdge(pAct, pHarm)) {
        lineHarm.style.display = "none";
    } else {
        lineHarm.style.display = "";
        lineHarm.setAttribute("x1", pAct.x.toFixed(1));
        lineHarm.setAttribute("y1", pAct.y.toFixed(1));
        lineHarm.setAttribute("x2", pHarm.x.toFixed(1));
        lineHarm.setAttribute("y2", pHarm.y.toFixed(1));
    }
}

function updateMenhTaiQuanTriangle(menhPos) {
    renderPalaceRelationLines(window.activePalacePos !== undefined ? window.activePalacePos : null, menhPos);
}

window.getBoundaryPosition = getBoundaryPosition;
window.positionTuanTrietBadges = positionTuanTrietBadges;
window.calculatePalaceRelationships = calculatePalaceRelationships;
window.getHouseContactPoint = getHouseContactPoint;
window.renderPalaceRelationLines = renderPalaceRelationLines;
window.updateMenhTaiQuanTriangle = updateMenhTaiQuanTriangle;
