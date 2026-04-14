import type { CheerioAPI } from "cheerio";

/**
 * Named entity detector & knowledge graph linker.
 * Finds named entities on a page, looks them up in Wikidata,
 * and checks whether schema.org sameAs links reference them.
 */

export interface DetectedEntity {
  name: string;
  type: "person" | "organization" | "place" | "product" | "event" | "other";
  mentions: number;
  wikidataId: string | null;
  wikidataLabel: string | null;
  wikidataDescription: string | null;
  hasSameAs: boolean;
  sameAsUrls: string[];
}

export interface EntityAnalysis {
  entities: DetectedEntity[];
  schemaEntities: number;
  totalEntities: number;
  knowledgeGraphCoverage: number;
  suggestions: string[];
}

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const FALSE_POSITIVES = new Set([
  // Months
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  // Days
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  // Common filler phrases
  "The",
  "This",
  "That",
  "These",
  "Those",
  "How To",
  "Read More",
  "Learn More",
  "Click Here",
  "Sign Up",
  "Log In",
  "Sign In",
  "Get Started",
  "Contact Us",
  "About Us",
  "Privacy Policy",
  "Terms Of Service",
  "All Rights Reserved",
  "Share This",
  "Subscribe Now",
  "More Info",
  "Find Out",
  "What Is",
  "Why Do",
  "See Also",
  "Related Posts",
  "Table Of Contents",
  "Last Updated",
  "Posted On",
  "Written By",
  "Filed Under",
  "Next Post",
  "Previous Post",
  "No Comments",
  "Leave A Reply",
  "Home Page",
  "Web Site",
  "New York",
  "United States",
]);

/** Lowercase set for quick lookup */
const FALSE_POSITIVES_LOWER = new Set(
  [...FALSE_POSITIVES].map((s) => s.toLowerCase()),
);

const ORG_SUFFIXES = [
  "Inc",
  "Corp",
  "Corporation",
  "LLC",
  "Ltd",
  "Limited",
  "GmbH",
  "AG",
  "Co",
  "Group",
  "Holdings",
  "Foundation",
  "Association",
];

const ORG_KEYWORDS = [
  "University",
  "School",
  "Institute",
  "College",
  "Academy",
  "Hospital",
  "Museum",
  "Library",
  "Bank",
  "Airlines",
  "Airways",
];

const PLACE_KEYWORDS = [
  "City",
  "County",
  "State",
  "Province",
  "District",
  "Republic",
  "Kingdom",
  "Island",
  "Mountain",
  "River",
  "Lake",
  "Park",
  "Beach",
  "Valley",
  "Bridge",
  "Airport",
  "Station",
];

const SCHEMA_NAME_PATHS = [
  "author",
  "publisher",
  "about",
  "brand",
  "performer",
  "organizer",
  "creator",
  "contributor",
  "sponsor",
  "funder",
] as const;

const TYPE_MAP: Record<string, DetectedEntity["type"]> = {
  Person: "person",
  Organization: "organization",
  Corporation: "organization",
  EducationalOrganization: "organization",
  GovernmentOrganization: "organization",
  NGO: "organization",
  SportsOrganization: "organization",
  Place: "place",
  City: "place",
  Country: "place",
  State: "place",
  AdministrativeArea: "place",
  LocalBusiness: "place",
  Product: "product",
  SoftwareApplication: "product",
  Event: "event",
  MusicEvent: "event",
  SportsEvent: "event",
  BusinessEvent: "event",
};

// ────────────────────────────────────────────────────────────
// Main entry
// ────────────────────────────────────────────────────────────

