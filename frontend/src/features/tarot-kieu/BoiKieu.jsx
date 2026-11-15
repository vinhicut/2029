import React, { useState, useEffect, useRef, useCallback } from 'react';
import './BoiKieu.css';

// 12 ô số cố định tương ứng 12 nan trên ảnh nón kỳ diệu
const WHEEL_NUMBERS = [1, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180, 210];
const SEGMENTS = WHEEL_NUMBERS.length;
const SEG_ANGLE = 360 / SEGMENTS; // 30 độ

// Danh sách 18 bộ quẻ theo từng việc mới nhất với tên và ghi chú vai trò chi tiết bên dưới
const QUESTION_DECKS = [
  // --- BÁT QUÁI (8 VIỆC) ---
  {
    id: 'can-tai-loc',
    group: 'Bát Quái',
    shortTitle: 'Niên vận (Càn)',
    title: 'Niên Vận (Quẻ Càn)',
    role: 'Vận hạn, cát hung trong năm',
    question: 'Vận hạn cát hung cả năm',
  },
  {
    id: 'kham-cong-danh',
    group: 'Bát Quái',
    shortTitle: 'Công danh (Khảm)',
    title: 'Công Danh (Quẻ Khảm)',
    role: 'Công danh sự nghiệp, đường thăng tiến',
    question: 'Công danh sự nghiệp thăng tiến',
  },
  {
    id: 'can-nien-van',
    group: 'Bát Quái',
    shortTitle: 'Tài lộc (Cấn)',
    title: 'Tài Lộc (Quẻ Cấn)',
    role: 'Tiền tài bổng lộc, tích lũy của cải',
    question: 'Tiền tài của cải dồi dào',
  },
  {
    id: 'chan-am-tin',
    group: 'Bát Quái',
    shortTitle: 'Âm tín (Chấn)',
    title: 'Âm Tín (Quẻ Chấn)',
    role: 'Tin tức người xa, hồi âm thư từ',
    question: 'Tin tức trông ngóng người xa',
  },
  {
    id: 'ton-tranh-tung',
    group: 'Bát Quái',
    shortTitle: 'Tranh tụng (Tốn)',
    title: 'Tranh Tụng (Quẻ Tốn)',
    role: 'Kiện tụng tranh chấp, hóa giải thị phi',
    question: 'Kiện tụng tranh chấp thị phi',
  },
  {
    id: 'ly-binh-an',
    group: 'Bát Quái',
    shortTitle: 'Bình an (Ly)',
    title: 'Bình An (Quẻ Ly)',
    role: 'Gia đạo bình an, sức khỏe quyến thuộc',
    question: 'Gia đạo sức khỏe bình an',
  },
  {
    id: 'khon-hon-nhan',
    group: 'Bát Quái',
    shortTitle: 'Hôn nhân (Khôn)',
    title: 'Hôn Nhân (Quẻ Khôn)',
    role: 'Nhân duyên tình cảm, hạnh phúc lứa đôi',
    question: 'Nhân duyên tình cảm lứa đôi',
  },
  {
    id: 'doai-thuong-mai',
    group: 'Bát Quái',
    shortTitle: 'Buôn bán (Đoài)',
    title: 'Buôn Bán (Quẻ Đoài)',
    role: 'Kinh doanh buôn bán, giao thương tài lợi',
    question: 'Kinh doanh buôn bán tài lợi',
  },

  // --- THẬP CAN (10 VIỆC) ---
  {
    id: 'giap-thien-di',
    group: 'Thập Can',
    shortTitle: 'Thiên di (Giáp)',
    title: 'Thiên Di (Quẻ Giáp)',
    role: 'Chuyển dời chỗ ở, thay đổi nơi làm việc',
    question: 'Chuyển dời nơi ở và nơi làm việc',
  },
  {
    id: 'at-tat-benh',
    group: 'Thập Can',
    shortTitle: 'Tật bệnh (Ất)',
    title: 'Tật Bệnh (Quẻ Ất)',
    role: 'Bệnh tật đau ốm, diễn biến thuyên giảm',
    question: 'Bệnh tật đau ốm thuyên giảm',
  },
  {
    id: 'binh-khoa-do',
    group: 'Thập Can',
    shortTitle: 'Khoa đỗ (Bính)',
    title: 'Khoa Đỗ (Quẻ Bính)',
    role: 'Thi cử học hành, khoa bảng đỗ đạt',
    question: 'Thi cử học hành đỗ đạt',
  },
  {
    id: 'dinh-tu-tuc',
    group: 'Thập Can',
    shortTitle: 'Tử tức (Đinh)',
    title: 'Tử Tức (Quẻ Đinh)',
    role: 'Đường con cái, sinh nở cầu tự bình an',
    question: 'Đường con cái sinh nở bình an',
  },
  {
    id: 'mau-xuat-hanh',
    group: 'Thập Can',
    shortTitle: 'Xuất hành (Mậu)',
    title: 'Xuất Hành (Quẻ Mậu)',
    role: 'Xuất hành đi xa, vạn dặm bình an',
    question: 'Xuất hành đi xa bình an thuận lợi',
  },
  {
    id: 'ky-truy-tim',
    group: 'Thập Can',
    shortTitle: 'Truy tìm (Kỷ)',
    title: 'Truy Tìm (Quẻ Kỷ)',
    role: 'Tìm kiếm đồ vật thất lạc, của cải đánh rơi',
    question: 'Tìm kiếm đồ vật thất lạc',
  },
  {
    id: 'canh-uu-tu',
    group: 'Thập Can',
    shortTitle: 'Ưu tư (Canh)',
    title: 'Ưu Tư (Quẻ Canh)',
    role: 'Nỗi niềm trăn trở, tháo gỡ điều âu lo',
    question: 'Nỗi niềm lo âu trăn trở',
  },
  {
    id: 'tan-tham-yet',
    group: 'Thập Can',
    shortTitle: 'Thám yết (Tân)',
    title: 'Thám Yết (Quẻ Tân)',
    role: 'Thăm viếng gặp gỡ, yết kiến người trên',
    question: 'Thăm hỏi yết kiến người trên',
  },
  {
    id: 'nham-ky-nghe',
    group: 'Thập Can',
    shortTitle: 'Kỹ nghệ (Nhâm)',
    title: 'Kỹ Nghệ (Quẻ Nhâm)',
    role: 'Học nghề mưu sinh, phát triển chuyên môn',
    question: 'Nghề nghiệp kỹ năng chuyên môn',
  },
  {
    id: 'quy-tam-su',
    group: 'Thập Can',
    shortTitle: 'Tâm sự (Quý)',
    title: 'Tâm Sự (Quẻ Quý)',
    role: 'Tâm sự thầm kín, nỗi niềm riêng tư',
    question: 'Tâm sự nỗi niềm riêng tư',
  },
];

