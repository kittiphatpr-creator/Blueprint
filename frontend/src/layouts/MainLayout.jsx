import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";
import LeaveAIChat from "../components/LeaveAIChat";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar เมนูด้านซ้าย สำหรับหน้าจอคอมพิวเตอร์และ Drawer สำหรับมือถือ */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        {/* Navbar แถบด้านบน */}
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation สำหรับมือถือ Android & iOS */}
        <MobileBottomNav />
      </div>

      {/* ผู้ช่วย AI (Gemini) สรุปวันลาคงเหลือ */}
      <LeaveAIChat />
    </div>
  );
}
