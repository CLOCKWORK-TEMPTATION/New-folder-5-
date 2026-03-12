/**
 * أدوات الوكيل الفرعي لتوليد الاستعلامات - Query Generator Subagent Tools
 *
 * هذا الملف يحتوي على الأدوات المستخدمة من قِبَل الوكيل الفرعي المسؤول
 * عن تحليل الموضوع وتوليد استعلامات البحث الذكية وبناء خطة التنفيذ النهائية.
 *
 * الأدوات المتضمنة:
 *  1. expandSearchTopic   - توسيع الموضوع واستكشاف زوايا البحث المختلفة
 *  2. generateSearchQueries - توليد نصوص الاستعلامات المُحسَّنة لكل محرك ولغة
 *  3. buildQueryStrategy  - بناء خطة التنفيذ النهائية وتوزيع الاستعلامات
 */
import { tool } from "langchain";
import { z } from "zod";
// ─────────────────────────────────────────────────────────────────────────────
// الأداة الأولى: توسيع موضوع البحث
// ─────────────────────────────────────────────────────────────────────────────
/**
 * أداة توسيع موضوع البحث وتحليل زوايا الاستكشاف المختلفة.
 *
 * تستقبل هذه الأداة الموضوع الرئيسي والهدف من البحث والكلمات المفتاحية الأولية،
 * ثم تُحلِّل الموضوع وتُنتج زوايا بحثية متعددة تشمل المرادفات والمفاهيم ذات الصلة
 * والصياغات المختلفة، وذلك لضمان تغطية شاملة لجميع أوجه الموضوع قبل توليد الاستعلامات.
 *
 * @returns كائن JSON يحتوي على: مصفوفة الزوايا، الكلمات المقترحة، ملاحظات التحليل
 */
export const expandSearchTopic = tool(async ({ topic, objective, seedKeywords, }) => {
    // بناء الزوايا البحثية الأولية بناءً على المدخلات
    const angles = [
        {
            id: "angle_core",
            label: "الزاوية الأساسية",
            description: `البحث المباشر عن: ${topic}`,
            perspective: "core",
        },
        {
            id: "angle_synonyms",
            label: "المرادفات والمصطلحات البديلة",
            description: `مصطلحات مرادفة ومكافئة للموضوع: ${topic}`,
            perspective: "synonyms",
        },
        {
            id: "angle_related",
            label: "المفاهيم ذات الصلة",
            description: `المفاهيم والمجالات المرتبطة بـ: ${topic}`,
            perspective: "related_concepts",
        },
        {
            id: "angle_contextual",
            label: "السياق والخلفية",
            description: `السياق العام والخلفية المعلوماتية لـ: ${topic}`,
            perspective: "contextual",
        },
        {
            id: "angle_objective",
            label: "زاوية الهدف",
            description: `بحث موجَّه نحو تحقيق: ${objective}`,
            perspective: "objective_driven",
        },
    ];
    // إنشاء قائمة الكلمات المفتاحية المقترحة بدمج الأولية مع المشتقات
    const suggestedKeywords = [
        ...seedKeywords,
        `"${topic}"`,
        `${topic} شرح`,
        `${topic} تعريف`,
        `${topic} مقدمة`,
        `كيفية ${topic}`,
        `أفضل ${topic}`,
        `${topic} 2024`,
        `${topic} 2025`,
    ];
    // ملاحظات التحليل
    const analysisNotes = [
        `تم تحليل الموضوع: "${topic}" بناءً على الهدف: "${objective}"`,
        `الكلمات المفتاحية الأولية المُدخَلة: ${seedKeywords.length > 0 ? seedKeywords.join("، ") : "لم تُحدَّد"}`,
        `تم استخلاص ${angles.length} زاوية بحثية مختلفة لضمان التغطية الشاملة`,
        `يُنصَح بتوليد استعلامات لكل زاوية بشكل منفصل لتحسين جودة النتائج`,
    ];
    const result = {
        topic,
        objective,
        angles,
        suggestedKeywords: [...new Set(suggestedKeywords)],
        analysisNotes,
        totalAngles: angles.length,
    };
    return JSON.stringify(result);
}, {
    name: "expandSearchTopic",
    description: "تحليل موضوع البحث وتوليد زوايا ومنظورات بحثية متعددة. تستكشف هذه الأداة المرادفات والمفاهيم ذات الصلة والصياغات المختلفة للموضوع لضمان تغطية شاملة قبل توليد الاستعلامات الفعلية.",
    schema: z.object({
        topic: z
            .string()
            .min(1)
            .describe("الموضوع الرئيسي المراد البحث عنه"),
        objective: z
            .string()
            .min(1)
            .describe("الهدف من البحث وما يُراد تحقيقه"),
        seedKeywords: z
            .array(z.string())
            .default([])
            .describe("الكلمات المفتاحية الأولية كنقطة انطلاق لتوسيع الموضوع"),
    }),
});
// ─────────────────────────────────────────────────────────────────────────────
// الأداة الثانية: توليد استعلامات البحث
// ─────────────────────────────────────────────────────────────────────────────
/**
 * أداة توليد نصوص استعلامات البحث المُحسَّنة لكل محرك ولغة.
 *
 * تستقبل هذه الأداة الزوايا البحثية الناتجة عن expandSearchTopic،
 * وقائمة اللغات المطلوبة، وقائمة محركات البحث المستهدفة، ثم تُولِّد
 * استعلامات بحث محسَّنة لكل تركيبة من (زاوية × لغة × محرك)، مع مراعاة
 * خصائص كل محرك (دعم المشغّلات المنطقية، الاقتباسات، المُرشِّحات).
 *
 * @returns كائن JSON يحتوي على مصفوفة الاستعلامات، كل منها بـ: النص، اللغة، الزاوية، الأولوية، المحرك
 */
