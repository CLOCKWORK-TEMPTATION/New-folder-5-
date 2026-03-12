import { tool } from "@langchain/core/tools";
import puppeteer from "puppeteer";
import { z } from "zod";
function extractMetaFromHtml(html, selector) {
    const match = html.match(new RegExp(`<meta[^>]+${selector}=["']([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>`, "i"));
    return match?.[2]?.trim() ?? null;
}
function buildFetchedDocument(params) {
    return {
        source_url: params.url,
        author: params.author ?? null,
        publish_date: params.publishDate ?? null,
        access_date: new Date().toISOString(),
        content_type: params.contentType,
        raw_content: params.rawContent,
        binary_encoding: params.binaryEncoding,
        retrieval_mode: params.retrievalMode,
        title: params.title ?? null,
    };
}
export const fetchWebpageTool = tool(async ({ url }) => {
    const response = await fetch(url, {
        headers: {
            "user-agent": "content-extractor-agent/1.1",
            accept: "*/*",
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") ?? "text/plain";
    if (contentType.includes("application/pdf") ||
        contentType.startsWith("image/")) {
        const buffer = Buffer.from(await response.arrayBuffer());
        return JSON.stringify(buildFetchedDocument({
            url: response.url || url,
            contentType,
            rawContent: buffer.toString("base64"),
            retrievalMode: "static",
            binaryEncoding: "base64",
        }), null, 2);
    }
    const rawContent = await response.text();
    return JSON.stringify(buildFetchedDocument({
        url: response.url || url,
        contentType,
        rawContent,
        retrievalMode: "static",
        title: extractMetaFromHtml(rawContent, "property=['\"]og:title['\"]"),
        author: extractMetaFromHtml(rawContent, "name=['\"]author['\"]") ??
            extractMetaFromHtml(rawContent, "property=['\"]article:author['\"]"),
        publishDate: extractMetaFromHtml(rawContent, "property=['\"]article:published_time['\"]") ?? extractMetaFromHtml(rawContent, "itemprop=['\"]datePublished['\"]"),
    }), null, 2);
}, {
    name: "fetch_raw_content",
    description: "Downloads raw HTML, PDF, image, or JSON from a URL and returns a structured fetched document payload.",
    schema: z.object({
        url: z.string().url(),
    }),
});
export const fetchWithHeadlessBrowserTool = tool(async ({ url }) => {
    const browser = await puppeteer.launch({
        headless: true,
    });
    try {
        const page = await browser.newPage();
        const timeout = Number(process.env.HEADLESS_BROWSER_TIMEOUT_MS ?? "30000");
        await page.goto(url, {
            waitUntil: "networkidle2",
            timeout,
        });
        const html = await page.content();
        const title = await page.title();
        const metadata = await page.evaluate(() => {
            const readMeta = (selector) => document.querySelector(selector)?.getAttribute("content") ?? null;
            return {
                author: readMeta('meta[name="author"]') ??
                    readMeta('meta[property="article:author"]'),
                publishDate: readMeta('meta[property="article:published_time"]') ??
                    readMeta('meta[itemprop="datePublished"]'),
            };
        });
        return JSON.stringify(buildFetchedDocument({
            url: page.url(),
            contentType: "text/html",
            rawContent: html,
            retrievalMode: "dynamic",
            title,
            author: metadata.author,
            publishDate: metadata.publishDate,
        }), null, 2);
    }
    finally {
        await browser.close();
    }
}, {
    name: "fetch_js_rendered_content",
    description: "Renders a page in a headless browser and returns the final HTML with structured metadata.",
    schema: z.object({
        url: z.string().url(),
    }),
});
