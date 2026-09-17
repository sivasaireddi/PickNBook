const fs = require("fs");
const path = require("path");

const assetsDir = path.join(__dirname, "assets");
const srcJpeg = path.join(assetsDir, "icon.jpeg");

if (!fs.existsSync(srcJpeg)) {
  console.error("Error: assets/icon.jpeg does not exist!");
  process.exit(1);
}

const targetIcon = path.join(assetsDir, "icon.png");
const targetSplash = path.join(assetsDir, "splash-icon.png");
const targetForeground = path.join(assetsDir, "android-icon-foreground.png");

fs.copyFileSync(srcJpeg, targetIcon);
fs.copyFileSync(srcJpeg, targetSplash);
fs.copyFileSync(srcJpeg, targetForeground);

console.log("Successfully created:");
console.log("- assets/icon.png");
console.log("- assets/splash-icon.png");
console.log("- assets/android-icon-foreground.png");
