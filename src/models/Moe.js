import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    adminEmail: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,

      //* inside model validation
      // validate:{
      //   validator: isEmail,
      //   message: 'Please enter valid email',
      //   isAsync: false
      // }
    },
    telephone: { type: String, required: true },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    signature: {
      imageUrl: { type: String, required: false },
      uploadDate: { type: Date },
    },
    privateKey: { type: String, required: false },
    publicKey: { type: String, required: false },
    vaultAddress: { type: String, required: false },
    logoUrl: { type: String, required: false },
    siteUrl: { type: String, required: true },
    password: { type: String, required: false },
    isVerified: { type: Boolean, default: false, required: true },
    qrCode: { type: String, required: false },
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

module.exports = mongoose.model("moe", schema);