export const generateSearchQueries = tool(async ({ anglesJson, languages, targetEngines, }) => {
    // تحليل الزوايا من JSON
    let parsedAngles;
    try {
        const parsed = JSON.parse(anglesJson);
        // دعم التمرير المباشر لمصفوفة أو كائن يحتوي على مصفوفة angles
        parsedAngles = Array.isArray(parsed) ? parsed : parsed.angles ?? [];
    }
    catch {
        // إذا فشل التحليل نعيد مصفوفة فارغة مع رسالة خطأ
        return JSON.stringify({
            queries: [],
            totalQueries: 0,
            error: "فشل تحليل anglesJson - تأكد من أن المدخل JSON صالح",
        });
    }
    // تعريف المُعامِلات الخاصة بكل محرك بحث
    const engineOperators = {
        google: {
            supportsQuotes: true,
            supportsBoolean: true,
            siteFilter: "site:",
        },
        bing: {
            supportsQuotes: true,
            supportsBoolean: true,
            siteFilter: "site:",
        },
        serper: {
            supportsQuotes: true,
            supportsBoolean: false,
            siteFilter: "site:",
        },
        tavily: {
            supportsQuotes: false,
            supportsBoolean: false,
            siteFilter: "",
        },
    };
    // تعريف بادئات اللغة المستخدمة في صياغة الاستعلامات
    const languagePrefixes = {
        ar: "",
        en: "",
        fr: "",
        es: "",
        de: "",
        auto: "",
    };
    const queries = [];
    let priorityCounter = 1;
    // توليد الاستعلامات لكل تركيبة (زاوية × لغة × محرك)
    for (const angle of parsedAngles) {
        for (const language of languages) {
            for (const engine of targetEngines) {
                const ops = engineOperators[engine] ?? {
                    supportsQuotes: true,
                    supportsBoolean: false,
                    siteFilter: "",
                };
                const prefix = languagePrefixes[language] ?? "";
                // بناء نص الاستعلام حسب قدرات المحرك
                let queryText = "";
                if (angle.perspective === "core") {
                    // استعلام مباشر مع اقتباس إن كان مدعوماً
                    queryText = ops.supportsQuotes
                        ? `${prefix}${angle.description}`.trim()
                        : `${prefix}${angle.description}`.trim();
                }
                else if (angle.perspective === "synonyms") {
                    // استعلام بمشغّل OR للمرادفات إن كان مدعوماً
                    queryText = ops.supportsBoolean
                        ? `(${angle.description}) OR (${angle.label})`
                        : `${angle.description} ${angle.label}`.trim();
                }
                else if (angle.perspective === "related_concepts") {
                    // استعلام للمفاهيم المرتبطة
                    queryText = ops.supportsBoolean
                        ? `${angle.description} AND related`
                        : `${angle.description}`.trim();
                }
                else {
                    // استعلام عام للزوايا الأخرى
                    queryText = `${prefix}${angle.description}`.trim();
                }
                // إزالة المسافات الزائدة
                queryText = queryText.replace(/\s+/g, " ").trim();
                // تخصيص الأولوية: الزاوية الأساسية لها أعلى أولوية
                const priority = angle.perspective === "core"
                    ? 1
                    : angle.perspective === "synonyms"
                        ? 2
                        : angle.perspective === "objective_driven"
                            ? 3
                            : priorityCounter++;
                queries.push({
                    text: queryText,
                    language,
                    angle: angle.id,
                    priority,
                    targetEngine: engine,
                });
            }
        }
    }
    // ترتيب الاستعلامات حسب الأولوية تصاعدياً (1 = الأعلى أولوية)
    queries.sort((a, b) => a.priority - b.priority);
    const result = {
        queries,
        totalQueries: queries.length,
        languagesCovered: [...new Set(queries.map((q) => q.language))],
        enginesCovered: [...new Set(queries.map((q) => q.targetEngine))],
        anglesCovered: [...new Set(queries.map((q) => q.angle))],
    };
    return JSON.stringify(result);
}, {
    name: "generateSearchQueries",
    description: "توليد نصوص استعلامات البحث المُحسَّنة لكل تركيبة من محرك ولغة. تأخذ الأداة الزوايا البحثية الناتجة عن expandSearchTopic وتُنتج استعلامات جاهزة للتنفيذ مع مراعاة خصائص كل محرك (المشغّلات المنطقية، الاقتباسات) ومتطلبات كل لغة.",
    schema: z.object({
        anglesJson: z
            .string()
            .min(2)
            .describe("مصفوفة JSON للزوايا البحثية الناتجة عن expandSearchTopic أو كائن يحتوي على حقل angles"),
        languages: z
            .array(z.string())
            .min(1)
            .describe('مصفوفة رموز اللغات المطلوبة مثل ["ar", "en", "fr"]'),
        targetEngines: z
            .array(z.string())
            .min(1)
            .describe('مصفوفة أسماء محركات البحث المستهدفة مثل ["google", "bing", "tavily"]'),
    }),
});
// ─────────────────────────────────────────────────────────────────────────────
// الأداة الثالثة: بناء خطة تنفيذ الاستعلامات
// ─────────────────────────────────────────────────────────────────────────────
/**
 * أداة بناء خطة تنفيذ الاستعلامات النهائية وتوزيعها على محركات البحث.
 *
 * تستقبل هذه الأداة الاستعلامات المولَّدة من generateSearchQueries وإعدادات
 * خطة البحث (الحد الأقصى للنتائج، النطاقات المستبعدة)، ثم تبني خطة تنفيذ
 * شاملة تُحدِّد: ترتيب التنفيذ، تجميع الاستعلامات لكل محرك، معالجة النطاقات
 * المستبعدة، وإحصائيات التنفيذ المتوقعة.
 *
 * @returns كائن JSON يحتوي على خطة التنفيذ الكاملة مُجمَّعةً حسب المحرك
 */
