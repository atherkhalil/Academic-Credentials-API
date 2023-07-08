import * as dotenv from "dotenv";
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
// * Mail Configuration
const MAIL_USERNAME = process.env.MAIL_USERNAME || "fe7967d835dd5a";
const MAIL_PASSWORD = process.env.MAIL_PASSWORD || "e93453cbad06d8";
const MAIL_HOST = process.env.MAIL_HOST || "smtp.mailtrap.io";
const MAIL_PORT = process.env.MAIL_PORT || 465;
const MAIL_SECURE = process.env.MAIL_SECURE || true;
const SECRET = process.env.SECRET || "TEAM_GOKU";
const FILE_URL = process.env.FILE_URL || "http://localhost:5000/files";
const CREDENTIAL_URL =
  process.env.CREDENTIAL_URL || "http://localhost:5000/file";
const BLOCKCHAIN_URL =
  process.env.BLOCKCHAIN_URL || "http://openuae.ddns.net:22004";

const BLOCKCHAIN_ENABLE = process.env.BLOCKCHAIN_ENABLE || "true";
const TWO_FA_ENABLE = process.env.TWO_FA_ENABLE || "true";

const MONTH_ARRAY = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export {
  NODE_ENV,
  PORT,
  MAIL_USERNAME,
  MAIL_PASSWORD,
  MAIL_HOST,
  MAIL_PORT,
  MAIL_SECURE,
  MONGO_URL,
  SECRET,
  FRONTEND_URL,
  FILE_URL,
  CREDENTIAL_URL,
  BLOCKCHAIN_URL,
  BLOCKCHAIN_ENABLE,
  MONTH_ARRAY,
  TWO_FA_ENABLE,
};
