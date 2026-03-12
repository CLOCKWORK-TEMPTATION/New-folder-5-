import { parseArgs } from "node:util";

import { DEFAULT_THREAD_ID } from "./config.js";
import { createResearchEvaluationAgent } from "./agent/createResearchEvaluationAgent.js";
import { researchContextSchema } from "./agent/schemas.js";

function extractText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (
          item &&
          typeof item === "object" &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }

        return JSON.stringify(item);
      })
      .join("\n");
  }

  return JSON.stringify(content, null, 2);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      query: {
        type: "string"
      },
      thread: {
        type: "string"
      },
      json: {
        type: "boolean",
        default: false
      },
      depth: {
        type: "string"
      },
      freshness: {
        type: "string"
      },
      "max-sources": {
        type: "string"
      },
      "min-credibility": {
        type: "string"
      },
      "domain-hint": {
        type: "string"
      },
      "memory-namespace": {
        type: "string"
      }
    }
  });

  const query = values.query?.trim() || positionals.join(" ").trim();
  if (!query) {
    throw new Error(
      "Missing research objective. Pass --query \"...\" or provide a positional prompt."
    );
  }

  const threadId = values.thread?.trim() || DEFAULT_THREAD_ID;
  const { agent, paths } = createResearchEvaluationAgent();
  const context = researchContextSchema.parse({
    objective: query,
    domainHint: values["domain-hint"]?.trim() || undefined,
    requestedDepth: values.depth?.trim() || "deep",
    freshnessPreference: values.freshness?.trim() || "recent-preferred",
    minCredibilityScore: Number(values["min-credibility"] ?? "65"),
    maxSources: Number(values["max-sources"] ?? "8"),
    currentRound: 1,
    memoryNamespace:
      values["memory-namespace"]?.trim() || "default"
  });

  const result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: `Research objective:

${query}

Use the specialized subagents, save intermediate artifacts, and write the final report to /workspace/reports/final-report.md.`
        }
      ]
    } as never,
    {
      configurable: {
        thread_id: threadId
      },
      context
    }
  );

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const output = result as {
    messages?: Array<{ content?: unknown }>;
    structuredResponse?: unknown;
  };

  const messages =
    output && Array.isArray(output.messages) ? output.messages : [];
  const finalMessage = messages.at(-1);
  const structuredResponse = output.structuredResponse;

  if (structuredResponse) {
    console.log(JSON.stringify(structuredResponse, null, 2));
  } else {
    console.log(extractText(finalMessage?.content ?? result));
  }
  console.log("");
  console.log(`Artifacts root: ${paths.workspaceRoot}`);
  console.log(`Report file: ${paths.reportsRoot}\\final-report.md`);
  console.log(`Memory store: ${paths.storeDataFile}`);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown error while running the agent.";
  console.error(message);
  process.exitCode = 1;
});