export const buildQueryStrategy = tool(async ({ queriesJson, maxResultsPerEngine, excludedDomains, }) => {
    // تحليل الاستعلامات من JSON
    let parsedQueries;
    try {
        const parsed = JSON.parse(queriesJson);
        parsedQueries = Array.isArray(parsed) ? parsed : parsed.queries ?? [];
    }
    catch {
        return JSON.stringify({
            executionPlan: [],
            totalBatches: 0,
            error: "فشل تحليل queriesJson - تأكد من أن المدخل JSON صالح",
        });
    }
    // استخراج قائمة المحركات الفريدة من الاستعلامات
    const uniqueEngines = [...new Set(parsedQueries.map((q) => q.targetEngine))];
    // بناء مُرشِّح استبعاد النطاقات (لمحركات تدعم site: بالنفي)
    const buildExclusionFilter = (engine) => {
        if (!excludedDomains || excludedDomains.length === 0)
            return "";
        const supportsNegation = ["google", "bing"].includes(engine);
        if (!supportsNegation)
            return "";
        return excludedDomains.map((d) => `-site:${d}`).join(" ");
    };
    // تجميع الاستعلامات في دُفعات لكل محرك
    const executionPlan = [];
    for (const engine of uniqueEngines) {
        // تصفية الاستعلامات الخاصة بهذا المحرك ورتّبها حسب الأولوية
        const engineQueries = parsedQueries
            .filter((q) => q.targetEngine === engine)
            .sort((a, b) => a.priority - b.priority);
        const exclusionFilter = buildExclusionFilter(engine);
        // تجميع الاستعلامات في دُفعات (كل دفعة تحتوي على 5 استعلامات كحد أقصى)
        const batchSize = 5;
        const batches = [];
        for (let i = 0; i < engineQueries.length; i += batchSize) {
            const batchQueries = engineQueries.slice(i, i + batchSize);
            const batchIndex = Math.floor(i / batchSize) + 1;
            batches.push({
                batchId: `${engine}_batch_${batchIndex}`,
                queries: batchQueries.map((q) => ({
                    text: q.text,
                    language: q.language,
                    angle: q.angle,
                    priority: q.priority,
                    // دمج نص الاستعلام مع مُرشِّح الاستبعاد إن وُجد
                    finalQueryText: exclusionFilter
                        ? `${q.text} ${exclusionFilter}`.trim()
                        : q.text,
                })),
                maxResults: maxResultsPerEngine,
                exclusionFilter,
                estimatedRequests: batchQueries.length,
            });
        }
        executionPlan.push({
            engine,
            batches,
            totalQueries: engineQueries.length,
            totalEstimatedResults: engineQueries.length * maxResultsPerEngine,
        });
    }
    // حساب الإجماليات
    const totalQueries = parsedQueries.length;
    const totalBatches = executionPlan.reduce((sum, ep) => sum + ep.batches.length, 0);
    const totalEstimatedResults = executionPlan.reduce((sum, ep) => sum + ep.totalEstimatedResults, 0);
    const result = {
        executionPlan,
        summary: {
            totalEngines: uniqueEngines.length,
            totalQueries,
            totalBatches,
            totalEstimatedResults,
            excludedDomains: excludedDomains ?? [],
            maxResultsPerEngine,
        },
        strategyNotes: [
            `تم بناء خطة تنفيذ لـ ${uniqueEngines.length} محرك بحث`,
            `إجمالي الاستعلامات: ${totalQueries} موزَّعة على ${totalBatches} دفعة`,
            `الحد الأقصى للنتائج لكل محرك: ${maxResultsPerEngine}`,
            excludedDomains && excludedDomains.length > 0
                ? `النطاقات المستبعدة: ${excludedDomains.join("، ")}`
                : "لا توجد نطاقات مستبعدة",
            `إجمالي النتائج المتوقعة: ${totalEstimatedResults} نتيجة`,
        ],
    };
    return JSON.stringify(result);
}, {
    name: "buildQueryStrategy",
    description: "بناء خطة تنفيذ الاستعلامات النهائية وتوزيعها على محركات البحث. تُجمِّع الأداة الاستعلامات في دُفعات مُرتَّبة حسب الأولوية لكل محرك، وتُعالج النطاقات المستبعدة، وتُنتج خطة تنفيذ شاملة مع تقديرات للنتائج المتوقعة.",
    schema: z.object({
        queriesJson: z
            .string()
            .min(2)
            .describe("مصفوفة JSON للاستعلامات الناتجة عن generateSearchQueries أو كائن يحتوي على حقل queries"),
        maxResultsPerEngine: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(10)
            .describe("الحد الأقصى لعدد النتائج المطلوبة من كل محرك بحث"),
        excludedDomains: z
            .array(z.string())
            .optional()
            .describe('قائمة النطاقات المستبعدة من نتائج البحث مثل ["example.com", "spam.net"]'),
    }),
});
//# sourceMappingURL=query-tools.js.map