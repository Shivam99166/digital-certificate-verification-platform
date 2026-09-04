const User = require("../models/User");
const Certificate = require("../models/Certificate");

// ==================== GET ADMIN STATS ====================
const getAdminStats = async (req, res) => {
  try {
    const [totalUsers, totalOrgs, totalRecipients, totalCerts] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "organization" }),
      User.countDocuments({ role: "recipient" }),
      Certificate.countDocuments(),
    ]);

    const [validCerts, revokedCerts, expiredCerts] = await Promise.all([
      Certificate.countDocuments({ status: "VALID" }),
      Certificate.countDocuments({ status: "REVOKED" }),
      Certificate.countDocuments({ status: "EXPIRED" }),
    ]);

    res.status(200).json({
      stats: {
        totalUsers,
        totalOrgs,
        totalRecipients,
        totalCerts,
        validCerts,
        revokedCerts,
        expiredCerts,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== GET ALL USERS ====================
const getAllUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const role   = req.query.role;
    const search = req.query.search;

    const filter = {};

    if (role && ["organization", "recipient", "admin"].includes(role)) {
      filter.role = role;
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [
        { name: regex },
        { email: regex },
        { organization: regex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin get users error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== GET ALL CERTIFICATES (admin) ====================
const getAllCertificates = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    const filter = {};

    if (status && ["VALID", "REVOKED", "EXPIRED"].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [
        { recipientName: regex },
        { courseName: regex },
        { certificateId: regex },
      ];
    }

    const [certificates, total] = await Promise.all([
      Certificate.find(filter)
        .populate("issuedBy", "name organization email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Certificate.countDocuments(filter),
    ]);

    res.status(200).json({
      certificates,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin get certificates error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== TOGGLE USER STATUS ====================
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Admin cannot deactivate their own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot deactivate your own admin account.",
      });
    }

    // Admin accounts cannot be deactivated by other admins (safety rule)
    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin accounts cannot be deactivated via this endpoint.",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      message: `Account ${user.isActive ? "activated" : "deactivated"} successfully.`,
      user,
    });
  } catch (error) {
    console.error("Toggle user status error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== GET CERTS BY ORG (admin) ====================
const getCertsByOrg = async (req, res) => {
  try {
    const { userId } = req.params;

    const certificates = await Certificate.find({ issuedBy: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    console.error("Admin get org certs error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  getAllCertificates,
  toggleUserStatus,
  getCertsByOrg,
};
