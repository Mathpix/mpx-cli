const dotenv = require("dotenv");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

if (fs.existsSync(path.join(os.homedir(), ".spectra", "credentials"))) {
  fs.moveSync(spectraCredentialsFile, spectraConfigFile);
}

const spectraConfigFile = path.join(os.homedir(), ".spectra", "config");

function escapeNewlines(str) {
  return str.replace(/\n/g, "\\n");
}

function format(key, value) {
  return `${key}=${escapeNewlines(value)}`;
}

async function update(env) {
  try {
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

module.exports = {
  update: update,
};
