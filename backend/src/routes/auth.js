const pool = require("../config/db");
const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const {
  login,
  me,
  logout,
  loginWithGoogle,
  registerWithGoogle,
  updateProfile,
  updateAvatar,
  changePassword,
  sendResetOtp,
  verifyByEmployeeCode,
  verifyResetOtp,
  resetPasswordWithOtp,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

router.post("/login", login);

// ลืมรหัสผ่านด้วยรหัส OTP ทางอีเมล
router.post("/forgot-password/send-otp", sendResetOtp);
router.post("/forgot-password/verify-otp", verifyResetOtp);
router.post("/forgot-password/verify-code", verifyByEmployeeCode);
router.post("/forgot-password/reset", resetPasswordWithOtp);

router.post("/google", loginWithGoogle);
router.post("/register-google", registerWithGoogle);
router.get("/departments", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name FROM departments ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "ไม่สามารถดึงข้อมูลภาควิชาได้" });
  }
});
router.get("/me", requireAuth, me);
router.put("/profile", requireAuth, updateProfile);
router.post("/avatar", requireAuth, upload.single("avatar"), updateAvatar);
router.put("/change-password", requireAuth, changePassword);
router.post("/logout", requireAuth, logout);

module.exports = router;
