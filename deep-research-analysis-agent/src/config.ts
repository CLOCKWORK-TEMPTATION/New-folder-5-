import "dotenv/config";

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MEMORY_GUIDE = `# Research Analysis Memory

## Mission

Produce evidence-based research evaluations by separating source collection, credibility review, fact extraction, and contradiction analysis.

## File Discipline

- Save raw source notes under /workspace/collection/.
- Save credibility scorecards under /workspace/credibility/.
- Save extracted fact sheets under /workspace/facts/.
- Save contradiction and gap briefs under /workspace/gaps/.
- Save the final answer under /workspace/reports/final-report.md.
- Save reusable cross-session memory under /memories/.

## Review Discipline

- Do not trust a claim until it is tied to a source.
- Prefer recent and primary sources when available.
- Explicitly mark uncertainty and unresolved gaps.
- If gaps remain material, ask for another research pass with focused queries.
- Store only durable lessons or reusable domain notes in /memories/.
`;

export interface ProjectPaths {
  projectRoot: string;
  runtimeRoot: string;
  workspaceRoot: string;
  memoryRoot: string;
  reportsRoot: string;
  storeRoot: string;
  storeDataFile: string;
}

export interface AgentSettings {
  coordinatorModel: string;
  researchModel: string;
  verifierModel: string;
  extractorModel: string;
  detectorModel: string;
  coordinatorTemperature: number;
  subagentTemperature: number;
  userAgent: string;
  tracingEnabled: boolean;
}

export const DEFAULT_THREAD_ID = "default-research-analysis-thread";

export function getProjectPaths(): ProjectPaths {
  const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const runtimeRoot = resolve(projectRoot, "runtime");
  const workspaceRoot = resolve(runtimeRoot, "workspace");
  const memoryRoot = resolve(runtimeRoot, "memory");
  const reportsRoot = resolve(workspaceRoot, "reports");
  const storeRoot = resolve(runtimeRoot, "store");
  const storeDataFile = resolve(storeRoot, "file-store.json");

  return {
    projectRoot,
    runtimeRoot,
    workspaceRoot,
    memoryRoot,
    reportsRoot,
    storeRoot,
    storeDataFile,
  };
}

export function ensureRuntimeLayout(paths: ProjectPaths): void {
  const requiredDirectories = [
    paths.runtimeRoot,
    paths.workspaceRoot,
    resolve(paths.workspaceRoot, "collection"),
    resolve(paths.workspaceRoot, "credibility"),
    resolve(paths.workspaceRoot, "facts"),
    resolve(paths.workspaceRoot, "gaps"),
    paths.reportsRoot,
    paths.memoryRoot,
    paths.storeRoot,
  ];

  for (const directory of requiredDirectories) {
    mkdirSync(directory, { recursive: true });
  }

  const memoryGuidePath = resolve(paths.memoryRoot, "AGENTS.md");
  if (!existsSync(memoryGuidePath)) {
    writeFileSync(memoryGuidePath, MEMORY_GUIDE, "utf8");
  }
}

export function getAgentSettings(): AgentSettings {
  const baseModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const tracingEnabled = Boolean(process.env.LANGSMITH_API_KEY?.trim());

  if (tracingEnabled) {
    process.env.LANGSMITH_TRACING = process.env.LANGSMITH_TRACING || "true";
    process.env.LANGCHAIN_TRACING_V2 =
      process.env.LANGCHAIN_TRACING_V2 || "true";
    process.env.LANGSMITH_PROJECT =
      process.env.LANGSMITH_PROJECT || "deep-research-analysis-agent";
  }

  return {
    coordinatorModel:
      process.env.OPENAI_COORDINATOR_MODEL?.trim() || baseModel,
    researchModel: process.env.OPENAI_RESEARCH_MODEL?.trim() || baseModel,
    verifierModel: process.env.OPENAI_VERIFIER_MODEL?.trim() || baseModel,
    extractorModel: process.env.OPENAI_EXTRACTOR_MODEL?.trim() || baseModel,
    detectorModel: process.env.OPENAI_DETECTOR_MODEL?.trim() || baseModel,
    coordinatorTemperature: Number(
      process.env.OPENAI_COORDINATOR_TEMPERATURE ?? "0",
    ),
    subagentTemperature: Number(
      process.env.OPENAI_SUBAGENT_TEMPERATURE ?? "0",
    ),
    userAgent:
      process.env.DEEP_AGENT_USER_AGENT?.trim() ||
      "deep-research-analysis-agent/0.1",
    tracingEnabled,
  };
}

export function assertRequiredEnvironment(): void {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error(
      "Missing OPENAI_API_KEY. Copy .env.example to .env and set your key before running the agent.",
    );
  }
}
