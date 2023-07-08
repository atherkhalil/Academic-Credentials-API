import {
  MoeOnBoardingValidation,
  MAIL_USERNAME,
  hashPassword,
  comparePassword,
  FRONTEND_URL,
  FILE_URL,
  MONTH_ARRAY,
  TWO_FA_ENABLE,
} from "../../utils";
import {
  OnBoarding_Mail,
  SaveNotification,
  getFirstAndLastDayOfMonth,
} from "../../services/helper";

import Speakeasy from "speakeasy";
import QRCode from "qrcode";
import {
  ValidationError,
  UserInputError,
  ApolloError,
  AuthenticationError,
  SyntaxError,
  ForbiddenError,
} from "apollo-server-express";
import { GraphQLUpload, graphqlUploadExpress } from "graphql-upload";
import path from "path";

import validator from "validator";
const { equals } = validator;

// *Model
import MOE from "../../models/Moe";
import ISSUER from "../../models/Issuer";
import LEARNER from "../../models/learner";
import CREDENTIAL from "../../models/Credentials";
import EQUIVALENCY from "../../models/equivalency";
import NOTIFICATION from "../../models/notifications.js";

import { generateToken } from "../../auth/jwt/jwt";
import bcService from "../../services/bc.service";
import { info } from "winston";
import fs from "fs-extra";

