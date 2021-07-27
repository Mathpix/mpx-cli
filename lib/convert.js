const pkg = require("../package.json");

const os = require("os");
const path = require("path");

const fs = require("fs-extra");
const fetch = require("node-fetch");
const inquirer = require("inquirer");

const FormData = require("form-data");
const Window = require("window");
const { JSDOM } = require("jsdom");

const config = require("./config");

const { MathpixMarkdownModel } = require("mathpix-markdown-it");

async function checkEnvironmentVariables() {
  if (!("MATHPIX_OCR_API_KEY" in process.env)) {
    console.log(`Could not find "MATHPIX_OCR_API_KEY" environment variable.`);
    console.log(`Please sign up at https://accounts.mathpix.com to create your OCR API Key`);
    console.log(`then set the environment variable or run spectra set-api-key YOUR_API_KEY`);
    return process.exit(1);
  }

  if (!("MATHPIX_OCR_API_PRICING_AGREE" in process.env)) {
    const answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "pricing",
        message: "Do you agree to the Mathpix OCR API pricing?",
      },
    ]);
    if (!answers.pricing) {
      console.log(`You must agree to the Mathpix OCR API pricing to continue.`);
      return process.exit(1);
    }
    await config.update({ MATHPIX_OCR_API_PRICING_AGREE: "true" });
  }
}

function mmdToHTMLString(mmd) {
  let destinationContentString;
  const window = new Window();
  global.DOMParser = new JSDOM().window.DOMParser;
  global.window = window;
  global.document = window.document;
  destinationContentString = MathpixMarkdownModel.markdownToHTML(mmd, {
    htmlTags: true,
    htmlSanitize: false,
    htmlWrapper: {
      title: 'spectra',
      includeStyles: true,
      includeFonts: true
    }
  });

  return destinationContentString;
}

function MarkdownToHTML(source, destination) {
  let sourceContentString;
  try {
    if (!fs.existsSync(source)) {
      console.log(`Could not find source file at path: ${source}`);
      return process.exit(1);
    }
    sourceContentString = fs.readFileSync(source, "utf8");
  } catch (err) {
    console.log(`Could not read source path: ${source}`);
    return process.exit(1);
  }

  let destinationContentString = mmdToHTMLString(sourceContentString);

  if (destination) {
    try {
      fs.writeFileSync(destination, destinationContentString);
    } catch (err) {
      console.log(`Could not write to destination path: ${destination}`);
      return process.exit(1);
    }
    return;
  }

  return destinationContentString;
}

async function ConvertWithExportAPI(expectedContentType, url, source, destination) {
  await checkEnvironmentVariables();

  let sourceContentString;

  try {
    if (!fs.existsSync(source)) {
      console.log(`Could not find source file at path: ${source}`);
      return process.exit(1);
    }
    sourceContentString = fs.readFileSync(source, "utf8");
  } catch (err) {
    console.log(`Could not read source path: ${source}`);
    return process.exit(1);
  }

  let options = {
    method: "POST",
    headers: {
      app_key: process.env["MATHPIX_OCR_API_KEY"],
    },
    body: JSON.stringify({
      mmd: sourceContentString,
      fileName: destination.split(".")[0],
    }),
  };

  const res = await fetch(url, options);
  if (res.status !== 200 || res.headers.get("content-type") !== expectedContentType) {
    if (res.headers.get("content-type") === "application/json") {
      const jsonResponseBody = await res.json();
      if (
        jsonResponseBody["errors"] &&
        jsonResponseBody["errors"].length &&
        jsonResponseBody["errors"][0]["id"] === "invalid_app_key_header"
      ) {
        console.log(`Invalid app key set in "MATHPIX_OCR_API_KEY" environment variable.`);
        return process.exit(1);
      } else {
        console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
        return process.exit(1);
      }
    } else {
      const textResponseBody = await res.text();
      console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
      return process.exit(1);
    }
  }

  const bufferResponseBody = await res.buffer();
  try {
    fs.writeFileSync(destination, bufferResponseBody);
  } catch (err) {
    console.log(`Could not write to destination path: ${destination}`);
    return process.exit(1);
  }
}

async function MarkdownToDocx(source, destination) {
  const cType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const url = "https://api.mathpix.com/v1/export/docx";
  await ConvertWithExportAPI(cType, url, source, destination);
}

async function MarkdownToTex(source, destination) {
  const cType = "application/zip";
  const url = "https://api.mathpix.com/v1/export/latex";
  await ConvertWithExportAPI(cType, url, source, `${destination}.zip`);
}

async function MarkdownToHTMLPDF(source, destination) {
  const cType = "application/pdf";
  const url = "https://api.mathpix.com/v1/export/pdf/html";
  await ConvertWithExportAPI(cType, url, source, destination);
}

