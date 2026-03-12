/**
 * أدوات تنفيذ البحث لوكيل البحث والاستكشاف
 * Search Execution Tools for Search Scout Agent
 *
 * يحتوي هذا الملف على أدوات البحث لجميع المحركات الأربعة:
 * Serper - Google Custom Search - Bing Web Search - Tavily
 */
import { tool } from "langchain";
import { z } from "zod";
import { TavilySearch } from "@langchain/tavily";
// ─────────────────────────────────────────────
// الثوابت والمساعدات
// ─────────────────────────────────────────────
/** مهلة الطلب الافتراضية بالميلي ثانية */
const DEFAULT_TIMEOUT_MS = parseInt(process.env.SEARCH_TIMEOUT_MS ?? "15000", 10);
/** تأخير بسيط للحد من معدل الطلبات على نفس المحرك (بالميلي ثانية) */
const RATE_LIMIT_DELAY_MS = 300;
/**
 * دالة مساعدة: تنتظر مدة محددة
 * Helper: waits for the given number of milliseconds
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * دالة مساعدة: استخراج اسم النطاق من رابط URL
 * Helper: extracts the domain name from a URL string
 */
function extractDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    }
    catch {
        // إعادة الرابط كما هو إن فشل التحليل
        return url;
    }
}
/**
 * دالة مساعدة: إنشاء AbortController مع مهلة تلقائية
 * Helper: creates an AbortController that automatically aborts after timeout
 */
function createTimeoutController(timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);
    return {
        controller,
        clear: () => clearTimeout(timerId),
    };
}
// ─────────────────────────────────────────────
// 1. أداة بحث Serper
// ─────────────────────────────────────────────
/**
 * أداة بحث Serper
 * تستدعي واجهة برمجة Serper للحصول على نتائج بحث Google
 *
 * متغيرات البيئة المطلوبة:
 *   SERPER_API_KEY - مفتاح API الخاص بـ Serper
 */
export const serperSearch = tool(async ({ query, maxResults, searchType, gl, hl, }) => {
    // التحقق من وجود مفتاح API
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        throw new Error("مفتاح SERPER_API_KEY غير موجود في متغيرات البيئة. " +
            "يرجى تعيين SERPER_API_KEY قبل استخدام أداة Serper.");
    }
    // تحديد نقطة نهاية API بناءً على نوع البحث
    const endpointMap = {
        search: "https://google.serper.dev/search",
        news: "https://google.serper.dev/news",
        images: "https://google.serper.dev/images",
    };
    const endpoint = endpointMap[searchType] ?? endpointMap.search;
    // بناء جسم الطلب
    const requestBody = {
        q: query,
        num: maxResults,
    };
    if (gl)
        requestBody.gl = gl;
    if (hl)
        requestBody.hl = hl;
    // تأخير بسيط للحد من معدل الطلبات
    await sleep(RATE_LIMIT_DELAY_MS);
    const { controller, clear } = createTimeoutController();
    let response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "خطأ غير معروف في الاتصال";
        if (err.name === "AbortError") {
            throw new Error(`انتهت مهلة طلب Serper بعد ${DEFAULT_TIMEOUT_MS} مللي ثانية. ` +
                "تحقق من الاتصال بالإنترنت أو زد قيمة SEARCH_TIMEOUT_MS.");
        }
        throw new Error(`فشل طلب Serper بسبب خطأ في الشبكة: ${message}`);
    }
    finally {
        clear();
    }
    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`رد Serper غير ناجح: HTTP ${response.status} ${response.statusText}. ` +
            `التفاصيل: ${errorText}`);
    }
    // تحليل الاستجابة
    const data = (await response.json());
    // استخراج المصفوفة المناسبة حسب نوع البحث
    const rawItems = searchType === "news"
        ? (data.news ?? [])
        : searchType === "images"
            ? (data.images ?? [])
            : (data.organic ?? []);
    // تحويل النتائج إلى الصيغة المشتركة
    const results = rawItems
        .slice(0, maxResults)
        .map((item, idx) => {
        const url = (searchType === "images"
            ? item.link
            : item.link) ?? "";
        return {
            title: item.title ?? "",
            url,
            snippet: item.snippet ??
                item.imageUrl ??
                "",
            engine: "serper",
            query,
            position: item.position ?? idx + 1,
            domain: extractDomain(url),
            publishDate: item.date,
        };
    });
    return {
        results,
        totalFound: results.length,
        engine: "serper",
    };
}, {
    name: "serper_search",
    description: "أداة بحث Serper: تُنفّذ بحثاً عبر واجهة برمجة Serper التي توفر نتائج Google. " +
        "تدعم البحث العادي والأخبار والصور. " +
        "تُستخدم عند الحاجة إلى نتائج Google سريعة وموثوقة.",
    schema: z.object({
        query: z.string().min(1).describe("نص الاستعلام المراد البحث عنه"),
        maxResults: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(10)
            .describe("الحد الأقصى لعدد النتائج المُعادة"),
        searchType: z
            .enum(["search", "news", "images"])
            .default("search")
            .describe("نوع البحث: search للبحث العادي، news للأخبار، images للصور"),
        gl: z
            .string()
            .optional()
            .describe("رمز البلد للتخصيص الجغرافي مثل sa أو us أو gb"),
        hl: z
            .string()
            .optional()
            .describe("رمز اللغة مثل ar أو en أو fr"),
    }),
});
// ─────────────────────────────────────────────
// 2. أداة بحث Google Custom Search
// ─────────────────────────────────────────────
/**
 * أداة بحث Google Custom Search API
 * تستدعي Google Custom Search JSON API للحصول على نتائج بحث مخصصة
 *
 * متغيرات البيئة المطلوبة:
 *   GOOGLE_SEARCH_API_KEY    - مفتاح API من Google Cloud Console
 *   GOOGLE_SEARCH_ENGINE_ID  - معرّف محرك البحث المخصص (cx)
 */
