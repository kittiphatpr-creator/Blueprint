import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { leaveService } from "../services/leaveService";
import { useAuth } from "../context/AuthContext";
import LeaveBalanceCard from "../components/LeaveBalanceCard";
import { calculateDays, toISODateString } from "../utils/dateUtils";
import {
  FilePlus2,
  Calendar,
  Clock,
  Paperclip,
  CheckCircle,
  AlertCircle,
  FileText,
  Info,
  UploadCloud,
  X,
  Image as ImageIcon,
} from "lucide-react";

// บีบอัดรูปภาพเอกสารแนบ/ใบรับรองแพทย์ให้คมชัดแต่ขนาดเบา เพื่อเก็บเป็น Base64
function compressImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function LeaveRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(true);

  // Form State
  const today = toISODateString(new Date());
  const [formData, setFormData] = useState({
    leave_type_id: "1",
    start_date: today,
    end_date: today,
    reason: "",
    attachment_url: "",
  });

  const [daysCount, setDaysCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // File Upload State
  const [attachmentMode, setAttachmentMode] = useState("file"); // "file" | "url"
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [fileLoading, setFileLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setMessage({ text: "ขนาดไฟล์ต้องไม่เกิน 15MB", type: "error" });
      return;
    }

    setFileLoading(true);
    setMessage({ text: "", type: "" });

    try {
      if (file.type.startsWith("image/")) {
        const compressed = await compressImage(file, 1200, 0.82);
        setSelectedFile(file);
        setFilePreview(compressed);
        setFormData((prev) => ({ ...prev, attachment_url: compressed }));
      } else {
        const dataUrl = await readAsDataURL(file);
        setSelectedFile(file);
        setFilePreview(file.type === "application/pdf" ? "pdf" : "doc");
        setFormData((prev) => ({ ...prev, attachment_url: dataUrl }));
      }
    } catch (err) {
      setMessage({ text: "ไม่สามารถประมวลผลไฟล์ได้ กรุณาลองใหม่อีกครั้ง", type: "error" });
    } finally {
      setFileLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview("");
    setFormData((prev) => ({ ...prev, attachment_url: "" }));
  };

  const loadBalances = async () => {
    try {
      const data = await leaveService.getMyLeaveBalance();
      setBalances(data);
      if (data.length > 0 && !formData.leave_type_id) {
        setFormData((prev) => ({ ...prev, leave_type_id: String(data[0].leave_type_id) }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBalances(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  // Recalculate days count whenever dates change
  useEffect(() => {
    const days = calculateDays(formData.start_date, formData.end_date);
    setDaysCount(days);
  }, [formData.start_date, formData.end_date]);

  const selectedBalance = balances.find((b) => String(b.leave_type_id) === String(formData.leave_type_id));
  const isOverBalance = selectedBalance && daysCount > selectedBalance.remaining_days;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (daysCount <= 0) {
      setMessage({ text: "ช่วงวันที่ลาไม่ถูกต้อง (วันเริ่มต้นต้องมาก่อนหรือตรงกับวันสิ้นสุด)", type: "error" });
      return;
    }

    if (isOverBalance) {
      setMessage({
        text: `จำนวนวันลาที่ขอ (${daysCount} วัน) เกินกว่าวันลาคงเหลือ (${selectedBalance.remaining_days} วัน)`,
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    setMessage({ text: "", type: "" });

    try {
      await leaveService.createLeaveRequest({
        leave_type_id: parseInt(formData.leave_type_id, 10),
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_count: daysCount,
        reason: formData.reason,
        attachment_url: formData.attachment_url || null,
      });

      setMessage({
        text: "ยื่นคำขอลางานเรียบร้อยแล้ว ระบบได้ส่งการแจ้งเตือนไปยังผู้มีอำนาจอนุมัติ",
        type: "success",
      });

      setTimeout(() => {
        navigate("/leave-history");
      }, 1500);
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการส่งคำขอลา",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">ยื่นคำขอลางานออนไลน์</h1>
        <p className="text-sm text-slate-600 mt-1">
          กรอกแบบฟอร์มเพื่อส่งคำขอลาไปยังหัวหน้าสาขาวิชาหรือผู้มีอำนาจอนุมัติ (ระบบ Paperless)
        </p>
      </div>

      {/* Leave Balances Status */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          ยอดวันลาคงเหลือของคุณในปีปัจจุบัน
        </h2>
        {loadingBalances ? (
          <div className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {balances.map((b) => (
              <LeaveBalanceCard key={b.leave_type_id} balance={b} />
            ))}
          </div>
        )}
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">
                {message.type === "success" ? "ส่งคำขอสำเร็จ" : "ข้อผิดพลาด"}
              </p>
              <p className="text-xs mt-0.5">{message.text}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. ประเภทการลา */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. เลือกประเภทการลา <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {balances.map((b) => (
                <label
                  key={b.leave_type_id}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                    String(formData.leave_type_id) === String(b.leave_type_id)
                      ? "border-red-800 bg-red-50/50 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="leave_type_id"
                      value={b.leave_type_id}
                      checked={String(formData.leave_type_id) === String(b.leave_type_id)}
                      onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                      className="text-red-800 focus:ring-red-800"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{b.leave_type_name}</p>
                      <p className="text-xs text-slate-600">คงเหลือ {Number(b.remaining_days)} วัน</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 2. ช่วงวันที่ลา */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                2. วันที่เริ่มต้นลา <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                วันที่สิ้นสุดลา <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  min={formData.start_date}
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                />
              </div>
            </div>
          </div>

          {/* Calculation Display Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              isOverBalance
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-500" />
              <div>
                <span className="text-xs text-slate-600 block">จำนวนวันที่ขอลาทั้งหมด</span>
                <span className="text-lg font-bold">
                  {daysCount > 0 ? `${daysCount} วัน` : "ระบุวันที่ไม่ถูกต้อง"}
                </span>
              </div>
            </div>

            {selectedBalance && (
              <div className="text-right text-xs">
                <span className="block text-slate-600">คงเหลือหลังอนุมัติ (โดยประมาณ)</span>
                <span
                  className={`font-bold ${
                    isOverBalance ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {isOverBalance ? "สิทธิ์ไม่เพียงพอ" : `${Number(selectedBalance.remaining_days - daysCount)} วัน`}
                </span>
              </div>
            )}
          </div>

          {/* 3. เหตุผลการลา */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              3. เหตุผลความจำเป็นในการลา <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="ระบุเหตุผลความจำเป็นในการลา เช่น มีไข้หวัดสูง, ไปติดต่อราชการ, พักผ่อนประจำปี..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
            />
          </div>

          {/* 4. เอกสารแนบ / ใบรับรองแพทย์ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. เอกสารแนบ / ใบรับรองแพทย์ (ถ้ามี)
              </label>

              {/* Toggle ระหว่าง อัปโหลดไฟล์ กับ ระบุลิงก์ */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAttachmentMode("file")}
                  className={`px-3 py-1 rounded-lg transition ${
                    attachmentMode === "file"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  อัปโหลดไฟล์
                </button>
                <button
                  type="button"
                  onClick={() => setAttachmentMode("url")}
                  className={`px-3 py-1 rounded-lg transition ${
                    attachmentMode === "url"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ระบุ URL ลิงก์
                </button>
              </div>
            </div>

            {attachmentMode === "file" ? (
              <div>
                {!selectedFile && !formData.attachment_url ? (
                  <label className="border-2 border-dashed border-slate-200 hover:border-red-800/40 hover:bg-red-50/20 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-800 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      รองรับรูปภาพใบรับรองแพทย์ (.jpg, .png, .webp) หรือไฟล์ PDF (ขนาดไม่เกิน 15MB)
                    </span>
                  </label>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {filePreview && filePreview.startsWith("data:image/") ? (
                        <img
                          src={filePreview}
                          alt="preview"
                          className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-red-100 text-red-800 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {selectedFile ? selectedFile.name : "ไฟล์เอกสารแนบ"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedFile
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                            : "พร้อมส่งร่วมกับคำขอลา"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition">
                        เปลี่ยนไฟล์
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="ลบไฟล์"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Paperclip className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="ระบุ URL ลิงก์เอกสาร เช่น Google Drive, OneDrive หรือ URL ภายนอก"
                  value={formData.attachment_url}
                  onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                />
              </div>
            )}

            <p className="text-[11px] text-slate-600">
              * กรณีลาป่วยตั้งแต่ 3 วันขึ้นไป โปรดแนบใบรับรองแพทย์ตามระเบียบมหาวิทยาลัย
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || isOverBalance || daysCount <= 0}
              className="px-6 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-sm shadow-md shadow-red-900/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FilePlus2 className="w-4 h-4" />
                  ส่งคำขอลางาน
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
