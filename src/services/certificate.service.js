import path from "path";
import fs from "fs-extra";
import Handlebars from "handlebars";
import Puppeteer from "puppeteer";
import { PDFDocument, degrees, StandardFonts, rgb } from "pdf-lib";
import CREDENTIAL from "../models/Credentials";
import helper from "./helper";
import { CREDENTIAL_URL } from "../utils";
import fetch from "node-fetch";
import moment from "moment/moment";

const generateHtmlCopy = (params) => {
  const certificatePath = path.join(__dirname, `../assets/files/${params._id}`);
  const htmlTemplatePath = path.join(
    __dirname,
    "../assets/templates/certificate.html"
  );
  fs.readFile(
    htmlTemplatePath,
    {
      encoding: "utf-8",
    },
    function (err, html) {
      if (err) {
        console.log(err, "Html file read error.");
      } else {
        try {
          var template = Handlebars.compile(html);
          const replacement = {
            learnerName: `${params.learner.firstName} ${params.learner.lastName}`,
            issuerName: params.issuer.name,
            title: params.title,
          };
          console.log(replacement, "replacement");
          var htmlToCreate = template(replacement);

          var stream = fs.createWriteStream(`${certificatePath}.html`, {
            flags: "a",
          });
          // console.log(stream);
          stream.write(htmlToCreate, function (err, resp) {
            if (err) {
              console.log(err, "err");
            }
            console.log("html Page Created.");
            // ! HTML to PDF
            GenerateHTMLtoBuffer(params, certificatePath);
          });
        } catch (error) {
          console.log(error, "CatchError generateHtmlCopy.");
        }
      }
    }
  );
};

const GenerateHTMLtoBuffer = async (params, certificatePath) => {
  try {
    const URL = `${CREDENTIAL_URL}/${params._id}.html`;
    const browser = await Puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();

    await page.goto(URL, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      path: `${certificatePath}.pdf`,
      landscape: true,
      preferCSSPageSize: true,
    });

    await browser.close();

    await CREDENTIAL.updateOne(
      { _id: params._id },
      {
        $set: {
          credentialUrl: `${params._id}.pdf`,
        },
      }
    );
  } catch (err) {
    console.log(err, "error in GenerateHTMLtoBuffer ");
  }
};

const AddSignatureToCredential = async (user, credential) => {
  try {
    const existingCredentialPath = path.join(
      __dirname,
      `../assets/files/${credential._id}.pdf`
    );
    const credentialURL = `${CREDENTIAL_URL}/${credential.credentialUrl}`;
    // * get signature in bytes by signature URL
    const signatureInBytes = await fetch(user.signature.imageUrl).then((res) =>
      res.arrayBuffer()
    );
    const credentialsPdfBytes = await fetch(credentialURL).then((res) =>
      res.arrayBuffer()
    );
    // load pdf
    const pdfDoc = await PDFDocument.load(credentialsPdfBytes);
    const pngSignature = await pdfDoc.embedPng(signatureInBytes);

    const date = moment().format("L");

    const pages = pdfDoc.getPages();
    const lastPage = pages[0];
    let x, y;
    let width = 90;
    let height = 60;
    let dateX;
    let dateY;

    if (user.currentLogin == "ISSUER") {
      x = 185;
      y = 170;
      dateX = 190;
      dateY = 135;
    } else if (user.currentLogin == "LEARNER") {
      x = 350;
      y = 170;
      dateX = 355;
      dateY = 135;
    } else if (user.currentLogin == "MOE") {
      x = 515;
      y = 170;
      dateX = 520;
      dateY = 135;
    }
    lastPage.drawImage(pngSignature, {
      x: x,
      y: y,
      width: width,
      height: height,
    });

    lastPage.drawText(date, {
      x: dateX,
      y: dateY,
      size: 12,
    });

    const pdfBytes = await pdfDoc.save();
    if (fs.existsSync(existingCredentialPath)) {
      //file exists
      fs.unlinkSync(existingCredentialPath);
      fs.writeFileSync(`${existingCredentialPath}`, pdfBytes);
    }
    return true;
  } catch (err) {
    console.error(err, "CatchError");
    throw new Error(err);
  }
};

module.exports = {
  generateHtmlCopy,
  AddSignatureToCredential,
};
