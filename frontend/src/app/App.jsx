import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';

import Navbar from '../shared/ui/Navbar';
import Footer from '../shared/ui/Footer';
import Home from '../pages/home/Home';
import LaSoTuVi from '../features/astrology/LaSoTuVi';
import CategoryPage from '../features/bai-viet/CategoryPage';
import BoiKieu from '../features/tarot-kieu/BoiKieu';
import LichVanSu from '../features/lich-van-su/LichVanSu';
import KhamThienTuViThienTuong from '../features/bai-viet/KhamThienTuViThienTuong';
import QuickInsights from '../shared/ui/QuickInsights';
import UnderDevelopment from '../shared/ui/UnderDevelopment';
import KhamThienGiamThaiDuong from '../features/bai-viet/KhamThienGiamThaiDuong';
import CuMon from '../features/bai-viet/CuMon';
import ThienLuong from '../features/bai-viet/ThienLuong';
import ThatSat from '../features/bai-viet/ThatSat';
import PhaQuan from '../features/bai-viet/PhaQuan';
import { PhongThuyWidget } from '../features/phong-thuy/PhongThuyWidget';
import QimenArticles from '../features/ky-mon/QimenPage';
import QuanLy from '../pages/admin/QuanLy';
import ManagementGuard from '../pages/admin/ManagementGuard';
import ChatWidget from '../shared/ui/ChatWidget';
import ArticleManager from '../pages/admin/ArticleManager';
import PhatPhapPage from '../features/phat-phap/PhatPhapPage';
import UserManagement from '../pages/admin/UserManagement';
import CoursesPage from '../pages/courses/CoursesPage';
import CourseArticlePage from '../pages/courses/CourseArticlePage';
import Policy from '../pages/policy/Policy';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AiInterpretationGeminiView from '../features/astrology/AiInterpretationGeminiView';
import { useScrollRestoration } from '../shared/persistence';
import { useGlobalPageTransitions } from '../shared/motion/useGlobalPageTransitions';

function App() {
  const { pathname } = useLocation();
  useScrollRestoration();
  const { fallbackStageKey, fallbackStageClass } = useGlobalPageTransitions();

  useEffect(() => {
    const sendActivity = () => {
      const token = localStorage.getItem('tuvi_token');
      if (!token) return;
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    };
    sendActivity();
    const interval = window.setInterval(sendActivity, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get('ref');
    if (referralCode) localStorage.setItem('tuvi_referral_code', referralCode.trim().toUpperCase());
  }, []);

  // Phân hệ Quản trị viên nâng cao (Admin Dashboard độc lập - yêu cầu quyền Admin)
  if (pathname.startsWith('/admin')) {
    return (
      <ManagementGuard requireAdmin>
        <Routes>
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </ManagementGuard>
    );
  }

  // Phân hệ Luận Giải Lá Số AI (Google Gemini Minimalist): Giao diện độc lập toàn màn hình 100vw x 100vh
  if (pathname.startsWith('/luan-giai-ai')) {
    return (
      <Routes>
        <Route path="/luan-giai-ai/*" element={<AiInterpretationGeminiView />} />
      </Routes>
    );
  }

  // Trang chủ: Giao diện kèm ChatWidget
  if (pathname === '/' || pathname === '/home') {
    return (
      <>
        <Home />
        <ChatWidget />
      </>
    );
  }

  return (
    <div className="app">
      <Navbar />

      <main key={fallbackStageKey} className={`main-content ${fallbackStageClass}`}>
        <Routes>
          <Route path="/quan-ly" element={<ManagementGuard><QuanLy /></ManagementGuard>} />
          <Route path="/quan-ly/nguoi-dung" element={<ManagementGuard requireAdmin><UserManagement /></ManagementGuard>} />
          <Route path="/quan-ly/bai-viet" element={<ManagementGuard requireAdmin><ArticleManager /></ManagementGuard>} />
          <Route path="/quan-ly/khoa-hoc" element={<ManagementGuard requireAdmin><ArticleManager defaultCategory="Khóa học" /></ManagementGuard>} />
          <Route path="/phat-phap" element={<PhatPhapPage />} />
          <Route path="/phat-phap/:slug" element={<PhatPhapPage />} />
          <Route
            path="/la-so-tu-vi"
            element={
              <div className="home-content-flow">
                <LaSoTuVi />
              </div>
            }
          />
          <Route path="/lich-van-su" element={<LichVanSu />} />
          <Route path="/boi-kieu" element={<BoiKieu />} />
          <Route path="/la-kinh-phong-thuy" element={<PhongThuyWidget />} />
          <Route path="/phong-thuy" element={<PhongThuyWidget />} />
          <Route path="/chuyen-muc" element={<CategoryPage />} />
          <Route path="/chuyen-muc/thien-tuong" element={<KhamThienTuViThienTuong />} />
          <Route path="/chuyen-muc/thien-giam-thai-duong" element={<KhamThienGiamThaiDuong />} />
          <Route path="/chuyen-muc/cu-mon" element={<CuMon />} />
          <Route path="/chuyen-muc/thien-luong" element={<ThienLuong />} />
          <Route path="/chuyen-muc/that-sat" element={<ThatSat />} />
          <Route path="/chuyen-muc/pha-quan" element={<PhaQuan />} />

          {/* Phân hệ Khóa học và Bài viết khóa học */}
          <Route path="/khoa-hoc" element={<CoursesPage />} />
          <Route path="/khoa-hoc/bai-viet/:slug" element={<CourseArticlePage />} />

          {/* Phân hệ Kỳ Môn Độn Giáp */}
          <Route path="/ky-mon" element={<QimenArticles />} />
          <Route path="/ky-mon-don-giap" element={<QimenArticles />} />
          <Route path="/ky-mon-don-giap/:slug" element={<QimenArticles />} />

          {/* Các phân hệ thông tin và pháp lý */}
          <Route path="/chinh-sach" element={<Policy defaultTab="privacy" />} />
          <Route path="/dieu-khoan" element={<Policy defaultTab="terms" />} />
          <Route path="/lien-he" element={<UnderDevelopment />} />
          <Route path="/dien-dan" element={<UnderDevelopment />} />
          <Route path="/cua-hang" element={<UnderDevelopment />} />
          <Route path="/than-so" element={<UnderDevelopment />} />
          <Route path="/than-so-hoc" element={<UnderDevelopment />} />
        </Routes>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}

export default App;
