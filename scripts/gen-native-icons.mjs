import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const CREAM = "#FCFBF9";
const CLAY = "#B5705A";
const SAGE = "#4A7C6F";

// Two overlapping circles on a 1024 canvas. Overlap becomes a transparent
// lens (foreground) or cream lens (icon) via mutual masking. r=168, centers
// offset ±120 from middle → mark spans ~56% of canvas, within Android's
// adaptive-icon safe zone and leaves generous iOS padding.
const markSvg = (opts = {}) => {
  const { background } = opts;
  const bg = background
    ? `<rect width="1024" height="1024" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <mask id="cutRight">
      <rect width="1024" height="1024" fill="white"/>
      <circle cx="632" cy="512" r="168" fill="black"/>
    </mask>
    <mask id="cutLeft">
      <rect width="1024" height="1024" fill="white"/>
      <circle cx="392" cy="512" r="168" fill="black"/>
    </mask>
  </defs>
  ${bg}
  <circle cx="392" cy="512" r="168" fill="${CLAY}" mask="url(#cutRight)"/>
  <circle cx="632" cy="512" r="168" fill="${SAGE}" mask="url(#cutLeft)"/>
</svg>`;
};

// Splash places the same mark centered on a cream field. Mark sits at
// ~30% of canvas width for a restrained, premium feel on launch.
const splashSvg = (w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) * 0.3 / 576; // 576 = mark width at r=168, d=240
  const r = 168 * scale;
  const d = 240 * scale;
  const leftX = cx - d / 2;
  const rightX = cx + d / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <mask id="cutR"><rect width="${w}" height="${h}" fill="white"/><circle cx="${rightX}" cy="${cy}" r="${r}" fill="black"/></mask>
    <mask id="cutL"><rect width="${w}" height="${h}" fill="white"/><circle cx="${leftX}" cy="${cy}" r="${r}" fill="black"/></mask>
  </defs>
  <rect width="${w}" height="${h}" fill="${CREAM}"/>
  <circle cx="${leftX}" cy="${cy}" r="${r}" fill="${CLAY}" mask="url(#cutR)"/>
  <circle cx="${rightX}" cy="${cy}" r="${r}" fill="${SAGE}" mask="url(#cutL)"/>
</svg>`;
};

async function render(svg, outPath, size) {
  await mkdir(dirname(outPath), { recursive: true });
  let pipeline = sharp(Buffer.from(svg));
  if (size) {
    pipeline = pipeline.resize(size.w, size.h, { fit: "fill" });
  }
  await pipeline.png().toFile(outPath);
  console.log(`  ${outPath}`);
}

const root = "/Users/leobabauta/github/wintheday";

// ---- iOS ----
console.log("iOS:");
const iconSvg = markSvg({ background: CREAM });
const foregroundSvg = markSvg({ background: null });

await render(
  iconSvg,
  `${root}/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`,
  { w: 1024, h: 1024 },
);

for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await render(
    splashSvg(2732, 2732),
    `${root}/ios/App/App/Assets.xcassets/Splash.imageset/${name}`,
  );
}

// ---- Android ----
console.log("Android mipmaps:");
const mipmapDensities = [
  { dir: "mipmap-mdpi", launcher: 48, foreground: 108 },
  { dir: "mipmap-hdpi", launcher: 72, foreground: 162 },
  { dir: "mipmap-xhdpi", launcher: 96, foreground: 216 },
  { dir: "mipmap-xxhdpi", launcher: 144, foreground: 324 },
  { dir: "mipmap-xxxhdpi", launcher: 192, foreground: 432 },
];

for (const { dir, launcher, foreground } of mipmapDensities) {
  const base = `${root}/android/app/src/main/res/${dir}`;
  await render(iconSvg, `${base}/ic_launcher.png`, { w: launcher, h: launcher });
  await render(iconSvg, `${base}/ic_launcher_round.png`, { w: launcher, h: launcher });
  await render(foregroundSvg, `${base}/ic_launcher_foreground.png`, { w: foreground, h: foreground });
}

console.log("Android splash:");
const splashSizes = [
  { dir: "drawable", w: 480, h: 320 },
  { dir: "drawable-port-mdpi", w: 320, h: 480 },
  { dir: "drawable-port-hdpi", w: 480, h: 800 },
  { dir: "drawable-port-xhdpi", w: 720, h: 1280 },
  { dir: "drawable-port-xxhdpi", w: 960, h: 1600 },
  { dir: "drawable-port-xxxhdpi", w: 1280, h: 1920 },
  { dir: "drawable-land-mdpi", w: 480, h: 320 },
  { dir: "drawable-land-hdpi", w: 800, h: 480 },
  { dir: "drawable-land-xhdpi", w: 1280, h: 720 },
  { dir: "drawable-land-xxhdpi", w: 1600, h: 960 },
  { dir: "drawable-land-xxxhdpi", w: 1920, h: 1280 },
];

for (const { dir, w, h } of splashSizes) {
  await render(
    splashSvg(w, h),
    `${root}/android/app/src/main/res/${dir}/splash.png`,
  );
}

// Save the master SVG for future reference / tweaks.
await writeFile(`${root}/scripts/mark.svg`, iconSvg);

console.log("\nDone.");
