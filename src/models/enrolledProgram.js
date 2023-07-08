import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    learnerId: { type: String, required: true },
    issuerId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { enum: ["MALE", "FEMALE"], type: String, required: true },
    telephone: { type: String, required: true },
    email: { type: String, required: true },
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

    program: {
      programId: { type: String, required: true },
      title: { type: String, required: true },
      registrationNumber: { type: String, required: true },
      programRegistrationNumber: { type: String, required: true },
      enrollmentDate: { type: Date, default: Date.now() },
      creditHours: { type: String },
      level: { type: String },

      status: {
        enum: ["IN PROGRESS", "COMPLETED", "DROPPED", "FREEZE"],
        type: String,
      },
      majorSelection: {
        enum: ["SINGLE", "DOUBLE"],
        type: String,
      },
      majors: [
        {
          majorId: { type: String },
          title: { type: String },
        },
      ],
      status: {
        enum: ["IN PROGRESS", "DROPPED", "COMPLETED"],
        type: String,
        required: true,
        default: "IN PROGRESS",
      },
      session: { type: String },
      duration: { type: String },
      // sessionType: { type: String },
      totalSemesters: { type: Number },
      totalYears: { type: Number },
      cgpa: { type: Number },
      MajorsSelection: {
        enum: ["SINGLE", "DOUBLE"],
        type: String,
      },
      majors: [
        {
          title: String,
          majorId: String,
        },
      ],
      semesters: [
        {
          semesterNumber: { type: Number, required: true },
          creditHours: { type: Number, required: true },
          status: {
            enum: ["IN PROGRESS", "FREEZE", "COMPLETED", "DROPPED"],
            type: String,
          },
          totalCourses: { type: Number },
          gpa: { type: Number },

          // startingDate: { type: Date },
          // endDate: { type: Date },
          courses: [
            {
              courseId: { type: String },
              code: { type: String },
              title: { type: String, required: true },
              description: { type: String },
              creditHours: { type: Number },
              totalMarks: { type: Number },
              passingCriteria: { type: String },
              obtainMarks: { type: Number },
              grade: { type: String },
              creditPoints: {
                type: Number,
              },
            },
          ],
        },
      ],
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("learnerProgram", schema);
