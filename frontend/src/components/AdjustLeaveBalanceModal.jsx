import { useState, useEffect } from "react";
import Modal from "./Modal";
import { leaveService } from "../services/leaveService";
import { HeartPulse, Briefcase, Palmtree, Plus, Minus, Save, RotateCcw, RefreshCw } from "lucide-react";

const LEAVE_DEFAULTS = {
  1: { name: "ลาป่วย", default: 30, color: "rose", icon: HeartPulse },
  2: { name: "ลากิจส่วนตัว", default: 15, color: "amber", icon: Briefcase },
  3: { name: "ลาพักผ่อน", default: 10, color: "emerald", icon: Palmtree },
};

const COLOR_MAP = {
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-100",
    iconBg: "bg-rose-100 text-rose-800",
    input: "focus:ring-rose-700",
    chip: "text-rose-700 bg-rose-100 hover:bg-rose-200",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    iconBg: "bg-amber-100 text-amber-800",
    input: "focus:ring-amber-700",
    chip: "text-amber-700 bg-amber-100 hover:bg-amber-200",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100 text-emerald-800",
    input: "focus:ring-emerald-700",
    chip: "text-emerald-700 bg-emerald-100 hover:bg-emerald-200",
  },
};

export default function AdjustLeaveBalanceModal({
  isOpen,
  onClose,
  userId,
  userName = "คุณ",
  currentBalances = [],
  onSuccess,
}) {
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [days, setDays] = useState({ 1: 30, 2: 15, 3: 10 });

  useEffect(() => {
    if (isOpen && currentBalances.length > 0) {
      setDays({
        1: Number(currentBalances.find((b) => b.leave_type_id === 1)?.total_days ?? 30),
        2: Number(currentBalances.find((b) => b.leave_type_id === 2)?.total_days ?? 15),
        3: Number(currentBalances.find((b) => b.leave_type_id === 3)?.total_days ?? 10),
      });
      setError(null);
    }
  }, [isOpen, currentBalances]);

  const adj = (typeId, delta) => {
    setDays((prev) => ({
      ...prev,
      [typeId]: Math.max(0, Number(prev[typeId]) + delta),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await leaveService.updateUserLeaveBalance(userId, {
        year: currentYear,
        balances: [
          { leave_type_id: 1, total_days: Math.max(0, Number(days[1])) },
          { leave_type_id: 2, total_days: Math.max(0, Number(days[2])) },
          { leave_type_id: 3, total_days: Math.max(0, Number(days[3])) },
        ],
      });
      if (onSuccess) await onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ปรับสิทธิ์วันลา (3 ประเภทหลัก)" maxWidth="max-w-lg">
      <form onSubmit={handleSave} className="space-y-4">
        {/* ชื่อผู้ใช้ + ปี */}
        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <div>
            <p className="text-xs text-slate-500">ปรับสิทธิ์วันลาสำหรับ</p>
            <p className="text-sm font-bold text-slate-900">{userName}</p>
          </div>
          <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg">
            ปี พ.ศ. {currentYear + 543}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* การ์ดแต่ละประเภทวันลา */}
        <div className="space-y-3">
          {[1, 2, 3].map((typeId) => {
            const meta = LEAVE_DEFAULTS[typeId];
            const c = COLOR_MAP[meta.color];
            const Icon = meta.icon;
            return (
              <div
                key={typeId}
                className={`${c.bg} ${c.border} border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
              >
                {/* ชื่อประเภท */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{meta.name}</p>
                    <p className="text-xs text-slate-500">ค่าเริ่มต้น {meta.default} วัน/ปี</p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {/* ลบ */}
                  <button
                    type="button"
                    onClick={() => adj(typeId, -1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* Input */}
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={days[typeId]}
                    onChange={(e) => setDays((prev) => ({ ...prev, [typeId]: e.target.value }))}
                    className={`w-16 h-8 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 ${c.input}`}
                  />

                  {/* เพิ่ม */}
                  <button
                    type="button"
                    onClick={() => adj(typeId, 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Chip +5 */}
                  <button
                    type="button"
                    onClick={() => adj(typeId, 5)}
                    className={`px-2.5 h-8 text-xs font-bold rounded-lg transition active:scale-95 ${c.chip}`}
                  >
                    +5
                  </button>

                  {/* Reset */}
                  <button
                    type="button"
                    onClick={() => setDays((prev) => ({ ...prev, [typeId]: meta.default }))}
                    title="คืนค่าเริ่มต้น"
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDays({ 1: 30, 2: 15, 3: 10 })}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            คืนค่ามาตรฐานทั้งหมด
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-red-800 hover:bg-red-900 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? "กำลังบันทึก..." : "บันทึกสิทธิ์วันลา"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
