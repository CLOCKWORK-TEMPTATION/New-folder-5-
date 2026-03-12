import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { normalizeCleanedDocument } from "../utils/document.js";

export const normalizeToSchemaTool = tool(
  async ({
    cleanedDocument,
    cleanedHtml,
  }: {
    cleanedDocument?: string;
    cleanedHtml?: string;
  }) => {
    const input = cleanedDocument ?? cleanedHtml;
    if (!input) {
      throw new Error("Provide cleanedDocument or cleanedHtml.");
    }

    const normalized = normalizeCleanedDocument(input);
    return JSON.stringify(normalized, null, 2);
  },
  {
    name: "normalize_to_unified_schema",
    description:
      "Converts cleaned semantic content into the unified JSON schema required by the extraction pipeline.",
    schema: z.object({
      cleanedDocument: z.string().optional(),
      cleanedHtml: z.string().optional(),
    }),
  },
);
