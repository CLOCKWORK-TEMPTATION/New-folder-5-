import * as cheerio from "cheerio";
function normalizeWhitespace(text) {
    return text.replace(/\s+/g, " ").trim();
}
function tryParseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
function looksLikeHtml(value) {
    return /<\/?[a-z][\s\S]*>/i.test(value);
}
function extractMeta($, selectors) {
    for (const selector of selectors) {
        const content = $(`meta[${selector.attr}="${selector.value}"]`).attr("content");
        if (content) {
            return normalizeWhitespace(content);
        }
    }
    return null;
}
export function parseFetchedDocument(input) {
    const parsed = tryParseJson(input);
    if (parsed && parsed.source_url) {
        return parsed;
    }
    return {
        source_url: "unknown",
        author: null,
        publish_date: null,
        access_date: new Date().toISOString(),
        content_type: looksLikeHtml(input) ? "text/html" : "text/plain",
        raw_content: input,
        retrieval_mode: "static",
        title: null,
    };
}
export function classifyBlock(text) {
    const normalized = normalizeWhitespace(text);
    const lowered = normalized.toLowerCase();
    if (/\b\d+(?:[.,]\d+)?\b/.test(normalized) ||
        normalized.includes("%") ||
        normalized.includes("٪")) {
        return "إحصاء";
    }
    if (lowered.includes("أرى") ||
        lowered.includes("برأيي") ||
        lowered.includes("يبدو لي") ||
        lowered.includes("opinion") ||
        lowered.includes("editorial")) {
        return "رأي";
    }
    if (lowered.includes("لأن") ||
        lowered.includes("يشير") ||
        lowered.includes("يعني") ||
        lowered.includes("يُظهر") ||
        lowered.includes("analysis")) {
        return "تحليل";
    }
    return "خبر";
}
export function cleanFetchedDocument(input) {
    const document = parseFetchedDocument(input);
    const rawContent = document.raw_content;
    if (!looksLikeHtml(rawContent)) {
        const paragraphs = rawContent
            .split(/\n+/)
            .map((paragraph) => normalizeWhitespace(paragraph))
            .filter((paragraph) => paragraph.length >= 40);
        const contentBlocks = paragraphs.map((paragraph) => ({
            type: classifyBlock(paragraph),
            text: paragraph,
            stats_source: classifyBlock(paragraph) === "إحصاء" ? document.source_url : null,
        }));
        return {
            source_url: document.source_url,
            author: document.author,
            publish_date: document.publish_date,
            access_date: document.access_date,
            content_type: document.content_type,
            title: document.title ?? null,
            cleaned_text: contentBlocks.map((block) => block.text).join("\n\n"),
            content_blocks: contentBlocks,
        };
    }
    const $ = cheerio.load(rawContent);
    $("script, style, noscript, svg, iframe, nav, footer, header, aside, form").remove();
    $('[class*="ad"], [id*="ad"], [class*="promo"], [class*="sidebar"], [class*="comment"], [class*="newsletter"], [class*="breadcrumb"]').remove();
    const inferredTitle = document.title ??
        extractMeta($, [{ attr: "property", value: "og:title" }]) ??
        normalizeWhitespace($("title").first().text()) ??
        null;
    const candidates = $("article, main, [role='main'], section, p, h1, h2, h3, blockquote, li")
        .toArray()
        .map((element) => normalizeWhitespace($(element).text()))
        .filter((text) => text.length >= 40);
    const unique = Array.from(new Set(candidates)).slice(0, 150);
    const contentBlocks = unique.map((text) => {
        const type = classifyBlock(text);
        return {
            type,
            text,
            stats_source: type === "إحصاء" ? document.source_url : null,
        };
    });
    return {
        source_url: document.source_url,
        author: document.author ??
            extractMeta($, [
                { attr: "name", value: "author" },
                { attr: "property", value: "article:author" },
            ]),
        publish_date: document.publish_date ??
            extractMeta($, [
                { attr: "property", value: "article:published_time" },
                { attr: "name", value: "pubdate" },
                { attr: "itemprop", value: "datePublished" },
            ]),
        access_date: document.access_date,
        content_type: document.content_type,
        title: inferredTitle,
        cleaned_text: contentBlocks.map((block) => block.text).join("\n\n"),
        content_blocks: contentBlocks,
    };
}
export function normalizeCleanedDocument(input) {
    const cleaned = tryParseJson(input) ?? cleanFetchedDocument(input);
    const hostname = cleaned.source_url && cleaned.source_url !== "unknown"
        ? new URL(cleaned.source_url).hostname.toLowerCase()
        : "";
    let source_type = "مدونة";
    let credibility_tier = 3;
    if (hostname.endsWith(".gov")) {
        source_type = "رسمي";
        credibility_tier = 1;
    }
    else if (hostname.endsWith(".edu") || hostname.includes("journal")) {
        source_type = "أكاديمي";
        credibility_tier = 1;
    }
    else if (hostname.includes("news") ||
        hostname.includes("times") ||
        hostname.includes("reuters") ||
        hostname.includes("bbc") ||
        hostname.includes("apnews")) {
        source_type = "صحفي";
        credibility_tier = 2;
    }
    const direct_quote_available = cleaned.content_blocks.some((block) => /["'«»“”]/.test(block.text));
    return {
        source_url: cleaned.source_url,
        author: cleaned.author,
        publish_date: cleaned.publish_date,
        access_date: cleaned.access_date,
        source_type,
        credibility_tier,
        direct_quote_available,
        content_blocks: cleaned.content_blocks.map((block) => ({
            type: block.type,
            text: block.text,
            stats_source: block.type === "إحصاء" ? block.stats_source ?? cleaned.source_url : null,
        })),
    };
}
export function parsePossiblyStructuredInput(input) {
    const parsedFetched = tryParseJson(input);
    if (parsedFetched?.raw_content) {
        return parsedFetched.raw_content;
    }
    const parsedCleaned = tryParseJson(input);
    if (parsedCleaned?.cleaned_text) {
        return parsedCleaned.cleaned_text;
    }
    return input;
}
