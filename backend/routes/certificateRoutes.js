const express = require("express");

const router = express.Router();

const {
  createCertificate,
  getCertificates,
  getCertificateById,
  verifyCertificate,
  revokeCertificate,
  getMyCertificates,
  getMyCertificateById,
} = require("../controllers/certificateController");

const protect      = require("../middlewares/authMiddleware");
const requireRole  = require("../middlewares/roleMiddleware");

// Roles that can issue and manage certificates
const ISSUER_ROLES = ["organization", "admin"];

// ── Public routes (no auth required) ──────────────────────────────────────
// IMPORTANT: /verify/:certificateId must be declared BEFORE /:certificateId
// to avoid Express treating "verify" as a certificateId value.
router.get("/verify/:certificateId", verifyCertificate);

// ── Recipient routes — MUST be declared before /:certificateId ─────────────
// /my and /my/:certificateId would otherwise be matched by the wildcard below.
router.get("/my",               protect, getMyCertificates);
router.get("/my/:certificateId", protect, getMyCertificateById);

// ── Protected routes (organization / admin only) ──────────────────────────
router.post(
  "/",
  protect,
  requireRole(...ISSUER_ROLES),
  createCertificate
);

router.get(
  "/",
  protect,
  requireRole(...ISSUER_ROLES),
  getCertificates
);

router.get(
  "/:certificateId",
  protect,
  requireRole(...ISSUER_ROLES),
  getCertificateById
);

router.patch(
  "/:certificateId/revoke",
  protect,
  requireRole(...ISSUER_ROLES),
  revokeCertificate
);

module.exports = router;