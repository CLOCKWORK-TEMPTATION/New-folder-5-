import { fetchWebpageTool, fetchWithHeadlessBrowserTool } from "../tools/index.js";
import { SYSTEM_PROMPTS } from "../prompts/index.js";

export const fetchAgent = {
  name: "fetch-agent",
  description: "Responsible for actually visiting URLs and downloading raw content (HTML, PDF, JSON). Handles redirects, timeouts, and JS rendered pages.",
  systemPrompt: SYSTEM_PROMPTS.FETCH_AGENT,
  tools: [fetchWebpageTool, fetchWithHeadlessBrowserTool],
};
