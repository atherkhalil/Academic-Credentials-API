import {
  MoeOnBoardingValidation,
  MAIL_USERNAME,
  hashPassword,
  comparePassword,
  issuerOnBoardingValidation,
  FRONTEND_URL,
  BLOCKCHAIN_ENABLE,
  MONTH_ARRAY,
  TWO_FA_ENABLE,
} from "../../utils";
import {
  OnBoarding_Mail,
  SaveNotification,
  SEND_FCM,
} from "../../services/helper";
import Speakeasy from "speakeasy";
import QRCode from "qrcode";
import _ from "lodash";
import credentialService from "../../services/certificate.service";
import helper from "../../services/helper";
import {
  ValidationError,
  UserInputError,
  ApolloError,
  AuthenticationError,
  SyntaxError,
  ForbiddenError,
} from "apollo-server-express";
import validator from "validator";
const { equals } = validator;
import { PubSub } from "graphql-subscriptions";
// const PUBSUB = new PubSub();

import path from "path";
import fs from "fs-extra";
import readXlsxFile from "read-excel-file/node";

// * Model
import MOE from "../../models/Moe";
import ISSUER from "../../models/Issuer";
import PROGRAM from "../../models/program";
import LEARNER from "../../models/learner";
import CREDENTIAL from "../../models/Credentials";
import COURSE from "../../models/courses";
import ENROLLED_PROGRAM from "../../models/enrolledProgram";
import GRADE from "../../models/grade";
import MAJOR from "../../models/major";
import NOTIFICATION from "../../models/notifications";

import { generateToken } from "../../auth/jwt/jwt";
import bcService from "../../services/bc.service";
import axios from "axios";

import { info } from "winston";
import { processGraphQLRequest } from "apollo-server-core/dist/requestPipeline";
import { pipeline } from "stream";
import { ifError } from "assert";
import { readSheetNames } from "read-excel-file";

