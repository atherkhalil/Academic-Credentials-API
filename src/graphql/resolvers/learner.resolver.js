import LEARNER from "../../models/learner";
import ISSUER from "../../models/Issuer";
import CREDENTIAL from "../../models/Credentials";
import MOE from "../../models/Moe";
import { generateToken } from "../../auth/jwt/jwt";
import validator from "validator";
import ENROLLED_PROGRAM from "../../models/enrolledProgram";
import EQUIVALENCY from "../../models/equivalency";
import NOTIFICATION from "../../models/notifications";

import {
  MAIL_USERNAME,
  hashPassword,
  comparePassword,
  issuerOnBoardingValidation,
  FRONTEND_URL,
  TWO_FA_ENABLE,
} from "../../utils";
const { equals } = validator;

import bcService from "../../services/bc.service";
import {
  ValidationError,
  UserInputError,
  ApolloError,
  AuthenticationError,
  SyntaxError,
} from "apollo-server-express";

import {
  OnBoarding_Mail,
  EnrolledLearnerInProgram,
  SaveNotification,
} from "../../services/helper";
import Speakeasy from "speakeasy";
import QRCode from "qrcode";

import _ from "lodash";
import { info } from "winston";
import PROGRAM from "../../models/program";

module.exports = {
  Query: {
    GetLearnerDetail: async (parent, args, { pubsub }, info) => {
      try {
        const isLearner = await LEARNER.findById(args.learnerId);
        if (!isLearner) throw new ApolloError("Record not found");
        return isLearner;
      } catch (error) {
        console.log(error, "CatchError");
        throw new ApolloError(error);
      }
    },

    getLearnerDashboardData: async (parent, args, { pubsub, user }, info) => {
      try {
        const EnrolledInProgram = await LEARNER.findById(user._id);

        const totalCredential = await CREDENTIAL.find({
          "learner.id": { $eq: user._id },
        }).countDocuments();

        const pendingForAttestation = await CREDENTIAL.find({
          "learner.id": { $eq: user._id },
          "credentialTrackingStatus.moeSign.status": "PENDING",
        }).countDocuments();

        const totalAttestedCredentials = await CREDENTIAL.find({
          "learner.id": { $eq: user._id },
          "credentialTrackingStatus.moeSign.status": "SIGNED",
        }).countDocuments();

        const rejectedCertificated = await CREDENTIAL.find({
          "learner.id": { $eq: user._id },
          $or: [
            {
              "credentialTrackingStatus.moeSign.status": "REJECTED",
            },
            {
              "credentialTrackingStatus.issuerSign.status": "REJECTED",
            },
          ],
        }).countDocuments();

        const pendingEquivalencyRequest = await EQUIVALENCY.find({
          "learner.id": { $eq: user._id },
          status: { $eq: "PENDING" },
        }).countDocuments();

        const data = {
          enrolledInProgram: EnrolledInProgram.programs,
          totalCredential: totalCredential,
          totalAttestedCredentials: totalAttestedCredentials,
          pendingForAttestation: pendingForAttestation,
          rejectedCertificated: rejectedCertificated,
          pendingEquivalencyRequest: pendingEquivalencyRequest,
        };

        // Semester/year progress

        return data;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },

    getLearnerPrograms: async (parent, args, { pubsub, user }, info) => {
      try {
        const enrolledProgram = await ENROLLED_PROGRAM.find({
          learnerId: args.learnerId,
        });

        return enrolledProgram;
      } catch (error) {
        throw new Error(error);
      }
    },

    GetLeanerByEmail: async (parent, args, { pubsub, user }, info) => {
      try {
        const isLearner = await LEARNER.findOne({ email: args.email });
        if (!isLearner) throw new Error("User not found.");
        return isLearner;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },
    GetEquivalencyDetail: async (parent, args, { pubsub, user }, info) => {
      try {
        const result = await EQUIVALENCY.findById(args.equivalencyId);
        if (!result) throw new Error("Result not found.");
        return result;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },

    GetEquivalencyDetailByCredentialId: async (
      parent,
      args,
      { pubsub, user },
      info
    ) => {
      try {
        const result = await EQUIVALENCY.findOne({
          credentialId: args.credentialId,
        });
        if (!result) throw new Error("Result not found.");
        return result;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },

    GetLearnerProgramChart: async (parent, args, { pubsub, user }, info) => {
      try {
        const result = await ENROLLED_PROGRAM.findOne({
          _id: args.id,
        });
        if (!result) throw new Error("Result not found.");

        const semester = result.program.semesters;
        let semesterArr = [];
        semester.map((x) => {
          console.log(x, "x");

          const obj = {
            semesterNumber: x.semesterNumber,
            gpa: x.gpa ? x.gpa : null,
          };
          semesterArr.push(obj);
        });

        return semesterArr;
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },
  },
  Mutation: {
    ResendRequestForEquivalency: async (
      parent,
      args,
      { pubsub, user },
      info
    ) => {
      try {
        const arg = args.data;

        const learner = await LEARNER.findById(user._id);
        const moe = await MOE.findById(arg.moeId);
        const alreadyApplied = await EQUIVALENCY.findOne({
          learnerId: { $eq: user._id },
          credentialId: { $eq: arg.credentialId },
        });

        const isCredential = await CREDENTIAL.findById(arg.credentialId);
        // if (alreadyApplied) throw new Error("Already Applied.");
        // let trackingStatus = {
        //   type: "EQUIVALATED",
        //   status: "EQUIVALATED",
        //   date: Date.now(),
        //   comment: "",
        // };
        let trackingStatus = {
          type: "RE-APPLIED",
          date: Date.now(),
          status: "RE-APPLIED",
          comment: "",
        };

        await EQUIVALENCY.updateOne(
          {
            _id: arg.equivalencyId,
          },
          {
            $set: {
              graduateCertificate: arg.graduateCertificate,
              Transcript: arg.Transcript,
              graduateCertificate: arg.graduateCertificate,
              transferredHours: arg.transferredHours,
              highSchoolCertificate: arg.highSchoolCertificate,
              legalTranslation: arg.legalTranslation,
              authenticityOfTheQualification:
                arg.authenticityOfTheQualification,
              attendanceInTheCountryOfStudy: arg.attendanceInTheCountryOfStudy,
              status: "PENDING",
            },
            $push: {
              trackingStatus: trackingStatus,
            },
          }
        );

        // * Notification
        const notificationParams = {
          notifiedBy: {
            entity: "LEARNER",
            id: user._id,
          },
          notifiedTo: {
            entity: "MOE",
            id: arg.moeId,
          },
          notificationDate: Date.now(),
          status: "UN_SEEN",
          notificationItem: {
            type: "EQUIVALENCY_REQUEST",
            id: isCredential.programId,
          },
          subject: `Equivalency Request.`,
          notifyMessage: `${learner.firstName} resend equivalency request after correction.`,
        };

        await SaveNotification(notificationParams);

        const mail_Params = {
          from: learner.email,
          to: moe.adminEmail,
          subject: "Equivalency Request.",
          message: notificationParams.notifyMessage,
          redirectUrl: `${FRONTEND_URL}`,
        };

        await OnBoarding_Mail(mail_Params);

        pubsub.publish("sendRequestForEquivalency", {
          sendRequestForEquivalency: {
            notifiedBy: notificationParams.notifiedBy,
            notifiedTo: notificationParams.notifiedTo,
            notificationDate: notificationParams.notificationDate,
            status: notificationParams.status,
            subject: notificationParams.subject,
            notifyMessage: notificationParams.notifyMessage,
            notificationItem: notificationParams.notificationItem,
          },
        });

        return "Application sent successfully.";
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },

    sendRequestForEquivalency: async (parent, args, { pubsub, user }, info) => {
      try {
        const arg = args.data;
        const learner = await LEARNER.findById(user._id);
        const moe = await MOE.findById(arg.moeId);

        const alreadyApplied = await EQUIVALENCY.findOne({
          learnerId: { $eq: user._id },
          credentialId: { $eq: arg.credentialId },
        });

        if (alreadyApplied) throw new Error("Already Applied.");

        const isCredential = await CREDENTIAL.findById(arg.credentialId);

        const equivalency = new EQUIVALENCY();
        equivalency.learnerId = user._id;
        equivalency.issuerId = arg.issuerId;
        equivalency.moeId = arg.moeId;
        equivalency.credentialId = arg.credentialId;
        equivalency.graduateCertificate = arg.graduateCertificate;
        equivalency.Transcript = arg.Transcript;
        equivalency.transferredHours = arg.transferredHours;
        equivalency.highSchoolCertificate = arg.highSchoolCertificate;
        equivalency.legalTranslation = arg.legalTranslation;
        equivalency.authenticityOfTheQualification =
          arg.authenticityOfTheQualification;
        equivalency.attendanceInTheCountryOfStudy =
          arg.attendanceInTheCountryOfStudy;
        equivalency.status = "PENDING";

        let trackingStatus = [
          {
            type: "APPLIED",
            date: Date.now(),
            status: "APPLIED",
            comment: "",
          },
        ];

        equivalency.trackingStatus = trackingStatus;
        const savedRequest = await equivalency.save();
        const notificationParams = {
          notifiedBy: {
            entity: "LEARNER",
            id: savedRequest.learnerId,
          },
          notifiedTo: {
            entity: "MOE",
            id: savedRequest.moeId,
          },
          notificationDate: Date.now(),
          status: "UN_SEEN",
          notificationItem: {
            type: "EQUIVALENCY_REQUEST",
            id: isCredential.programId,
          },
          subject: `Equivalency Request.`,
          notifyMessage: `${learner.firstName} send equivalency request.`,
        };

        await SaveNotification(notificationParams);

        const mail_Params = {
          from: learner.email,
          to: moe.adminEmail,
          subject: "Equivalency Request.",
          message: notificationParams.notifyMessage,
          redirectUrl: `${FRONTEND_URL}`,
        };

        await OnBoarding_Mail(mail_Params);

        pubsub.publish("sendRequestForEquivalency", {
          sendRequestForEquivalency: {
            notifiedBy: notificationParams.notifiedBy,
            notifiedTo: notificationParams.notifiedTo,
            notificationDate: notificationParams.notificationDate,
            status: notificationParams.status,
            subject: notificationParams.subject,
            notifyMessage: notificationParams.notifyMessage,
            notificationItem: notificationParams.notificationItem,
          },
        });

        return "Application sent successfully.";
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },

    LernerOnboarding: async (parent, args, { pubsub }, info) => {
      try {
        const params = args.data;
        let secret;
        let qrCode;

        const [isIssuer, isLearner, program] = await Promise.all([
          ISSUER.findById(params.program.issuerId),
          LEARNER.findOne({
            email: { $eq: params.email },
          }),

          PROGRAM.findOne({
            _id: { $eq: params.program.programId },
            issuerId: { $eq: params.program.issuerId },
          }),
        ]);

        if (!isIssuer) throw new UserInputError("Invalid Issuer.");
        if (!program) throw new UserInputError("Invalid Program.");
        if (isLearner) {
          //  check if leaner already Enrolled in course
          const isProgram = _.find(isLearner.programs, {
            issuerId: program.issuerId,
            programId: params.program.programId,
          });

          if (isProgram)
            throw new UserInputError(
              "Leaner already enrolled in this program."
            );

          const programWithenrollmentDate = {
            programId: params.program.programId,
            title: params.program.title,
            issuerId: params.program.issuerId,
            enrollmentDate: Date.now(),
          };
          console.log(programWithenrollmentDate, "programWithenrollmentDate");

          await LEARNER.updateOne(
            { email: { $eq: params.email } },
            { $push: { programs: programWithenrollmentDate } }
          );

          await EnrolledLearnerInProgram(
            isLearner,
            params.program,
            params.address
          );

          // * Notification Saved in DB
          const notificationParams = {
            notifiedBy: {
              entity: "ISSUER",
              id: isIssuer._id,
            },
            notifiedTo: {
              entity: "LEARNER",
              id: isLearner._id,
            },
            notificationDate: Date.now(),
            status: "UN_SEEN",
            notificationItem: {
              type: "ONBOARDING_REQUEST",
              id: isLearner._id,
            },
            subject: `OnBoarding Request.`,
            notifyMessage: `${isIssuer.name} has enrolled you in the ${program.title}.`,
          };
          await SaveNotification(notificationParams);

          // * Real time Notification

          pubsub.publish("learnerOnboard", {
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
            if (isLearner.fcm.length > 0) {
              await SEND_FCM(isLearner.fcm, notificationParams);
            }
          }

          return "Leaner enrolled to new program";
        } else {
          // * if Leaner not Exit Creating new Account for Learner
          secret = Speakeasy.generateSecret({ length: 20 });
          await QRCode.toDataURL(secret.otpauth_url)
            .then((url) => {
              qrCode = url;
            })
            .catch((err) => {
              console.log(err.message < "Creating QRcode.");
            });

          // * Saved to db

          const programWithenrollmentDate = {
            programId: params.program.programId,
            title: params.program.title,
            issuerId: params.program.issuerId,
            enrollmentDate: Date.now(),
          };

          const learner = new LEARNER({
            firstName: params.firstName,
            lastName: params.lastName,
            dob: params.dob,
            gender: params.gender,
            telephone: params.telephone,
            email: params.email,
            programs: programWithenrollmentDate,
            address: params.address,
            qrCode: qrCode,
            secret: secret,
          });

          const savedLearner = await learner.save();
          ///  Enrolled Program
          await EnrolledLearnerInProgram(
            savedLearner,
            params.program,
            params.address
          );

          let mail_Params = {
            from: MAIL_USERNAME,
            to: savedLearner.email,
            subject: "on Boarding Request",
            message: `${isIssuer.name} Send ON Boarding request in our Platform`,
            redirectUrl: `${FRONTEND_URL}/verify-leaner/${savedLearner._id}`,
          };

          await OnBoarding_Mail(mail_Params);
          return "Leaner enrolled successfully.";
        }
      } catch (error) {
        console.log("Catch Error", error);
        throw new ApolloError(error);
      }
    },

    ActivateLearner: async (parent, args, { pubsub }, info) => {
      try {
        const isLearner = await LEARNER.findById(args.learnerId);
        if (!isLearner) return new UserInputError("Invalid Issuer ID.");

        if (TWO_FA_ENABLE == "true") {
          var verified = Speakeasy.totp.verify({
            secret: isIssuer.secret.base32,
            encoding: "base32",
            token: args.otp,
          });
          if (!verified) throw new UserInputError("Invalid OTP.");
        }

        isLearner.isVerified = true;
        await isLearner.save();

        let data = {
          _id: isLearner._id,
          firstName: isLearner.firstName,
          lastName: isLearner.lastName,
          dob: isLearner.dob,
          gender: isLearner.gender,
          telephone: isLearner.telephone,
          email: isLearner.email,
          country: isLearner.country,
          city: isLearner.city,
          isVerified: isLearner.isVerified,
          createdAt: isLearner.createdAt,
          updatedAt: isLearner.updatedAt,
        };
        // * Generating Access Token
        const jwtToken = await generateToken("accessToken", data, "LEARNER");
        console.log(jwtToken, "jwtToken");
        return jwtToken;
      } catch (error) {
        console.log(error, "error");
        throw new UserInputError(error);
      }
    },

    SetLearnerPassword: async (parent, args, { pubsub, user }, info) => {
      try {
        let { password, confirmPassword } = args;

        const isLearner = await LEARNER.findById(user._id);
        if (!isLearner) throw new UserInputError("Record not Found");

        if (!equals(password, confirmPassword)) {
          throw new UserInputError("Password not matched");
        }

        const keys = await bcService.issueKeys();
        isLearner.publicKey = keys.publicKey;
        isLearner.privateKey = keys.privateKey;
        isLearner.vaultAddress = keys.address;

        isLearner.password = await hashPassword(password);
        await isLearner.save();

        return "Password saved successfully";
      } catch (error) {
        console.log(error, "Catch Error");
        throw new UserInputError(error);
      }
    },

    LearnerLogin: async (parent, args, { pubsub, user }, info) => {
      try {
        let { email, password } = args;
        const isLearner = await LEARNER.findOne({ email: { $eq: email } });
        if (!isLearner) throw new UserInputError("Email not found.");

        let isMatched = await comparePassword(password, isLearner.password);
        if (!isMatched) throw new UserInputError("Invalid email or password.");

        let Learner = {
          _id: isLearner._id,
          firstName: isLearner.firstName,
          lastName: isLearner.lastName,
          dob: isLearner.dob,
          gender: isLearner.gender,
          telephone: isLearner.telephone,
          email: isLearner.email,
          address: isLearner.address,
          isVerified: isLearner.isVerified,
          createdAt: isLearner.createdAt,
          updatedAt: isLearner.updatedAt,
          courses: isLearner.courses,
          publicKey: isLearner.publicKey,
        };

        const jwtToken = await generateToken("accessToken", Learner, "LEARNER");
        return { learner: Learner, token: jwtToken };
      } catch (error) {
        console.log(error, "Catch Error");
        throw new UserInputError(error);
      }
    },

    UpdateLearnerDetails: async (parent, args, { pubsub, user }, info) => {
      try {
        console.log(user, "user");
        const isLearner = await LEARNER.findById(user._id);
        if (!isLearner) return new UserInputError("Record not found");
        isLearner.firstName = args.firstName;
        isLearner.lastName = args.lastName;
        isLearner.dob = new Date(args.dob);
        isLearner.gender = args.gender;
        isLearner.telephone = args.telephone;
        isLearner.address = args.address;
        const updatedLearner = await isLearner.save();
        return updatedLearner;
      } catch (error) {
        console.log(error, "CatchError");
        throw new Error(error);
      }
    },

    SendAttestationRequest: async (parent, args, { pubsub, user }, info) => {
      try {
        const isLearner = await LEARNER.findById(user._id);
        if (!isLearner) throw new Error("Invalid Leaner Id.");
        const isCredential = await CREDENTIAL.findOne({
          _id: args.credentialId,
          "moe.moeId": args.moeId,
          "learner.id": user._id,
        });
        if (!isCredential) throw new Error("Invalid Credential Id.");
        const isMoe = await MOE.findById(args.moeId);
        if (!isMoe) throw new Error("Invalid Moe Id.");

        isCredential.credentialTrackingStatus.currentStatus =
          "attestationRequest";
        isCredential.credentialTrackingStatus.attestationRequest.status =
          "APPLIED";
        isCredential.credentialTrackingStatus.attestationRequest.date =
          Date.now();

        await isCredential.save();
        return "Credential attestation request successfully send to MOE.";
      } catch (error) {
        console.log(error, "error");
        throw new Error(error);
      }
    },
  },

  Subscription: {
    newMessage: {
      subscribe(parent, args, { pubsub }, info) {
        return pubsub.asyncIterator("MESSAGE");
      },
    },
    learnerOnboard: {
      subscribe(parent, args, { pubsub }, info) {
        return pubsub.asyncIterator("learnerOnboard");
      },
    },

    sendRequestForEquivalency: {
      subscribe(parent, args, { pubsub }, info) {
        return pubsub.asyncIterator("sendRequestForEquivalency");
      },
    },
  },
};
