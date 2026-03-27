import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "..");
const researchDir = path.resolve(frontendDir, "..", "research");
const outputPath = path.resolve(
  frontendDir,
  "src",
  "generated",
  "research-index.json",
);

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .trim()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-");
}

function humanizeSegment(segment) {
  return segment
    .replaceAll("-", " ")
    .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function extractHeadings(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{2,6})\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({
      depth: match[1].length,
      text: match[2].trim(),
      slug: slugify(match[2].trim()),
    }));
}

function extractExcerpt(markdown) {
  const lines = markdown.split(/\r?\n/);
  const chunks = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (chunks.length > 0) {
        break;
      }
      continue;
    }

    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("*")
    ) {
      continue;
    }

    chunks.push(trimmed);
  }

  return chunks.join(" ").slice(0, 280).trim();
}

function buildContentSegments(relativePath) {
  if (relativePath === "README.md") {
    return [];
  }

  const normalized = relativePath.endsWith("/README.md")
    ? relativePath.slice(0, -"/README.md".length)
    : relativePath.slice(0, -".md".length);

  return normalized.split("/");
}

function buildRouteSegments(contentSegments) {
  return ["research", ...contentSegments];
}

function buildCollectionKey(contentSegments) {
  return contentSegments[0] ?? "__root__";
}

function buildLabel(contentSegments) {
  if (contentSegments.length === 0) {
    return "Research";
  }

  return humanizeSegment(contentSegments[contentSegments.length - 1]);
}

async function walkMarkdownFiles(currentDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      const nested = await walkMarkdownFiles(absolutePath);
      results.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(absolutePath);
    }
  }

  return results;
}

function sortEntries(entries) {
  return entries.sort((left, right) => left.route.localeCompare(right.route));
}

async function main() {
  const hasResearchDir = await pathExists(researchDir);

  if (!hasResearchDir) {
    const hasExistingOutput = await pathExists(outputPath);

    if (hasExistingOutput) {
      console.log(
        "Research directory not found. Using committed frontend/src/generated/research-index.json.",
      );
      return;
    }

    const output = {
      generatedAt: new Date().toISOString(),
      entries: [],
    };

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(
      outputPath,
      `${JSON.stringify(output, null, 2)}\n`,
      "utf8",
    );

    console.log(
      "Research directory not found. Wrote empty frontend/src/generated/research-index.json.",
    );
    return;
  }

  const markdownFiles = await walkMarkdownFiles(researchDir);
  const entries = [];

  for (const filePath of markdownFiles) {
    const markdown = await fs.readFile(filePath, "utf8");
    const relativePath = toPosixPath(path.relative(researchDir, filePath));
    const contentSegments = buildContentSegments(relativePath);
    const routeSegments = buildRouteSegments(contentSegments);
    const titleFallback = buildLabel(contentSegments);
    const isIndex = path.basename(relativePath).toLowerCase() === "readme.md";

    entries.push({
      id: routeSegments.join("/"),
      title: extractTitle(markdown, titleFallback),
      section: buildCollectionKey(contentSegments),
      contentSegments,
      routeSegments,
      route: `/${routeSegments.join("/")}`,
      sourcePath: relativePath,
      isIndex,
      excerpt: extractExcerpt(markdown),
      headings: extractHeadings(markdown),
      markdown,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    entries: sortEntries(entries),
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );

  console.log(`Indexed ${entries.length} research documents.`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
