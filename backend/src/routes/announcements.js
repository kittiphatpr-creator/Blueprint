const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const announcementController = require("../controllers/announcementController");
const { requireAuth, requireRole } = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `announcement-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(requireAuth);

router.get("/", announcementController.getAll);
router.post("/", requireRole(["staff", "admin"]), upload.single("image"), announcementController.create);
router.put("/:id", requireRole(["staff", "admin"]), upload.single("image"), announcementController.update);
router.delete("/:id", requireRole(["staff", "admin"]), announcementController.remove);

module.exports = router;
