# تقرير جاهزية الإنتاج — نظام البحث العميق متعدد الوكلاء

> تاريخ الفحص: 12 مارس 2026 | المسار: `New folder (5)/`
> النوع: نظام متعدد الوكلاء (Python + TypeScript) | البنية: Orchestrator/Worker Pattern
> إصدار المشروع: 1.0.0

---

## ملخص تنفيذي

| المحور | الحالة | التفاصيل |
|--------|--------|----------|
| search-manager-agent (Python) | ⚠️ | الكود مكتمل هيكلياً، ينقصه `.env` وتثبيت الاعتمادات |
| search-scout-agent (TypeScript) | ❌ | 3 اعتمادات حرجة مفقودة، أخطاء TypeScript تمنع البناء |
| content-extractor-agent (TypeScript) | ❌ | **أسوأ حالة** — كل الاعتمادات مفقودة، الأدوات stubs فارغة |
| deep-research-analysis-agent (TypeScript) | ⚠️ | **أفضل حالة** — الاعتمادات مثبتة، الأدوات حقيقية، ينقصه `.env` |
| report-drafting-agent (TypeScript) | ❌ | الاعتمادات مفقودة، `tsconfig` يحتاج ضبط |
| ملفات البيئة `.env` | ❌ | مفقودة في **جميع** الوكلاء الخمسة |
| خوادم HTTP (المنافذ 3001-3004) | ❌ | **غير موجودة** في أي وكيل TypeScript |
| نظام الوحدات (Module System) | ❌ | تضارب ESM/CJS بين الوكلاء |
| القوالب (1.md - 4.md) | ✅ | مكتملة وشاملة |
| التوثيق (CLAUDE.md) | ✅ | شامل ومفصل |
| البنية المعمارية (التصميم) | ✅ | سليمة ومنطقية |

**النتيجة: غير قابل للتشغيل حالياً — يحتاج إصلاحات جوهرية في 4 محاور حرجة**

---

## 1. النواقص الحرجة (يجب إصلاحها قبل التشغيل)

### 1.1 ❌ غياب خوادم HTTP في جميع وكلاء TypeScript

**التشخيص:**
CLAUDE.md يوثّق أن المنسق (search-manager-agent) يستدعي الوكلاء عبر منافذ HTTP (3001-3004).
لكن أدوات Python في `src/tools/` تستخدم `asyncio.create_subprocess_exec("npm", "run", "dev")` — أي تشغيل CLI مباشر وليس HTTP.
في المقابل، لا يوجد أي وكيل TypeScript يحتوي على Express أو Fastify أو أي إطار خادم HTTP.

**المشكلة المزدوجة:**
- CLAUDE.md يوثّق نمط HTTP (ports 3001-3004) لكن الكود الفعلي يستخدم subprocess
- نمط subprocess الحالي يشغّل عملية جديدة لكل استدعاء ثم يقتلها — وهذا بطيء جداً وهش

**التأثير:** لا يمكن تشغيل النظام كفريق وكلاء متكامل بأي من الطريقتين.

**الإصلاح — خياران:**

الخيار أ (المتوافق مع الكود الحالي): إبقاء نمط subprocess مع إصلاح آلية الإدخال/الإخراج لكل وكيل ليقبل JSON من stdin ويخرج JSON على stdout.

الخيار ب (المتوافق مع التوثيق — الأفضل): إضافة Express wrapper لكل وكيل TypeScript:

```typescript
// server.ts (لكل وكيل)
import express from 'express';
const app = express();
app.use(express.json());

app.post('/run', async (req, res) => {
  const result = await runAgent(req.body);
  res.json(result);
});

app.listen(PORT, () => console.log(`Agent running on port ${PORT}`));
```

وتحديث أدوات Python لاستخدام httpx بدلاً من subprocess:

```python
import httpx

async def run_search_scout(topic: str, ...) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:3001/run",
            json={"searchPlan": search_plan},
            timeout=120
        )
        return response.text
```

---

### 1.2 ❌ content-extractor-agent: اعتمادات مفقودة بالكامل وأدوات فارغة

