const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { leaveChat } = require("../controllers/aiController");

router.use(requireAuth);
router.post("/leave-chat", leaveChat);

module.exports = router;
