# تقرير جاهزية الإنتاج v2 — نظام البحث العميق متعدد الوكلاء

> تاريخ الفحص: 12 مارس 2026 — 11:45 UTC
> المسار: `New folder (5)/`
> الإصدار: 1.1.0 (بعد تنفيذ جزئي لـ Envelope V1)

---

## ما تغيّر منذ الفحص الأول

| العنصر | الفحص الأول | الآن |
|--------|------------|------|
| `shared/` (عقد موحد) | غير موجود | ✅ موجود — Envelope V1 كامل |
| search-scout `node_modules` | مفقود (3 حزم ناقصة) | ✅ مثبت (81 حزمة) + `dist/` مبني |
| content-extractor `node_modules` | مفقود بالكامل | ✅ مثبت (179 حزمة) + `dist/` مبني |
| content-extractor الأدوات | stubs فارغة | ✅ **أُعيد كتابتها بمنطق فعلي** (3 وكلاء فرعيين) |
| content-extractor ESM/CJS | تضارب | ✅ **تم الحل** → NodeNext/NodeNext |
| search-scout الاعتمادات المفقودة | 3 حزم ناقصة | ✅ **تم إضافتها** في package.json |
| `deepagents` إصدار | `latest` (خطر) | ✅ مُثبّت: `^0.1.0` و `^1.8.2` |
| `.env` جذر المشروع | غير موجود | ✅ موجود بمفاتيح فعلية |
| `.gitignore` | غير موجود | ✅ موجود وشامل |
| `.git` | غير موجود | ✅ مُهيّأ |
| `specs/` | غير موجود | ✅ مواصفة Envelope V1 كاملة |
| قوالب القوالب المرجعية القديمة | ✅ موجودة | ❌ **حُذفت** |
| AGENTS.md | ✅ موجود | ❌ **حُذف** |
| report-drafting `node_modules` | مفقود | ❌ **لا يزال مفقوداً** |
| search-manager `venv` | مفقود | ❌ **لا يزال مفقوداً** |
| ملفات `.env` للوكلاء | مفقودة | ❌ **لا تزال مفقودة** |

---

## الملخص التنفيذي — الوضع الحالي

| المحور | الحالة | التفاصيل |
|--------|--------|----------|
| search-scout-agent | ✅ | جاهز — مبني، اعتمادات مثبتة، يدعم Envelope V1 |
| content-extractor-agent | ✅ | جاهز — أُعيد كتابته بالكامل، 3 وكلاء فرعيين حقيقيين |
| deep-research-analysis-agent | ✅ | جاهز — مبني واعتمادات مثبتة |
| report-drafting-agent | ❌ | **غير جاهز** — `node_modules` و `dist/` مفقودان |
| search-manager-agent (Python) | ❌ | **غير جاهز** — لا `venv`، لا اعتمادات مثبتة |
| shared/ (العقد الموحد) | ✅ | مكتمل — Envelope V1 + validators + adapters |
| ملفات `\.env` للوكلاء | ✅ | الوكلاء يعتمدون على ملف البيئة في الجذر مباشرة |
| قوالب التقارير (القوالب المرجعية القديمة) | ❌ | **حُذفت لكن الكود لا يزال يشير إليها** |
| إصدارات الحزم | ⚠️ | تضارب حاد بين الوكلاء |

**النتيجة: الجاهزية ارتفعت من ~35% إلى ~65% — لكن 4 عوائق حرجة لا تزال تمنع التشغيل الكامل.**

---

## النواقص الحرجة المتبقية

### ❌ 1. report-drafting-agent: لا يمكن تشغيله

`node_modules/` و `dist/` مفقودان. هذا الوكيل هو الحلقة الأخيرة في السلسلة — بدونه لا يُنتَج تقرير نهائي.

```bash
cd report-drafting-agent
npm install
npm run build
```

---

### ❌ 2. search-manager-agent: لا يمكن تشغيله

لا `venv` ولا اعتمادات Python مثبتة. هذا هو المنسق الرئيسي — بدونه لا يعمل شيء.

```bash
cd search-manager-agent
python -m venv venv
source venv/bin/activate   # أو venv\Scripts\activate على Windows
pip install -r requirements.txt
```

---

### ❌ 3. قوالب التقارير المحذوفة (القوالب المرجعية القديمة) لا تزال مرجعاً في الكود

الملفات حُذفت فعلياً من الجذر، لكن الكود لا يزال يشير إليها:

**في search-manager-agent:**
- `src/agents/manager_agent.py` — يشير إلى "النمط المفصل" و "النمط المتوسط" و "النمط المختصر" و "معيار التقييم" في system prompt على الأسطر 108، 115، 123، 156، 164، 191، 198، 204

**في report-drafting-agent:**
- `src/prompts/main-orchestrator.ts` — يشير إلى "قوالب النمط المفصل + النمط المتوسط + النمط المختصر"
- `src/prompts/citation-linker.ts` — يشير إلى "التوثيق الصارم من معيار التقييم"

**التأثير:** الوكلاء ستحاول قراءة هذه الملفات أو تطبيق تعليماتها ولن تجدها → سلوك غير متوقع في صياغة التقارير.