**التشخيص:**
- مجلد `node_modules/` غير موجود — لم يتم تشغيل `npm install` أصلاً
- **جميع الأدوات الخمس (fetch-tools, cleaner-tools, normalizer-tools) هي stubs** تعيد قيم ثابتة مشفرة (hardcoded mock strings) بدون أي منطق فعلي
- لا يوجد استخدام فعلي لـ `cheerio` أو `puppeteer` أو `axios` رغم إدراجها في `package.json`

**الأدوات المتأثرة:**
- `fetchWebpageTool` — لا تجلب أي محتوى فعلي
- `fetchWithHeadlessBrowserTool` — لا تشغّل متصفح
- `extractCoreContentTool` — لا تنظف HTML
- `ocrVisualExtractionTool` — لا تستخرج نصوص من صور
- `normalizeToSchemaTool` — لا تحوّل لـ JSON Schema

**الإصلاح:**
```bash
cd content-extractor-agent
npm install

# ثم: إعادة كتابة الأدوات الخمس بمنطق فعلي باستخدام:
# - axios + cheerio للجلب والتنظيف
# - puppeteer للصفحات الديناميكية (JavaScript-rendered)
# - zod للتحقق من المخرجات
```

---

### 1.3 ❌ content-extractor-agent: تضارب نظام الوحدات (ESM vs CJS)

**التشخيص:**
- `package.json` يحتوي `"type": "module"` → ESM
- `tsconfig.json` يحتوي `"module": "commonjs"` → CJS
- `scripts.start` يستخدم `ts-node` الذي يتوافق مع CJS افتراضياً

هذا التضارب سيسبب خطأ فوري عند التشغيل:
```
SyntaxError: Cannot use import statement in a module
```
أو:
```
ERR_REQUIRE_ESM
```

**الإصلاح — توحيد على CJS (الأسهل):**
```json
// package.json — احذف السطر:
"type": "module"
```

أو توحيد على ESM:
```json
// tsconfig.json — غيّر:
"module": "NodeNext",
"moduleResolution": "NodeNext"

// package.json — غيّر start:
"start": "tsx src/index.ts"
```

---

### 1.4 ❌ search-scout-agent: 3 اعتمادات حرجة مفقودة

**التشخيص:**
الكود في `src/index.ts` يستورد:
- `@langchain/langgraph` — غير موجود في package.json
- `@langchain/langgraph-checkpoint` — غير موجود في package.json
- `deepagents` — غير موجود في package.json

هذا سيمنع البناء والتشغيل تماماً.

**الإصلاح:**
```bash
cd search-scout-agent
npm install @langchain/langgraph @langchain/langgraph-checkpoint deepagents
```

---

### 1.5 ❌ report-drafting-agent: اعتمادات غير مثبتة

**التشخيص:**
- مجلد `node_modules/` غير موجود
- مجلد `dist/` غير موجود
- `tsconfig.json` يستخدم `Node16` بدلاً من `NodeNext` (قد يسبب مشاكل مع حزم ESM)

**الإصلاح:**
```bash
cd report-drafting-agent
npm install
```

---

### 1.6 ❌ ملفات `.env` مفقودة في جميع الوكلاء

**التشخيص:**
كل الوكلاء الخمسة يحتاجون `.env` — لا يوجد أي منها:

| الوكيل | `.env` | `.env.example` |
|--------|--------|----------------|
| search-manager-agent | ❌ مفقود | ✅ موجود |
| search-scout-agent | ❌ مفقود | ✅ موجود |
| content-extractor-agent | ❌ مفقود | ❌ مفقود أيضاً |
| deep-research-analysis-agent | ❌ مفقود | ✅ موجود |
| report-drafting-agent | ❌ مفقود | ✅ موجود |

**الإصلاح:**
```bash
# لكل وكيل يحتوي .env.example:
cd search-manager-agent && cp .env.example .env
cd ../search-scout-agent && cp .env.example .env
cd ../deep-research-analysis-agent && cp .env.example .env
cd ../report-drafting-agent && cp .env.example .env

# content-extractor-agent يحتاج إنشاء .env يدوياً:
cat > content-extractor-agent/.env << 'EOF'
OPENAI_API_KEY=sk-...
PORT=3002
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT_MS=10000
MAX_RETRIES=3
EOF

# ثم: تعبئة مفاتيح API الفعلية في كل ملف
```

---

### 1.7 ❌ search-manager-agent: اعتمادات Python غير مثبتة

