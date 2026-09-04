const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const normalizeEmail = (value = "") => value.trim().toLowerCase();

// Valid roles that can self-register (admin accounts must be created manually)
const SELF_REGISTERABLE_ROLES = ["organization", "recipient"];

// ==================== REGISTER ====================

const registerUser = async (req, res) => {
  try {
    const { name, email, password, organization, role } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // ── Role validation ───────────────────────────────────────────────────
    const requestedRole = role || "organization";

    if (!SELF_REGISTERABLE_ROLES.includes(requestedRole)) {
      return res.status(400).json({
        message: "Invalid role. Must be 'organization' or 'recipient'.",
      });
    }

    // ── Input presence check ──────────────────────────────────────────────
    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    // Organization role requires an organization name
    if (requestedRole === "organization" && !organization) {
      return res.status(400).json({
        message: "Organization name is required for organization accounts",
      });
    }

    // ── Input length limits ───────────────────────────────────────────────
    if (name.trim().length > 100) {
      return res.status(400).json({ message: "Name must be 100 characters or fewer" });
    }
    if (normalizedEmail.length > 254) {
      return res.status(400).json({ message: "Email address is too long" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (password.length > 128) {
      return res.status(400).json({ message: "Password must be 128 characters or fewer" });
    }
    if (organization && organization.trim().length > 200) {
      return res.status(400).json({ message: "Organization name must be 200 characters or fewer" });
    }

    // ── Duplicate check ───────────────────────────────────────────────────
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      organization: organization ? organization.trim() : null,
      role: requestedRole,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// ==================== LOGIN ====================

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // ── Input presence check ──────────────────────────────────────────────
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // ── Input length limits (fast-fail before DB hit) ─────────────────────
    if (normalizedEmail.length > 254 || password.length > 128) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // ── Find user ─────────────────────────────────────────────────────────
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // ── Guard: deactivated account ─────────────────────────────────────────
    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // ── Compare password ──────────────────────────────────────────────────
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // ── Guard: ensure JWT_SECRET is set ──────────────────────────────────
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // ── Create JWT ────────────────────────────────────────────────────────
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateMe = async (req, res) => {
  try {
    const { name, organization, website, description, contactEmail, phone } = req.body;

    // Build explicit whitelist — never allow role/password/email/isActive
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({ message: "Name must be 100 characters or fewer" });
      }
      updates.name = name.trim();
    }

    if (organization !== undefined) {
      if (organization && organization.trim().length > 200) {
        return res.status(400).json({ message: "Organization name must be 200 characters or fewer" });
      }
      updates.organization = organization ? organization.trim() : null;
    }

    if (website !== undefined) {
      if (website && website.trim().length > 200) {
        return res.status(400).json({ message: "Website URL must be 200 characters or fewer" });
      }
      updates.website = website ? website.trim() : null;
    }

    if (description !== undefined) {
      if (description && description.trim().length > 1000) {
        return res.status(400).json({ message: "Description must be 1000 characters or fewer" });
      }
      updates.description = description ? description.trim() : null;
    }

    if (contactEmail !== undefined) {
      if (contactEmail && contactEmail.trim()) {
        const normalizedContact = normalizeEmail(contactEmail);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedContact)) {
          return res.status(400).json({ message: "Invalid contact email address" });
        }
        updates.contactEmail = normalizedContact;
      } else {
        updates.contactEmail = null;
      }
    }

    if (phone !== undefined) {
      if (phone && phone.trim().length > 30) {
        return res.status(400).json({ message: "Phone number must be 30 characters or fewer" });
      }
      updates.phone = phone ? phone.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      returnDocument: "after",
      runValidators: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


// ==================== FORGOT PASSWORD ====================
// Always responds with 200 to prevent email enumeration attacks.
const forgotPassword = async (req, res) => {
  const crypto   = require("crypto");
  const sendEmail = require("../utils/sendEmail");

  try {
    const email = normalizeEmail(req.body.email || "");

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    // Always return 200 — never reveal whether the email exists
    const successMsg = "If an account with that email exists, a password reset link has been sent.";

    if (!user) {
      return res.status(200).json({ message: successMsg });
    }

    // ── Generate secure token (hex) ────────────────────────────────────────
    const rawToken    = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt   = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = expiresAt;
    await user.save({ validateBeforeSave: false });

    // ── Build reset URL ────────────────────────────────────────────────────
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    const resetUrl    = `${frontendUrl}/reset-password/${rawToken}`;

    // ── Send email ─────────────────────────────────────────────────────────
    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset Your CertVault Password</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="100%" style="max-width:520px;background:#1e293b;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4338ca,#6d28d9);padding:32px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🏅</div>
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">CertVault</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">Password Reset Request</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#f1f5f9;">Hi ${user.name},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.7;">
            We received a request to reset the password for your CertVault account.
            Click the button below to set a new password. This link is valid for <strong style="color:#c7d2fe;">1 hour</strong>.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 28px;">
              <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#4338ca,#6d28d9);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;letter-spacing:0.2px;">
                Reset My Password →
              </a>
            </td></tr>
          </table>

          <!-- Fallback URL -->
          <p style="margin:0 0 8px;font-size:12px;color:#64748b;">If the button doesn't work, copy and paste this link:</p>
          <p style="margin:0 0 24px;word-break:break-all;">
            <a href="${resetUrl}" style="color:#818cf8;font-size:12px;">${resetUrl}</a>
          </p>

          <!-- Warning -->
          <div style="background:#1a2744;border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:14px 18px;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
              🔒 If you didn't request a password reset, you can safely ignore this email.
              Your password will not change until you click the link above.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 40px 28px;text-align:center;border-top:1px solid #334155;">
          <p style="margin:0;font-size:11px;color:#475569;">
            © ${new Date().getFullYear()} CertVault · This is an automated message, please do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await sendEmail({
        to:      user.email,
        subject: "Reset your CertVault password",
        html,
        text:    `Reset your CertVault password using this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
      });
    } catch (emailErr) {
      // If email fails, clear the token so it can be re-requested
      user.passwordResetToken   = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("Email send error:", emailErr.message);
      return res.status(500).json({ message: "Failed to send reset email. Please try again later." });
    }

    res.status(200).json({ message: successMsg });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== RESET PASSWORD ====================
const resetPassword = async (req, res) => {
  const crypto = require("crypto");

  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }
    if (!password) {
      return res.status(400).json({ message: "New password is required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (password.length > 128) {
      return res.status(400).json({ message: "Password must be 128 characters or fewer" });
    }

    // Hash the incoming raw token and look it up
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() },  // must not be expired
    });

    if (!user) {
      return res.status(400).json({
        message: "This reset link is invalid or has expired. Please request a new one.",
      });
    }

    // ── Update password ────────────────────────────────────────────────────
    user.password             = await require("bcryptjs").hash(password, 12);
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // ── Issue a new JWT so the user is immediately logged in ───────────────
    const jwt   = require("jsonwebtoken");
    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Password reset successful. You are now logged in.",
      token: jwtToken,
      user: {
        id:           user._id,
        name:         user.name,
        email:        user.email,
        organization: user.organization,
        role:         user.role,
      },
    });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== GOOGLE OAUTH LOGIN ====================
const googleLogin = async (req, res) => {
  const { OAuth2Client } = require("google-auth-library");

  try {
    const { credential, role: requestedRole } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google OAuth is not configured on this server" });
    }

    // ── Verify the Google ID token ─────────────────────────────────────────
    const client  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let payload;

    try {
      const ticket = await client.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: "Invalid Google credential. Please try again." });
    }

    const { sub: googleId, email: rawEmail, name } = payload;
    const email = normalizeEmail(rawEmail);

    // ── Find or create user ────────────────────────────────────────────────
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // New user — create a recipient account by default.
      // (Organizations should register with email/password to provide org name.)
      const oauthRole = SELF_REGISTERABLE_ROLES.includes(requestedRole)
        ? requestedRole
        : "recipient";

      user = await User.create({
        name:         name || email.split("@")[0],
        email,
        // Random password — account can only be accessed via Google or forgot-password
        password:     require("crypto").randomBytes(32).toString("hex"),
        googleId,
        role:         oauthRole,
        organization: null,
        isActive:     true,
      });
    } else {
      // Link Google account to existing email/password user
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save({ validateBeforeSave: false });
      }
    }

    // ── Guard: deactivated account ─────────────────────────────────────────
    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // ── Issue JWT ──────────────────────────────────────────────────────────
    const jwtToken = require("jsonwebtoken").sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Google sign-in successful",
      token: jwtToken,
      user: {
        id:           user._id,
        name:         user.name,
        email:        user.email,
        organization: user.organization,
        role:         user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error.message);
    res.status(500).json({ message: "Server error during Google sign-in" });
  }
};

module.exports = {
  normalizeEmail,
  registerUser,
  loginUser,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  googleLogin,
};