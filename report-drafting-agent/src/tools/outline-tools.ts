/**
 * أدوات وكيل هيكلة المحتوى - Outline Architect Tools
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

export const analyzeRawData = tool(
  async ({ data, topic }: { data: string; topic: string }) => {
    const sentences = data.split(/[.。\n]/).filter((s) => s.trim().length > 10);
    const keywords = new Map<string, number>();

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      for (const word of words) {
        if (word.length > 3) {
          keywords.set(word, (keywords.get(word) || 0) + 1);
        }
      }
    }

    const topKeywords = [...keywords.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    const mainTopics: string[] = [];
    const currentTopic: string[] = [];

    for (const sentence of sentences) {
      if (sentence.trim()) {
        if (currentTopic.length === 0 || currentTopic.length < 3) {
          currentTopic.push(sentence.trim());
        } else {
          mainTopics.push(currentTopic.join(". "));
          currentTopic.length = 0;
          currentTopic.push(sentence.trim());
        }
      }
    }
    if (currentTopic.length > 0) {
      mainTopics.push(currentTopic.join(". "));
    }

    return JSON.stringify({
      topic,
      totalSentences: sentences.length,
      totalCharacters: data.length,
      topKeywords,
      mainTopics,
      suggestedSectionCount: Math.max(3, Math.min(8, Math.ceil(sentences.length / 5))),
      complexity: sentences.length > 30 ? "high" : sentences.length > 15 ? "moderate" : "low",
    });
  },
  {
    name: "analyze_raw_data",
    description:
      "تحليل البيانات الخام لتحديد الموضوعات الرئيسية، الكلمات المفتاحية، وتعقيد المحتوى. يُعيد تحليلاً كمياً للبيانات.",
    schema: z.object({
      data: z.string().describe("البيانات الخام المراد تحليلها"),
      topic: z.string().describe("الموضوع الرئيسي للتقرير"),
    }),
  }
);

export const determineSectionDepth = tool(
  async ({
    sectionTitle,
    availableData,
    reportType,
  }: {
    sectionTitle: string;
    availableData: string;
    reportType: string;
  }) => {
    const dataLength = availableData.length;
    const sentenceCount = availableData.split(/[.。\n]/).filter((s) => s.trim().length > 5).length;

    let depth: "deep" | "moderate" | "brief";
    let estimatedWordCount: number;

    if (reportType === "executive") {
      depth = sentenceCount > 10 ? "moderate" : "brief";
      estimatedWordCount = depth === "moderate" ? 400 : 200;
    } else if (reportType === "technical") {
      depth = sentenceCount > 5 ? "deep" : "moderate";
      estimatedWordCount = depth === "deep" ? 800 : 500;
    } else {
      depth = dataLength > 500 ? "deep" : dataLength > 200 ? "moderate" : "brief";
      estimatedWordCount = depth === "deep" ? 700 : depth === "moderate" ? 450 : 250;
    }

    return JSON.stringify({
      sectionTitle,
      reportType,
      dataMetrics: { characters: dataLength, sentences: sentenceCount },
      recommendedDepth: depth,
      estimatedWordCount,
    });
  },
  {
    name: "determine_section_depth",
    description:
      "تحديد العمق المطلوب وعدد الكلمات التقديري لقسم بناءً على كمية البيانات المتاحة ونوع التقرير.",
    schema: z.object({
      sectionTitle: z.string().describe("عنوان القسم"),
      availableData: z.string().describe("البيانات المتاحة لهذا القسم"),
      reportType: z.string().describe("نوع التقرير: technical, analytical, executive, research"),
    }),
  }
);

export const generateOutline = tool(
  async ({
    title,
    sections,
    writingGuidelines,
  }: {
    title: string;
    sections: string;
    writingGuidelines: string;
  }) => {
    const parsedSections = safeJsonParse(sections, []) as any[];

    let totalWords = 0;
    const numberedSections = parsedSections.map((section: any, index: number) => {
      const wordCount = section.estimatedWordCount || 300;
      totalWords += wordCount;
      return {
        ...section,
        number: section.number || `${index + 1}.0`,
        estimatedWordCount: wordCount,
      };
    });

    return JSON.stringify({
      title,
      sections: numberedSections,
      writingGuidelines,
      totalEstimatedWords: totalWords,
      sectionCount: numberedSections.length,
      generatedAt: new Date().toISOString(),
    });
  },
  {
    name: "generate_outline",
    description:
      "إنشاء المخطط الهيكلي المرقّم النهائي مع إحصائيات الكلمات وتعليمات الصياغة.",
    schema: z.object({
      title: z.string().describe("عنوان التقرير"),
      sections: z.string().describe("أقسام التقرير بصيغة JSON array"),
      writingGuidelines: z.string().describe("إرشادات الكتابة العامة"),
    }),
  }
);
