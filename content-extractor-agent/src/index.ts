import dotenv from "dotenv";
import path from "path";

const rootEnvPath = path.resolve(__dirname, "../../.env");
const rootEnvResult = dotenv.config({ path: rootEnvPath, override: true });

if (rootEnvResult.error) {
  throw new Error(
    `Missing root environment file at ${rootEnvPath}. This agent reads configuration from the repository root .env only.`,
  );
}

import { ChatOpenAI } from "@langchain/openai";
import { createDeepAgent } from "deepagents";

import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { fetchAgent, normalizerAgent, parserCleanerAgent } from "./subagents/index.js";
import { parseEnvelope } from "./types/adapter.js";

function getRequestedUrl(): string {
  const candidate = process.argv[2]?.trim();
  return candidate || "https://example.com";
}

async function main() {
  const envelopePayload = await readEnvelopeInput();
  if (envelopePayload) {
    const envelope = parseEnvelope(envelopePayload);
    console.log(
      JSON.stringify(
        {
          metadata: {
            protocolVersion: envelope.protocolVersion,
            runId: envelope.runId,
            taskId: envelope.taskId,
            stage: envelope.workflowStage,
            processedBy: "content-extractor-agent",
            timestamp: new Date().toISOString(),
          },
          results: envelope.inputs.artifacts.map((url) => ({
            source: url,
            extracted: true,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error(
      "Missing OPENAI_API_KEY in the repository root .env file.",
    );
  }

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY.trim(),
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

async function readEnvelopeInput(): Promise<unknown | null> {
  const fromArg = process.argv.find((arg) => arg.startsWith("--envelope-path="));
  if (fromArg) {
    const envelopePath = fromArg.split("=")[1];
    if (!envelopePath) {
      throw new Error("Missing value for --envelope-path.");
    }
    const fs = await import("node:fs/promises");
    return JSON.parse(await fs.readFile(envelopePath, "utf-8"));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return null;
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) return null;
  return JSON.parse(raw);
}
