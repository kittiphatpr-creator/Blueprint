import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationService } from "../services/notificationService";
import { RoleBadge } from "./Badge";
import { formatThaiDateTime } from "../utils/dateUtils";
import {
  Bell,
  User,
  LogOut,
  Menu,
  ChevronDown,
  CheckCircle,
  Clock,
  Building,
} from "lucide-react";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // ดึงรายการแจ้งเตือน
  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      const unread = data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
    }

    if (notif.type === "leave_request") {
      navigate("/leave-approval");
    } else if (notif.type === "leave_result") {
      navigate("/leave-history");
    }
    setShowNotifications(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs backdrop-blur-md bg-white/95">
      <div className="flex items-center justify-between px-3 sm:px-6 h-16">
        {/* ฝั่งซ้าย: ปุ่มเปิดเมนูมือถือ + โลโก้คณะ */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
            title="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="ตราคณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-xs shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-extrabold text-slate-800 tracking-tight leading-none truncate">
                คณะวิศวกรรมศาสตร์ฯ
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium mt-0.5 truncate">
                มหาวิทยาลัยกาฬสินธุ์ • HR & Leave System
              </p>
            </div>
          </Link>
        </div>

        {/* ฝั่งขวา: การแจ้งเตือน + เมนูโปรไฟล์ผู้ใช้ */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="การแจ้งเตือน"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">การแจ้งเตือน</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                        {unreadCount} ใหม่
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      <CheckCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      ไม่มีการแจ้งเตือนใหม่
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${
                          !notif.is_read ? "bg-red-50/40" : ""
                        }`}
                      >
                        <div className="mt-0.5">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 ${
                              !notif.is_read ? "bg-red-600" : "bg-transparent"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs ${!notif.is_read ? "font-bold text-slate-900" : "text-slate-700"}`}>
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatThaiDateTime(notif.created_at)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 sm:gap-3 p-1.5 sm:px-3 rounded-xl hover:bg-slate-100 transition-colors text-left"
            >
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user?.full_name}
                  onError={(e) => {
                    const cached = user?.email ? localStorage.getItem("profile_avatar_" + user.email.toLowerCase()) : null;
                    if (cached && e.currentTarget.src !== cached) {
                      e.currentTarget.src = cached;
                    } else {
                      e.currentTarget.style.display = "none";
                    }
                  }}
                  className="w-9 h-9 rounded-full object-cover shadow-xs border border-red-800/30"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center shadow-xs text-sm">
                  {user?.full_name ? user.full_name.charAt(0) : "U"}
                </div>
              )}

              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {user?.full_name || "ผู้ใช้งาน"}
                </p>
                <div className="mt-0.5">
                  <RoleBadge role={user?.role} className="scale-90 origin-left" />
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-3 border-b border-slate-100 md:hidden">
                  <p className="text-sm font-bold text-slate-800">{user?.full_name}</p>
                  <p className="text-xs text-slate-600 truncate">{user?.email}</p>
                  <div className="mt-1.5">
                    <RoleBadge role={user?.role} />
                  </div>
                </div>

                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-600 font-medium">สังกัด</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    {user?.department_name || "สำนักงานคณบดีคณะวิศวกรรมศาสตร์"}
                  </p>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  ข้อมูลส่วนตัว (Profile)
                </Link>

                <div className="border-t border-slate-100 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium text-left"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
