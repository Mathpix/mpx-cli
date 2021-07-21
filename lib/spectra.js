const pkg = require("../package.json");

const pleaseUpgrade = require("please-upgrade-node");

pleaseUpgrade(pkg, {
  message: function (requiredVersion) {
    return `Spectra requires Node v ${requiredVersion}. Please upgrade to use it.`;
  },
});

const os = require("os");
const path = require("path");

const fs = require("fs-extra");
const commander = require("commander");
const Eleventy = require("@11ty/eleventy");
const express = require("express");
const serveIndex = require("serve-index");

const dotenv = require("dotenv");

const config = require("./config");
const convert = require("./convert");

const processStartTime = process.hrtime();
const program = new commander.Command();

const spectraConfigFile = path.join(os.homedir(), ".spectra", "config");
dotenv.config({ path: spectraConfigFile });

program
  .name("spectra")
  .version(pkg.version)
  .description(pkg.description)
  .usage("command [options] [args]");

program
  .command("build [source] [destination]")
  .description("build a static html site from a directory of markdown or mathpix markdown")
  .option("-i, --input [directory]", "input directory of markdown to convert into html.", "./")
  .option("-o, --output [directory]", "output directory to save the converted html.", "./dist")
  .option("-w, --watch", "watch the directory of markdown for changes and convert if changed")
  .option("-s, --serve", "serve the converted html on a local port with reloading")
  .option("-p, --port <integer>", "port to serve the built html on locally.", 8080)
  .option("-v, --verbose", "enable verbose mode to add more logging")
  .action((source, destination, opts) => {
    const inputDirectory = source ? path.relative(".", source) : opts.input;
    const outputDirectory = destination ? path.relative(".", destination) : opts.output;

    if (!fs.existsSync(inputDirectory) || !fs.lstatSync(inputDirectory).isDirectory()) {
      console.log(`Source ${inputDirectory} must be a directory.`);
      return process.exit(1);
    }

    const srcDir = path.join(__dirname, "..", ".spectra");
    const destDir = path.join(inputDirectory, ".spectra");
    const configFile = path.join(inputDirectory, ".spectra", "config.js");

    if (!fs.existsSync(configFile)) {
      fs.copySync(srcDir, destDir);
      console.log(`Created new directory at ${destDir} containing config and layouts`);
    }

    const indexMD = path.join(inputDirectory, "index.md");
    const indexMMD = path.join(inputDirectory, "index.mmd");
    const indexHTML = path.join(inputDirectory, "index.html");
    const indexNJK = path.join(inputDirectory, "index.njk");

    if (
      !fs.existsSync(indexMD) &&
      !fs.existsSync(indexMMD) &&
      !fs.existsSync(indexHTML) &&
      !fs.existsSync(indexNJK)
    ) {
      fs.copySync(
        path.join(__dirname, "..", "templates", "index.njk"),
        path.join(inputDirectory, "index.njk")
      );
      console.log(`Created new index template at ${path.join(inputDirectory, "index.njk")}`);
    }

    console.log(`Converting ${inputDirectory} to ${outputDirectory}`);

    let elev = new Eleventy(inputDirectory, outputDirectory, {
      quietMode: !opts.verbose,
    });

    elev.setIncrementalBuild(true);
    elev.setConfigPathOverride(configFile);

    elev.init().then(function () {
      if (opts.serve) {
        elev.watch().then(function () {
          elev.serve(opts.serve === true ? opts.port : opts.serve);
        });
      } else if (opts.watch) {
        elev.watch();
      } else {
        elev.write();
      }
    });
  });

