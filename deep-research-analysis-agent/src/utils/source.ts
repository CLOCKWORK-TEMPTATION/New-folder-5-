import * as cheerio from "cheerio";

import { normalizeWhitespace, truncate } from "./text.js";

export interface FetchedSource {
  url: string;
  finalUrl: string;
  hostname: string;
  title: string | undefined;
  description: string | undefined;
  author: string | undefined;
  publishedAt: string | undefined;
  excerpt: string;
  text: string;
  wordCount: number;
}

export interface CredibilityAssessment {
  hostname: string;
  sourceType:
    | "government"
    | "academic"
    | "nonprofit"
    | "news"
    | "commercial"
    | "blog"
    | "community"
    | "unknown";
  freshness: "fresh" | "aging" | "stale" | "unknown";
  ageDays: number | undefined;
  score: number;
  recommendation: "primary" | "secondary" | "background" | "avoid";
  biasFlags: string[];
  conflictFlags: string[];
  reasons: string[];
}

function parseMeta(
  $: cheerio.CheerioAPI,
  selectors: Array<{ attr: string; value: string }>
): string | undefined {
  for (const selector of selectors) {
    const content = $(`meta[${selector.attr}="${selector.value}"]`).attr(
      "content"
    );
    if (content) {
      return normalizeWhitespace(content);
    }
  }

  return undefined;
}

