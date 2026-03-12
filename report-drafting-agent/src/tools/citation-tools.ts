/**
 * أدوات وكيل التوثيق والمراجع - Citation & Evidence Linker Tools
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

function safeJsonParse(str: string, fallback: unknown = []): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export const linkClaimToSource = tool(
  async ({
    claim,
    sectionNumber,
    availableSources,
  }: {
    claim: string;
    sectionNumber: string;
    availableSources: string;
  }) => {
    const sources = safeJsonParse(availableSources, []) as any[];
    const claimWords = claim.toLowerCase().split(/\s+/);

    const scoredSources = sources.map((source: any) => {
      const sourceText = `${source.title || ""} ${source.content || ""}`.toLowerCase();
      let matchScore = 0;
      for (const word of claimWords) {
        if (word.length > 3 && sourceText.includes(word)) {
          matchScore++;
        }
      }
      return {
        sourceId: source.id,
        sourceTitle: source.title,
        matchScore,
        relevance: matchScore / Math.max(claimWords.length, 1),
      };
    });

    scoredSources.sort((a, b) => b.matchScore - a.matchScore);
    const bestMatch = scoredSources[0] || null;

    return JSON.stringify({
      claim,
      sectionNumber,
      sourcesEvaluated: sources.length,
      bestMatch,
      allMatches: scoredSources.filter((s) => s.matchScore > 0),
      verified: bestMatch !== null && bestMatch.matchScore > 0,
    });
  },
  {
    name: "link_claim_to_source",
    description:
      "مطابقة ادعاء مع أفضل مصدر متاح بناءً على تحليل التشابه النصي. يُعيد المصدر الأنسب ودرجة المطابقة.",
    schema: z.object({
      claim: z.string().describe("الادعاء أو الرقم المراد توثيقه"),
      sectionNumber: z.string().describe("رقم القسم"),
      availableSources: z.string().describe("قائمة المصادر المتاحة بصيغة JSON"),
    }),
  }
);

export const formatCitation = tool(
  async ({
    sourceId,
    sourceTitle,
    sourceAuthor,
    sourceDate,
    sourceUrl,
    format,
  }: {
    sourceId: string;
    sourceTitle: string;
    sourceAuthor?: string;
    sourceDate?: string;
    sourceUrl?: string;
    format: string;
  }) => {
    const author = sourceAuthor || "N/A";
    const year = sourceDate?.substring(0, 4) || "n.d.";
    let inTextCitation = "";
    let fullReference = "";

    switch (format) {
      case "APA":
        inTextCitation = `(${author}, ${year})`;
        fullReference = `${author} (${year}). ${sourceTitle}.${sourceUrl ? ` Retrieved from ${sourceUrl}` : ""}`;
        break;
      case "inline":
        inTextCitation = `[${sourceId}]`;
        fullReference = `[${sourceId}] ${author} - ${sourceTitle}${sourceUrl ? ` (${sourceUrl})` : ""}`;
        break;
      case "footnotes":
        inTextCitation = `[^${sourceId}]`;
        fullReference = `[^${sourceId}]: ${author}, "${sourceTitle}"${sourceDate ? `, ${sourceDate}` : ""}${sourceUrl ? `. ${sourceUrl}` : ""}`;
        break;
      default:
        inTextCitation = `[${sourceId}]`;
        fullReference = `[${sourceId}] ${sourceTitle}`;
    }

    return JSON.stringify({
      sourceId,
      inTextCitation,
      fullReference,
      format,
    });
  },
  {
    name: "format_citation",
    description:
      "توليد المراجع بالصيغة المطلوبة — APA, inline citations, أو footnotes. يُعيد المرجع داخل النص والمرجع الكامل.",
    schema: z.object({
      sourceId: z.string().describe("معرّف المصدر"),
      sourceTitle: z.string().describe("عنوان المصدر"),
      sourceAuthor: z.string().optional().describe("اسم المؤلف"),
      sourceDate: z.string().optional().describe("تاريخ النشر"),
      sourceUrl: z.string().optional().describe("رابط المصدر"),
      format: z.enum(["APA", "inline", "footnotes"]).describe("صيغة المرجع"),
    }),
  }
);

export const verifyCitationCompleteness = tool(
  async ({
    sections,
    citations,
  }: {
    sections: string;
    citations: string;
  }) => {
    const parsedSections = safeJsonParse(sections, []) as any[];
    const parsedCitations = safeJsonParse(citations, []) as any[];

    const citedSourceIds = new Set(parsedCitations.map((c: any) => c.sourceId));
    const claimsInSections: any[] = [];

    for (const section of parsedSections) {
      if (section.claims) {
        for (const claim of section.claims) {
          claimsInSections.push(claim);
        }
      }
    }

    const verifiedClaims = claimsInSections.filter((c: any) => c.sourceId && citedSourceIds.has(c.sourceId));
    const unverifiedClaims = claimsInSections.filter((c: any) => !c.sourceId || !citedSourceIds.has(c.sourceId));
    const unusedCitations = parsedCitations.filter(
      (c: any) => !claimsInSections.some((claim: any) => claim.sourceId === c.sourceId)
    );

    return JSON.stringify({
      totalClaims: claimsInSections.length,
      verifiedCount: verifiedClaims.length,
      unverifiedCount: unverifiedClaims.length,
      unverifiedClaims,
      unusedCitations: unusedCitations.map((c: any) => c.sourceId),
      completenessScore: claimsInSections.length > 0
        ? Math.round((verifiedClaims.length / claimsInSections.length) * 100)
        : 100,
      isComplete: unverifiedClaims.length === 0 && unusedCitations.length === 0,
    });
  },
  {
    name: "verify_citation_completeness",
    description:
      "التحقق من اكتمال التوثيق: كل ادعاء موثّق وكل مصدر مستخدم. يُعيد نسبة الاكتمال والادعاءات غير الموثّقة.",
    schema: z.object({
      sections: z.string().describe("الأقسام المكتوبة بصيغة JSON"),
      citations: z.string().describe("المراجع الموجودة بصيغة JSON"),
    }),
  }
);
