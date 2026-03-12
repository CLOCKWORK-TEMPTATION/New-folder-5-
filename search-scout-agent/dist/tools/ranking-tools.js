/**
 * أدوات ترتيب وفلترة نتائج البحث
 * تُستخدم من قِبَل الوكيل الفرعي المسؤول عن ترتيب النتائج وإزالة التكرارات
 */
import { tool } from "langchain";
import { z } from "zod";
// ─────────────────────────────────────────────
// دوال مساعدة داخلية
// ─────────────────────────────────────────────
/**
 * تُطبِّع الرابط لضمان مقارنة متسقة عند إزالة التكرارات
 * - يزيل البروتوكول (http/https)
 * - يزيل البادئة www
 * - يزيل الشرطة المائلة الأخيرة
 */
function normalizeUrl(url) {
    return url
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "")
        .trim();
}
/**
 * تستخرج النطاق الأساسي من الرابط
 */
function extractDomain(url) {
    try {
        const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
        return parsed.hostname.replace(/^www\./, "").toLowerCase();
    }
    catch {
        return url.split("/")[0].replace(/^www\./, "").toLowerCase();
    }
}
/**
 * تتحقق من كون النطاق ذا سلطة عالية (.edu / .gov / .org)
 * وتعيد نقاط المكافأة المقابلة
 */
function getDomainAuthorityBonus(domain) {
    if (domain.endsWith(".edu"))
        return 15;
    if (domain.endsWith(".gov"))
        return 15;
    if (domain.endsWith(".org"))
        return 8;
    // نطاقات المؤسسات الإخبارية والأكاديمية الكبرى
    const trustedDomains = [
        "reuters.com",
        "bbc.com",
        "bbc.co.uk",
        "apnews.com",
        "nature.com",
        "sciencedirect.com",
        "pubmed.ncbi.nlm.nih.gov",
        "scholar.google.com",
        "arxiv.org",
        "wikipedia.org",
    ];
    if (trustedDomains.some((d) => domain.endsWith(d)))
        return 5;
    return 0;
}
/**
 * تحسب مدى صلة النص بموضوع البحث
 * تُعيد نسبة مئوية (0-100)
 */
function computeTextRelevance(text, topic) {
    if (!text || !topic)
        return 0;
    const textLower = text.toLowerCase();
    const topicWords = topic
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
    if (topicWords.length === 0)
        return 0;
    let matchCount = 0;
    for (const word of topicWords) {
        // كلمة كاملة تُحسب بضعف
        const wholeWordRegex = new RegExp(`\\b${word}\\b`, "i");
        if (wholeWordRegex.test(textLower)) {
            matchCount += 2;
        }
        else if (textLower.includes(word)) {
            matchCount += 1;
        }
    }
    // الحد الأقصى المنطقي: كل كلمة تتطابق مرتين
    const maxPossible = topicWords.length * 2;
    return Math.min(100, Math.round((matchCount / maxPossible) * 100));
}
/**
 * تُقدِّر حداثة النتيجة بناءً على تاريخ النشر
 * تُعيد نقاطًا من 0 إلى 20
 */
function computeRecencyScore(publishDate) {
    if (!publishDate)
        return 5; // قيمة افتراضية محايدة
    const now = Date.now();
    let pubTime;
    try {
        pubTime = new Date(publishDate).getTime();
        if (isNaN(pubTime))
            return 5;
    }
    catch {
        return 5;
    }
    const diffDays = (now - pubTime) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1)
        return 20;
    if (diffDays <= 7)
        return 18;
    if (diffDays <= 30)
        return 15;
    if (diffDays <= 90)
        return 12;
    if (diffDays <= 365)
        return 8;
    return 3; // محتوى قديم جدًا
}
// ─────────────────────────────────────────────
// الأداة الأولى: إزالة التكرارات
// ─────────────────────────────────────────────
/**
 * أداة إزالة التكرارات من نتائج البحث الخام
 *
 * تستقبل مصفوفة من نتائج البحث الخام (JSON) وتُعيد نتائج فريدة،
 * مع دمج النتائج المكررة من محركات مختلفة في سجل واحد موحَّد
 * يتضمن معلومات عن المحركات التي أرجعته.
 */
