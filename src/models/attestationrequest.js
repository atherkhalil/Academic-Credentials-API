import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    moeId: {
      type: String,
      required: true,
    },
    moeName: {
      type: String,
      required: true,
    },
    attestationStatus: {
      status: {
        enum: ["PENDING", "APPROVED", "REJECT"],
        type: String,
        required: true,
      },
      date: {
        type: Date,
        required: true,
      },
    },

    type: {
      enum: ["ACADEMIC", "EMPLOYMENT"],
      type: String,
      required: true,
    },
    credentialId: {
      type: String,
      required: true,
    },
    courseId: {
      type: String,
      required: true,
    },
    faculty: {
      type: String,
    },
    level: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    creditHours: {
      type: Number,
    },
    cgpa: {
      type: String,
    },
    issuanceDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    session: {
      type: String,
    },

    credentialUrl: {
      type: String,
    },

    issuerSign: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      status: {
        enum: ["PENDING", "SIGNED", "REJECTED"],
        type: String,
        required: true,
      },
      date: {
        type: Date,
      },
      publicKey: {
        type: String,
      },

      issuerECDSA: {
        signingDate: {
          type: Date,
        },
        r: {
          type: String,
        },
        s: {
          type: String,
        },
        k: {
          type: String,
        },
      },
    },

    learnerSign: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      status: {
        enum: ["PENDING", "SIGNED", "REJECTED"],
        type: String,
      },
      date: {
        type: Date,
      },
      publicKey: {
        type: String,
      },
      learnerECDSA: {
        signingDate: {
          type: Date,
        },
        r: {
          type: String,
        },
        s: {
          type: String,
        },
        k: {
          type: String,
        },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("attestationRequest", schema);
