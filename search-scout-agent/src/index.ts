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
import {
  createDeepAgent,
  StateBackend,
  StoreBackend,
  FilesystemBackend,
  LocalShellBackend,
} from "deepagents";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { tool } from "langchain";
import { z } from "zod";

import {
  queryGeneratorAgent,
  searchExecutorAgent,
  resultRankerAgent,
} from "./subagents/index.js";

import { MAIN_ORCHESTRATOR_PROMPT } from "./prompts/main-orchestrator.js";

import type {
  SearchPlan,
  SearchEngine,
  SearchLanguage,
  SearchTopic,
  ModelProvider,
  SearchScoutOutput,
  AgentConfig,
  BackendType,
} from "./types/index.js";

// ─────────────────────────────────────────────
// أدوات المستوى الرئيسي (Main Agent Tools)
// ─────────────────────────────────────────────

/**
 * أداة التحقق من حالة خطة البحث قبل التنفيذ
 * تتحقق من اكتمال المعلومات المطلوبة في خطة البحث
 */
const validateSearchPlan = tool(
  async ({ planJson }: { planJson: string }) => {
    try {
      const plan = JSON.parse(planJson);
      const issues: string[] = [];

      if (!plan.topic?.trim()) issues.push("الموضوع مطلوب");
      if (!plan.objective?.trim()) issues.push("الهدف مطلوب");
      if (!plan.languages?.length) issues.push("يجب تحديد لغة واحدة على الأقل");
      if (!plan.engines?.length) issues.push("يجب تحديد محرك بحث واحد على الأقل");
      if (!plan.maxResultsPerEngine || plan.maxResultsPerEngine < 1) {
        issues.push("الحد الأقصى للنتائج يجب أن يكون 1 على الأقل");
      }

      const validEngines = ["serper", "google", "bing", "tavily"];
      const invalidEngines = (plan.engines || []).filter(
        (e: string) => !validEngines.includes(e)
      );
      if (invalidEngines.length) {
        issues.push(`محركات غير معروفة: ${invalidEngines.join(", ")}`);
      }

      return JSON.stringify({
        valid: issues.length === 0,
        issues,
        summary: issues.length === 0
          ? "خطة البحث مكتملة وجاهزة للتنفيذ"
          : `وُجدت ${issues.length} مشاكل في خطة البحث`,
      });
    } catch {
      return JSON.stringify({
        valid: false,
        issues: ["صيغة JSON غير صالحة"],
        summary: "فشل تحليل خطة البحث",
      });
    }
  },
  {
    name: "validate_search_plan",
    description: "التحقق من اكتمال وصحة خطة البحث قبل تفويضها للوكلاء الفرعيين. استخدمها دائماً قبل بدء التنفيذ.",
    schema: z.object({
      planJson: z.string().describe("خطة البحث بصيغة JSON"),
    }),
  }
);

/**
 * أداة تجميع نتائج خط الأنابيب في مخرج نهائي واحد
 */
const assembleSearchOutput = tool(
  async ({
    queryResultsJson,
    searchResultsJson,
    rankingResultsJson,
    enginesUsed,
    languagesSearched,
  }: {
    queryResultsJson: string;
    searchResultsJson: string;
    rankingResultsJson: string;
    enginesUsed: string;
    languagesSearched: string;
  }) => {
    const startTime = new Date().toISOString();

    return JSON.stringify({
      queryGeneration: JSON.parse(queryResultsJson),
      searchExecution: JSON.parse(searchResultsJson),
      ranking: JSON.parse(rankingResultsJson),
      metadata: {
        startedAt: startTime,
        completedAt: new Date().toISOString(),
        enginesUsed: JSON.parse(enginesUsed),
        languagesSearched: JSON.parse(languagesSearched),
      },
      assembledAt: new Date().toISOString(),
    });
  },
  {
    name: "assemble_search_output",
    description: "تجميع نتائج الخطوات الثلاث (توليد الاستعلامات، تنفيذ البحث، الترتيب) في مخرج JSON نهائي موحّد. استخدمها بعد اكتمال جميع الخطوات.",
    schema: z.object({
      queryResultsJson: z.string().describe("نتائج مولّد الاستعلامات بصيغة JSON"),
      searchResultsJson: z.string().describe("نتائج منفذ البحث بصيغة JSON"),
      rankingResultsJson: z.string().describe("نتائج مرشح النتائج بصيغة JSON"),
      enginesUsed: z.string().describe("قائمة المحركات المستخدمة بصيغة JSON array"),
      languagesSearched: z.string().describe("قائمة اللغات المستخدمة بصيغة JSON array"),
    }),
  }
);