export const deduplicateResults = tool(async ({ rawResultsJson }) => {
    // ─── تحليل المدخلات ───
    let rawResults;
    try {
        rawResults = JSON.parse(rawResultsJson);
        if (!Array.isArray(rawResults)) {
            throw new Error("المدخل ليس مصفوفة");
        }
    }
    catch (err) {
        return JSON.stringify({
            error: `فشل تحليل نتائج البحث الخام: ${err.message}`,
            deduplicated: [],
            stats: { original: 0, deduplicated: 0, duplicatesRemoved: 0 },
        });
    }
    const totalOriginal = rawResults.length;
    // ─── خريطة الدمج: المفتاح = الرابط المُطبَّع ───
    const mergeMap = new Map();
    for (const result of rawResults) {
        if (!result.url)
            continue;
        const normalizedKey = normalizeUrl(result.url);
        if (mergeMap.has(normalizedKey)) {
            // ─── دمج مع سجل موجود ───
            const existing = mergeMap.get(normalizedKey);
            // إضافة المحرك إن لم يكن موجودًا
            if (!existing.foundInEngines.includes(result.engine)) {
                existing.foundInEngines.push(result.engine);
                existing.crossEngineCount = existing.foundInEngines.length;
            }
            // نحتفظ بالنتيجة ذات الترتيب الأفضل (الأرقام الأصغر أفضل)
            if (result.position < existing.bestPosition) {
                existing.bestPosition = result.position;
                // نستبدل الممثّل بالنسخة ذات الترتيب الأعلى
                existing.representative = {
                    ...result,
                };
            }
            // نُفضِّل المقتطف الأطول للحصول على معلومات أغنى
            if (result.snippet &&
                result.snippet.length > existing.representative.snippet.length) {
                existing.representative = {
                    ...existing.representative,
                    snippet: result.snippet,
                };
            }
        }
        else {
            // ─── سجل جديد ───
            mergeMap.set(normalizedKey, {
                representative: { ...result },
                foundInEngines: [result.engine],
                crossEngineCount: 1,
                bestPosition: result.position,
            });
        }
    }
    // ─── بناء القائمة النهائية المُدمجة ───
    const deduplicated = Array.from(mergeMap.values()).map((entry) => ({
        ...entry.representative,
        foundInEngines: entry.foundInEngines,
        crossEngineCount: entry.crossEngineCount,
    }));
    const duplicatesRemoved = totalOriginal - deduplicated.length;
    return JSON.stringify({
        deduplicated,
        stats: {
            original: totalOriginal,
            deduplicated: deduplicated.length,
            duplicatesRemoved,
        },
    });
}, {
    name: "deduplicateResults",
    description: "يزيل التكرارات من نتائج البحث الخام القادمة من محركات متعددة. " +
        "عند وجود نفس الرابط من محركات مختلفة، يدمجها في سجل واحد " +
        "مع تتبع المحركات التي أرجعته (crossEngineCount, foundInEngines). " +
        "يُطبِّع الروابط لضمان الكشف الصحيح عن التكرارات.",
    schema: z.object({
        rawResultsJson: z
            .string()
            .describe("مصفوفة JSON من نتائج البحث الخام (RawSearchResult[]). " +
            "كل عنصر يجب أن يحتوي على: url, title, snippet, engine, query, position, domain."),
    }),
});
// ─────────────────────────────────────────────
// الأداة الثانية: تسجيل النقاط والترتيب
// ─────────────────────────────────────────────
/**
 * أداة تسجيل النقاط وترتيب نتائج البحث
 *
 * تحسب لكل نتيجة درجة صلة (0-100) بناءً على عوامل متعددة:
 * - صلة العنوان بالموضوع
 * - صلة المقتطف بالموضوع
 * - سلطة النطاق (.edu/.gov/.org)
 * - الاتفاق عبر محركات متعددة
 * - حداثة المحتوى
 */
