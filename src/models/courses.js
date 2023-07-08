import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    issuerId: { type: String, required: true },
    code: { type: String, unique: true, required: true },
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    faculty: { type: String, required: true },
    active: { type: Boolean, default: true },
    creditHours: { type: Number },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("courses", schema);
