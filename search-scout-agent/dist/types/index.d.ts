/**
 * أنواع البيانات المستخدمة في وكيل البحث والاستكشاف
 * Search Scout Agent Type Definitions
 */
/** محركات البحث المدعومة */
export type SearchEngine = "serper" | "google" | "bing" | "tavily";
/** نوع البحث */
export type SearchTopic = "general" | "news" | "finance" | "academic" | "images";
/** لغة البحث */
export type SearchLanguage = "ar" | "en" | "fr" | "es" | "de" | "auto";
/** مزود نموذج اللغة */
export type ModelProvider = "anthropic" | "openai";
/** خطة البحث المستلمة من الوكيل المدير */
export interface SearchPlan {
    /** الموضوع الرئيسي */
    topic: string;
    /** الهدف من البحث */
    objective: string;
    /** النطاق الجغرافي */
    geographicScope?: string;
    /** النطاق الزمني */
    timeFrame?: string;
    /** الجمهور المستهدف */
    targetAudience?: string;
    /** اللغات المطلوبة */
    languages: SearchLanguage[];
    /** نوع البحث */
    searchTopic: SearchTopic;
    /** محركات البحث المطلوبة */
    engines: SearchEngine[];
    /** الحد الأقصى للنتائج لكل محرك */
    maxResultsPerEngine: number;
    /** كلمات مفتاحية أولية */
    seedKeywords?: string[];
    /** مصادر مستبعدة */
    excludedDomains?: string[];
    /** تعليمات إضافية */
    additionalInstructions?: string;
}
/** استعلام بحث مُولَّد */
export interface GeneratedQuery {
    /** نص الاستعلام */
    text: string;
    /** اللغة */
    language: SearchLanguage;
    /** الزاوية/المنظور */
    angle: string;
    /** الأولوية (1 = الأعلى) */
    priority: number;
    /** المحرك المستهدف */
    targetEngine?: SearchEngine;
}
/** مخرج مولّد الاستعلامات */
export interface QueryGenerationResult {
    /** الاستعلامات المولّدة */
    queries: GeneratedQuery[];
    /** عدد الاستعلامات */
    totalQueries: number;
    /** الزوايا المغطاة */
    coveredAngles: string[];
    /** ملاحظات على استراتيجية البحث */
    strategyNotes: string;
}
/** نتيجة بحث خام من محرك واحد */
export interface RawSearchResult {
    /** عنوان الصفحة */
    title: string;
    /** الرابط */
    url: string;
    /** الملخص/الوصف */
    snippet: string;
    /** المحرك المصدر */
    engine: SearchEngine;
    /** الاستعلام المستخدم */
    query: string;
    /** الترتيب في نتائج المحرك */
    position: number;
    /** تاريخ النشر (إن وُجد) */
    publishDate?: string;
    /** النطاق */
    domain: string;
    /** المحتوى الخام (إن طُلب) */
    rawContent?: string;
}
/** مخرج منفذ البحث */
export interface SearchExecutionResult {
    /** جميع النتائج الخام */
    results: RawSearchResult[];
    /** عدد النتائج الإجمالي */
    totalResults: number;
    /** تفاصيل التنفيذ لكل محرك */
    engineStats: EngineExecutionStats[];
    /** الاستعلامات الفاشلة */
    failedQueries: FailedQuery[];
}
/** إحصائيات تنفيذ محرك بحث */
export interface EngineExecutionStats {
    engine: SearchEngine;
    queriesExecuted: number;
    resultsReturned: number;
    averageResponseTime: number;
    errors: number;
}
/** استعلام فاشل */
export interface FailedQuery {
    query: string;
    engine: SearchEngine;
    error: string;
    retryable: boolean;
}
/** نتيجة بحث مُرتَّبة ومُقيَّمة */
export interface RankedSearchResult {
    /** عنوان الصفحة */
    title: string;
    /** الرابط */
    url: string;
    /** الملخص */
    snippet: string;
    /** النطاق */
    domain: string;
    /** درجة الصلة (0-100) */
    relevanceScore: number;
    /** المحركات التي أرجعت هذه النتيجة */
    foundInEngines: SearchEngine[];
    /** عدد مرات الظهور عبر المحركات */
    crossEngineCount: number;
    /** تاريخ النشر */
    publishDate?: string;
    /** سبب الترتيب */
    rankingReason: string;
}
/** مخرج مرشح النتائج النهائي */
export interface RankingResult {
    /** النتائج المرتّبة بالأولوية */
    rankedResults: RankedSearchResult[];
    /** عدد النتائج قبل الفلترة */
    totalBeforeFilter: number;
    /** عدد النتائج بعد الفلترة */
    totalAfterFilter: number;
    /** عدد التكرارات المحذوفة */
    duplicatesRemoved: number;
    /** ملخص التغطية */
    coverageSummary: string;
}
/** المخرج النهائي لوكيل البحث والاستكشاف */
export interface SearchScoutOutput {
    /** خطة البحث الأصلية */
    plan: SearchPlan;
    /** نتائج توليد الاستعلامات */
    queryGeneration: QueryGenerationResult;
    /** نتائج تنفيذ البحث */
    searchExecution: SearchExecutionResult;
    /** النتائج المرتّبة النهائية */
    ranking: RankingResult;
    /** البيانات الوصفية */
    metadata: {
        startedAt: string;
        completedAt: string;
        totalDurationMs: number;
        enginesUsed: SearchEngine[];
        languagesSearched: SearchLanguage[];
    };
}
/** نوع Backend حسب التوثيق الرسمي لـ Deep Agents */
export type BackendType = "state" | "store" | "filesystem" | "local-shell";
/** تكوين إنشاء الوكيل */
export interface AgentConfig {
    /** مزود نموذج اللغة */
    provider: ModelProvider;
    /** اسم النموذج (اختياري — يُستخدم الافتراضي حسب المزود) */
    modelName?: string;
    /** نوع Backend */
    backendType: BackendType;
    /** مجلد العمل (لـ filesystem و local-shell فقط) */
    workspaceDir?: string;
    /** تفعيل الحفظ الدائم (checkpointer + store) */
    enablePersistence: boolean;
    /** معرّف المحادثة (مطلوب مع enablePersistence) */
    threadId?: string;
    /** نموذج مخصص لوكيل توليد الاستعلامات */
    queryGeneratorModel?: string;
    /** نموذج مخصص لوكيل تنفيذ البحث */
    searchExecutorModel?: string;
    /** نموذج مخصص لوكيل ترتيب النتائج */
    resultRankerModel?: string;
}
//# sourceMappingURL=index.d.ts.map