const pkg = require("../package.json");
const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const Eleventy = require("@11ty/eleventy");
const { MathpixMarkdownModel } = require.main.require("mathpix-markdown-it");
const { Command } = require("commander");
const createTree = require("./utils/directory-tree");

// Needed so dependencies from config file work
global.__spectraBase = __dirname + "/..";


const DEV_MODE = process.env.ELEVENTY_ENV === "dev";

require("please-upgrade-node")(pkg, {
  message: function (requiredVersion) {
    return chalk.red(
      `Spectra requires Node ${requiredVersion}. You’ll need to upgrade to use it!`
    );
  },
});

const mathpixStyles = MathpixMarkdownModel.getMathpixStyleOnly();
fs.writeFileSync(
  __dirname + "/../assets/css/mathpix_styles.css",
  mathpixStyles
);

const program = new Command();
program
  .name("spectra")
  .version(pkg.version)
  .description(pkg.description)
  .usage("[options] [input] [output]")
  .option(
    "-i, --input [directory-or-file]",
    "input directory of markdown to convert into html.",
    "."
  )
  .option(
    "-o, --output [directory-or-file]",
    "output directory to save the converted html.",
    "./dist"
  )
  .option(
    "-w, --watch",
    "watch the directory of markdown for changes and convert if changed."
  )
  .option(
    "-s, --serve",
    "serve the converted html on a local port with reloading"
  )
  .option("-v, --verbose", "enable verbose mode to add more logging")
  .action((opts) => {
    const inputDirectory = opts.args.length >= 1 ? opts.args[0] : opts.input;
    const outputDirectory = opts.args.length >= 2 ? opts.args[1] : opts.output;
    const srcDir = path.join(__dirname, "..", ".spectra");
    const destDir = path.join(inputDirectory, ".spectra");
    const configFile = path.join(inputDirectory, ".spectra", "config.js");
    const indexFile = path.join(inputDirectory, "index.md");
    const indexFileMMD = path.join(inputDirectory, "index.mmd");

    if (!fs.existsSync(configFile) || DEV_MODE) {
      console.log(
        `Created new .spectra directory at ${destDir} containing config and layouts`
      );
      fs.copySync(srcDir, destDir);
    }

    if (!fs.existsSync(indexFile) && !fs.existsSync(indexFileMMD)) {
      fs.writeFileSync(indexFile, "# Page Index");
      console.log(`Created new file at ${indexFile} for listing all pages`);
    }

    if (!DEV_MODE) {
      fs.copySync(
        path.join(__dirname, "..", "assets", "css"),
        path.join(outputDirectory, "assets/css")
      );
      fs.copySync(
        path.join(__dirname, "..", "assets", "scripts"),
        path.join(outputDirectory, "assets/scripts")
      );
    }
    console.log(`Converting ${inputDirectory} to ${outputDirectory}`);

    const treeDirectory = createTree(inputDirectory, true);
    fs.writeFileSync(
      path.join(destDir, "navigation.json"),
      JSON.stringify(treeDirectory)
    );

    let elev = new Eleventy(inputDirectory, outputDirectory, {
      quietMode: !opts.verbose,
    });

    elev.setIncrementalBuild(true);
    elev.setConfigPathOverride(configFile);

    elev.init().then(function () {
      if (opts.serve) {
        elev.watch().then(function () {
          elev.serve(opts.serve === true ? "8080" : opts.serve);
        });
      } else if (opts.watch) {
        elev.watch();
      } else {
        elev.write();
      }
    });
  });

program.parse(process.argv);
