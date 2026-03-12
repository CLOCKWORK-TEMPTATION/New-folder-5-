import { QUERY_GENERATOR_PROMPT } from "../prompts/query-generator.js";
import { expandSearchTopic, generateSearchQueries, buildQueryStrategy, } from "../tools/query-tools.js";
/**
 * إنشاء وكيل توليد الاستعلامات مع إمكانية تخصيص النموذج
 *
 * @param modelOverride - اسم نموذج بديل (اختياري)
 */
export function createQueryGeneratorAgent(modelOverride) {
    return {
        name: "query-generator",
        description: "يحلل موضوع البحث ويولّد استعلامات ذكية متعددة الزوايا واللغات. يأخذ خطة البحث ويحولها إلى استعلامات مُحسّنة لكل محرك — مرادفات، صيغ مختلفة، زوايا متنوعة. استخدمه كأول خطوة في عملية البحث لضمان تغطية شاملة.",
        systemPrompt: QUERY_GENERATOR_PROMPT,
        tools: [expandSearchTopic, generateSearchQueries, buildQueryStrategy],
        // model override اختياري — حسب التوثيق الرسمي
        ...(modelOverride && { model: modelOverride }),
    };
}
/** الوكيل بالإعدادات الافتراضية (للتوافق مع الاستخدام الحالي) */
export const queryGeneratorAgent = createQueryGeneratorAgent();
//# sourceMappingURL=query-generator.js.map