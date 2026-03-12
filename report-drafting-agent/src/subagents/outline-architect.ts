/**
 * وكيل هيكلة المحتوى - Outline Architect SubAgent
 *
 * المسؤوليات:
 * - تحليل البيانات الخام وتحديد الموضوعات الرئيسية
 * - تصميم الهيكل الأمثل للتقرير
 * - تحديد العمق المطلوب لكل قسم
 * - إنتاج مخطط هيكلي مرقّم مع تعليمات صياغة
 */
import type { SubAgent } from "deepagents";
import { OUTLINE_ARCHITECT_PROMPT } from "../prompts/outline-architect.js";
import {
  analyzeRawData,
  determineSectionDepth,
  generateOutline,
} from "../tools/outline-tools.js";

export const outlineArchitectAgent: SubAgent = {
  name: "outline-architect",
  description:
    "يحلل البيانات الخام ويستخرج الموضوعات الرئيسية، ويصمم مخططاً هيكلياً مرقّماً للتقرير مع تعليمات صياغة وعدد كلمات تقديري لكل قسم.",
  systemPrompt: OUTLINE_ARCHITECT_PROMPT,
  tools: [analyzeRawData, determineSectionDepth, generateOutline],
};
