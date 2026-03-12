import { extractCoreContentTool, ocrVisualExtractionTool } from "../tools/index.js";
import { SYSTEM_PROMPTS } from "../prompts/index.js";

export const parserCleanerAgent = {
  name: "parser-cleaner-agent",
  description: "Responsible for stripping raw content of ads, side menus, boilerplate text, keeping only the core semantic content.",
  systemPrompt: SYSTEM_PROMPTS.PARSER_CLEANER,
  tools: [extractCoreContentTool, ocrVisualExtractionTool],
};
