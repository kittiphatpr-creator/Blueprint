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
  KeyRound,
  ShieldCheck,
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
  const { login, loginWithGoogle, registerWithGoogle, isAuthenticated } = useAuth();
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

  // Forgot Password / OTP Flow States
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: input email, 2: input otp, 3: input new password, 4: success
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [debugOtpHint, setDebugOtpHint] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

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

  // Cooldown countdown สำหรับการส่งรหัส OTP ซ้ำ
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
      setError("กรุณากรอกรหัสประจำตัวบุคลากร");
      return;
    }
    if (!regForm.full_name.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    setLoading(true);
    try {
      await registerWithGoogle({
        googleToken: googleProfile.credential,
        googleData: googleProfile,
        employee_code: regForm.employee_code.trim(),
        full_name: regForm.full_name.trim(),
        department_id: parseInt(regForm.department_id, 10),
        position: regForm.position.trim(),
        role: regForm.role,
        phone: regForm.phone.trim(),
      });
      navigate("/dashboard");
    } catch (err) {
      console.error("Register error:", err);
      setError(err.response?.data?.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Forgot Password / OTP Handlers
  // -------------------------------------------------------------

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setDebugOtpHint("");

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setForgotError("กรุณากรอกอีเมลมหาวิทยาลัย (@ksu.ac.th)");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authService.sendResetOtp(cleanEmail);
      setForgotSuccess(res.message || "ส่งรหัส OTP เรียบร้อยแล้ว");
      if (res.debugOtp) {
        setDebugOtpHint(res.debugOtp);
      }
      setForgotStep(2);
      setResendCooldown(60);
    } catch (err) {
      console.error("sendResetOtp error:", err);
      setForgotError(err.response?.data?.message || "ไม่สามารถส่งรหัส OTP ได้ กรุณาตรวจสอบอีเมลอีกครั้ง");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    const cleanOtp = forgotOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setForgotError("กรุณากรอกรหัส OTP 6 หลักให้ครบถ้วน");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authService.verifyResetOtp(forgotEmail.trim().toLowerCase(), cleanOtp);
      setResetToken(res.resetToken);
      setForgotStep(3);
    } catch (err) {
      console.error("verifyResetOtp error:", err);
      setForgotError(err.response?.data?.message || "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!newPassword || newPassword.length < 6) {
      setForgotError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authService.resetPasswordWithOtp({
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        resetToken,
        newPassword,
      });
      setForgotSuccess(res.message || "เปลี่ยนรหัสผ่านสำเร็จแล้ว!");
      setForgotStep(4);
      setEmail(forgotEmail);
      setPassword(newPassword);
    } catch (err) {
      console.error("resetPasswordWithOtp error:", err);
      setForgotError(err.response?.data?.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotState = () => {
    setForgotMode(false);
    setForgotStep(1);
    setForgotOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError("");
    setForgotSuccess("");
    setDebugOtpHint("");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 transition-all">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-red-800 via-red-900 to-slate-900 p-8 text-center text-white relative">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-white p-2.5 shadow-lg flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="ตรามหาวิทยาลัยกาฬสินธุ์"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>

            {forgotMode ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-2 border border-white/20">
                  <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                  <span>กู้คืนรหัสผ่านด้วย OTP</span>
                </div>
                <h2 className="text-xl font-extrabold tracking-tight">ลืมรหัสผ่าน</h2>
                <p className="text-red-100/80 text-xs mt-1">
                  {forgotStep === 1 && "ขั้นตอนที่ 1 จาก 3: ระบุอีเมลมหาวิทยาลัย"}
                  {forgotStep === 2 && "ขั้นตอนที่ 2 จาก 3: ยืนยันรหัส OTP"}
                  {forgotStep === 3 && "ขั้นตอนที่ 3 จาก 3: กำหนดรหัสผ่านใหม่"}
                  {forgotStep === 4 && "ดำเนินการสำเร็จ"}
                </p>
              </>
            ) : registerMode ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-400/30">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>ยืนยันตัวตนด้วย Google สำเร็จ</span>
                </div>
                <h2 className="text-xl font-extrabold tracking-tight">ลงทะเบียนสมาชิกใหม่</h2>
                <p className="text-red-100/80 text-xs mt-1">
                  กรุณากรอกข้อมูลเพื่อเปิดใช้งานบัญชีบุคลากร
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold tracking-tight">มหาวิทยาลัยกาฬสินธุ์</h2>
                <p className="text-red-100 font-medium text-sm mt-0.5">
                  คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม
                </p>
                <div className="mt-3 inline-block bg-white/10 px-3 py-1 rounded-full text-xs font-medium text-red-100 border border-white/10">
                  ระบบจัดเก็บข้อมูลบุคลากรและการลางานออนไลน์
                </div>
              </>
            )}
          </div>

          <div className="p-8">
            {/* Alert Error Box */}
            {error && !forgotMode && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-3 text-red-700 text-xs leading-relaxed animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">เข้าสู่ระบบไม่สำเร็จ</p>
                  <p className="mt-0.5 text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Alert Forgot Error Box */}
            {forgotError && forgotMode && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs leading-relaxed animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">ข้อผิดพลาด</p>
                  <p className="mt-0.5 text-red-600">{forgotError}</p>
                </div>
              </div>
            )}

            {/* Alert Forgot Success Box */}
            {forgotSuccess && forgotMode && forgotStep !== 4 && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-xs leading-relaxed animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="flex-1">
                  <p className="font-bold">{forgotSuccess}</p>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 1: FORGOT PASSWORD / OTP FLOW */}
            {/* ========================================================= */}
            {forgotMode ? (
              <div>
                {/* STEP 1: ขอรับรหัส OTP ด้วยอีเมล */}
                {forgotStep === 1 && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
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
                          placeholder="phongsakorn.ka@ksu.ac.th"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        ระบบจะทำการส่งรหัสยืนยัน OTP 6 หลัก ไปยังกล่องข้อความอีเมลนี้
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3 px-4 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-md shadow-red-900/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>ส่งรหัสยืนยัน OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={resetForgotState}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>กลับไปหน้าเข้าสู่ระบบ</span>
                    </button>
                  </form>
                )}

                {/* STEP 2: กรอกรหัส OTP 6 หลัก */}
                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="p-3 bg-red-50/60 border border-red-200/80 rounded-2xl text-xs text-slate-700 space-y-1">
                      <p className="font-semibold text-red-900 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-red-700" />
                        <span>ส่งรหัสยืนยัน OTP ไปที่:</span>
                      </p>
                      <p className="font-mono font-bold text-slate-900 pl-5 break-all">
                        {forgotEmail}
                      </p>
                      <p className="text-[11px] text-slate-500 pl-5">
                        รหัสมีอายุการใช้งาน 10 นาที (กรุณาตรวจใน Junk/Spam หากไม่พบ)
                      </p>
                    </div>

                    {/* กล่องตัวช่วย OTP หาก SMTP ยังไม่เปิดใช้งาน */}
                    {debugOtpHint && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold">💡 รหัส OTP สำหรับทดสอบ:</p>
                          <p className="font-mono text-base font-black tracking-widest text-red-800">
                            {debugOtpHint}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForgotOtp(debugOtpHint)}
                          className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          ใส่รหัสนี้ทันที
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                        กรอกรหัส OTP 6 หลัก
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        placeholder="000000"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full py-3.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 text-center text-3xl font-mono font-black tracking-[0.45em] focus:bg-white focus:border-red-800 focus:outline-none transition shadow-inner"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">ไม่ได้รับรหัส OTP?</span>
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || forgotLoading}
                        onClick={handleSendOtp}
                        className="font-bold text-red-800 hover:text-red-900 disabled:text-slate-400 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        {resendCooldown > 0 ? `ส่งรหัสอีกครั้ง (${resendCooldown}s)` : "ส่งรหัสใหม่อีกครั้ง"}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading || forgotOtp.length !== 6}
                      className="w-full py-3 px-4 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-md shadow-red-900/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>ตรวจสอบรหัส OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setForgotOtp("");
                        setForgotError("");
                      }}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>แก้ไขอีเมล</span>
                    </button>
                  </form>
                )}

                {/* STEP 3: กำหนดรหัสผ่านใหม่ */}
                {forgotStep === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>ยืนยันรหัส OTP สำเร็จ กรุณากำหนดรหัสผ่านใหม่</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        ยืนยันรหัสผ่านใหม่อีกครั้ง
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>บันทึกรหัสผ่านใหม่</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={resetForgotState}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>ยกเลิก</span>
                    </button>
                  </form>
                )}

                {/* STEP 4: สำเร็จเรียบร้อย */}
                {forgotStep === 4 && (
                  <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว!</h3>
                      <p className="text-xs text-slate-600 mt-1">
                        คุณสามารถใช้รหัสผ่านใหม่เข้าสู่ระบบได้ทันที
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetForgotState}
                      className="w-full py-3 px-4 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-md shadow-red-900/20 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <span>ไปที่หน้าเข้าสู่ระบบ</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : registerMode ? (
              /* ========================================================= */
              /* VIEW 2: GOOGLE REGISTRATION FORM */
              /* ========================================================= */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {googleProfile && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2">
                    {googleProfile.picture ? (
                      <img
                        src={googleProfile.picture}
                        alt="รูปโปรไฟล์ Google"
                        className="w-11 h-11 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-bold">
                        {googleProfile.name?.[0] || "U"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {googleProfile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {googleProfile.email}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    รหัสประจำตัวบุคลากร <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ENG-67001 หรือ KSU-1234"
                      value={regForm.employee_code}
                      onChange={(e) =>
                        setRegForm({ ...regForm, employee_code: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ชื่อ-นามสกุล (ภาษาไทย) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="เช่น อ.ดร.สมชาย ใจดี"
                      value={regForm.full_name}
                      onChange={(e) =>
                        setRegForm({ ...regForm, full_name: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      สังกัดภาควิชา / หน่วยงาน
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <select
                        value={regForm.department_id}
                        onChange={(e) =>
                          setRegForm({ ...regForm, department_id: e.target.value })
                        }
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                      >
                        {(departments.length > 0 ? departments : defaultDepts).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      บทบาทในระบบ
                    </label>
                    <select
                      value={regForm.role}
                      onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                    >
                      <option value="lecturer">อาจารย์ประจำสาขา (Lecturer)</option>
                      <option value="head">หัวหน้าภาควิชา (Head of Dept)</option>
                      <option value="staff">เจ้าหน้าที่สายสนับสนุน (Staff)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      ตำแหน่งทางวิชาการ/งาน
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น อาจารย์ หรือ นักวิชาการศึกษา"
                      value={regForm.position}
                      onChange={(e) =>
                        setRegForm({ ...regForm, position: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        placeholder="08X-XXX-XXXX"
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterMode(false);
                      setGoogleProfile(null);
                    }}
                    className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-xs flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>ยกเลิก</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-md shadow-red-900/20 transition flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>ยืนยันการสมัคร</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ========================================================= */
              /* VIEW 3: STANDARD LOGIN FORM */
              /* ========================================================= */
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      รหัสผ่าน
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setForgotStep(1);
                        setForgotEmail(email || "");
                        setError("");
                        setForgotError("");
                        setForgotSuccess("");
                      }}
                      className="text-xs font-bold text-red-800 hover:text-red-900 hover:underline transition-colors cursor-pointer"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
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
                  className="w-full mt-2 py-3 px-4 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-md shadow-red-900/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
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
                <div className="flex flex-col items-center gap-2">
                  <div className="flex justify-center w-full">
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