export const scoreAndRankResults = tool(async ({ deduplicatedResultsJson, searchTopic }) => {
    // ─── تحليل المدخلات ───
    let inputData;
    try {
        inputData = JSON.parse(deduplicatedResultsJson);
        if (!Array.isArray(inputData.deduplicated)) {
            throw new Error("الحقل 'deduplicated' ليس مصفوفة");
        }
    }
    catch (err) {
        return JSON.stringify({
            error: `فشل تحليل النتائج المُزالة تكراراتها: ${err.message}`,
            scored: [],
        });
    }
    const results = inputData.deduplicated;
    // ─── تسجيل النقاط لكل نتيجة ───
    const scored = results.map((result) => {
        const reasonParts = [];
        // 1. صلة العنوان (وزن: 35 نقطة كحد أقصى)
        const titleRelevance = computeTextRelevance(result.title, searchTopic);
        const titleScore = Math.round(titleRelevance * 0.35);
        reasonParts.push(`صلة العنوان: ${titleScore}/35`);
        // 2. صلة المقتطف (وزن: 30 نقطة كحد أقصى)
        const snippetRelevance = computeTextRelevance(result.snippet, searchTopic);
        const snippetScore = Math.round(snippetRelevance * 0.3);
        reasonParts.push(`صلة المقتطف: ${snippetScore}/30`);
        // 3. سلطة النطاق (وزن: 15 نقطة كحد أقصى)
        const domain = result.domain || extractDomain(result.url);
        const authorityScore = getDomainAuthorityBonus(domain);
        if (authorityScore > 0) {
            reasonParts.push(`مكافأة النطاق (${domain}): +${authorityScore}`);
        }
        // 4. الاتفاق عبر محركات متعددة (وزن: 20 نقطة كحد أقصى)
        // محرك واحد = 0, محركان = 10, ثلاثة+ = 20
        const crossScore = Math.min(20, (result.crossEngineCount - 1) * 10);
        if (crossScore > 0) {
            reasonParts.push(`ظهر في ${result.crossEngineCount} محركات: +${crossScore}`);
        }
        // 5. حداثة المحتوى (وزن: 20 نقطة كحد أقصى)
        const recencyScore = computeRecencyScore(result.publishDate);
        reasonParts.push(`الحداثة: ${recencyScore}/20`);
        // ─── المجموع الكلي (مُقيَّد بـ 100) ───
        const totalScore = Math.min(100, titleScore + snippetScore + authorityScore + crossScore + recencyScore);
        return {
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            domain: domain,
            relevanceScore: totalScore,
            foundInEngines: result.foundInEngines,
            crossEngineCount: result.crossEngineCount,
            publishDate: result.publishDate,
            rankingReason: reasonParts.join(" | ") + ` → المجموع: ${totalScore}/100`,
        };
    });
    // ─── الترتيب التنازلي حسب الدرجة ───
    scored.sort((a, b) => {
        // أولوية أولى: درجة الصلة
        if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
        }
        // أولوية ثانية: عدد المحركات التي أرجعته (تكسير التساوي)
        return b.crossEngineCount - a.crossEngineCount;
    });
    return JSON.stringify({
        scored,
        totalScored: scored.length,
        scoreDistribution: {
            high: scored.filter((r) => r.relevanceScore >= 70).length,
            medium: scored.filter((r) => r.relevanceScore >= 40 && r.relevanceScore < 70).length,
            low: scored.filter((r) => r.relevanceScore < 40).length,
        },
    });
}, {
    name: "scoreAndRankResults",
    description: "يُسجِّل النقاط لكل نتيجة بحث ويُرتِّبها تنازليًا حسب الصلة. " +
        "تعتمد الخوارزمية على: صلة العنوان (35%)، صلة المقتطف (30%)، " +
        "سلطة النطاق (.edu/.gov/.org)، الاتفاق عبر محركات متعددة، " +
        "وحداثة المحتوى. يُعيد النتائج مرتبةً مع سبب الترتيب.",
    schema: z.object({
        deduplicatedResultsJson: z
            .string()
            .describe("مخرج أداة deduplicateResults بصيغة JSON. " +
            "يجب أن يحتوي على حقل 'deduplicated' وهو مصفوفة النتائج."),
        searchTopic: z
            .string()
            .describe("موضوع البحث أو هدفه بصياغة واضحة تُستخدم لحساب درجة الصلة. " +
            "مثال: 'التأثيرات الاقتصادية للذكاء الاصطناعي على سوق العمل'."),
    }),
});
// ─────────────────────────────────────────────
// الأداة الثالثة: الفلترة النهائية وتوليد الملخص
// ─────────────────────────────────────────────
/**
 * أداة الفلترة النهائية وإنشاء ملخص التغطية
 *
 * تُطبِّق آخر مرحلة من مراحل معالجة نتائج البحث:
 * - استبعاد النطاقات المحظورة
 * - تحديد الحد الأقصى للنتائج
 * - توليد ملخص وصفي للتغطية (الجوانب المغطاة والناقصة)
 */
