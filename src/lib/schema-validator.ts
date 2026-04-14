import type { CheerioAPI } from "cheerio";

/**
 * Deep structured data validator.
 * Parses JSON-LD and microdata, validates required/recommended fields
 * per schema.org type, generates fix code snippets.
 */

export interface SchemaIssue {
  type: string; // e.g. "Article", "FAQPage"
  severity: "error" | "warning" | "notice";
  field: string;
  message: string;
  fix?: string; // Ready-to-paste code
}

export interface SchemaValidationResult {
  schemas: ParsedSchema[];
  issues: SchemaIssue[];
  score: number; // 0-100
}

export interface ParsedSchema {
  type: string;
  source: "json-ld" | "microdata";
  fields: Record<string, unknown>;
}

/** Required and recommended fields per schema.org type */
const SCHEMA_RULES: Record<
  string,
  { required: string[]; recommended: string[] }
> = {
  Article: {
    required: ["headline", "author", "datePublished", "image"],
    recommended: [
      "dateModified",
      "publisher",
      "description",
      "mainEntityOfPage",
      "articleBody",
    ],
  },
  NewsArticle: {
    required: ["headline", "author", "datePublished", "image"],
    recommended: ["dateModified", "publisher", "description", "articleSection"],
  },
  BlogPosting: {
    required: ["headline", "author", "datePublished"],
    recommended: ["image", "dateModified", "publisher", "description", "wordCount"],
  },
  Product: {
    required: ["name", "image"],
    recommended: ["description", "sku", "brand", "offers", "aggregateRating", "review"],
  },
  Organization: {
    required: ["name", "url"],
    recommended: ["logo", "sameAs", "contactPoint", "description", "address"],
  },
  LocalBusiness: {
    required: ["name", "address", "telephone"],
    recommended: ["url", "openingHoursSpecification", "geo", "image", "priceRange"],
  },
  Person: {
    required: ["name"],
    recommended: ["url", "image", "jobTitle", "sameAs", "worksFor"],
  },
  FAQPage: {
    required: ["mainEntity"],
    recommended: [],
  },
  HowTo: {
    required: ["name", "step"],
    recommended: ["description", "image", "totalTime", "estimatedCost", "supply", "tool"],
  },
  Recipe: {
    required: ["name", "image", "recipeIngredient", "recipeInstructions"],
    recommended: [
      "author",
      "datePublished",
      "description",
      "prepTime",
      "cookTime",
      "nutrition",
      "recipeYield",
      "aggregateRating",
    ],
  },
  WebSite: {
    required: ["name", "url"],
    recommended: ["potentialAction", "description"],
  },
  WebPage: {
    required: ["name"],
    recommended: ["description", "url", "datePublished", "dateModified", "breadcrumb"],
  },
  BreadcrumbList: {
    required: ["itemListElement"],
    recommended: [],
  },
  Event: {
    required: ["name", "startDate", "location"],
    recommended: ["description", "endDate", "image", "performer", "offers", "organizer"],
  },
  VideoObject: {
    required: ["name", "description", "thumbnailUrl", "uploadDate"],
    recommended: ["contentUrl", "duration", "embedUrl", "interactionStatistic"],
  },
  SoftwareApplication: {
    required: ["name", "operatingSystem"],
    recommended: [
      "applicationCategory",
      "offers",
      "aggregateRating",
      "description",
      "screenshot",
    ],
  },
  Course: {
    required: ["name", "description", "provider"],
    recommended: ["url", "image", "hasCourseInstance"],
  },
  Review: {
    required: ["itemReviewed", "reviewRating", "author"],
    recommended: ["reviewBody", "datePublished"],
  },
};

