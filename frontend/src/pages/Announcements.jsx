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
} from "lucide-react";

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
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await announcementService.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({ id: null, title: "", content: "", image_url: "" });
    setImageFile(null);
    setImagePreview("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setFormData({
      id: item.id,
      title: item.title,
      content: item.content,
      image_url: item.image_url || "",
    });
    setImageFile(null);
    setImagePreview(item.image_url || "");
    setIsFormOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ text: "ขนาดไฟล์รูปภาพต้องไม่เกิน 10MB", type: "error" });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, image_url: "" }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage({ text: "", type: "" });

    try {
      let payload;
      if (imageFile) {
        payload = new FormData();
        payload.append("title", formData.title);
        payload.append("content", formData.content);
        payload.append("image", imageFile);
      } else {
        payload = {
          title: formData.title,
          content: formData.content,
          image_url: imagePreview ? formData.image_url : null,
        };
      }

      if (isEditMode) {
        await announcementService.updateAnnouncement(formData.id, payload);
        setMessage({ text: "อัปเดตประกาศเรียบร้อยแล้ว", type: "success" });
      } else {
        await announcementService.createAnnouncement(payload);
        setMessage({ text: "เพิ่มประกาศใหม่เรียบร้อยแล้ว", type: "success" });
      }
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
