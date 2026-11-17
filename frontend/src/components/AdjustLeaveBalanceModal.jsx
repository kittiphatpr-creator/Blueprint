import { useState, useEffect } from "react";
import Modal from "./Modal";
import { leaveService } from "../services/leaveService";
import { HeartPulse, Briefcase, Palmtree, Plus, Minus, Save, RotateCcw } from "lucide-react";

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

  // Focus on the 3 primary leave types:
  // 1: ลาป่วย (Sick Leave), 2: ลากิจส่วนตัว (Personal Leave), 3: ลาพักผ่อน (Vacation Leave)
  const [sickDays, setSickDays] = useState(30);
  const [personalDays, setPersonalDays] = useState(15);
  const [vacationDays, setVacationDays] = useState(10);

  useEffect(() => {
    if (isOpen && currentBalances.length > 0) {
      const sick = currentBalances.find((b) => b.leave_type_id === 1 || b.leave_type_name?.includes("ป่วย"));
      const personal = currentBalances.find((b) => b.leave_type_id === 2 || b.leave_type_name?.includes("กิจ"));
      const vacation = currentBalances.find((b) => b.leave_type_id === 3 || b.leave_type_name?.includes("พักผ่อน"));

      if (sick) setSickDays(Number(sick.total_days));
      if (personal) setPersonalDays(Number(personal.total_days));
      if (vacation) setVacationDays(Number(vacation.total_days));
    }
  }, [isOpen, currentBalances]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const balances = [
        { leave_type_id: 1, total_days: Math.max(0, Number(sickDays)) },
        { leave_type_id: 2, total_days: Math.max(0, Number(personalDays)) },
        { leave_type_id: 3, total_days: Math.max(0, Number(vacationDays)) },
      ];

      await leaveService.updateUserLeaveBalance(userId, {
        year: currentYear,
        balances,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    setSickDays(30);
    setPersonalDays(15);
    setVacationDays(10);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ปรับปรุง / เพิ่มสิทธิ์วันลา (3 ประเภทหลัก)"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500">ปรับปรุงสิทธิ์วันลาสำหรับ:</p>
          <p className="text-sm font-bold text-slate-800">{userName}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">ประจำปี พ.ศ. {currentYear + 543}</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* 1. ลาป่วย */}
          <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-800 flex items-center justify-center shrink-0">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">ลาป่วย</h4>
                <p className="text-xs text-slate-500">เกณฑ์มาตรฐาน 30 วัน/ปี</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setSickDays((d) => Math.max(0, d - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 font-bold active:scale-95 transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="0"
                step="0.5"
                value={sickDays}
                onChange={(e) => setSickDays(e.target.value)}
                className="w-16 h-8 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-800"
              />
              <button
                type="button"
                onClick={() => setSickDays((d) => Number(d) + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 font-bold active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSickDays((d) => Number(d) + 5)}
                className="px-2 h-8 text-xs font-bold text-red-800 bg-red-100/60 hover:bg-red-200/60 rounded-lg transition"
                title="เพิ่ม 5 วัน"
              >
                +5
              </button>
            </div>
          </div>

          {/* 2. ลากิจส่วนตัว */}
          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">ลากิจส่วนตัว</h4>
                <p className="text-xs text-slate-500">เกณฑ์มาตรฐาน 15 วัน/ปี</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setPersonalDays((d) => Math.max(0, d - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 font-bold active:scale-95 transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="0"
                step="0.5"
                value={personalDays}
                onChange={(e) => setPersonalDays(e.target.value)}
                className="w-16 h-8 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-800"
              />
              <button
                type="button"
                onClick={() => setPersonalDays((d) => Number(d) + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 font-bold active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPersonalDays((d) => Number(d) + 5)}
                className="px-2 h-8 text-xs font-bold text-amber-800 bg-amber-100/60 hover:bg-amber-200/60 rounded-lg transition"
                title="เพิ่ม 5 วัน"
              >
                +5
              </button>
            </div>
          </div>

          {/* 3. ลาพักผ่อน (มีวันสะสม) */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">ลาพักผ่อน</h4>
                <p className="text-xs text-slate-500">สิทธิ์ปกติ 10 วัน/ปี + สะสมได้สูงสุด 30 วัน</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setVacationDays((d) => Math.max(0, d - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 font-bold active:scale-95 transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="0"
                step="0.5"
                value={vacationDays}
                onChange={(e) => setVacationDays(e.target.value)}
                className="w-16 h-8 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-800"
              />
              <button
                type="button"
                onClick={() => setVacationDays((d) => Number(d) + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 font-bold active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setVacationDays((d) => Number(d) + 10)}
                className="px-2 h-8 text-xs font-bold text-emerald-800 bg-emerald-100/60 hover:bg-emerald-200/60 rounded-lg transition"
                title="เพิ่มวันสะสม 10 วัน"
              >
                +10
              </button>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่ามาตรฐาน</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-800 hover:bg-red-900 rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? "กำลังบันทึก..." : "บันทึกวันลา"}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
