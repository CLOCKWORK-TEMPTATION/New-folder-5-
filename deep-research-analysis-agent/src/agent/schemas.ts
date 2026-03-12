import { z } from "zod";

export const researchContextSchema = z.object({
  objective: z.string().min(1),
  domainHint: z.string().optional(),
  requestedDepth: z.enum(["brief", "standard", "deep"]).default("deep"),
  freshnessPreference: z
    .enum(["strict-recent", "recent-preferred", "historical-ok"])
    .default("recent-preferred"),
  minCredibilityScore: z.number().int().min(0).max(100).default(65),
  maxSources: z.number().int().min(3).max(20).default(8),
  currentRound: z.number().int().min(1).default(1),
  memoryNamespace: z.string().min(1).default("default"),
});

export type ResearchContext = z.infer<typeof researchContextSchema>;

export const discoveryResponseSchema = z.object({
  summary: z.string(),
  candidateSources: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
      relevanceReason: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      publishedAt: z.string().optional(),
      collectionFile: z.string().optional(),
    }),
  ),
  recommendedNextUrls: z.array(z.string().url()).max(10),
});

export const credibilityResponseSchema = z.object({
  summary: z.string(),
  trustedSources: z.array(
    z.object({
      url: z.string().url(),
      score: z.number().min(0).max(100),
      reason: z.string(),
      scorecardFile: z.string().optional(),
    }),
  ),
  questionableSources: z.array(
    z.object({
      url: z.string().url(),
      concern: z.string(),
      scorecardFile: z.string().optional(),
    }),
  ),
  weakSources: z.array(
    z.object({
      url: z.string().url(),
      concern: z.string(),
      scorecardFile: z.string().optional(),
    }),
  ),
  strongestSourceUrls: z.array(z.string().url()).max(10),
});

export const factExtractionResponseSchema = z.object({
  summary: z.string(),
  factFiles: z.array(z.string()),
  relevantFacts: z.array(
    z.object({
      statement: z.string(),
      sourceUrl: z.string().url().optional(),
      whyItMatters: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      sourceTier: z.enum(["primary", "secondary", "background", "unknown"]),
    }),
  ),
});

export const gapDetectionResponseSchema = z.object({
  summary: z.string(),
  needsMoreResearch: z.boolean(),
  contradictions: z.array(z.string()),
  unresolvedQuestions: z.array(z.string()),
  followUpQueries: z.array(z.string()),
  gapFilePath: z.string(),
});

export const finalResponseSchema = z.object({
  verdict: z.string(),
  executiveSummary: z.string(),
  strongestSources: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
      trustReason: z.string(),
    }),
  ),
  contradictionsOrGaps: z.array(z.string()),
  anotherResearchRoundNeeded: z.boolean(),
  reportPath: z.string(),
});