export function validateStructuredData($: CheerioAPI): SchemaValidationResult {
  const schemas: ParsedSchema[] = [];
  const issues: SchemaIssue[] = [];

  // ── Parse JSON-LD ──
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const text = $(el).text().trim();
      if (!text) return;
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];

      for (const item of items) {
        if (!item["@type"]) continue;
        const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
        for (const type of types) {
          schemas.push({
            type: String(type),
            source: "json-ld",
            fields: item,
          });
        }
      }
    } catch {
      issues.push({
        type: "JSON-LD",
        severity: "error",
        field: "syntax",
        message: "Invalid JSON-LD syntax — cannot be parsed",
        fix: `<!-- Ensure your JSON-LD is valid JSON -->\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "Your Site",\n  "url": "https://example.com"\n}\n</script>`,
      });
    }
  });

  // ── Parse microdata ──
  $("[itemscope]").each((_, el) => {
    const $el = $(el);
    const type = $el.attr("itemtype")?.replace("https://schema.org/", "").replace("http://schema.org/", "");
    if (!type) return;

    const fields: Record<string, unknown> = {};
    $el.find("[itemprop]").each((_, propEl) => {
      const prop = $(propEl).attr("itemprop");
      if (prop) {
        fields[prop] =
          $(propEl).attr("content") ??
          $(propEl).attr("href") ??
          $(propEl).text().trim().slice(0, 200);
      }
    });

    schemas.push({ type, source: "microdata", fields });
  });

  // ── No structured data at all ──
  if (schemas.length === 0) {
    issues.push({
      type: "General",
      severity: "error",
      field: "structured-data",
      message: "No structured data found on this page",
      fix: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Page Title",\n  "description": "Page description",\n  "url": "https://example.com/page"\n}\n</script>`,
    });
    return { schemas, issues, score: 0 };
  }

  // ── Validate each schema ──
  for (const schema of schemas) {
    const rules = SCHEMA_RULES[schema.type];
    if (!rules) continue; // Unknown type — skip validation

    // Check required fields
    for (const field of rules.required) {
      if (!hasField(schema.fields, field)) {
        issues.push({
          type: schema.type,
          severity: "error",
          field,
          message: `Required field "${field}" is missing from ${schema.type}`,
          fix: generateFieldFix(schema.type, field, schema.source),
        });
      }
    }

    // Check recommended fields
    for (const field of rules.recommended) {
      if (!hasField(schema.fields, field)) {
        issues.push({
          type: schema.type,
          severity: "warning",
          field,
          message: `Recommended field "${field}" is missing from ${schema.type}`,
          fix: generateFieldFix(schema.type, field, schema.source),
        });
      }
    }
  }

  // ── Cross-checks ──
  const typeNames = schemas.map((s) => s.type);

  // Website should have SearchAction
  const website = schemas.find((s) => s.type === "WebSite");
  if (website && !hasField(website.fields, "potentialAction")) {
    issues.push({
      type: "WebSite",
      severity: "notice",
      field: "potentialAction",
      message: "Adding a SearchAction to WebSite schema enables sitelinks search box in Google",
      fix: `"potentialAction": {\n  "@type": "SearchAction",\n  "target": {\n    "@type": "EntryPoint",\n    "urlTemplate": "https://example.com/search?q={search_term_string}"\n  },\n  "query-input": "required name=search_term_string"\n}`,
    });
  }

  // Products should have offers with price
  for (const schema of schemas.filter((s) => s.type === "Product")) {
    if (hasField(schema.fields, "offers")) {
      const offers = (schema.fields as Record<string, unknown>)["offers"];
      if (typeof offers === "object" && offers !== null) {
        const o = offers as Record<string, unknown>;
        if (!o["price"] && !o["lowPrice"]) {
          issues.push({
            type: "Product",
            severity: "error",
            field: "offers.price",
            message: "Product offers must include a price or lowPrice",
            fix: `"offers": {\n  "@type": "Offer",\n  "price": "29.99",\n  "priceCurrency": "USD",\n  "availability": "https://schema.org/InStock"\n}`,
          });
        }
      }
    }
  }

  // No breadcrumb
  if (!typeNames.includes("BreadcrumbList")) {
    issues.push({
      type: "BreadcrumbList",
      severity: "notice",
      field: "breadcrumb",
      message: "No BreadcrumbList schema found — breadcrumbs help search engines understand site hierarchy",
      fix: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "BreadcrumbList",\n  "itemListElement": [\n    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },\n    { "@type": "ListItem", "position": 2, "name": "Category", "item": "https://example.com/category" }\n  ]\n}\n</script>`,
    });
  }

  // ── Calculate score ──
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const penalty = errorCount * 15 + warningCount * 5;
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return { schemas, issues, score };
}

function hasField(obj: Record<string, unknown>, field: string): boolean {
  if (field in obj) {
    const val = obj[field];
    if (val === null || val === undefined || val === "") return false;
    return true;
  }
  return false;
}

function generateFieldFix(
  type: string,
  field: string,
  source: "json-ld" | "microdata",
): string {
  const exampleValues: Record<string, string> = {
    headline: '"Your Article Headline"',
    author: '{ "@type": "Person", "name": "Author Name" }',
    datePublished: '"2025-01-15"',
    dateModified: '"2025-03-01"',
    image: '"https://example.com/image.jpg"',
    publisher:
      '{ "@type": "Organization", "name": "Publisher", "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" } }',
    description: '"A brief description of the content"',
    name: '"Item Name"',
    url: '"https://example.com"',
    logo: '"https://example.com/logo.png"',
    sameAs: '["https://twitter.com/example", "https://linkedin.com/company/example"]',
    telephone: '"+1-555-123-4567"',
    address:
      '{ "@type": "PostalAddress", "streetAddress": "123 Main St", "addressLocality": "City", "addressRegion": "ST", "postalCode": "12345" }',
    mainEntity:
      '[{ "@type": "Question", "name": "Your question?", "acceptedAnswer": { "@type": "Answer", "text": "Your answer." } }]',
    step: '[{ "@type": "HowToStep", "text": "Step 1 instructions" }]',
    offers:
      '{ "@type": "Offer", "price": "9.99", "priceCurrency": "USD", "availability": "https://schema.org/InStock" }',
    aggregateRating:
      '{ "@type": "AggregateRating", "ratingValue": "4.5", "reviewCount": "100" }',
    itemListElement:
      '[{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" }]',
    recipeIngredient: '["1 cup flour", "2 eggs"]',
    recipeInstructions:
      '[{ "@type": "HowToStep", "text": "Mix ingredients." }]',
    startDate: '"2025-06-15T09:00"',
    location:
      '{ "@type": "Place", "name": "Venue Name", "address": "123 Main St" }',
    thumbnailUrl: '"https://example.com/thumb.jpg"',
    uploadDate: '"2025-01-15"',
    operatingSystem: '"Windows, macOS, Linux"',
    provider: '{ "@type": "Organization", "name": "Provider Name" }',
    reviewRating: '{ "@type": "Rating", "ratingValue": "4" }',
    itemReviewed: '{ "@type": "Thing", "name": "Item Name" }',
    reviewBody: '"Detailed review text..."',
    sku: '"PROD-12345"',
    brand: '{ "@type": "Brand", "name": "Brand Name" }',
  };

  const value = exampleValues[field] ?? '"..."';

  if (source === "json-ld") {
    return `"${field}": ${value}`;
  }
  return `<meta itemprop="${field}" content="..." />`;
}
