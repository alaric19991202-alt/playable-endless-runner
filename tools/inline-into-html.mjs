import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const htmlPath = path.resolve("index.html");
const jsPath = path.resolve("dist", "bundle.js");
const outPath = path.resolve("dist", "index.html");
const assetsPath = path.resolve("src", "game", "assets.ts");
const fontPath = path.resolve("assets", "Assets", "Font.ttf");

const [html, js, assetsSource, fontBuffer] = await Promise.all([
  readFile(htmlPath, "utf8"),
  readFile(jsPath, "utf8"),
  readFile(assetsPath, "utf8"),
  readFile(fontPath)
]);

const assetBlock = assetsSource.match(/export const assetUrls = \{([\s\S]*?)\} as const;/);
if (!assetBlock) {
  throw new Error("Unable to locate assetUrls in src/game/assets.ts");
}

const assetEntries = [...assetBlock[1].matchAll(/^\s*([A-Za-z0-9_]+):\s*"([^"]+)"/gm)];
if (assetEntries.length === 0) {
  throw new Error("No asset entries found to embed.");
}

const assetMap = {};
for (const match of assetEntries) {
  const key = match[1];
  const assetPath = match[2];
  const buffer = await readFile(path.resolve(assetPath));
  const ext = path.extname(assetPath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : "application/octet-stream";
  assetMap[key] = `data:${mime};base64,${buffer.toString("base64")}`;
}

const fontDataUri = `data:font/ttf;base64,${fontBuffer.toString("base64")}`;

const preloadRegex = /<link[^>]+Font\.ttf[^>]*>\s*/i;
const htmlWithoutPreload = html.replace(preloadRegex, "");
const markerRegex = /<script[^>]+src="dist\/bundle\.js"[^>]*><\/script>/i;
const embeddedScript = `<script>window.__EMBEDDED_ASSETS__=${JSON.stringify(
  assetMap
)};window.__EMBEDDED_FONT__=${JSON.stringify(fontDataUri)};</script>`;
const safeJs = js.replace(/<\/script>/gi, "<\\/script>");
const inlineScript = `<script>${safeJs}</script>`;
const output = markerRegex.test(htmlWithoutPreload)
  ? htmlWithoutPreload.replace(markerRegex, () => `${embeddedScript}${inlineScript}`)
  : htmlWithoutPreload.replace("</body>", `${embeddedScript}${inlineScript}</body>`);

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, output);