export async function detectEntities(
  $: CheerioAPI,
  html: string,
): Promise<EntityAnalysis> {
  // 1. Parse all JSON-LD blocks
  const jsonLdBlocks = parseJsonLd($);

  // 2. Collect sameAs URLs from JSON-LD
  const sameAsUrls = extractSameAsUrls(jsonLdBlocks);

  // 3. Extract entities from body text + JSON-LD
  const bodyText = extractBodyText($);
  const textEntities = extractTextEntities(bodyText);
  const schemaEntities = extractSchemaEntities(jsonLdBlocks);

  // 4. Merge & deduplicate
  const merged = mergeEntities(textEntities, schemaEntities);

  // 5. Classify types using JSON-LD hints + heuristics
  const typed = classifyEntities(merged, jsonLdBlocks);

  // 6. Limit to top 10 by mention count for Wikidata lookups
  const sorted = typed.sort((a, b) => b.mentions - a.mentions);
  const top = sorted.slice(0, 10);
  const rest = sorted.slice(10).map((e) => ({
    ...e,
    wikidataId: null,
    wikidataLabel: null,
    wikidataDescription: null,
    hasSameAs: entityHasSameAs(e.name, sameAsUrls),
    sameAsUrls: filterSameAsForEntity(e.name, sameAsUrls),
  }));

  // 7. Look up top entities in Wikidata
  const enriched = await enrichWithWikidata(top, sameAsUrls);

  const allEntities = [...enriched, ...rest];
  const totalEntities = allEntities.length;
  const withWikidata = allEntities.filter((e) => e.wikidataId !== null).length;
  const withSameAs = allEntities.filter((e) => e.hasSameAs).length;
  const coverage =
    totalEntities > 0 ? Math.round((withWikidata / totalEntities) * 100) : 0;

  // 8. Generate suggestions
  const suggestions = generateSuggestions(
    allEntities,
    jsonLdBlocks,
    sameAsUrls,
    coverage,
  );

  return {
    entities: allEntities,
    schemaEntities: withSameAs,
    totalEntities,
    knowledgeGraphCoverage: coverage,
    suggestions,
  };
}

// ────────────────────────────────────────────────────────────
// JSON-LD parsing
// ────────────────────────────────────────────────────────────

function parseJsonLd($: CheerioAPI): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") blocks.push(item);
        }
      } else if (parsed && typeof parsed === "object") {
        // Handle @graph
        if (Array.isArray(parsed["@graph"])) {
          for (const item of parsed["@graph"]) {
            if (item && typeof item === "object") blocks.push(item);
          }
        }
        blocks.push(parsed);
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });
  return blocks;
}

function extractSameAsUrls(blocks: Record<string, unknown>[]): string[] {
  const urls: string[] = [];
  for (const block of blocks) {
    collectSameAs(block, urls);
  }
  return [...new Set(urls)];
}

function collectSameAs(obj: unknown, out: string[]): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectSameAs(item, out);
    return;
  }
  const record = obj as Record<string, unknown>;
  if ("sameAs" in record) {
    const sa = record.sameAs;
    if (typeof sa === "string") out.push(sa);
    if (Array.isArray(sa)) {
      for (const u of sa) {
        if (typeof u === "string") out.push(u);
      }
    }
  }
  for (const val of Object.values(record)) {
    if (val && typeof val === "object") collectSameAs(val, out);
  }
}

// ────────────────────────────────────────────────────────────
// Text extraction & entity detection
// ────────────────────────────────────────────────────────────

function extractBodyText($: CheerioAPI): string {
  const clone = $.root().clone();
  clone.find("script, style, nav, footer, header, noscript, svg").remove();
  return clone.find("body").text().replace(/\s+/g, " ").trim();
}

interface RawEntity {
  name: string;
  mentions: number;
  fromSchema: boolean;
}

/**
 * Find capitalized multi-word sequences (2+ words) that appear 2+ times.
 * Also picks up single capitalized words of 4+ chars that appear 3+ times,
 * since many brand names are single words (Apple, Google, etc.).
 */
function extractTextEntities(text: string): RawEntity[] {
  // Multi-word: 2–5 capitalized words in a row
  const multiWordRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/g;
  const counts = new Map<string, number>();

  let match: RegExpExecArray | null;
  while ((match = multiWordRe.exec(text)) !== null) {
    const name = match[1].trim();
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  // Single capitalized words (brands, proper nouns) — need 3+ mentions
  const singleWordRe = /\b([A-Z][a-z]{3,})\b/g;
  const singleCounts = new Map<string, number>();
  while ((match = singleWordRe.exec(text)) !== null) {
    const word = match[1];
    singleCounts.set(word, (singleCounts.get(word) ?? 0) + 1);
  }

  const entities: RawEntity[] = [];

  for (const [name, count] of counts) {
    if (count < 2) continue;
    if (FALSE_POSITIVES_LOWER.has(name.toLowerCase())) continue;
    entities.push({ name, mentions: count, fromSchema: false });
  }

  for (const [name, count] of singleCounts) {
    if (count < 3) continue;
    if (FALSE_POSITIVES_LOWER.has(name.toLowerCase())) continue;
    // Skip if already covered by a multi-word entity
    if (entities.some((e) => e.name.includes(name))) continue;
    entities.push({ name, mentions: count, fromSchema: false });
  }

  return entities;
}

function extractSchemaEntities(
  blocks: Record<string, unknown>[],
): RawEntity[] {
  const names = new Map<string, number>();

  for (const block of blocks) {
    // Top-level entity name
    if (typeof block.name === "string" && block.name.trim()) {
      const n = block.name.trim();
      names.set(n, (names.get(n) ?? 0) + 1);
    }

    // Named fields (author, publisher, etc.)
    for (const path of SCHEMA_NAME_PATHS) {
      const val = block[path];
      extractNestedNames(val, names);
    }

    // mentions array
    if (Array.isArray(block.mentions)) {
      for (const item of block.mentions) {
        extractNestedNames(item, names);
      }
    }
  }

  return [...names.entries()]
    .filter(([n]) => !FALSE_POSITIVES_LOWER.has(n.toLowerCase()))
    .map(([name, count]) => ({
      name,
      mentions: count,
      fromSchema: true,
    }));
}

function extractNestedNames(
  val: unknown,
  out: Map<string, number>,
): void {
  if (!val) return;
  if (typeof val === "string" && val.trim()) {
    out.set(val.trim(), (out.get(val.trim()) ?? 0) + 1);
    return;
  }
  if (Array.isArray(val)) {
    for (const item of val) extractNestedNames(item, out);
    return;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.name === "string" && obj.name.trim()) {
      const n = obj.name.trim();
      out.set(n, (out.get(n) ?? 0) + 1);
    }
  }
}

