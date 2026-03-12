/**
 * وكيل ترتيب وفلترة النتائج - Result Ranker SubAgent
 *
 * المسؤوليات:
 * - إزالة التكرارات ودمج النتائج المتطابقة عبر المحركات
 * - تقييم كل نتيجة على مقياس 0-100 حسب الصلة والموثوقية
 * - ترتيب النتائج بالأولوية مع تفسير واضح لكل ترتيب
 * - إنتاج قائمة نهائية مع ملخص التغطية والثغرات
 *
 * أفضل الممارسات المطبقة:
 * - description محددة وموجهة للفعل (من التوثيق)
 * - systemPrompt مفصل مع صيغة المخرج
 * - أدوات محدودة — فقط ما يحتاجه هذا الوكيل
 * - model override اختياري لتخصيص النموذج
 */
import type { SubAgent } from "deepagents";
import { RESULT_RANKER_PROMPT } from "../prompts/result-ranker.js";
import {
  deduplicateResults,
  scoreAndRankResults,
  filterAndFinalize,
} from "../tools/ranking-tools.js";

/**
 * إنشاء وكيل ترتيب النتائج مع إمكانية تخصيص النموذج
 *
 * @param modelOverride - اسم نموذج بديل (اختياري)
 */
export function createResultRankerAgent(modelOverride?: string): SubAgent {
  return {
    name: "result-ranker",
    description:
      "يزيل التكرارات ويرتّب نتائج البحث حسب الصلة والموثوقية. يقيّم كل نتيجة (0-100) بناءً على تطابق العنوان والمحتوى، موثوقية المصدر، التوافق عبر المحركات، والحداثة. ينتج قائمة نهائية مع ملخص تغطية. استخدمه كآخر خطوة بعد تنفيذ البحث.",
    systemPrompt: RESULT_RANKER_PROMPT,
    tools: [deduplicateResults, scoreAndRankResults, filterAndFinalize],
    // model override اختياري
    ...(modelOverride && { model: modelOverride }),
  };
}

/** الوكيل بالإعدادات الافتراضية */
export const resultRankerAgent: SubAgent = createResultRankerAgent();
