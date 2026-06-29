import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.resolve(root, "..", "LogoFinal.png");

const densities = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const PAD_RATIO = 0.72;

if (!fs.existsSync(src)) {
  console.error("LogoFinal.png not found at", src);
  process.exit(1);
}

const resDir = path.resolve(root, "android", "app", "src", "main", "res");

async function genPadded(name, canvasSize, dir) {
  const out = path.join(dir, name);
  const meta = await sharp(src).metadata();
  const maxDim = Math.max(meta.width, meta.height);

  // Step 1: pad to square (transparent), then resize to logoSize
  const logoSize = Math.round(canvasSize * PAD_RATIO);
  const paddedSize = Math.round(maxDim * (logoSize / maxDim));

  const padded = await sharp(src)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Step 2: place centered on final canvas
  const offset = Math.round((canvasSize - logoSize) / 2);
  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: padded, top: offset, left: offset }])
    .png()
    .toFile(out);

  console.log(`  ${path.basename(out)} (${canvasSize}x${canvasSize})`);
}

(async () => {
  for (const [density, size] of Object.entries(densities)) {
    const dir = path.join(resDir, density);
    if (!fs.existsSync(dir)) continue;
    console.log(`\n${density}:`);
    await genPadded("ic_launcher.png", size, dir);
    await genPadded("ic_launcher_round.png", size, dir);
    await genPadded("ic_launcher_foreground.png", size, dir);
  }
  console.log("\nDone!");
})();
