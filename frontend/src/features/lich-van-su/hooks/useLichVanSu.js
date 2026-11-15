import { useState, useMemo, useCallback } from 'react';
import { getFullDayAlmanac, getMonthAlmanac } from '../core/index.js';
import { usePersistedState, useUrlQueryState } from '../../../shared/persistence';

const LVS_QUERY_DEFAULTS = { tab: 'daily' };

export function useLichVanSu() {
  const today = useMemo(() => {
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }, []);

  // Chế độ xem: 'daily' | 'monthly' | 'good_days' (đồng bộ lên URL ?tab=...)
  const [queryState, setQueryState] = useUrlQueryState(LVS_QUERY_DEFAULTS);
  const activeTab = ['daily', 'monthly', 'good_days'].includes(queryState.tab)
    ? queryState.tab
    : 'daily';
  const setActiveTab = useCallback(
    (nextTab) => setQueryState({ tab: nextTab }),
    [setQueryState]
  );

  // Ngày đang được chọn để xem chi tiết (lưu bền vững trong phiên)
  const [rawSelectedDate, setSelectedDate] = usePersistedState(
    'lich_van_su_selected_date',
    () => ({
      day: today.day,
      month: today.month,
      year: today.year,
    }),
    { scopeToRoute: false, clearOnLogout: false }
  );

  // Bảo vệ trước trường hợp storage lưu giá trị null hoặc sai cấu trúc
  const selectedDate = useMemo(() => {
    if (
      rawSelectedDate &&
      typeof rawSelectedDate === 'object' &&
      Number.isFinite(Number(rawSelectedDate.day)) &&
      Number.isFinite(Number(rawSelectedDate.month)) &&
      Number.isFinite(Number(rawSelectedDate.year))
    ) {
      return rawSelectedDate;
    }
    return today;
  }, [rawSelectedDate, today]);

  // Tháng và năm đang hiển thị trên Lịch Tháng
  const [viewMonth, setViewMonth] = useState(selectedDate.month);
  const [viewYear, setViewYear] = useState(selectedDate.year);

  // Tính toán dữ liệu Lịch Vạn Sự cho ngày đang chọn
  const dayAlmanac = useMemo(() => {
    return getFullDayAlmanac(selectedDate.day, selectedDate.month, selectedDate.year);
  }, [selectedDate]);

  // Tính toán dữ liệu ma trận Lịch Tháng
  const monthAlmanac = useMemo(() => {
    return getMonthAlmanac(viewMonth, viewYear);
  }, [viewMonth, viewYear]);

  // Kiểm tra xem ngày đang chọn có phải hôm nay không
  const isSelectedToday = useMemo(() => {
    return (
      selectedDate.day === today.day &&
      selectedDate.month === today.month &&
      selectedDate.year === today.year
    );
  }, [selectedDate, today]);

  // Điều hướng ngày trước / sau
  const handlePrevDay = useCallback(() => {
    const cur = new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day);
    cur.setDate(cur.getDate() - 1);
    const newDay = cur.getDate();
    const newMonth = cur.getMonth() + 1;
    const newYear = cur.getFullYear();

    setSelectedDate({ day: newDay, month: newMonth, year: newYear });
    setViewMonth(newMonth);
    setViewYear(newYear);
  }, [selectedDate]);

  const handleNextDay = useCallback(() => {
    const cur = new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day);
    cur.setDate(cur.getDate() + 1);
    const newDay = cur.getDate();
    const newMonth = cur.getMonth() + 1;
    const newYear = cur.getFullYear();

    setSelectedDate({ day: newDay, month: newMonth, year: newYear });
    setViewMonth(newMonth);
    setViewYear(newYear);
  }, [selectedDate]);

  // Quay lại hôm nay
  const handleGoToday = useCallback(() => {
    setSelectedDate({
      day: today.day,
      month: today.month,
      year: today.year,
    });
    setViewMonth(today.month);
    setViewYear(today.year);
  }, [today]);

  // Chọn ngày từ Lịch Tháng hoặc Mini Calendar
  const handleSelectDay = useCallback((d, m, y) => {
    setSelectedDate({ day: d, month: m, year: y });
    setViewMonth(m);
    setViewYear(y);
  }, []);

  const handleSelectDayAndSwitchToDaily = useCallback((d, m, y) => {
    setSelectedDate({ day: d, month: m, year: y });
    setViewMonth(m);
    setViewYear(y);
    setActiveTab('daily');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Chuyển tháng
  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  return {
    today,
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    viewMonth,
    setViewMonth,
    viewYear,
    setViewYear,
    dayAlmanac,
    monthAlmanac,
    isSelectedToday,
    handlePrevDay,
    handleNextDay,
    handleGoToday,
    handleSelectDay,
    handleSelectDayAndSwitchToDaily,
    handlePrevMonth,
    handleNextMonth,
  };
}