async function MarkdownToLatexPDF(source, destination) {
  const cType = "application/pdf";
  const url = "https://api.mathpix.com/v1/export/pdf/latex";
  await ConvertWithExportAPI(cType, url, source, destination);
}

async function MarkdownToMarkdown(source, destination) {
  try {
    await fs.copy(source, destination);
  } catch (err) {
    console.log(`Could not write to destination path: ${destination}`);
    return process.exit(1);
  }
}

async function ConvertWithOCRAPI(outputType, source, destination) {
  await checkEnvironmentVariables();

  process.stdout.write(`Converting pdf to ${outputType}\r`);

  appKey = process.env["MATHPIX_OCR_API_KEY"];

  const formData = new FormData();
  formData.append("file", fs.createReadStream(source));

  let url = "https://api.mathpix.com/v3/pdf-file";

  const formHeaders = formData.getHeaders();

  formHeaders["app_key"] = appKey;

  let options = {
    method: "POST",
    headers: formHeaders,
  };

  options.body = formData;

  let res = await fetch(url, options);
  if (res.status !== 200) {
    if (res.headers.get("content-type").startsWith("application/json")) {
      const jsonResponseBody = await res.json();
      if (
        jsonResponseBody["errors"] &&
        jsonResponseBody["errors"].length &&
        jsonResponseBody["errors"][0]["id"] === "http_unauthorized"
      ) {
        console.log(`Invalid app key set in "MATHPIX_OCR_API_KEY" environment variable.`);
        return process.exit(1);
      } else {
        const responseBody = JSON.stringify(jsonResponseBody);
        throw new Error(`OCR API POST PDF Response ${res.status} with json body:\n${responseBody}`);
      }
    } else {
      throw new Error(`OCR API POST PDF Response ${res.status} ${res.statusText}`);
    }
  }

  if (!res.headers.get("content-type").startsWith("application/json")) {
    throw new Error(
      `OCR API response returned content-type header: ${res.headers.get("content-type")}.`
    );
  }

  let responseJSON = await res.json();
  if (!("pdf_id" in responseJSON)) {
    throw new Error("Missing pdf_id in OCR API response.");
  }

  await new Promise((resolve) => {
    const pollResultInterval = setInterval(async () => {
      const url = `https://api.mathpix.com/v3/pdf/${responseJSON["pdf_id"]}`;
      const options = { method: "GET", headers: { app_key: appKey } };

      const res = await fetch(url, options);
      if (res.status !== 200) {
        console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
        return process.exit(1);
      }

      const statusJSON = await res.json();
      if (statusJSON["status"] === "completed") {
        resolve();
        clearInterval(pollResultInterval);
      }

      if (statusJSON["status"] === "error") {
        console.log(`Error: ${statusJSON["error"]}`);
        return process.exit(1);
      }

      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(
        `Converting pdf to ${outputType} ${Math.round(statusJSON["percent_done"])}% complete... \r`
      );
    }, 500);
  });

  if (outputType === "html") {
    outputType = "mmd";
  }

  const outputURL = `https://api.mathpix.com/v3/pdf/${responseJSON["pdf_id"]}.${outputType}`;
  const outputRes = await fetch(outputURL, { method: "GET", headers: { app_key: appKey } });
  if (outputRes.status !== 200) {
    console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
    return process.exit(1);
  }

  if (!destination) {
    return await outputRes.text();
  }

  const bufferResponseBody = await outputRes.buffer();
  try {
    fs.writeFileSync(destination, bufferResponseBody);
  } catch (err) {
    console.log(`Could not write to destination path: ${destination}`);
    return process.exit(1);
  }
}

async function PDFToMMD(source, destination) {
  await ConvertWithOCRAPI("mmd", source, destination);
}

async function PDFToDOCX(source, destination) {
  await ConvertWithOCRAPI("docx", source, destination);
}

async function PDFToTEX(source, destination) {
  await ConvertWithOCRAPI("tex", source, `${destination}.zip`);
}

async function PDFToHTML(source, destination) {
  const mmd = await ConvertWithOCRAPI("html", source);
  try {
    fs.writeFileSync(destination, mmdToHTMLString(mmd));
  } catch (err) {
    console.log(`Could not write to destination path: ${destination}`);
    return process.exit(1);
  }
  return;
}

module.exports = {
  MarkdownToHTML: MarkdownToHTML,
  MarkdownToDocx: MarkdownToDocx,
  MarkdownToTex: MarkdownToTex,
  MarkdownToHTMLPDF: MarkdownToHTMLPDF,
  MarkdownToLatexPDF: MarkdownToLatexPDF,
  MarkdownToMarkdown: MarkdownToMarkdown,
  PDFToMMD: PDFToMMD,
  PDFToDOCX: PDFToDOCX,
  PDFToTEX: PDFToTEX,
  PDFToHTML: PDFToHTML,
};
