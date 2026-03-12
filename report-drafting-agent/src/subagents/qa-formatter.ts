/**
 * وكيل المراجعة والتنسيق النهائي - QA & Formatter SubAgent
 *
 * المسؤوليات:
 * - مراجعة الاتساق اللغوي والمصطلحي عبر الأقسام
 * - كشف التكرار والتناقضات
 * - تنسيق المخرج النهائي (Markdown, PDF, DOCX)
 * - إضافة الملخص التنفيذي بعد اكتمال كل الأقسام
 */
import type { SubAgent } from "deepagents";
import { QA_FORMATTER_PROMPT } from "../prompts/qa-formatter.js";
import {
  checkConsistency,
  detectRedundancy,
  formatOutput,
  generateExecutiveSummary,
  finalQualityAssessment,
} from "../tools/qa-tools.js";

export const qaFormatterAgent: SubAgent = {
  name: "qa-formatter",
  description:
    "يراجع الاتساق اللغوي والمصطلحي، يكشف التكرار والتناقضات بين الأقسام، ينسّق المخرج النهائي بالصيغة المطلوبة، ويُنشئ الملخص التنفيذي.",
  systemPrompt: QA_FORMATTER_PROMPT,
  tools: [
    checkConsistency,
    detectRedundancy,
    formatOutput,
    generateExecutiveSummary,
    finalQualityAssessment,
  ],
};
