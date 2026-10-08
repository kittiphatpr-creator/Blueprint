const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");
const leaveRequestRoutes = require("./routes/leaveRequests");
const leaveBalanceRoutes = require("./routes/leaveBalances");
const announcementRoutes = require("./routes/announcements");
const documentRoutes = require("./routes/documents");
const notificationRoutes = require("./routes/notifications");
const dashboardRoutes = require("./routes/dashboard");
const aiRoutes = require("./routes/ai");

const app = express();

app.use(cors({ origin: "*" })); // รองรับ Request จากทุก IP และทุกโดเมนบน Cloud/มือถือ
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leave-requests", leaveRequestRoutes);
app.use("/api/leave-balances", leaveBalanceRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);

// เสิร์ฟ Frontend Production Build อัตโนมัติ (รองรับ Cloud Fullstack และ SPA Routing)
const frontendDist = path.join(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({ message: "Engineering Faculty Management API is running" });
  });
}

// Global error handler กันแอปล่มถ้ามี error หลุดมา
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT} (0.0.0.0:${PORT})`);
});
