import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    learnerId: { type: String, required: true },
    issuerId: { type: String, required: true },
    moeId: { type: String, required: true },
    credentialId: { type: String, required: true },

    // Required Documents for Equivalency:
    graduateCertificate: {
      base64: {
        type: String,
      },
      status: {
        enum: ["UPLOADED", "APPROVED", "REJECTED"],
        type: String,
      },
    },

    Transcript: {
      base64: {
        type: String,
      },
      status: {
        enum: ["UPLOADED", "APPROVED", "REJECTED"],
        type: String,
      },
    },

    transferredHours: {
      base64: {
        type: String,
      },
      status: {
        enum: ["UPLOADED", "APPROVED", "REJECTED"],
        type: String,
      },
    },

    highSchoolCertificate: {
      base64: {
        type: String,
      },
      status: {
        enum: ["UPLOADED", "APPROVED", "REJECTED"],
        type: String,
      },
    },

    legalTranslation: {
      base64: {
        type: String,
      },
      status: {
        enum: ["UPLOADED", "APPROVED", "REJECTED"],
        type: String,
      },
    },

    authenticityOfTheQualification: {
      base64: {
        type: String,
      },
      status: {
        enum: ["UPLOADED", "APPROVED", "REJECTED"],
        type: String,
      },
    },

    attendanceInTheCountryOfStudy: {
      base64: {
        type: String,
      },
      status: {
        enum: ["UPLOADED", "APPROVED", "REJECTED"],
        type: String,
      },
    },

    equivalencyCertificate: {
      type: String,
    },

    trackingStatus: [
      {
        type: {
          enum: ["APPLIED", "RE-APPLIED", "EQUIVALATED"],
          type: String,
        },
        status: {
          enum: ["APPLIED", "RE-APPLIED", "EQUIVALATED", "REJECTED"],
          type: String,
        },
        date: { type: Date },
        comment: { type: String },
      },
    ],

    status: {
      enum: ["PENDING", "EQUIVALATED", "REJECTED"],
      type: String,
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("equivalency", schema);
