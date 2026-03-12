import { normalizeToSchemaTool } from "../tools/index.js";
import { SYSTEM_PROMPTS } from "../prompts/index.js";

export const normalizerAgent = {
  name: "normalizer-agent",
  description: "Responsible for transforming cleaned content into a single unified JSON schema.",
  systemPrompt: SYSTEM_PROMPTS.NORMALIZER,
  tools: [normalizeToSchemaTool],
};
