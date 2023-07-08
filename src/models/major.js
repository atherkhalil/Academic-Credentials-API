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
      unique: true,
    },
    faculty: {
      type: String,
      required: true,
    },
    courses: [
      {
        courseId: {
          type: String,
        },
        courseName: {
          type: String,
        },
        compulsory: {
          type: Boolean,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("major", schema);