// ─────────────────────────────────────────────
// إعداد نموذج اللغة
// ─────────────────────────────────────────────

/**
 * إنشاء نموذج اللغة حسب المزود المحدد
 */
function createModel(provider?: ModelProvider, modelName?: string) {
  const selectedProvider =
    provider ||
    (process.env.DEFAULT_MODEL_PROVIDER as ModelProvider) ||
    "anthropic";

  if (selectedProvider === "openai") {
    return new ChatOpenAI({
      model: modelName || "gpt-4o",
      temperature: 0,
      maxTokens: 8192,
    });
  }

  return new ChatAnthropic({
    model: modelName || "claude-sonnet-4-20250514",
    temperature: 0,
    maxTokens: 8192,
  });
}

// ─────────────────────────────────────────────
// إعداد Backend حسب التوثيق الرسمي
// ─────────────────────────────────────────────

/**
 * إنشاء Backend حسب النوع المطلوب
 *
 * الأنواع المدعومة (من التوثيق):
 * - state: StateBackend — تخزين مؤقت في الذاكرة (الافتراضي)
 * - store: StoreBackend — تخزين دائم عبر المحادثات
 * - filesystem: FilesystemBackend — تخزين على نظام الملفات
 * - local-shell: LocalShellBackend — وصول لنظام الملفات + تنفيذ أوامر
 */
function createBackend(type: BackendType, rootDir?: string) {
  switch (type) {
    case "store":
      return (config: any) => new StoreBackend(config);
    case "filesystem":
      return (config: any) =>
        new FilesystemBackend({ rootDir: rootDir || "./search-workspace" });
    case "local-shell":
      return new LocalShellBackend({
        rootDir: rootDir || "./search-workspace",
        inheritEnv: true,
        timeout: 120,
        maxOutputBytes: 100_000,
      });
    case "state":
    default:
      return (config: any) => new StateBackend(config);
  }
}

// ─────────────────────────────────────────────
// إنشاء الوكيل الرئيسي
// ─────────────────────────────────────────────

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
export function createSearchScoutAgent(config?: Partial<AgentConfig>) {
  const model = createModel(config?.provider, config?.modelName);

  // إعداد Backend حسب التكوين
  const backendType = config?.backendType || "state";
  const backend = createBackend(backendType, config?.workspaceDir);

  // إعداد Checkpointer للحفظ عبر المحادثات
  const checkpointer = config?.enablePersistence ? new MemorySaver() : undefined;

  // إعداد Store للذاكرة طويلة المدى
  const store = config?.enablePersistence ? new InMemoryStore() : undefined;

  return createDeepAgent({
    // النموذج الرئيسي
    model,

    // System prompt للمنسق
    systemPrompt: MAIN_ORCHESTRATOR_PROMPT,

    // أدوات المستوى الرئيسي — التحقق والتجميع
    tools: [validateSearchPlan, assembleSearchOutput],

    // الوكلاء الفرعيين الثلاثة
    subagents: [
      queryGeneratorAgent,
      searchExecutorAgent,
      resultRankerAgent,
    ],

    // Backend — حسب التوثيق الرسمي
    backend,

    // Checkpointer — لحفظ المحادثات عبر الجلسات
    ...(checkpointer && { checkpointer }),

    // Store — للذاكرة طويلة المدى عبر المحادثات
    ...(store && { store }),
  });
}

// ─────────────────────────────────────────────
// دالة تشغيل البحث
// ─────────────────────────────────────────────

/**
 * تشغيل وكيل البحث والاستكشاف على خطة بحث محددة
 */
export async function executeSearch(
  plan: SearchPlan,
  config?: Partial<AgentConfig>
) {
  const agent = createSearchScoutAgent(config);

  const prompt = buildSearchPrompt(plan);

  // إعداد thread_id إذا كان الحفظ مفعّلاً
  const invokeConfig = config?.threadId
    ? { configurable: { thread_id: config.threadId } }
    : undefined;

  const result = await agent.invoke(
    { messages: [{ role: "user", content: prompt }] },
    invokeConfig
  );

  return {
    messages: result.messages,
    todos: result.todos,
    files: result.files,
    finalMessage: result.messages[result.messages.length - 1].content,
  };
}

