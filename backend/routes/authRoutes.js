const express = require("express");

const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  googleLogin,
} = require("../controllers/authController");

const protect = require("../middlewares/authMiddleware");

const router = express.Router();

// ── Public ───────────────────────────────────────────────────────────────────
router.post("/register", registerUser);
router.post("/login",    loginUser);

// Forgot / reset password (public — no auth required)
router.post("/forgot-password",          forgotPassword);
router.post("/reset-password/:token",    resetPassword);

// Google OAuth — verifies the Google ID token sent from the frontend
router.post("/google",                   googleLogin);

// ── Protected — any authenticated user ───────────────────────────────────────
router.get("/me",    protect, getMe);
router.patch("/me",  protect, updateMe);

module.exports = router;