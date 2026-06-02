import fs from "node:fs";

export const REGISTRY_VERSION = "plane-template-registry/v0";
export const TEMPLATE_SURFACES = new Set(["work_item", "project", "page"]);

export function loadTemplateRegistry(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export function collectPlaceholders(markdown) {
  const placeholders = new Set();
  const pattern = /\$\{([A-Z0-9_]+)\}/g;
  let match;
  while ((match = pattern.exec(markdown || ""))) {
    placeholders.add(match[1]);
  }
  return [...placeholders].sort();
}

export function validateTemplateRegistry(registry) {
  const errors = [];
  if (!registry || typeof registry !== "object") {
    return { ok: false, errors: ["registry must be an object"] };
  }
  if (registry.version !== REGISTRY_VERSION) {
    errors.push(`version must be ${REGISTRY_VERSION}`);
  }
  if (!Array.isArray(registry.templates) || registry.templates.length === 0) {
    errors.push("templates must be a non-empty array");
  }

  const ids = new Set();
  for (const [index, template] of (registry.templates || []).entries()) {
    const prefix = `templates[${index}]`;
    if (!template || typeof template !== "object") {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!template.id || typeof template.id !== "string") {
      errors.push(`${prefix}.id is required`);
    } else if (ids.has(template.id)) {
      errors.push(`${prefix}.id duplicate: ${template.id}`);
    } else {
      ids.add(template.id);
    }
    if (!TEMPLATE_SURFACES.has(template.plane_surface)) {
      errors.push(`${prefix}.plane_surface must be one of ${[...TEMPLATE_SURFACES].join(", ")}`);
    }
    for (const key of ["name", "description", "body_markdown"]) {
      if (!template[key] || typeof template[key] !== "string") {
        errors.push(`${prefix}.${key} is required`);
      }
    }
    if (template.variables && typeof template.variables !== "object") {
      errors.push(`${prefix}.variables must be an object when present`);
    }
    const placeholders = collectPlaceholders(template.body_markdown);
    const variables = template.variables || {};
    for (const placeholder of placeholders) {
      if (!Object.hasOwn(variables, placeholder)) {
        errors.push(`${prefix}.variables missing default for ${placeholder}`);
      }
    }
    if (Array.isArray(template.default_labels)) {
      for (const label of template.default_labels) {
        for (const placeholder of collectPlaceholders(label)) {
          if (!Object.hasOwn(variables, placeholder)) {
            errors.push(`${prefix}.variables missing default for label placeholder ${placeholder}`);
          }
        }
      }
    } else {
      errors.push(`${prefix}.default_labels must be an array`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function findTemplateById(registry, id) {
  return (registry.templates || []).find((template) => template.id === id) || null;
}

export function listTemplates(registry, { surface = "" } = {}) {
  return (registry.templates || [])
    .filter((template) => !surface || template.plane_surface === surface)
    .map((template) => ({
      id: template.id,
      plane_surface: template.plane_surface,
      name: template.name,
      description: template.description,
      default_labels: template.default_labels || [],
      default_priority: template.default_priority || "",
    }));
}

export function parseVarAssignment(value) {
  const index = String(value || "").indexOf("=");
  if (index <= 0) throw new Error(`Invalid --var assignment: ${value}`);
  return [value.slice(0, index), value.slice(index + 1)];
}

export function renderTemplate(template, variables = {}) {
  if (!template) throw new Error("template is required");
  const merged = { ...(template.variables || {}), ...variables };
  const missing = [];
  const body = String(template.body_markdown || "").replace(/\$\{([A-Z0-9_]+)\}/g, (_, key) => {
    if (!Object.hasOwn(merged, key)) {
      missing.push(key);
      return "";
    }
    return String(merged[key]);
  });
  if (missing.length) {
    throw new Error(`Missing template variables: ${[...new Set(missing)].sort().join(", ")}`);
  }
  const labels = (template.default_labels || []).map((label) => String(label).replace(/\$\{([A-Z0-9_]+)\}/g, (_, key) => {
    if (!Object.hasOwn(merged, key)) {
      missing.push(key);
      return "";
    }
    return String(merged[key]);
  }));
  if (missing.length) {
    throw new Error(`Missing template variables: ${[...new Set(missing)].sort().join(", ")}`);
  }
  return {
    id: template.id,
    plane_surface: template.plane_surface,
    name: template.name,
    description: template.description,
    default_labels: labels,
    default_priority: template.default_priority || "",
    body_markdown: body,
  };
}
