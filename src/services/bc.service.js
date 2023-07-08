// interlink blockchain api's
import { BLOCKCHAIN_URL } from "../utils/config";
import axios from "axios";
import { CREDENTIAL_URL } from "../utils/config";
import { argsToArgsConfig } from "graphql/type/definition";

const issueKeys = async () => {
  try {
    const res = await axios.get(`${BLOCKCHAIN_URL}/keys/issue`);
    return res.data;
  } catch (error) {
    console.log(error, "issueKeys Error");
    return error;
  }
};
const signWithECDSA = async (params) => {
  try {
    const res = await axios.post(
      `${BLOCKCHAIN_URL}/credentials/signWithECDSA`,
      {
        credentialId: params.credentialId,
        type: params.type,
        privateKey: params.privateKey,
        status: params.status,
        comment: params.status == "REJECTED" ? params.comment : null,
      }
    );
    return res.data;
  } catch (error) {
    console.log(error.response.data, "signWithECDSA");
    return error;
  }
};
const createCredentials = async (params) => {
  try {
    const res = await axios.post(`${BLOCKCHAIN_URL}/credentials/create`, {
      id: params.id,
      courseId: params.courseId,
      level: params.level,
      faculty: params.faculty,
      session: params.session,
      type: params.type,
      title: params.title,
      description: params.description,
      creditHours: params.creditHours,
      cgpa: params.cgpa,
      credentialUrl: `${CREDENTIAL_URL}/${params.id}.pdf`,
      issuanceDate: params.issuanceDate,
      priv_key: params.priv_key,
      issuer: params.issuer,
      learner: params.learner,
      moe: params.moe,
    });

    return res.data;
  } catch (error) {
    console.log(error);
    return error;
  }
};

const accreditInstitute = async (params) => {
  try {
    const res = await axios.post(`${BLOCKCHAIN_URL}/accreditations/new`, {
      issuerId: params._id,
      issuerName: params.name,
      publicKey: params.publicKey,
    });
    return res.data;
  } catch (error) {
    console.log(error, "errorCatch");
    throw new Error("BlockChian Error While Accrediting Issuer");
  }
};

const performEquivalency = async (params) => {
  try {
    const res = await axios.post(`${BLOCKCHAIN_URL}/performEquivalency`, {
      credentialId: params.credentialId,
      equivalatedBy: params.equivalatedBy,
      equivalatedFor: params.equivalatedFor,
      equivalentFrom: params.equivalentFrom,
      equivalentTo: params.equivalentTo,
      privateKey: params.privateKey,
      status: params.status,
      comment: params.status == "REJECTED" ? params.comment : null,
    });
    return res.data;
  } catch (error) {
    return error;
  }
};

module.exports = {
  issueKeys,
  signWithECDSA,
  createCredentials,
  accreditInstitute,
  performEquivalency,
};
