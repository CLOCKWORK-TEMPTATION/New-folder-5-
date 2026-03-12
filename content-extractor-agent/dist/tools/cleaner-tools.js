import { readFile } from "node:fs/promises";
import { tool } from "@langchain/core/tools";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";
import { z } from "zod";
import { cleanFetchedDocument, parseFetchedDocument } from "../utils/document.js";
async function resolveBufferInput(input) {
    const fetched = (() => {
        try {
            return parseFetchedDocument(input);
        }
        catch {
            return null;
        }
    })();
    if (fetched?.binary_encoding === "base64") {
        return Buffer.from(fetched.raw_content, "base64");
    }
    if (/^https?:\/\//i.test(input)) {
        const response = await fetch(input);
        if (!response.ok) {
            throw new Error(`Failed to download binary source: ${response.status} ${response.statusText}`);
        }
        return Buffer.from(await response.arrayBuffer());
    }
    return readFile(input);
}
export const extractCoreContentTool = tool(async ({ rawDocument, }) => {
    const cleaned = cleanFetchedDocument(rawDocument);
    return JSON.stringify(cleaned, null, 2);
}, {
    name: "extract_core_semantic_content",
    description: "Cleans fetched content, removes boilerplate, and produces classified semantic content blocks.",
    schema: z.object({
        rawDocument: z
            .string()
            .describe("Structured fetched document payload or plain raw content."),
    }),
});
export const ocrVisualExtractionTool = tool(async ({ documentPayload, pdfOrImagePath, }) => {
    const input = documentPayload ?? pdfOrImagePath;
    if (!input) {
        throw new Error("Provide documentPayload or pdfOrImagePath.");
    }
    const buffer = await resolveBufferInput(input);
    const fetched = (() => {
        try {
            return parseFetchedDocument(input);
        }
        catch {
            return null;
        }
    })();
    const inferredContentType = pdfOrImagePath?.toLowerCase().endsWith(".pdf") ||
        input.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : fetched?.content_type?.startsWith("image/")
            ? fetched.content_type
            : "image/unknown";
    if (inferredContentType.includes("pdf")) {
        const parsedPdf = await pdfParse(buffer);
        return JSON.stringify({
            source_url: fetched?.source_url ?? pdfOrImagePath ?? "unknown",
            access_date: new Date().toISOString(),
            retrieval_mode: "ocr",
            content_type: inferredContentType,
            extracted_text: parsedPdf.text.trim(),
            page_count: parsedPdf.numpages,
        }, null, 2);
    }
    const ocrResult = await Tesseract.recognize(buffer, "ara+eng");
    return JSON.stringify({
        source_url: fetched?.source_url ?? pdfOrImagePath ?? "unknown",
        access_date: new Date().toISOString(),
        retrieval_mode: "ocr",
        content_type: inferredContentType,
        extracted_text: ocrResult.data.text.trim(),
    }, null, 2);
}, {
    name: "ocr_visual_extraction",
    description: "Extracts text from PDFs or images using PDF parsing when possible and OCR otherwise.",
    schema: z.object({
        documentPayload: z.string().optional(),
        pdfOrImagePath: z.string().optional(),
    }),
});
