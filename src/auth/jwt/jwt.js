import { sign, verify } from "jsonwebtoken";
import { SECRET } from ".././../utils";
import {
  ValidationError,
  UserInputError,
  ApolloError,
  AuthenticationError,
  SyntaxError,
  ForbiddenError,
} from "apollo-server-express";

// * Token Types -- accessToken, refreshToken, emailToken, resetPassword
const common = {
  accessToken: {
    secret: process.env.SECRET,
    signOptions: {
      expiresIn: "2d",
    },
  },
  refreshToken: {
    secret: process.env.SECRET,
    signOptions: {
      expiresIn: "1d",
    },
  },
  emailToken: {
    secret: process.env.SECRET,
    signOptions: {
      expiresIn: "1h",
    },
  },
  resetPassword: {
    secret: process.env.SECRET,
    signOptions: {
      expiresIn: "1h",
    },
  },
};
// * Generating Token
const generateToken = async (type, user, loginUser) => {
  return await sign(
    {
      user: user,
      currentLogin: loginUser, // MOE , ISSUER , LEARNER
      type: type,
    },
    common[type].secret,
    {
      expiresIn: common[type].signOptions.expiresIn, // 15m
    }
  );
};
// * verify Token
const verifyToken = async (token) => {
  const data = await verify(token, SECRET, async (err, data) => {
    if (err) {
      throw new AuthenticationError(
        "Authentication token is invalid, please try again."
      );
    }
    return data;
  });

  if (data.type === "emailToken") {
    return data.user;
  }
  if (data.user && !data.user.isVerified) {
    throw new ForbiddenError("Please verify your email.");
  }

  let user = {
    ...data.user,
    currentLogin: data.currentLogin,
    type: data.type,
  };
  return user;
};

const restVerify = async (req, res, next) => {
  try {
    const token = req.header("Authorization");
    const user = await verify(token, SECRET, async (err, data) => {
      if (err) {
        console.log(err, "err");
      }
      return data;
    });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).send("Invalid Token");
  }
};

export { generateToken, verifyToken, restVerify };
