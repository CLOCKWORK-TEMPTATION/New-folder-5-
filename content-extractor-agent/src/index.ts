import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";
import { createDeepAgent } from "deepagents";

import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { fetchAgent, normalizerAgent, parserCleanerAgent } from "./subagents/index.js";

function getRequestedUrl(): string {
  const candidate = process.argv[2]?.trim();
  return candidate || "https://example.com";
}

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error(
      "Missing OPENAI_API_KEY. Copy .env.example to .env and set your key before running the agent.",
    );
  }

  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    temperature: Number(process.env.OPENAI_TEMPERATURE ?? "0"),
  });

  const contentExtractionAgent = createDeepAgent({
    name: "content_extraction_orchestrator",
    model,
    systemPrompt: SYSTEM_PROMPTS.ORCHESTRATOR,
    tools: [],
    subagents: [fetchAgent, parserCleanerAgent, normalizerAgent],
  });

  const requestedUrl = getRequestedUrl();
  console.log("Starting the Content Extraction Deep Agent pipeline...");
  console.log(`Target URL: ${requestedUrl}`);

  const result = await contentExtractionAgent.invoke({
    messages: [
      {
        role: "user",
        content: `قم باستخراج المحتوى من الرابط التالي بصيغة JSON النهائية الموحدة فقط: ${requestedUrl}`,
      },
    ],
  } as never);

  console.log("Final Output:\n", result);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown execution error.";
  console.error(message);
  process.exitCode = 1;
});
