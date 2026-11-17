import { useState, useEffect, useMemo } from "react";
import { leaveService } from "../services/leaveService";
import { employeeService } from "../services/employeeService";
import { formatThaiDate } from "../utils/dateUtils";
import { getThaiHoliday, isThaiHoliday } from "../utils/thaiHolidays";
import ThaiDatePicker from "../components/ThaiDatePicker";
import Modal from "../components/Modal";
import UserAvatar from "../components/UserAvatar";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Building,
  Flag,
  Sparkles,
  Info,
  Users,
  Search,
  Eye,
  CalendarDays,
  BarChart3,
  Clock,
  RotateCcw,
  CheckCircle2,
  HeartPulse,
  Briefcase,
  Palmtree,
  CalendarCheck,
} from "lucide-react";

const THAI_MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const THAI_DAY_NAMES = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"
];

export default function LeaveCalendar() {
  // View mode: 'month' (default), 'day', 'year'
  const [viewMode, setViewMode] = useState("month");

  // Current viewed date
  const [currentDate, setCurrentDate] = useState(new Date());

  // For specific day selection (YYYY-MM-DD)
  const formatISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [selectedDateStr, setSelectedDateStr] = useState(formatISO(new Date()));
  const [selectedDayInMonth, setSelectedDayInMonth] = useState(null); // click day on month calendar

  // Filters & Data
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // Detail modal
  const [searchQuery, setSearchQuery] = useState("");

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Generate Year options (current - 5 to current + 5)
  const currentSystemYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const list = [];
    for (let y = currentSystemYear - 5; y <= currentSystemYear + 5; y++) {
      list.push(y);
    }
    return list;
  }, [currentSystemYear]);

  // Load calendar & leave data based on viewMode
  const loadCalendarData = async () => {
    setLoading(true);
    try {
      let leavesData = [];
      const deptsPromise = departments.length === 0 ? employeeService.getDepartments() : Promise.resolve(departments);

      if (viewMode === "day") {
        const [lData, deptsData] = await Promise.all([
          leaveService.getLeaveCalendar({
            date: selectedDateStr,
            department_id: selectedDept || undefined,
          }),
          deptsPromise,
        ]);
        leavesData = lData;
        if (departments.length === 0) setDepartments(deptsData);
      } else if (viewMode === "year") {
        const [lData, deptsData] = await Promise.all([
          leaveService.getLeaveCalendar({
            year,
            month: "all",
            department_id: selectedDept || undefined,
          }),
          deptsPromise,
        ]);
        leavesData = lData;
        if (departments.length === 0) setDepartments(deptsData);
      } else {
        // month view
        const [lData, deptsData] = await Promise.all([
          leaveService.getLeaveCalendar({
            month,
            year,
            department_id: selectedDept || undefined,
          }),
          deptsPromise,
        ]);
        leavesData = lData;
        if (departments.length === 0) setDepartments(deptsData);
      }

      setLeaves(leavesData || []);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [viewMode, month, year, selectedDateStr, selectedDept]);

  // Month navigation helpers
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDayInMonth(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDayInMonth(null);
  };

  const setMonthByIndex = (newMonthIdx) => {
    setCurrentDate(new Date(year, newMonthIdx, 1));
    setSelectedDayInMonth(null);
  };

  const setYearValue = (newYear) => {
    setCurrentDate(new Date(newYear, month - 1, 1));
    setSelectedDayInMonth(null);
  };

  const resetToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(formatISO(now));
    setSelectedDayInMonth(null);
  };

  // Day navigation helpers (when in 'day' mode)
  const shiftDay = (daysOffset) => {
    const parts = selectedDateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + daysOffset);
    setSelectedDateStr(formatISO(d));
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // Year navigation helpers (when in 'year' mode)
  const prevYear = () => {
    setYearValue(year - 1);
  };

  const nextYear = () => {
    setYearValue(year + 1);
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  const getDateStr = (day) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getLeavesForDay = (day) => {
    const dStr = getDateStr(day);
    return leaves.filter((l) => {
      const start = l.start_date.split("T")[0];
      const end = l.end_date.split("T")[0];
      return dStr >= start && dStr <= end;
    });
  };

  const getLeaveColor = (type) => {
    if (type?.includes("ป่วย")) return "bg-rose-100 text-rose-800 border-rose-200";
    if (type?.includes("กิจ")) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  const getAvatarSrc = (item) => {
    if (item?.profile_image) return item.profile_image;
    if (item?.email) {
      const cached = localStorage.getItem("profile_avatar_" + item.email.toLowerCase());
      if (cached) return cached;
    }
    return null;
  };

  // Count holidays in current month
  let holidaysInMonthCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (isThaiHoliday(getDateStr(d))) holidaysInMonthCount++;
  }

  // Filter leaves based on selectedDayInMonth (if set in month view) and search query
  const displayedLeaves = useMemo(() => {
    let result = leaves;

    // If month view has a specific day clicked
    if (viewMode === "month" && selectedDayInMonth !== null) {
      const targetDateStr = getDateStr(selectedDayInMonth);
      result = result.filter((l) => {
        const start = l.start_date.split("T")[0];
        const end = l.end_date.split("T")[0];
        return targetDateStr >= start && targetDateStr <= end;
      });
    }

    if (!searchQuery) return result;
    const q = searchQuery.toLowerCase();
    return result.filter((l) => {
      return (
        l.full_name?.toLowerCase().includes(q) ||
        l.department_name?.toLowerCase().includes(q) ||
        l.leave_type_name?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q)
      );
    });
  }, [leaves, viewMode, selectedDayInMonth, searchQuery, year, month]);

  // Yearly summary statistics
  const yearlyStats = useMemo(() => {
    if (viewMode !== "year") return null;
    let sickDays = 0;
    let personalDays = 0;
    let vacationDays = 0;
    let totalDays = 0;

    leaves.forEach((l) => {
      const days = Number(l.days_count) || 0;
      totalDays += days;
      if (l.leave_type_name?.includes("ป่วย")) sickDays += days;
      else if (l.leave_type_name?.includes("กิจ")) personalDays += days;
      else vacationDays += days;
    });

    return {
      totalRequests: leaves.length,
      totalDays,
      sickDays,
      personalDays,
      vacationDays,
    };
  }, [leaves, viewMode]);

  // Selected date object for day view
  const selectedDateObj = useMemo(() => {
    const parts = selectedDateStr.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }, [selectedDateStr]);

  const selectedDateHoliday = isThaiHoliday(selectedDateStr) ? getThaiHoliday(selectedDateStr) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>ปฏิทินและประวัติการลางาน</span>
            <span className="text-[10px] sm:text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
              พ.ศ. ไทย
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            ย้อนดูและติดตามการลางานของบุคลากร ย้อนหลังได้ทั้งรายวัน รายเดือน และรายปี
          </p>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 shadow-xs focus:outline-none focus:border-red-800 font-medium"
          >
            <option value="">ทุกภาควิชา / สังกัด</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main View Mode Selector (รายวัน / รายเดือน / รายปี) & Navigation Toolbar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-3 sm:p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Segmented Control Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl self-start sm:self-auto border border-slate-200/70">
            <button
              onClick={() => {
                setViewMode("day");
                setSelectedDayInMonth(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "day"
                  ? "bg-red-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>รายวัน</span>
            </button>

            <button
              onClick={() => {
                setViewMode("month");
                setSelectedDayInMonth(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "month"
                  ? "bg-red-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>รายเดือน</span>
            </button>

            <button
              onClick={() => {
                setViewMode("year");
                setSelectedDayInMonth(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "year"
                  ? "bg-red-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>รายปี (ทั้งปี)</span>
            </button>
          </div>

          {/* Quick Selectors based on View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode: DAY */}
            {viewMode === "day" && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => shiftDay(-1)}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition"
                  title="วันก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="w-44 sm:w-48">
                  <ThaiDatePicker
                    value={selectedDateStr}
                    onChange={(val) => {
                      setSelectedDateStr(val);
                      const parts = val.split("-").map(Number);
                      setCurrentDate(new Date(parts[0], parts[1] - 1, 1));
                    }}
                    placeholder="เลือกวันที่"
                  />
                </div>

                <button
                  onClick={resetToToday}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  วันนี้
                </button>

                <button
                  onClick={() => shiftDay(1)}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition"
                  title="วันถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* View Mode: MONTH */}
            {viewMode === "month" && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={prevMonth}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Month Dropdown */}
                <select
                  value={month - 1}
                  onChange={(e) => setMonthByIndex(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition focus:outline-none focus:border-red-800 cursor-pointer"
                >
                  {THAI_MONTH_NAMES.map((name, idx) => (
                    <option key={`m-${idx}`} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={year}
                  onChange={(e) => setYearValue(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition focus:outline-none focus:border-red-800 cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={`y-${y}`} value={y}>
                      พ.ศ. {y + 543}
                    </option>
                  ))}
                </select>

                <button
                  onClick={resetToToday}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  เดือนนี้
                </button>

                <button
                  onClick={nextMonth}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* View Mode: YEAR */}
            {viewMode === "year" && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={prevYear}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition"
                  title="ปีก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Year Dropdown */}
                <select
                  value={year}
                  onChange={(e) => setYearValue(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 transition focus:outline-none focus:border-red-800 cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={`year-${y}`} value={y}>
                      ประจำปี พ.ศ. {y + 543}
                    </option>
                  ))}
                </select>

                <button
                  onClick={resetToToday}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  ปีปัจจุบัน
                </button>

                <button
                  onClick={nextYear}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition"
                  title="ปีถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: DAY VIEW BANNER */}
      {viewMode === "day" && (
        <div className="bg-gradient-to-r from-red-900 via-rose-950 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                  ข้อมูลการลารายวัน
                </span>
                {selectedDateHoliday && (
                  <span className="text-xs font-bold bg-rose-500 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    วันหยุดราชการ: {selectedDateHoliday}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight">
                {THAI_DAY_NAMES[selectedDateObj.getDay()]}ที่ {formatThaiDate(selectedDateStr)}
              </h2>
              <p className="text-xs sm:text-sm text-red-100/80">
                บุคลากรที่ลางานในวันนี้ทั้งหมด <strong className="text-white font-bold">{leaves.length}</strong> คน
              </p>
            </div>

            <button
              onClick={() => {
                setViewMode("month");
                setCurrentDate(new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1));
                setSelectedDayInMonth(selectedDateObj.getDate());
              }}
              className="self-start sm:self-auto px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-white/20"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>ดูปฏิทินทั้งเดือนนี้</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: YEAR VIEW STATS CARDS */}
      {viewMode === "year" && yearlyStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-red-800 to-rose-900 text-white p-4 rounded-2xl sm:rounded-3xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-100">รวมการลาทั้งปี พ.ศ. {year + 543}</span>
              <CalendarCheck className="w-4 h-4 text-red-200" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black">
              {yearlyStats.totalDays} <span className="text-xs sm:text-sm font-normal text-red-200">วัน</span>
            </div>
            <p className="text-[11px] text-red-200/80 mt-1">ทั้งหมด {yearlyStats.totalRequests} รายการ</p>
          </div>

          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between text-rose-800">
              <span className="text-xs font-bold">ลาป่วย</span>
              <HeartPulse className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-950">
              {yearlyStats.sickDays} <span className="text-xs sm:text-sm font-normal text-rose-700">วัน</span>
            </div>
            <p className="text-[11px] text-rose-600 mt-1">สิทธิ์ตามระเบียบ 30 วัน/ปี</p>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-xs font-bold">ลากิจส่วนตัว</span>
              <Briefcase className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-950">
              {yearlyStats.personalDays} <span className="text-xs sm:text-sm font-normal text-amber-700">วัน</span>
            </div>
            <p className="text-[11px] text-amber-600 mt-1">สิทธิ์ตามระเบียบ 15 วัน/ปี</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold">ลาพักผ่อน</span>
              <Palmtree className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-950">
              {yearlyStats.vacationDays} <span className="text-xs sm:text-sm font-normal text-emerald-700">วัน</span>
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">สิทธิ์ตามระเบียบ 10 วัน/ปี</p>
          </div>
        </div>
      )}

      {/* VIEW MODE: MONTH CALENDAR GRID (Only when in 'month' mode) */}
      {viewMode === "month" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Month Header Banner */}
          <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-slate-50/50">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-red-800 text-white rounded-xl sm:rounded-2xl shadow-sm shadow-red-900/20">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {THAI_MONTH_NAMES[month - 1]} พ.ศ. {year + 543}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  วันหยุดราชการ: <strong className="text-red-700 font-bold">{holidaysInMonthCount} วัน</strong> • วันลาที่อนุมัติ: <strong className="text-slate-800">{leaves.length} รายการ</strong>
                </p>
              </div>
            </div>

            {selectedDayInMonth !== null && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-red-50 text-red-800 font-bold px-2.5 py-1 rounded-xl border border-red-200 flex items-center gap-1">
                  <span>เลือกวันที่: {selectedDayInMonth} {THAI_MONTH_NAMES[month - 1]}</span>
                </span>
                <button
                  onClick={() => setSelectedDayInMonth(null)}
                  className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-xl font-bold transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ดูทั้งเดือน</span>
                </button>
              </div>
            )}
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-bold text-slate-600 bg-slate-100/70 border-b border-slate-200 py-2 sm:py-2.5 uppercase">
            <span className="text-red-600">อา.</span>
            <span>จ.</span>
            <span>อ.</span>
            <span>พ.</span>
            <span>พฤ.</span>
            <span>ศ.</span>
            <span className="text-indigo-600">ส.</span>
          </div>

          {/* Days Grid */}
          {loading ? (
            <div className="h-64 sm:h-96 flex items-center justify-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
              {/* Empty slots for days before 1st of month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[110px] bg-slate-50/40 p-1 sm:p-2" />
              ))}

              {/* Days of current month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNumber = i + 1;
                const dateStr = getDateStr(dayNumber);
                const holidayName = getThaiHoliday(dateStr);
                const dayLeaves = getLeavesForDay(dayNumber);
                const isToday =
                  dayNumber === new Date().getDate() &&
                  month === new Date().getMonth() + 1 &&
                  year === new Date().getFullYear();

                const isSelected = selectedDayInMonth === dayNumber;
                const dayOfWeek = (firstDayOfMonth + i) % 7;
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <div
                    key={`day-${dayNumber}`}
                    onClick={() => {
                      setSelectedDayInMonth(isSelected ? null : dayNumber);
                    }}
                    className={`min-h-[70px] sm:min-h-[110px] p-1 sm:p-2 flex flex-col justify-between transition cursor-pointer ${
                      isSelected
                        ? "bg-red-50/80 ring-2 ring-red-800 ring-inset"
                        : holidayName
                        ? "bg-red-50/50 hover:bg-red-50/70"
                        : isToday
                        ? "bg-amber-50/50 hover:bg-amber-50/70"
                        : isWeekend
                        ? "bg-slate-50/30 hover:bg-slate-50/80"
                        : "bg-white hover:bg-slate-50/90"
                    }`}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                          isSelected
                            ? "bg-red-800 text-white font-extrabold shadow-xs"
                            : isToday
                            ? "bg-slate-900 text-white shadow-xs"
                            : holidayName
                            ? "bg-red-600 text-white font-bold"
                            : dayOfWeek === 0
                            ? "text-red-600 font-bold"
                            : dayOfWeek === 6
                            ? "text-indigo-600 font-bold"
                            : "text-slate-800"
                        }`}
                      >
                        {dayNumber}
                      </span>

                      {dayLeaves.length > 0 && (
                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold bg-slate-100 px-1 py-0.2 rounded-md hidden sm:inline-block">
                          ลา {dayLeaves.length} คน
                        </span>
                      )}
                    </div>

                    {/* Holiday & Leave Event Pills */}
                    <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[50px] sm:max-h-[80px]">
                      {holidayName && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({
                              isHoliday: true,
                              title: holidayName,
                              dateStr,
                            });
                          }}
                          className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold truncate cursor-pointer shadow-2xs hover:opacity-95 transition flex items-center gap-0.5 sm:gap-1"
                          title={`วันหยุดราชการ: ${holidayName}`}
                        >
                          <Flag className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 text-red-200" />
                          <span className="truncate">{holidayName}</span>
                        </div>
                      )}

                      {dayLeaves.map((l, idx) => (
                        <div
                          key={`${l.id}-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({ isHoliday: false, leave: l });
                          }}
                          className={`text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.2 sm:py-0.5 rounded-md border font-medium truncate cursor-pointer transition transform hover:scale-95 ${getLeaveColor(
                            l.leave_type_name
                          )}`}
                          title={`${l.full_name} (${l.leave_type_name})`}
                        >
                          <span className="font-bold">{l.full_name?.split(" ")[0]}</span>
                          <span className="hidden sm:inline"> - {l.leave_type_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend (Shown in Month View) */}
      {viewMode === "month" && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-red-600 flex items-center justify-center text-white text-[9px]">★</span>
              <span className="text-red-700 font-bold">วันหยุดราชการไทย</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>ลาป่วย</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>ลากิจส่วนตัว</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>ลาพักผ่อน</span>
            </div>
          </div>

          <span className="text-[11px] text-slate-400">คลิกที่ช่องวันที่ในปฏิทินเพื่อกรองดูเฉพาะวันนั้น</span>
        </div>
      )}

      {/* Summary List Card (รายการผู้ลางาน) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Dynamic Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-red-800 text-white rounded-xl sm:rounded-2xl shadow-xs">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                <span>
                  {viewMode === "day"
                    ? "สรุปรายชื่อผู้ลางานประจำวัน"
                    : viewMode === "year"
                    ? "สรุปประวัติการลางานประจำปี"
                    : selectedDayInMonth !== null
                    ? `สรุปรายชื่อผู้ลางานวันที่ ${selectedDayInMonth} ${THAI_MONTH_NAMES[month - 1]}`
                    : "สรุปรายชื่อผู้ลางานประจำเดือน"}
                </span>

                <span className="text-[11px] sm:text-xs bg-red-50 text-red-800 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                  {viewMode === "day"
                    ? formatThaiDate(selectedDateStr)
                    : viewMode === "year"
                    ? `พ.ศ. ${year + 543}`
                    : `${THAI_MONTH_NAMES[month - 1]} พ.ศ. ${year + 543}`}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                รายการบุคลากรที่ลางาน: <strong className="text-slate-800 font-bold">{displayedLeaves.length}</strong> รายการ
                {selectedDept && " (กรองตามภาควิชาที่เลือก)"}
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, ภาควิชา, ประเภทการลา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>
        </div>

        {/* Content Table / Empty State */}
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-red-800 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : displayedLeaves.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              {searchQuery
                ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา"
                : viewMode === "day"
                ? "ไม่มีบุคลากรลางานในวันนี้"
                : viewMode === "year"
                ? `ไม่มีประวัติการลางานในปี พ.ศ. ${year + 543}`
                : selectedDayInMonth !== null
                ? `ไม่มีบุคลากรลางานในวันที่ ${selectedDayInMonth} ${THAI_MONTH_NAMES[month - 1]}`
                : "ไม่มีบุคลากรลางานในเดือนนี้"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? "ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง"
                : "หากมีบุคลากรได้รับอนุมัติการลา รายชื่อและวันที่ลาจะแสดงที่นี่โดยอัตโนมัติ"}
            </p>
            {selectedDayInMonth !== null && (
              <button
                onClick={() => setSelectedDayInMonth(null)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-800 text-xs font-bold rounded-xl hover:bg-red-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>กลับไปดูทั้งเดือน ({leaves.length} รายการ)</span>
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">วันที่ลา</th>
                    <th className="py-3 px-4">บุคลากร</th>
                    <th className="py-3 px-4">ภาควิชา / สังกัด</th>
                    <th className="py-3 px-4">ประเภทการลา</th>
                    <th className="py-3 px-4">เหตุผล</th>
                    <th className="py-3 px-4 text-center">ดูข้อมูล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedLeaves.map((l, idx) => {
                    const isSingleDay = l.start_date.split("T")[0] === l.end_date.split("T")[0];
                    return (
                      <tr
                        key={`summary-${l.id}-${idx}`}
                        className="hover:bg-slate-50/70 transition cursor-pointer"
                        onClick={() => setSelectedItem({ isHoliday: false, leave: l })}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-800 shrink-0"></span>
                            <span>
                              {isSingleDay
                                ? formatThaiDate(l.start_date)
                                : `${formatThaiDate(l.start_date)} - ${formatThaiDate(l.end_date)}`}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-semibold">
                              {Number(l.days_count)} วัน
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar src={getAvatarSrc(l)} name={l.full_name} size="sm" />
                            <div>
                              <span className="font-bold text-slate-800 block">{l.full_name}</span>
                              <span className="text-[10px] text-slate-400 block">{l.position || "อาจารย์/เจ้าหน้าที่"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {l.department_name || "สำนักงานคณะวิศวกรรมศาสตร์"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${getLeaveColor(
                              l.leave_type_name
                            )}`}
                          >
                            {l.leave_type_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {l.reason || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem({ isHoliday: false, leave: l });
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-red-800 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg font-bold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดู</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {displayedLeaves.map((l, idx) => {
                const isSingleDay = l.start_date.split("T")[0] === l.end_date.split("T")[0];
                return (
                  <div
                    key={`mobile-summary-${l.id}-${idx}`}
                    className="p-3.5 space-y-2 hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setSelectedItem({ isHoliday: false, leave: l })}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${getLeaveColor(
                          l.leave_type_name
                        )}`}
                      >
                        {l.leave_type_name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                        {Number(l.days_count)} วัน
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <UserAvatar src={getAvatarSrc(l)} name={l.full_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{l.full_name}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{l.department_name || "สำนักงานคณะ"}</p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-red-800 shrink-0" />
                      <span className="font-semibold">
                        {isSingleDay
                          ? formatThaiDate(l.start_date)
                          : `${formatThaiDate(l.start_date)} - ${formatThaiDate(l.end_date)}`}
                      </span>
                    </div>

                    {l.reason && (
                      <p className="text-[10px] text-slate-500 italic truncate">
                        เหตุผล: {l.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.isHoliday ? "วันหยุดราชการ / วันสำคัญ" : "ข้อมูลการลางาน"}
        maxWidth="max-w-md"
      >
        {selectedItem && (
          <div>
            {selectedItem.isHoliday ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-inner">
                  <Flag className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wider bg-red-50 px-3 py-1 rounded-full border border-red-200">
                    วันหยุดราชการประจำปี
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-2.5 leading-snug">
                    {selectedItem.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                    ตรงกับวันที่ {formatThaiDate(selectedItem.dateStr)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 text-left">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Info className="w-4 h-4 text-red-600" />
                    หมายเหตุการปฏิบัติงาน
                  </p>
                  ตามประกาศสำนักนายกรัฐมนตรีและระเบียบมหาวิทยาลัย เป็นวันหยุดราชการของคณาจารย์และเจ้าหน้าที่
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <UserAvatar
                    src={getAvatarSrc(selectedItem.leave)}
                    name={selectedItem.leave?.full_name}
                    size="modal"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedItem.leave?.full_name}</h4>
                    <p className="text-xs text-slate-600">{selectedItem.leave?.department_name || "สำนักงานคณะ"}</p>
                    <p className="text-xs text-slate-600">{selectedItem.leave?.position}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 block">ประเภทการลา</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {selectedItem.leave?.leave_type_name}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 block">จำนวนวันที่ลา</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {Number(selectedItem.leave?.days_count)} วัน
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                    <span className="text-slate-500 block">ช่วงวันที่ลา</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {formatThaiDate(selectedItem.leave?.start_date)} - {formatThaiDate(selectedItem.leave?.end_date)}
                    </span>
                  </div>
                  {selectedItem.leave?.reason && (
                    <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                      <span className="text-slate-500 block">เหตุผลการลา</span>
                      <span className="font-medium text-slate-800 mt-0.5 block">
                        {selectedItem.leave?.reason}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
