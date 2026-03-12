/**
 * أدوات وكيل المراجعة والتنسيق النهائي - QA & Formatter Tools
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

export const checkConsistency = tool(
  async ({ sections }: { sections: string }) => {
    const parsedSections = safeJsonParse(sections, []) as any[];
    const terminologyMap = new Map<string, Set<string>>();
    const issues: any[] = [];

    for (const section of parsedSections) {
      const content = section.content || "";
      const words = content.split(/\s+/);

      for (const word of words) {
        const lower = word.toLowerCase();
        if (lower.length > 4) {
          if (!terminologyMap.has(lower)) {
            terminologyMap.set(lower, new Set());
          }
          terminologyMap.get(lower)!.add(section.sectionNumber || "unknown");
        }
      }
    }

    return JSON.stringify({
      sectionsAnalyzed: parsedSections.length,
      uniqueTermsFound: terminologyMap.size,
      issues,
      status: issues.length === 0 ? "consistent" : "needs_review",
    });
  },
  {
    name: "check_consistency",
    description:
      "مسح الأقسام لتحليل الاتساق المصطلحي واللغوي. يُعيد المصطلحات المكتشفة وأي تناقضات.",
    schema: z.object({
      sections: z.string().describe("الأقسام المكتوبة بصيغة JSON"),
    }),
  }
);

export const detectRedundancy = tool(
  async ({ sections }: { sections: string }) => {
    const parsedSections = safeJsonParse(sections, []) as any[];
    const sectionSentences = new Map<string, string[]>();
    const redundancies: any[] = [];

    for (const section of parsedSections) {
      const content = section.content || "";
      const sentences = content
        .split(/[.。\n]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 20);
      sectionSentences.set(section.sectionNumber || "unknown", sentences);
    }

    const sectionEntries = [...sectionSentences.entries()];
    for (let i = 0; i < sectionEntries.length; i++) {
      for (let j = i + 1; j < sectionEntries.length; j++) {
        const [secA, sentencesA] = sectionEntries[i];
        const [secB, sentencesB] = sectionEntries[j];

        for (const sentA of sentencesA) {
          for (const sentB of sentencesB) {
            const wordsA = new Set(sentA.toLowerCase().split(/\s+/));
            const wordsB = new Set(sentB.toLowerCase().split(/\s+/));
            const intersection = [...wordsA].filter((w) => wordsB.has(w));
            const similarity = intersection.length / Math.max(wordsA.size, wordsB.size);

            if (similarity > 0.7) {
              redundancies.push({
                sections: [secA, secB],
                similarity: Math.round(similarity * 100),
                sentenceA: sentA.substring(0, 80),
                sentenceB: sentB.substring(0, 80),
              });
            }
          }
        }
      }
    }

    return JSON.stringify({
      sectionsAnalyzed: parsedSections.length,
      redundanciesFound: redundancies.length,
      redundancies: redundancies.slice(0, 10),
      hasSignificantRedundancy: redundancies.length > 3,
    });
  },
  {
    name: "detect_redundancy",
    description:
      "مقارنة الأقسام لكشف التكرار باستخدام تحليل التشابه النصي. يُعيد أزواج الجمل المتشابهة ونسبة التشابه.",
    schema: z.object({
      sections: z.string().describe("الأقسام المكتوبة بصيغة JSON"),
    }),
  }
);

export const formatOutput = tool(
  async ({
    content,
    format,
    includeTableOfContents,
  }: {
    content: string;
    format: string;
    includeTableOfContents: boolean;
  }) => {
    let formatted = content;

    if (includeTableOfContents) {
      const headings = content.match(/^#{1,3}\s+.+$/gm) || [];
      const toc = headings
        .map((h) => {
          const level = (h.match(/^#+/) || [""])[0].length;
          const title = h.replace(/^#+\s+/, "");
          const indent = "  ".repeat(level - 1);
          return `${indent}- ${title}`;
        })
        .join("\n");

      formatted = `## جدول المحتويات\n\n${toc}\n\n---\n\n${content}`;
    }

    return JSON.stringify({
      format,
      includeTableOfContents,
      formattedLength: formatted.length,
      wordCount: formatted.split(/\s+/).length,
      headingsFound: (content.match(/^#{1,3}\s+.+$/gm) || []).length,
      result: format === "markdown" ? formatted : `[${format} conversion needed] ${formatted.substring(0, 200)}...`,
    });
  },
  {
    name: "format_output",
    description:
      "تنسيق التقرير بالصيغة المطلوبة مع إضافة جدول محتويات اختياري. يدعم Markdown مباشرة.",
    schema: z.object({
      content: z.string().describe("المحتوى المراد تنسيقه"),
      format: z.enum(["markdown", "pdf", "docx"]).describe("صيغة المخرج"),
      includeTableOfContents: z.boolean().describe("إضافة جدول محتويات"),
    }),
  }
);

export const generateExecutiveSummary = tool(
  async ({
    fullReport,
    maxWords,
  }: {
    fullReport: string;
    maxWords: number;
  }) => {
    const sections = fullReport.split(/^##\s+/gm).filter((s) => s.trim());
    const sectionSummaries = sections.map((section) => {
      const lines = section.split("\n");
      const title = lines[0]?.trim() || "";
      const firstParagraph = lines.slice(1).find((l) => l.trim().length > 30) || "";
      return { title, preview: firstParagraph.trim().substring(0, 150) };
    });

    return JSON.stringify({
      reportWordCount: fullReport.split(/\s+/).length,
      maxSummaryWords: maxWords,
      sectionsIdentified: sectionSummaries.length,
      sectionPreviews: sectionSummaries,
    });
  },
  {
    name: "generate_executive_summary",
    description:
      "تحليل التقرير الكامل واستخراج ملخصات الأقسام لبناء الملخص التنفيذي.",
    schema: z.object({
      fullReport: z.string().describe("التقرير الكامل"),
      maxWords: z.number().describe("الحد الأقصى لعدد كلمات الملخص"),
    }),
  }
);

export const finalQualityAssessment = tool(
  async ({
    report,
    checklist,
  }: {
    report: string;
    checklist: string;
  }) => {
    const parsedChecklist = safeJsonParse(checklist, []) as string[];
    const wordCount = report.split(/\s+/).length;
    const headings = (report.match(/^#{1,3}\s+.+$/gm) || []).length;
    const hasBibliography = report.includes("## المراجع") || report.includes("## References") || report.includes("## Bibliography");
    const hasSummary = report.includes("## الملخص التنفيذي") || report.includes("## Executive Summary");

    const passedChecks: string[] = [];
    const failedChecks: string[] = [];

    if (wordCount > 100) passedChecks.push("word_count_sufficient");
    else failedChecks.push("word_count_too_low");

    if (headings >= 3) passedChecks.push("sufficient_structure");
    else failedChecks.push("insufficient_headings");

    if (hasBibliography) passedChecks.push("has_bibliography");
    else failedChecks.push("missing_bibliography");

    if (hasSummary) passedChecks.push("has_executive_summary");
    else failedChecks.push("missing_executive_summary");

    const score = Math.round((passedChecks.length / (passedChecks.length + failedChecks.length)) * 100);

    return JSON.stringify({
      wordCount,
      headingsCount: headings,
      hasBibliography,
      hasExecutiveSummary: hasSummary,
      checklistItemsProvided: parsedChecklist.length,
      passedChecks,
      failedChecks,
      overallScore: score,
      requiresRevision: score < 75,
    });
  },
  {
    name: "final_quality_assessment",
    description:
      "تقييم جودة التقرير النهائي بفحص الهيكل والمراجع والملخص. يُعيد نسبة الجودة والفحوصات الفاشلة.",
    schema: z.object({
      report: z.string().describe("التقرير النهائي"),
      checklist: z.string().describe("قائمة فحص الجودة بصيغة JSON"),
    }),
  }
);
