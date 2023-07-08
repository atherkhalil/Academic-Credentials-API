import hbs from "handlebars";
import path from "path";
import fs from "fs-extra";
import { MAIL_USERNAME, transporter, FRONTEND_URL } from "../utils";
import ISSUER from "../models/Issuer";
import MOE from "../models/Moe";
import LEARNER from "../models/learner";
import { functionsIn, join, merge } from "lodash";
import ENROLLED_PROGRAM from "../models/enrolledProgram";
import PROGRAM from "../models/program";
import COURSE from "../models/courses";

import MAJOR from "../models/major";
import _ from "lodash";
import NOTIFICATION from "../models/notifications";

const OnBoarding_Mail = (params) => {
  const templatePath = path.join(
    __dirname,
    "../assets/templates/OnBoarding.html"
  );

  fs.readFile(
    templatePath,
    {
      encoding: "utf-8",
    },
    function (error, html) {
      if (error) {
        console.error(
          new Error(error, "Reading html template - OnBoarding_Mail")
        );
        throw err;
      } else {
        var template = hbs.compile(html);
        // * Passing variable in Html template
        // var replacements = {
        //   title: savedNotification.notificationAction,
        //   subject: savedNotification.notificationAction,
        // };
        var htmlToSend = template(params);

        const mailOptions = {
          from: "ahsan@mailinator.com",
          to: params.to,
          subject: params.subject,
          html: htmlToSend,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
            console.log(
              new Error(error, "Sending html template - OnBoarding_Mail")
            );
          } else {
            console.log(info.response + "Email sent -  OnBoarding_Mail");
          }
        });
      }
    }
  );
};

const SEND_FCM = (fcm, notificationParams) => {
  fcm.forEach((fcmToken) => {
    axios({
      method: "post",
      url: process.env.FCM_API,
      data: {
        to: fcmToken,
        collapse_key: "type_a",
        notification: {
          body: notificationParams.notifyMessage,
          title: notificationParams.subject,
        },
        // data: screenObj,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.FCM_KEY,
        Sender: process.env.FCM_ID,
      },
    })
      .then((resp) => {
        console.log("Send");
      })
      .catch((err) => {
        console.log("FCM Error");
      });
  });
};

const SaveNotification = async (params) => {
  try {
    const notification = new NOTIFICATION();

    notification.notifiedBy = params.notifiedBy;
    notification.notifiedTo = params.notifiedTo;
    notification.notificationDate = params.notificationDate;
    notification.status = params.status;
    notification.notificationItem = params.notificationItem;
    notification.notifyMessage = params.notifyMessage;
    notification.subject = params.subject;

    await notification.save();
  } catch (error) {
    console.log(error);
  }
};

const GetUserDetailsByLoginType = async (params) => {
  const { _id, currentLogin } = params;
  let user;
  if (currentLogin == "ISSUER") {
    user = await ISSUER.findById(_id);
  } else if (currentLogin == "LEARNER") {
    user = await LEARNER.findById(_id);
  } else if (currentLogin == "MOE") {
    user = await MOE.findById(_id);
  }

  let data = {
    _id: user._id,
    signature: user.signature,
    privateKey: user.privateKey,
    publicKey: user.publicKey,
    currentLogin: currentLogin,
  };
  return data;
};

const EnrolledLearnerInProgram = async (leaner, program, address) => {
  // Leaner
  try {
    const isProgram = await PROGRAM.findById(program.programId);
    const isEnrolledProgram = await ENROLLED_PROGRAM.findOne({
      issuerId: { $eq: program.issuerId },
      learnerId: { $eq: leaner._id },
      "program.programId": { $eq: program.programId },
    });

    if (isEnrolledProgram) throw Error("Leaner already Enrolled in program.");
    const E_program = await ENROLLED_PROGRAM();
    E_program.learnerId = leaner._id;
    E_program.issuerId = isProgram.issuerId;
    E_program.firstName = leaner.firstName;
    E_program.lastName = leaner.lastName;
    E_program.gender = leaner.gender;
    E_program.telephone = leaner.telephone;
    E_program.email = leaner.email;
    E_program.address = address;

    // ! program

    E_program.program.programId = program.programId;
    E_program.program.title = program.title;
    E_program.program.status = "IN PROGRESS";
    E_program.program.level = isProgram.level;

    E_program.program.registrationNumber = program.registrationNumber;
    E_program.program.programRegistrationNumber =
      program.programRegistrationNumber;
    E_program.program.enrollmentDate = program.enrollmentDate;
    E_program.program.session = program.session;
    E_program.program.duration = program.duration;
    E_program.program.totalSemesters = program.totalSemesters;
    E_program.program.totalYears = program.totalYears;
    E_program.program.creditHours = program.creditHours;
    E_program.program.majorSelection = program.majorSelection;
    E_program.program.majors = program.majors;

    // ! Semesters
    let semesters = [];
    _.forEach(program.semesters, function (x, index) {
      const semesterObj = {};
      semesterObj.semesterNumber = x.semesterNumber;
      semesterObj.creditHours = x.creditHours;
      semesterObj.totalCourses = x.totalCourse;
      if (index == 0) semesterObj.status = "IN PROGRESS";
      semesterObj.courses = x.courses;
      semesters.push(semesterObj);
    });

    E_program.program.semesters = semesters;

    await E_program.save();
  } catch (error) {
    console.log(error, "error Enrolled program");
  }
};

