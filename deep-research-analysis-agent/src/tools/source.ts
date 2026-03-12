import { tool } from "langchain";
import { z } from "zod";

import { assessCredibility, fetchSource } from "../utils/source.js";

interface SourceToolConfig {
  userAgent: string;
}

export function createSourceTools(config: SourceToolConfig) {
  const fetchSourceContent = tool(
    async ({
      url,
      maxCharacters = 12_000
    }: {
      url: string;
      maxCharacters?: number;
    }) => {
      const source = await fetchSource(url, config.userAgent, maxCharacters);
      return JSON.stringify(source, null, 2);
    },
    {
      name: "fetch_source_content",
      description:
        "Fetch a URL and extract the main readable text plus metadata such as title, author, and publication date.",
      schema: z.object({
        url: z.string().url().describe("The page URL to fetch."),
        maxCharacters: z
          .number()
          .int()
          .min(1000)
          .max(30000)
          .optional()
          .default(12000)
          .describe("Maximum number of text characters to keep.")
      })
    }
  );

  const inspectSourceCredibility = tool(
    async ({ url }: { url: string }) => {
      const source = await fetchSource(url, config.userAgent, 10_000);
      const assessment = assessCredibility(source);

      return JSON.stringify(
        {
          source: {
            url: source.finalUrl,
            hostname: source.hostname,
            title: source.title,
            publishedAt: source.publishedAt
          },
          assessment
        },
        null,
        2
      );
    },
    {
      name: "inspect_source_credibility",
      description:
        "Inspect a source for trust signals, likely bias, publication freshness, and conflict-of-interest flags.",
      schema: z.object({
        url: z.string().url().describe("The source URL to assess.")
      })
    }
  );

  return {
    fetchSourceContent,
    inspectSourceCredibility
  };
}
