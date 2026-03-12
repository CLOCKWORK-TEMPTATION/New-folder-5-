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
/**
 * إنشاء وكيل ترتيب النتائج مع إمكانية تخصيص النموذج
 *
 * @param modelOverride - اسم نموذج بديل (اختياري)
 */
export declare function createResultRankerAgent(modelOverride?: string): SubAgent;
/** الوكيل بالإعدادات الافتراضية */
export declare const resultRankerAgent: SubAgent;
//# sourceMappingURL=result-ranker.d.ts.map