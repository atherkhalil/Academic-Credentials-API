import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      enum: ["MALE", "FEMALE"],
      type: String,
      required: true,
    },
    telephone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    programs: [
      {
        programId: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        issuerId: {
          type: String,
          required: true,
        },
        enrollmentDate: {
          type: Date,
        },
      },
    ],

    address: {
      country: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      street: {
        type: String,
        required: false,
      },
    },
    password: {
      type: String,
      required: false,
    },
    privateKey: {
      type: String,
    },
    publicKey: {
      type: String,
      required: false,
    },
    vaultAddress: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
    signature: {
      imageUrl: {
        type: String,
        required: false,
      },
      uploadDate: {
        type: Date,
      },
    },
    qrCode: {
      type: String,
      required: false,
    },
    secret: {
      ascii: { type: String, trim: true },
      hex: { type: String, trim: true },
      base32: { type: String, trim: true },
      otpauth_url: { type: String, trim: true },
    },
    fcm: [],
  },
  { timestamps: true }
);

module.exports = mongoose.model("learner", schema);
