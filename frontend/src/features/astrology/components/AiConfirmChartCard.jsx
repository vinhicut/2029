// AiConfirmChartCard.jsx
import React from 'react';
import { Sparkles, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { normalizeChartData } from '../services/aiReadingClient';
import './AiConfirmChartCard.css';

/**
 * Thẻ Xác Nhận Thông Tin Đương Số Cố Định Cột Phải (Subject Confirmation Card)
 * Phiên bản thu gọn bề rộng, phóng to nổi bật, viền ánh sáng chạy liên tục, loại bỏ nút mũi tên xổ.
 * Dữ liệu được chuẩn hóa đa tầng, hiển thị năm xem & tuổi âm riêng biệt, số lượt khả dụng nổi bật.
 */
export default function AiConfirmChartCard({
  chartData,
  markdownAi,
  quota,
  onConfirm,
  onChangeInfo,
  onOpenAuth,
  onOpenPayment,
  isFadingOut = false,
  isSubmitting = false
}) {
  // Chuẩn hóa toàn diện thông tin đương số (phòng thủ đa tầng, chống mất dữ liệu khi F5)
  const norm = normalizeChartData(chartData, markdownAi);

  const hoTen = norm.ho_ten;
  const gioiTinh = norm.gioi_tinh;
  const isSolar = norm.is_solar;
  const isLeap = norm.is_leap;

  // Ngày tháng năm sinh & Giờ phút sinh
  const ngaySinh = norm.ngay_sinh;
  const thangSinh = norm.thang_sinh;
  const namSinh = norm.nam_sinh;
  const gioSinh = norm.gio_sinh;
  const phutSinh = norm.phut_sinh;
  const chiGio = norm.chi_gio;

  // Năm xem & Tuổi âm (tuổi mụ) hiển thị 2 cột rõ ràng theo Yêu cầu 2
  const namXemDisplay = norm.can_chi_nam_xem
    ? `${norm.nam_xem_han} (${norm.can_chi_nam_xem})`
    : `Năm ${norm.nam_xem_han}`;
  const tuoiAmDisplay = `${norm.tuoi_mu} tuổi âm`;

  // Hạn mức tài khoản
  const isLoggedIn = Boolean(quota?.logged_in);
  const isAdmin = Boolean(quota?.is_admin || quota?.unlimited);
  const userCredits = isAdmin ? 'vô hạn' : (quota?.credits !== undefined ? quota.credits : 0);

  return (
    <div className={`ai-confirm-card-container ${isFadingOut ? 'ai-card-fade-out' : ''}`}>
      {/* Tiêu đề thẻ xác nhận - Thiết kế nổi bật, thông thoáng */}
      <div className="ai-confirm-card-header">
        <div className="inline-flex items-center justify-center space-x-1.5 text-[#8b1d1d]">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <h2>XÁC NHẬN THÔNG TIN ĐƯƠNG SỐ</h2>
        </div>
        <p>Vui lòng kiểm tra thông tin</p>
      </div>

      {/* KHỐI THÔNG TIN TINH BÀN: Thiết kế dòng riêng biệt, bố cục thông thoáng */}
      <div className="tuvi-form-section">
        
        {/* Hàng 1: Họ tên */}
        <div className="tuvi-form-row">
          <label className="tuvi-form-label">Họ tên</label>
          <div className="tuvi-input-box" title={hoTen}>
            <span className="truncate">{hoTen}</span>
          </div>
        </div>

        {/* Hàng 2: Giới tính */}
        <div className="tuvi-form-row">
          <label className="tuvi-form-label">Giới tính</label>
          <div className="tuvi-segmented-control">
            <div className={`tuvi-segment-indicator ${gioiTinh === 'Nữ' ? 'pos-1' : 'pos-0'}`} />
            <div className={`tuvi-segment-btn ${gioiTinh === 'Nam' ? 'active' : ''}`}>
              <span>Nam</span>
            </div>
            <div className={`tuvi-segment-btn ${gioiTinh === 'Nữ' ? 'active' : ''}`}>
              <span>Nữ</span>
            </div>
          </div>
        </div>

        {/* Hàng 3: Lịch */}
        <div className="tuvi-form-row">
          <label className="tuvi-form-label">Lịch</label>
          <div className="tuvi-segmented-control">
            <div className={`tuvi-segment-indicator ${!isSolar ? 'pos-1' : 'pos-0'}`} />
            <div className={`tuvi-segment-btn ${isSolar ? 'active' : ''}`}>
              <span>Dương lịch</span>
            </div>
            <div className={`tuvi-segment-btn ${!isSolar ? 'active' : ''}`}>
              <span>Âm lịch{isLeap ? ' (Nhuận)' : ''}</span>
            </div>
          </div>
        </div>

        {/* Hàng 4: Ngày sinh */}
        <div className="tuvi-form-row">
          <label className="tuvi-form-label">Ngày sinh</label>
          <div className="tuvi-date-group">
            <div className="tuvi-select-box" title={`Ngày ${ngaySinh}`}>
              <span>{String(ngaySinh).padStart(2, '0')}</span>
            </div>
            <div className="tuvi-select-box" title={`Tháng ${thangSinh}`}>
              <span>{String(thangSinh).padStart(2, '0')}</span>
            </div>
            <div className="tuvi-select-box" title={`Năm ${namSinh}`}>
              <span>{namSinh}</span>
            </div>
          </div>
        </div>

        {/* Hàng 5: Giờ sinh */}
        <div className="tuvi-form-row">
          <label className="tuvi-form-label">Giờ sinh</label>
          <div className="tuvi-date-group">
            <div className="tuvi-select-box" title={`Giờ ${gioSinh}`}>
              <span>{String(gioSinh).padStart(2, '0')}</span>
            </div>
            <div className="tuvi-select-box" title={`Phút ${phutSinh}`}>
              <span>{String(phutSinh).padStart(2, '0')}</span>
            </div>
            {chiGio && (
              <div className="tuvi-badge-box" title={`Chi giờ ${chiGio}`}>
                <span>Giờ {chiGio}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hàng 6: Năm xem tái cấu trúc 2 cột rõ ràng (Cột 1: Năm, Cột 2: Tuổi) theo Yêu cầu 2 */}
        <div className="tuvi-form-row">
          <label className="tuvi-form-label">Năm xem</label>
          <div className="tuvi-year-group">
            {/* Cột 1: Hiển thị Năm (Year) */}
            <div className="tuvi-year-col" title={`Năm xem: ${namXemDisplay}`}>
              <span className="truncate">{namXemDisplay}</span>
            </div>
            {/* Cột 2: Hiển thị Tuổi (Age) */}
            <div className="tuvi-age-col" title={`Tuổi âm: ${tuoiAmDisplay}`}>
              <span className="truncate">{tuoiAmDisplay}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Cảnh báo trạng thái đăng nhập hoặc lượt sử dụng */}
      {!isLoggedIn ? (
        <div className="my-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="leading-tight">
            <span className="font-semibold">Chưa đăng nhập:</span> Vui lòng đăng nhập tài khoản Google để sử dụng lượt luận giải AI.
            <button
              type="button"
              onClick={onOpenAuth}
              className="ml-2 font-bold text-[#8b1d1d] hover:underline cursor-pointer"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      ) : (!isAdmin && quota?.credits <= 0) ? (
        <div className="my-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between">
          <div className="leading-tight">
            <span className="font-semibold">Hết lượt:</span> Tài khoản đã hết lượt luận giải AI khả dụng.
          </div>
          {onOpenPayment && (
            <button
              type="button"
              onClick={onOpenPayment}
              className="px-2.5 py-1 rounded bg-[#8b1d1d] text-white font-bold text-xs hover:bg-[#a12323] cursor-pointer ml-2 shrink-0"
            >
              Nạp lượt SePay
            </button>
          )}
        </div>
      ) : null}

      {/* Nút hành động & Cảnh báo số lượt sử dụng tách dòng độc lập theo Yêu cầu 2 */}
      <div className="mt-4 pt-2.5 border-t border-slate-100 flex flex-col space-y-2.5">
        <div className="flex items-center space-x-3">
          {/* Nút 1: Thay đổi thông tin */}
          <button
            type="button"
            onClick={onChangeInfo}
            disabled={isSubmitting}
            className="ai-card-btn-change flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Thay đổi thông tin</span>
          </button>

          {/* Nút 2: Xác nhận */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || (!isAdmin && isLoggedIn && quota?.credits <= 0)}
            className="ai-card-btn-confirm flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                <span>Đang khởi tạo AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                <span>Xác nhận</span>
              </>
            )}
          </button>
        </div>

        {/* Dòng lưu ý cảnh báo & Thông báo số lượt khả dụng tách dòng độc lập */}
        <div className="ai-quota-notice-box">
          <div className="ai-quota-action-note">
            Bấm xác nhận sẽ tiêu tốn 1 lượt luận giải lá số bằng AI
          </div>
          <div className="ai-quota-badge-line">
            <span className="ai-quota-badge-label">Số lượt khả dụng:</span>
            <span className="ai-quota-badge-value">
              {isAdmin ? (
                <span className="ai-badge-unlimited">vô hạn</span>
              ) : (
                <>
                  <strong className="ai-badge-credits">{userCredits}</strong> lượt
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
