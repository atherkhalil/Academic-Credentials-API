import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    issuerId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
    },
    faculty: {
      type: String,
    },

    level: {
      type: String,
    },

    duration: {
      type: String,
    },

    creditHours: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
    totalSemesters: {
      type: Number,
      default: 0,
    },

    totalYears: {
      type: Number,
      default: 0,
    },

    major: [
      {
        title: { type: String },
        majorId: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("program", schema);
