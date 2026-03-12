import { tool } from "langchain";
import { SafeSearchType, search } from "duck-duck-scrape";
import { z } from "zod";

import { truncate } from "../utils/text.js";

export function createSearchTools() {
  const internetSearch = tool(
    async ({
      query,
      maxResults = 5
    }: {
      query: string;
      maxResults?: number;
    }) => {
      const result = await search(query, {
        safeSearch: SafeSearchType.MODERATE
      });

      const items = result.results.slice(0, maxResults).map((item, index) => ({
        rank: index + 1,
        title: item.title,
        url: item.url,
        snippet: truncate(item.description ?? "", 400),
        hostname: item.hostname ?? new URL(item.url).hostname
      }));

      return JSON.stringify(
        {
          query,
          returned: items.length,
          results: items
        },
        null,
        2
      );
    },
    {
      name: "internet_search",
      description:
        "Search the web for candidate sources related to a research objective.",
      schema: z.object({
        query: z.string().describe("The web search query to run."),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe("How many results to return.")
      })
    }
  );

  return {
    internetSearch
  };
}
