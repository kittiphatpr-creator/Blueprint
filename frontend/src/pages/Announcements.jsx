import { useState, useEffect } from "react";
import { announcementService } from "../services/announcementService";
import { useAuth } from "../context/AuthContext";
import { canManageAnnouncements } from "../utils/permissions";
import { formatThaiDate, formatThaiDateTime } from "../utils/dateUtils";
import Modal from "../components/Modal";
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Eye,
  ImageIcon,
  UploadCloud,
  X,
  FileText,
  Paperclip,
  Download,
} from "lucide-react";

// บีบอัดและย่อขนาดรูปภาพแบนเนอร์ข่าวเป็น Base64 (~50-90KB) เพื่อให้บันทึกถาวรลงในฐานข้อมูลและ local cache
function compressImage(file, maxWidth = 1000, quality = 0.82) {
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

export default function Announcements() {
  const { user } = useAuth();
  const canManage = canManageAnnouncements(user?.role);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [viewItem, setViewItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    title: "",
    content: "",
    image_url: "",
    attachment_url: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const serverData = await announcementService.getAnnouncements();
      const localDataRaw = localStorage.getItem("ksu_custom_announcements");
      const localData = localDataRaw ? JSON.parse(localDataRaw) : [];

      // ตรวจสอบข่าวที่ผู้ใช้เคยสร้างไว้ แต่เซิร์ฟเวอร์ยังไม่มี (เกิดจาก Render Free รีเซ็ตคอนเทนเนอร์)
      const missingOnServer = localData.filter(
        (localItem) => !serverData.some((s) => s.title === localItem.title)
      );

      if (missingOnServer.length > 0) {
        // นำข่าวที่อยู่ใน Cache มารวมแสดงผลทันที ข่าวจะไม่มีวันหายไปจากหน้าจอ
        const mergedMap = new Map();
        [...missingOnServer, ...serverData].forEach((item) => {
          mergedMap.set(item.title, item);
        });
        const mergedList = Array.from(mergedMap.values());
        setAnnouncements(mergedList);

        // หากเป็น Admin/Staff ให้ทำการส่งไปกู้คืน (Self-Healing Sync) ลงเซิร์ฟเวอร์ให้อัตโนมัติ
        if (canManage) {
          for (const item of missingOnServer) {
            try {
              await announcementService.createAnnouncement({
                title: item.title,
                content: item.content,
                image_url: item.image_url || null,
                attachment_url: item.attachment_url || null,
              });
            } catch (syncErr) {
              console.warn("Auto-healing sync error:", syncErr);
            }
          }
          const refreshed = await announcementService.getAnnouncements();
          setAnnouncements(refreshed);
        }
      } else {
        setAnnouncements(serverData);
        // บันทึกเฉพาะข่าวที่สร้างเพิ่มเติม (id > 3) ลง cache ไว้สำรอง
        const nonSeed = serverData.filter((s) => s.id > 3);
        if (nonSeed.length > 0) {
          localStorage.setItem("ksu_custom_announcements", JSON.stringify(nonSeed));
        }
      }
    } catch (err) {
      console.error(err);
      // หากเชื่อมต่อเซิร์ฟเวอร์ไม่ได้หรือกำลังตื่น แสดงข้อมูลจาก Local Cache ทันที
      const localDataRaw = localStorage.getItem("ksu_custom_announcements");
      if (localDataRaw) {
        setAnnouncements(JSON.parse(localDataRaw));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({ id: null, title: "", content: "", image_url: "", attachment_url: "" });
    setImageFile(null);
    setImagePreview("");
    setAttachmentFile(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      content: item.content,
      image_url: item.image_url || "",
      attachment_url: item.attachment_url || "",
    });
    setImageFile(null);
    setImagePreview(item.image_url || "");
    setAttachmentFile(null);
    setIsFormOpen(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setMessage({ text: "กรุณาเลือกไฟล์รูปภาพเท่านั้น (.jpg, .png, .webp)", type: "error" });
        return;
      }
      try {
        const compressedBase64 = await compressImage(file, 1000, 0.82);
        setImagePreview(compressedBase64);
        setFormData((prev) => ({ ...prev, image_url: compressedBase64 }));
        setImageFile(file);
      } catch (err) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, image_url: "" }));
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setMessage({ text: "ขนาดไฟล์เอกสารต้องไม่เกิน 25MB", type: "error" });
        return;
      }
      setAttachmentFile(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setFormData((prev) => ({ ...prev, attachment_url: "" }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage({ text: "", type: "" });

    try {
      let finalImageUrl = formData.image_url;
      if (imageFile && imagePreview && imagePreview.startsWith("data:image/")) {
        finalImageUrl = imagePreview;
      }

      let res;
      if (attachmentFile) {
        const payload = new FormData();
        payload.append("title", formData.title);
        payload.append("content", formData.content);
        payload.append("image_url", finalImageUrl || "");
        payload.append("attachment", attachmentFile);

        if (isEditMode) {
          res = await announcementService.updateAnnouncement(formData.id, payload);
        } else {
          res = await announcementService.createAnnouncement(payload);
        }
      } else {
        const payload = {
          title: formData.title,
          content: formData.content,
          image_url: finalImageUrl || null,
          attachment_url: formData.attachment_url || null,
        };

        if (isEditMode) {
          res = await announcementService.updateAnnouncement(formData.id, payload);
        } else {
          res = await announcementService.createAnnouncement(payload);
        }
      }

      // บันทึกลง Local Storage ทันที เพื่อให้ข่าวไม่หายแม้เซิร์ฟเวอร์จะหลับหรือรีเซ็ต
      const savedItem = {
        id: res?.id || Date.now(),
        title: formData.title,
        content: formData.content,
        image_url: finalImageUrl || null,
        attachment_url: res?.attachment_url || formData.attachment_url || null,
        created_at: res?.created_at || new Date().toISOString(),
        posted_by_name: res?.posted_by_name || user?.full_name || "ผู้ดูแลระบบ",
      };

      const localDataRaw = localStorage.getItem("ksu_custom_announcements");
      let localData = localDataRaw ? JSON.parse(localDataRaw) : [];

      if (isEditMode) {
        localData = localData.map((item) => (item.id === formData.id || item.title === formData.title ? savedItem : item));
      } else {
        localData = [savedItem, ...localData.filter((item) => item.title !== formData.title)];
      }
      localStorage.setItem("ksu_custom_announcements", JSON.stringify(localData));

      setMessage({ text: isEditMode ? "อัปเดตประกาศเรียบร้อยแล้ว" : "เพิ่มประกาศใหม่เรียบร้อยแล้ว", type: "success" });
      setIsFormOpen(false);
      loadAnnouncements();
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกประกาศ",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await announcementService.deleteAnnouncement(id);
      // นำออกจาก Local Cache ด้วย
      const localDataRaw = localStorage.getItem("ksu_custom_announcements");
      if (localDataRaw) {
        const localData = JSON.parse(localDataRaw);
        const filtered = localData.filter((item) => item.id !== id);
        localStorage.setItem("ksu_custom_announcements", JSON.stringify(filtered));
      }
      setMessage({ text: "ลบประกาศเรียบร้อยแล้ว", type: "success" });
      setDeleteConfirmId(null);
      loadAnnouncements();
    } catch (err) {
      setMessage({ text: "ไม่สามารถลบประกาศได้", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ข่าวสารและประกาศคณะวิศวกรรมศาสตร์
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            ศูนย์รวมข่าวประชาสัมพันธ์ กิจกรรม และประกาศอย่างเป็นทางการของคณะ
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-sm shadow-md shadow-red-900/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            สร้างประกาศใหม่
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
            {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ text: "", type: "" })} className="text-xs font-semibold underline">
            ปิด
          </button>
        </div>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">ยังไม่มีประกาศข่าวสาร</h3>
          <p className="text-xs text-slate-600 mt-1">ติดตามข่าวสารอัปเดตใหม่ๆ ได้ที่นี่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Optional Announcement Banner Image */}
                {item.image_url && (
                  <div
                    onClick={() => setViewItem(item)}
                    className="mb-4 -mx-2 -mt-2 rounded-2xl overflow-hidden bg-slate-100 max-h-48 border border-slate-100 cursor-pointer group"
                  >
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-40 sm:h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatThaiDate(item.created_at, true)}</span>
                  </div>
                  <span className="font-semibold text-slate-700">{item.posted_by_name || "คณะวิศวกรรมศาสตร์"}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 hover:text-red-800 transition">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 mt-2.5 line-clamp-4 leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>

                {item.attachment_url && (
                  <div className="mt-3">
                    <a
                      href={item.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/70 text-xs font-semibold transition"
                      title="ดาวน์โหลดเอกสารแนบ"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        เอกสารแนบ: {decodeURIComponent(item.attachment_url.split("/").pop() || "เอกสาร")}
                      </span>
                      <Download className="w-3 h-3 text-amber-700 shrink-0 ml-0.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setViewItem(item)}
                  className="text-xs font-bold text-red-800 hover:text-red-900 flex items-center gap-1 py-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  อ่านรายละเอียด
                </button>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="แก้ไขประกาศ"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="ลบประกาศ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Read Modal */}
      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title="ประกาศข่าวสาร"
        maxWidth="max-w-xl"
      >
        {viewItem && (
          <div className="space-y-4">
            {viewItem.image_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 max-h-96">
                <img
                  src={viewItem.image_url}
                  alt={viewItem.title}
                  className="w-full max-h-96 object-contain mx-auto"
                />
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{viewItem.title}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-600 mt-2">
                <span>เผยแพร่เมื่อ: {formatThaiDateTime(viewItem.created_at)}</span>
                <span>ผู้ประกาศ: {viewItem.posted_by_name || "คณะวิศวกรรมศาสตร์"}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
              {viewItem.content}
            </div>

            {viewItem.attachment_url && (
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {decodeURIComponent(viewItem.attachment_url.split("/").pop() || "เอกสารแนบ")}
                    </p>
                    <p className="text-[11px] text-slate-500">เอกสารแนบประกอบประกาศ</p>
                  </div>
                </div>
                <a
                  href={viewItem.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดเอกสาร</span>
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditMode ? "แก้ไขประกาศข่าวสาร" : "สร้างประกาศข่าวสารใหม่"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              หัวข้อข่าวสาร / ประกาศ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ระบุหัวข้อประกาศ..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              เนื้อหาประกาศ <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              placeholder="ระบุรายละเอียดเนื้อหาประกาศ..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>

          {/* Image Upload Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              รูปภาพประกอบประกาศ <span className="text-slate-400 font-normal">(ถ้ามี)</span>
            </label>

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                <img
                  src={imagePreview}
                  alt="ตัวอย่างรูปประกาศ"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition"
                  title="ลบรูปภาพ"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-red-400 bg-slate-50 hover:bg-red-50/30 rounded-2xl p-5 cursor-pointer transition text-center group">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-red-900">
                  คลิกเพื่อเลือกไฟล์รูปภาพ
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  รองรับไฟล์ PNG, JPG, JPEG, WebP (ไม่เกิน 10MB)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Document Attachment Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              เอกสารแนบประกอบประกาศ <span className="text-slate-400 font-normal">(ถ้ามี)</span>
            </label>

            {attachmentFile || formData.attachment_url ? (
              <div className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {attachmentFile
                        ? attachmentFile.name
                        : decodeURIComponent(formData.attachment_url.split("/").pop() || "เอกสารแนบ")}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {attachmentFile
                        ? `${(attachmentFile.size / (1024 * 1024)).toFixed(2)} MB (พร้อมอัปโหลด)`
                        : "เอกสารแนบเดิม"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                  title="นำเอกสารออก"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/30 rounded-2xl p-4 cursor-pointer transition text-center group">
                <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-amber-100 text-slate-500 group-hover:text-amber-800 flex items-center justify-center mb-1.5 transition">
                  <Paperclip className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-amber-900">
                  คลิกเพื่อแนบไฟล์เอกสาร
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  รองรับ PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP (ไม่เกิน 25MB)
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              {actionLoading ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "เผยแพร่ประกาศ"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="ยืนยันการลบประกาศ"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">คุณต้องการลบประกาศนี้ใช่หรือไม่?</p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => handleDelete(deleteConfirmId)}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
            >
              {actionLoading ? "กำลังลบ..." : "ยืนยันการลบ"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