program
  .command("convert <source.ext> <destination.ext>")
  .description("convert files between markdown, mathpix markdown, docx, latex and pdf formats")
  .addOption(
    new commander.Option("-p, --pdf-method <type>", "choose to make pdf from latex or html")
      .choices(["latex", "html"])
      .default("latex")
  )
  .option("-v, --verbose", "enable verbose mode to add more logging")
  .action(async (source, destination, options) => {
    try {
      let debugLog = function () {};

      if (options.verbose) {
        debugLog = console.log.bind(console);
      }

      const sourceExt = path.extname(source);
      const destinationExt = path.extname(destination);

      debugLog("Source:", source);
      debugLog("Destination:", destination);
      debugLog("Options:", options);

      const validSourceExtensions = [".mmd", ".md", ".pdf"];
      if (!validSourceExtensions.includes(sourceExt)) {
        console.log(
          `Invalid source extension, must be one of: ${JSON.stringify(validSourceExtensions)}`
        );
        return process.exit(1);
      }

      const validDestinationExtensions = [".mmd", ".md", ".pdf", ".tex", ".html", ".docx"];
      if (!validDestinationExtensions.includes(destinationExt)) {
        console.log(
          `Invalid destination extension, must be one of: ${JSON.stringify(
            validDestinationExtensions
          )}`
        );
        return process.exit(1);
      }

      if (!fs.existsSync(source)) {
        console.log(`Source file could not be opened: ${source}`);
        return process.exit(1);
      }

      if (fs.lstatSync(source).isDirectory()) {
        console.log(`Source cannot be a directory: ${source}`);
        return process.exit(1);
      }

      switch (true) {
        case sourceExt === ".pdf" && (destinationExt === ".mmd" || destinationExt === ".md"):
          await convert.PDFToMMD(source, destination);
          break;
        case sourceExt === ".pdf" && destinationExt === ".html":
          await convert.PDFToHTML(source, destination);
          break;
        case sourceExt === ".pdf" && destinationExt === ".docx":
          await convert.PDFToDOCX(source, destination);
          break;
        case sourceExt === ".pdf" && destinationExt === ".tex":
          await convert.PDFToTEX(source, destination);
          break;
        case (sourceExt === ".md" || sourceExt === ".mmd") && destinationExt === ".html":
          convert.MarkdownToHTML(source, destination);
          break;
        case (sourceExt === ".md" || sourceExt === ".mmd") && destinationExt === ".docx":
          await convert.MarkdownToDocx(source, destination);
          break;
        case (sourceExt === ".md" || sourceExt === ".mmd") && destinationExt === ".tex":
          await convert.MarkdownToTex(source, destination);
          break;
        case (sourceExt === ".md" || sourceExt === ".mmd") && destinationExt === ".md":
          await convert.MarkdownToMarkdown(source, destination);
          break;
        case (sourceExt === ".md" || sourceExt === ".mmd") && destinationExt === ".mmd":
          await convert.MarkdownToMarkdown(source, destination);
          break;
        case (sourceExt === ".md" || sourceExt === ".mmd") && destinationExt === ".pdf":
          if (options.pdfMethod === "html") {
            await convert.MarkdownToHTMLPDF(source, destination);
            break;
          } else {
            await convert.MarkdownToLatexPDF(source, destination);
            break;
          }
        default:
          console.log(
            `Not implemented yet, please submit a feature request at: ${pkg.repository.issues}`
          );
          return process.exit(1);
      }

      if (destinationExt === ".tex") {
        destination = `${destination}.zip`;
      }

      const processDiff = process.hrtime(processStartTime);
      const processDurationMS = (processDiff[0] * 1e9 + processDiff[1]) * 1e-6;
      console.log(`Converted ${source} to ${destination} in ${Math.round(processDurationMS)}ms`);
    } catch (error) {
      console.log(
        `There was an unexpected error, you can try again or if it continues please submit`
      );
      console.log(`an issue to ${pkg.repository.issues} including the output below:`);
      console.log("-".repeat(80));
      if (error && error.stack) {
        console.log(error.stack);
      } else {
        console.log(error);
      }
      console.log("-".repeat(80));
      return process.exit(1);
    }
  });

program
  .command("serve <source>")
  .description("serve markdown or mathpix markdown rendered at html")
  .option("-p, --port <integer>", "port to serve the rendered html on locally.", 8080)
  .option("-v, --verbose", "enable verbose mode to add more logging")
  .action(async (source, options) => {
    let debugLog = function () {};

    if (options.verbose) {
      debugLog = console.log.bind(console);
    }

    debugLog("Source: ", source);
    debugLog("Options: ", options);

    if (!fs.existsSync(source)) {
      console.log(`Source ${source} does not exist.`);
      return process.exit(1);
    }

    let isDir = false;
    if (fs.lstatSync(source).isDirectory()) {
      isDir = true;
    }

    const app = express();

    if (isDir) {
      app.use(serveIndex(source));
    }

    app.get("*", (req, res) => {
      let sourcePath = source;
      if (isDir) {
        sourcePath = source + req.path;
      }
      const pathExt = path.extname(sourcePath);
      if (pathExt === ".md" || pathExt === ".mmd") {
        let responseBody;
        try {
          responseBody = convert.MarkdownToHTML(sourcePath);
        } catch (err) {
          res.statusCode = 500;
          res.end(err);
          return;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(responseBody);
      } else {
        res.sendFile(sourcePath, { root: "." });
      }
    });
    app.listen(options.port, () => {
      console.log(`Server running at http://127.0.0.1:${options.port}/`);
    });
  });

program
  .command("set-api-key <mathpix_ocr_api_key>")
  .description("save Mathpix OCR API key at ~/.spectra/credentials")
  .option("-v, --verbose", "enable verbose mode to add more logging")
  .action(async (key, options) => {
    let debugLog = function () {};

    if (options.verbose) {
      debugLog = console.log.bind(console);
    }

    try {
      await config.update({ MATHPIX_OCR_API_KEY: key });
    } catch (err) {
      debugLog(err);
      console.log(`Could not write to: ${spectraConfigFile}`);
      return process.exit(1);
    }

    console.log(`Saved api key to: ${spectraConfigFile}`);
  });

program.parse(process.argv);
