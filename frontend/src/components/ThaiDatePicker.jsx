import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const THAI_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function ThaiDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "เลือกวันที่",
  required = false,
  className = "",
  disabled = false,
}) {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  // Parse YYYY-MM-DD safely without timezone shifts
  const parseParts = (str) => {
    if (!str) return null;
    const parts = str.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return { year: parts[0], month: parts[1] - 1, day: parts[2] };
    }
    return null;
  };

  const selectedParts = parseParts(value);
  const today = new Date();
  const todayParts = {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  };

  // The month & year currently viewed in the calendar popup
  const [viewYear, setViewYear] = useState(selectedParts ? selectedParts.year : todayParts.year);
  const [viewMonth, setViewMonth] = useState(selectedParts ? selectedParts.month : todayParts.month);

  // Sync viewed month when value changes
  useEffect(() => {
    if (value) {
      const p = parseParts(value);
      if (p) {
        setViewYear(p.year);
        setViewMonth(p.month);
      }
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Convert to YYYY-MM-DD
  const formatISO = (y, m, d) => {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  // Select a day
  const handleSelectDay = (day) => {
    const iso = formatISO(viewYear, viewMonth, day);
    if (onChange) {
      onChange(iso);
    }
    setIsOpen(false);
  };

  // Select Today
  const handleSelectToday = () => {
    const iso = formatISO(todayParts.year, todayParts.month, todayParts.day);
    if (min && iso < min) return;
    if (max && iso > max) return;
    setViewYear(todayParts.year);
    setViewMonth(todayParts.month);
    if (onChange) {
      onChange(iso);
    }
    setIsOpen(false);
  };

  // Calculate grid days
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Display text in input: e.g. "17 พ.ย. 2569"
  const formattedDisplay = selectedParts
    ? `${selectedParts.day} ${THAI_MONTHS_SHORT[selectedParts.month]} ${selectedParts.year + 543}`
    : "";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Input Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm cursor-pointer select-none transition ${
          isOpen
            ? "bg-white border-red-800 ring-2 ring-red-800/20 shadow-xs"
            : "border-slate-200 hover:border-slate-300 hover:bg-white"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-100" : ""} ${className}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon className={`w-4 h-4 shrink-0 ${isOpen ? "text-red-800" : "text-slate-500"}`} />
          {formattedDisplay ? (
            <span className="font-semibold text-slate-800 truncate">{formattedDisplay}</span>
          ) : (
            <span className="text-slate-600 truncate">{placeholder}</span>
          )}
        </div>
        <span className="text-[11px] font-bold text-red-800 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md shrink-0">
          พ.ศ.
        </span>
      </div>

      {/* Hidden input for HTML form validation */}
      <input
        type="hidden"
        value={value || ""}
        required={required}
      />

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header: Month / Year + Navigation */}
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Month & Year Selection Dropdowns */}
            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 focus:outline-hidden cursor-pointer"
              >
                {THAI_MONTHS.map((mName, idx) => (
                  <option key={idx} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 focus:outline-hidden cursor-pointer"
              >
                {Array.from({ length: 15 }, (_, i) => todayParts.year - 5 + i).map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels (อา - ส) */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            {THAI_DAYS.map((dayName, idx) => (
              <div
                key={dayName}
                className={`text-[11px] font-bold py-1 ${
                  idx === 0
                    ? "text-rose-600"
                    : idx === 6
                    ? "text-blue-600"
                    : "text-slate-600"
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for first week offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="w-9 h-9" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateISO = formatISO(viewYear, viewMonth, day);
              const isSelected = value === dateISO;
              const isToday =
                todayParts.year === viewYear &&
                todayParts.month === viewMonth &&
                todayParts.day === day;

              const isDisabled =
                Boolean(min && dateISO < min) || Boolean(max && dateISO > max);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={`w-9 h-9 text-xs rounded-xl flex items-center justify-center transition active:scale-95 select-none ${
                    isSelected
                      ? "bg-red-800 text-white font-bold shadow-sm"
                      : isToday
                      ? "border border-red-800 text-red-800 font-bold hover:bg-red-50"
                      : isDisabled
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-700 hover:bg-slate-100 font-medium"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Bottom Bar: Today shortcut and quick preview */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-xs font-bold text-red-800 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition"
            >
              วันนี้ ({todayParts.day} {THAI_MONTHS_SHORT[todayParts.month]} {todayParts.year + 543})
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg transition"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