export const googleSearch = tool(async ({ query, maxResults, language, dateRestrict, }) => {
    // التحقق من وجود مفاتيح API
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    if (!apiKey) {
        throw new Error("مفتاح GOOGLE_SEARCH_API_KEY غير موجود في متغيرات البيئة. " +
            "يرجى إنشاء مفتاح API من Google Cloud Console وتعيينه.");
    }
    if (!engineId) {
        throw new Error("معرّف GOOGLE_SEARCH_ENGINE_ID غير موجود في متغيرات البيئة. " +
            "يرجى إنشاء محرك بحث مخصص من Programmable Search Engine وتعيين معرّفه.");
    }
    // Google CSE يسمح بـ 10 نتائج كحد أقصى لكل طلب
    // للحصول على نتائج أكثر نُنفّذ طلبات متعددة
    const PAGE_SIZE = 10;
    const totalPages = Math.ceil(Math.min(maxResults, 100) / PAGE_SIZE);
    const allResults = [];
    const baseUrl = "https://www.googleapis.com/customsearch/v1";
    for (let page = 0; page < totalPages; page++) {
        // حساب رقم البداية (1-based index)
        const startIndex = page * PAGE_SIZE + 1;
        const numResults = Math.min(PAGE_SIZE, maxResults - allResults.length);
        if (numResults <= 0)
            break;
        // بناء معاملات الاستعلام
        const params = new URLSearchParams({
            key: apiKey,
            cx: engineId,
            q: query,
            num: numResults.toString(),
            start: startIndex.toString(),
        });
        if (language)
            params.set("lr", `lang_${language}`);
        if (dateRestrict)
            params.set("dateRestrict", dateRestrict);
        // تأخير بسيط للحد من معدل الطلبات
        if (page > 0)
            await sleep(RATE_LIMIT_DELAY_MS);
        const { controller, clear } = createTimeoutController();
        let response;
        try {
            response = await fetch(`${baseUrl}?${params.toString()}`, {
                method: "GET",
                signal: controller.signal,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "خطأ غير معروف في الاتصال";
            if (err.name === "AbortError") {
                throw new Error(`انتهت مهلة طلب Google Custom Search (صفحة ${page + 1}) ` +
                    `بعد ${DEFAULT_TIMEOUT_MS} مللي ثانية.`);
            }
            throw new Error(`فشل طلب Google Custom Search بسبب خطأ في الشبكة: ${message}`);
        }
        finally {
            clear();
        }
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const errMsg = errorBody?.error?.message ??
                `HTTP ${response.status} ${response.statusText}`;
            throw new Error(`رد Google Custom Search غير ناجح: ${errMsg}`);
        }
        const data = (await response.json());
        const items = data.items ?? [];
        const pageResults = items.map((item, idx) => {
            const url = item.link ?? "";
            // محاولة استخراج تاريخ النشر من بيانات الصفحة
            const publishDate = item.pagemap?.metatags?.[0]?.["article:published_time"];
            return {
                title: item.title ?? "",
                url,
                snippet: item.snippet ?? "",
                engine: "google",
                query,
                position: startIndex + idx,
                domain: extractDomain(url),
                publishDate,
            };
        });
        allResults.push(...pageResults);
        // إذا لم تُرجع الصفحة نتائج كاملة، توقف عن الطلب
        if (items.length < PAGE_SIZE)
            break;
    }
    return {
        results: allResults.slice(0, maxResults),
        totalFound: allResults.length,
        engine: "google",
    };
}, {
    name: "google_search",
    description: "أداة بحث Google Custom Search: تُنفّذ بحثاً عبر Google Custom Search JSON API. " +
        "تدعم التصفية باللغة والتقييد الزمني للنتائج. " +
        "تُستخدم عند الحاجة إلى نتائج Google المخصصة مع تحكم دقيق في الفلاتر.",
    schema: z.object({
        query: z.string().min(1).describe("نص الاستعلام المراد البحث عنه"),
        maxResults: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(10)
            .describe("الحد الأقصى لعدد النتائج المُعادة"),
        language: z
            .string()
            .optional()
            .describe("رمز اللغة لتصفية النتائج مثل ar أو en (يُضاف lang_ تلقائياً)"),
        dateRestrict: z
            .string()
            .optional()
            .describe("تقييد النتائج حسب التاريخ مثل d7 لآخر 7 أيام أو m1 لآخر شهر أو y1 لآخر سنة"),
    }),
});
// ─────────────────────────────────────────────
// 3. أداة بحث Bing Web Search
// ─────────────────────────────────────────────
/**
 * أداة بحث Bing Web Search API
 * تستدعي Microsoft Bing Web Search API v7
 *
 * متغيرات البيئة المطلوبة:
 *   BING_SEARCH_API_KEY - مفتاح API من Azure Cognitive Services
 */
export const bingSearch = tool(async ({ query, maxResults, market, freshness, }) => {
    // التحقق من وجود مفتاح API
    const apiKey = process.env.BING_SEARCH_API_KEY;
    if (!apiKey) {
        throw new Error("مفتاح BING_SEARCH_API_KEY غير موجود في متغيرات البيئة. " +
            "يرجى إنشاء مورد Bing Search في Azure وتعيين مفتاحه.");
    }
    // Bing يُعيد 50 نتيجة كحد أقصى لكل طلب
    const PAGE_SIZE = 50;
    const allResults = [];
    const totalToFetch = Math.min(maxResults, 150); // حد أقصى معقول
    const baseUrl = "https://api.bing.microsoft.com/v7.0/search";
    let offset = 0;
    while (allResults.length < totalToFetch) {
        const count = Math.min(PAGE_SIZE, totalToFetch - allResults.length);
        const params = new URLSearchParams({
            q: query,
            count: count.toString(),
            offset: offset.toString(),
            responseFilter: "Webpages",
        });
        if (market)
            params.set("mkt", market);
        if (freshness)
            params.set("freshness", freshness);
        // تأخير بسيط للحد من معدل الطلبات
        if (offset > 0)
            await sleep(RATE_LIMIT_DELAY_MS);
        const { controller, clear } = createTimeoutController();
        let response;
        try {
            response = await fetch(`${baseUrl}?${params.toString()}`, {
                method: "GET",
                headers: {
                    "Ocp-Apim-Subscription-Key": apiKey,
                    Accept: "application/json",
                },
                signal: controller.signal,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "خطأ غير معروف في الاتصال";
            if (err.name === "AbortError") {
                throw new Error(`انتهت مهلة طلب Bing Search بعد ${DEFAULT_TIMEOUT_MS} مللي ثانية.`);
            }
            throw new Error(`فشل طلب Bing Web Search بسبب خطأ في الشبكة: ${message}`);
        }
        finally {
            clear();
        }
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const errMsg = errorBody?.error?.message ??
                `HTTP ${response.status} ${response.statusText}`;
            throw new Error(`رد Bing Web Search غير ناجح: ${errMsg}`);
        }
        const data = (await response.json());
        const items = data.webPages?.value ?? [];
        if (items.length === 0)
            break;
        const pageResults = items.map((item, idx) => {
            const url = item.url ?? "";
            return {
                title: item.name ?? "",
                url,
                snippet: item.snippet ?? "",
                engine: "bing",
                query,
                position: offset + idx + 1,
                domain: extractDomain(url),
                publishDate: item.datePublished ?? item.dateLastCrawled,
            };
        });
        allResults.push(...pageResults);
        offset += items.length;
        // إذا لم تُرجع الصفحة نتائج كاملة، توقف
        if (items.length < count)
            break;
    }
    return {
        results: allResults.slice(0, maxResults),
        totalFound: allResults.length,
        engine: "bing",
    };
}, {
    name: "bing_search",
    description: "أداة بحث Bing Web Search: تُنفّذ بحثاً عبر Microsoft Bing Web Search API v7. " +
        "تدعم تحديد السوق الجغرافي واللغة وحداثة النتائج. " +
        "مفيدة للحصول على تنوع في مصادر البحث وتغطية أسواق محددة.",
    schema: z.object({
        query: z.string().min(1).describe("نص الاستعلام المراد البحث عنه"),
        maxResults: z
            .number()
            .int()
            .min(1)
            .max(150)
            .default(10)
            .describe("الحد الأقصى لعدد النتائج المُعادة"),
        market: z
            .string()
            .optional()
            .describe("رمز السوق الجغرافي واللغوي مثل ar-SA للسعودية أو en-US للولايات المتحدة"),
        freshness: z
            .enum(["Day", "Week", "Month"])
            .optional()
            .describe("تصفية النتائج حسب الحداثة: Day لآخر يوم، Week لآخر أسبوع، Month لآخر شهر"),
    }),
});
// ─────────────────────────────────────────────
// 4. أداة بحث Tavily
// ─────────────────────────────────────────────
/**
 * أداة بحث Tavily
 * تستخدم مكتبة @langchain/tavily للبحث الذكي المخصص للذكاء الاصطناعي
 *
 * متغيرات البيئة المطلوبة:
 *   TAVILY_API_KEY - مفتاح API الخاص بـ Tavily
 */
export const tavilySearch = tool(async ({ query, maxResults, topic, includeRawContent, }) => {
    // التحقق من وجود مفتاح API
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error("مفتاح TAVILY_API_KEY غير موجود في متغيرات البيئة. " +
            "يرجى التسجيل في Tavily.com وتعيين مفتاح API.");
    }
    // تأخير بسيط للحد من معدل الطلبات
    await sleep(RATE_LIMIT_DELAY_MS);
    // إنشاء نموذج Tavily مع الإعدادات المناسبة
    const tavilyClient = new TavilySearch({
        tavilyApiKey: apiKey,
        maxResults,
        topic,
        includeRawContent,
    });
    let rawOutput;
    try {
        // تنفيذ البحث مع مهلة زمنية
        const searchPromise = tavilyClient.invoke({ query, topic });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`انتهت مهلة طلب Tavily بعد ${DEFAULT_TIMEOUT_MS} مللي ثانية.`)), DEFAULT_TIMEOUT_MS));
        rawOutput = await Promise.race([searchPromise, timeoutPromise]);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "خطأ غير معروف في Tavily";
        throw new Error(`فشل طلب Tavily: ${message}`);
    }
    // تحليل الاستجابة - Tavily قد يُعيد نصاً أو كائناً
    let parsedResults = [];
    if (typeof rawOutput === "string") {
        // محاولة تحليل JSON إن كانت الاستجابة نصاً
        try {
            const parsed = JSON.parse(rawOutput);
            parsedResults = parsed.results ?? [];
        }
        catch {
            // إذا لم يكن JSON صحيحاً، نُعيد نتيجة واحدة من النص
            parsedResults = [
                {
                    title: "نتيجة Tavily",
                    url: "",
                    content: rawOutput,
                },
            ];
        }
    }
    else if (rawOutput && typeof rawOutput === "object") {
        const outputObj = rawOutput;
        parsedResults = outputObj.results ?? [];
    }
    // تحويل النتائج إلى الصيغة المشتركة
    const results = parsedResults
        .slice(0, maxResults)
        .map((item, idx) => {
        const url = item.url ?? "";
        return {
            title: item.title ?? "",
            url,
            snippet: item.content ?? "",
            engine: "tavily",
            query,
            position: idx + 1,
            domain: extractDomain(url),
            publishDate: item.published_date,
            rawContent: includeRawContent ? item.raw_content : undefined,
        };
    });
    return {
        results,
        totalFound: results.length,
        engine: "tavily",
    };
}, {
    name: "tavily_search",
    description: "أداة بحث Tavily: تُنفّذ بحثاً ذكياً مخصصاً للذكاء الاصطناعي عبر Tavily API. " +
        "تدعم البحث العام والأخبار والمالية مع خيار استخراج المحتوى الخام. " +
        "تتميز بجودة عالية في فهم السياق وإعادة نتائج مُصفّاة وملائمة.",
    schema: z.object({
        query: z.string().min(1).describe("نص الاستعلام المراد البحث عنه"),
        maxResults: z
            .number()
            .int()
            .min(1)
            .max(20)
            .default(5)
            .describe("الحد الأقصى لعدد النتائج المُعادة"),
        topic: z
            .enum(["general", "news", "finance"])
            .default("general")
            .describe("موضوع البحث: general للبحث العام، news للأخبار، finance للمالية"),
        includeRawContent: z
            .boolean()
            .default(false)
            .describe("تضمين المحتوى الخام الكامل للصفحة في النتائج"),
    }),
});
/**
 * دالة مساعدة داخلية: تُنفّذ بحثاً لمحرك محدد
 * تُعيد النتائج أو null عند الفشل
 */
