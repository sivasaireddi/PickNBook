const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "assets", "App-Icon-Square.png");
const STANDARD = path.join(ROOT, "assets", "launcher-icon.png");
const FOREGROUND = path.join(ROOT, "assets", "android-adaptive-foreground.png");
const PREVIEW = path.join(ROOT, "docs", "launcher-icon-mask-preview.png");
const SIZE = 1024;
const LOGO_HEIGHT = 540;
const BRAND_RED = [255, 0, 0, 255];

const source = PNG.sync.read(fs.readFileSync(SOURCE));

// The original is pure red plus the exact antialiased white P. Restricting the
// scan to the central region excludes the rounded tile's transparent corners.
let minX = source.width;
let minY = source.height;
let maxX = -1;
let maxY = -1;
for (let y = 100; y < source.height - 100; y += 1) {
  for (let x = 100; x < source.width - 100; x += 1) {
    const i = (y * source.width + x) * 4;
    if (source.data[i + 3] > 200 && source.data[i + 1] > 0 && source.data[i + 2] > 0) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}
if (maxX < minX || maxY < minY) throw new Error("Could not locate the existing P artwork.");

const sourceLogoWidth = maxX - minX + 1;
const sourceLogoHeight = maxY - minY + 1;
const logoWidth = Math.round((sourceLogoWidth / sourceLogoHeight) * LOGO_HEIGHT);
const logoX = Math.round((SIZE - logoWidth) / 2);
const logoY = Math.round((SIZE - LOGO_HEIGHT) / 2);

function createCanvas(fill = [0, 0, 0, 0]) {
  const png = new PNG({ width: SIZE, height: SIZE });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = fill[0];
    png.data[i + 1] = fill[1];
    png.data[i + 2] = fill[2];
    png.data[i + 3] = fill[3];
  }
  return png;
}

function sampleLogoAlpha(x, y) {
  const sourceX = minX + ((x + 0.5) * sourceLogoWidth) / logoWidth - 0.5;
  const sourceY = minY + ((y + 0.5) * sourceLogoHeight) / LOGO_HEIGHT - 0.5;
  const x0 = Math.max(minX, Math.floor(sourceX));
  const y0 = Math.max(minY, Math.floor(sourceY));
  const x1 = Math.min(maxX, x0 + 1);
  const y1 = Math.min(maxY, y0 + 1);
  const fx = sourceX - x0;
  const fy = sourceY - y0;
  const alphaAt = (sx, sy) => {
    const i = (sy * source.width + sx) * 4;
    // Green/blue coverage is the original white-on-red edge antialiasing.
    return (source.data[i + 1] * source.data[i + 3]) / 255;
  };
  const top = alphaAt(x0, y0) * (1 - fx) + alphaAt(x1, y0) * fx;
  const bottom = alphaAt(x0, y1) * (1 - fx) + alphaAt(x1, y1) * fx;
  return Math.max(0, Math.min(255, Math.round(top * (1 - fy) + bottom * fy)));
}

function drawExactP(target, redBackground) {
  for (let y = 0; y < LOGO_HEIGHT; y += 1) {
    for (let x = 0; x < logoWidth; x += 1) {
      const alpha = sampleLogoAlpha(x, y);
      if (!alpha) continue;
      const i = ((logoY + y) * SIZE + logoX + x) * 4;
      if (redBackground) {
        const coverage = alpha / 255;
        target.data[i] = 255;
        target.data[i + 1] = Math.round(255 * coverage);
        target.data[i + 2] = Math.round(255 * coverage);
        target.data[i + 3] = 255;
      } else {
        target.data[i] = 255;
        target.data[i + 1] = 255;
        target.data[i + 2] = 255;
        target.data[i + 3] = alpha;
      }
    }
  }
}

const standard = createCanvas(BRAND_RED);
drawExactP(standard, true);
const foreground = createCanvas();
drawExactP(foreground, false);

fs.writeFileSync(STANDARD, PNG.sync.write(standard));
fs.writeFileSync(FOREGROUND, PNG.sync.write(foreground));

function sampleScaled(png, x, y, width, height) {
  const sx = Math.min(png.width - 1, Math.max(0, Math.floor((x / width) * png.width)));
  const sy = Math.min(png.height - 1, Math.max(0, Math.floor((y / height) * png.height)));
  const i = (sy * png.width + sx) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

function insideMask(kind, x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  if (kind === "circle") return dx * dx + dy * dy <= (size * 0.47) ** 2;
  if (kind === "rounded") {
    const radius = size * 0.22;
    const qx = Math.max(dx - (size / 2 - radius), 0);
    const qy = Math.max(dy - (size / 2 - radius), 0);
    return qx * qx + qy * qy <= radius * radius;
  }
  return (dx / (size * 0.48)) ** 4 + (dy / (size * 0.48)) ** 4 <= 1;
}

const panel = 320;
const gap = 32;
const margin = 32;
const preview = new PNG({ width: margin * 2 + panel * 3 + gap * 2, height: margin * 2 + panel * 2 + gap });
for (let i = 0; i < preview.data.length; i += 4) {
  preview.data[i] = 232;
  preview.data[i + 1] = 235;
  preview.data[i + 2] = 240;
  preview.data[i + 3] = 255;
}

const masks = ["circle", "rounded", "squircle"];
const before = source;
for (let row = 0; row < 2; row += 1) {
  const icon = row === 0 ? before : standard;
  for (let col = 0; col < masks.length; col += 1) {
    const ox = margin + col * (panel + gap);
    const oy = margin + row * (panel + gap);
    for (let y = 0; y < panel; y += 1) {
      for (let x = 0; x < panel; x += 1) {
        if (!insideMask(masks[col], x, y, panel)) continue;
        const color = sampleScaled(icon, x, y, panel, panel);
        const alpha = color[3] / 255;
        const i = ((oy + y) * preview.width + ox + x) * 4;
        preview.data[i] = Math.round(color[0] * alpha + preview.data[i] * (1 - alpha));
        preview.data[i + 1] = Math.round(color[1] * alpha + preview.data[i + 1] * (1 - alpha));
        preview.data[i + 2] = Math.round(color[2] * alpha + preview.data[i + 2] * (1 - alpha));
      }
    }
  }
}
fs.writeFileSync(PREVIEW, PNG.sync.write(preview));

console.log(JSON.stringify({
  sourceLogoBounds: { minX, minY, maxX, maxY, width: sourceLogoWidth, height: sourceLogoHeight },
  outputLogoBounds: { x: logoX, y: logoY, width: logoWidth, height: LOGO_HEIGHT },
  logoHeightPercent: (LOGO_HEIGHT / SIZE) * 100,
  files: { STANDARD, FOREGROUND, PREVIEW },
}, null, 2));
