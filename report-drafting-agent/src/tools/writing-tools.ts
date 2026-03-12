/**
 * أدوات وكيل الكتابة التحريرية - Section Writer Tools
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const writeSection = tool(
  async ({
    sectionNumber,
    sectionTitle,
    instructions,
    sourceData,
    writingStyle,
    targetWordCount,
  }: {
    sectionNumber: string;
    sectionTitle: string;
    instructions: string;
    sourceData: string;
    writingStyle: string;
    targetWordCount: number;
  }) => {
    // This tool packages the writing parameters for the LLM to generate content.
    // The actual writing is done by the LLM using these structured parameters.
    return JSON.stringify({
      sectionNumber,
      title: sectionTitle,
      writingStyle,
      targetWordCount,
      sourceDataLength: sourceData.length,
      instructionsSummary: instructions.substring(0, 200),
      parameters: {
        sectionNumber,
        sectionTitle,
        instructions,
        sourceData,
        writingStyle,
        targetWordCount,
      },
    });
  },
  {
    name: "write_section",
    description:
      "تجهيز وتنظيم معاملات كتابة قسم من التقرير. يُعيد المعاملات المهيكلة لاستخدامها في الكتابة.",
    schema: z.object({
      sectionNumber: z.string().describe("رقم القسم (مثل 1.0, 2.1)"),
      sectionTitle: z.string().describe("عنوان القسم"),
      instructions: z.string().describe("تعليمات الصياغة الخاصة بهذا القسم"),
      sourceData: z.string().describe("البيانات والمعلومات المصدرية"),
      writingStyle: z.string().describe("أسلوب الكتابة: technical, analytical, executive"),
      targetWordCount: z.number().describe("عدد الكلمات المستهدف"),
    }),
  }
);

export const adjustTone = tool(
  async ({
    content,
    currentTone,
    targetTone,
    audience,
  }: {
    content: string;
    currentTone: string;
    targetTone: string;
    audience: string;
  }) => {
    const toneGuidelines: Record<string, string> = {
      formal: "استخدم صيغة المبني للمجهول، تجنب الضمائر الشخصية، استخدم مصطلحات دقيقة",
      "semi-formal": "اجمع بين الدقة والوضوح، استخدم أمثلة توضيحية",
      simplified: "استخدم جملاً قصيرة، تجنب المصطلحات المعقدة، أضف شروحات",
      technical: "استخدم المصطلحات التقنية بدقة، أضف تعريفات عند الحاجة",
      executive: "ركّز على النتائج والتوصيات، تجنب التفاصيل التقنية المعمّقة",
    };

    return JSON.stringify({
      contentLength: content.length,
      currentTone,
      targetTone,
      audience,
      toneGuideline: toneGuidelines[targetTone] || toneGuidelines["formal"],
      wordCount: content.split(/\s+/).length,
    });
  },
  {
    name: "adjust_tone",
    description:
      "تحليل النبرة الحالية وتقديم إرشادات تعديلها للجمهور المستهدف.",
    schema: z.object({
      content: z.string().describe("المحتوى المراد تعديل نبرته"),
      currentTone: z.string().describe("النبرة الحالية"),
      targetTone: z.string().describe("النبرة المستهدفة"),
      audience: z.string().describe("الجمهور المستهدف"),
    }),
  }
);

export const createTransition = tool(
  async ({
    previousSectionSummary,
    nextSectionTopic,
  }: {
    previousSectionSummary: string;
    nextSectionTopic: string;
  }) => {
    return JSON.stringify({
      from: previousSectionSummary.substring(0, 100),
      to: nextSectionTopic,
      transitionType: "logical-bridge",
      suggestedApproach: "اربط الاستنتاج الرئيسي من القسم السابق بمقدمة القسم التالي",
    });
  },
  {
    name: "create_transition",
    description:
      "تحليل العلاقة بين قسمين متتاليين وتحديد نوع الانتقال المناسب بينهما.",
    schema: z.object({
      previousSectionSummary: z.string().describe("ملخص القسم السابق"),
      nextSectionTopic: z.string().describe("موضوع القسم التالي"),
    }),
  }
);
