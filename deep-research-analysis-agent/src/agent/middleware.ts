import { dynamicSystemPromptMiddleware } from "langchain";

import type { ResearchContext } from "./schemas.js";

export function createResearchContextMiddleware() {
  return dynamicSystemPromptMiddleware<ResearchContext>((_state, runtime) => {
    const context = runtime.context;

    return `Current research context:
- Objective: ${context.objective}
- Domain hint: ${context.domainHint ?? "none provided"}
- Requested depth: ${context.requestedDepth}
- Freshness preference: ${context.freshnessPreference}
- Minimum credibility score: ${context.minCredibilityScore}
- Maximum sources to prioritize: ${context.maxSources}
- Current round: ${context.currentRound}
- Memory namespace: ${context.memoryNamespace}`;
  });
}
