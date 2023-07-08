import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    issuerId: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    percentageFrom: {
      type: Number,
      required: true,
    },
    percentageTo: {
      type: Number,
      required: true,
    },
    gpa: {
      type: Number,
      required: true,
    },
    credits: {
      type: Number,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("grade", schema);
