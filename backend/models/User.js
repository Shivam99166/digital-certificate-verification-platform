const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    // For 'organization' role: the org's official name (required).
    // For 'recipient' role: their employer/affiliation (optional).
    organization: {
      type: String,
      trim: true,
      default: null,
    },

    // Extended profile fields (Phase 10)
    website: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },

    // Roles:
    //   "organization" — can issue, view, and revoke certificates
    //   "recipient"    — can view their own certificates (Phase 5)
    //   "admin"        — super admin, all permissions
    role: {
      type: String,
      enum: ["organization", "recipient", "admin"],
      default: "organization",
    },

    // Admins can deactivate/reactivate organization accounts
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Password reset ──────────────────────────────────────────────────────
    // The raw token is sent in the email; only the SHA-256 hash is stored here.
    passwordResetToken: {
      type: String,
      default: null,
      index: true,   // fast lookup by token hash
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },

    // ── Google OAuth ────────────────────────────────────────────────────────
    // Set when the user first signs in with Google. Allows account linking:
    // an existing email/password user can later use Google Sign-In for the
    // same account.
    googleId: {
      type: String,
      default: null,
      sparse: true,  // unique index that ignores null values
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);