import researchIndex from "../generated/research-index.json";

export const researchEntries = researchIndex.entries;

// Normalize entries: parse a simple YAML-like frontmatter if present
function _parseFrontmatter(md) {
  const text = String(md || "");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return { meta: null, body: text };
  const fm = m[1];
  const body = text.slice(m[0].length);
  const meta = {};
  for (const line of fm.split(/\r?\n/)) {
    const p = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (!p) continue;
    const key = p[1].trim();
    let val = p[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return { meta, body };
}

for (const entry of researchEntries) {
  const { meta, body } = _parseFrontmatter(entry.markdown);
  entry.meta = meta || {};
  if (meta && meta.image) {
    // Build a small HTML figure to prepend so the existing page can render it
    const img = meta.image;
    const alt = meta.image_alt || entry.title || "";
    const parts = [];
    if (meta.image_credit) {
      if (meta.image_credit_url)
        parts.push(
          `<a href="${meta.image_credit_url}">${meta.image_credit}</a>`,
        );
      else parts.push(`${meta.image_credit}`);
    }
    if (meta.image_license) {
      if (meta.image_license_url)
        parts.push(
          `<a href="${meta.image_license_url}">${meta.image_license}</a>`,
        );
      else parts.push(`${meta.image_license}`);
    }
    const caption = parts.join(" — ");
    let figure = `<figure class="article-figure" style="max-width:100%;margin:0 0 1rem 0;overflow:hidden;">`;
    // Constrain both width and height while preserving aspect ratio.
    figure += `<img src="${img}" alt="${alt}" style="max-width:100%;max-height:60vh;width:auto;height:auto;display:block;margin:0 auto;object-fit:contain;box-sizing:border-box;" loading="lazy" decoding="async" />`;
    if (caption)
      figure += `<figcaption style="font-size:0.9rem;color:var(--muted-color,#666);margin-top:0.25rem;">${caption}</figcaption>`;
    if (meta.image_usage === "fair-use" && meta.fair_use_notes) {
      figure += `<div class="fair-use" style="font-size:0.85rem;color:var(--muted-color,#666);margin-top:0.25rem;">${meta.fair_use_notes}</div>`;
    }
    figure += `</figure>\n\n`;
    entry.markdown = figure + body;
  } else {
    entry.markdown = body;
  }
}

function humanizeSegment(segment) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getSectionLabel(section) {
  if (section === "__root__") {
    return "Top Level";
  }

  return humanizeSegment(section);
}

function sortByRoute(left, right) {
  return left.route.localeCompare(right.route);
}

function sortGroups(left, right) {
  if (left.section === "__root__") {
    return -1;
  }

  if (right.section === "__root__") {
    return 1;
  }

  return left.label.localeCompare(right.label);
}

export function getNavigationGroups() {
  const groups = new Map();

  for (const entry of researchEntries) {
    if (!groups.has(entry.section)) {
      groups.set(entry.section, []);
    }

    groups.get(entry.section).push({
      title: entry.title,
      route: entry.route,
      routeSegments: entry.routeSegments,
      excerpt: entry.excerpt,
    });
  }

  return Array.from(groups.entries())
    .map(([section, items]) => ({
      section,
      label: getSectionLabel(section),
      items: items.sort(sortByRoute),
    }))
    .sort(sortGroups);
}

export function findEntryBySlug(slugParts) {
  const normalized = `/${slugParts.join("/")}`;
  return researchEntries.find((entry) => entry.route === normalized);
}

export function getSiblingEntries(entry) {
  const sectionEntries = researchEntries
    .filter((candidate) => candidate.section === entry.section)
    .sort(sortByRoute);

  const currentIndex = sectionEntries.findIndex(
    (candidate) => candidate.id === entry.id,
  );

  return {
    previous: currentIndex > 0 ? sectionEntries[currentIndex - 1] : null,
    next:
      currentIndex >= 0 && currentIndex < sectionEntries.length - 1
        ? sectionEntries[currentIndex + 1]
        : null,
  };
}

export function getOverviewEntry() {
  return researchEntries.find((entry) => entry.route === "/research") ?? null;
}

export function getSectionCounts() {
  const counts = new Map();

  for (const entry of researchEntries) {
    const current = counts.get(entry.section) ?? {
      section: entry.section,
      label: getSectionLabel(entry.section),
      count: 0,
      route: null,
    };

    current.count += 1;

    if (entry.isIndex) {
      current.route = entry.route;
    }

    if (!current.route) {
      current.route = entry.route;
    }

    counts.set(entry.section, current);
  }

  return Array.from(counts.values()).sort(sortGroups);
}

function _normalizeSegments(s) {
  return String(s || "")
    .replace(/\\\\/g, "/")
    .split("/")
    .filter(Boolean);
}

function _joinResolve(base, rel) {
  const baseParts = _normalizeSegments(base);
  const relParts = _normalizeSegments(rel);
  const parts = baseParts.slice();
  for (const p of relParts) {
    if (p === ".") continue;
    if (p === "..") {
      if (parts.length) parts.pop();
    } else {
      parts.push(p);
    }
  }
  return parts.join("/");
}

export function resolveMarkdownHref(href, fromSourcePath = "README.md") {
  if (!href) return href;

  // Preserve anchors and external URLs
  const trimmed = String(href).trim();
  if (trimmed.startsWith("#")) return href;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith("//"))
    return href;

  // Separate path, query, fragment
  let pathOnly = trimmed;
  let fragment = "";
  let query = "";
  const hashIdx = trimmed.indexOf("#");
  if (hashIdx !== -1) {
    fragment = trimmed.slice(hashIdx);
    pathOnly = trimmed.slice(0, hashIdx);
  }
  const qIdx = pathOnly.indexOf("?");
  if (qIdx !== -1) {
    query = pathOnly.slice(qIdx);
    pathOnly = pathOnly.slice(0, qIdx);
  }

  pathOnly = pathOnly.replace(/^\/+/, "").replace(/\\\\/g, "/");

  const candidates = [];
  const withoutMd = pathOnly.replace(/\.md$/i, "");

  if (pathOnly.toLowerCase().startsWith("research/")) {
    candidates.push(withoutMd);
  } else {
    candidates.push("research/" + withoutMd);

    const fromDir = String(fromSourcePath || "")
      .replace(/\\\\/g, "/")
      .split("/")
      .slice(0, -1)
      .join("/");
    if (fromDir) {
      candidates.push(
        "research/" + _joinResolve(fromDir, pathOnly).replace(/\.md$/i, ""),
      );
    }
  }

  // Try matching candidates to entries
  const tryFind = (id) => {
    if (!id) return null;

    const idAlt = id.replace(/\/(?:README|index)$/i, "");

    let found = researchEntries.find((e) => e.id === id || e.id === idAlt);
    if (found) return found;

    const maybeSource = id.replace(/^research\//, "");
    const sourceCandidates = [
      maybeSource,
      maybeSource + ".md",
      maybeSource + "/README.md",
    ];
    for (const s of sourceCandidates) {
      found = researchEntries.find((e) => e.sourcePath === s);
      if (found) return found;
    }

    return null;
  };

  let entry = null;
  for (const cand of candidates) {
    entry = tryFind(cand);
    if (entry) break;
  }

  if (!entry) {
    // Last-resort heuristics: try matching by sourcePath directly
    const alt = withoutMd;
    entry = researchEntries.find(
      (e) =>
        e.sourcePath === alt + ".md" ||
        e.route === "/" + alt ||
        e.route === "/research/" + alt,
    );
  }

  if (entry) {
    return entry.route + (query || "") + (fragment || "");
  }

  return href;
}

export default {
  researchEntries,
  getSectionLabel,
  getNavigationGroups,
  findEntryBySlug,
  getSiblingEntries,
  getOverviewEntry,
  getSectionCounts,
  resolveMarkdownHref,
};
