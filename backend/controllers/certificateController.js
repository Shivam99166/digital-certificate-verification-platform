const Certificate = require("../models/Certificate");
const generateCertificateId = require("../utils/generateCertificateId");
const QRCode = require("qrcode");
const sendEmail = require("../utils/sendEmail");
const {
  getCertificateIssuedEmail,
  getCertificateRevokedEmail,
} = require("../utils/emailTemplates");

// ==================== CREATE CERTIFICATE ====================
const createCertificate = async (req, res) => {
  try {
    const { recipientName, recipientEmail, courseName, expiryDate } = req.body;

    const trimmedName = typeof recipientName === "string" ? recipientName.trim() : "";
    const trimmedCourse = typeof courseName === "string" ? courseName.trim() : "";
    const normalizedEmail = typeof recipientEmail === "string" ? recipientEmail.trim().toLowerCase() : "";

    if (!trimmedName || !normalizedEmail || !trimmedCourse) {
      return res.status(400).json({
        message: "Recipient name, recipient email and course name are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid recipient email address",
      });
    }

    let parsedExpiry = null;
    if (expiryDate) {
      parsedExpiry = new Date(expiryDate);
      if (isNaN(parsedExpiry.getTime())) {
        return res.status(400).json({
          message: "Invalid expiry date format",
        });
      }
    }

    let certificateId;
    let existingCertificate;

    do {
      certificateId = generateCertificateId();
      existingCertificate = await Certificate.findOne({ certificateId });
    } while (existingCertificate);

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verificationUrl = `${frontendBaseUrl}/verify/${certificateId}`;
    const qrCode = await QRCode.toDataURL(verificationUrl);

    const certificate = await Certificate.create({
      certificateId,
      recipientName: trimmedName,
      recipientEmail: normalizedEmail,
      courseName: trimmedCourse,
      organization: req.user.organization,
      issueDate: new Date(),
      expiryDate: parsedExpiry,
      status: "VALID",
      issuedBy: req.user._id,
      qrCode,
    });

    // Send email notification to recipient (non-blocking)
    let emailStatus = { sent: false };
    try {
      const emailContent = getCertificateIssuedEmail({
        certificate,
        verificationUrl,
        dashboardUrl: `${frontendBaseUrl}/recipient-dashboard`,
      });

      emailStatus = await sendEmail({
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        attachments: emailContent.attachments,
      });
    } catch (emailError) {
      console.warn("Notice: Recipient notification email could not be sent:", emailError.message);
      emailStatus = { sent: false, error: emailError.message };
    }

    res.status(201).json({
      message: "Certificate issued successfully",
      certificate,
      emailSent: emailStatus?.sent || false,
    });
  } catch (error) {
    console.error("Create certificate error:", error.message);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET ALL CERTIFICATES ====================
const getCertificates = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 50);
    const skip   = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    // Base filter — org users only see their own certs
    const filter = { issuedBy: req.user._id };

    if (status && ["VALID", "REVOKED", "EXPIRED"].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [
        { recipientName: regex },
        { courseName: regex },
        { certificateId: regex },
        { recipientEmail: regex },
      ];
    }

    const [certificates, total] = await Promise.all([
      Certificate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Certificate.countDocuments(filter),
    ]);

    res.status(200).json({
      count: certificates.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      certificates,
    });
  } catch (error) {
    console.error("Get certificates error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


// ==================== GET SINGLE CERTIFICATE ====================
const getCertificateById = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({
      certificateId,
      issuedBy: req.user._id,
    });

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate not found",
      });
    }

    res.status(200).json({
      certificate,
    });
  } catch (error) {
    console.error("Get certificate error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== PUBLIC CERTIFICATE VERIFICATION ====================
const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId }).select(
      "certificateId recipientName courseName organization issueDate expiryDate status"
    );

    if (!certificate) {
      return res.status(404).json({
        valid: false,
        message: "Certificate not found",
      });
    }

    if (
      certificate.expiryDate &&
      new Date(certificate.expiryDate) < new Date() &&
      certificate.status === "VALID"
    ) {
      certificate.status = "EXPIRED";
      await certificate.save();
    }

    const isValid = certificate.status === "VALID";

    res.status(200).json({
      valid: isValid,
      certificate: {
        certificateId: certificate.certificateId,
        recipientName: certificate.recipientName,
        courseName: certificate.courseName,
        organization: certificate.organization,
        issueDate: certificate.issueDate,
        expiryDate: certificate.expiryDate,
        status: certificate.status,
      },
    });
  } catch (error) {
    console.error("Certificate verification error:", error.message);

    res.status(500).json({
      valid: false,
      message: "Server error",
    });
  }
};

// ==================== REVOKE CERTIFICATE ====================
const revokeCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({
      certificateId,
      issuedBy: req.user._id,
    });

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate not found",
      });
    }

    if (certificate.status === "REVOKED") {
      return res.status(400).json({
        message: "Certificate is already revoked",
      });
    }

    certificate.status = "REVOKED";
    await certificate.save();

    // Send email notification to recipient (non-blocking)
    let emailStatus = { sent: false };
    try {
      const emailContent = getCertificateRevokedEmail({ certificate });
      emailStatus = await sendEmail({
        to: certificate.recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailError) {
      console.warn("Notice: Revocation notification email could not be sent:", emailError.message);
      emailStatus = { sent: false, error: emailError.message };
    }

    res.status(200).json({
      message: "Certificate revoked successfully",
      certificate: {
        certificateId: certificate.certificateId,
        recipientName: certificate.recipientName,
        status: certificate.status,
      },
      emailSent: emailStatus?.sent || false,
    });
  } catch (error) {
    console.error("Revoke certificate error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET MY CERTIFICATES (recipient) ====================
// Returns certificates where recipientEmail matches the logged-in user's email.
// Supports the same search/filter/pagination as getCertificates.
const getMyCertificates = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 50);
    const skip   = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    // Match by the authenticated user's email (case-insensitive stored as lowercase)
    const filter = { recipientEmail: req.user.email };

    if (status && ["VALID", "REVOKED", "EXPIRED"].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [
        { courseName: regex },
        { organization: regex },
        { certificateId: regex },
      ];
    }

    const [certificates, total] = await Promise.all([
      Certificate.find(filter)
        .select("-qrCode") // QR code is large; exclude from list view
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit),
      Certificate.countDocuments(filter),
    ]);

    // Auto-expire any that have passed their expiry date
    const now = new Date();
    const expiredIds = certificates
      .filter((c) => c.expiryDate && new Date(c.expiryDate) < now && c.status === "VALID")
      .map((c) => c._id);

    if (expiredIds.length > 0) {
      await Certificate.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: "EXPIRED" } }
      );
      // Reflect in the returned array without a second DB call
      certificates.forEach((c) => {
        if (expiredIds.some((id) => id.equals(c._id))) c.status = "EXPIRED";
      });
    }

    res.status(200).json({
      count: certificates.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      certificates,
    });
  } catch (error) {
    console.error("Get my certificates error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== GET MY SINGLE CERTIFICATE (recipient) ====================
const getMyCertificateById = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({
      certificateId,
      recipientEmail: req.user.email,
    });

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Auto-expire check
    if (
      certificate.expiryDate &&
      new Date(certificate.expiryDate) < new Date() &&
      certificate.status === "VALID"
    ) {
      certificate.status = "EXPIRED";
      await certificate.save();
    }

    res.status(200).json({ certificate });
  } catch (error) {
    console.error("Get my certificate error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createCertificate,
  getCertificates,
  getCertificateById,
  verifyCertificate,
  revokeCertificate,
  getMyCertificates,
  getMyCertificateById,
};