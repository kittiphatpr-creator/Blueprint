import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { GoogleLogin } from "@react-oauth/google";
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Building2,
  Briefcase,
  Phone,
  CheckCircle2,
  ArrowLeft,
  BadgeCheck,
} from "lucide-react";

const defaultDepts = [
  { id: 1, name: "ภาควิชาวิศวกรรมคอมพิวเตอร์" },
  { id: 2, name: "ภาควิชาวิศวกรรมไฟฟ้า" },
  { id: 3, name: "ภาควิชาวิศวกรรมโยธา" },
  { id: 4, name: "ภาควิชาวิศวกรรมเครื่องกล" },
  { id: 5, name: "ภาควิชาวิศวกรรมอุตสาหการ" },
  { id: 6, name: "สำนักงานคณบดีคณะวิศวกรรมศาสตร์" },
];

export default function Login() {
  const { login, loginWithGoogle, registerWithGoogle, quickLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Registration Mode State (เมื่อล็อกอิน Google แล้วยังไม่มีในฐานข้อมูล)
  const [registerMode, setRegisterMode] = useState(false);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [regForm, setRegForm] = useState({
    employee_code: "",
    full_name: "",
    department_id: "1",
    position: "อาจารย์",
    role: "lecturer",
    phone: "",
  });

  useEffect(() => {
    authService
      .getDepartments()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDepartments(data);
        }
      })
      .catch(() => {});
  }, []);

  // หากเข้าสู่ระบบแล้ว ให้พาไป Dashboard อัตโนมัติ
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailInput = document.querySelector('input[type="email"]')?.value || email;
    const passwordInput =
      document.querySelector('input[type="password"]')?.value ||
      document.querySelector('input[type="text"]')?.value ||
      password;

    const cleanEmail = (emailInput || email).trim().toLowerCase();
    const cleanPassword = (passwordInput || password).trim();

    try {
      await login(cleanEmail, cleanPassword);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error details:", err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
        setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้ (กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต)");
      } else {
        setError(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const res = await loginWithGoogle(credentialResponse.credential);
      if (res && res.isNewUser) {
        // บัญชีใหม่ -> สลับไปหน้าสมัครสมาชิกทันทีพร้อมดึงข้อมูล Google มาแสดง
        setGoogleProfile(res.googleData);
        setRegForm((prev) => ({
          ...prev,
          full_name: res.googleData.name || "",
          employee_code: "",
        }));
        setRegisterMode(true);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Google login error:", err);
      const errorMsg =
        err.response?.data?.message ||
        "ไม่มีสิทธิ์เข้าสู่ระบบ กรุณาใช้อีเมลมหาวิทยาลัยกาฬสินธุ์ (@ksu.ac.th) เท่านั้น";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!regForm.employee_code.trim()) {
      setError("กรุณากรอกรหัสประจำตัวบุคลากร / รหัสอาจารย์");
      return;
    }
    if (!regForm.full_name.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    setLoading(true);
    try {
      await registerWithGoogle({
        googleData: googleProfile,
        employee_code: regForm.employee_code.trim(),
        full_name: regForm.full_name.trim(),
        department_id: regForm.department_id ? parseInt(regForm.department_id, 10) : 1,
        position: regForm.position.trim(),
        role: regForm.role,
        phone: regForm.phone.trim(),
      });
      navigate("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || err.message || "เกิดข้อผิดพลาดในการลงทะเบียนสมาชิก");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 pb-12">
      <div className="max-w-md w-full">
        {/* Card Header & Brand */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          <div className="bg-gradient-to-br from-red-900 via-red-800 to-slate-900 p-6 sm:p-8 text-white text-center relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-white rounded-2xl flex items-center justify-center p-2 mb-3 sm:mb-4 shadow-lg">
              <img
                src="/logo.png"
                alt="มหาวิทยาลัยกาฬสินธุ์"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">มหาวิทยาลัยกาฬสินธุ์</h2>
            <p className="text-xs sm:text-sm text-red-100/90 mt-1 font-medium">
              คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม
            </p>
            <p className="text-[11px] text-red-200/80 mt-0.5 font-light">
              {registerMode
                ? "ลงทะเบียนสมัครสมาชิกบุคลากรใหม่"
                : "ระบบจัดเก็บข้อมูลบุคลากรและการลางานออนไลน์"}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {registerMode ? "ข้อผิดพลาดในการสมัครสมาชิก" : "ข้อผิดพลาดในการเข้าสู่ระบบ"}
                  </p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {registerMode ? (
              /* ฟอร์มสมัครสมาชิกบุคลากรใหม่ (ข้อมูลบันทึกลงฐานข้อมูล) */
              <div>
                <div className="bg-red-50/70 border border-red-100 rounded-2xl p-3.5 mb-5 flex items-center gap-3">
                  {googleProfile?.picture ? (
                    <img
                      src={googleProfile.picture}
                      alt={googleProfile.name}
                      className="w-12 h-12 rounded-full border-2 border-white shadow-xs object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-800 text-white font-bold flex items-center justify-center text-lg shrink-0">
                      {googleProfile?.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>ยืนยันผ่าน Google แล้ว</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate">{googleProfile?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{googleProfile?.email}</p>
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* รหัสบุคลากร */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      รหัสประจำตัวบุคลากร / รหัสอาจารย์ <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <BadgeCheck className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="เช่น 671540005008 หรือ รหัสบัตรประชาชน"
                        value={regForm.employee_code}
                        onChange={(e) => setRegForm({ ...regForm, employee_code: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                      />
                    </div>
                  </div>

                  {/* ชื่อ-นามสกุล */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      ชื่อ - นามสกุล (ภาษาไทย) <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="เช่น อาจารย์ ดร.สมชาย ใจดี"
                        value={regForm.full_name}
                        onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                      />
                    </div>
                  </div>

                  {/* ภาควิชา / สังกัด */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      สาขาวิชา / ภาควิชา <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <select
                        value={regForm.department_id}
                        onChange={(e) => setRegForm({ ...regForm, department_id: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                      >
                        {(departments.length > 0 ? departments : defaultDepts).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ตำแหน่ง */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      ตำแหน่งทางวิชาการ / สายงาน <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <select
                        value={regForm.position}
                        onChange={(e) => setRegForm({ ...regForm, position: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                      >
                        <option value="อาจารย์">อาจารย์</option>
                        <option value="ผู้ช่วยศาสตราจารย์ (ผศ.)">ผู้ช่วยศาสตราจารย์ (ผศ.)</option>
                        <option value="รองศาสตราจารย์ (รศ.)">รองศาสตราจารย์ (รศ.)</option>
                        <option value="ศาสตราจารย์ (ศ.)">ศาสตราจารย์ (ศ.)</option>
                        <option value="เจ้าหน้าที่สายสนับสนุน / ธุรการ">เจ้าหน้าที่สายสนับสนุน / ธุรการ</option>
                        <option value="นักวิชาการคอมพิวเตอร์">นักวิชาการคอมพิวเตอร์</option>
                        <option value="เจ้าหน้าที่วิชาการ / วิจัย">เจ้าหน้าที่วิชาการ / วิจัย</option>
                      </select>
                    </div>
                  </div>

                  {/* บทบาทในระบบ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      บทบาทในระบบ
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "lecturer", label: "อาจารย์" },
                        { id: "head", label: "หัวหน้าสาขา" },
                        { id: "staff", label: "เจ้าหน้าที่" },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRegForm({ ...regForm, role: r.id })}
                          className={`py-2 px-1 text-xs font-bold rounded-xl border transition text-center ${
                            regForm.role === r.id
                              ? "bg-red-800 text-white border-red-800 shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* เบอร์โทรศัพท์ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        placeholder="เช่น 081-234-5678"
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 py-3 px-4 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-md shadow-red-900/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>บันทึกข้อมูลและสมัครสมาชิก</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Cancel button */}
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterMode(false);
                      setGoogleProfile(null);
                      setError("");
                    }}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>ยกเลิก / กลับไปหน้าเข้าสู่ระบบ</span>
                  </button>
                </form>
              </div>
            ) : (
              /* ฟอร์มเข้าสู่ระบบปกติ */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    อีเมลมหาวิทยาลัยกาฬสินธุ์ (@ksu.ac.th)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-md shadow-red-900/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>เข้าสู่ระบบ</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium shrink-0">หรือ</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Google Sign-In Button */}
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("ไม่มีสิทธิ์เข้าสู่ระบบหรือไม่สามารถยืนยันตัวตนด้วย Google ได้")}
                    text="continue_with"
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    locale="th"
                    width="340"
                    hosted_domain="ksu.ac.th"
                  />
                </div>

                {/* Quick 1-Click Login for Instant Testing */}
                <div className="pt-3 border-t border-slate-100 mt-4">
                  <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider mb-2.5">
                    หรือ ทดลองเข้าสู่ระบบด่วน (คลิกเดียวเข้าได้ทันที)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await quickLogin("lecturer");
                          navigate("/leave-request");
                        } catch (err) {
                          setError("เข้าสู่ระบบไม่สำเร็จ: " + (err.response?.data?.message || err.message));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="p-2.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition shadow-sm text-center flex items-center justify-center gap-1.5"
                    >
                      <span>👨‍🏫 อาจารย์ (ผศ.ดร.สมชาย)</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await quickLogin("head");
                          navigate("/leave-approval");
                        } catch (err) {
                          setError("เข้าสู่ระบบไม่สำเร็จ: " + (err.response?.data?.message || err.message));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="p-2.5 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl border border-purple-200 transition shadow-sm text-center flex items-center justify-center gap-1.5"
                    >
                      <span>👔 หัวหน้าภาค (รออนุมัติ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await quickLogin("admin");
                          navigate("/dashboard");
                        } catch (err) {
                          setError("เข้าสู่ระบบไม่สำเร็จ: " + (err.response?.data?.message || err.message));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="p-2.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-800 rounded-xl border border-red-200 transition shadow-sm text-center col-span-2 flex items-center justify-center gap-1.5"
                    >
                      <span>🛡️ ผู้ดูแลระบบ คณะวิศวะ (Admin)</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          มหาวิทยาลัยกาฬสินธุ์ • คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม
        </p>
      </div>
    </div>
  );
}
