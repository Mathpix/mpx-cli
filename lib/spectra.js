const pkg = require("../package.json");
const path = require("path");
const fs = require("fs-extra");
const Eleventy = require("@11ty/eleventy");
const { Command } = require("commander");


const program = new Command();

program
    .name("spectra")
    .version(pkg.version)
    .description(pkg.description)
    .usage("[options] [input] [output]")
    .option("-i, --input [directory-or-file]", "input directory of markdown to convert into html.", ".")
    .option("-o, --output [directory-or-file]", "output directory to save the converted html.", "./dist")
    .option("-w, --watch", "watch the directory of markdown for changes and convert if changed.")
    .option("-s, --serve", "serve the converted html on a local port with reloading")
    .option("-v, --verbose", "enable verbose mode to add more logging")
    .action((opts) => {
        const inputDirectory = opts.args.length >= 1 ? opts.args[0] : opts.input;
        const outputDirectory = opts.args.length >= 2 ? opts.args[1] : opts.output;

        console.log(`Converting ${inputDirectory} to ${outputDirectory}`)

        const srcDir = path.join(__dirname, "..", ".spectra");
        const destDir = path.join(inputDirectory, ".spectra");
        const configFile = path.join(inputDirectory, ".spectra", "config.js");

        if (!fs.existsSync(configFile)) {
            fs.copySync(srcDir, destDir);
            console.log(`Created new .spectra directory at ${destDir} containing config and layouts`);
        }

        let elev = new Eleventy(inputDirectory, outputDirectory, {
            quietMode: !opts.verbose,
        });

        elev.setIncrementalBuild(true);
        elev.setConfigPathOverride(configFile);

        elev
            .init()
            .then(function () {
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
