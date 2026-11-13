import { useState, useEffect } from "react";
import { leaveService } from "../services/leaveService";
import { employeeService } from "../services/employeeService";
import { formatThaiDate } from "../utils/dateUtils";
import { getThaiHoliday, isThaiHoliday } from "../utils/thaiHolidays";
import Modal from "../components/Modal";
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
} from "lucide-react";

export default function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // Leave or Holiday detail
  const [searchQuery, setSearchQuery] = useState("");

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const [leavesData, deptsData] = await Promise.all([
        leaveService.getLeaveCalendar({
          month,
          year,
          department_id: selectedDept || undefined,
        }),
        employeeService.getDepartments(),
      ]);
      setLeaves(leavesData);
      setDepartments(deptsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [month, year, selectedDept]);

  // Calendar Helpers
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const thaiMonthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // Helper to format date string
  const getDateStr = (day) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Helper to get leaves on a specific date (day: 1..daysInMonth)
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

  // Count holidays in current month
  let holidaysInMonthCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (isThaiHoliday(getDateStr(d))) holidaysInMonthCount++;
  }

  const filteredLeaves = leaves.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.full_name?.toLowerCase().includes(q) ||
      l.department_name?.toLowerCase().includes(q) ||
      l.leave_type_name?.toLowerCase().includes(q) ||
      l.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>ปฏิทินการลาและวันหยุด</span>
            <span className="text-[10px] sm:text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
              ปฏิทินไทย
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            ภาพรวมวันหยุดราชการและวันลาของบุคลากรคณะวิศวกรรมศาสตร์
          </p>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 shadow-xs focus:outline-none focus:border-red-800"
          >
            <option value="">ทุกภาควิชา</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Month Navigation Header */}
        <div className="p-3.5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-slate-50/50">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-red-800 text-white rounded-xl sm:rounded-2xl shadow-sm shadow-red-900/20">
              <CalendarIcon className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                {thaiMonthNames[month - 1]} พ.ศ. {year + 543}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                วันหยุดราชการ: <strong className="text-red-700 font-bold">{holidaysInMonthCount} วัน</strong> • วันลา: <strong className="text-slate-800">{leaves.length} รายการ</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={prevMonth}
              className="p-1.5 sm:p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition shadow-xs"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-xs"
            >
              เดือนนี้
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 sm:p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition shadow-xs"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-bold text-slate-600 bg-slate-100/70 border-b border-slate-200 py-2 sm:py-3 uppercase">
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
              <div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[120px] bg-slate-50/40 p-1 sm:p-2" />
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

              const dayOfWeek = (firstDayOfMonth + i) % 7;
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <div
                  key={`day-${dayNumber}`}
                  className={`min-h-[70px] sm:min-h-[120px] p-1 sm:p-2 flex flex-col justify-between transition hover:bg-slate-50/90 ${
                    holidayName
                      ? "bg-red-50/60 hover:bg-red-50/80 border-red-100"
                      : isToday
                      ? "bg-amber-50/50"
                      : isWeekend
                      ? "bg-slate-50/30"
                      : "bg-white"
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-red-800 text-white shadow-xs"
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

                  {/* Holiday & Leave Events Container */}
                  <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[50px] sm:max-h-[85px]">
                    {/* Official Thai Holiday Banner */}
                    {holidayName && (
                      <div
                        onClick={() =>
                          setSelectedItem({
                            isHoliday: true,
                            title: holidayName,
                            dateStr,
                          })
                        }
                        className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-md bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold truncate cursor-pointer shadow-2xs hover:opacity-95 transition flex items-center gap-0.5 sm:gap-1"
                        title={`วันหยุดราชการ: ${holidayName}`}
                      >
                        <Flag className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 text-red-200" />
                        <span className="truncate">{holidayName}</span>
                      </div>
                    )}

                    {/* Leave Event Pills */}
                    {dayLeaves.map((l, idx) => (
                      <div
                        key={`${l.id}-${idx}`}
                        onClick={() => setSelectedItem({ isHoliday: false, leave: l })}
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

      {/* Legend & Holiday Details */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs text-xs">
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
            <span>ลากิจ</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>ลาพักร้อน</span>
          </div>
        </div>
      </div>

      {/* สรุปรายการใครลาวันไหนบ้างประจำเดือน (Monthly Leave List) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-red-800 text-white rounded-xl sm:rounded-2xl shadow-xs">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>สรุปรายชื่อผู้ลางานประจำเดือน</span>
                <span className="text-[11px] sm:text-xs bg-red-50 text-red-800 font-bold px-2 py-0.5 rounded-full border border-red-200">
                  {thaiMonthNames[month - 1]} พ.ศ. {year + 543}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                รายการบุคลากรที่ลาในเดือนนี้ทั้งหมด {leaves.length} รายการ (เรียงตามวันที่ลา)
              </p>
            </div>
          </div>

          {/* Search Box */}
          {leaves.length > 0 && (
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
          )}
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-red-800 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              {searchQuery ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา" : "ไม่มีบุคลากรลางานในเดือนนี้"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? "ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง" : "หากมีบุคลากรได้รับอนุมัติการลา รายชื่อและวันที่ลาจะแสดงที่นี่โดยอัตโนมัติ"}
            </p>
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
                  {filteredLeaves.map((l, idx) => {
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
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-800 to-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {l.full_name?.charAt(0)}
                            </div>
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
              {filteredLeaves.map((l, idx) => {
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
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-800 to-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {l.full_name?.charAt(0)}
                      </div>
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

      {/* Modal: Event or Holiday Detail */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.isHoliday ? "วันหยุดราชการ / วันสำคัญ" : "ข้อมูลการลางาน"}
        maxWidth="max-w-md"
      >
        {selectedItem && (
          <div>
            {selectedItem.isHoliday ? (
              /* Holiday Details */
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
              /* Leave Details */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-red-800 to-slate-900 text-white font-bold flex items-center justify-center text-base sm:text-lg shadow-xs">
                    {selectedItem.leave?.full_name?.charAt(0)}
                  </div>
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
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
