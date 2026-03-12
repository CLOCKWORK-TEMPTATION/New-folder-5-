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
/**
 * إنشاء وكيل توليد الاستعلامات مع إمكانية تخصيص النموذج
 *
 * @param modelOverride - اسم نموذج بديل (اختياري)
 */
export declare function createQueryGeneratorAgent(modelOverride?: string): SubAgent;
/** الوكيل بالإعدادات الافتراضية (للتوافق مع الاستخدام الحالي) */
export declare const queryGeneratorAgent: SubAgent;
//# sourceMappingURL=query-generator.d.ts.map