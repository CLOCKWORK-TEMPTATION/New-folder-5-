/**
 * أدوات تنفيذ البحث لوكيل البحث والاستكشاف
 * Search Execution Tools for Search Scout Agent
 *
 * يحتوي هذا الملف على أدوات البحث لجميع المحركات الأربعة:
 * Serper - Google Custom Search - Bing Web Search - Tavily
 */
/**
 * أداة بحث Serper
 * تستدعي واجهة برمجة Serper للحصول على نتائج بحث Google
 *
 * متغيرات البيئة المطلوبة:
 *   SERPER_API_KEY - مفتاح API الخاص بـ Serper
 */
export declare const serperSearch: any;
/**
 * أداة بحث Google Custom Search API
 * تستدعي Google Custom Search JSON API للحصول على نتائج بحث مخصصة
 *
 * متغيرات البيئة المطلوبة:
 *   GOOGLE_SEARCH_API_KEY    - مفتاح API من Google Cloud Console
 *   GOOGLE_SEARCH_ENGINE_ID  - معرّف محرك البحث المخصص (cx)
 */
export declare const googleSearch: any;
/**
 * أداة بحث Bing Web Search API
 * تستدعي Microsoft Bing Web Search API v7
 *
 * متغيرات البيئة المطلوبة:
 *   BING_SEARCH_API_KEY - مفتاح API من Azure Cognitive Services
 */
export declare const bingSearch: any;
/**
 * أداة بحث Tavily
 * تستخدم مكتبة @langchain/tavily للبحث الذكي المخصص للذكاء الاصطناعي
 *
 * متغيرات البيئة المطلوبة:
 *   TAVILY_API_KEY - مفتاح API الخاص بـ Tavily
 */
export declare const tavilySearch: any;
/**
 * أداة تنفيذ البحث المتوازي
 * تستقبل مصفوفة من طلبات البحث وتُنفّذها على المحركات المحددة،
 * مع الاستمرار عند فشل أي محرك وجمع النتائج من الباقين.
 */
export declare const executeParallelSearch: any;
//# sourceMappingURL=search-tools.d.ts.map