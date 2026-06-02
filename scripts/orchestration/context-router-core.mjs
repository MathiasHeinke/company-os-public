// Context Router — pure core (no I/O).
//
// T13 Knowledge & Context Topology slice. Sibling to the Inference Router: where
// the inference router picks the MODEL at spawn, the context router picks the
// DOMAIN(s) + the bounded context slice at session start. Deterministic scoring
// here; an LLM classifier may refine at runtime, but the slice selection,
// scope-honoring and disambiguation logic live in this testable core.
//
// See docs/orchestration/knowledge-context-topology.md.

export const CONTEXT_ROUTER_VERSION = "context-router/v0";

const WORD = /[a-z0-9äöüß]+/gi;

function tokenize(text) {
  return String(text || "").toLowerCase().match(WORD) || [];
}

// Score an opener against a domain registry entry.
// registryEntry: { id, label, keywords: [...], status }
// Returns a non-negative integer score (keyword/label hits).
export function scoreDomain(openerTokens, registryEntry) {
  const hay = new Set(openerTokens);
  let score = 0;
  const labelTokens = tokenize(registryEntry.label);
  for (const lt of labelTokens) if (hay.has(lt)) score += 2; // label match weighted
  for (const kw of registryEntry.keywords || []) {
    for (const kt of tokenize(kw)) if (hay.has(kt)) score += 1;
  }
  return score;
}

// Classify which domain(s) an opener belongs to.
// Returns { domains: [ids ranked], top, confidence (0..1), ambiguous }.
export function classifyDomains(opener, registry = [], { minScore = 1 } = {}) {
  const tokens = tokenize(opener);
  const scored = registry
    .filter((d) => (d.status ? d.status === "active" : true))
    .map((d) => ({ id: d.id, score: scoreDomain(tokens, d) }))
    .filter((d) => d.score >= minScore)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) {
    return { domains: [], top: null, confidence: 0, ambiguous: true };
  }
  const total = scored.reduce((s, d) => s + d.score, 0);
  const top = scored[0];
  const second = scored[1];
  // Confidence = top share of total score; ambiguous when top barely leads.
  const confidence = total > 0 ? top.score / total : 0;
  const ambiguous = Boolean(second && top.score - second.score <= 1);
  return {
    domains: scored.map((d) => d.id),
    top: top.id,
    confidence: Number(confidence.toFixed(3)),
    ambiguous,
  };
}

// Is a node readable under the allowed read scope? scope is an array of allowed
// source kinds and/or domain ids; empty scope means "no restriction".
function nodeInScope(node, allowedReadScope) {
  if (!allowedReadScope || allowedReadScope.length === 0) return true;
  const allowed = new Set(allowedReadScope);
  if (node.source && allowed.has(node.source)) return true;
  return (node.domains || []).some((d) => allowed.has(d));
}

// Select a bounded context slice for the chosen domains.
// graphNodes: [{ id, domains:[...], source, created_at }]
// Returns { slice: [ids], dropped_out_of_scope: [ids], truncated: bool }.
export function selectContextSlice(domainIds, graphNodes = [], { maxNodes = 25, allowedReadScope = [] } = {}) {
  const want = new Set(domainIds);
  const matching = graphNodes.filter((n) => (n.domains || []).some((d) => want.has(d)));
  const inScope = [];
  const dropped = [];
  for (const n of matching) {
    if (nodeInScope(n, allowedReadScope)) inScope.push(n);
    else dropped.push(n.id);
  }
  // Prefer most-recent nodes when truncating.
  inScope.sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
  const truncated = inScope.length > maxNodes;
  return {
    slice: inScope.slice(0, maxNodes).map((n) => n.id),
    dropped_out_of_scope: dropped,
    truncated,
  };
}

// Full route: classify + slice, with a disambiguation decision when confidence
// is low or the classification is ambiguous.
export function routeSession({
  opener,
  registry = [],
  graphNodes = [],
  allowedReadScope = [],
  maxNodes = 25,
  minConfidence = 0.5,
} = {}) {
  const classification = classifyDomains(opener, registry);
  if (classification.top === null) {
    return {
      action: "disambiguate",
      reason: "context-router.no-domain-match",
      domains: [],
      confidence: 0,
      slice: [],
    };
  }
  if (classification.ambiguous || classification.confidence < minConfidence) {
    return {
      action: "disambiguate",
      reason: classification.ambiguous
        ? "context-router.ambiguous-domains"
        : "context-router.low-confidence",
      domains: classification.domains.slice(0, 3),
      confidence: classification.confidence,
      slice: [],
    };
  }
  const sliced = selectContextSlice([classification.top], graphNodes, { maxNodes, allowedReadScope });
  return {
    action: "load",
    reason: "context-router.loaded-slice",
    domains: [classification.top],
    confidence: classification.confidence,
    slice: sliced.slice,
    dropped_out_of_scope: sliced.dropped_out_of_scope,
    truncated: sliced.truncated,
  };
}
