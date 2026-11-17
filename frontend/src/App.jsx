import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import { ROLES } from "./utils/permissions";

import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Employees from "./pages/Employees";
import LeaveRequest from "./pages/LeaveRequest";
import LeaveHistory from "./pages/LeaveHistory";
import LeaveApproval from "./pages/LeaveApproval";
import LeaveCalendar from "./pages/LeaveCalendar";
import Announcements from "./pages/Announcements";
import Documents from "./pages/Documents";

// หน้าเสริมง่าย ๆ สำหรับกรณีไม่มีสิทธิ์ / ไม่พบหน้า
function Unauthorized() {
  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-bold text-red-600">
        403 - ไม่มีสิทธิ์เข้าถึงหน้านี้
      </h1>
    </div>
  );
}

function NotFound() {
  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-bold">404 - ไม่พบหน้าที่ต้องการ</h1>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* หน้าที่เข้าได้โดยไม่ต้อง login */}
          <Route path="/login" element={<Login />} />

          {/* ทุกหน้าใต้นี้ต้อง login ก่อน */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* เข้าได้ทุก role ที่ login แล้ว */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/leave-request" element={<LeaveRequest />} />
              <Route path="/leave-requests" element={<Navigate to="/leave-approval" replace />} />
              <Route path="/leave-history" element={<LeaveHistory />} />
              <Route path="/leave-calendar" element={<LeaveCalendar />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/documents" element={<Documents />} />

              {/* เฉพาะหัวหน้าสาขา / admin */}
              <Route
                element={
                  <RoleRoute allowedRoles={[ROLES.HEAD, ROLES.ADMIN]} />
                }
              >
                <Route path="/leave-approval" element={<LeaveApproval />} />
              </Route>

              {/* เฉพาะเจ้าหน้าที่ / admin */}
              <Route
                element={
                  <RoleRoute
                    allowedRoles={[ROLES.HEAD, ROLES.STAFF, ROLES.ADMIN]}
                  />
                }
              >
                <Route path="/employees" element={<Employees />} />
              </Route>

              <Route path="/unauthorized" element={<Unauthorized />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
