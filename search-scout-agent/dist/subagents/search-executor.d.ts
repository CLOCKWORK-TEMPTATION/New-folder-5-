/**
 * وكيل تنفيذ البحث - Search Executor SubAgent
 *
 * المسؤوليات:
 * - تنفيذ الاستعلامات بالتوازي على محركات بحث متعددة
 * - إدارة rate limits وإعادة المحاولة عند الفشل
 * - تجميع النتائج الخام من جميع المحركات
 * - تسجيل إحصائيات التنفيذ لكل محرك
 *
 * أفضل الممارسات المطبقة:
 * - description محددة وموجهة للفعل (من التوثيق)
 * - systemPrompt مفصل مع صيغة المخرج
 * - أدوات محدودة — فقط ما يحتاجه هذا الوكيل
 * - model override اختياري لتخصيص النموذج
 */
import type { SubAgent } from "deepagents";
/**
 * إنشاء وكيل تنفيذ البحث مع إمكانية تخصيص النموذج
 *
 * @param modelOverride - اسم نموذج بديل (اختياري)
 */
export declare function createSearchExecutorAgent(modelOverride?: string): SubAgent;
/** الوكيل بالإعدادات الافتراضية */
export declare const searchExecutorAgent: SubAgent;
//# sourceMappingURL=search-executor.d.ts.map