const getFirstAndLastDayOfMonth = async (year, month) => {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const result = {
    firstDayOfMonth: firstDayOfMonth,
    lastDayOfMonth: lastDayOfMonth,
  };
  return result;
};

const importLearner = async (req, res) => {
  try {
    const issuerId = req.user.user._id;
    const isIssuer = await ISSUER.findById(issuerId);
    if (!isIssuer) return res.status(400).send("Invalid Issuer.");
    const learners = req.body;

    for (var i of learners) {
      // * saving Learner

      const isLeaner = await LEARNER.findOne({ email: { $eq: i.email } });
      if (!isLeaner) {
        const newLearner = new LEARNER();
        newLearner.firstName = i.firstName;
        newLearner.lastName = i.lastName;
        newLearner.dob = i.dob;
        newLearner.gender = i.gender;
        newLearner.telephone = i.telephone;
        newLearner.email = i.email;
        newLearner.address = i.address;
        newLearner.firstName = i.firstName;
        newLearner.isVerified = true;

        // * getting programs for Learner Model
        let programArray = [];
        for (var j of i.programs) {
          const isProgram = await PROGRAM.findOne({
            title: { $eq: j.title },
          });
          if (isProgram) {
            const programObject = {
              programId: isProgram._id,
              title: isProgram.title,
              issuerId: issuerId,
              enrollmentDate: j.enrollmentDate,
            };
            programArray.push(programObject);
          }
        }

        // * saveLearner
        newLearner.programs = programArray;
        const savedLearner = await newLearner.save();

        let mail_Params = {
          from: MAIL_USERNAME,
          to: savedLearner.email,
          subject: "on Boarding Request",
          message: `${isIssuer.name} Send ON Boarding request in our Platform`,
          redirectUrl: `${FRONTEND_URL}/verify-leaner/${savedLearner._id}`,
        };
        OnBoarding_Mail(mail_Params);

        // * Enrolled Program
        const learnerPrograms = i.programs;

        for (var x of learnerPrograms) {
          const newEnrolledProgram = new ENROLLED_PROGRAM();
          newEnrolledProgram.learnerId = savedLearner._id;
          newEnrolledProgram.issuerId = issuerId;

          newEnrolledProgram.firstName = savedLearner.firstName;
          newEnrolledProgram.lastName = savedLearner.lastName;
          newEnrolledProgram.gender = savedLearner.gender;
          newEnrolledProgram.telephone = savedLearner.telephone;
          newEnrolledProgram.email = savedLearner.email;
          newEnrolledProgram.address = savedLearner.address;

          const isProgram = await PROGRAM.findOne({ title: { $eq: x.title } });
          const program = {
            title: x.title,
            programId: isProgram._id,
            registrationNumber: x.registrationNumber,
            programRegistrationNumber: x.programRegistrationNumber,
            session: x.session,
            duration: x.duration,
            totalSemesters: x.totalSemesters,
            totalYears: x.totalYears,
            creditHours: x.creditHours,
            majorSelection: x.majorSelection,
            cgpa: x.cgpa,
            status: x.status,
            enrollmentDate: x.enrollmentDate,
          };

          let majorArray = [];
          //  * Majors Array
          for (var y of x.majors) {
            console.log(y.title);
            const isMajor = await MAJOR.findOne({ title: { $eq: y.title } });
            const major = {
              title: isMajor.title,
              majorId: isMajor._id,
            };
            majorArray.push(major);
          }
          program.majors = majorArray;

          // * semesters
          for (var z of x.semesters) {
            let courseArray = [];
            for (var e of z.courses) {
              const isCourse = await COURSE.findOne({
                title: { $eq: e.title },
              });
              const courseObj = {
                courseId: isCourse._id,
                code: e.code,
                title: e.title,
                description: e.description,
                creditHours: e.creditHours,
                totalMarks: e.totalMarks,
                obtainMarks: e.obtainMarks,
                grade: e.grade,
                creditPoints: e.creditPoints,
              };
              courseArray.push(courseObj);
            }

            z.courses = courseArray;
          }
          program.semesters = x.semesters;
          newEnrolledProgram.program = program;
          await newEnrolledProgram.save();
        }
      } else {
      }

      // * course Array
    }
    return res.status(400).send("Importing Learner.");
  } catch (error) {
    console.log(error, "error");
  }
};

module.exports = {
  OnBoarding_Mail,
  GetUserDetailsByLoginType,
  EnrolledLearnerInProgram,
  SaveNotification,
  SEND_FCM,
  getFirstAndLastDayOfMonth,
  importLearner,
};