export const filterAndFinalize = tool(async ({ scoredResultsJson, maxResults, excludedDomainsJson }) => {
    // ─── تحليل النتائج المُسجَّلة ───
    let inputData;
    try {
        inputData = JSON.parse(scoredResultsJson);
        if (!Array.isArray(inputData.scored)) {
            throw new Error("الحقل 'scored' ليس مصفوفة");
        }
    }
    catch (err) {
        return JSON.stringify({
            error: `فشل تحليل النتائج المُسجَّلة: ${err.message}`,
            rankedResults: [],
            totalBeforeFilter: 0,
            totalAfterFilter: 0,
            duplicatesRemoved: 0,
            coverageSummary: "",
        });
    }
    // ─── تحليل النطاقات المستبعدة ───
    let excludedDomains = [];
    if (excludedDomainsJson) {
        try {
            const parsed = JSON.parse(excludedDomainsJson);
            if (Array.isArray(parsed)) {
                excludedDomains = parsed.map((d) => d.toLowerCase().replace(/^www\./, ""));
            }
        }
        catch {
            // تجاهل الخطأ والمتابعة بدون استبعاد
        }
    }
    const totalBeforeFilter = inputData.scored.length;
    // ─── تطبيق فلتر النطاقات المستبعدة ───
    let filtered = inputData.scored;
    if (excludedDomains.length > 0) {
        filtered = filtered.filter((result) => {
            const domain = result.domain || extractDomain(result.url);
            return !excludedDomains.some((excluded) => domain === excluded || domain.endsWith(`.${excluded}`));
        });
    }
    // ─── تطبيق الحد الأقصى للنتائج ───
    const cappedResults = filtered.slice(0, maxResults);
    // ─── توليد ملخص التغطية ───
    const coverageSummary = generateCoverageSummary(cappedResults, totalBeforeFilter, excludedDomains);
    return JSON.stringify({
        rankedResults: cappedResults,
        totalBeforeFilter,
        totalAfterFilter: cappedResults.length,
        duplicatesRemoved: 0, // يُحسب في مرحلة إزالة التكرارات
        coverageSummary,
        metadata: {
            excludedDomainsApplied: excludedDomains.length,
            resultsExcludedByDomain: totalBeforeFilter - filtered.length,
            resultsCappedByLimit: filtered.length - cappedResults.length,
            averageRelevanceScore: cappedResults.length > 0
                ? Math.round(cappedResults.reduce((sum, r) => sum + r.relevanceScore, 0) /
                    cappedResults.length)
                : 0,
        },
    });
}, {
    name: "filterAndFinalize",
    description: "تُطبِّق الفلترة النهائية على النتائج المُرتَّبة: " +
        "تستبعد النطاقات المحظورة، تُقيِّد العدد بـ maxResults، " +
        "وتُولِّد ملخصًا وصفيًا للتغطية يوضح الجوانب المغطاة " +
        "والثغرات المحتملة في نتائج البحث.",
    schema: z.object({
        scoredResultsJson: z
            .string()
            .describe("مخرج أداة scoreAndRankResults بصيغة JSON. " +
            "يجب أن يحتوي على حقل 'scored' وهو مصفوفة النتائج المُسجَّلة."),
        maxResults: z
            .number()
            .int()
            .positive()
            .describe("الحد الأقصى لعدد النتائج المُعادة في القائمة النهائية."),
        excludedDomainsJson: z
            .string()
            .optional()
            .describe("مصفوفة JSON اختيارية من النطاقات المستبعدة. " +
            "مثال: '[\"spam-site.com\", \"ads-domain.net\"]'."),
    }),
});
// ─────────────────────────────────────────────
// دالة مساعدة: توليد ملخص التغطية
// ─────────────────────────────────────────────
/**
 * تُولِّد ملخصًا نصيًا لتغطية نتائج البحث
 * يصف الجوانب المغطاة جيدًا والثغرات المحتملة
 */