/**
 * Trả về đường dẫn ảnh thẻ bài chính xác cho 210 quẻ gốc và 18 bộ quẻ con (mỗi bộ 15 quẻ)
 */
const getCardImgSrc = (num, deckId) => {
  if (!deckId || deckId === 'tat-ca') {
    const norm = ((num - 1) % 210) + 1;
    const padded = String(norm).padStart(3, '0');
    return `/tarot-kieu/cards/Que-${padded}.png`;
  }

  const norm = ((num - 1) % 15) + 1;
  const padded = String(norm).padStart(2, '0');

  if (deckId === 'giap-thien-di') {
    return `/tarot-kieu/cards-giap-thien-di/Que-${padded}.png`;
  }
  if (['can-tai-loc', 'kham-cong-danh', 'can-nien-van'].includes(deckId)) {
    return `/tarot-kieu/cards-can-kham-can/${deckId}/Que-${padded}.png`;
  }
  if (['ly-binh-an', 'khon-hon-nhan', 'doai-thuong-mai'].includes(deckId)) {
    return `/tarot-kieu/cards-ly-khon-doai/${deckId}/Que-${padded}.png`;
  }
  if (['at-tat-benh', 'binh-khoa-do', 'dinh-tu-tuc', 'mau-xuat-hanh'].includes(deckId)) {
    return `/tarot-kieu/cards-at-binh-dinh-mau/${deckId}/Que-${padded}.png`;
  }
  if (['ky-truy-tim', 'canh-uu-tu', 'tan-tham-yet', 'nham-ky-nghe', 'quy-tam-su'].includes(deckId)) {
    return `/tarot-kieu/cards-ky-canh-tan-nham-quy/${deckId}/Que-${padded}.png`;
  }
  if (deckId === 'chan-am-tin' || deckId === 'ton-tranh-tung') {
    return `/tarot-kieu/cards-chan-ton/${deckId}/Que-${padded}.png`;
  }

  const padded3 = String(((num - 1) % 210) + 1).padStart(3, '0');
  return `/tarot-kieu/cards/Que-${padded3}.png`;
};

