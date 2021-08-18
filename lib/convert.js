const pkg = require("../package.json");

const fs = require("fs-extra");
const fetch = require("node-fetch");

const FormData = require("form-data");
const Window = require("window");
const { JSDOM } = require("jsdom");

const config = require("./config");

const { MathpixMarkdownModel } = require("mathpix-markdown-it");

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
      title: "spectra",
      includeStyles: true,
      includeFonts: true,
    },
  });

  return destinationContentString;
}

function MarkdownToHTML(source, destination, sourceText) {
  let sourceContentString = source;
  if (!sourceText) {
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

async function ConvertWithExportAPI(expectedContentType, url, source, destination, sourceText) {
  await config.checkEnvironmentVariables();

  let sourceContentString = source;
  if (!sourceText) {
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
  }

  let headers = {};
  if (process.env["MATHPIX_OCR_API_KEY"]) {
    headers = {
      app_key: process.env["MATHPIX_OCR_API_KEY"],
    };
  } else {
    headers = {
      authorization: "Bearer " + process.env["MATHPIX_SNIP_AUTH_TOKEN"],
    };
  }

  let options = {
    method: "POST",
    headers: headers,
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

async function MarkdownToDocx(source, destination, sourceText) {
  const cType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const url = "https://api.mathpix.com/v1/export/docx";
  await ConvertWithExportAPI(cType, url, source, destination, sourceText);
}

async function MarkdownToTex(source, destination, sourceText) {
  const cType = "application/zip";
  const url = "https://api.mathpix.com/v1/export/latex";
  await ConvertWithExportAPI(cType, url, source, `${destination}.zip`, sourceText);
}

async function MarkdownToHTMLPDF(source, destination, sourceText) {
  const cType = "application/pdf";
  const url = "https://api.mathpix.com/v1/export/pdf/html";
  await ConvertWithExportAPI(cType, url, source, destination, sourceText);
}

async function MarkdownToLatexPDF(source, destination, sourceText) {
  const cType = "application/pdf";
  const url = "https://api.mathpix.com/v1/export/pdf/latex";
  await ConvertWithExportAPI(cType, url, source, destination, sourceText);
}

async function MarkdownToMarkdown(source, destination) {
  try {
    await fs.copy(source, destination);
  } catch (err) {
    console.log(`Could not write to destination path: ${destination}`);
    return process.exit(1);
  }
}

async function ConvertPDF(outputType, source, destination) {
  await config.checkEnvironmentVariables();
  if (process.env["MATHPIX_OCR_API_KEY"]) {
    await ConvertPDFWithOCRAPI(process.env["MATHPIX_OCR_API_KEY"], outputType, source, destination);
  } else {
    await ConvertPDFWithSnipAPI(
      process.env["MATHPIX_SNIP_AUTH_TOKEN"],
      outputType,
      source,
      destination
    );
  }
}

async function ConvertPDFWithOCRAPI(apiKey, outputType, source, destination) {
  process.stdout.write(`Converting pdf to ${outputType}\r`);

  const formData = new FormData();
  formData.append("file", fs.createReadStream(source));

  let url = "https://api.mathpix.com/v3/pdf-file";

  const formHeaders = formData.getHeaders();

  formHeaders["app_key"] = apiKey;

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
      } else if (
        jsonResponseBody["errors"] &&
        jsonResponseBody["errors"].length &&
        jsonResponseBody["errors"][0]["id"] === "pdf_page_limit_exceeded"
      ) {
        console.log("This pdf would put you over your OCR API's PDF page limit.");
        console.log("Please contact support@mathpix.com to request a higher limit.");
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
      const options = { method: "GET", headers: { app_key: apiKey } };

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

  let originalOutputType = outputType;
  if (outputType === "html") {
    outputType = "mmd";
  }

  const outputURL = `https://api.mathpix.com/v3/pdf/${responseJSON["pdf_id"]}.${outputType}`;
  const outputRes = await fetch(outputURL, { method: "GET", headers: { app_key: apiKey } });
  if (outputRes.status !== 200) {
    console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
    return process.exit(1);
  }

  if (originalOutputType === "html") {
    const mmd = await outputRes.text();
    try {
      fs.writeFileSync(destination, mmdToHTMLString(mmd));
    } catch (err) {
      console.log(`Could not write to destination path: ${destination}`);
      return process.exit(1);
    }
    return;
  }

  const bufferResponseBody = await outputRes.buffer();
  try {
    fs.writeFileSync(destination, bufferResponseBody);
  } catch (err) {
    console.log(`Could not write to destination path: ${destination}`);
    return process.exit(1);
  }
}

async function ConvertPDFWithSnipAPI(authToken, outputType, source, destination) {
  process.stdout.write(`Converting pdf to ${outputType}\r`);

  const formData = new FormData();
  formData.append("file", fs.createReadStream(source));

  let url = "https://api.mathpix.com/v1/pdfs";

  const formHeaders = formData.getHeaders();

  formHeaders["authorization"] = "Bearer " + authToken;

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
        jsonResponseBody["errors"][0]["id"] === "pdf_page_max_limit"
      ) {
        console.log("This pdf would put you over your Snip plan's PDF page limit.");
        console.log("Please upgrade your plan or enable extra usage to continue at");
        console.log("https://accounts.mathpix.com");
        return process.exit(1);
      } else {
        const responseBody = JSON.stringify(jsonResponseBody);
        throw new Error(`Snip Server POST PDF Response ${res.status} with json body:\n${responseBody}`);
      }
    } else {
      throw new Error(`Snip Server POST PDF Response ${res.status} ${res.statusText}`);
    }
  }

  if (!res.headers.get("content-type").startsWith("application/json")) {
    throw new Error(
      `Snip Server response returned content-type header: ${res.headers.get("content-type")}.`
    );
  }

  let responseJSON = await res.json();
  if (!("pdf" in responseJSON) && !("id" in responseJSON["pdf"])) {
    throw new Error("Missing pdf id in Snip API response.");
  }

  let pdfID = responseJSON["pdf"]["id"];

  let headers = {
    authorization: "Bearer " + authToken,
  };

  await new Promise((resolve) => {
    const pollResultInterval = setInterval(async () => {
      const url = `https://api.mathpix.com/v1/pdfs/${pdfID}`;

      const options = { method: "GET", headers: headers };

      const res = await fetch(url, options);
      if (res.status !== 200) {
        console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
        return process.exit(1);
      }

      const statusJSON = await res.json();
      if (statusJSON["pdf"]["status"] === "completed") {
        resolve();
        clearInterval(pollResultInterval);
      }

      if (statusJSON["pdf"]["status"] === "error") {
        console.log(`Error: ${statusJSON["error"]}`);
        return process.exit(1);
      }

      let completedPages = statusJSON["pdf"]["completed_pages"];
      let totalPages = statusJSON["pdf"]["total_pages"];

      let percentComplete = completedPages / totalPages;

      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(
        `Converting pdf to ${outputType} ${Math.round(percentComplete)}% complete... \r`
      );
    }, 500);
  });

  process.stdout.clearLine();
  process.stdout.cursorTo(0);

  let originalOutputType = outputType;
  if (outputType === "html") {
    outputType = "mmd";
  }

  const outputURL = `https://api.mathpix.com/v1/pdfs/${pdfID}/${outputType}`;
  const outputRes = await fetch(outputURL, { method: "GET", headers: headers });
  if (outputRes.status !== 200) {
    console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
    return process.exit(1);
  }

  if (originalOutputType === "html") {
    const mmd = await outputRes.text();
    try {
      fs.writeFileSync(destination, mmdToHTMLString(mmd));
    } catch (err) {
      console.log(`Could not write to destination path: ${destination}`);
      return process.exit(1);
    }
    return;
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
  await ConvertPDF("mmd", source, destination);
}

async function PDFToDOCX(source, destination) {
  await ConvertPDF("docx", source, destination);
}

async function PDFToTEX(source, destination) {
  await ConvertPDF("tex", source, `${destination}.zip`);
}

async function PDFToHTML(source, destination) {
  await ConvertPDF("html", source, destination);
}

async function ConvertImageWithSnipAPI(authToken, outputType, source, destination, htmlPDF) {
  process.stdout.write(`Converting image to ${outputType}\r`);

  const formData = new FormData();
  formData.append("file", fs.createReadStream(source));

  let url = "https://api.mathpix.com/v1/snips-multipart";

  const formHeaders = formData.getHeaders();

  formHeaders["authorization"] = "Bearer " + authToken;

  let options = {
    method: "POST",
    headers: formHeaders,
  };

  options.body = formData;

  let res = await fetch(url, options);
  if (res.status !== 201) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    if (res.headers.get("content-type").startsWith("application/json")) {
      const jsonResponseBody = await res.json();
      if (
        jsonResponseBody["errors"] &&
        jsonResponseBody["errors"].length &&
        jsonResponseBody["errors"][0]["id"] === "snip_max_limit"
      ) {
        console.log("This image would put you over your Snip plan's snip limit.");
        console.log("Please upgrade your plan or enable extra usage to continue at");
        console.log("https://accounts.mathpix.com");
        return process.exit(1);
      } else {
        const responseBody = JSON.stringify(jsonResponseBody);
        throw new Error(`Snip server response ${res.status} with json body:\n${responseBody}`);
      }
    } else {
      throw new Error(`Snip server response ${res.status} ${res.statusText}`);
    }
  }

  if (!res.headers.get("content-type").startsWith("application/json")) {
    throw new Error(
      `Snip server response returned content-type header: ${res.headers.get("content-type")}.`
    );
  }

  process.stdout.clearLine();
  process.stdout.cursorTo(0);

  let responseJSON = await res.json();
  if (destination.endsWith("docx")) {
    await MarkdownToDocx(responseJSON["text_display"], destination, true);
  } else if (destination.endsWith("tex")) {
    await MarkdownToTex(responseJSON["text_display"], destination, true);
  } else if (destination.endsWith("pdf") && htmlPDF) {
    await MarkdownToHTMLPDF(responseJSON["text_display"], destination, true);
  } else if (destination.endsWith("pdf")) {
    await MarkdownToLatexPDF(responseJSON["text_display"], destination, true);
  } else if (destination.endsWith("html")) {
    await MarkdownToHTML(responseJSON["text_display"], destination, true);
  } else {
    try {
      fs.writeFileSync(destination, responseJSON["text_display"]);
    } catch (err) {
      console.log(`Could not write to destination path: ${destination}`);
      return process.exit(1);
    }
  }
}

async function ConvertImageWithOCRAPI(apiKey, outputType, source, destination, htmlPDF) {
  process.stdout.write(`Converting image to ${outputType}\r`);

  const formData = new FormData();
  formData.append("file", fs.createReadStream(source));

  let url = "https://api.mathpix.com/v3/text";

  const formHeaders = formData.getHeaders();

  formHeaders["app_key"] = apiKey;

  let options = {
    method: "POST",
    headers: formHeaders,
  };

  options.body = formData;

  let res = await fetch(url, options);
  if (res.status !== 200) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    if (res.headers.get("content-type").startsWith("application/json")) {
      const jsonResponseBody = await res.json();
      if (
        jsonResponseBody["errors"] &&
        jsonResponseBody["errors"].length &&
        jsonResponseBody["errors"][0]["id"] === "http_max_requests"
      ) {
        console.log("This image would put you over your request rate limit.");
        console.log("Please contact support@mathpix.com to increase your limit.");
        return process.exit(1);
      } else {
        const responseBody = JSON.stringify(jsonResponseBody);
        throw new Error(`OCR API response ${res.status} with json body:\n${responseBody}`);
      }
    } else {
      throw new Error(`OCR API response ${res.status} ${res.statusText}`);
    }
  }

  if (!res.headers.get("content-type").startsWith("application/json")) {
    throw new Error(
      `OCR API response returned content-type header: ${res.headers.get("content-type")}.`
    );
  }

  process.stdout.clearLine();
  process.stdout.cursorTo(0);

  let responseJSON = await res.json();
  if (destination.endsWith("docx")) {
    await MarkdownToDocx(responseJSON["latex_styled"], destination, true);
  } else if (destination.endsWith("tex")) {
    await MarkdownToTex(responseJSON["latex_styled"], destination, true);
  } else if (destination.endsWith("pdf") && htmlPDF) {
    await MarkdownToHTMLPDF(responseJSON["latex_styled"], destination, true);
  } else if (destination.endsWith("pdf")) {
    await MarkdownToLatexPDF(responseJSON["latex_styled"], destination, true);
  } else if (destination.endsWith("html")) {
    await MarkdownToHTML(responseJSON["latex_styled"], destination, true);
  } else {
    try {
      fs.writeFileSync(destination, responseJSON["latex_styled"]);
    } catch (err) {
      console.log(`Could not write to destination path: ${destination}`);
      return process.exit(1);
    }
  }
}


