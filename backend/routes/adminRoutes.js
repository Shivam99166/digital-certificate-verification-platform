const express = require("express");

const {
  getAdminStats,
  getAllUsers,
  getAllCertificates,
  toggleUserStatus,
  getCertsByOrg,
} = require("../controllers/adminController");

const protect      = require("../middlewares/authMiddleware");
const requireRole  = require("../middlewares/roleMiddleware");

const router = express.Router();

// All admin routes require authentication AND admin role
router.use(protect, requireRole("admin"));

router.get("/stats",                   getAdminStats);
router.get("/users",                   getAllUsers);
router.get("/certificates",            getAllCertificates);
router.patch("/users/:id/status",      toggleUserStatus);
router.get("/users/:userId/certs",     getCertsByOrg);

module.exports = router;
