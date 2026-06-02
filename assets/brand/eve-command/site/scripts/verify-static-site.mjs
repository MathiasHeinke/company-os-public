import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(rootDir, "dist");
const requiredPages = [
  "index.html",
  "info.html",
  "impressum.html",
  "datenschutz.html",
  "agb.html"
];
const assetPattern = new RegExp("(?:src|href)=[\"']\\\\./([^\"']+)[\"']", "g");
const htmlExt = new Set([".html"]);
const maxAssetBytes = 50 * 1024 * 1024;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

if (!existsSync(outputDir)) {
  throw new Error("Run `npm run build` before `npm run verify`.");
}

const failures = [];
for (const page of requiredPages) {
  const pagePath = join(outputDir, page);
  if (!existsSync(pagePath)) {
    failures.push(`Missing required page: ${page}`);
    continue;
  }

  const html = readFileSync(pagePath, "utf8");
  for (const match of html.matchAll(assetPattern)) {
    const referenced = join(outputDir, match[1]);
    if (!existsSync(referenced)) {
      failures.push(`${page} references missing asset: ${match[1]}`);
    }
  }
}

for (const file of walk(outputDir)) {
  const size = statSync(file).size;
  if (size > maxAssetBytes) {
    failures.push(`Asset exceeds ${maxAssetBytes} bytes: ${file}`);
  }
  if (htmlExt.has(extname(file))) {
    const html = readFileSync(file, "utf8");
    if (!new RegExp("<title>.+</title>").test(html)) {
      failures.push(`HTML page has no title: ${file}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Verified ${requiredPages.length} required pages and ${walk(outputDir).length} static files.`);
