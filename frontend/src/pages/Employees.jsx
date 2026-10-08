import { useState, useEffect } from "react";
import { employeeService } from "../services/employeeService";
import { leaveService } from "../services/leaveService";
import { useAuth } from "../context/AuthContext";
import { canManageEmployees, ROLE_LABELS } from "../utils/permissions";
import { RoleBadge } from "../components/Badge";
import Modal from "../components/Modal";
import LeaveBalanceCard from "../components/LeaveBalanceCard";
import {
  Search,
  Filter,
  UserPlus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Building,
  LayoutGrid,
  List,
  Eye,
  CheckCircle,
  AlertCircle,
  Briefcase,
} from "lucide-react";

function EmployeeAvatar({ src, name, size = "large" }) {
  const [error, setError] = useState(false);
  const isValidUrl = src && typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/uploads/") || src.startsWith("/"));

  const initial = name
    ? name.replace(/^(ศาสตราจารย์|รองศาสตราจารย์|ผู้ช่วยศาสตราจารย์|อาจารย์|ศ\.|รศ\.|ผศ\.|อ\.|ดร\.|นาย|นาง|นางสาว)\s*/g, "").trim().charAt(0) || name.charAt(0)
    : "U";

  if (isValidUrl && !error) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setError(true)}
        className={
          size === "large"
            ? "w-20 h-20 rounded-full object-cover shadow-lg ring-4 ring-white bg-white group-hover:scale-105 transition-transform relative z-20 shrink-0"
            : size === "modal"
            ? "w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-xl ring-4 ring-white shrink-0"
            : "w-10 h-10 rounded-full object-cover shadow-xs border border-slate-200 shrink-0"
        }
      />
    );
  }

  return (
    <div
      className={
        size === "large"
          ? "w-20 h-20 rounded-full bg-gradient-to-tr from-red-800 via-rose-700 to-amber-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg ring-4 ring-white group-hover:scale-105 transition-transform tracking-wider relative z-20 shrink-0"
          : size === "modal"
          ? "w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-red-800 via-rose-700 to-amber-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl ring-4 ring-white shrink-0"
          : "w-10 h-10 rounded-full bg-gradient-to-tr from-red-800 to-rose-700 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0"
      }
    >
      {initial}
    </div>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const isAdmin = canManageEmployees(user?.role);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // Modals
  const [viewModalUser, setViewModalUser] = useState(null);
  const [userBalances, setUserBalances] = useState([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    employee_code: "",
    full_name: "",
    email: "",
    password: "",
    department_id: "",
    position: "",
    role: "lecturer",
    phone: "",
    profile_image: "",
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [empData, deptData] = await Promise.all([
        employeeService.getEmployees({
          search: search || undefined,
          department_id: selectedDept || undefined,
          role: selectedRole || undefined,
        }),
        employeeService.getDepartments(),
      ]);
      setEmployees(empData);
      setDepartments(deptData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDept, selectedRole]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // View Details
  const handleOpenDetail = async (emp) => {
    setViewModalUser(emp);
    try {
      const balances = await leaveService.getUserLeaveBalance(emp.id);
      setUserBalances(balances);
    } catch {
      setUserBalances([]);
    }
  };

  // Add / Edit
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({
      id: null,
      employee_code: `ENG-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: "",
      email: "",
      password: "changeme123",
      department_id: departments[0]?.id || "",
      position: "อาจารย์ประจำสาขาวิชา",
      role: "lecturer",
      phone: "",
      profile_image: "",
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setIsEditMode(true);
    setFormData({
      id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      email: emp.email,
      password: "",
      department_id: emp.department_id || "",
      position: emp.position || "",
      role: emp.role || "lecturer",
      phone: emp.phone || "",
      profile_image: emp.profile_image || "",
    });
    setIsFormModalOpen(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage({ text: "", type: "" });

    try {
      if (isEditMode) {
        await employeeService.updateEmployee(formData.id, formData);
        setMessage({ text: "อัปเดตข้อมูลบุคลากรสำเร็จ", type: "success" });
      } else {
        await employeeService.createEmployee(formData);
        setMessage({ text: "เพิ่มบุคลากรใหม่เรียบร้อยแล้ว", type: "success" });
      }
      setIsFormModalOpen(false);
      loadData();
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await employeeService.deleteEmployee(id);
      setMessage({ text: "ลบข้อมูลบุคลากรเรียบร้อยแล้ว", type: "success" });
      setDeleteConfirmId(null);
      loadData();
    } catch (err) {
      setMessage({ text: "ไม่สามารถลบข้อมูลได้", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ทำเนียบบุคลากร
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            คณาจารย์และเจ้าหน้าที่ คณะวิศวกรรมศาสตร์ ({employees.length} ท่าน)
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-red-900/20 transition shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">เพิ่มบุคลากรใหม่</span>
            <span className="sm:hidden">เพิ่มบุคลากร</span>
          </button>
        )}
      </div>

      {/* Notification Toast */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm ${
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง หรืออีเมล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                title="ล้างคำค้นหา"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-red-800 hover:bg-red-900 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition shrink-0"
          >
            ค้นหา
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Department Filter */}
          <div className="flex-1 md:flex-initial">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-red-800 font-medium"
            >
              <option value="">ทุกภาควิชา</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex-1 md:flex-initial">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-red-800 font-medium"
            >
              <option value="">ทุกบทบาท</option>
              <option value="lecturer">อาจารย์</option>
              <option value="head">หัวหน้าสาขา</option>
              <option value="staff">เจ้าหน้าที่</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-0.5 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl transition ${
                viewMode === "grid" ? "bg-white text-red-800 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
              title="มุมมองแบบการ์ดภาพ"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-xl transition ${
                viewMode === "table" ? "bg-white text-red-800 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
              title="มุมมองแบบรายชื่อ"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Employees Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-700">ไม่พบข้อมูลบุคลากรตามเงื่อนไขที่ค้นหา</p>
          <p className="text-xs text-slate-600 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองภาควิชา</p>
        </div>
      ) : viewMode === "grid" ? (
        /* Balanced Portrait Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Top Card Banner */}
                <div className="h-16 sm:h-20 bg-gradient-to-r from-slate-900 via-red-950 to-red-900 relative p-3 flex justify-end items-start">
                  <div className="absolute -top-10 -left-10 w-28 h-28 bg-red-600/20 rounded-full blur-xl pointer-events-none"></div>
                  <RoleBadge role={emp.role} className="shadow-xs bg-white/95 backdrop-blur-xs text-[11px] font-bold" />
                </div>

                {/* Photo / Avatar Container (relative z-10 ensures it floats OVER the banner) */}
                <div className="relative z-10 px-4 -mt-10 flex flex-col items-center text-center">
                  <EmployeeAvatar src={emp.profile_image} name={emp.full_name} size="large" />

                  {/* Name & Code */}
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base mt-2.5 leading-snug group-hover:text-red-900 transition line-clamp-1">
                    {emp.full_name}
                  </h3>
                  <div className="mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-800 text-[11px] font-mono font-bold border border-red-200/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                      {emp.employee_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">
                    {emp.position || "อาจารย์ประจำสาขาวิชา"}
                  </p>
                </div>

                {/* Department & Quick Contact Grid (Compact & Balanced for iOS & Android) */}
                <div className="px-4 mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{emp.department_name || "สำนักงานคณะวิศวกรรมศาสตร์"}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <a
                      href={`mailto:${emp.email}`}
                      className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-800 transition truncate border border-slate-100"
                      title={emp.email}
                    >
                      <Mail className="w-3 h-3 text-red-700 shrink-0" />
                      <span className="truncate text-[11px] font-medium">{emp.email}</span>
                    </a>
                    {emp.phone ? (
                      <a
                        href={`tel:${emp.phone}`}
                        className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition truncate border border-slate-100"
                        title={emp.phone}
                      >
                        <Phone className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span className="truncate text-[11px] font-medium">{emp.phone}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50/50 text-slate-400 border border-slate-100 truncate">
                        <Phone className="w-3 h-3 text-slate-300 shrink-0" />
                        <span className="text-[11px]">-</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 mt-3">
                <button
                  onClick={() => handleOpenDetail(emp)}
                  className="flex-1 text-xs font-bold text-slate-800 hover:text-red-800 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-red-300 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-red-800 shrink-0" />
                  <span>ดูข้อมูลและวันลา</span>
                </button>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl transition shadow-2xs border border-transparent hover:border-slate-200"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(emp.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-xl transition shadow-2xs border border-transparent hover:border-slate-200"
                      title="ลบข้อมูล"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table / List View */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Mobile Contact List (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {employees.map((emp) => (
              <div key={emp.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3 min-w-0" onClick={() => handleOpenDetail(emp)}>
                  <EmployeeAvatar src={emp.profile_image} name={emp.full_name} size="small" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{emp.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{emp.position || emp.department_name || "-"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-red-800 font-semibold">{emp.employee_code}</span>
                      <RoleBadge role={emp.role} className="text-[10px] px-1.5 py-0" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenDetail(emp)}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-800 hover:bg-slate-100 transition"
                    title="ดูข้อมูล"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(emp.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3.5">บุคลากร</th>
                  <th className="px-5 py-3.5">รหัสบุคลากร</th>
                  <th className="px-5 py-3.5">ภาควิชา / สังกัด</th>
                  <th className="px-5 py-3.5">ตำแหน่ง</th>
                  <th className="px-5 py-3.5">บทบาท</th>
                  <th className="px-5 py-3.5">ข้อมูลติดต่อ</th>
                  <th className="px-5 py-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar src={emp.profile_image} name={emp.full_name} size="small" />
                        <span className="font-bold text-slate-900">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 font-semibold">{emp.employee_code}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">
                      {emp.department_name || "สำนักงานคณะ"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 text-xs">{emp.position || "-"}</td>
                    <td className="px-5 py-3.5">
                      <RoleBadge role={emp.role} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <div>{emp.email}</div>
                      {emp.phone && <div className="text-slate-500 mt-0.5">{emp.phone}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(emp)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="ดูข้อมูล"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="แก้ไข"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(emp.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: View Employee Details & Leave Balances */}
      <Modal
        isOpen={!!viewModalUser}
        onClose={() => setViewModalUser(null)}
        title="ข้อมูลบุคลากรและยอดวันลา"
        maxWidth="max-w-xl"
      >
        {viewModalUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-5 pb-4 border-b border-slate-100">
              <EmployeeAvatar src={viewModalUser.profile_image} name={viewModalUser.full_name} size="modal" />
              <div>
                <h3 className="text-xl font-bold text-slate-900">{viewModalUser.full_name}</h3>
                <p className="text-xs text-red-800 font-mono font-semibold mt-0.5">รหัส: {viewModalUser.employee_code}</p>
                <div className="mt-2">
                  <RoleBadge role={viewModalUser.role} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl">
                <span className="text-slate-500 block">ภาควิชา / สังกัด</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {viewModalUser.department_name || "สำนักงานคณะ"}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl">
                <span className="text-slate-500 block">ตำแหน่งหน้าที่</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {viewModalUser.position || "-"}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl">
                <span className="text-slate-500 block">อีเมล</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{viewModalUser.email}</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl">
                <span className="text-slate-500 block">เบอร์โทรศัพท์</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {viewModalUser.phone || "-"}
                </span>
              </div>
            </div>

            {/* Leave Balances Breakdown */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">
                สิทธิ์และยอดวันลาคงเหลือ (ปี {new Date().getFullYear() + 543})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {userBalances.map((b) => (
                  <LeaveBalanceCard key={b.leave_type_id} balance={b} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Add / Edit Employee Form */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={isEditMode ? "แก้ไขข้อมูลบุคลากร" : "เพิ่มบุคลากรใหม่"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveForm} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">รหัสบุคลากร</label>
              <input
                type="text"
                required
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">บทบาท (Role)</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
              >
                <option value="lecturer">อาจารย์ (Lecturer)</option>
                <option value="head">หัวหน้าสาขา (Head)</option>
                <option value="staff">เจ้าหน้าที่ (Staff)</option>
                <option value="admin">ผู้ดูแลระบบ (Admin)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ชื่อ-นามสกุล (พร้อมคำนำหน้า)</label>
            <input
              type="text"
              required
              placeholder="เช่น ผศ.ดร.สมศักดิ์ มั่นคง"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">อีเมลมหาวิทยาลัย</label>
              <input
                type="email"
                required
                placeholder="name@ksu.ac.th"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                placeholder="08X-XXX-XXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ภาควิชา / สังกัด</label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
              >
                <option value="">-- สำนักงานคณะ --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ตำแหน่ง</label>
              <input
                type="text"
                placeholder="เช่น อาจารย์ประจำภาควิชา"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                ลิงก์รูปภาพโปรไฟล์ (Image URL)
              </label>
              <span className="text-[11px] text-slate-400 font-normal">ไม่บังคับ (เว้นว่างได้)</span>
            </div>
            <input
              type="text"
              placeholder="เช่น https://domain.com/photo.jpg (หากไม่มีให้ปล่อยว่างไว้)"
              value={formData.profile_image}
              onChange={(e) => setFormData({ ...formData, profile_image: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              💡 <strong>คำแนะนำ:</strong> หากไม่มีรูปภาพ สามารถปล่อยว่างไว้ได้เลยครับ ระบบจะสร้างภาพโปรไฟล์ตัวอักษรย่อชื่อภาษาไทย (เช่น <strong>ส</strong>) บนโทนสีคณะให้อัตโนมัติ
            </p>
          </div>

          {!isEditMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">รหัสผ่านเริ่มต้น</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
              />
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
            >
              {actionLoading ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "เพิ่มบุคลากร"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="ยืนยันการลบข้อมูลบุคลากร"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">คุณต้องการลบข้อมูลบุคลากรนี้ใช่หรือไม่?</p>
            <p className="text-xs text-slate-600 mt-1">
              ข้อมูลคำขอลาและสถิติทั้งหมดที่เกี่ยวข้องจะถูกลบออกจากระบบ
            </p>
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
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              {actionLoading ? "กำลังลบ..." : "ยืนยันการลบ"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
