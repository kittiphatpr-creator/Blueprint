import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

export default function Login() {
  const { login, loginWithGoogle, quickLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // หากเข้าสู่ระบบแล้ว ให้พาไป Dashboard อัตโนมัติ
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailInput = document.querySelector('input[type="email"]')?.value || email;
    const passwordInput = document.querySelector('input[type="password"]')?.value || document.querySelector('input[type="text"]')?.value || password;

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
      await loginWithGoogle(credentialResponse.credential);
      navigate("/dashboard");
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
              ระบบจัดเก็บข้อมูลบุคลากรและการลางานออนไลน์
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">ข้อผิดพลาดในการเข้าสู่ระบบ</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
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