async function ConvertImage(outputType, source, destination, htmlPDF) {
  await config.checkEnvironmentVariables();
  if (process.env["MATHPIX_OCR_API_KEY"]) {
    console.log("Convert with ocr api", source, destination, outputType);
    await ConvertImageWithOCRAPI(process.env["MATHPIX_OCR_API_KEY"], outputType, source, destination);
  } else {
    console.log("Convert with snip api", source, destination, outputType);
    await ConvertImageWithSnipAPI(
      process.env["MATHPIX_SNIP_AUTH_TOKEN"],
      outputType,
      source,
      destination,
      htmlPDF
    );
  }
}

async function ImageToMMD(source, destination) {
  await ConvertImage("mmd", source, destination);
}

async function ImageToDOCX(source, destination) {
  await ConvertImage("docx", source, destination);
}

async function ImageToTEX(source, destination) {
  await ConvertImage("tex", source, `${destination}.zip`);
}

async function ImageToHTML(source, destination) {
  await ConvertImage("html", source, destination);
}

async function ImageToLatexPDF(source, destination) {
  await ConvertImage("pdf", source, destination);
}

async function ImageToHTMLPDF(source, destination) {
  await ConvertImage("pdf", source, destination, true);
}

module.exports = {
  MarkdownToHTML,
  MarkdownToDocx,
  MarkdownToTex,
  MarkdownToHTMLPDF,
  MarkdownToLatexPDF,
  MarkdownToMarkdown,
  PDFToMMD,
  PDFToDOCX,
  PDFToTEX,
  PDFToHTML,
  ImageToMMD,
  ImageToDOCX,
  ImageToTEX,
  ImageToHTML,
  ImageToLatexPDF,
  ImageToHTMLPDF,
  ConvertImage,
};