**التشخيص:**
- لا يوجد `venv/` أو أي دليل على تثبيت الحزم
- `requirements.txt` يحتوي على:
  - `autogen-agentchat>=0.4.0`
  - `autogen-ext[openai]>=0.4.0`
  - `python-dotenv>=1.0.0`
  - `aiohttp>=3.9.0`

ملاحظة: CLAUDE.md يذكر `httpx` و `pydantic` في requirements.txt لكن الملف الفعلي لا يحتويهما — وهذا تضارب بين التوثيق والكود.

**الإصلاح:**
```bash
cd search-manager-agent
python -m venv venv
# Linux/Mac:
source venv/bin/activate
# Windows:
# venv\Scripts\activate
pip install -r requirements.txt
```

---

## 2. التحذيرات (قد تسبب مشاكل)

### 2.1 ⚠️ config.py: ANTHROPIC_API_KEY معرّف لكن غير مستخدم

**التشخيص:**
`src/config.py` يحمّل `ANTHROPIC_API_KEY` من البيئة، لكن `manager_agent.py` يستخدم فقط `OpenAIChatCompletionClient`.
لا يوجد أي استخدام لـ Anthropic API في كود Python.

**التأثير المحتمل:** لا يؤثر على التشغيل، لكنه تضليل — يوحي بدعم نماذج Claude بينما المنسق يعمل فقط مع OpenAI.

**الإصلاح المقترح:** إما إزالة المتغير من config.py، أو إضافة دعم فعلي لنماذج Anthropic عبر:
```python
from autogen_ext.models.anthropic import AnthropicChatCompletionClient
```

---

### 2.2 ⚠️ تضارب بين CLAUDE.md والكود الفعلي في عدة نقاط

| النقطة | CLAUDE.md يقول | الكود الفعلي |
|--------|---------------|-------------|
| آلية الاتصال | HTTP على منافذ 3001-3004 | subprocess (npm run dev) |
| requirements.txt | يتضمن httpx, pydantic | لا يتضمنهما |
| search-scout scripts | `"dev": "ts-node src/index.ts"` | `"dev": "tsx watch src/index.ts"` |
| content-extractor | `"start": "ts-node src/index.ts"` (CJS) | صحيح لكن يتعارض مع `"type": "module"` |

**التأثير المحتمل:** أي مطور يعتمد على CLAUDE.md سيواجه مفاجآت عند التشغيل الفعلي.

---

### 2.3 ⚠️ deep-research-analysis-agent يحتوي dist/ قديم

**التشخيص:**
مجلد `dist/` موجود (عكس الوكلاء الأخرى) مما يعني أنه بُني سابقاً.
لكن لا ضمان أن `dist/` يعكس آخر تعديلات على `src/`.

**الإصلاح المقترح:**
```bash
cd deep-research-analysis-agent
npm run build  # إعادة البناء لضمان التزامن
```

---

### 2.4 ⚠️ deepagents@latest: تثبيت إصدار غير محدد

**التشخيص:**
`content-extractor-agent/package.json` و `search-scout-agent/package.json` يستخدمان `"deepagents": "latest"` بدلاً من إصدار محدد.
هذا يعني أن أي تثبيت جديد قد يجلب إصداراً مختلفاً يكسر التوافق.

**الإصلاح المقترح:**
```bash
# بعد تثبيت ناجح، ثبّت الإصدار:
npm ls deepagents  # لمعرفة الإصدار الحالي
# ثم في package.json: "deepagents": "^1.8.2"
```

---

### 2.5 ⚠️ report-drafting-agent: اسم النموذج مشفر بدون override

**التشخيص:**
في `src/index.ts` أو ملفات الـ prompts، اسم النموذج (claude-sonnet) مكتوب مباشرة في الكود بدون قراءة من متغير بيئة.

**التأثير المحتمل:** لا يمكن تغيير النموذج بدون تعديل الكود.

---

## 3. المتغيرات البيئية المطلوبة

### search-manager-agent

| المتغير | مطلوب | الوصف | القيمة الافتراضية |
|---------|-------|-------|-------------------|
| OPENAI_API_KEY | ✅ نعم | مفتاح OpenAI | — |
| MODEL_NAME | اختياري | اسم نموذج OpenAI | gpt-4o |

