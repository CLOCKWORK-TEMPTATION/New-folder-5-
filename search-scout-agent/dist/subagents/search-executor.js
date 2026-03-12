import { SEARCH_EXECUTOR_PROMPT } from "../prompts/search-executor.js";
import { serperSearch, googleSearch, bingSearch, tavilySearch, executeParallelSearch, } from "../tools/search-tools.js";
/**
 * إنشاء وكيل تنفيذ البحث مع إمكانية تخصيص النموذج
 *
 * @param modelOverride - اسم نموذج بديل (اختياري)
 */
export function createSearchExecutorAgent(modelOverride) {
    return {
        name: "search-executor",
        description: "ينفذ استعلامات البحث بالتوازي على محركات متعددة (Serper, Google, Bing, Tavily). يدير التوازي وrate limits ومعالجة الأخطاء تلقائياً. يجمع النتائج الخام مع إحصائيات التنفيذ. استخدمه بعد توليد الاستعلامات لتنفيذ البحث الفعلي.",
        systemPrompt: SEARCH_EXECUTOR_PROMPT,
        tools: [
            serperSearch,
            googleSearch,
            bingSearch,
            tavilySearch,
            executeParallelSearch,
        ],
        // model override — يمكن استخدام نموذج أرخص للتنفيذ البسيط
        ...(modelOverride && { model: modelOverride }),
    };
}
/** الوكيل بالإعدادات الافتراضية */
export const searchExecutorAgent = createSearchExecutorAgent();
//# sourceMappingURL=search-executor.js.map