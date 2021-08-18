const pkg = require("../package.json");
const dotenv = require("dotenv");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const fetch = require("node-fetch");
const inquirer = require("inquirer");

const spectraConfigFile = path.join(os.homedir(), ".spectra", "config");

if (fs.existsSync(path.join(os.homedir(), ".spectra", "credentials"))) {
  fs.moveSync(spectraConfigFile, spectraConfigFile);
}

function escapeNewlines(str) {
  return str.replace(/\n/g, "\\n");
}

function format(key, value) {
  return `${key}=${escapeNewlines(value)}`;
}

async function update(env) {
  try {
    if (!fs.existsSync(spectraConfigFile)) {
      fs.outputFileSync(spectraConfigFile, "");
    }
    const existing = dotenv.parse(await fs.readFile(spectraConfigFile, "utf-8"));
    env = Object.assign(existing, env);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  const contents = Object.keys(env)
    .map((key) => format(key, env[key]))
    .join("\n");
  await fs.writeFile(spectraConfigFile, contents);

  Object.assign(process.env, env);
  return env;
}

async function remove(key) {
  try {
    if (!fs.existsSync(spectraConfigFile)) {
      fs.outputFileSync(spectraConfigFile, "");
    }
    const existing = dotenv.parse(await fs.readFile(spectraConfigFile, "utf-8"));
    delete existing[key];
    const contents = Object.keys(existing)
      .map((key) => format(key, existing[key]))
      .join("\n");
    await fs.writeFile(spectraConfigFile, contents);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}

async function checkEnvironmentVariables() {
  if (!("MATHPIX_OCR_API_KEY" in process.env) && !("MATHPIX_SNIP_AUTH_TOKEN" in process.env)) {
    console.log(`You must connect spectra cli to your Mathpix Snip or OCR API.`);
    console.log(
      `To connect to your Mathpix Snip account sign up at https://accounts.mathpix.com then run spectra login.`
    );
    console.log(
      `To connect to your Mathpix OCR API create an API key at https://accounts.mathpix.com/ocr-api then`
    );
    console.log(
      `set the API KEY to the environment variable "MATHPIX_OCR_API_KEY" or run spectra set-api-key YOUR_API_KEY`
    );
    return process.exit(1);
  }

  if ("MATHPIX_OCR_API_KEY" in process.env && !("MATHPIX_OCR_API_PRICING_AGREE" in process.env)) {
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
    await update({ MATHPIX_OCR_API_PRICING_AGREE: "true" });
  }

  if ("MATHPIX_SNIP_AUTH_TOKEN" in process.env && !("MATHPIX_SNIP_PRICING_AGREE" in process.env)) {
    const answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "pricing",
        message: "Do you agree to use Mathpix Snip account for spectra cli usage?",
      },
    ]);
    if (!answers.pricing) {
      console.log(`You must agree to use your Mathpix Snip Account for spectra usage.`);
      return process.exit(1);
    }
    await update({ MATHPIX_SNIP_PRICING_AGREE: "true" });
  }
}

async function loginToMathpixSnipAccount() {
  if (!("MATHPIX_SNIP_PRICING_AGREE" in process.env)) {
    const answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "pricing",
        message: "Do you agree to use Mathpix Snip account for spectra cli usage?",
      },
    ]);
    if (!answers.pricing) {
      console.log(`You must agree to use your Mathpix Snip Account for spectra usage.`);
      return process.exit(1);
    }
    await update({ MATHPIX_SNIP_PRICING_AGREE: "true" });
  }

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "email",
      message: "Mathpix Snip Account Email:",
    },
    {
      type: "password",
      name: "password",
      message: "Mathpix Snip Account Password:",
    },
  ]);

  const url = "https://api.mathpix.com/v1/user/login";

  let options = {
    method: "POST",
    headers: {
      "user-agent": "Spectra cli",
    },
    body: JSON.stringify({
      email: answers.email,
      password: answers.password,
    }),
  };

  const res = await fetch(url, options);
  if (res.status !== 200) {
    if (res.headers.get("content-type").startsWith("application/json")) {
      const jsonResponseBody = await res.json();
      if (jsonResponseBody["errors"] && jsonResponseBody["errors"].length) {
        jsonResponseBody["errors"].forEach((error) => {
          if (error["message"]) {
            console.log(error.message);
          } else {
            console.log(
              `Unexpected error, please submit a bug report at: ${pkg.repository.issues}`
            );
            return process.exit(1);
          }
        });
        return process.exit(1);
      } else {
        console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
        return process.exit(1);
      }
    } else {
      console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
      return process.exit(1);
    }
  }

  const jsonResponseBody = await res.json();
  if (!jsonResponseBody["token"]) {
    console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
    return process.exit(1);
  }

  try {
    await update({ MATHPIX_SNIP_AUTH_TOKEN: jsonResponseBody["token"] });
  } catch (err) {
    console.log(`Could not write to: ${spectraConfigFile}`);
    return process.exit(1);
  }

  console.log(`Saved Mathpix Snip authorization token to: ${spectraConfigFile}`);
  return ;
}

async function logoutOfMathpixSnipAccount() {
  if (!("MATHPIX_SNIP_AUTH_TOKEN" in process.env)) {
    console.log(`You are not logged into your Mathpix Snip account.`);
    return process.exit(1);
  }

  const url = "https://api.mathpix.com/v1/user/logout";

  let options = {
    method: "POST",
    headers: {
      "user-agent": "Spectra cli",
      authorization: "Bearer " + process.env["MATHPIX_SNIP_AUTH_TOKEN"],
    },
  };

  const res = await fetch(url, options);
  if (res.status !== 200) {
    if (res.headers.get("content-type").startsWith("application/json")) {
      const jsonResponseBody = await res.json();
      if (jsonResponseBody["errors"] && jsonResponseBody["errors"].length) {
        for (let i = 0; i < jsonResponseBody["errors"].length; i++) {
          const error = jsonResponseBody["errors"][i];
          if (error["id"] === "invalid_access_token") {
            try {
              await remove("MATHPIX_SNIP_AUTH_TOKEN");
            } catch (err) {
              console.log(`Could not write to: ${spectraConfigFile}`);
              return process.exit(1);
            }
            console.log(`Removed Mathpix Snip authorization token from: ${spectraConfigFile}`);
          } else {
            console.log(
              `Unexpected error, please submit a bug report at: ${pkg.repository.issues}`
            );
            return process.exit(1);
          }
        }
        return process.exit(1);
      } else {
        console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
        return process.exit(1);
      }
    } else {
      console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
      return process.exit(1);
    }
  }

  const jsonResponseBody = await res.json();
  if (!jsonResponseBody["message"] === "user_logged_out") {
    console.log(`Unexpected error, please submit a bug report at: ${pkg.repository.issues}`);
    return process.exit(1);
  }

  try {
    await remove("MATHPIX_SNIP_AUTH_TOKEN");
  } catch (err) {
    console.log(`Could not write to: ${spectraConfigFile}`);
    return process.exit(1);
  }

  console.log(`Logged out and removed Mathpix Snip authorization token from: ${spectraConfigFile}`);
}

module.exports = {
  update,
  remove,
  loginToMathpixSnipAccount,
  logoutOfMathpixSnipAccount,
  checkEnvironmentVariables,
};
