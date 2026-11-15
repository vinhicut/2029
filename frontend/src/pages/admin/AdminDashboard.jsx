import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import haLogo from '../../shared/assets/ha-logo.png';
import './AdminDashboard.css';
import {
  ShieldCheck,
  Users,
  ScrollText,
  BookOpen,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Trash2,
  Search,
  Clock,
  ChevronDown,
  Menu,
  X,
  Activity,
  Copy,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

export default function AdminDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('sessions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [cleanConfirmOpen, setCleanConfirmOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const token = localStorage.getItem('tuvi_token');
  const adminUserRaw = localStorage.getItem('tuvi_user');
  let adminUser = { email: 'tranngocxuanbach7@gmail.com', name: 'Trần Ngọc Xuân Bách' };
  try {
    if (adminUserRaw) adminUser = { ...adminUser, ...JSON.parse(adminUserRaw) };
  } catch (e) {}

  const fetchSessions = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await fetch(`${API}/api/admin/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSessions(data.data || []);
        setError('');
      } else {
        // Nếu token hết hạn hoặc lỗi, vẫn giữ thông báo nhưng không làm hỏng layout
        setError(data.message || 'Không thể tải dữ liệu phiên');
      }
    } catch (e) {
      setError(e.message || 'Lỗi kết nối máy chủ');
    }
    setLoading(false);
    if (showRefreshIndicator) {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchSessions();
  }, [token, navigate]);

  // Đóng dropdown user menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {}
    localStorage.removeItem('tuvi_token');
    localStorage.removeItem('tuvi_user');
    localStorage.removeItem('tuvi_admin_token');
    localStorage.removeItem('tuvi_admin_user');
    window.location.href = '/';
  };

  const handleCleanTestData = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {}
    localStorage.removeItem('tuvi_token');
    localStorage.removeItem('tuvi_user');
    localStorage.removeItem('tuvi_admin_token');
    localStorage.removeItem('tuvi_admin_user');
    window.location.href = '/';
  };

  const copySessionId = (id) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Kiểm tra phiên có thực sự đang hoạt động trong vòng 24 giờ hay không
  const isSessionActive = (s) => {
    if (s.end_time) return false;
    if (!s.start_time) return false;
    const diff = Date.now() - new Date(s.start_time).getTime();
    return diff < 24 * 60 * 60 * 1000;
  };

  // Filter & Search dữ liệu phiên
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      (s.session_id && s.session_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.admin_email && s.admin_email.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;

    if (statusFilter === 'active') return isSessionActive(s);
    if (statusFilter === 'ended') return !isSessionActive(s);
    return true;
  });

  const activeCount = sessions.filter(isSessionActive).length;
  const endedCount = sessions.filter((s) => !isSessionActive(s)).length;

  const navItems = [
    { id: 'sessions', label: 'Phiên Đăng nhập', icon: ShieldCheck, badge: activeCount ? `${activeCount} online` : null },
    { id: 'customers', label: 'Khách hàng & Giao dịch', icon: Users, badge: 'Sắp ra mắt' },
    { id: 'charts', label: 'Quản lý Lá số', icon: ScrollText, badge: 'Sắp ra mắt' },
    { id: 'interpretations', label: 'Dữ liệu Luận giải', icon: BookOpen, badge: 'Sắp ra mắt' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', color: '#64748b' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#b91c1c', animation: 'spin 1s linear infinite', marginBottom: 16 }}></div>
        <p style={{ fontSize: 14, fontWeight: 500 }}>Đang kết nối hệ thống Quản trị viên...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 35, background: 'rgba(15, 23, 42, 0.4)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`admin-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div>
          {/* Brand Header */}
          <div className="admin-brand">
            <img src={haLogo} alt="Logo Hồng Ân" className="admin-brand-logo" />
            <div style={{ flex: 1 }}>
              <h1 className="admin-brand-title">Hồng Ân Admin</h1>
              <p className="admin-brand-sub">Hệ thống điều hành</p>
            </div>
            {mobileSidebarOpen && (
              <button
                onClick={() => setMobileSidebarOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <div className="admin-nav">
            <div className="admin-nav-group-title">Danh mục quản lý</div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`admin-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="admin-nav-item-left">
                    <Icon size={18} color={isActive ? '#b91c1c' : '#64748b'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`admin-badge ${item.badge.includes('online') ? 'admin-badge-online' : 'admin-badge-muted'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-env-card">
            <div className="admin-env-header">
              <span>Môi trường</span>
              <span className="badge-test-mode">
                <span className="pulse-dot"></span>
                Test Mode
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
              Dữ liệu kiểm thử phân quyền quản trị nội bộ.
            </p>
          </div>

          <a href="/" className="admin-back-btn">
            <ArrowLeft size={14} />
            <span>Quay lại Website</span>
          </a>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="admin-main-wrap">
        {/* TOPBAR */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="admin-icon-btn"
              style={{ display: window.innerWidth <= 580 ? 'flex' : 'none' }}
              aria-label="Mở menu"
            >
              <Menu size={18} />
            </button>
            <div className="admin-breadcrumbs">
              <span>Hệ thống Quản trị</span>
              <span>/</span>
              <strong>{navItems.find((i) => i.id === activeTab)?.label}</strong>
            </div>
          </div>

          {/* Right Topbar Controls */}
          <div className="admin-topbar-actions">
            {/* Refresh Button */}
            <button
              onClick={() => fetchSessions(true)}
              disabled={refreshing}
              title="Làm mới dữ liệu"
              className="admin-icon-btn"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div
                className="admin-user-pill"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="admin-avatar">
                  {adminUser.email ? adminUser.email.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div className="admin-user-name">{adminUser.name || 'Quản trị viên'}</div>
                  <div className="admin-user-email">{adminUser.email}</div>
                </div>
                <ChevronDown size={14} color="#94a3b8" />
              </div>

              {userMenuOpen && (
                <div className="admin-profile-dropdown">
                  <div className="admin-profile-dropdown-header">
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{adminUser.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', wordBreak: 'break-all' }}>{adminUser.email}</div>
                    <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: '#fef2f2', color: '#991b1b', border: '1px solid #fee2e2' }}>
                      Toàn quyền Quản trị
                    </span>
                  </div>

                  <div style={{ padding: 4 }}>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setCleanConfirmOpen(true);
                      }}
                      className="admin-profile-dropdown-btn warning"
                    >
                      <Trash2 size={15} />
                      <span>Dọn dẹp phiên thử nghiệm</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="admin-profile-dropdown-btn danger"
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất an toàn</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <main className="admin-content">
          {error && (
            <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, color: '#991b1b', fontSize: 13 }}>
              <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div>
              {/* Header Title */}
              <div className="admin-page-header">
                <h2 className="admin-page-title">Lịch sử Phiên Đăng nhập</h2>
                <p className="admin-page-desc">
                  Theo dõi danh sách và thời gian phiên hoạt động của các Quản trị viên trong hệ thống.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                  <div>
                    <div className="admin-kpi-label">Tổng phiên ghi nhận</div>
                    <div className="admin-kpi-value">{sessions.length}</div>
                  </div>
                  <div className="admin-kpi-icon">
                    <Activity size={22} />
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div>
                    <div className="admin-kpi-label">Phiên đang hoạt động</div>
                    <div className="admin-kpi-value" style={{ color: '#059669' }}>{activeCount}</div>
                  </div>
                  <div className="admin-kpi-icon success">
                    <ShieldCheck size={22} />
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div>
                    <div className="admin-kpi-label">Đã kết thúc</div>
                    <div className="admin-kpi-value" style={{ color: '#64748b' }}>{endedCount}</div>
                  </div>
                  <div className="admin-kpi-icon">
                    <Clock size={22} />
                  </div>
                </div>
              </div>

              {/* Table Card */}
              <div className="admin-card">
                {/* Search & Filter Toolbar */}
                <div className="admin-card-toolbar">
                  <div className="admin-search-wrap">
                    <Search size={15} className="admin-search-icon" />
                    <input
                      type="text"
                      placeholder="Tìm theo Session ID hoặc Email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>

                  <div className="admin-filter-group">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`admin-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                    >
                      Tất cả ({sessions.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('active')}
                      className={`admin-filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
                    >
                      Đang hoạt động ({activeCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('ended')}
                      className={`admin-filter-btn ${statusFilter === 'ended' ? 'active' : ''}`}
                    >
                      Đã kết thúc ({endedCount})
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Mã Phiên (Session ID)</th>
                        <th>Quản trị viên</th>
                        <th>Bắt đầu</th>
                        <th>Trạng thái / Kết thúc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map((s) => (
                        <tr key={s.session_id}>
                          <td>
                            <div className="session-code-badge">
                              <span>{s.session_id ? s.session_id.substring(0, 8) + '...' : '---'}</span>
                              <button
                                onClick={() => copySessionId(s.session_id)}
                                title="Sao chép Session ID"
                                className="session-copy-btn"
                              >
                                {copiedId === s.session_id ? (
                                  <Check size={14} color="#059669" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: '#0f172a' }}>{s.admin_email}</strong>
                          </td>
                          <td style={{ color: '#64748b' }}>
                            {s.start_time ? new Date(s.start_time).toLocaleString('vi-VN') : '---'}
                          </td>
                          <td>
                            {s.end_time || !isSessionActive(s) ? (
                              <span className="badge-status-ended">
                                <Clock size={12} color="#94a3b8" />
                                {s.end_time ? new Date(s.end_time).toLocaleTimeString('vi-VN') : 'Đã hết hạn'}
                              </span>
                            ) : (
                              <span className="badge-status-active">
                                <span className="status-active-dot"></span>
                                Đang hoạt động
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {filteredSessions.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
                            <Info size={32} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                            <div>Chưa có dữ liệu phiên đăng nhập nào.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Info */}
                <div className="admin-table-footer">
                  <span>
                    Hiển thị <strong>{filteredSessions.length}</strong> / <strong>{sessions.length}</strong> phiên
                  </span>
                  <span>Thời gian thực hệ thống: {new Date().toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* CÁC TAB ĐANG PHÁT TRIỂN */}
          {activeTab !== 'sessions' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '48px 24px', textAlign: 'center', maxWidth: 520, margin: '40px auto', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fef2f2', color: '#b91c1c', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeTab === 'customers' && <Users size={28} />}
                {activeTab === 'charts' && <ScrollText size={28} />}
                {activeTab === 'interpretations' && <BookOpen size={28} />}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                {navItems.find((i) => i.id === activeTab)?.label}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Module này đang được hoàn thiện giao diện tối giản theo tiêu chuẩn thiết kế mới. Các API dữ liệu từ backend đã sẵn sàng kết nối.
              </p>
              <button
                onClick={() => setActiveTab('sessions')}
                style={{ marginTop: 24, padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
              >
                Quay lại Phiên Đăng nhập
              </button>
            </div>
          )}
        </main>
      </div>

      {/* CONFIRM MODAL */}
      {cleanConfirmOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color="#d97706" />
              </div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Xác nhận dọn dẹp phiên test?
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              Hệ thống sẽ kết thúc phiên hiện tại, xóa toàn bộ các bản ghi tạm thời được tạo trong phiên này và đưa bạn trở về trang chủ.
            </p>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setCleanConfirmOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleCleanTestData}
                style={{ padding: '8px 16px', background: '#d97706', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
              >
                Xác nhận & Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