function BoiKieu() {
  // Trạng thái bộ quẻ đang chọn (mặc định Quẻ Càn - Niên vận)
  const [selectedDeckId, setSelectedDeckId] = useState('can-tai-loc');

  // Trạng thái quay quẻ
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [resultText, setResultText] = useState('');
  const [mainQue, setMainQue] = useState(null);

  // Modal khấn nguyện tâm linh trước khi quay
  const [showPrayerModal, setShowPrayerModal] = useState(false);

  // Modal quẻ chi tiết
  const [modalQue, setModalQue] = useState(null);

  // Tự động ẩn header và thanh điều hướng website khi hiển thị modal xem quẻ kiều
  useEffect(() => {
    if (modalQue !== null) {
      document.body.classList.add('tarot-kieu-active');
    } else {
      document.body.classList.remove('tarot-kieu-active');
    }
    return () => {
      document.body.classList.remove('tarot-kieu-active');
    };
  }, [modalQue]);

  // Trạng thái mở/đóng danh sách xổ chọn việc xin quẻ
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cuộn danh sách quẻ
  const [displayedCount, setDisplayedCount] = useState(15);
  const sentinelRef = useRef(null);

  // Cuộn lên đầu trang khi vào
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Xử lý đóng dropdown khi bấm ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentDeckObj = QUESTION_DECKS.find((d) => d.id === selectedDeckId) || QUESTION_DECKS[0];
  const isAllMode = selectedDeckId === 'tat-ca';

  // Xử lý đổi bộ quẻ
  const handleSelectDeck = (deckId) => {
    setSelectedDeckId(deckId);
    setMainQue(null);
    setResultText('');
    setDisplayedCount(15);
  };

  // Mở modal bài khấn khi nhấn XIN QUẺ
  const handleStartSpinRequest = () => {
    if (isSpinning) return;
    setShowPrayerModal(true);
  };

  // Xác nhận khấn và bắt đầu quay bánh xe
  const handleConfirmPrayer = () => {
    setShowPrayerModal(false);
    executeSpin();
  };

  // Logic quay bánh xe và sinh số ngẫu nhiên
  const executeSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResultText('');

    let targetQue;
    let stopIndex;

    if (isAllMode) {
      // Chọn ngẫu nhiên 1 trong 12 nan trên nón
      stopIndex = Math.floor(Math.random() * SEGMENTS);
      targetQue = WHEEL_NUMBERS[stopIndex];
    } else {
      // Trong bộ 15 quẻ của chủ đề đã chọn: sinh số từ 1..15
      targetQue = Math.floor(Math.random() * 15) + 1;
      stopIndex = (targetQue - 1) % SEGMENTS;
    }

    // Tính góc quay chính xác để ô stopIndex dừng ngay dưới mũi tên
    const baseAngle = (360 - ((currentRotation % 360) + stopIndex * SEG_ANGLE) % 360) % 360;
    const extraSpins = (6 + Math.floor(Math.random() * 4)) * 360; // 6 đến 9 vòng quay
    const nextRotation = currentRotation + extraSpins + baseAngle;

    setCurrentRotation(nextRotation);

    // Sau khi kết thúc animation quay (4.8s)
    setTimeout(() => {
      setResultText(`Quẻ số ${targetQue}`);
      setMainQue(targetQue);
      setIsSpinning(false);
      setModalQue(targetQue); // Tự động mở modal xem quẻ chi tiết
    }, 4900);
  };

  // Infinite scroll observer: tự động tải thêm quẻ khi ở chế độ 210 quẻ
  const loadMoreCards = useCallback(() => {
    if (isAllMode) {
      setDisplayedCount((prev) => prev + 24);
    }
  }, [isAllMode]);

  useEffect(() => {
    if (!isAllMode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCards();
        }
      },
      { rootMargin: '300px' }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [isAllMode, loadMoreCards]);

  // Đóng modal & dropdown bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalQue(null);
        setShowPrayerModal(false);
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Danh sách các quẻ hiển thị
  const cardsList = isAllMode
    ? Array.from({ length: displayedCount }, (_, i) => (i % 210) + 1)
    : Array.from({ length: 15 }, (_, i) => i + 1);

  return (
    <div className="boikieu-page">
      {/* 1. KHỐI CHỌN VIỆC XIN QUẺ ĐẨY LÊN ĐẦU TRANG - DẠNG XỔ DANH SÁCH (DROPDOWN) CÓ GHI CHÚ VAI TRÒ */}
      <section className="boikieu-top-selector-card" ref={dropdownRef}>
        <div className="top-selector-header">
          <span className="top-selector-label">Chọn việc xin quẻ:</span>
        </div>

        {/* Nút trigger xổ danh sách: Tên & ghi chú vai trò (cùng dòng trên desktop) */}
        <div className="boikieu-dropdown-wrapper">
          <button
            type="button"
            className={`boikieu-dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <div className="dropdown-trigger-content">
              <span className="dropdown-trigger-title">{currentDeckObj?.title}</span>
              <span className="dropdown-trigger-sep">—</span>
              <span className="dropdown-trigger-role">{currentDeckObj?.role}</span>
            </div>
            <span className={`dropdown-trigger-chevron ${isDropdownOpen ? 'open' : ''}`}>▾</span>
          </button>

          {/* Danh sách xổ xuống: Phân nhóm Bát Quái & Thập Can, mỗi lựa chọn có Tên & Ghi chú vai trò */}
          {isDropdownOpen && (
            <div className="boikieu-dropdown-panel" role="listbox">
              {/* Khối 1: Bát Quái (8 việc) - Lưới 2 cột cân xứng (4 x 2) */}
              <div className="dropdown-section">
                <div className="dropdown-section-heading">Bát Quái (8 việc)</div>
                <div className="dropdown-section-grid">
                  {QUESTION_DECKS.slice(0, 8).map((d) => {
                    const isSelected = selectedDeckId === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        className={`dropdown-item-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          handleSelectDeck(d.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <span className="item-title">{d.title}</span>
                        <span className="item-sep">—</span>
                        <span className="item-role">{d.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Đường ngăn cách giữa 2 phân nhóm */}
              <div className="dropdown-section-divider" />

              {/* Khối 2: Thập Can (10 việc) - Lưới 2 cột cân xứng (5 x 2) */}
              <div className="dropdown-section">
                <div className="dropdown-section-heading">Thập Can (10 việc)</div>
                <div className="dropdown-section-grid">
                  {QUESTION_DECKS.slice(8).map((d) => {
                    const isSelected = selectedDeckId === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        className={`dropdown-item-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          handleSelectDeck(d.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <span className="item-title">{d.title}</span>
                        <span className="item-sep">—</span>
                        <span className="item-role">{d.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. KHU VỰC BÀN QUAY BÓI QUẺ - NỀN TRANH NGUYÊN BẢN */}
      <div className="boikieu-stage-container">
        {/* Vòng quay quẻ Bát Quái */}
        <div className="wheel-wrapper">
          <div className="pointer" />
          <div
            className="wheel"
            style={{
              transform: `rotate(${currentRotation}deg)`,
              transition: isSpinning
                ? 'transform 4.8s cubic-bezier(0.12, 0.75, 0.08, 1)'
                : 'none',
            }}
          >
            <img
              src="/tarot-kieu/wheel.png?v=3"
              alt="Bánh xe Tarot Kiều"
              className="wheel-image"
              draggable="false"
            />
          </div>
        </div>

        {/* Nút xin quẻ: hiệu ứng thở & viền gradient xoay 360 độ */}
        <div className="stage-controls">
          <button
            className="spin-btn"
            disabled={isSpinning}
            onClick={handleStartSpinRequest}
            aria-label="Xin quẻ"
          >
            <span className="spin-btn-inner">
              {isSpinning ? 'ĐANG QUAY...' : 'XIN QUẺ'}
            </span>
          </button>

          <div className="result-number">
            {resultText}
          </div>
        </div>
      </div>

      {/* 3. BẢNG LIỆT KÊ CÁC QUẺ KIỀU (Cuộn vô hạn hoặc 15 quẻ theo chủ đề) */}
      <section className="boikieu-cards-section">
        <div className="cards-section-header">
          <h2 className="cards-main-title">
            <span className="title-text-desktop">
              {isAllMode ? 'BẢNG LIỆT KÊ CÁC QUẺ KIỀU' : `BẢNG LIỆT KÊ: ${currentDeckObj?.title}`}
            </span>
            <span className="title-text-mobile">
              {isAllMode ? 'BẢNG QUẺ: 210 QUẺ KIỀU' : `BẢNG QUẺ: ${currentDeckObj?.title}`}
            </span>
          </h2>
          <div className="cards-sub-title">
            <span className="sub-text-desktop">
              {isAllMode
                ? 'Liệt kê theo thứ tự từ Quẻ 1 đến Quẻ 210'
                : currentDeckObj?.role}
            </span>
            <span className="sub-text-mobile">
              {isAllMode
                ? 'Thứ tự từ Quẻ 1 đến Quẻ 210'
                : currentDeckObj?.role}
            </span>
          </div>
          <div className="title-divider" />
        </div>

        <div className="cards-grid">
          {cardsList.map((num, index) => {
            const isMain = mainQue === num;
            return (
              <div
                key={`${selectedDeckId}-${num}-${index}`}
                className={`card ${isMain ? 'main-card' : ''}`}
                onClick={() => setModalQue(num)}
              >
                {/* Khung ảnh quẻ chuẩn tỉ lệ 9:16 FHD */}
                <div className="card-img-wrap">
                  <img
                    src={getCardImgSrc(num, selectedDeckId)}
                    alt={`Quẻ số ${num}`}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = isAllMode
                        ? `/tarot-kieu/cards/que${num}.jpg`
                        : `/tarot-kieu/cards/Que-${String(num).padStart(3, '0')}.png`;
                    }}
                  />
                </div>

                {/* Khối thông tin nền đỏ chủ đạo (primary red) */}
                <div className="card-caption">
                  <div className="card-number-label">QUẺ SỐ {num}</div>
                  <div className="card-footer-action">
                    {isMain ? (
                      <span className="badge-main">Quẻ chính</span>
                    ) : (
                      <span className="badge-sub">Quẻ phụ</span>
                    )}
                    <span className="hint-click">Bấm để xem</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Điểm kích hoạt cuộn vô hạn (chỉ dùng khi xem 210 quẻ) */}
        {isAllMode && (
          <div ref={sentinelRef} className="infinite-scroll-sentinel">
            <div className="sentinel-spinner">Đang tải thêm quẻ...</div>
          </div>
        )}
      </section>

      {/* 3. MODAL KHẤN XIN QUẺ TRANG NGHIÊM */}
      {showPrayerModal && (
        <div
          className="modal-overlay show"
          onClick={() => setShowPrayerModal(false)}
        >
          <div
            className="prayer-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              className="modal-close"
              onClick={() => setShowPrayerModal(false)}
              aria-label="Đóng"
            >
              ✕
            </button>
            <h3>Khấn Xin Quẻ</h3>
            <p className="prayer-salute">
              Nam Mô A-Di-Đà Phật!
            </p>
            <p className="prayer-body">
              Con xin cung thỉnh kính lạy Thi Thánh Nguyễn Du, xin Ngài mở lòng từ bi, khai tâm mở trí cho Con xin một Quẻ Kiều về việc{isAllMode ? ' gia sự, nhân duyên, tương lai' : ` ${currentDeckObj?.question}`}... Lạy Ngài!
            </p>
            <button
              type="button"
              className="prayer-confirm-btn"
              onClick={handleConfirmPrayer}
            >
              Thành tâm xin quẻ
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL XEM CHI TIẾT QUẺ FHD VỪA VẶN MÀN HÌNH */}
      {modalQue !== null && (
        <div
          className="modal-overlay show"
          onClick={() => setModalQue(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-img-wrap">
              <img
                src={getCardImgSrc(modalQue, selectedDeckId)}
                alt={`Quẻ số ${modalQue}`}
                className="modal-img"
              />
            </div>
            <div className="modal-info">
              <h3>
                Quẻ số {modalQue} {modalQue === mainQue ? '(Quẻ chính)' : ''}
              </h3>
              <p className="modal-subtitle">
                {isAllMode
                  ? 'Tranh Kiều & Lời Giải Quẻ Chi Tiết'
                  : `${currentDeckObj?.title} • ${currentDeckObj?.question}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoiKieu;