module.exports = {
  Query: {
    GetMOEDetails: async (parent, args, { pubsub }, info) => {
      try {
        const isMoe = await MOE.findById(args.moeId);
        if (!isMoe) throw new ApolloError("Record not found");
        return isMoe;
      } catch (error) {
        console.log(error, "CatchError");
        throw new ApolloError(error);
      }
    },

    GetPendingIssuerRequests: async (parent, args, { pubsub, user }, info) => {
      try {
        const pendingRequest = await ISSUER.find({
          moeId: { $eq: user._id },
          approved: { $eq: args.approved },
        });

        return pendingRequest;
      } catch (error) {
        throw new Error(error);
      }
    },

    getPendingAttestationRequests: async (
      parent,
      args,
      { pubsub, user },
      info
    ) => {
      try {
        const isMoe = await MOE.findById(user._id);
        if (!isMoe) throw new Error("Invalid Moe id");

        const GetCredential = await CREDENTIAL.find({
          "moe.moeId": { $eq: user._id },
          "credentialTrackingStatus.moeSign.status": { $eq: "PENDING" },
        });
        return GetCredential;
      } catch (error) {
        console.log(error, "Error");
        throw new Error(error);
      }
    },

    GetMoeDashboardData: async (parent, args, { pubsub, user }, info) => {
      try {
        const isMoe = await MOE.findById(user._id);
        if (!isMoe) throw new Error("Invalid MOE Id.");

        //Total institutes accredited ,
        const totalInstitutes = await ISSUER.find({
          moeId: { $eq: user._id },
        }).countDocuments();

        const totalAccreditInstitutes = await ISSUER.find({
          moeId: { $eq: user._id },
          approved: true,
        }).countDocuments();

        const pendingApprovalInstitution = await ISSUER.find({
          moeId: { $eq: user._id },
          approved: false,
        }).countDocuments();

        const totalAttestedCredentials = await CREDENTIAL.find({
          "credentialTrackingStatus.moeSign.status": { $eq: "SIGNED" },
          "moe.moeId": { $eq: user._id },
        }).countDocuments();

        const totalPendingAttestations = await CREDENTIAL.find({
          "credentialTrackingStatus.moeSign.status": { $eq: "PENDING" },
          "moe.moeId": { $eq: user._id },
        }).countDocuments();

        const accreditedIssuer = await ISSUER.find({
          type: { $eq: "ACCREDITED" },
          moeId: { $eq: user._id },
        }).countDocuments();

        const latestPendingFiveCredentials = await CREDENTIAL.find({
          "moe.moeId": { $eq: user._id },
          "credentialTrackingStatus.moeSign.status": { $eq: "PENDING" },
        })
          .sort({ $natural: -1 })
          .limit(5);

        const topFiveIssuerByCredential = await CREDENTIAL.aggregate([
          {
            $match: {
              $and: [{ "moe.moeId": { $eq: user._id } }],
            },
          },
          {
            $group: {
              _id: { $toUpper: "$issuer.id" },
              totalRequest: { $sum: 1 },
            },
          },
          { $sort: { totalRequest: -1 } },
          { $limit: 5 },
        ]).exec();

        // * CHARTS

        let attestationRequestArray = [];
        let attestedRequestArray = [];
        let equivalencyRequestArray = [];
        let equivalencyApprovedArr = [];
        let equivalencyRejectedArr = [];

        const date = new Date();
        const currentYear = date.getFullYear();
        for (const i in MONTH_ARRAY) {
          const Date = await getFirstAndLastDayOfMonth(
            currentYear,
            MONTH_ARRAY[i]
          );

          const attestationRequest = await CREDENTIAL.find({
            "credentialTrackingStatus.attestationRequest.status": "APPLIED",
            "credentialTrackingStatus.attestationRequest.date": {
              $gte: Date.firstDayOfMonth,
              $lte: Date.lastDayOfMonth,
            },
          }).countDocuments();

          const attestedRequest = await CREDENTIAL.find({
            "credentialTrackingStatus.attestationRequest.status": "ATTESTED",
            "credentialTrackingStatus.attestationRequest.date": {
              $gte: Date.firstDayOfMonth,
              $lte: Date.lastDayOfMonth,
            },
          }).countDocuments();

          const attestationRequestObj = {
            attestationRequest: attestationRequest,
            month: MONTH_ARRAY[i],
          };

          const attestedRequestObj = {
            attestedRequest: attestedRequest,
            month: MONTH_ARRAY[i],
          };

          attestationRequestArray.push(attestationRequestObj);
          attestedRequestArray.push(attestedRequestObj);

          const equivalencyMonthlyRequest = await EQUIVALENCY.find({
            moeId: { $eq: user._id },
            "trackingStatus.applied.status": { $eq: "APPLIED" },
            "trackingStatus.applied.date": {
              $gte: Date.firstDayOfMonth,
              $lte: Date.lastDayOfMonth,
            },
          }).countDocuments();

          const equivalencyApprovedRequest = await EQUIVALENCY.find({
            moeId: { $eq: user._id },
            "trackingStatus.equivalated.status": { $eq: "EQUIVALATED" },
            "trackingStatus.equivalated.date": {
              $gte: Date.firstDayOfMonth,
              $lte: Date.lastDayOfMonth,
            },
          }).countDocuments();

          const equivalencyRejectRequest = await EQUIVALENCY.find({
            moeId: { $eq: user._id },
            "trackingStatus.equivalated.status": { $eq: "REJECTED" },
            "trackingStatus.equivalated.date": {
              $gte: Date.firstDayOfMonth,
              $lte: Date.lastDayOfMonth,
            },
          }).countDocuments();

          const equivalencyMonthlyRequestObj = {
            equivalencyRequest: equivalencyMonthlyRequest,
            month: MONTH_ARRAY[i],
          };

          const equivalencyApprovedObj = {
            approvedRequest: equivalencyApprovedRequest,
            month: MONTH_ARRAY[i],
          };

          const equivalencyRejectedObj = {
            rejectRequest: equivalencyRejectRequest,
            month: MONTH_ARRAY[i],
          };

          equivalencyRequestArray.push(equivalencyMonthlyRequestObj);
          equivalencyApprovedArr.push(equivalencyApprovedObj);
          equivalencyRejectedArr.push(equivalencyRejectedObj);
        }

        const AttestationChart = {
          attestationRequestArray: attestationRequestArray,
          attestedRequestArray: attestedRequestArray,
        };

        const equivalencyChart = {
          equivalencyRequestArray: equivalencyRequestArray,
          equivalencyApprovedArr: equivalencyApprovedArr,
          equivalencyRejectedArr: equivalencyRejectedArr,
        };

        const data = {
          totalInstitutes: totalInstitutes,
          totalAccreditInstitutes: totalAccreditInstitutes,
          accreditedIssuer: accreditedIssuer,
          pendingApprovalInstitution: pendingApprovalInstitution,
          totalAttestedCredentials: totalAttestedCredentials,
          totalPendingAttestations: totalPendingAttestations,
          latestPendingFiveCredentials: latestPendingFiveCredentials,
          attestationRequestArray: attestationRequestArray,
          AttestationChart: AttestationChart,
          topFiveIssuerByCredential: topFiveIssuerByCredential,
          equivalencyChart: equivalencyChart,
        };

        return data;
      } catch (error) {
        console.log(error, "Error");
        throw new Error(error);
      }
    },
  },
  Mutation: {
    MoeOnBoarding: async (parent, args, { pubsub }, info) => {
      try {
        const params = args.data;
        let secret;
        let qrCode;
        const isMoe = await MOE.findOne({
          adminEmail: { $eq: params.adminEmail },
        });
        if (isMoe) throw new UserInputError("Email already exit.");
        // * if validation Error return Error
        const isValidationErrors = await MoeOnBoardingValidation(params);
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
            console.log(err.message, "Creating QRcode");
          });
        // * Saved to db
        const moe = new MOE({
          name: params.name,
          adminEmail: params.adminEmail,
          telephone: params.telephone,
          contactEmail: params.contactEmail,
          siteUrl: params.siteUrl,
          qrCode: qrCode,
          secret: secret,
        });

        const savedMoe = await moe.save();
        // const jwtToken = await generateToken("emailToken", savedMoe, "MOE");
        // console.log(jwtToken, "jwtToken");
        if (savedMoe) {
          // * Sending verification mail
          let mail_Params = {
            from: MAIL_USERNAME,
            to: savedMoe.adminEmail,
            subject: "Verification Mail",
            message:
              "you can active your account by clicking on activate button below",
            redirectUrl: `${FRONTEND_URL}/verify-moe/${savedMoe._id}`,
          };
          await OnBoarding_Mail(mail_Params);
          //  * return Response
          return "Please check your Email for verification";
        }
      } catch (error) {
        console.log("Catch Error", error);
        throw new ApolloError(error);
      }
    },

    ActivateMOE: async (parent, args, { pubsub }, info) => {
      try {
        const isMOE = await MOE.findById(args.moeId);
        if (!isMOE) return new UserInputError("Record not found");
        // * validating OTP
        if (TWO_FA_ENABLE == "true") {
          var verified = Speakeasy.totp.verify({
            secret: isIssuer.secret.base32,
            encoding: "base32",
            token: args.otp,
          });
          if (!verified) throw new UserInputError("Invalid OTP.");
        }

        // var verified = Speakeasy.totp.verify({
        //   secret: isMOE.secret.base32,
        //   encoding: "base32",
        //   token: args.opt,
        // });

        // if (!verified) throw new UserInputError("Invalid OTP.");
        // if (isMOE.isVerified == false) {
        isMOE.isVerified = true;
        await isMOE.save();
        // }
        let data = {
          _id: isMOE._id,
          name: isMOE.name,
          adminEmail: isMOE.adminEmail,
          telephone: isMOE.telephone,
          contactEmail: isMOE.contactEmail,
          publicKey: isMOE.publicKey,
          signature: isMOE.signature,
          logoUrl: isMOE.logoUrl,
          siteUrl: isMOE.siteUrl,
          isVerified: isMOE.isVerified,
          createdAt: isMOE.createdAt,
          updatedAt: isMOE.updatedAt,
        };
        // * Generating Access Token
        const jwtToken = await generateToken("accessToken", data, "MOE");
        return jwtToken;
      } catch (error) {
        console.log(error, "error");
        throw new UserInputError(error);
      }
    },

    SetMoePassword: async (parent, args, { pubsub, user }, info) => {
      try {
        let { password, confirmPassword } = args;

        const isMOE = await MOE.findById(user._id);
        if (!isMOE) throw new UserInputError("Record not Found");

        if (!equals(password, confirmPassword)) {
          throw new UserInputError("Password not matched");
        }

        isMOE.password = await hashPassword(password);
        const keys = await bcService.issueKeys();
        isMOE.publicKey = keys.publicKey;
        isMOE.privateKey = keys.privateKey;
        isMOE.vaultAddress = keys.address;
        await isMOE.save();

        return "Password saved successfully";
      } catch (error) {
        console.log(error, "Catch Error");
        throw new UserInputError(error);
      }
    },

    MOELogin: async (parent, args, { pubsub, user }, info) => {
      try {
        let { email, password } = args;
        const isMOE = await MOE.findOne({ adminEmail: { $eq: email } });
        if (!isMOE) throw new UserInputError("Email not found.");

        let isMatched = await comparePassword(password, isMOE.password);
        if (!isMatched) throw new UserInputError("Invalid email or password.");

        let Moe = {
          _id: isMOE._id,
          name: isMOE.name,
          adminEmail: isMOE.adminEmail,
          telephone: isMOE.telephone,
          contactEmail: isMOE.contactEmail,
          publicKey: isMOE.publicKey,
          signature: isMOE.signature,
          logoUrl: isMOE.logoUrl,
          siteUrl: isMOE.siteUrl,
          isVerified: isMOE.isVerified,
          createdAt: isMOE.createdAt,
          updatedAt: isMOE.updatedAt,
        };
        const jwtToken = await generateToken("accessToken", Moe, "MOE");
        return { Moe: isMOE, token: jwtToken };
      } catch (error) {
        console.log(error, "Catch Error");
        throw new UserInputError(error);
      }
    },

    UpdateMoeDetails: async (parent, args, { pubsub, user }, info) => {
      try {
        console.log(user);
        const isMoe = await MOE.findById(user._id);
        if (!isMoe) return new UserInputError("Record not found");

        isMoe.name = args.name;
        isMoe.telephone = args.telephone;
        isMoe.contactEmail = args.contactEmail;
        isMoe.siteUrl = args.siteUrl;
        const updatedMOE = await isMoe.save();
        return updatedMOE;
      } catch (error) {
        console.log(error, "CatchError");
        throw new Error(error);
      }
    },

    ApprovedIssuer: async (parent, args, { pubsub, user }, info) => {
      try {
        const [isMoe, isIssuer] = await Promise.all([
          MOE.findById(user._id),
          ISSUER.findById(args.issuerId),
        ]);

        if (!isMoe) throw new AuthenticationError("Invalid MOE ID");
        if (!isIssuer) throw new AuthenticationError("Invalid Issuer ID");

        // * Change Approved Status of Issuer

        const keys = await bcService.issueKeys();
        isIssuer.publicKey = keys.publicKey;
        isIssuer.privateKey = keys.privateKey;
        isIssuer.vaultAddress = keys.address;
        isIssuer.approved = args.approved;
        isIssuer.moeName = isMoe.name;
        isIssuer.moePublicKey = isMoe.publicKey;
        isIssuer.approvalDate = Date.now();
        const savedIssuer = await isIssuer.save();

        await bcService.accreditInstitute(savedIssuer);

        // * Creating JWtToken for issuer mail.
        const jwtToken = await generateToken("emailToken", savedIssuer, "MOE");

        // const notificationPayload = {
        //   notifiedBy: {
        //     entity: "ISSUER",
        //     id: user._id,
        //   },
        //   notifiedTo: {
        //     entity: "LEARNER",
        //     id: isCredential.learner.id,
        //   },
        //   notificationDate: Date.now(),
        //   status: "UN_SEEN",
        //   notificationItem: {
        //     type: "CREDENTIAL",
        //     id: isCredential._id,
        //   },
        //   subject: `Credential signed`,
        //   notifyMessage: `${isCredential.issuer.name} has signed on your Credential ${isCredential.title}.`,
        // };

        // * Setting Email params

        let mail_Params = {
          from: MAIL_USERNAME,
          to: savedIssuer.adminEmail,
          subject: "",
          message: "",
          redirectUrl: `${FRONTEND_URL}/verify-issuer/${savedIssuer._id}`,
        };

        if (savedIssuer.approved) {
          mail_Params.subject = "Approved Successfully";
          mail_Params.message =
            "you are successfully approved by ministry of education. Please click the link below for  verify your Account";
        } else if (!savedIssuer.approved) {
          mail_Params.subject = "Approval Request Rejected";
          mail_Params.message =
            "you request for approval is rejected by ministry of education. Please click the link below for more details";
        }
        // * Sending mail
        await OnBoarding_Mail(mail_Params);
        // * return Response
        return "Issuer approval Status changed successfully.";
      } catch (error) {
        console.log(error, "CatchError");
        throw new AuthenticationError(error);
      }
    },

    // * This Will Work for ISSUER and LEARNER also
    SignatureUpload: async (parent, args, { pubsub, user }, info) => {
      try {
        const Path = path.join(__dirname, "../../assets/images");
        if (args.file) {
          const { createReadStream, filename } = await args.file;
          const stream = createReadStream();
          await stream.pipe(fs.createWriteStream(`${Path}/${filename}`));

          const signature = {
            imageUrl: `${FILE_URL}/${filename}`,
            uploadDate: Date.now(),
          };

          if (user.currentLogin == "MOE") {
            await MOE.findOneAndUpdate(
              { _id: user._id },
              { signature: signature },
              { new: false }
            );
            return "Signature Update successfully";
          } else if (user.currentLogin == "ISSUER") {
            await ISSUER.findOneAndUpdate(
              { _id: user._id },
              { signature: signature },
              { new: false }
            );
            return "Signature Update successfully";
          } else if (user.currentLogin == "LEARNER") {
            await LEARNER.findOneAndUpdate(
              { _id: user._id },
              { signature: signature },
              { new: false }
            );
            return "Signature Update successfully";
          }
        }
      } catch (error) {
        console.log(error, "CatchError");
        throw new Error(error);
      }
    },

    updateEquivalencyStatus: async (parent, args, { pubsub, user }, info) => {
      try {
        const arg = args.data;
        const result = await EQUIVALENCY.findById(arg.equivalencyId);
        if (!result) throw new Error("Result not found.");
        const moe = await MOE.findById(result.moeId);
        const learner = await LEARNER.findById(result.learnerId);

        const isCredential = await CREDENTIAL.findById(result.credentialId);

        let notificationParams = {
          notifiedBy: {
            entity: "MOE",
            id: moe._id,
          },
          notifiedTo: {
            entity: "LEARNER",
            id: learner._id,
          },
          notificationDate: Date.now(),
          status: "UN_SEEN",
          notificationItem: {
            type: "UPDATE_EQUIVALENCY_REQUEST",
            id: isCredential._id,
          },
          subject: `Equivalency Check.`,
          notifyMessage: "",
        };

        let trackingStatus = {
          type: "EQUIVALATED",
          status: "EQUIVALATED",
          date: Date.now(),
          comment: "",
        };

        if (arg.status == "EQUIVALATED") {
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
                attendanceInTheCountryOfStudy:
                  arg.attendanceInTheCountryOfStudy,
                // "trackingStatus.equivalated.status": arg.status,
                // "trackingStatus.currentStatus": "equivalated",
                // "trackingStatus.equivalated.date": Date.now(),
                equivalencyCertificate: arg.equivalencyCertificate,
                status: "EQUIVALATED",
              },
              $push: { trackingStatus: trackingStatus },
            }
          );

          notificationParams.notifyMessage =
            "Your request for equivalency has been approved.";
        } else if (arg.status == "REJECTED") {
          notificationParams.notifyMessage = `Your request for equivalency has been rejected.`;
          trackingStatus.status = "REJECTED";
          trackingStatus.comment = arg.comment;

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
                attendanceInTheCountryOfStudy:
                  arg.attendanceInTheCountryOfStudy,
                status: "REJECTED",
              },
              $push: {
                trackingStatus: trackingStatus,
              },
            }
          );
        }

        const BC_Params = {
          credentialId: result.credentialId,
          equivalatedBy: moe.name, //  MOE Name
          equivalatedFor: `${learner.firstName} ${learner.lastName}`, //  LEARNER NAME
          equivalentFrom: learner.address.country, // LEANER region
          equivalentTo: "United Arab Emirates", //  MOE Rejoin
          privateKey: moe.privateKey,
          status: arg.status,
          comment: arg.comment ? arg.comment : null,
        };

        const bsResult = await bcService.performEquivalency(BC_Params);

        await SaveNotification(notificationParams);

        const mail_Params = {
          from: moe.adminEmail,
          to: learner.email,
          subject: "Equivalency Request.",
          message: notificationParams.notifyMessage,
          redirectUrl: `${FRONTEND_URL}`,
        };

        await OnBoarding_Mail(mail_Params);

        await result.save();

        return "Status updated successfully";
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },
  },

  Subscription: {
    // createCredential: {
    //   subscribe(parent, args, { pubsub }, info) {
    //     return pubsub.asyncIterator("createCredential");
    //   },
    // },
  },
};
