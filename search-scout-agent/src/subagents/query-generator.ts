/**
 * وكيل توليد الاستعلامات - Query Generator SubAgent
 *
 * المسؤوليات:
 * - تحليل الموضوع وتحديد الزوايا المختلفة
 * - توليد استعلامات متعددة الصيغ واللغات
 * - تخصيص الاستعلامات لكل محرك بحث
 * - بناء استراتيجية التنفيذ المُرتّبة بالأولوية
 *
 * أفضل الممارسات المطبقة:
 * - description محددة وموجهة للفعل (من التوثيق)
 * - systemPrompt مفصل مع صيغة المخرج
 * - أدوات محدودة — فقط ما يحتاجه هذا الوكيل
 * - model override اختياري لتخصيص النموذج
 */
import type { SubAgent } from "deepagents";
import { QUERY_GENERATOR_PROMPT } from "../prompts/query-generator.js";
import {
  expandSearchTopic,
  generateSearchQueries,
  buildQueryStrategy,
} from "../tools/query-tools.js";

/**
 * إنشاء وكيل توليد الاستعلامات مع إمكانية تخصيص النموذج
 *
 * @param modelOverride - اسم نموذج بديل (اختياري)
 */
export function createQueryGeneratorAgent(modelOverride?: string): SubAgent {
  return {
    name: "query-generator",
    description:
      "يحلل موضوع البحث ويولّد استعلامات ذكية متعددة الزوايا واللغات. يأخذ خطة البحث ويحولها إلى استعلامات مُحسّنة لكل محرك — مرادفات، صيغ مختلفة، زوايا متنوعة. استخدمه كأول خطوة في عملية البحث لضمان تغطية شاملة.",
    systemPrompt: QUERY_GENERATOR_PROMPT,
    tools: [expandSearchTopic, generateSearchQueries, buildQueryStrategy],
    // model override اختياري — حسب التوثيق الرسمي
    ...(modelOverride && { model: modelOverride }),
  };
}

/** الوكيل بالإعدادات الافتراضية (للتوافق مع الاستخدام الحالي) */
export const queryGeneratorAgent: SubAgent = createQueryGeneratorAgent();
