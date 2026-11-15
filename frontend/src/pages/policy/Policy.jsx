import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Scale, Download, Trash2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LEGAL_ENTITY_INFO } from '../../shared/constants/legalInfo';
import './Policy.css';

const API = import.meta.env.VITE_API_URL || '';

function Policy({ defaultTab = 'privacy' }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isLoggedIn = Boolean(
    typeof window !== 'undefined' &&
      (localStorage.getItem('tuvi_token') || localStorage.getItem('tuvi_user'))
  );

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setFeedback({ type: '', text: '' });
    navigate(tab === 'terms' ? '/dieu-khoan' : '/chinh-sach', { replace: true });
  };

  const handleExportData = async () => {
    const token = localStorage.getItem('tuvi_token');
    setBusy(true);
    setFeedback({ type: '', text: '' });
    try {
      const res = await fetch(`${API}/api/auth/my-data/export`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Vui lòng đăng nhập để tải dữ liệu cá nhân.');
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tuvi-hong-an-du-lieu-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', text: 'Đã tải xuống toàn bộ bản sao dữ liệu cá nhân dưới dạng JSON.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Không thể tải xuống dữ liệu cá nhân.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    const token = localStorage.getItem('tuvi_token');
    setBusy(true);
    setFeedback({ type: '', text: '' });
    try {
      const res = await fetch(`${API}/api/auth/my-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể xóa tài khoản.');
      }
      localStorage.removeItem('tuvi_token');
      localStorage.removeItem('tuvi_user');
      window.dispatchEvent(new Event('tuvi-auth-updated'));
      setConfirmDelete(false);
      setFeedback({ type: 'success', text: data.message || 'Tài khoản và dữ liệu cá nhân đã được xóa vĩnh viễn.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Có lỗi xảy ra khi xóa tài khoản.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="policy-page">
      <div className="policy-container">
        <div className="policy-header-card">
          <button type="button" className="policy-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang chủ</span>
          </button>

          <h1 className="policy-main-title">Hồ Sơ Pháp Lý &amp; Bảo Vệ Dữ Liệu Cá Nhân</h1>
          <p className="policy-subtitle">
            Cập nhật lần cuối: {LEGAL_ENTITY_INFO.effectiveDate} • Áp dụng cho website{' '}
            <strong>tuvihongan.com</strong> theo Nghị định 13/2023/NĐ-CP và Nghị định 52/2013/NĐ-CP
            (sửa đổi bởi Nghị định 85/2021/NĐ-CP).
          </p>

          <div className="policy-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'privacy'}
              className={`policy-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => switchTab('privacy')}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Chính sách Bảo vệ Dữ liệu Cá nhân</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'terms'}
              className={`policy-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
              onClick={() => switchTab('terms')}
            >
              <Scale className="w-4 h-4" />
              <span>Điều khoản Sử dụng &amp; Chính sách Thương mại</span>
            </button>
          </div>
        </div>

        <div className="policy-content-card">
          {activeTab === 'privacy' ? (
            <article className="policy-article">
              <h2>Chính Sách Bảo Vệ Dữ Liệu Cá Nhân (Nghị Định 13/2023/NĐ-CP)</h2>

              <section>
                <h3>1. Bên Kiểm Soát &amp; Xử Lý Dữ Liệu Cá Nhân</h3>
                <p>{LEGAL_ENTITY_INFO.operatorName}</p>
                <ul>
                  <li>{LEGAL_ENTITY_INFO.taxIdPlaceholder}</li>
                  <li>{LEGAL_ENTITY_INFO.address}</li>
                  <li>Email đầu mối Bảo vệ Dữ liệu Cá nhân (DPO): {LEGAL_ENTITY_INFO.dpoEmail}</li>
                  <li>Hotline hỗ trợ: 0941.300.629 — 0899.483.393</li>
                </ul>
              </section>

              <section>
                <h3>2. Loại Dữ Liệu Cá Nhân Được Thu Thập</h3>
                <ul>
                  <li>
                    <strong>Dữ liệu định danh tài khoản:</strong> Họ tên, địa chỉ thư điện tử (email),
                    ảnh đại diện nhận từ Google Sign-In khi bạn đồng ý đăng nhập.
                  </li>
                  <li>
                    <strong>Dữ liệu phục vụ lập lá số Tử Vi:</strong> Họ tên đương số, ngày/tháng/năm sinh
                    (Dương lịch hoặc Âm lịch), giờ sinh, giới tính và năm xem hạn bạn chủ động nhập.
                  </li>
                  <li>
                    <strong>Dữ liệu giao dịch &amp; hỗ trợ khách hàng:</strong> Mã đơn hàng (ví dụ
                    <code>TVHA...</code>), gói dịch vụ đã mua, trạng thái thanh toán (không lưu thông tin
                    thẻ ngân hàng), và nội dung trao đổi tư vấn hoặc gửi qua biểu mẫu liên hệ.
                  </li>
                  <li>
                    <strong>Dữ liệu kỹ thuật phiên truy cập:</strong> Cookie xác thực phiên (<code>HttpOnly</code>),
                    thời gian hoạt động gần nhất và nhật ký bảo mật chống tấn công tự động.
                  </li>
                </ul>
              </section>

              <section>
                <h3>3. Mục Đích &amp; Thời Hạn Xử Lý Dữ Liệu</h3>
                <p>
                  Dữ liệu được xử lý nhằm cung cấp tính năng an sao lá số Tử Vi, luận giải tự động/AI theo
                  yêu cầu của bạn, xác nhận đơn hàng thanh toán qua mã QR ngân hàng, và bảo vệ an toàn hệ thống.
                  Chúng tôi không bán hoặc chia sẻ dữ liệu cá nhân cho bên thứ ba phục vụ quảng cáo thương mại.
                </p>
                <p>
                  Dữ liệu tài khoản và lá số được lưu trữ trong suốt thời gian tài khoản còn hoạt động hoặc
                  cho đến khi bạn thực hiện yêu cầu xóa tài khoản trực tiếp trên hệ thống. Các chứng từ đơn
                  hàng phát sinh nghĩa vụ tài chính được lưu tối thiểu theo quy định pháp luật về kế toán.
                </p>
              </section>

              <section>
                <h3>4. Quyền Của Chủ Thể Dữ Liệu (11 Quyền Theo NĐ 13/2023/NĐ-CP)</h3>
                <p>
                  Bạn có đầy đủ quyền được biết, quyền đồng ý/rút lại sự đồng ý, quyền truy cập, chỉnh sửa,
                  yêu cầu cung cấp bản sao dữ liệu, yêu cầu xóa dữ liệu, hạn chế xử lý, phản đối xử lý và
                  khiếu nại theo quy định của Nghị định 13/2023/NĐ-CP.
                </p>

                <div className="policy-selfservice-box">
                  <h4>Công Cụ Tự Thực Hiện Quyền Dữ Liệu Cá Nhân</h4>
                  <p>
                    Người dùng đã đăng nhập có thể chủ động tải xuống toàn bộ dữ liệu cá nhân (định dạng JSON)
                    hoặc xóa vĩnh viễn tài khoản ngay dưới đây:
                  </p>

                  {!isLoggedIn && (
                    <p className="policy-login-hint">
                      Bạn chưa đăng nhập. Vui lòng đăng nhập tài khoản để kích hoạt chức năng tải dữ liệu
                      hoặc xóa tài khoản tự động, hoặc gửi yêu cầu qua email {LEGAL_ENTITY_INFO.dpoEmail}.
                    </p>
                  )}

                  <div className="policy-selfservice-actions">
                    <button
                      type="button"
                      className="policy-btn-export"
                      onClick={handleExportData}
                      disabled={busy || !isLoggedIn}
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải bản sao dữ liệu cá nhân</span>
                    </button>
                    <button
                      type="button"
                      className="policy-btn-delete"
                      onClick={() => setConfirmDelete((prev) => !prev)}
                      disabled={busy || !isLoggedIn}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Yêu cầu xóa tài khoản &amp; dữ liệu</span>
                    </button>
                  </div>

                  {confirmDelete && (
                    <div className="policy-delete-confirm">
                      <p>
                        <strong>Xác nhận xóa vĩnh viễn:</strong> Hành động này sẽ xóa toàn bộ hồ sơ tài khoản,
                        phiên đăng nhập, danh sách lá số đã lưu và lịch sử hỏi đáp AI. Không thể hoàn tác.
                      </p>
                      <div className="policy-delete-confirm-btns">
                        <button
                          type="button"
                          className="policy-btn-cancel"
                          onClick={() => setConfirmDelete(false)}
                          disabled={busy}
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          className="policy-btn-confirm-danger"
                          onClick={handleDeleteAccount}
                          disabled={busy}
                        >
                          {busy ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
                        </button>
                      </div>
                    </div>
                  )}

                  {feedback.text && (
                    <div className={`policy-feedback ${feedback.type}`}>
                      {feedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{feedback.text}</span>
                    </div>
                  )}
                </div>
              </section>
            </article>
          ) : (
            <article className="policy-article">
              <h2>Điều Khoản Sử Dụng &amp; Chính Sách Thương Mại Điện Tử</h2>

              <section>
                <h3>1. Thông Tin Chủ Sở Hữu Website</h3>
                <p>{LEGAL_ENTITY_INFO.operatorName}</p>
                <ul>
                  <li>{LEGAL_ENTITY_INFO.taxIdPlaceholder}</li>
                  <li>{LEGAL_ENTITY_INFO.address}</li>
                  <li>Email liên hệ: {LEGAL_ENTITY_INFO.email}</li>
                  <li>Hotline Zalo tư vấn: 0941.300.629 — 0899.483.393</li>
                </ul>
              </section>

              <section>
                <h3>2. Phạm Vi Dịch Vụ &amp; Miễn Trừ Học Thuật</h3>
                <p>
                  Website <strong>Tử Vi Hồng Ân</strong> cung cấp công cụ an sao Tử Vi Đẩu Số, tra cứu
                  Lịch Vạn Sự, Phong Thủy Bát Quái, Kỳ Môn Độn Giáp, dịch vụ Luận Giải AI tự động,
                  Luận Giải Trực Tiếp 1-1 và các khóa học nghiên cứu học thuật Đông phương.
                </p>
                <p>
                  Các nội dung luận giải mang tính chất tham khảo văn hóa — học thuật và chiêm nghiệm định
                  hướng cá nhân; không thay thế cho tư vấn y tế, pháp lý hoặc đầu tư tài chính chuyên môn.
                </p>
              </section>

              <section>
                <h3>3. Chính Sách Thanh Toán &amp; Giao Nhận Dịch Vụ Số</h3>
                <ul>
                  <li>
                    <strong>Phương thức thanh toán:</strong> Chuyển khoản ngân hàng qua mã QR định danh đơn
                    hàng (MB Bank — Ngân hàng Quân đội) do hệ thống tạo tự động theo đúng mức giá niêm yết.
                  </li>
                  <li>
                    <strong>Thời gian kích hoạt / giao nhận:</strong> Đối với gói Luận Giải AI, lượt sử dụng
                    được cộng tự động vào tài khoản ngay sau khi hệ thống nhận được xác nhận chuyển khoản
                    thành công (thường trong vòng 10–60 giây). Đối với dịch vụ Luận Giải Trực Tiếp 1-1 hoặc
                    Khóa Học, chuyên viên sẽ liên hệ xác nhận lịch hẹn trong vòng 24 giờ làm việc.
                  </li>
                </ul>
              </section>

              <section>
                <h3>4. Chính Sách Đổi Trả, Hủy Đơn &amp; Hoàn Tiền</h3>
                <ul>
                  <li>
                    Khách hàng được hoàn tiền 100% trong các trường hợp: (a) thanh toán trùng lặp hoặc chuyển
                    sai số tiền do lỗi hiển thị kỹ thuật của hệ thống; (b) dịch vụ Luận Giải 1-1 hoặc Khóa
                    Học chưa được triển khai và khách hàng gửi yêu cầu hủy trước thời điểm hẹn tối thiểu 24 giờ.
                  </li>
                  <li>
                    Đối với dịch vụ kỹ thuật số (lượt Luận Giải AI) đã được kích hoạt và sử dụng một phần,
                    chúng tôi hỗ trợ hoàn phần giá trị chưa sử dụng nếu phát sinh lỗi hệ thống không khắc phục
                    được sau khi kiểm tra kỹ thuật.
                  </li>
                  <li>
                    Mọi yêu cầu tra soát hoặc hoàn tiền được tiếp nhận qua email{' '}
                    <strong>{LEGAL_ENTITY_INFO.email}</strong> hoặc hotline <strong>0941.300.629</strong>{' '}
                    và giải quyết trong tối đa 03 ngày làm việc.
                  </li>
                </ul>
              </section>

              <section>
                <h3>5. Quyền Sở Hữu Trí Tuệ &amp; Giải Quyết Tranh Chấp</h3>
                <p>
                  Mọi mã nguồn an sao, tài liệu phú giải, thiết kế đồ họa và bài giảng thuộc bản quyền của{' '}
                  {LEGAL_ENTITY_INFO.brandName}. Nghiêm cấm hành vi sao chép hàng loạt, khai thác dữ liệu trái
                  phép hoặc giả mạo thương hiệu. Mọi tranh chấp phát sinh được ưu tiên giải quyết bằng thương
                  lượng hòa giải; trường hợp không đạt thỏa thuận sẽ giải quyết theo pháp luật Việt Nam.
                </p>
              </section>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

export default Policy;
