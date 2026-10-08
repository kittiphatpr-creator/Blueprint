import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboardService";
import StatCard from "../components/StatCard";
import LeaveBalanceCard from "../components/LeaveBalanceCard";
import { LeaveStatusBadge } from "../components/Badge";
import { formatThaiDate, formatThaiDateTime } from "../utils/dateUtils";
import { ROLES, canApproveLeaves, canViewAllEmployees } from "../utils/permissions";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  FilePlus2,
  Calendar,
  BellRing,
  Building,
  ArrowUpRight,
  UserCheck,
  Megaphone,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await dashboardService.getDashboardSummary();
        setData(res);
      } catch (err) {
        console.error("Error loading dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const role = user?.role;
  const isApprover = canApproveLeaves(role);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white p-6 sm:p-8 shadow-lg shadow-red-950/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="ตราคณะ"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-red-200 uppercase tracking-wider mb-1">
              <span>{user?.department_name || "คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {user?.full_name || "อาจารย์/บุคลากร"}
            </h1>
            <p className="text-sm text-red-100/80 mt-1">
              ยินดีต้อนรับสู่ระบบสารสนเทศบุคลากรและระบบการลางานออนไลน์ มหาวิทยาลัยกาฬสินธุ์
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/leave-request"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-red-900 hover:bg-red-50 font-bold rounded-xl text-sm shadow-md transition transform active:scale-95"
          >
            <FilePlus2 className="w-4 h-4" />
            ยื่นขอลาออนไลน์
          </Link>
          {isApprover && (
            <Link
              to="/leave-approval"
              className="flex items-center gap-2 px-4 py-2.5 bg-red-700/80 hover:bg-red-700 text-white font-semibold rounded-xl text-sm border border-red-500/30 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              อนุมัติการลา
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canViewAllEmployees(role) && (
          <StatCard
            title={role === ROLES.HEAD ? "บุคลากรในสาขาวิชา" : "บุคลากรทั้งหมด"}
            value={data?.total_employees || 0}
            subtitle={role === ROLES.HEAD ? "ในสังกัดของคุณ" : "อาจารย์และเจ้าหน้าที่"}
            icon={Users}
            color="red"
          />
        )}

        <StatCard
          title={isApprover ? "คำขอลาที่รออนุมัติ" : "คำขอลาของคุณ (รออนุมัติ)"}
          value={data?.leave_pending || 0}
          subtitle="รายการที่รอดำเนินการ"
          icon={Clock}
          color="amber"
        />

        <StatCard
          title="คำขอที่อนุมัติแล้ว"
          value={data?.leave_approved || 0}
          subtitle="ประจำปีปัจจุบัน"
          icon={CheckCircle2}
          color="emerald"
        />

        <StatCard
          title="คำขอที่ไม่อนุมัติ"
          value={data?.leave_rejected || 0}
          subtitle="ประจำปีปัจจุบัน"
          icon={XCircle}
          color="rose"
        />
      </div>

      {/* Leave Balances Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">วันลาคงเหลือของคุณ (ประจำปี {new Date().getFullYear() + 543})</h2>
            <p className="text-xs text-slate-600">ยอดวันลาตามระเบียบคณะวิศวกรรมศาสตร์</p>
          </div>
          <Link
            to="/leave-history"
            className="text-xs font-semibold text-red-800 hover:text-red-900 flex items-center gap-1"
          >
            ดูประวัติทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.my_balances?.map((balance) => (
            <LeaveBalanceCard key={balance.leave_type_id} balance={balance} />
          ))}
        </div>
      </div>

      {/* Grid Content: Leaves Today & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leaves Today & Recent Requests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Who is on leave today */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-50 text-red-800">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">บุคลากรที่กำลังลางานวันนี้</h3>
                  <p className="text-xs text-slate-600">ประจำวันที่ {formatThaiDate(new Date())}</p>
                </div>
              </div>
              <Link to="/leave-calendar" className="text-xs font-semibold text-red-800 hover:underline">
                เปิดปฏิทินการลา
              </Link>
            </div>

            {data?.leaves_today?.length === 0 ? (
              <div className="p-6 text-center text-slate-600 text-sm bg-slate-50 rounded-xl border border-slate-100">
                ไม่มีบุคลากรลางานในวันนี้ ทุกคนปฏิบัติหน้าที่ตามปกติ ✨
              </div>
            ) : (
              <div className="space-y-3">
                {data?.leaves_today?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                        {item.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.full_name}</p>
                        <p className="text-xs text-slate-600">
                          {item.department_name || item.position} • {item.leave_type_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        {formatThaiDate(item.start_date, true)} - {formatThaiDate(item.end_date, true)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Leave Requests */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {isApprover ? "คำขอล่าสุดในระบบ" : "ประวัติการขอล่าสุดของคุณ"}
              </h3>
              <Link
                to={isApprover ? "/leave-approval" : "/leave-history"}
                className="text-xs font-semibold text-red-800 hover:underline flex items-center gap-1"
              >
                ดูทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.recent_leaves?.length === 0 ? (
              <div className="p-6 text-center text-slate-600 text-sm bg-slate-50 rounded-xl border border-slate-100">
                ยังไม่มีรายการขอลางานล่าสุด
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-600 uppercase">
                      <th className="pb-3">ผู้ยื่นคำขอ</th>
                      <th className="pb-3">ประเภท</th>
                      <th className="pb-3">ช่วงวันที่ลา</th>
                      <th className="pb-3">จำนวน</th>
                      <th className="pb-3 text-right">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data?.recent_leaves?.map((leave) => (
                      <tr key={leave.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-medium text-slate-900">
                          {leave.full_name}
                          {leave.department_name && (
                            <span className="block text-xs text-slate-600 font-normal">
                              {leave.department_name}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-600">{leave.leave_type_name}</td>
                        <td className="py-3 text-slate-600 text-xs">
                          {formatThaiDate(leave.start_date, true)} - {formatThaiDate(leave.end_date, true)}
                        </td>
                        <td className="py-3 font-semibold text-slate-800">{leave.days_count} วัน</td>
                        <td className="py-3 text-right">
                          <LeaveStatusBadge status={leave.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Announcements & Shortcuts */}
        <div className="space-y-6">
          {/* Announcements Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-red-800" />
                <h3 className="text-base font-bold text-slate-900">ข่าวสารและประกาศ</h3>
              </div>
              <Link to="/announcements" className="text-xs font-semibold text-red-800 hover:underline">
                ทั้งหมด
              </Link>
            </div>

            <div className="space-y-4">
              {data?.recent_announcements?.length === 0 ? (
                <p className="text-sm text-slate-600">ไม่มีประกาศใหม่</p>
              ) : (
                data?.recent_announcements?.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                    <p className="text-sm font-bold text-slate-900 line-clamp-2">{item.title}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.content}</p>
                    <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between">
                      <span>{item.posted_by_name || "คณะวิศวกรรมศาสตร์"}</span>
                      <span>{formatThaiDate(item.created_at, true)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Paperless & Services Quick Links */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white p-6 shadow-md">
            <h4 className="text-base font-bold">ระบบบริการ Paperless</h4>
            <p className="text-xs text-slate-300 mt-1">
              ดาวน์โหลดแบบฟอร์ม คำสั่งคณะ และระเบียบข้อบังคับโดยไม่ต้องใช้กระดาษ
            </p>

            <div className="mt-4 space-y-2">
              <Link
                to="/documents"
                className="block p-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-xs transition text-xs font-medium"
              >
                📁 คลังแบบฟอร์มและเอกสารคณะ
              </Link>
              <Link
                to="/leave-calendar"
                className="block p-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-xs transition text-xs font-medium"
              >
                📅 ปฏิทินวันลาและการปฏิบัติงาน
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