async function dispatchToEngine(engine, query, maxResults) {
    try {
        switch (engine) {
            case "serper": {
                const result = await serperSearch.invoke({
                    query,
                    maxResults,
                    searchType: "search",
                });
                return { results: result.results };
            }
            case "google": {
                const result = await googleSearch.invoke({
                    query,
                    maxResults,
                });
                return { results: result.results };
            }
            case "bing": {
                const result = await bingSearch.invoke({
                    query,
                    maxResults,
                });
                return { results: result.results };
            }
            case "tavily": {
                const result = await tavilySearch.invoke({
                    query,
                    maxResults: Math.min(maxResults, 20),
                    topic: "general",
                    includeRawContent: false,
                });
                return { results: result.results };
            }
            default: {
                return {
                    results: [],
                    error: `محرك بحث غير مدعوم: ${engine}`,
                };
            }
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "خطأ غير معروف أثناء التنفيذ";
        return { results: [], error: message };
    }
}
/**
 * أداة تنفيذ البحث المتوازي
 * تستقبل مصفوفة من طلبات البحث وتُنفّذها على المحركات المحددة،
 * مع الاستمرار عند فشل أي محرك وجمع النتائج من الباقين.
 */
export const executeParallelSearch = tool(async ({ queries }) => {
    // تحليل مصفوفة الاستعلامات من JSON
    let searchRequests;
    try {
        searchRequests = JSON.parse(queries);
    }
    catch {
        throw new Error("تنسيق معامل queries غير صحيح. يجب أن يكون JSON صالحاً " +
            "يحتوي على مصفوفة من الكائنات بالشكل: " +
            '[{"query": "...", "engine": "serper|google|bing|tavily", "maxResults": 10}]');
    }
    if (!Array.isArray(searchRequests) || searchRequests.length === 0) {
        throw new Error("يجب أن يحتوي معامل queries على مصفوفة غير فارغة من طلبات البحث.");
    }
    // التحقق من صحة كل طلب
    const validEngines = ["serper", "google", "bing", "tavily"];
    searchRequests.forEach((req, idx) => {
        if (!req.query || typeof req.query !== "string") {
            throw new Error(`الطلب رقم ${idx + 1}: يجب أن يحتوي على حقل query نصي غير فارغ.`);
        }
        if (!validEngines.includes(req.engine)) {
            throw new Error(`الطلب رقم ${idx + 1}: محرك البحث "${req.engine}" غير مدعوم. ` +
                `المحركات المدعومة: ${validEngines.join(", ")}`);
        }
    });
    // جمع إحصائيات المحركات
    const statsMap = new Map();
    const initStats = (engine) => ({
        engine,
        queriesAttempted: 0,
        queriesSucceeded: 0,
        resultsReturned: 0,
        errors: [],
    });
    // تجميع النتائج والأخطاء
    const allResults = [];
    const failedQueries = [];
    // تنفيذ جميع الطلبات بشكل متوازٍ باستخدام Promise.allSettled
    // لضمان عدم إيقاف التنفيذ عند فشل أي طلب
    const searchPromises = searchRequests.map(async (req) => {
        const engine = req.engine;
        const maxResults = req.maxResults ?? 10;
        // تهيئة إحصائيات المحرك إن لم تكن موجودة
        if (!statsMap.has(engine)) {
            statsMap.set(engine, initStats(engine));
        }
        const stats = statsMap.get(engine);
        stats.queriesAttempted += 1;
        const { results, error } = await dispatchToEngine(engine, req.query, maxResults);
        if (error) {
            stats.errors.push(`[${req.query}]: ${error}`);
            failedQueries.push({ query: req.query, engine, error });
        }
        else {
            stats.queriesSucceeded += 1;
            stats.resultsReturned += results.length;
            allResults.push(...results);
        }
    });
    // انتظار جميع الطلبات بغض النظر عن نجاحها أو فشلها
    await Promise.allSettled(searchPromises);
    // بناء ملخص الإحصائيات
    const engineStats = Array.from(statsMap.values());
    const totalResults = allResults.length;
    const totalAttempted = searchRequests.length;
    const totalFailed = failedQueries.length;
    const totalSucceeded = totalAttempted - totalFailed;
    const summary = `تم تنفيذ ${totalAttempted} طلب بحث عبر ${engineStats.length} محرك. ` +
        `نجح ${totalSucceeded} طلب وفشل ${totalFailed} طلب. ` +
        `إجمالي النتائج المُجمَّعة: ${totalResults} نتيجة.`;
    return {
        results: allResults,
        totalResults,
        engineStats,
        failedQueries,
        summary,
    };
}, {
    name: "execute_parallel_search",
    description: "أداة تنفيذ البحث المتوازي: تستقبل قائمة من طلبات البحث (JSON) وتُنفّذها " +
        "عبر المحركات المحددة في وقت واحد. تستمر في التنفيذ حتى لو فشل محرك أو أكثر، " +
        "وتُعيد النتائج المجمّعة مع إحصائيات تفصيلية لكل محرك وقائمة بالطلبات الفاشلة. " +
        "صيغة الإدخال: JSON string لمصفوفة [{query, engine, maxResults?}]",
    schema: z.object({
        queries: z
            .string()
            .describe("JSON string يحتوي على مصفوفة من طلبات البحث. " +
            "كل طلب يجب أن يحتوي على: " +
            "query (نص الاستعلام)، " +
            "engine (serper | google | bing | tavily)، " +
            "maxResults اختياري (الحد الأقصى للنتائج، افتراضي 10). " +
            'مثال: [{"query":"ذكاء اصطناعي","engine":"serper","maxResults":5},' +
            '{"query":"AI trends","engine":"tavily","maxResults":3}]'),
    }),
});
//# sourceMappingURL=search-tools.js.map