import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { RoleBadge } from "../components/Badge";
import {
  User,
  Lock,
  Mail,
  Phone,
  Building,
  Key,
  CheckCircle,
  AlertCircle,
  Save,
  Camera,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

// บีบอัดและย่อขนาดรูปภาพเป็น Base64 จตุรัสคุณภาพสูง (~25-35KB) เพื่อบันทึกลงฐานข้อมูลและแคชแบบถาวร
function compressImage(file, targetSize = 360, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export default function Profile() {
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef(null);

  // Avatar State (ดึงจาก user หรือ local storage อัตโนมัติ)
  const [avatarPreview, setAvatarPreview] = useState(() => {
    return user?.profile_image || (user?.email ? localStorage.getItem("profile_avatar_" + user.email.toLowerCase()) : null);
  });
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ text: "", type: "" });

  // ติดตามและกู้คืนรูปโปรไฟล์หากเซิร์ฟเวอร์รีเซ็ต
  useEffect(() => {
    if (user?.email) {
      const cached = localStorage.getItem("profile_avatar_" + user.email.toLowerCase());
      if (user.profile_image) {
        setAvatarPreview(user.profile_image);
        localStorage.setItem("profile_avatar_" + user.email.toLowerCase(), user.profile_image);
      } else if (cached) {
        setAvatarPreview(cached);
        updateUserProfile({ ...user, profile_image: cached });
        authService.uploadAvatar({ profile_image: cached }).catch(() => {});
      }
    }
  }, [user?.email, user?.profile_image]);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    position: user?.position || "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });

  // Password Form State
  const [pwData, setPwData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: "", type: "" });

  // Handle Avatar Selection & Upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setAvatarMsg({ text: "กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น (.png, .jpg, .jpeg, .webp)", type: "error" });
      return;
    }

    setAvatarLoading(true);
    setAvatarMsg({ text: "", type: "" });

    try {
      // 1. บีบอัดรูปภาพเป็น Base64 คุณภาพสูง ขนาดเล็ก (~30KB)
      const compressedBase64 = await compressImage(file, 360, 0.85);

      // 2. แสดงตัวอย่างทันที
      setAvatarPreview(compressedBase64);

      // 3. บันทึกลง Local Storage ทันที ป้องกันการสูญหายเมื่อรีโหลดหรือออกเข้าใหม่
      if (user?.email) {
        localStorage.setItem("profile_avatar_" + user.email.toLowerCase(), compressedBase64);
      }

      // 4. บันทึกลงฐานข้อมูลทั้งสองทาง (Base64 JSON + Multipart)
      const res = await authService.uploadAvatar({ profile_image: compressedBase64 });
      updateUserProfile(res.user);
      setAvatarMsg({ text: "เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว!", type: "success" });
    } catch (err) {
      console.error(err);
      setAvatarMsg({
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ",
        type: "error",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ text: "", type: "" });

    try {
      const res = await authService.updateProfile(profileData);
      updateUserProfile(res.user);
      setProfileMsg({ text: "อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว", type: "success" });
    } catch (err) {
      setProfileMsg({
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล",
        type: "error",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwMsg({ text: "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน", type: "error" });
      return;
    }

    setPwLoading(true);
    setPwMsg({ text: "", type: "" });

    try {
      await authService.changePassword(pwData.currentPassword, pwData.newPassword);
      setPwMsg({ text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว", type: "success" });
      setPwData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwMsg({
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน",
        type: "error",
      });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">ข้อมูลส่วนตัว (Profile)</h1>
        <p className="text-sm text-slate-600 mt-1">
          จัดการข้อมูลการติดต่อ สังกัด รูปโปรไฟล์ และความปลอดภัยของบัญชีผู้ใช้งาน
        </p>
      </div>

      {/* User Card Overview with Avatar Upload Button */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar Container with Camera Hover Action */}
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt={user?.full_name}
              className="w-24 h-24 rounded-3xl object-cover shadow-lg border-2 border-red-800/30"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-800 to-slate-900 text-white font-black text-4xl flex items-center justify-center shadow-lg shadow-red-950/10 shrink-0">
              {user?.full_name?.charAt(0) || "U"}
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold">
            <Camera className="w-6 h-6 mb-1 text-red-200" />
            <span>เปลี่ยนรูป</span>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        <div className="text-center sm:text-left space-y-2 flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-slate-900">{user?.full_name}</h2>
            <RoleBadge role={user?.role} />
          </div>
          <p className="text-xs text-slate-600 font-mono">รหัสบุคลากร: {user?.employee_code}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
            <span className="flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {user?.department_name || "สำนักงานคณะวิศวกรรมศาสตร์"}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user?.email}
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              {avatarLoading ? "กำลังอัปโหลด..." : "อัปโหลดรูปภาพโปรไฟล์ใหม่"}
            </button>
          </div>

          {avatarMsg.text && (
            <p
              className={`text-xs font-medium mt-1 ${
                avatarMsg.type === "success" ? "text-emerald-600 font-bold" : "text-rose-600"
              }`}
            >
              {avatarMsg.text}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Contact Details Form */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-red-800" />
              <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลติดต่อ</h3>
            </div>

            {profileMsg.text && (
              <div
                className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs ${
                  profileMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {profileMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ตำแหน่ง</label>
                <input
                  type="text"
                  value={profileData.position}
                  onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  type="text"
                  placeholder="08X-XXX-XXXX"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {profileLoading ? "กำลังบันทึก..." : "บันทึกข้อมูลส่วนตัว"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-red-800" />
              <h3 className="text-base font-bold text-slate-900">เปลี่ยนรหัสผ่าน</h3>
            </div>

            {pwMsg.text && (
              <div
                className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs ${
                  pwMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {pwMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{pwMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={pwData.currentPassword}
                  onChange={(e) => setPwData({ ...pwData, currentPassword: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={pwData.newPassword}
                  onChange={(e) => setPwData({ ...pwData, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={pwData.confirmPassword}
                  onChange={(e) => setPwData({ ...pwData, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  {pwLoading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
