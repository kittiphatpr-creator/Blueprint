const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

router.get("/me", leaveController.getBalance);
router.get("/:userId", leaveController.getBalance);

module.exports = router;