function parsePublishedAt($: cheerio.CheerioAPI): string | undefined {
  const candidate =
    parseMeta($, [
      { attr: "property", value: "article:published_time" },
      { attr: "name", value: "pubdate" },
      { attr: "name", value: "publish-date" },
      { attr: "name", value: "date" },
      { attr: "itemprop", value: "datePublished" }
    ]) ?? $("time[datetime]").attr("datetime");

  if (!candidate) {
    return undefined;
  }

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function extractVisibleText($: cheerio.CheerioAPI): string {
  $("script, style, noscript, svg, iframe, nav, footer, header, aside").remove();

  const articleText = $("article").first().text();
  const mainText = $("main").first().text();
  const roleMainText = $("[role='main']").first().text();
  const bodyText = $("body").text();

  return normalizeWhitespace(articleText || mainText || roleMainText || bodyText);
}

export async function fetchSource(
  url: string,
  userAgent: string,
  maxCharacters = 12_000
): Promise<FetchedSource> {
  const response = await fetch(url, {
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const finalUrl = response.url || url;
  const $ = cheerio.load(html);
  const text = truncate(extractVisibleText($), maxCharacters);
  const title = normalizeWhitespace($("title").first().text()) || undefined;
  const description =
    parseMeta($, [
      { attr: "name", value: "description" },
      { attr: "property", value: "og:description" }
    ]) || undefined;
  const author =
    parseMeta($, [
      { attr: "name", value: "author" },
      { attr: "property", value: "article:author" }
    ]) || undefined;
  const publishedAt = parsePublishedAt($);
  const hostname = new URL(finalUrl).hostname.toLowerCase();

  return {
    url,
    finalUrl,
    hostname,
    title,
    description,
    author,
    publishedAt,
    excerpt: truncate(text, 800),
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length
  };
}

function detectSourceType(hostname: string): CredibilityAssessment["sourceType"] {
  if (hostname.endsWith(".gov")) {
    return "government";
  }

  if (hostname.endsWith(".edu")) {
    return "academic";
  }

  if (
    hostname.includes("wikipedia.org") ||
    hostname.includes("reddit.com") ||
    hostname.includes("github.com")
  ) {
    return "community";
  }

  if (hostname.endsWith(".org")) {
    return "nonprofit";
  }

  if (
    hostname.includes("news") ||
    hostname.includes("times") ||
    hostname.includes("reuters") ||
    hostname.includes("bloomberg") ||
    hostname.includes("apnews")
  ) {
    return "news";
  }

  if (
    hostname.includes("medium.com") ||
    hostname.includes("substack.com") ||
    hostname.includes("blog") ||
    hostname.includes("wordpress")
  ) {
    return "blog";
  }

  if (hostname.length > 0) {
    return "commercial";
  }

  return "unknown";
}

function detectFreshness(publishedAt?: string): {
  freshness: CredibilityAssessment["freshness"];
  ageDays?: number;
} {
  if (!publishedAt) {
    return { freshness: "unknown" };
  }

  const publishedDate = new Date(publishedAt);
  const diffMs = Date.now() - publishedDate.getTime();
  const ageDays = Math.floor(diffMs / 86_400_000);

  if (Number.isNaN(ageDays)) {
    return { freshness: "unknown" };
  }

  if (ageDays <= 180) {
    return { freshness: "fresh", ageDays };
  }

  if (ageDays <= 730) {
    return { freshness: "aging", ageDays };
  }

  return { freshness: "stale", ageDays };
}

function detectFlags(text: string): {
  biasFlags: string[];
  conflictFlags: string[];
} {
  const lower = text.toLowerCase();
  const biasFlags: string[] = [];
  const conflictFlags: string[] = [];

  if (/\bopinion\b|\beditorial\b/.test(lower)) {
    biasFlags.push("Contains opinion-oriented language");
  }

  if (/\bsponsored\b|\badvertorial\b|\baffiliate\b/.test(lower)) {
    biasFlags.push("Contains sponsorship or affiliate signals");
    conflictFlags.push("Possible commercial incentive");
  }

  if (/\bpress release\b|\bfor immediate release\b/.test(lower)) {
    conflictFlags.push("Press release style content");
  }

  if (/\bour company\b|\bour product\b|\bwe believe\b/.test(lower)) {
    conflictFlags.push("Potential self-promotional framing");
  }

  return { biasFlags, conflictFlags };
}

export function assessCredibility(source: FetchedSource): CredibilityAssessment {
  const sourceType = detectSourceType(source.hostname);
  const { freshness, ageDays } = detectFreshness(source.publishedAt);
  const { biasFlags, conflictFlags } = detectFlags(
    [source.title, source.description, source.text].filter(Boolean).join(" ")
  );
  const reasons: string[] = [];
  let score = 50;

  switch (sourceType) {
    case "government":
      score += 25;
      reasons.push("Government domain");
      break;
    case "academic":
      score += 20;
      reasons.push("Academic domain");
      break;
    case "news":
      score += 10;
      reasons.push("News-style domain");
      break;
    case "nonprofit":
      score += 8;
      reasons.push("Nonprofit domain");
      break;
    case "community":
      score -= 8;
      reasons.push("Community or user-generated platform");
      break;
    case "blog":
      score -= 12;
      reasons.push("Blog-style domain");
      break;
    case "commercial":
      score -= 4;
      reasons.push("Commercial domain");
      break;
    default:
      reasons.push("Unknown domain type");
  }

  if (source.publishedAt) {
    score += 5;
    reasons.push("Publication date detected");
  } else {
    score -= 5;
    reasons.push("Publication date missing");
  }

  if (freshness === "fresh") {
    score += 10;
    reasons.push("Recent publication date");
  } else if (freshness === "stale") {
    score -= 10;
    reasons.push("Content may be outdated");
  }

  if (source.wordCount < 250) {
    score -= 8;
    reasons.push("Thin content");
  } else if (source.wordCount > 900) {
    score += 4;
    reasons.push("Substantive content length");
  }

  if (source.finalUrl.startsWith("https://")) {
    score += 2;
    reasons.push("Served over HTTPS");
  }

  score -= biasFlags.length * 8;
  score -= conflictFlags.length * 10;

  if (biasFlags.length > 0) {
    reasons.push("Bias indicators detected");
  }

  if (conflictFlags.length > 0) {
    reasons.push("Conflict-of-interest indicators detected");
  }

  score = Math.min(100, Math.max(0, score));

  let recommendation: CredibilityAssessment["recommendation"] = "avoid";
  if (score >= 80) {
    recommendation = "primary";
  } else if (score >= 65) {
    recommendation = "secondary";
  } else if (score >= 45) {
    recommendation = "background";
  }

  return {
    hostname: source.hostname,
    sourceType,
    freshness,
    ageDays,
    score,
    recommendation,
    biasFlags,
    conflictFlags,
    reasons
  };
}
