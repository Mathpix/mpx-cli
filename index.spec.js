const path = require("path");
const exec = require("child_process").exec;
const uuid = require("uuid");
const del = require("del");
const fs = require("fs-extra");

const testInput = "test/input";
const testOutput =  path.join("test", uuid.v4());

describe("converting markdown to html", () => {
  test("should create .spectra directory in input directory if not found", async () => {
    let result = await cli([testInput, testOutput], ".");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Created new .spectra directory at");
    del.sync(testOutput);
  });

  test("should not create .spectra directory in input directory if found", async () => {
    let result = await cli([testInput, testOutput], ".");
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("Created new .spectra directory at");
    del.sync(testOutput);
    del.sync(path.join(testInput, ".spectra"));
  });

  test("should create correct html files", async () => {
    let result = await cli([testInput, testOutput], ".");
    // console.log(result)
    expect(result.code).toBe(0);
    expect(fs.existsSync(`${testOutput}/index.html`)).toBe(true);
    expect(fs.existsSync(`${testOutput}/readme/index.html`)).toBe(true);
    expect(result.stdout).toContain("Wrote 2 files");
    del.sync(testOutput);
    del.sync(path.join(testInput, ".spectra"));
  });

  test("should copy asset files", async () => {
    let result = await cli([testInput, testOutput], ".");
    // console.log(result)
    expect(result.code).toBe(0);
    expect(fs.existsSync(`${testOutput}/spectra.png`)).toBe(true);
    expect(result.stdout).toContain("Copied 1 file");
    del.sync(testOutput);
    del.sync(path.join(testInput, ".spectra"));
  });

});

function cli(args, cwd) {
  return new Promise(resolve => {
    exec(
      `node ${path.resolve("./bin/cli.js")} ${args.join(" ")}`,
      { cwd },
      (error, stdout, stderr) => {
        resolve({
          code: error && error.code ? error.code : 0,
          error,
          stdout,
          stderr
        });
      }
    );
  });
}