/**
 * بناء الـ prompt من خطة البحث
 */
function buildSearchPrompt(plan: SearchPlan): string {
  return `## طلب تنفيذ بحث

### المعلومات الأساسية
- **الموضوع**: ${plan.topic}
- **الهدف**: ${plan.objective}
- **النطاق الجغرافي**: ${plan.geographicScope || "عالمي"}
- **النطاق الزمني**: ${plan.timeFrame || "غير محدد"}
- **الجمهور المستهدف**: ${plan.targetAudience || "عام"}

### إعدادات البحث
- **اللغات**: ${plan.languages.join(", ")}
- **نوع البحث**: ${plan.searchTopic}
- **المحركات المطلوبة**: ${plan.engines.join(", ")}
- **الحد الأقصى للنتائج لكل محرك**: ${plan.maxResultsPerEngine}

${plan.seedKeywords?.length ? `### كلمات مفتاحية أولية\n${plan.seedKeywords.join(", ")}` : ""}

${plan.excludedDomains?.length ? `### نطاقات مستبعدة\n${plan.excludedDomains.join(", ")}` : ""}

${plan.additionalInstructions ? `### تعليمات إضافية\n${plan.additionalInstructions}` : ""}

---
**التعليمات**: نفّذ خطة البحث بالكامل باتباع خط الأنابيب المحدد:
1. تحقق من خطة البحث باستخدام validate_search_plan
2. فوّض **query-generator** لتحليل الموضوع وتوليد استعلامات ذكية متنوعة
3. فوّض **search-executor** لتنفيذ الاستعلامات بالتوازي على المحركات المحددة
4. فوّض **result-ranker** لإزالة التكرارات وترتيب النتائج حسب الصلة
5. استخدم assemble_search_output لتجميع النتائج النهائية

اكتب النتائج النهائية في:
- /search_results.json — النتائج المهيكلة الكاملة
- /search_summary.md — ملخص مقروء بالعربية`;
}

// ─────────────────────────────────────────────
// نقطة الدخول الرئيسية
// ─────────────────────────────────────────────

async function main() {
  console.log("بدء تشغيل وكيل البحث والاستكشاف...\n");

  // مثال للاستخدام
  const samplePlan: SearchPlan = {
    topic: "تأثير الذكاء الاصطناعي التوليدي على قطاع التعليم في العالم العربي",
    objective:
      "جمع أحدث الدراسات والتقارير حول استخدام الذكاء الاصطناعي التوليدي في التعليم العربي، مع التركيز على التجارب الفعلية والتحديات",
    geographicScope: "العالم العربي",
    timeFrame: "2023-2026",
    targetAudience: "صناع القرار في قطاع التعليم",
    languages: ["ar", "en"],
    searchTopic: "general",
    engines: ["serper", "google", "bing", "tavily"],
    maxResultsPerEngine: 10,
    seedKeywords: [
      "الذكاء الاصطناعي التوليدي في التعليم",
      "generative AI education Arab world",
      "ChatGPT في الجامعات العربية",
      "AI edtech Middle East",
    ],
    excludedDomains: ["pinterest.com", "quora.com"],
    additionalInstructions:
      "ركّز على المصادر الأكاديمية والتقارير المؤسسية. تجنب المدونات الشخصية والمحتوى التسويقي.",
  };

  try {
    const result = await executeSearch(samplePlan, {
      provider: "anthropic",
      backendType: "state",
      enablePersistence: false,
    });

    console.log("\nتم تنفيذ البحث بنجاح!");
    console.log("الملفات المنشأة:", Object.keys(result.files || {}));
    console.log("\nالمهام المنجزة:");
    result.todos?.forEach((todo: any) => {
      const status = todo.status === "completed" ? "[done]" : "[...]";
      console.log(`  ${status} ${todo.description}`);
    });

    console.log("\nالرسالة النهائية:");
    console.log(result.finalMessage);
  } catch (error) {
    console.error("خطأ:", error);
    process.exit(1);
  }
}

// تشغيل إذا كان الملف هو نقطة الدخول
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("index.ts");

if (isMainModule) {
  main();
}

// تصدير الأنواع والدوال
export type {
  SearchPlan,
  SearchEngine,
  SearchLanguage,
  SearchTopic,
  ModelProvider,
  SearchScoutOutput,
  AgentConfig,
  BackendType,
};
