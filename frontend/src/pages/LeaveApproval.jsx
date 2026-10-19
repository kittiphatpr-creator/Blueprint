import { useState, useEffect } from "react";
import { leaveService } from "../services/leaveService";
import { employeeService } from "../services/employeeService";
import { useAuth } from "../context/AuthContext";
import { LeaveStatusBadge } from "../components/Badge";
import Modal from "../components/Modal";
import OfficialLeaveFormModal from "../components/OfficialLeaveFormModal";
import { exportLeaveRequestsToCSV } from "../utils/exportExcel";
import { formatThaiDate, formatThaiDateTime } from "../utils/dateUtils";
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  AlertCircle,
  Check,
  X,
  Eye,
  Printer,
  Download,
} from "lucide-react";

// เปิดดูเอกสารแนบ/ใบรับรองแพทย์อย่างปลอดภัย รองรับทั้ง Base64 และ URL
function openAttachment(url) {
  if (!url) return;
  if (url.startsWith("data:")) {
    try {
      const arr = url.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch {
      window.open(url, "_blank");
    }
  } else {
    window.open(url, "_blank");
  }
}

export default function LeaveApproval() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusTab, setStatusTab] = useState("pending");
  const [selectedDept, setSelectedDept] = useState("");

  // Modals & Action States
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailModalReq, setDetailModalReq] = useState(null);
  const [printRequest, setPrintRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [reqData, deptData] = await Promise.all([
        leaveService.getAllLeaveRequests({
          status: statusTab !== "all" ? statusTab : undefined,
          department_id: selectedDept || undefined,
        }),
        employeeService.getDepartments(),
      ]);
      setRequests(reqData);
      setDepartments(deptData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusTab, selectedDept]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    setMessage({ text: "", type: "" });
    try {
      await leaveService.approveLeaveRequest(id);
      setMessage({ text: "อนุมัติคำขอลางานเรียบร้อยแล้ว", type: "success" });
      loadRequests();
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการอนุมัติ",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModalReq) return;

    setActionLoading(true);
    try {
      await leaveService.rejectLeaveRequest(rejectModalReq.id, rejectReason);
      setMessage({ text: "ปฏิเสธคำขอลางานเรียบร้อยแล้ว", type: "success" });
      setRejectModalReq(null);
      setRejectReason("");
      loadRequests();
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการปฏิเสธ",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    exportLeaveRequestsToCSV(
      requests,
      `รายงานคำขอลางาน_${user?.department_name || "คณะวิศวกรรมศาสตร์"}_มกส.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ระบบพิจารณาอนุมัติการลา
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {user?.role === "head"
              ? `พิจารณาคำขอลาของบุคลากรใน ${user?.department_name || "สาขาวิชาของคุณ"}`
              : "พิจารณาคำขอลาของบุคลากรทั้งคณะวิศวกรรมศาสตร์ (Admin Portal)"}
          </p>
        </div>

        {requests.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-900/20 transition self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออกรายงาน Excel/CSV</span>
          </button>
        )}
      </div>

      {/* Message Toast */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ text: "", type: "" })} className="text-xs font-semibold underline">
            ปิด
          </button>
        </div>
      )}

      {/* Controls Bar: Tabs & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "pending", label: "รอการพิจารณา", icon: Clock },
            { id: "approved", label: "อนุมัติแล้ว", icon: CheckCircle2 },
            { id: "rejected", label: "ไม่อนุมัติ", icon: XCircle },
            { id: "all", label: "ทั้งหมด", icon: CheckSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
                statusTab === tab.id
                  ? "bg-red-800 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {user?.role === "admin" && (
          <div className="w-full sm:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-red-800"
            >
              <option value="">ทุกสาขาวิชา</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Request List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">ไม่มีคำขอลาในหมวดหมู่นี้</h3>
          <p className="text-xs text-slate-600 mt-1">ไม่มีคำขอที่ต้องดำเนินการในขณะนี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center text-lg shrink-0 shadow-xs">
                  {req.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{req.full_name}</h3>
                    <LeaveStatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {req.department_name || "คณะวิศวกรรมศาสตร์"} • {req.position || "อาจารย์"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
                    <span className="font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                      {req.leave_type_name} ({req.days_count} วัน)
                    </span>
                    <span className="text-slate-600">
                      ช่วงวันที่: <strong className="text-slate-800">{formatThaiDate(req.start_date)} - {formatThaiDate(req.end_date)}</strong>
                    </span>
                    <span className="text-slate-600">ยื่นเมื่อ: {formatThaiDateTime(req.created_at)}</span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                    <strong>เหตุผล:</strong> {req.reason || "ไม่ได้ระบุ"}
                  </p>

                  {req.attachment_url && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700">
                      <Paperclip className="w-3.5 h-3.5" />
                      <button
                        type="button"
                        onClick={() => openAttachment(req.attachment_url)}
                        className="underline font-medium hover:text-blue-900 cursor-pointer"
                      >
                        ดูเอกสารแนบ / ใบรับรองแพทย์
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end flex-wrap">
                <button
                  onClick={() => setPrintRequest(req)}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-red-800 hover:bg-red-50 border border-red-200 rounded-xl transition font-medium"
                  title="พิมพ์ใบลาทางการ"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบลา</span>
                </button>

                <button
                  onClick={() => setDetailModalReq(req)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition text-xs font-semibold flex items-center gap-1"
                  title="ดูรายละเอียดเต็ม"
                >
                  <Eye className="w-4 h-4" />
                  <span>ดูข้อมูล</span>
                </button>

                {req.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => setRejectModalReq(req)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      ไม่อนุมัติ
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectModalReq}
        onClose={() => setRejectModalReq(null)}
        title="ระบุเหตุผลที่ไม่อนุมัติคำขอลา"
        maxWidth="max-w-md"
      >
        {rejectModalReq && (
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                ผู้ยื่นคำขอ: {rejectModalReq.full_name} ({rejectModalReq.leave_type_name} {rejectModalReq.days_count} วัน)
              </p>
              <p className="text-xs text-slate-600 mt-1">
                การไม่อนุมัติจะส่งการแจ้งเตือนไปยังผู้ยื่นคำขอพร้อมเหตุผลที่ระบุ
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                เหตุผลที่ไม่อนุมัติ <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="ระบุเหตุผล เช่น ติดภารกิจสอนชดเชย, เอกสารรับรองไม่สมบูรณ์..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                {actionLoading ? "กำลังบันทึก..." : "ยืนยันไม่อนุมัติ"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailModalReq}
        onClose={() => setDetailModalReq(null)}
        title="รายละเอียดคำขอลางาน"
        maxWidth="max-w-lg"
      >
        {detailModalReq && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-xs text-slate-600 block">ผู้ยื่นคำขอ</span>
                <span className="text-base font-bold text-slate-900">{detailModalReq.full_name}</span>
                <span className="text-xs text-slate-600 block">{detailModalReq.department_name}</span>
              </div>
              <LeaveStatusBadge status={detailModalReq.status} className="scale-110" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-600 block">ประเภทการลา</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{detailModalReq.leave_type_name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-600 block">จำนวนวันที่ลา</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{detailModalReq.days_count} วัน</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <span className="text-slate-600 block">ช่วงวันที่ลา</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {formatThaiDate(detailModalReq.start_date)} - {formatThaiDate(detailModalReq.end_date)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <span className="text-slate-600 block">เหตุผลความจำเป็น</span>
                <span className="font-medium text-slate-800 mt-1 block">{detailModalReq.reason || "-"}</span>
              </div>
            </div>

            {detailModalReq.attachment_url && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between text-xs text-blue-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-blue-600" /> เอกสารแนบ / ใบรับรองแพทย์
                </span>
                <button
                  type="button"
                  onClick={() => openAttachment(detailModalReq.attachment_url)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition"
                >
                  เปิดดูเอกสาร
                </button>
              </div>
            )}

            <div className="pt-2 flex justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPrintRequest(detailModalReq);
                  setDetailModalReq(null);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ใบลาทางการ</span>
              </button>

              {detailModalReq.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleApprove(detailModalReq.id);
                      setDetailModalReq(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                  >
                    อนุมัติคำขอนี้
                  </button>
                  <button
                    onClick={() => {
                      const r = detailModalReq;
                      setDetailModalReq(null);
                      setRejectModalReq(r);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
                  >
                    ไม่อนุมัติ
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Official Leave Form Modal */}
      <OfficialLeaveFormModal
        isOpen={!!printRequest}
        onClose={() => setPrintRequest(null)}
        request={printRequest}
      />
    </div>
  );
}
