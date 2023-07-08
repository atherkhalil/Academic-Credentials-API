import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    moeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    moeName: {
      type: String,
    },
    moePublicKey: {
      type: String,
    },
    type: {
      type: String,
      enum: ["ACCREDITED", "NON-ACCREDITED", "EMPLOYER"],
    },
    name: {
      type: String,
      required: true,
    },
    adminEmail: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
      //* use validate for inside field validation
      // validate:{
      //   validator: isEmail,
      //   message: 'Please enter valid email',
      //   isAsync: false
      // }
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      required: false,
    },
    telephone: {
      type: String,
      required: true,
    },

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

    siteUrl: {
      type: String,
      required: true,
    },
    logoUrl: {
      type: String,
    },

    signature: {
      imageUrl: {
        type: String,
        required: false,
      },
      uploadDate: {
        type: Date,
        required: false,
      },
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

    approved: {
      type: Boolean,
      required: true,
      default: false,
    },

    approvalDate: {
      type: Date,
      required: false,
    },

    description: {
      type: String,
      required: true,
    },

    revocationList: [],

    affiliatedInstitutes: {
      name: {
        type: String,
        required: false,
      },
      logoUrl: {
        type: String,
        required: false,
      },
      active: {
        type: Boolean,
        required: false,
      },
    },

    password: {
      type: String,
      required: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
      required: true,
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

    configs: {
      emailConfigs: {
        username: { type: String },
        password: { type: String },
        host: { type: String },
        port: { type: String },
        secure: { type: Boolean },
        cc: [],
        bcc: [],
      },
    },

    fcm: [],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("issuer", schema);
