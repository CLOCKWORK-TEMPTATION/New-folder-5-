/**
 * وكيل صياغة التقارير - Report Drafting Agent
 *
 * يستخدم تقنية LangChain Deep Agents مع أربعة وكلاء فرعيين:
 * 1. Outline Architect - هيكلة المحتوى
 * 2. Section Writer - الكتابة التحريرية (متوازي)
 * 3. Citation & Evidence Linker - التوثيق والمراجع
 * 4. QA & Formatter - المراجعة والتنسيق النهائي
 *
 * تدفق العمل:
 * بيانات خام → هيكلة → كتابة (متوازي) → توثيق → مراجعة نهائية → التقرير
 */
import "dotenv/config";
import { createDeepAgent } from "deepagents";
import { ChatAnthropic } from "@langchain/anthropic";

import {
  outlineArchitectAgent,
  sectionWriterAgent,
  citationLinkerAgent,
  qaFormatterAgent,
} from "./subagents/index.js";

import { MAIN_ORCHESTRATOR_PROMPT } from "./prompts/main-orchestrator.js";

import type {
  RawInputData,
  ReportType,
  CitationFormat,
  OutputFormat,
  SourceReference,
} from "./types/index.js";

// ─────────────────────────────────────────────
// إنشاء الوكيل الرئيسي
// ─────────────────────────────────────────────

const model = new ChatAnthropic({
  model: "claude-sonnet-4-20250514",
  temperature: 0,
  maxTokens: 8192,
});

/**
 * إنشاء وكيل صياغة التقارير مع جميع الوكلاء الفرعيين
 */
export function createReportDraftingAgent() {
  return createDeepAgent({
    model,
    systemPrompt: MAIN_ORCHESTRATOR_PROMPT,
    subagents: [
      outlineArchitectAgent,
      sectionWriterAgent,
      citationLinkerAgent,
      qaFormatterAgent,
    ],
  });
}

// ─────────────────────────────────────────────
// دالة تشغيل التقرير
// ─────────────────────────────────────────────

/**
 * تشغيل وكيل صياغة التقارير على بيانات محددة
 */
export async function generateReport(input: RawInputData) {
  const agent = createReportDraftingAgent();

  const prompt = buildPrompt(input);

  const result = await agent.invoke({
    messages: [{ role: "user", content: prompt }],
  });

  return {
    messages: result.messages,
    todos: result.todos,
    files: result.files,
    finalMessage: result.messages[result.messages.length - 1].content,
  };
}

/**
 * بناء الـ prompt من بيانات الإدخال
 */
function buildPrompt(input: RawInputData): string {
  const sourcesJson = JSON.stringify(input.sources, null, 2);

  return `## طلب إنشاء تقرير

### المعلومات الأساسية
- **الموضوع**: ${input.topic}
- **نوع التقرير**: ${input.reportType}
- **الجمهور المستهدف**: ${input.targetAudience}
- **المستوى اللغوي**: ${input.languageLevel}
- **صيغة المراجع**: ${input.citationFormat}
- **صيغة المخرج**: ${input.outputFormat}

### البيانات الخام
${input.data}

### المصادر
\`\`\`json
${sourcesJson}
\`\`\`

${input.additionalInstructions ? `### تعليمات إضافية\n${input.additionalInstructions}` : ""}

---
**التعليمات**: أنشئ تقريراً احترافياً باتباع تدفق العمل المحدد:
1. فوّض outline-architect لبناء المخطط الهيكلي
2. فوّض section-writer لكتابة الأقسام المستقلة بالتوازي
3. فوّض citation-linker لتوثيق جميع الادعاءات
4. فوّض qa-formatter للمراجعة النهائية والتنسيق

أعد التقرير النهائي في ملف /final_report.md`;
}

// ─────────────────────────────────────────────
// نقطة الدخول الرئيسية
// ─────────────────────────────────────────────

async function main() {
  console.log("🚀 بدء تشغيل وكيل صياغة التقارير...\n");

  // مثال للاستخدام
  const sampleInput: RawInputData = {
    topic: "تأثير الذكاء الاصطناعي على سوق العمل في 2025",
    reportType: "analytical",
    targetAudience: "صناع القرار في قطاع التقنية",
    languageLevel: "formal",
    citationFormat: "APA",
    outputFormat: "markdown",
    data: `
      الذكاء الاصطناعي يعيد تشكيل سوق العمل بشكل جذري.
      تشير التقديرات إلى أن 40% من الوظائف الحالية ستتأثر بتقنيات الأتمتة بحلول 2030.
      القطاعات الأكثر تأثراً تشمل: التصنيع، الخدمات المالية، خدمة العملاء، والنقل.
      في المقابل، يُتوقع ظهور 97 مليون وظيفة جديدة مرتبطة بالذكاء الاصطناعي.
      التحول يتطلب إعادة تأهيل القوى العاملة وتطوير مهارات جديدة.
      الحكومات والشركات بحاجة لاستراتيجيات استباقية للتعامل مع هذا التحول.
    `,
    sources: [
      {
        id: "src-1",
        title: "The Future of Jobs Report 2025",
        author: "World Economic Forum",
        url: "https://www.weforum.org/reports/future-of-jobs-2025",
        date: "2025-01-15",
        content: "تقرير شامل عن مستقبل الوظائف والمهارات المطلوبة",
        type: "report",
      },
      {
        id: "src-2",
        title: "AI and the Future of Work",
        author: "McKinsey Global Institute",
        url: "https://www.mckinsey.com/ai-future-work",
        date: "2024-11-20",
        content: "تحليل تأثير الذكاء الاصطناعي على مختلف القطاعات",
        type: "report",
      },
      {
        id: "src-3",
        title: "Global AI Employment Impact Study",
        author: "Stanford HAI",
        url: "https://hai.stanford.edu/ai-employment-2025",
        date: "2025-03-01",
        content: "دراسة أكاديمية حول تأثير الذكاء الاصطناعي على التوظيف عالمياً",
        type: "article",
      },
    ],
    additionalInstructions: "ركّز على التوصيات العملية لصناع القرار. أضف قسماً خاصاً بالمنطقة العربية.",
  };

  try {
    const result = await generateReport(sampleInput);

    console.log("\n✅ تم إنشاء التقرير بنجاح!");
    console.log("📄 الملفات المنشأة:", Object.keys(result.files || {}));
    console.log("\n📋 المهام المنجزة:");
    result.todos?.forEach((todo: any) => {
      const icon = todo.status === "completed" ? "✅" : "⏳";
      console.log(`  ${icon} ${todo.description}`);
    });

    console.log("\n📝 الرسالة النهائية:");
    console.log(result.finalMessage);
  } catch (error) {
    console.error("❌ خطأ:", error);
    process.exit(1);
  }
}

// تشغيل إذا كان الملف هو نقطة الدخول
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                      process.argv[1]?.endsWith("index.ts");

if (isMainModule) {
  main();
}

// تصدير الأنواع والدوال
export type {
  RawInputData,
  ReportType,
  CitationFormat,
  OutputFormat,
  SourceReference,
};
