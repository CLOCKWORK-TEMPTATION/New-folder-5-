import { RESULT_RANKER_PROMPT } from "../prompts/result-ranker.js";
import { deduplicateResults, scoreAndRankResults, filterAndFinalize, } from "../tools/ranking-tools.js";
/**
 * إنشاء وكيل ترتيب النتائج مع إمكانية تخصيص النموذج
 *
 * @param modelOverride - اسم نموذج بديل (اختياري)
 */
export function createResultRankerAgent(modelOverride) {
    return {
        name: "result-ranker",
        description: "يزيل التكرارات ويرتّب نتائج البحث حسب الصلة والموثوقية. يقيّم كل نتيجة (0-100) بناءً على تطابق العنوان والمحتوى، موثوقية المصدر، التوافق عبر المحركات، والحداثة. ينتج قائمة نهائية مع ملخص تغطية. استخدمه كآخر خطوة بعد تنفيذ البحث.",
        systemPrompt: RESULT_RANKER_PROMPT,
        tools: [deduplicateResults, scoreAndRankResults, filterAndFinalize],
        // model override اختياري
        ...(modelOverride && { model: modelOverride }),
    };
}
/** الوكيل بالإعدادات الافتراضية */
export const resultRankerAgent = createResultRankerAgent();
//# sourceMappingURL=result-ranker.js.map