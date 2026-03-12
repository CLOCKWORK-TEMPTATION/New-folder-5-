import { tool } from "langchain";
import { z } from "zod";

import {
  extractNumbers,
  jaccardSimilarity,
  keywordOverlapScore,
  splitIntoSentences,
  tokenize,
  uniqueBy
} from "../utils/text.js";

const factItemSchema = z.object({
  statement: z.string(),
  sourceUrl: z.string().url().optional(),
  sourceLabel: z.string().optional()
});

interface FactItem {
  statement: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

export function createAnalysisTools() {
  const extractCandidateFacts = tool(
    async ({
      objective,
      content,
      sourceLabel,
      maxFacts = 8
    }: {
      objective: string;
      content: string;
      sourceLabel?: string;
      maxFacts?: number;
    }) => {
      const objectiveKeywords = uniqueBy(tokenize(objective), (token) => token).slice(
        0,
        12
      );
      const sentences = splitIntoSentences(content, 300);

      const scoredFacts = sentences
        .map((sentence) => {
          const overlap = keywordOverlapScore(sentence, objectiveKeywords);
          const numbers = extractNumbers(sentence);
          const score =
            overlap * 2 +
            (numbers.length > 0 ? 1 : 0) +
            (sentence.length >= 50 && sentence.length <= 250 ? 1 : 0);

          return {
            statement: sentence,
            score,
            matchedKeywords: objectiveKeywords.filter((keyword) =>
              tokenize(sentence).includes(keyword)
            ),
            includesNumbers: numbers.length > 0
          };
        })
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, maxFacts);

      return JSON.stringify(
        {
          objective,
          sourceLabel,
          facts: scoredFacts
        },
        null,
        2
      );
    },
    {
      name: "extract_candidate_facts",
      description:
        "Extract likely high-signal factual statements from source content based on the research objective.",
      schema: z.object({
        objective: z.string().describe("The original research objective."),
        content: z.string().describe("Source content to mine for facts."),
        sourceLabel: z
          .string()
          .optional()
          .describe("Optional label for the source under analysis."),
        maxFacts: z
          .number()
          .int()
          .min(3)
          .max(15)
          .optional()
          .default(8)
          .describe("Maximum number of candidate facts to return.")
      })
    }
  );

  const clusterFactsByTopic = tool(
    async ({ facts }: { facts: FactItem[] }) => {
      const groups: Array<{
        topicKeywords: string[];
        items: FactItem[];
        tokenSet: Set<string>;
      }> = [];

      for (const fact of facts) {
        const tokens = tokenize(fact.statement).slice(0, 10);
        const tokenSet = new Set(tokens);
        let assigned = false;

        for (const group of groups) {
          const similarity = jaccardSimilarity(tokenSet, group.tokenSet);
          if (similarity >= 0.25) {
            group.items.push(fact);
            for (const token of tokenSet) {
              group.tokenSet.add(token);
            }
            assigned = true;
            break;
          }
        }

        if (!assigned) {
          groups.push({
            topicKeywords: tokens.slice(0, 5),
            items: [fact],
            tokenSet
          });
        }
      }

      return JSON.stringify(
        {
          groups: groups.map((group, index) => ({
            index: index + 1,
            topicKeywords: Array.from(group.tokenSet).slice(0, 6),
            facts: group.items
          }))
        },
        null,
        2
      );
    },
    {
      name: "cluster_facts_by_topic",
      description:
        "Group extracted facts into approximate topical clusters to aid contradiction and gap analysis.",
      schema: z.object({
        facts: z
          .array(factItemSchema)
          .min(1)
          .describe("Extracted facts to cluster by topic.")
      })
    }
  );

  const findNumericDisagreements = tool(
    async ({ facts }: { facts: FactItem[] }) => {
      const disagreements: Array<{
        statementA: string;
        statementB: string;
        numbersA: string[];
        numbersB: string[];
        commonTerms: string[];
        sourceA: string | undefined;
        sourceB: string | undefined;
      }> = [];

      for (let index = 0; index < facts.length; index += 1) {
        for (let otherIndex = index + 1; otherIndex < facts.length; otherIndex += 1) {
          const left = facts[index];
          const right = facts[otherIndex];
          if (!left || !right) {
            continue;
          }

          const leftTokens = tokenize(left.statement);
          const rightTokens = tokenize(right.statement);
          const similarity = jaccardSimilarity(leftTokens, rightTokens);
          const numbersA = extractNumbers(left.statement);
          const numbersB = extractNumbers(right.statement);

          if (
            similarity >= 0.2 &&
            numbersA.length > 0 &&
            numbersB.length > 0 &&
            JSON.stringify(numbersA) !== JSON.stringify(numbersB)
          ) {
            disagreements.push({
              statementA: left.statement,
              statementB: right.statement,
              numbersA,
              numbersB,
              commonTerms: leftTokens
                .filter((token) => rightTokens.includes(token))
                .slice(0, 6),
              sourceA: left.sourceUrl ?? left.sourceLabel,
              sourceB: right.sourceUrl ?? right.sourceLabel
            });
          }
        }
      }

      return JSON.stringify(
        {
          disagreements
        },
        null,
        2
      );
    },
    {
      name: "find_numeric_disagreements",
      description:
        "Compare similar fact statements and surface disagreements in numbers, percentages, or dates.",
      schema: z.object({
        facts: z
          .array(factItemSchema)
          .min(2)
          .describe("Extracted facts to compare for disagreements.")
      })
    }
  );

  return {
    extractCandidateFacts,
    clusterFactsByTopic,
    findNumericDisagreements
  };
}