function generateCoverageSummary(results, totalBeforeFilter, excludedDomains) {
    if (results.length === 0) {
        return "لا توجد نتائج كافية لتوليد ملخص التغطية.";
    }
    const parts = [];
    // ─── إحصائيات عامة ───
    parts.push(`تم تحليل ${totalBeforeFilter} نتيجة وتصفيتها إلى ${results.length} نتيجة نهائية.`);
    // ─── توزيع محركات البحث ───
    const engineCounts = new Map();
    for (const result of results) {
        for (const engine of result.foundInEngines) {
            engineCounts.set(engine, (engineCounts.get(engine) || 0) + 1);
        }
    }
    if (engineCounts.size > 0) {
        const engineSummary = Array.from(engineCounts.entries())
            .map(([eng, count]) => `${eng} (${count})`)
            .join("، ");
        parts.push(`توزيع المصادر حسب المحرك: ${engineSummary}.`);
    }
    // ─── جودة التغطية ───
    const highQuality = results.filter((r) => r.relevanceScore >= 70).length;
    const multiEngine = results.filter((r) => r.crossEngineCount > 1).length;
    if (highQuality > 0) {
        parts.push(`${highQuality} نتيجة ذات صلة عالية (≥70 نقطة).`);
    }
    if (multiEngine > 0) {
        parts.push(`${multiEngine} نتيجة ظهرت في أكثر من محرك بحث واحد مما يعزز موثوقيتها.`);
    }
    // ─── تنوع النطاقات ───
    const uniqueDomains = new Set(results.map((r) => r.domain)).size;
    parts.push(`تغطية من ${uniqueDomains} نطاقًا مختلفًا.`);
    // ─── النطاقات ذات السلطة ───
    const authoritative = results.filter((r) => {
        const d = r.domain;
        return d.endsWith(".edu") || d.endsWith(".gov") || d.endsWith(".org");
    });
    if (authoritative.length > 0) {
        parts.push(`${authoritative.length} نتيجة من مصادر ذات سلطة (.edu / .gov / .org).`);
    }
    // ─── حداثة المحتوى ───
    const withDates = results.filter((r) => r.publishDate);
    if (withDates.length > 0) {
        parts.push(`${withDates.length} نتيجة تحمل تاريخ نشر معلومًا.`);
    }
    else {
        parts.push("تحذير: لا تتوفر تواريخ نشر للنتائج، مما يُصعِّب تقييم حداثة المحتوى.");
    }
    // ─── النطاقات المستبعدة ───
    if (excludedDomains.length > 0) {
        parts.push(`تم استبعاد النطاقات التالية وفق إعدادات الفلترة: ${excludedDomains.join("، ")}.`);
    }
    // ─── تقييم الثغرات ───
    const lowScoreCount = results.filter((r) => r.relevanceScore < 40).length;
    if (lowScoreCount > results.length * 0.5) {
        parts.push("ملاحظة: أكثر من نصف النتائج ذات صلة منخفضة، يُنصح بتوسيع استعلامات البحث.");
    }
    if (uniqueDomains < 3) {
        parts.push("ملاحظة: التنوع في المصادر محدود، قد يكون هناك زوايا ومنظورات غير مُغطاة.");
    }
    return parts.join(" ");
}
//# sourceMappingURL=ranking-tools.js.map