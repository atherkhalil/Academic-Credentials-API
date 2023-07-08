import mailer from "nodemailer";
import {
  MAIL_USERNAME,
  MAIL_PASSWORD,
  MAIL_HOST,
  MAIL_PORT,
  MAIL_SECURE,
} from "./config";

var mailConfig = {
  host: MAIL_HOST,
  port: 587,
  secureConnection: false,
  // secure: MAIL_SECURE,

  auth: {
    user: MAIL_USERNAME,
    pass: MAIL_PASSWORD,
  },
  tls: {
    ciphers: "SSLv3",
  },
  // host: "smtp.mailtrap.io",
  // port: 2525,
  // auth: {
  //   user: MAIL_USERNAME,
  //   pass: MAIL_PASSWORD,
  // },
};

let transporter = mailer.createTransport(mailConfig);

module.exports = { transporter };
