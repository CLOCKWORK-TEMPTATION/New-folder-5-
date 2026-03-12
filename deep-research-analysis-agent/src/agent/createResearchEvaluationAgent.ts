import { BaseStore, MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { toolStrategy } from "langchain";
import {
  CompositeBackend,
  createDeepAgent,
  FilesystemBackend,
  StoreBackend,
  type CompiledSubAgent,
} from "deepagents";

import {
  assertRequiredEnvironment,
  ensureRuntimeLayout,
  getAgentSettings,
  getProjectPaths,
} from "../config.js";
import { FileMemoryStore } from "../storage/FileMemoryStore.js";
import { createAnalysisTools } from "../tools/analysis.js";
import { createSearchTools } from "../tools/search.js";
import { createSourceTools } from "../tools/source.js";
import {
  CONTRADICTION_GAP_PROMPT,
  COORDINATOR_SYSTEM_PROMPT,
  CREDIBILITY_VERIFIER_PROMPT,
  FACT_EXTRACTOR_PROMPT,
  RESEARCH_DISCOVERY_PROMPT,
} from "./prompts.js";
import { createResearchContextMiddleware } from "./middleware.js";
import {
  credibilityResponseSchema,
  discoveryResponseSchema,
  factExtractionResponseSchema,
  finalResponseSchema,
  gapDetectionResponseSchema,
  researchContextSchema,
} from "./schemas.js";

function createOpenAiModel(model: string, temperature: number, apiKey: string) {
  return new ChatOpenAI({
    apiKey,
    model,
    temperature,
  });
}

export function createResearchEvaluationAgent() {
  assertRequiredEnvironment();

  const paths = getProjectPaths();
  ensureRuntimeLayout(paths);

  const settings = getAgentSettings();
  const store = new FileMemoryStore(paths.storeDataFile);
  const contextMiddleware = createResearchContextMiddleware();

  const coordinatorModel = createOpenAiModel(
    settings.coordinatorModel,
    settings.coordinatorTemperature,
    settings.openAiApiKey,
  );
  const researchModel = createOpenAiModel(
    settings.researchModel,
    settings.subagentTemperature,
    settings.openAiApiKey,
  );
  const verifierModel = createOpenAiModel(
    settings.verifierModel,
    settings.subagentTemperature,
    settings.openAiApiKey,
  );
  const extractorModel = createOpenAiModel(
    settings.extractorModel,
    settings.subagentTemperature,
    settings.openAiApiKey,
  );
  const detectorModel = createOpenAiModel(
    settings.detectorModel,
    settings.subagentTemperature,
    settings.openAiApiKey,
  );

  const { internetSearch } = createSearchTools();
  const { fetchSourceContent, inspectSourceCredibility } = createSourceTools({
    userAgent: settings.userAgent,
  });
  const {
    extractCandidateFacts,
    clusterFactsByTopic,
    findNumericDisagreements,
  } = createAnalysisTools();

  const backendFactory = (config: { state: unknown; store?: BaseStore }) =>
    new CompositeBackend(
      new FilesystemBackend({
        rootDir: paths.runtimeRoot,
        virtualMode: true,
      }),
      {
        "/memories": new StoreBackend(config, {
          namespace: ["deep-research-analysis-agent", "long-term-memory"],
        }),
      },
    );

  const createCompiledSubagent = (options: {
    name: string;
    description: string;
    systemPrompt: string;
    model: ChatOpenAI;
    tools: readonly unknown[];
    responseFormat: unknown;
  }): CompiledSubAgent => ({
    name: options.name,
    description: options.description,
    runnable: createDeepAgent({
      name: options.name,
      model: options.model,
      systemPrompt: options.systemPrompt,
      tools: options.tools as never,
      responseFormat: options.responseFormat as never,
      contextSchema: researchContextSchema,
      middleware: [contextMiddleware as never],
      backend: backendFactory,
      store,
      checkpointer: new MemorySaver(),
      memory: ["/memory/AGENTS.md"],
    }),
  });

  const subagents: CompiledSubAgent[] = [
    createCompiledSubagent({
      name: "research_discovery_agent",
      description:
        "Finds candidate sources, fetches promising pages, and writes source dossiers for the research objective.",
      systemPrompt: RESEARCH_DISCOVERY_PROMPT,
      model: researchModel,
      tools: [internetSearch, fetchSourceContent],
      responseFormat: toolStrategy(discoveryResponseSchema),
    }),
    createCompiledSubagent({
      name: "credibility_verifier",
      description:
        "Evaluates whether a source is trustworthy, fresh, biased, or conflicted.",
      systemPrompt: CREDIBILITY_VERIFIER_PROMPT,
      model: verifierModel,
      tools: [fetchSourceContent, inspectSourceCredibility],
      responseFormat: toolStrategy(credibilityResponseSchema),
    }),
    createCompiledSubagent({
      name: "fact_extractor_relevance_filter",
      description:
        "Extracts only the most relevant facts from the collected material and filters out noise.",
      systemPrompt: FACT_EXTRACTOR_PROMPT,
      model: extractorModel,
      tools: [fetchSourceContent, extractCandidateFacts],
      responseFormat: toolStrategy(factExtractionResponseSchema),
    }),
    createCompiledSubagent({
      name: "contradiction_gap_detector",
      description:
        "Compares extracted facts, identifies contradictions, and decides whether another research round is needed.",
      systemPrompt: CONTRADICTION_GAP_PROMPT,
      model: detectorModel,
      tools: [clusterFactsByTopic, findNumericDisagreements],
      responseFormat: toolStrategy(gapDetectionResponseSchema),
    }),
  ];

  const agent = createDeepAgent({
    name: "research_analysis_orchestrator",
    model: coordinatorModel,
    systemPrompt: COORDINATOR_SYSTEM_PROMPT,
    tools: [internetSearch, fetchSourceContent],
    subagents,
    responseFormat: toolStrategy(finalResponseSchema),
    contextSchema: researchContextSchema,
    middleware: [contextMiddleware as never],
    backend: backendFactory,
    store,
    checkpointer: new MemorySaver(),
    memory: ["/memory/AGENTS.md"],
  });

  return {
    agent,
    paths,
    settings,
  };
}
