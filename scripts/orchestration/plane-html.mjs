import { createHash } from "node:crypto";

const NAMED_ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", "\""],
  ["apos", "'"],
  ["nbsp", " "],
]);

export function decodeHtmlEntities(text) {
  return String(text || "").replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, entity) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES.get(entity) ?? match;
  });
}

export function stripHtml(html) {
  if (!html) return "";
  const withCodeBlocks = String(html).replace(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_match, code) => {
    const text = normalizeDescriptionText(decodeHtmlEntities(code));
    if (!text) return "\n";
    if (/```/.test(text)) return `\n${text}\n`;
    if (looksLikeWorkerContract(text)) return `\n\`\`\`yaml\n${text}\n\`\`\`\n`;
    return `\n${text}\n`;
  });
  return normalizeDescriptionText(
    decodeHtmlEntities(
      withCodeBlocks
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/pre>/gi, "\n")
        .replace(/<\/?[^>]+>/g, "\n"),
    ),
  );
}

function looksLikeWorkerContract(text) {
  const keys = new Set();
  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
    if (match) keys.add(match[1].toLowerCase());
  }
  return keys.has("role")
    && keys.has("agent")
    && keys.has("mode")
    && keys.has("workspace")
    && keys.has("dispatch")
    && keys.has("human_gate");
}

export function normalizeDescriptionText(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function canonicalDescriptionText(itemOrText) {
  if (itemOrText && typeof itemOrText === "object") {
    const html = itemOrText.description_html || "";
    const stripped = itemOrText.description_stripped || itemOrText.description || "";
    return html ? stripHtml(html) : normalizeDescriptionText(decodeHtmlEntities(stripped));
  }
  return stripHtml(String(itemOrText || ""));
}

export function canonicalDescriptionHash(itemOrText) {
  return createHash("sha256").update(canonicalDescriptionText(itemOrText), "utf8").digest("hex");
}

export function legacyRawDescriptionHash(itemOrText) {
  const text = itemOrText && typeof itemOrText === "object"
    ? (itemOrText.description_html || itemOrText.description_stripped || itemOrText.description || "")
    : String(itemOrText || "");
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function descriptionHashCandidates(itemOrText) {
  return Array.from(new Set([
    canonicalDescriptionHash(itemOrText),
    legacyRawDescriptionHash(itemOrText),
  ]));
}

export function parseYamlScalar(text) {
  const out = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const m = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export function extractLockDescriptionHash(text) {
  const match = String(text || "").match(/^\s*description:\s*([a-f0-9]{64})\s*$/im);
  return match ? match[1] : null;
}

export function htmlEscape(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
