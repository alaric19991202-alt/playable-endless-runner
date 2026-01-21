import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const srcDir = path.resolve("assets", "Assets");
const outDir = path.resolve("dist", "assets", "Assets");

await mkdir(outDir, { recursive: true });
await cp(srcDir, outDir, { recursive: true });
