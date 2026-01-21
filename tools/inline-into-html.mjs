import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const htmlPath = path.resolve("index.html");
const jsPath = path.resolve("dist", "bundle.js");
const outPath = path.resolve("dist", "index.html");

const [html, js] = await Promise.all([
  readFile(htmlPath, "utf8"),
  readFile(jsPath, "utf8")
]);

const marker = '<script type="module" src="dist/bundle.js"></script>';
const inlineScript = `<script>${js}</script>`;
const output = html.includes(marker) ? html.replace(marker, inlineScript) : html;

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, output);
