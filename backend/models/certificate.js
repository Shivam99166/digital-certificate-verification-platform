const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    recipientName: {
      type: String,
      required: true,
      trim: true,
    },

    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    courseName: {
      type: String,
      required: true,
      trim: true,
    },

    organization: {
      type: String,
      required: true,
      trim: true,
    },

    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expiryDate: {
      type: Date,
      default: null,
    },
  

    status: {
      type: String,
      enum: ["VALID", "REVOKED", "EXPIRED"],
      default: "VALID",
    },

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    qrCode: {
    type: String,
    default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Certificate", certificateSchema);