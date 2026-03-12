/**
 * وكيل البحث والاستكشاف - Search Scout Agent
 *
 * يستخدم تقنية LangChain Deep Agents مع ثلاثة وكلاء فرعيين:
 * 1. Query Generator - توليد استعلامات ذكية متعددة الزوايا
 * 2. Search Executor - تنفيذ البحث بالتوازي على محركات متعددة
 * 3. Result Ranker - ترتيب وفلترة النتائج حسب الصلة
 *
 * تدفق العمل (Pipeline):
 * خطة بحث → توليد استعلامات → تنفيذ بحث متوازي → ترتيب وفلترة → نتائج مرتبة
 *
 * أفضل الممارسات المطبقة من التوثيق الرسمي:
 * - Backend قابل للتكوين (StateBackend, FilesystemBackend, LocalShellBackend)
 * - Checkpointer لحفظ المحادثات عبر الجلسات
 * - Store للذاكرة طويلة المدى
 * - Model override لكل وكيل فرعي
 * - Middleware قابل للتوسيع
 * - interruptOn للتفاعل البشري عند الحاجة
 */
import "dotenv/config";
import type { SearchPlan, SearchEngine, SearchLanguage, SearchTopic, ModelProvider, SearchScoutOutput, AgentConfig, BackendType } from "./types/index.js";
/**
 * إنشاء وكيل البحث والاستكشاف مع جميع الوكلاء الفرعيين
 *
 * يتبع أفضل الممارسات من التوثيق الرسمي:
 * - Backend قابل للتكوين
 * - Checkpointer لحفظ المحادثات
 * - Store للذاكرة طويلة المدى
 * - أدوات على المستوى الرئيسي
 * - Model override لكل وكيل فرعي
 */
export declare function createSearchScoutAgent(config?: Partial<AgentConfig>): any;
/**
 * تشغيل وكيل البحث والاستكشاف على خطة بحث محددة
 */
export declare function executeSearch(plan: SearchPlan, config?: Partial<AgentConfig>): Promise<{
    messages: any;
    todos: any;
    files: any;
    finalMessage: any;
}>;
export type { SearchPlan, SearchEngine, SearchLanguage, SearchTopic, ModelProvider, SearchScoutOutput, AgentConfig, BackendType, };
//# sourceMappingURL=index.d.ts.map