**الإصلاح — خياران:**
- **أ)** استعادة الملفات الأربعة من Git history: `- **ب)** تضمين محتوى القوالب مباشرة في system prompts الخاصة بكل وكيل

---

### ❌ 4. ملفات `.env` مفقودة في كل الوكلاء (رغم وجود `.env` جذر)

يوجد `.env` في جذر المشروع بمفاتيح فعلية، لكن كل وكيل يقرأ `.env` من **مجلده الخاص** عبر `dotenv`.
الوكلاء الخمسة يعتمدون الآن على ملف البيئة الموحد في الجذر مباشرة.

**الإصلاح — خياران:**
- **أ)** نسخ `.env` الجذر لكل وكيل: `for d in search-scout-agent content-extractor-agent deep-research-analysis-agent report-drafting-agent search-manager-agent; do cp .env $d/.env; done`
- **ب)** تعديل كل وكيل ليقرأ من `../.env` (أنظف لكن يحتاج تعديل كود)

---

## التحذيرات

### ⚠️ 1. تضارب حاد في إصدارات الحزم المشتركة

| الحزمة | search-scout | content-extractor | report-drafting |
|--------|-------------|-------------------|-----------------|
| `deepagents` | ^0.1.0 | **^1.8.2** | ^0.1.0 |
| `@langchain/langgraph` | ^0.2.0 | **^1.1.4** | — |
| `@langchain/core` | ^0.3.0 (ضمني) | **^1.1.32** | ^0.3.0 (ضمني) |
| `zod` | ^3.23.0 | **^4.3.6** | ^3.22.0 |
| `typescript` | ^5.5.0 | **^5.8.3** | ^5.3.0 |

هذا التضارب يعني:
- `content-extractor` على إصدارات أحدث بكثير (major version bumps)
- `shared/` يستخدم `zod@^4.3.6` لكن `search-scout` يستخدم `zod@^3.23.0` — **تضارب في API** لأن zod 4 يختلف عن zod 3
- عند ربط `shared/` مع الوكلاء، قد تظهر أخطاء أنواع (type errors)

---

### ⚠️ 2. نمط الاتصال لا يزال subprocess

أدوات Python في `src/tools/*.py` لا تزال تستخدم `asyncio.create_subprocess_exec("npm", "run", "dev")`.
لا يوجد HTTP server في أي وكيل TypeScript رغم أن CLAUDE.md يصف منافذ 3001-3004.
لكن مع Envelope V1، الوضع أصبح أوضح — الوكلاء يقبلون الإدخال عبر:
- stdin (JSON envelope)
- `--envelope-path=<path>`

هذا يجعل نمط subprocess أكثر قابلية للتنفيذ مما كان عليه سابقاً.

---

### ⚠️ 3. Module system لا يزال غير موحد

| الوكيل | module | moduleResolution |
|--------|--------|-----------------|
| search-scout | ESNext | bundler |
| content-extractor | NodeNext | NodeNext |
| report-drafting | Node16 | Node16 |
| shared | — | — |

لا يسبب مشاكل فورية لأن كل وكيل مستقل، لكنه يعقّد الصيانة.

---

## ما يعمل بشكل جيد

✅ **search-scout-agent** — 450 سطر، 3 وكلاء فرعيين حقيقيين، backend abstraction، يدعم Envelope V1

✅ **content-extractor-agent** — أُعيد كتابته بالكامل، 3 وكلاء فرعيين (fetch + clean + normalize)، يستخدم cheerio وpuppeteer فعلياً

✅ **deep-research-analysis-agent** — مبني وجاهز، يستخدم duck-duck-scrape للبحث الحقيقي

✅ **Envelope V1 (shared/)** — عقد موحد مع types + validators + adapters (redis, sqlite) + file-lock + recovery decisions

✅ **specs/001-unify-agent-contract/** — مواصفة كاملة تغطي الأطوار 1-5 مع user stories ومعايير قبول

✅ **.env الجذر** — يحتوي مفاتيح فعلية (OpenAI, Anthropic, Google, Serper, Tavily, Bing, LangSmith)

✅ **.gitignore** — يغطي node_modules, dist, .env, venv, runtime

---

## أوامر الإصلاح السريع (الوصول للتشغيل)

```bash
cd "/path/to/New folder (5)"

# 1. إصلاح report-drafting-agent (الوحيد بدون node_modules)
cd report-drafting-agent && npm install && npm run build && cd ..

# 2. إصلاح search-manager-agent (Python)
cd search-manager-agent && python -m venv venv
# Linux/Mac:
source venv/bin/activate
# Windows:
# venv\Scripts\activate
pip install -r requirements.txt && cd ..

# 3. توزيع .env الجذر على جميع الوكلاء
for d in search-scout-agent content-extractor-agent deep-research-analysis-agent report-drafting-agent search-manager-agent; do
  cp .env "$d/.env"
done

# 4. استعادة قوالب التقارير المحذوفة
# ثم:

# 5. تشغيل النظام
cd search-scout-agent && npm start &
cd content-extractor-agent && npm start &
cd deep-research-analysis-agent && npm start &
cd report-drafting-agent && npm start &
cd search-manager-agent && python -m src.main --query "سؤالك"
```

---

## ترتيب أولويات الإصلاح

| الأولوية | المهمة | الجهد | الحالة |
|----------|--------|-------|--------|
| 1 | `npm install && npm run build` لـ report-drafting | 5 دقائق | ❌ لم يُنفَّذ |
| 2 | تثبيت اعتمادات Python لـ search-manager | 5 دقائق | ❌ لم يُنفَّذ |
| 3 | نسخ `.env` الجذر لكل وكيل | 1 دقيقة | ❌ لم يُنفَّذ |
| 4 | استعادة القوالب المرجعية القديمة من Git | 5 دقائق | ❌ لم يُنفَّذ |
| 5 | توحيد إصدارات الحزم المشتركة | 1-2 ساعة | ⚠️ غير حرج حالياً |
| 6 | توحيد module system | 1 ساعة | ⚠️ غير حرج حالياً |

**الجهد المتبقي للوصول لتشغيل كامل: ~20 دقيقة (الخطوات 1-4) + اختبار**

---

*تقرير v2 — 12 مارس 2026 — فحص حي جديد*
