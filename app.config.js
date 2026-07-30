const fs = require("fs");
const path = require("path");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");

  return content.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return acc;

    const index = trimmed.indexOf("=");

    if (index === -1) return acc;

    acc[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();

    return acc;
  }, {});
}

module.exports = ({ config }) => {
  const env = parseEnvFile(path.join(__dirname, ".env"));

  return {
    ...config,
    android: {
      ...config.android,
      package: "com.sainimmakayala.picknbook",
    },
    extra: {
      ...config.extra,
      ...env,
    },
  };
};