// ────────────────────────────────────────────────────────────
// Merge & deduplicate
// ────────────────────────────────────────────────────────────

function mergeEntities(
  text: RawEntity[],
  schema: RawEntity[],
): RawEntity[] {
  const map = new Map<string, RawEntity>();

  for (const e of [...schema, ...text]) {
    const key = e.name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.mentions += e.mentions;
      existing.fromSchema = existing.fromSchema || e.fromSchema;
    } else {
      map.set(key, { ...e });
    }
  }

  return [...map.values()];
}

// ────────────────────────────────────────────────────────────
// Entity classification
// ────────────────────────────────────────────────────────────

interface TypedEntity extends RawEntity {
  type: DetectedEntity["type"];
}

function classifyEntities(
  entities: RawEntity[],
  jsonLdBlocks: Record<string, unknown>[],
): TypedEntity[] {
  // Build a map of name → schema.org @type
  const schemaTypeMap = new Map<string, string>();
  for (const block of jsonLdBlocks) {
    indexSchemaTypes(block, schemaTypeMap);
  }

  return entities.map((e) => {
    const schemaType = schemaTypeMap.get(e.name.toLowerCase());
    if (schemaType && TYPE_MAP[schemaType]) {
      return { ...e, type: TYPE_MAP[schemaType] };
    }
    return { ...e, type: inferType(e.name) };
  });
}

function indexSchemaTypes(
  obj: unknown,
  out: Map<string, string>,
): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) indexSchemaTypes(item, out);
    return;
  }
  const record = obj as Record<string, unknown>;
  const type = record["@type"];
  const name = record.name;
  if (typeof type === "string" && typeof name === "string" && name.trim()) {
    out.set(name.trim().toLowerCase(), type);
  }
  for (const val of Object.values(record)) {
    if (val && typeof val === "object") indexSchemaTypes(val, out);
  }
}

function inferType(name: string): DetectedEntity["type"] {
  const words = name.split(/\s+/);
  const last = words[words.length - 1];

  if (ORG_SUFFIXES.some((s) => last === s || last === `${s}.`)) {
    return "organization";
  }
  if (ORG_KEYWORDS.some((k) => words.some((w) => w === k))) {
    return "organization";
  }
  if (PLACE_KEYWORDS.some((k) => words.some((w) => w === k))) {
    return "place";
  }

  return "other";
}

// ────────────────────────────────────────────────────────────
// Wikidata enrichment
// ────────────────────────────────────────────────────────────

interface WikidataResult {
  id: string;
  label: string;
  description: string;
}

async function lookupWikidata(
  name: string,
): Promise<WikidataResult | null> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: name,
    language: "en",
    limit: "1",
    format: "json",
    origin: "*",
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://www.wikidata.org/w/api.php?${params.toString()}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as {
      search?: Array<{
        id?: string;
        label?: string;
        description?: string;
      }>;
    };

    const first = data.search?.[0];
    if (!first?.id) return null;

    return {
      id: first.id,
      label: first.label ?? name,
      description: first.description ?? "",
    };
  } catch {
    return null;
  }
}

async function enrichWithWikidata(
  entities: TypedEntity[],
  sameAsUrls: string[],
): Promise<DetectedEntity[]> {
  const results = await Promise.allSettled(
    entities.map((e) => lookupWikidata(e.name)),
  );

  return entities.map((e, i) => {
    const result = results[i];
    const wd =
      result.status === "fulfilled" ? result.value : null;

    const hasSameAs = entityHasSameAs(e.name, sameAsUrls);
    const entitySameAs = filterSameAsForEntity(e.name, sameAsUrls);

    return {
      name: e.name,
      type: e.type,
      mentions: e.mentions,
      wikidataId: wd?.id ?? null,
      wikidataLabel: wd?.label ?? null,
      wikidataDescription: wd?.description ?? null,
      hasSameAs,
      sameAsUrls: entitySameAs,
    };
  });
}

