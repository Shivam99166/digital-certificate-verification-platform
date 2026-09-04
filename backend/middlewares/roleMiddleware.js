/**
 * requireRole(...roles)
 *
 * Middleware factory for role-based authorization.
 * Must be used AFTER the `protect` middleware (which sets req.user).
 *
 * Usage:
 *   router.post("/", protect, requireRole("organization", "admin"), createCertificate);
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      // This should never happen if protect is applied first, but guard anyway
      return res.status(401).json({ message: "Not authorized." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to perform this action.",
      });
    }

    next();
  };
};

module.exports = requireRole;