### search-scout-agent

| المتغير | مطلوب | الوصف | القيمة الافتراضية |
|---------|-------|-------|-------------------|
| ANTHROPIC_API_KEY | ✅ نعم | مفتاح Anthropic | — |
| OPENAI_API_KEY | ✅ نعم | مفتاح OpenAI | — |
| SERPER_API_KEY | ✅ نعم | مفتاح Serper (بحث Google) | — |
| GOOGLE_SEARCH_API_KEY | اختياري | مفتاح Google Custom Search | — |
| GOOGLE_SEARCH_ENGINE_ID | اختياري | معرّف محرك البحث | — |
| BING_SEARCH_API_KEY | اختياري | مفتاح Bing Search | — |
| TAVILY_API_KEY | اختياري | مفتاح Tavily Search | — |

### content-extractor-agent

| المتغير | مطلوب | الوصف | القيمة الافتراضية |
|---------|-------|-------|-------------------|
| OPENAI_API_KEY | ✅ نعم | مفتاح OpenAI | — |

### deep-research-analysis-agent

| المتغير | مطلوب | الوصف | القيمة الافتراضية |
|---------|-------|-------|-------------------|
| OPENAI_API_KEY | ✅ نعم | مفتاح OpenAI | — |

### report-drafting-agent

| المتغير | مطلوب | الوصف | القيمة الافتراضية |
|---------|-------|-------|-------------------|
| ANTHROPIC_API_KEY | ✅ نعم | مفتاح Anthropic (Claude) | — |
| OPENAI_API_KEY | ✅ نعم | مفتاح OpenAI | — |

### الحد الأدنى من مفاتيح API للتشغيل

| المفتاح | الوكلاء التي تحتاجه |
|---------|---------------------|
| OPENAI_API_KEY | الخمسة جميعاً |
| ANTHROPIC_API_KEY | search-scout + report-drafting |
| SERPER_API_KEY | search-scout (محرك بحث أساسي) |

---

## 4. خدمات البنية التحتية المطلوبة

| الخدمة | الغرض | الحالة |
|--------|--------|--------|
| Node.js >= 20.0 | تشغيل وكلاء TypeScript | يحتاج تحقق يدوي |
| Python >= 3.11 | تشغيل المنسق | يحتاج تحقق يدوي |
| npm >= 10.0 | إدارة حزم TypeScript | يحتاج تحقق يدوي |
| OpenAI API | نماذج GPT-4o | يحتاج مفتاح مدفوع |
| Anthropic API | نماذج Claude | يحتاج مفتاح مدفوع |
| Serper API | بحث Google | يحتاج مفتاح (مجاني حتى 2500 طلب/شهر) |

**لا يحتاج:** قواعد بيانات، Redis، Docker (اختياري)، أو خدمات سحابية أخرى.

---

## 5. أوامر الإعداد الكامل (من الصفر حتى التشغيل)