module.exports = {
  Query: {
    GetIssuerDetail: async (parent, args, { pubsub }, info) => {
      try {
        const isIssuer = await ISSUER.findById(args.issuerId);
        if (!isIssuer) throw new ApolloError("Record not found");
        return isIssuer;
      } catch (error) {
        console.log(error, "CatchError");
        throw new ApolloError(error);
      }
    },

    GetProgramsByIssuer: async (parent, args, { pubsub, user }, info) => {
      try {
        const isCourses = await PROGRAM.find({ issuerId: { $eq: user._id } });
        if (!isCourses) throw new ApolloError("Record not found");
        return isCourses;
      } catch (error) {
        console.log(error, "CatchError");
        throw new ApolloError(error);
      }
    },

    GetLearnersByIssuer: async (parent, args, { pubsub, user }, info) => {
      try {
        const isIssuer = await ISSUER.findById(user._id);
        if (!isIssuer) throw new AuthenticationError("Invalid issuer");
        const learners = await LEARNER.find({
          courses: { $elemMatch: { issuerId: user._id } },
        });
        return learners;
      } catch (error) {
        console.log(error, "CatchError");
        throw new Error(error);
      }
    },

    GetCredentialBYId: async (parent, args, { pubsub }, info) => {
      try {
        const isCredential = await CREDENTIAL.findById(args.credentialId);
        if (!isCredential) throw new Error("Record not found.");

        return isCredential;
      } catch (error) {
        console.log(error, "CatchError");
        throw new Error(error);
      }
    },

    GetCredentials: async (parent, args, { pubsub, user }, info) => {
      try {
        let cond;

        if (user.currentLogin == "ISSUER") {
          cond = {
            "issuer.id": { $eq: user._id },
          };
        } else if (user.currentLogin == "LEARNER") {
          cond = {
            "learner.id": { $eq: user._id },
          };
        }

        const credentials = await CREDENTIAL.find(cond);

        return credentials;
      } catch (error) {
        console.log(error, "CatchError");
        throw new Error(error);
      }
    },

    GetCredentialsBYProgramId: async (parent, args, { pubsub }, info) => {
      try {
        const credentials = await CREDENTIAL.find({
          programId: { $eq: args.Id },
        });

        if (!credentials) throw new Error("Records not found.");
        return credentials;
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },

    GetIssuerDashboardData: async (parent, args, { pubsub, user }, info) => {
      try {
        const isIssuer = await ISSUER.findById(user._id);
        if (!isIssuer) throw new Error("Invalid Issuer Id.");
        let currentYear = new Date();
        let year = currentYear.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const LastDayOfYear = new Date(year, 12, 0);
        firstDayOfYear.setDate(firstDayOfYear.getDate() + 1);

        const totalLearner = await LEARNER.find({
          "programs.issuerId": user._id,
        }).countDocuments();

        const totalCredentials = await CREDENTIAL.find({
          "issuer.id": user._id,
        }).countDocuments();

        const totalPrograms = await PROGRAM.find({
          issuerId: user._id,
        }).countDocuments();

        const totalMajors = await MAJOR.find({
          issuerId: user._id,
        }).countDocuments();

        const totalCourses = await COURSE.find({
          issuerId: user._id,
        }).countDocuments();

        let yearlyRegistrationArray = [];

        for (let a = 0; a < 5; a++) {
          let firstDay = new Date(year, 0, 1);
          let lastDay = new Date(year, 12, 0);
          firstDay.setDate(firstDay.getDate() + 1);

          const YearlyRegisterLearners = await LEARNER.find({
            programs: { $elemMatch: { issuerId: user._id } },
            programs: {
              $elemMatch: {
                enrollmentDate: {
                  $gte: firstDay,
                  $lte: lastDay,
                },
              },
            },
          }).countDocuments();

          const yearObj = {
            year: year,
            registerStudent: YearlyRegisterLearners,
          };
          yearlyRegistrationArray.push(yearObj);
          year--;
        }

        const issuerPrograms = await PROGRAM.find({
          issuerId: { $eq: user._id },
        });

        let LearnerByProgram = [];

        let currentDate = new Date(args.year);
        let onGoingYear = currentDate.getFullYear();
        for (const i in issuerPrograms) {
          let firstDayOfYear = new Date(onGoingYear, 0, 1);
          let lastDayOfYear = new Date(onGoingYear, 12, 0);
          firstDayOfYear.setDate(firstDayOfYear.getDate() + 1);

          const learners = await LEARNER.find({
            programs: {
              $elemMatch: {
                programId: issuerPrograms[i]._id,
                enrollmentDate: {
                  $gte: firstDayOfYear,
                  $lte: lastDayOfYear,
                },
              },
            },
          }).countDocuments();

          const Obj = {
            programId: issuerPrograms[i]._id,
            title: issuerPrograms[i].title,
            learners: learners,
            year: onGoingYear,
          };

          LearnerByProgram.push(Obj);
        }

        let data = {
          totalLearner: totalLearner,
          totalCredentials: totalCredentials,
          totalPrograms: totalPrograms,
          totalMajors: totalMajors,
          totalCourses: totalCourses,
          yearlyRegistration: yearlyRegistrationArray,
          LearnerByProgram: LearnerByProgram,
        };

        return data;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },

    GetCoursesByIssuer: async (parent, args, { pubsub, user }, info) => {
      try {
        const isIssuer = await ISSUER.findById(user._id);
        if (!isIssuer) throw new Error("Invalid issuerId");
        const courses = await COURSE.find({ issuerId: { $eq: user._id } });
        return courses;
      } catch (error) {
        console.log(error, "error");
        return new Error(error);
      }
    },

    GetCourseById: async (parent, args, { pubsub, user }, info) => {
      try {
        const isIssuer = await ISSUER.findById(user._id);
        if (!isIssuer) throw new Error("Invalid issuerId");
        const courses = await COURSE.findById(args.courseId);
        return courses;
      } catch (error) {
        console.log(error, "error");
        return new Error(error);
      }
    },

    GetGradeBYIssuer: async (parent, args, { pubsub, user }, info) => {
      try {
        const grades = await GRADE.find({ issuerId: { $eq: user._id } });
        return grades;
      } catch (error) {
        console.log(error, "error");
        return new Error(error);
      }
    },

    GetGradeBYId: async (parent, args, { pubsub, user }, info) => {
      try {
        const grades = await GRADE.findById(args.gradeId);
        return grades;
      } catch (error) {
        console.log(error, "error");
        return new Error(error);
      }
    },

    getLearnerProgramsByIssuer: async (
      parent,
      args,
      { pubsub, user },
      info
    ) => {
      try {
        const enrolledProgram = await ENROLLED_PROGRAM.find({
          learnerId: args.learnerId,
          issuerId: user._id,
        });
        console.log(enrolledProgram, "enrolledProgram");
        return enrolledProgram;
      } catch (error) {
        throw new Error(error);
      }
    },

    GetProgramByID: async (parent, args, { pubsub, user }, info) => {
      try {
        const isProgram = await PROGRAM.findById(args.Id);
        if (!isProgram) throw new Error("Record not found.");

        const majorIds = isProgram.major.map((x) => {
          return x.majorId;
        });

        const majors = await MAJOR.find({ _id: { $in: majorIds } });
        const program = {
          id: isProgram._id,
          issuerId: isProgram.issuerId,
          title: isProgram.title,
          duration: isProgram.duration,
          creditHours: isProgram.creditHours,
          code: isProgram.code,
          description: isProgram.description,
          active: isProgram.active,
          createdAt: isProgram.createdAt,
          level: isProgram.level,
          faculty: isProgram.faculty,
          updatedAt: isProgram.updatedAt,
          totalSemesters: isProgram.totalSemesters,
          totalYears: isProgram.totalYears,
          major: majors,
        };

        return program;
      } catch (error) {
        throw new Error(error);
      }
    },

    GetMajorByIssuer: async (parent, args, { pubsub, user }, info) => {
      try {
        const major = await MAJOR.find({
          issuerId: { $eq: user._id },
        });

        let majorArr = [];

        for (const y of major) {
          let coursesArr = [];
          let mObj = {};
          for (const x of y.courses) {
            let obj = {};
            const course = await COURSE.findById(x.courseId);
            obj.compulsory = x.compulsory;
            obj.courseId = x.courseId;
            obj.active = course.active;
            obj.issuerId = course.issuerId;
            obj.code = course.code;
            obj.title = course.title;
            obj.description = course.description;
            obj.faculty = course.faculty;
            obj.creditHours = course.creditHours;
            obj.createdAt = course.createdAt;
            obj.updatedAt = course.updatedAt;
            coursesArr.push(obj);
          }
          mObj._id = y._id;
          mObj.issuerId = y.issuerId;
          mObj.title = y.title;
          mObj.code = y.code;
          mObj.faculty = y.faculty;
          mObj.courses = coursesArr;
          mObj.createdAt = y.createdAt;
          mObj.updatedAt = y.updatedAt;
          majorArr.push(mObj);
        }

        return majorArr;
      } catch (error) {
        throw new Error(error);
      }
    },

    GetMajorByIds: async (parent, args, { pubsub, user }, info) => {
      try {
        const major = await MAJOR.find({ _id: { $in: args.majors } });
        let majorArr = [];
        for (const y of major) {
          let coursesArr = [];
          let mObj = {};
          for (const x of y.courses) {
            let obj = {};
            const course = await COURSE.findById(x.courseId);
            obj.compulsory = x.compulsory;
            obj.courseId = x.courseId;
            obj.active = course.active;
            obj.issuerId = course.issuerId;
            obj.code = course.code;
            obj.title = course.title;
            obj.description = course.description;
            obj.faculty = course.faculty;
            obj.creditHours = course.creditHours;
            obj.createdAt = course.createdAt;
            obj.updatedAt = course.updatedAt;
            coursesArr.push(obj);
          }
          mObj.issuerId = y.issuerId;
          mObj.title = y.title;
          mObj.code = y.code;
          mObj.faculty = y.faculty;
          mObj.courses = coursesArr;
          mObj.createdAt = y.createdAt;
          mObj.updatedAt = y.updatedAt;
          majorArr.push(mObj);
        }
        return majorArr;
      } catch (error) {
        throw new Error(error);
      }
    },
    getEnrolledProgramById: async (parent, args, { pubsub, user }, info) => {
      try {
        const enrolledProgram = await ENROLLED_PROGRAM.findById(
          args.enrolledProgramId
        );

        const isCredential = await CREDENTIAL.findOne({
          programId: { $eq: args.enrolledProgramId },
        });
        const data = {
          enrolledProgram: enrolledProgram,
          isCredential: isCredential ? true : false,
        };
        return data;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },

    GetNotifications: async (parent, args, { pubsub, user }, info) => {
      try {
        let notification = await NOTIFICATION.find({
          "notifiedTo.id": { $eq: user._id },
        });
        if (!notification) throw new Error("Records not found.");
        return notification;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },
  },

  Mutation: {
    syncLearners: async (parent, args, { pubsub, user }, info) => {
      try {
        const issuer = await ISSUER.findById(user._id);
        const Path = path.join(__dirname, "../../assets/files");
        const { createReadStream, filename } = await args.file;
        const stream = createReadStream();
        await stream.pipe(fs.createWriteStream(`${Path}/${filename}`));

        setTimeout(function () {
          ReadFile();
        }, 3000);

        const filePath = path.join(__dirname, `../../assets/files/${filename}`);

        function ReadFile() {
          // readSheetNames(filePath).then((sheetNames) => {
          //   for (const sheet of sheetNames) {

          //     if (sheet == "Learner") {
          //       readSheetNames(filePath, { sheet: sheet }).then((data) => {
          //         console.log(data);
          //       });
          //     }
          //   }
          // });

          readXlsxFile(filePath, { getSheets: true }).then(async (sheets) => {
            for (const sheet of sheets) {
              if (sheet.name == "LEARNER") {
                readXlsxFile(filePath, { sheet: "LEARNER" }).then(
                  async (sheet) => {
                    sheet.shift();
                    for (let i = 0; i < sheet.length; ++i) {
                      const learner = new LEARNER();
                      if (sheet[i][5]) {
                        const isLeaner = await LEARNER.findOne({
                          email: { $eq: sheet[i][5] },
                        });
                        if (!isLeaner) {
                          learner.firstName = sheet[i][0];
                          learner.lastName = sheet[i][1];
                          learner.dob = sheet[i][2];
                          learner.gender = sheet[i][3];
                          learner.telephone = sheet[i][4];
                          learner.email = sheet[i][5];
                          // * Address
                          const address = {
                            country: sheet[i][6],
                            city: sheet[i][7],
                            street: sheet[i][8],
                          };
                          learner.address = address;
                          //  * Programs
                          let programsArr = [];
                          if (sheet[i][9]) {
                            const program = await PROGRAM.findOne({
                              title: { $eq: sheet[i][9] },
                            });
                            const programObj = {
                              programId: program._id,
                              title: program.title,
                              issuerId: user._id,
                              enrollmentDate: sheet[i][10],
                            };
                            programsArr.push(programObj);
                            learner.programs = programsArr;
                            if (!sheet[i + 1][5] && sheet[i + 1][9]) {
                              for (var x = i + 1; x < sheet.length; ++x) {
                                if (!sheet[x][5] && sheet[x][9]) {
                                  const program = await PROGRAM.findOne({
                                    title: { $eq: sheet[x][9] },
                                  });
                                  const programObj = {
                                    programId: program._id,
                                    title: program.title,
                                    issuerId: user._id,
                                    enrollmentDate: sheet[i][10],
                                  };
                                  // programsArr.push(programObj);
                                  learner.programs.push(programObj);
                                } else {
                                  i = x - 1;
                                  break;
                                }
                              }
                            }
                            await learner.save();
                          }
                        } else {
                          console.log("Already register");
                        }
                      }
                    }
                  }
                );
              } else if (sheet.name == "LEARNER PROGRAM") {
                readXlsxFile(filePath, { sheet: "LEARNER PROGRAM" }).then(
                  async (sheet) => {
                    sheet.shift();

                    for (let i = 0; i < sheet.length; ++i) {
                      if (sheet[i][0]) {
                        const isLeaner = await LEARNER.findOne({
                          email: { $eq: sheet[i][0] },
                        });
                        if (isLeaner) {
                          const enrolledProgram = new ENROLLED_PROGRAM();

                          const isEnrolled = await ENROLLED_PROGRAM.findOne({
                            email: { $eq: sheet[i][5] },
                          });

                          if (!enrolledProgram) {
                            enrolledProgram.firstName = sheet[i][0];
                            enrolledProgram.lastName = sheet[i][1];
                            enrolledProgram.dob = sheet[i][2];
                            enrolledProgram.gender = sheet[i][3];
                            enrolledProgram.telephone = sheet[i][4];
                            enrolledProgram.email = sheet[i][5];
                          }
                        }
                      }
                    }
                  }
                );
              }
            }
          });
        }

        return "Sync Successfully";
      } catch (error) {
        console.log(error, "Error");
        throw new Error(error);
      }
    },

    // importLearners: async (parent, args, { pubsub, user }, info) => {
    //   try {
    //     const learners = args.learners;
    //     for (var i of learners) {
    //       const learner = new LEARNER();
    //     }
    //   } catch (error) {
    //     console.log(error);
    //     throw new Error(error);
    //   }
    // },

    IssuerOnBoarding: async (parent, args, { pubsub }, info) => {
      try {
        const params = args.data;
        let secret;
        let qrCode;
        const isIssuer = await ISSUER.findOne({
          adminEmail: { $eq: params.adminEmail },
        });
        if (isIssuer) throw new UserInputError("Email already exit.");

        // * if validation Error return Error
        const isValidationErrors = await issuerOnBoardingValidation(params);
        if (!isValidationErrors.valid) {
          console.log(isValidationErrors.errors);
          return new ValidationError(JSON.stringify(isValidationErrors.errors));
        }
        //  Generating QR code
        secret = Speakeasy.generateSecret({ length: 20 });
        await QRCode.toDataURL(secret.otpauth_url)
          .then((url) => {
            qrCode = url;
          })
          .catch((err) => {
            console.log(err.message < "Creating QRcode");
          });

        const moe = await MOE.findOne();
        // * Saved to db
        const issuer = new ISSUER({
          moeId: moe._id,
          type: params.type,
          name: params.name,
          adminEmail: params.adminEmail,
          telephone: params.telephone,
          description: params.description,
          siteUrl: params.siteUrl,
          qrCode: qrCode,
          secret: secret,
        });

        const savedIssuer = await issuer.save();

        if (savedIssuer) {
          // * Sending verification mail to MoE

          let mail_Params = {
            from: savedIssuer.adminEmail,
            to: moe.adminEmail,
            subject: "Issuer onBoarding Request",
            message: `${savedIssuer.name} Send ON Boarding request in our Platform`,
            redirectUrl: `${FRONTEND_URL}/moe/accredited-institutes`,
          };

          await OnBoarding_Mail(mail_Params);

          // * Notification Saved in DB
          const notificationParams = {
            notifiedBy: {
              entity: "ISSUER",
              id: savedIssuer._id,
            },
            notifiedTo: {
              entity: "MOE",
              id: savedIssuer.moeId,
            },
            notificationDate: Date.now(),
            status: "UN_SEEN",
            notificationItem: {
              type: "ONBOARDING_REQUEST",
              id: savedIssuer._id,
            },
            subject: `OnBoarding Request.`,
            notifyMessage: `${savedIssuer.name} has requested for academic accreditation.`,
          };
          await SaveNotification(notificationParams);

          // * Real time Notification

          pubsub.publish("issuerOnBoard", {
            issuerOnBoard: {
              notifiedBy: notificationParams.notifiedBy,
              notifiedTo: notificationParams.notifiedTo,
              notificationDate: notificationParams.notificationDate,
              status: notificationParams.status,
              subject: notificationParams.subject,
              notifyMessage: notificationParams.notifyMessage,
              notificationItem: notificationParams.notificationItem,
            },
          });

          // * FireBase Notification

          if (process.env.FCM_ENABLE == true) {
            if (moe.fcm.length > 0) {
              await SEND_FCM(moe.fcm, notificationParams);
            }
          }

          return "Your request for on Boarding successfully Sent.";
        }
      } catch (error) {
        console.log("Catch Error.", error);
        throw new ApolloError(error);
      }
    },

    ActivateIssuer: async (parent, args, { pubsub }, info) => {
      try {
        const isIssuer = await ISSUER.findById(args.issuerId);
        if (!isIssuer) return new UserInputError("Invalid Issuer ID.");

        if (TWO_FA_ENABLE == "true") {
          var verified = Speakeasy.totp.verify({
            secret: isIssuer.secret.base32,
            encoding: "base32",
            token: args.otp,
          });

          if (!verified) throw new UserInputError("Invalid OTP.");
        }

        isIssuer.isVerified = true;
        await isIssuer.save();

        let data = {
          _id: isIssuer._id,
          name: isIssuer.name,
          adminEmail: isIssuer.adminEmail,
          telephone: isIssuer.telephone,
          contactEmail: isIssuer.contactEmail,
          publicKey: isIssuer.publicKey,
          signature: isIssuer.signature,
          logoUrl: isIssuer.logoUrl,
          siteUrl: isIssuer.siteUrl,
          isVerified: isIssuer.isVerified,
          createdAt: isIssuer.createdAt,
          updatedAt: isIssuer.updatedAt,
        };

        // * Generating Access Token
        const jwtToken = await generateToken("accessToken", data, "ISSUER");

        return jwtToken;
      } catch (error) {
        console.log(error, "error");
        throw new UserInputError(error);
      }
    },

    SetIssuerPassword: async (parent, args, { pubsub, user }, info) => {
      try {
        let { password, confirmPassword } = args;

        const isIssuer = await ISSUER.findById(user._id);
        if (!isIssuer) throw new UserInputError("Record not Found");

        if (!equals(password, confirmPassword)) {
          throw new UserInputError("Password not matched");
        }
        isIssuer.password = await hashPassword(password);

        await isIssuer.save();

        return "Password saved successfully";
      } catch (error) {
        console.log(error, "Catch Error");
        throw new UserInputError(error);
      }
    },

    IssuerLogin: async (parent, args, { pubsub }, info) => {
      try {
        console.log("in");
        let { email, password } = args;
        const isIssuer = await ISSUER.findOne({ adminEmail: { $eq: email } });
        if (!isIssuer) throw new UserInputError("Email not found.");

        let isMatched = await comparePassword(password, isIssuer.password);
        if (!isMatched) throw new UserInputError("Invalid email or password.");

        let Issuer = {
          _id: isIssuer._id,
          name: isIssuer.name,
          adminEmail: isIssuer.adminEmail,
          telephone: isIssuer.telephone,
          contactEmail: isIssuer.contactEmail,
          publicKey: isIssuer.publicKey,
          signature: isIssuer.signature,
          logoUrl: isIssuer.logoUrl,
          siteUrl: isIssuer.siteUrl,
          isVerified: isIssuer.isVerified,
          createdAt: isIssuer.createdAt,
          updatedAt: isIssuer.updatedAt,
        };

        const jwtToken = await generateToken("accessToken", Issuer, "ISSUER");

        return { Issuer: Issuer, token: jwtToken };
      } catch (error) {
        console.log(error, "Catch Error");
        throw new UserInputError(error);
      }
    },

    UpdateIssuerDetails: async (parent, args, { pubsub, user }, info) => {
      try {
        const isIssuer = await ISSUER.findById(user._id);
        if (!isIssuer) return new UserInputError("Record not found");

        isIssuer.type = args.type;
        isIssuer.name = args.name;
        isIssuer.contactEmail = args.contactEmail;
        isIssuer.telephone = args.telephone;
        isIssuer.address = args.address;
        isIssuer.siteUrl = args.siteUrl;
        isIssuer.description = args.description;
        const updatedIssuer = await isIssuer.save();
        return updatedIssuer;
      } catch (error) {
        console.log(error, "CatchError");
        throw new Error(error);
      }
    },

    AddProgram: async (parent, args, { pubsub, user }, info) => {
      try {
        const isIssuer = await ISSUER.findById(user._id);
        if (!isIssuer) throw new AuthenticationError("Invalid issuer Id.");
        if (!isIssuer.isVerified)
          throw new AuthenticationError("Please verify your account first.");
        console.log(args.data);
        const {
          title,
          duration,
          creditHours,
          code,
          description,
          level,
          faculty,
          // sessionType,
          totalSemesters,
          totalYears,
          // semesters,
          major,
        } = args.data;

        const program = new PROGRAM({
          issuerId: user._id,
          title: title,
          duration: duration,
          creditHours: creditHours,
          code: code,
          description: description,
          level: level,
          faculty: faculty,
          // sessionType: sessionType,
          totalSemesters: totalSemesters,
          totalYears: totalYears,
          major: major,
        });

        const savedProgram = await program.save();
        return savedProgram;
      } catch (error) {
        console.log(error, "CatchError");
        throw new ApolloError(error);
      }
    },

    UpdateProgramStatus: async (parent, args, { pubsub, user }, info) => {
      try {
        const { Id, active } = args;
        const isProgram = await PROGRAM.findOne({
          _id: { $eq: Id },
          issuerId: { $eq: user._id },
        });
        if (!isProgram) throw ApolloError("Program not found");
        isProgram.active = active;
        const updatedProgram = await isProgram.save();
        return updatedProgram;
      } catch (error) {
        console.log(error, "CatchError");
        throw new Error(error);
      }
    },

    UpdateProgram: async (parent, args, { pubsub, user }, info) => {
      try {
        const payload = args.data;
        const isProgram = await PROGRAM.findOne({
          issuerId: { $eq: user._id },
          _id: { $eq: payload.programId },
        });

        isProgram.title = payload.title;
        isProgram.duration = payload.duration;
        isProgram.creditHours = payload.creditHours;
        isProgram.code = payload.code;
        isProgram.description = payload.description;
        isProgram.active = payload.active;
        isProgram.level = payload.level;
        isProgram.faculty = payload.faculty;
        // isProgram.sessionType = payload.sessionType;
        isProgram.totalSemesters = payload.totalSemesters;
        isProgram.totalYears = payload.totalYears;
        isProgram.major = payload.major;

        isProgram.updatedAt = Date.now();
        await isProgram.save();
        return "Update Successfully";
      } catch (error) {
        console.log(error);
        return new Error(error);
      }
    },

    DeleteCourseFromSemester: async (parent, args, { pubsub, user }, info) => {
      try {
        await ENROLLED_PROGRAM.updateOne(
          {
            _id: { $eq: args.programId },
          },
          {
            $pull: {
              "program.semesters.$[e1].courses": { _id: args.courseId },
            },
          },
          {
            arrayFilters: [{ "e1.semesterNumber": args.semesterNumber }],
          }
        );
        return "Record Deleted.";
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },

    UpdateCourseInSemester: async (parent, args, { pubsub, user }, info) => {
      const payload = args.data;
      try {
        await ENROLLED_PROGRAM.updateOne(
          {
            _id: payload.programId,
          },
          {
            $set: {
              "program.semesters.$[e1].courses.$[e2]": payload.course,
            },
          },
          {
            arrayFilters: [
              {
                "e1.semesterNumber": payload.semesterNumber,
              },
              {
                "e2._id": payload.course.courseId,
              },
            ],
            multiple: false,
          }
        );
        return "Update successfully.";
      } catch (error) {
        console.log(error);
        return new Error(error);
      }
    },

    createCredentials: async (parent, args, { pubsub, user }, info) => {
      try {
        const params = args.data;
        const [isIssuer, isLearner, isEnrolledProgram] = await Promise.all([
          ISSUER.findById(user._id),
          LEARNER.findById(params.learnerId),
          ENROLLED_PROGRAM.findById(params.programId),
        ]);

        if (!isIssuer) throw new UserInputError("Invalid issuer ID.");
        if (!isLearner) throw new UserInputError("Invalid learner ID.");
        if (!isEnrolledProgram) throw new UserInputError("Invalid course ID.");

        // if (isEnrolledProgram.program.status != "COMPLETED") {
        //   throw new Error("Program is not valid for Credential.");
        // }

        const isCredential = await CREDENTIAL.findOne({
          programId: params.programId,
          "issuer.id": user._id,
          "learner.id": params.learnerId,
        });
        if (isCredential) throw new Error("Credential already exist.");

        const issuer = {
          id: isIssuer._id,
          type: isIssuer.type,
          name: isIssuer.name,
          address: isIssuer.address,
          url: isIssuer.siteUrl,
        };

        const learner = {
          id: isLearner._id,
          publicKey: isLearner.publicKey,
          firstName: isLearner.firstName,
          lastName: isLearner.lastName,
          registrationNumber: isEnrolledProgram.program.registrationNumber,
          courseRegistrationNumber:
            isEnrolledProgram.program.courseRegistrationNumber,
        };

        const moe = {
          moeId: params.moeId,
          moeName: params.moeName,
          publicKey: params.moePublicKey,
        };

        const credential = new CREDENTIAL({
          type: params.type,
          programId: params.programId,
          faculty: params.faculty,
          level: params.level,
          title: params.title,
          description: params.description,
          creditHours: params.creditHours,
          cgpa: params.cgpa,
          issuanceDate: new Date(params.issuanceDate),
          expiryDate: new Date(params.expiryDate),
          session: params.session,
          issuer: issuer,
          learner: learner,
          moe: moe,
          "credentialTrackingStatus.currentStatus": "issuerSign",
          "credentialTrackingStatus.issuerSign.status": "PENDING",
          // "credentialTrackingStatus.issuerSign.date": Date.now(),
        });

        const savedCredential = await credential.save();
        await credentialService.generateHtmlCopy(savedCredential);

        const BCissuer = {
          id: isIssuer._id,
          type: isIssuer.type,
          name: isIssuer.name,
          country: isIssuer.address.country,
          url: isIssuer.siteUrl,
        };

        let BC_Params = {
          id: savedCredential._id,
          courseId: isEnrolledProgram._id,
          level: savedCredential.level,
          faculty: savedCredential.faculty,
          session: credential.session,
          type: savedCredential.type,
          title: savedCredential.title,
          description: savedCredential.description,
          creditHours: savedCredential.creditHours.toString(),
          cgpa: savedCredential.cgpa,
          credentialUrl: "yo",
          issuanceDate: savedCredential.issuanceDate,
          priv_key: isIssuer.privateKey,
          issuer: BCissuer,
          learner: learner,
          moe: moe,
        };

        let res;

        if (BLOCKCHAIN_ENABLE == "true") {
          console.log("In blockChian");
          const result = await bcService.createCredentials(BC_Params);

          res = {
            credentialId: savedCredential._id,
            txnId: result.txnId,
            programId: savedCredential.programId,
          };
        } else {
          res = {
            credentialId: savedCredential._id,
            txnId: "",
            programId: savedCredential.programId,
          };
        }

        //  *  Notifications
        const notificationPayload = {
          notifiedBy: {
            entity: "ISSUER",
            id: user._id,
          },
          notifiedTo: {
            entity: "LEARNER",
            id: learner.id,
          },
          notificationDate: Date.now(),
          status: "UN_SEEN",
          notificationItem: {
            type: "CREDENTIAL",
            id: credential._id,
          },
          subject: `Credential Created.`,
          notifyMessage: `${isIssuer.name} has awarded you the ${credential.title}`,
        };

        await SaveNotification(notificationPayload);

        pubsub.publish("createCredential", {
          createCredential: {
            notifiedBy: notificationPayload.notifiedBy,
            notifiedTo: notificationPayload.notifiedTo,
            notificationDate: notificationPayload.notificationDate,
            status: notificationPayload.status,
            subject: notificationPayload.subject,
            notifyMessage: notificationPayload.notifyMessage,
            notificationItem: notificationPayload.notificationItem,
          },
        });

        if (process.env.FCM_ENABLE) {
          if (process.env.FCM_ENABLE == true) {
            if (isLearner.fcm.length > 0) {
              await SEND_FCM(isLearner.fcm, notificationPayload);
            }
          }
        }

        return res;
      } catch (error) {
        console.log(error, "CatchError");
        throw new Error(error);
      }
    },

    signCredentials: async (parent, args, { pubsub, user }, info) => {
      try {
        const credentialId = args.credentialId;
        const isCredential = await CREDENTIAL.findById(credentialId);
        const isUser = await helper.GetUserDetailsByLoginType(user);

        if (!isCredential) throw new Error("Invalid Credential.");
        if (!isUser) throw new Error("Invalid user.");
        const result = await credentialService.AddSignatureToCredential(
          isUser,
          isCredential
        );
        if (result) {
          let params = {
            credentialId: credentialId,
            type: user.currentLogin.toLowerCase(),
            privateKey: isUser.privateKey,
            status: args.status,
            comment: args.comment,
          };

          let ECDSA;
          if (BLOCKCHAIN_ENABLE == "true") {
            ECDSA = await bcService.signWithECDSA(params);

            if (ECDSA.response) throw new Error(ECDSA.response.data.Error);
          }

          let notificationPayload = {};

          if (user.currentLogin == "ISSUER") {
            isCredential.credentialTrackingStatus.issuerSign.status =
              args.status;
            isCredential.credentialTrackingStatus.issuerSign.date = Date.now();
            isCredential.credentialTrackingStatus.issuerSign.publicKey =
              user.publicKey;
            isCredential.credentialTrackingStatus.currentStatus = "learnerSign";
            isCredential.credentialTrackingStatus.learnerSign.status =
              "PENDING";

            if (ECDSA) {
              isCredential.credentialTrackingStatus.issuerSign.issuerECDSA =
                ECDSA.obj.issuerECDSA;
            }

            notificationPayload = {
              notifiedBy: {
                entity: "ISSUER",
                id: user._id,
              },
              notifiedTo: {
                entity: "LEARNER",
                id: isCredential.learner.id,
              },
              notificationDate: Date.now(),
              status: "UN_SEEN",
              notificationItem: {
                type: "CREDENTIAL",
                id: isCredential._id,
              },
              subject: `Credential signed`,
              notifyMessage: `${isCredential.issuer.name} has signed on your Credential ${isCredential.title}.`,
            };
          } else if (user.currentLogin == "LEARNER") {
            isCredential.credentialTrackingStatus.learnerSign.status =
              args.status;
            isCredential.credentialTrackingStatus.learnerSign.date = Date.now();
            isCredential.credentialTrackingStatus.learnerSign.publicKey =
              user.publicKey;
            isCredential.credentialTrackingStatus.attestationRequest.status =
              "PENDING";
            isCredential.credentialTrackingStatus.attestationRequest.date =
              Date.now();

            if (ECDSA) {
              isCredential.credentialTrackingStatus.learnerSign.learnerECDSA =
                ECDSA.obj.learnerECDSA;
            }
            notificationPayload = {
              notifiedBy: {
                entity: "LEARNER",
                id: user._id,
              },
              notifiedTo: {
                entity: "ISSUER",
                id: isCredential.issuer.id,
              },
              notificationDate: Date.now(),
              status: "UN_SEEN",
              notificationItem: {
                type: "CREDENTIAL",
                id: isCredential.programId,
              },
              subject: `Credential signed`,
              notifyMessage: `${isCredential.learner.firstName} ${isCredential.learner.lastName} signed on his credential ${isCredential.title}.`,
            };
          } else if (user.currentLogin == "MOE") {
            if (args.status == "SIGNED") {
              isCredential.credentialTrackingStatus.moeSign.status = "SIGNED";
              notificationPayload = {
                notifiedBy: {
                  entity: "MOE",
                  id: user._id,
                },
                notifiedTo: {
                  entity: "LEARNER",
                  id: isCredential.issuer.id,
                },
                notificationDate: Date.now(),
                status: "UN_SEEN",
                notificationItem: {
                  type: "CREDENTIAL",
                  id: isCredential._id,
                },
                subject: `Credential Verified`,
                notifyMessage: `${isCredential.moe.moeName} verified your credential ${isCredential.title}.`,
              };
            } else {
              isCredential.credentialTrackingStatus.moeSign.status =
                args.status;
              isCredential.credentialTrackingStatus.moeSign.comment =
                args.comment;

              notificationPayload = {
                notifiedBy: {
                  entity: "MOE",
                  id: user._id,
                },
                notifiedTo: {
                  entity: "LEARNER",
                  id: isCredential.issuer.id,
                },
                notificationDate: Date.now(),
                status: "UN_SEEN",
                notificationItem: {
                  type: "CREDENTIAL",
                  id: isCredential._id,
                },
                subject: `Attestation Rejected`,
                notifyMessage: `Your request for attestation has been rejected.`,
              };
            }
            isCredential.credentialTrackingStatus.currentStatus = "moeSign";

            isCredential.credentialTrackingStatus.moeSign.date = Date.now();
            isCredential.credentialTrackingStatus.moeSign.publicKey =
              user.publicKey;
            if (ECDSA) {
              isCredential.credentialTrackingStatus.moeSign.moeECDSA =
                ECDSA.obj.moeECDSA;
            }

            notificationPayload = {
              notifiedBy: {
                entity: "MOE",
                id: user._id,
              },
              notifiedTo: {
                entity: "LEANER",
                id: isCredential.learner.id,
              },
              notificationDate: Date.now(),
              status: "UN_SEEN",
              notificationItem: {
                type: "CREDENTIAL",
                id: isCredential._id,
              },
              subject: `Credential Verified`,
              notifyMessage: `${isCredential.moe.name} verified your credential ${isCredential.title}.`,
            };
          }

          // * Notification
          await SaveNotification(notificationPayload);
          pubsub.publish("signCredential", {
            signCredential: {
              notifiedBy: notificationPayload.notifiedBy,
              notifiedTo: notificationPayload.notifiedTo,
              notificationDate: notificationPayload.notificationDate,
              status: notificationPayload.status,
              subject: notificationPayload.subject,
              notifyMessage: notificationPayload.notifyMessage,
              notificationItem: notificationPayload.notificationItem,
            },
          });
          if (process.env.FCM_ENABLE == true) {
            if (isUser.fcm.length > 0) {
              await SEND_FCM(isUser.fcm, notificationPayload);
            }
          }
          await isCredential.save();
          return "Signature Added Successfully.";
        }
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },

    syncCourses: async (parent, args, { pubsub, user }, info) => {
      try {
        const issuer = await ISSUER.findById(user._id);
        const Path = path.join(__dirname, "../../assets/files");
        const { createReadStream, filename } = await args.file;
        const stream = createReadStream();
        await stream.pipe(fs.createWriteStream(`${Path}/${filename}`));

        setTimeout(function () {
          ReadFile();
        }, 3000);

        const filePath = path.join(__dirname, `../../assets/files/${filename}`);
        function ReadFile() {
          readXlsxFile(filePath).then(async (sheet) => {
            sheet.shift();
            for (var i in sheet) {
              const course = new COURSE({
                issuerId: issuer._id,
                title: sheet[i][0],
                code: sheet[i][1],
                description: sheet[i][2],
                faculty: sheet[i][3],
                creditHours: sheet[i][4],
                active: true,
              });
              await course.save();
            }
            // * Notification
            const notificationPayload = {
              notifiedBy: {
                entity: "ISSUER",
                id: issuer._id,
              },
              notifiedTo: {
                entity: "ISSUER",
                id: issuer._id,
              },
              notificationDate: Date.now(),
              status: "UN_SEEN",
              notificationItem: {
                type: "SYNC",
                id: filename,
              },
              subject: `Import Courses`,
              notifyMessage: `Courses imported successfully.`,
            };

            await SaveNotification(notificationPayload);

            pubsub.publish("syncCourses", {
              syncCourses: {
                notifiedBy: notificationPayload.notifiedBy,
                notifiedTo: notificationPayload.notifiedTo,
                notificationDate: notificationPayload.notificationDate,
                status: notificationPayload.status,
                subject: notificationPayload.subject,
                notifyMessage: notificationPayload.notifyMessage,
                notificationItem: notificationPayload.notificationItem,
              },
            });

            if (process.env.FCM_ENABLE == true) {
              if (issuer.fcm.length > 0) {
                await SEND_FCM(issuer.fcm, notificationPayload);
              }
            }

            return "Sync successfully.";
          });
        }

        return "Sync Successfully";
      } catch (error) {
        console.log(error, "Error");
        throw new Error(error);
      }
    },

    syncMajors: async (parent, args, { pubsub, user }, info) => {
      try {
        const issuer = await ISSUER.findById(user._id);
        const Path = path.join(__dirname, "../../assets/files");
        const { createReadStream, filename } = await args.file;
        const stream = createReadStream();
        await stream.pipe(fs.createWriteStream(`${Path}/${filename}`));

        setTimeout(function () {
          ReadFile();
        }, 3000);

        const filePath = path.join(__dirname, `../../assets/files/${filename}`);

        function ReadFile() {
          readXlsxFile(filePath).then(async (sheet) => {
            sheet.shift();
            for (var i in sheet) {
              // console.log(sheet);
              const major = new MAJOR();
              major.issuerId = user._id;
              major.title = sheet[i][0];
              major.code = sheet[i][1];
              major.faculty = sheet[i][2];
              let courseArray = [];
              if (sheet[i][3].includes(",")) {
                const strArray = sheet[i][3].split(",");

                let courseList = [];
                for (var x of strArray) {
                  const isCourse = await COURSE.findOne({ title: { $eq: x } });

                  if (isCourse) {
                    const obj = {
                      courseId: isCourse._id,
                      courseName: isCourse.title,
                      compulsory: isCourse.true,
                    };
                    courseList.push(obj);
                  }
                }
                major.courses = courseList;
                await major.save();
              }
            }

            // * Notification
            const notificationPayload = {
              notifiedBy: {
                entity: "ISSUER",
                id: issuer._id,
              },
              notifiedTo: {
                entity: "ISSUER",
                id: issuer._id,
              },
              notificationDate: Date.now(),
              status: "UN_SEEN",
              notificationItem: {
                type: "SYNC",
                id: filename,
              },
              subject: `Import Majors`,
              notifyMessage: `Majors imported successfully.`,
            };

            await SaveNotification(notificationPayload);

            pubsub.publish("syncCourses", {
              syncCourses: {
                notifiedBy: notificationPayload.notifiedBy,
                notifiedTo: notificationPayload.notifiedTo,
                notificationDate: notificationPayload.notificationDate,
                status: notificationPayload.status,
                subject: notificationPayload.subject,
                notifyMessage: notificationPayload.notifyMessage,
                notificationItem: notificationPayload.notificationItem,
              },
            });

            if (process.env.FCM_ENABLE == true) {
              if (issuer.fcm.length > 0) {
                await SEND_FCM(issuer.fcm, notificationPayload);
              }
            }
            return "Sync successfully.";
          });
        }

        return "Sync Successfully";
      } catch (error) {
        console.log(error, "Error");
        throw new Error(error);
      }
    },
    syncPrograms: async (parent, args, { pubsub, user }, info) => {
      try {
        const issuer = await ISSUER.findById(user._id);
        const Path = path.join(__dirname, "../../assets/files");
        const { createReadStream, filename } = await args.file;
        const stream = createReadStream();
        await stream.pipe(fs.createWriteStream(`${Path}/${filename}`));

        setTimeout(function () {
          ReadFile();
        }, 3000);

        const filePath = path.join(__dirname, `../../assets/files/${filename}`);
        function ReadFile() {
          readXlsxFile(filePath).then(async (sheet) => {
            sheet.shift();
            for (var i in sheet) {
              const program = new PROGRAM();
              program.issuerId = user._id;
              program.title = sheet[i][0];
              program.code = sheet[i][1];
              program.faculty = sheet[i][2];
              program.level = sheet[i][3];
              program.creditHours = sheet[i][4];
              program.duration = sheet[i][5];
              program.totalSemesters = sheet[i][6];
              program.description = sheet[i][8];
              let majorList = [];
              if (sheet[i][7].includes(",")) {
                const strArray = sheet[i][7].split(",");

                for (var x of strArray) {
                  const isMajor = await MAJOR.findOne({ title: { $eq: x } });

                  if (isMajor) {
                    const obj = {
                      majorId: isMajor._id,
                      title: isMajor.title,
                    };
                    majorList.push(obj);
                  }
                }
                program.major = majorList;
                await program.save();
              } else {
                const major = await MAJOR.findOne({
                  title: { $eq: sheet[i][7] },
                });
                const obj = {
                  majorId: major._id,
                  title: major.title,
                };
                majorList.push(obj);

                program.major = majorList;
              }
              await program.save();
            }

            // * Notification
            const notificationPayload = {
              notifiedBy: {
                entity: "ISSUER",
                id: issuer._id,
              },
              notifiedTo: {
                entity: "ISSUER",
                id: issuer._id,
              },
              notificationDate: Date.now(),
              status: "UN_SEEN",
              notificationItem: {
                type: "SYNC",
                id: filename,
              },
              subject: `Import Programs`,
              notifyMessage: `Programs imported successfully.`,
            };

            await SaveNotification(notificationPayload);

            pubsub.publish("syncCourses", {
              syncCourses: {
                notifiedBy: notificationPayload.notifiedBy,
                notifiedTo: notificationPayload.notifiedTo,
                notificationDate: notificationPayload.notificationDate,
                status: notificationPayload.status,
                subject: notificationPayload.subject,
                notifyMessage: notificationPayload.notifyMessage,
                notificationItem: notificationPayload.notificationItem,
              },
            });

            if (process.env.FCM_ENABLE == true) {
              if (issuer.fcm.length > 0) {
                await SEND_FCM(issuer.fcm, notificationPayload);
              }
            }

            return "Sync successfully.";
          });
        }

        return "Sync Successfully.";
      } catch (error) {
        console.log(error, "Error");
        throw new Error(error);
      }
    },

    UpdateLearnerProgramStatus: async (
      parent,
      args,
      { pubsub, user },
      info
    ) => {
      try {
        const [isIssuer, isLearner, isCourse] = await Promise.all([
          ISSUER.findById(user._id),
          LEARNER.findById(args.learnerId),
        ]);
        if (!isIssuer) throw new Error("Invalid issuer ID.");
        if (!isLearner) throw new Error("Invalid leaner ID.");

        LEARNER.updateOne(
          { "courses._id": args.programId },
          { $set: { "courses.$.status": args.status } }
        )
          .then((res) => {
            console.log(res, "res");
          })
          .catch((err) => {
            console.log(err, "err");
          });

        return "Course status updated successfully";
      } catch (error) {
        console.log(error, "UpdateLearnerCourseStatus catchError");
        throw new Error(error);
      }
    },

    GetCredentialsForCards: async (parent, args, { pubsub, user }, info) => {
      try {
        const isMoe = await MOE.findById(user._id);
        if (!isMoe) throw new Error("Invalid Moe Id.");

        const credential = await CREDENTIAL.find({
          "moe.moeId": user._id,
        });

        const pendingRequest = await _.filter(credential, function (x) {
          if (
            x.credentialTrackingStatus.moeSign &&
            x.credentialTrackingStatus.moeSign.status == "PENDING"
          )
            return true;
        });

        console.log(pendingRequest, "pendingRequest");

        const signedRequest = await _.filter(credential, function (x) {
          if (
            x.credentialTrackingStatus.moeSign &&
            x.credentialTrackingStatus.moeSign.status == "SIGNED"
          )
            return true;
        });

        let rejectRequest = await _.filter(credential, function (x) {
          if (
            x.credentialTrackingStatus.moeSign &&
            x.credentialTrackingStatus.moeSign.status == "REJECTED"
          )
            return true;
        });

        let columns = [
          {
            id: 1,
            title: "PENDING",
            cards: pendingRequest,
          },
          {
            id: 2,
            title: "SIGNED",
            cards: signedRequest,
          },
          {
            id: 3,
            title: "REJECTED",
            cards: rejectRequest,
          },
        ];

        return columns;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },

    AddCourse: async (parent, args, { pubsub, user }, info) => {
      try {
        const isIssuer = await ISSUER.findById(user._id);
        if (!isIssuer) throw new Error("Invalid issuerId");
        const params = args.data;
        const course = new COURSE();
        course.issuerId = user._id;
        course.code = params.code;
        course.title = params.title;
        course.description = params.description;
        course.faculty = params.faculty;
        course.creditHours = params.creditHours;

        const savedCourse = await course.save();
        return savedCourse;
      } catch (error) {
        console.log(error, "error");
        return new Error(savedCourse);
      }
    },

    UpdateCourse: async (parent, args, { pubsub, user }, info) => {
      const params = args.data;
      console.log(user._id, "user");
      try {
        const [isIssuer, isCourse] = await Promise.all([
          ISSUER.findById(user._id),
          COURSE.findById(params.courseId),
        ]);

        if (!isIssuer) throw new Error("Invalid issuerId.");
        if (!isCourse) throw new Error("Course not found.");
        isCourse.code = params.code;
        isCourse.title = params.title;
        isCourse.description = params.description;
        isCourse.faculty = params.faculty;
        isCourse.active = params.active;
        isCourse.creditHours = params.creditHours;

        isCourse.updatedAt = Date.now();

        await isCourse.save();
        return isCourse;
      } catch (error) {
        console.log(error, "error");
        return new Error(error);
      }
    },

    DeleteCourse: async (parent, args, { pubsub, user }, info) => {
      try {
        const [isIssuer, isCourse] = await Promise.all([
          ISSUER.findById(user._id),
          COURSE.findById(args.courseId),
        ]);

        if (!isIssuer) throw new Error("Invalid issuerId.");
        if (!isCourse) throw new Error("Course not found.");

        await COURSE.deleteOne({ _id: args.courseId });
        return "Course Deleted Successfully.";
      } catch (error) {
        console.log(error, "error");
        return new Error(error);
      }
    },
    UpdateProgramCourseResult: async (parent, args, { pubsub, user }, info) => {
      try {
        const payload = args.data;
        const [isLearner, enrolledProgram] = await Promise.all([
          LEARNER.findById(payload.learnerId),
          ENROLLED_PROGRAM.findById(payload.enrolledProgramId),
        ]);
        if (!isLearner) throw new Error("Learner not found.");
        if (!enrolledProgram) throw new Error("Program not found.");

        const Grade = await GRADE.findOne({
          issuerId: { $eq: user._id },
          grade: { $eq: payload.course.grade },
        });

        let creditPoints = Grade.credits * payload.course.creditHours;
        let updatedCourse = {
          courseId: payload.course.courseId,
          code: payload.course.code,
          title: payload.course.title,
          description: payload.course.description,
          creditHours: payload.course.creditHours,
          totalMarks: payload.course.totalMarks,
          passingCriteria: payload.course.passingCriteria,
          obtainMarks: payload.course.obtainMarks,
          grade: payload.course.grade,
          creditPoints: creditPoints,
        };

        await ENROLLED_PROGRAM.updateOne(
          {
            _id: payload.enrolledProgramId,
          },
          {
            $set: {
              "program.semesters.$[e1].courses.$[e2]": updatedCourse,
            },
          },
          {
            arrayFilters: [
              {
                "e1.semesterNumber": payload.semesterNumber,
              },
              {
                "e2._id": payload.course.courseId,
              },
            ],
            multiple: false,
          }
        );

        const eProgram = await ENROLLED_PROGRAM.findById(
          payload.enrolledProgramId
        );

        const semester = _.find(eProgram.program.semesters, {
          semesterNumber: payload.semesterNumber,
        });
        console.log(semester.courses, "semester");

        let totalCreditHours = 0;
        let totalCreditPoints = 0;

        for (let x of semester.courses) {
          totalCreditHours += x.creditHours;
          if (x.creditPoints) {
            totalCreditPoints += x.creditPoints;
          }
        }

        let CalculatedGpa = totalCreditPoints / totalCreditHours;

        await ENROLLED_PROGRAM.updateOne(
          {
            _id: payload.enrolledProgramId,
          },
          {
            $set: {
              "program.semesters.$[e1].gpa": CalculatedGpa,
            },
          },
          {
            arrayFilters: [
              {
                "e1.semesterNumber": payload.semesterNumber,
              },
            ],
            multiple: false,
          }
        );

        return "result Update";
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },

    CalculateCGPAOfProgram: async (parent, args, { pubsub, user }, info) => {
      try {
        const isProgram = await ENROLLED_PROGRAM.findById(
          args.enrolledProgramId
        );
        if (!isProgram) throw new Error("Invalid ID.");

        const semesters = isProgram.program.semesters;

        let totalCreditHours = 0;
        let totalCreditPoints = 0;
        let totalPassedSemester = 0;
        for (var x of semesters) {
          if (x.status == "COMPLETED") {
            totalPassedSemester++;
            for (var y of x.courses) {
              totalCreditHours += y.creditHours;
              if (y.creditPoints) {
                totalCreditPoints += y.creditPoints;
              }
            }
          }
        }
        let CalculatedCGpa = totalCreditPoints / totalCreditHours;

        let result = {
          totalPassedSemester: totalPassedSemester,
          CalculatedCGpa: CalculatedCGpa,
        };

        isProgram.program.cgpa = CalculatedCGpa;
        await isProgram.save();

        return result;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },

    AddGrade: async (parent, args, { pubsub, user }, info) => {
      try {
        const payload = args.data;
        const isIssuer = await ISSUER.findById(user._id);
        if (!isIssuer) throw new Error(isIssuer);
        const grade = new GRADE({
          issuerId: user._id,
          grade: payload.grade,
          percentageFrom: payload.percentageFrom,
          percentageTo: payload.percentageTo,
          gpa: payload.gpa,
          credits: payload.credits,
        });

        const savedGrade = await grade.save();
        return savedGrade;
      } catch (error) {
        throw new Error(error);
      }
    },

    UpdateGrade: async (parent, args, { pubsub, user }, info) => {
      try {
        const payload = args.data;
        const isGrade = await GRADE.findById(payload.gradeId);
        if (!isGrade) throw new Error("Invalid Grade Id.");
        isGrade.grade = payload.grade;
        isGrade.percentageFrom = payload.percentageFrom;
        isGrade.percentageTo = payload.percentageTo;
        isGrade.gpa = payload.gpa;
        isGrade.credits = payload.credits;
        await isGrade.save();

        return isGrade;
      } catch (error) {
        throw new Error(error);
      }
    },

    CalculateGrade: async (parent, args, { pubsub, user }, info) => {
      try {
        const { totalMarks, obtainMarks } = args;

        const obtainPercentage = (obtainMarks / totalMarks) * 100;
        const roundPercentage = obtainPercentage.toFixed();

        console.log(roundPercentage, "roundPercentage");

        const Grades = await GRADE.find({ issuerId: { $eq: user._id } });
        let obtainGrade = "";
        Grades.forEach((x) => {
          if (
            roundPercentage >= x.percentageFrom &&
            roundPercentage < x.percentageTo
          ) {
            obtainGrade = x.grade;
          } else {
            // obtainGrade = "F";
          }
        });

        return obtainGrade;
      } catch (error) {
        throw new Error(error);
      }
    },

    addSemesterInProgram: async (parent, args, { pubsub, user }, info) => {
      try {
        const payload = args.data;
        const isProgram = await PROGRAM.findById(payload.programId);
        if (!isProgram) throw new Error("Invalid program");

        await PROGRAM.updateOne(
          {
            _id: { $eq: payload.programId },
          },
          {
            $push: {
              semesters: payload.semester,
            },
          }
        );
        return "Updated Successfully";
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },

    deleteSemesterInProgram: async (parent, args, { pubsub, user }, info) => {
      try {
        const payload = args;
        const isProgram = await PROGRAM.findById(payload.programId);
        if (!isProgram) throw new Error("Invalid program");

        await PROGRAM.updateOne(
          {
            _id: { $eq: payload.programId },
          },
          {
            $pull: {
              semesters: { _id: payload.semesterId },
            },
          }
        );

        return "Deleted Successfully";
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },
    updateSemesterInProgram: async (parent, args, { pubsub, user }, info) => {
      try {
        const payload = args.data;
        const isProgram = await ENROLLED_PROGRAM.findById(payload.programId);
        if (!isProgram) throw new Error("Invalid program");
        await ENROLLED_PROGRAM.updateOne(
          {
            _id: { $eq: payload.programId },
            "program.semesters.semesterNumber": {
              $eq: payload.semester.semesterNumber,
            },
          },
          {
            $set: {
              "program.semesters.$.semesterNumber":
                payload.semester.semesterNumber,
              "program.semesters.$.creditHours": payload.semester.creditHours,
              "program.semesters.$.totalCourse": payload.semester.totalCourse,
              "program.semesters.$.status": payload.semester.status,
              "program.semesters.$.courses": payload.semester.courses,
            },
          }
        );

        const program = await ENROLLED_PROGRAM.findById(payload.programId);

        const isCompleted = program.program.semesters.every(function (x) {
          if (x.status == "COMPLETED") return true;
        });

        if (isCompleted) {
          program.program.status = "COMPLETED";
          await program.save();
        }
        return "update Successfully";
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },
    AddMajor: async (parent, args, { pubsub, user }, info) => {
      try {
        const payload = args.data;

        console.log(payload, "payload");
        const isMajor = await MAJOR.findOne({ title: { $eq: payload.title } });
        if (isMajor) throw new Error("Major Already exit");

        const major = new MAJOR({
          issuerId: user._id,
          title: payload.title,
          code: payload.code,
          faculty: payload.faculty,
          courses: payload.courses,
        });

        const data = await major.save();
        console.log(data);
        return data;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },
    UpdateMajor: async (parent, args, { pubsub, user }, info) => {
      try {
        const payload = args.data;
        console.log(payload, "payload");
        await MAJOR.updateOne(
          {
            _id: payload.majorId,
          },
          {
            $set: {
              title: payload.title,
              code: payload.code,
              faculty: payload.faculty,
              courses: payload.courses,
            },
          }
        ).exec();

        return "Record Updated";
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },
    getCompulsoryAndElective: async (parent, args, { pubsub, user }, info) => {
      const majors = await MAJOR.find({ _id: { $in: args.majors } });
      let compulsoryCourses = [];
      for (var x of majors) {
        for (var y of x.courses) {
          compulsoryCourses.push(y.courseId);
        }
      }

      const compulsory = await COURSE.find({ _id: { $in: compulsoryCourses } });
      console.log(compulsory, "compulsory");

      const courses = await COURSE.find({
        issuerId: { $eq: user._id },
      });
      var elective = _.differenceWith(courses, compulsory, function (o1, o2) {
        return o1["title"] === o2["title"];
      });
      const res = {
        compulsory: compulsory,
        elective: elective,
      };
      return res;
    },
    updateFCM: async (parent, args, { pubsub, user }, info) => {
      try {
        console.log(user);
        if (user.currentLogin == "ISSUER") {
          await ISSUER.updateOne(
            { _id: user._id },
            { $push: { fcm: args.fcmtoken } }
          ).exec();
        } else if (user.currentLogin == "LEARNER") {
          await LEARNER.updateOne(
            { _id: user._id },

            { $push: { fcm: args.fcmtoken } }
          ).exec();
        } else if (user.currentLogin == "MOE") {
          await MOE.updateOne(
            { _id: user._id },

            { $push: { fcm: args.fcmtoken } }
          ).exec();
        }

        return "Token added successfully.";
      } catch (error) {
        console.log(error, "error");
        throw new Error(error, "error");
      }
    },

    deleteFCM: async (parent, args, { pubsub, user }, info) => {
      try {
        if (user.currentLogin == "ISSUER") {
          await ISSUER.updateOne(
            { _id: user._id },
            { $pull: { fcm: { $eq: args.fcmtoken } } }
          );
        } else if (user.currentLogin == "LEARNER") {
          await LEARNER.updateOne(
            { _id: user._id },
            { $pull: { fcm: { $eq: args.fcmtoken } } }
          );
        } else if (user.currentLogin == "MOE") {
          await MOE.updateOne(
            { _id: user._id },
            { $pull: { fcm: { $eq: args.fcmtoken } } }
          );
        }

        return "Token deleted.";
      } catch (error) {
        console.log(error, "error");
        throw new Error(error, "error");
      }
    },

    updateConfigs: async (parents, args, { pubsub, user }, info) => {
      try {
        let entity;
        if (user.currentLogin == "ISSUER") {
          entity = await ISSUER.findById(user._id);
        } else if (user.currentLogin == "MOE") {
          entity = await MOE.findById(user._id);
        }

        if (!entity) throw new Error(entity);
        entity.configs = args.Configuration;
        await entity.save();

        return "configuration updated successfully";
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },

    UpdateNotificationStatus: async (parents, args, { pubsub, user }, info) => {
      try {
        const isNotification = await NOTIFICATION.findById(args.notificationId);
        if (!isNotification) throw new Error("Invalid ID.");

        isNotification.status = "SEEN";
        await isNotification.save();

        return "Status update successfully.";
      } catch (error) {
        throw new Error(error);
      }
    },

    ClearAllNotification: async (parents, args, { pubsub, user }, info) => {
      try {
        await NOTIFICATION.deleteMany({ "notifiedTo.id": user._id });
        return "Deleted Successfully";
      } catch (error) {
        throw new Error(error);
      }
    },
  },

  Subscription: {
    login: {
      subscribe(parent, args, { pubsub }, info) {
        return pubsub.asyncIterator("login");
      },
    },
    createCredential: {
      subscribe(parent, args, { pubsub }, info) {
        return pubsub.asyncIterator("createCredential");
      },
    },
    signCredential: {
      subscribe(parent, args, { pubsub }, info) {
        return pubsub.asyncIterator("signCredential");
      },
    },
    issuerOnboard: {
      subscribe(parent, args, { pubsub }, info) {
        return pubsub.asyncIterator("issuerOnboard");
      },
    },
    syncCourses: {
      subscribe(parent, args, { pubsub }, info) {
        return pubsub.asyncIterator("syncCourses");
      },
    },
  },
};
