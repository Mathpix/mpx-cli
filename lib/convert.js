const pkg = require("../package.json");

const fs = require("fs-extra");
const fetch = require("node-fetch");

const FormData = require("form-data");
const Window = require("window");
const { JSDOM } = require("jsdom");

const { MathpixMarkdownModel } = require("mathpix-markdown-it");

function mmdToHTMLString(mmd) {
  let destinationContentString;
  try {
    const window = new Window();
    global.DOMParser = new JSDOM().window.DOMParser;
    global.window = window;
    global.document = window.document;
    destinationContentString = MathpixMarkdownModel.markdownToHTML(mmd, {
      htmlTags: true,
      htmlSanitize: false,
    });
  } catch (err) {
    console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
    return process.exit(1);
  }
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
  if (!("MATHPIX_OCR_API_KEY" in process.env)) {
    console.log(`Could not find "MATHPIX_OCR_API_KEY" environment variable`);
    return process.exit(1);
  }

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
      console.log(jsonResponseBody);
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
  if (!("MATHPIX_OCR_API_KEY" in process.env)) {
    console.log(`Could not find "MATHPIX_OCR_API_KEY" environment variable`);
    return process.exit(1);
  }

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

  let responseJSON = await res.json();

  if (!("pdf_id" in responseJSON)) {
    console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
    return process.exit(1);
  }

  await new Promise((resolve) => {
    const pollResultInterval = setInterval(async () => {
      const url = `https://api.mathpix.com/v3/pdf/${responseJSON["pdf_id"]}`;
      const options = { method: "GET", headers: { app_key: appKey } };

      const res = await fetch(url, options);
      // console.log(res.status)
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