```bash
# ════════════════════════════════════════════
# الخطوة 1: التحقق من المتطلبات الأساسية
# ════════════════════════════════════════════
node --version    # يجب >= 20.0
python --version  # يجب >= 3.11
npm --version     # يجب >= 10.0

# ════════════════════════════════════════════
# الخطوة 2: تثبيت اعتمادات Python (المنسق)
# ════════════════════════════════════════════
cd search-manager-agent
python -m venv venv
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# عدّل .env وأضف OPENAI_API_KEY

# ════════════════════════════════════════════
# الخطوة 3: تثبيت search-scout-agent
# ════════════════════════════════════════════
cd ../search-scout-agent
npm install
# أضف الاعتمادات المفقودة:
npm install @langchain/langgraph @langchain/langgraph-checkpoint deepagents
cp .env.example .env
# عدّل .env وأضف المفاتيح المطلوبة

# ════════════════════════════════════════════
# الخطوة 4: تثبيت content-extractor-agent
# ════════════════════════════════════════════
cd ../content-extractor-agent
npm install
# أنشئ .env يدوياً (لا يوجد .env.example):
# OPENAI_API_KEY=sk-...
# ⚠️ يجب إصلاح تضارب ESM/CJS أولاً (راجع القسم 1.3)
# ⚠️ يجب إعادة كتابة الأدوات الفارغة (راجع القسم 1.2)

# ════════════════════════════════════════════
# الخطوة 5: تثبيت deep-research-analysis-agent
# ════════════════════════════════════════════
cd ../deep-research-analysis-agent
# node_modules موجودة بالفعل
npm run build   # إعادة بناء dist/
cp .env.example .env
# عدّل .env وأضف OPENAI_API_KEY

# ════════════════════════════════════════════
# الخطوة 6: تثبيت report-drafting-agent
# ════════════════════════════════════════════
cd ../report-drafting-agent
npm install
cp .env.example .env
# عدّل .env وأضف ANTHROPIC_API_KEY و OPENAI_API_KEY

# ════════════════════════════════════════════
# الخطوة 7: بناء وكلاء TypeScript
# ════════════════════════════════════════════
cd ../search-scout-agent && npm run build
cd ../content-extractor-agent && npm run build
cd ../deep-research-analysis-agent && npm run build
cd ../report-drafting-agent && npm run build

# ════════════════════════════════════════════
# الخطوة 8: تشغيل النظام
# ════════════════════════════════════════════
# Terminal 1-4: شغّل كل وكيل TypeScript
cd search-scout-agent && npm start
cd content-extractor-agent && npm start
cd deep-research-analysis-agent && npm start
cd report-drafting-agent && npm start

# Terminal 5 (أخيراً):
cd search-manager-agent
source venv/bin/activate
python -m src.main --query "سؤالك البحثي هنا"
```

---

## 6. ملاحظات إضافية

### 6.1 الفجوة الأكبر: content-extractor-agent

هذا الوكيل في أسوأ حالة بين الخمسة — أدواته الخمس كلها stubs فارغة. يحتاج **إعادة كتابة كاملة** للأدوات باستخدام:
- `axios` + `cheerio` — لجلب وتنظيف صفحات HTML الثابتة
- `puppeteer` — لجلب صفحات JavaScript-rendered
- `zod` — للتحقق من مخرجات الـ JSON Schema

هذا يمثل **أكبر عائق** أمام تشغيل النظام الكامل.

### 6.2 الوكيل الأجهز: deep-research-analysis-agent

هذا الوكيل في أفضل حالة:
- الاعتمادات مثبتة
- الأدوات تحتوي منطق فعلي (يستخدم `duck-duck-scrape` للبحث الحقيقي)
- الكود يعمل كـ CLI مستقل
- يحتاج فقط `.env` وإعادة بناء `dist/`

### 6.3 نمط الاتصال بين الوكلاء يحتاج قراراً معمارياً

الكود الحالي يستخدم subprocess (تشغيل `npm run dev` كعملية مؤقتة لكل استدعاء).
التوثيق يصف HTTP servers.
**يجب اتخاذ قرار واضح** بأحد النمطين وتوحيد الكود والتوثيق عليه.

توصيتي: **نمط HTTP** — لأنه يتيح:
- تشغيل الوكلاء مرة واحدة وإبقاءها تعمل
- استدعاء أسرع (لا overhead لبدء عملية جديدة)
- مراقبة أسهل (health checks, logs)
- قابلية للنشر في Docker/Kubernetes

### 6.4 ترتيب أولويات الإصلاح المقترح

| الأولوية | المهمة | الجهد المقدّر |
|----------|--------|---------------|
| 1 | إنشاء ملفات `.env` لجميع الوكلاء | 15 دقيقة |
| 2 | تثبيت الاعتمادات المفقودة (npm install + pip install) | 10 دقائق |
| 3 | إصلاح تضارب ESM/CJS في content-extractor | 30 دقيقة |
| 4 | إضافة الاعتمادات المفقودة لـ search-scout | 5 دقائق |
| 5 | اتخاذ قرار HTTP vs subprocess وتنفيذه | 2-4 ساعات |
| 6 | إعادة كتابة أدوات content-extractor (5 أدوات) | 6-10 ساعات |
| 7 | تصحيح CLAUDE.md ليطابق الكود الفعلي | 1 ساعة |
| 8 | اختبار تكاملي شامل | 2-3 ساعات |

**إجمالي الجهد المقدّر: 12-19 ساعة عمل**

---

*تم إنشاء هذا التقرير آلياً بتاريخ 12 مارس 2026*
