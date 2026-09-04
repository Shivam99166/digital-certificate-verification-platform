const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. Token required.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Not authorized. Token required.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Do not leak whether the token was malformed vs. expired
      return res.status(401).json({
        message: "Not authorized. Invalid or expired token.",
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Not authorized. User no longer exists.",
      });
    }

    // Reject deactivated accounts
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    // Generic catch-all — do not expose error details to client
    console.error("Authentication middleware error:", error.message);

    return res.status(401).json({
      message: "Not authorized.",
    });
  }
};

module.exports = protect;