// ────────────────────────────────────────────────────────────
// sameAs matching
// ────────────────────────────────────────────────────────────

function entityHasSameAs(name: string, sameAsUrls: string[]): boolean {
  return filterSameAsForEntity(name, sameAsUrls).length > 0;
}

function filterSameAsForEntity(
  name: string,
  sameAsUrls: string[],
): string[] {
  const lower = name.toLowerCase();
  const slug = lower.replace(/\s+/g, "_");
  const slugDash = lower.replace(/\s+/g, "-");
  const slugNone = lower.replace(/\s+/g, "");

  return sameAsUrls.filter((url) => {
    const u = url.toLowerCase();
    return (
      u.includes(slug) ||
      u.includes(slugDash) ||
      u.includes(slugNone)
    );
  });
}

// ────────────────────────────────────────────────────────────
// Suggestions
// ────────────────────────────────────────────────────────────

function generateSuggestions(
  entities: DetectedEntity[],
  jsonLdBlocks: Record<string, unknown>[],
  sameAsUrls: string[],
  coverage: number,
): string[] {
  const suggestions: string[] = [];

  // Entities found in Wikidata but missing sameAs
  const missingSameAs = entities.filter(
    (e) => e.wikidataId && !e.hasSameAs,
  );
  if (missingSameAs.length > 0) {
    const names = missingSameAs
      .slice(0, 3)
      .map((e) => `"${e.name}"`)
      .join(", ");
    suggestions.push(
      `Add sameAs links for ${names} in your schema.org structured data. ` +
        `This helps search engines connect your content to the Knowledge Graph. ` +
        `Example: "sameAs": "https://www.wikidata.org/wiki/${missingSameAs[0].wikidataId}"`,
    );
  }

  // Check for author/publisher Person or Organization schemas
  const hasPersonOrOrg = jsonLdBlocks.some((block) => {
    const type = block["@type"];
    return (
      type === "Person" ||
      type === "Organization" ||
      (typeof block.author === "object" &&
        block.author !== null &&
        (block.author as Record<string, unknown>)["@type"])
    );
  });

  if (!hasPersonOrOrg && entities.some((e) => e.type === "person")) {
    suggestions.push(
      "Add a Person schema with sameAs links for the content author. " +
        "This strengthens E-E-A-T signals and can trigger Knowledge Panel features.",
    );
  }

  // No sameAs at all
  if (sameAsUrls.length === 0 && entities.length > 0) {
    suggestions.push(
      "No sameAs links found in your structured data. Adding sameAs URLs " +
        "(Wikipedia, Wikidata, social profiles) helps search engines verify entity identity " +
        "and improves your chances of appearing in Knowledge Panels.",
    );
  }

  // Low coverage
  if (coverage < 50 && entities.length >= 3) {
    suggestions.push(
      `Only ${coverage}% of detected entities are linked to Wikidata. ` +
        "Consider adding schema.org markup with sameAs for key entities mentioned on this page.",
    );
  }

  // High coverage congratulations
  if (coverage >= 80 && entities.length >= 3) {
    suggestions.push(
      "Strong knowledge graph coverage. Most entities on this page are linked to Wikidata entries.",
    );
  }

  // Suggest adding mentions array if multiple entities found but not in schema
  const schemaEntityNames = new Set<string>();
  for (const block of jsonLdBlocks) {
    collectEntityNames(block, schemaEntityNames);
  }
  const unlinkedEntities = entities.filter(
    (e) => e.wikidataId && !schemaEntityNames.has(e.name.toLowerCase()),
  );
  if (unlinkedEntities.length >= 2) {
    suggestions.push(
      "Consider adding a 'mentions' array in your JSON-LD to explicitly reference " +
        "the entities discussed on this page. This provides additional semantic context for search engines.",
    );
  }

  return suggestions;
}

function collectEntityNames(
  obj: unknown,
  out: Set<string>,
): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectEntityNames(item, out);
    return;
  }
  const record = obj as Record<string, unknown>;
  if (typeof record.name === "string" && record.name.trim()) {
    out.add(record.name.trim().toLowerCase());
  }
  for (const val of Object.values(record)) {
    if (val && typeof val === "object") collectEntityNames(val, out);
  }
}
