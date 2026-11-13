import React from "react";
import { Printer, X, CheckCircle, Building, FileText } from "lucide-react";
import { formatThaiDate, formatThaiDateTime } from "../utils/dateUtils";
import { printOfficialDocument, generateLeaveRequestHTML } from "../utils/printDoc";

export default function OfficialLeaveFormModal({ isOpen, onClose, request, user }) {
  if (!isOpen || !request) return null;

  const handlePrint = () => {
    const html = generateLeaveRequestHTML(request, user);
    printOfficialDocument(html, `แบบใบลา_${request.full_name || "บุคลากร"}_มกส`);
  };

  const reqUser = request.user || user || {};
  const isApproved = request.status === "approved";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-base">แบบฟอร์มใบลาทางการ (Official Leave Form)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร / บันทึกเป็น PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Preview Container */}
        <div className="p-6 sm:p-10 overflow-y-auto font-sans text-slate-800 bg-slate-100">
          <div className="border border-slate-300 p-8 rounded-2xl bg-white shadow-sm leading-relaxed text-slate-900">
            {/* Header / University Banner */}
            <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <img
                  src="/logo.png"
                  alt="ตราคณะ"
                  className="w-10 h-10 object-contain"
                />
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  มหาวิทยาลัยกาฬสินธุ์
                </h1>
              </div>
              <h2 className="text-xs font-semibold text-slate-700">
                คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม
              </h2>
              <div className="inline-block mt-2 px-3 py-0.5 bg-slate-100 border border-slate-300 rounded-md">
                <span className="text-xs font-bold text-slate-900">
                  แบบใบลา ({request.leave_type_name || "การลา"})
                </span>
              </div>
            </div>

            {/* Document Meta Info */}
            <div className="flex justify-between items-start text-xs mb-4 text-slate-700">
              <div>
                <p><strong>เลขที่คำขอ:</strong> ENG-LV-{String(request.id).padStart(5, "0")}</p>
                <p><strong>เขียนที่:</strong> คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม</p>
              </div>
              <div className="text-right">
                <p><strong>วันที่ยื่นคำขอ:</strong> {formatThaiDate(request.created_at || new Date())}</p>
              </div>
            </div>

            {/* Salutation */}
            <div className="mb-3 text-xs text-slate-800">
              <p><strong>เรื่อง:</strong> ขออนุญาต{request.leave_type_name}</p>
              <p className="mt-0.5"><strong>เรียน:</strong> คณบดีคณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม (ผ่านหัวหน้าสาขาวิชา)</p>
            </div>

            {/* Body Content */}
            <div className="space-y-2 text-xs text-slate-800 leading-relaxed indent-8 text-justify">
              <p>
                ข้าพเจ้า <strong>{reqUser.full_name || request.full_name || "บุคลากร"}</strong> รหัสประจำตัว{" "}
                <strong>{reqUser.employee_code || request.employee_code || "-"}</strong> ตำแหน่ง{" "}
                <strong>{reqUser.position || request.position || "อาจารย์/บุคลากร"}</strong> สังกัด{" "}
                <strong>{reqUser.department_name || request.department_name || "คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม"}</strong> มีความประสงค์ขอ{" "}
                <strong>{request.leave_type_name}</strong> เนื่องจาก <strong>{request.reason || "มีภารกิจจำเป็น"}</strong>
              </p>
              <p>
                โดยขอลาตั้งแต่วันที่ <strong>{formatThaiDate(request.start_date)}</strong> ถึงวันที่{" "}
                <strong>{formatThaiDate(request.end_date)}</strong> มีกำหนด <strong>{Number(request.days_count)} วันทำการ</strong>
              </p>
              <p>
                ในระหว่างการลานี้ ข้าพเจ้าสามารถติดต่อได้ที่เบอร์โทรศัพท์ <strong>{reqUser.phone || request.phone || "08x-xxx-xxxx"}</strong> หรืออีเมล{" "}
                <strong>{reqUser.email || request.email || "-"}</strong>
              </p>
            </div>

            {/* Applicant Signature */}
            <div className="mt-4 flex justify-end text-xs text-slate-800">
              <div className="text-center w-56">
                <p className="border-b border-dotted border-slate-400 pb-1 font-semibold">
                  ( {reqUser.full_name || request.full_name || "...................................................."} )
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">ผู้ขอลา (ลงนามอิเล็กทรอนิกส์)</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  วันที่ {formatThaiDate(request.created_at || new Date())}
                </p>
              </div>
            </div>

            {/* Approvals Section / Sign-off Boxes */}
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
              {/* Box 1: Head of Department */}
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                <p className="font-bold text-slate-900 mb-1">๑. ความเห็นของหัวหน้าสาขาวิชา</p>
                <div className="space-y-0.5 text-slate-700 text-[11px]">
                  <p className="flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-600 inline-block bg-slate-800"></span>
                    <span>เห็นควรอนุญาต</span>
                  </p>
                  <p className="text-slate-500 italic">
                    "ได้ตรวจสอบตารางปฏิบัติงานแล้ว ไม่กระทบต่อการเรียนการสอน"
                  </p>
                </div>
                <div className="mt-4 text-center">
                  <p className="font-semibold text-slate-800 text-xs">
                    {request.approver_name || "รศ.ดร.วิศวกิจ นวัตกรรม"}
                  </p>
                  <p className="text-[10px] text-slate-500">หัวหน้าสาขาวิชา</p>
                </div>
              </div>

              {/* Box 2: Dean / Final Order */}
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 relative overflow-hidden">
                {isApproved && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold border border-emerald-300">
                    <CheckCircle className="w-2.5 h-2.5" />
                    <span>อนุมัติในระบบแล้ว</span>
                  </div>
                )}
                <p className="font-bold text-slate-900 mb-1">๒. คำสั่งคณบดี / ผู้มีอำนาจ</p>
                <div className="space-y-0.5 text-slate-700 text-[11px]">
                  <p className="flex items-center gap-1.5 font-semibold text-emerald-800">
                    <span className="w-2.5 h-2.5 rounded-full border border-emerald-600 inline-block bg-emerald-600"></span>
                    <span>{isApproved ? "อนุมัติ" : "รอการอนุมัติ"}</span>
                  </p>
                  {request.approved_at && (
                    <p className="text-[10px] text-slate-500">
                      อนุมัติเมื่อ: {formatThaiDateTime(request.approved_at)}
                    </p>
                  )}
                </div>
                <div className="mt-4 text-center">
                  <p className="font-semibold text-slate-800 text-xs">
                    {request.approver_name || "คณบดีคณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    คณบดีคณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม
                  </p>
                </div>
              </div>
            </div>

            {/* Form Footer Stamp */}
            <div className="mt-4 text-center text-[9px] text-slate-400 border-t border-slate-100 pt-2">
              เอกสารนี้สร้างขึ้นโดยระบบสารสนเทศบุคลากรและการลางานออนไลน์ มหาวิทยาลัยกาฬสินธุ์ (Electronic Form Verified)
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-xs shadow-md shadow-red-900/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ สั่งพิมพ์เอกสาร / ดาวน์โหลด PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
