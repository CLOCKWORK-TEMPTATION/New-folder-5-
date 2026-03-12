# Phase 1 Research: Unified Agent Contract

## T001: الأسئلة المتبقية وحلولها

1. **تكامل AutoGen مع TypeScript/JSON**
   - الاستنتاج: التكامل الآمن بين Python AutoGen ووكلاء TypeScript يتم عبر JSON envelope واضح (stdin أو ملف JSON أو HTTP payload)، وليس عبر كائنات TypeScript مباشرة.
   - القرار التطبيقي: اعتماد `research-task-envelope/v1` كتنسيق النقل الموحد.

2. **آلية قفل الحالة على Windows**
   - الاستنتاج: أفضل نهج عملي عبر الملفات هو "atomic write" باستخدام ملف مؤقت ثم `rename/replace` مع lock file قصير العمر.
   - القرار التطبيقي: إنشاء `shared/utils/file-lock.ts` بآلية lock + write atomic.

3. **التوافق مع البيانات القديمة (Migration)**
   - الاستنتاج: توجد حاجة لتسامح محدود مع حقول ناقصة في التشغيلات القديمة.
   - القرار التطبيقي: المنسق يبدأ بحالة افتراضية عند عدم وجود `workflow-state.json` مع حقول أساسية موحدة.

4. **اختبار الحالة المشتركة بين Python وTypeScript**
   - الاستنتاج: الاختبار التكاملي العملي يكون على مستوى التسلسل (serialization) والعقد وليس على جودة المحتوى.
   - القرار التطبيقي: إضافة اختبارات `test_http_serialization.py`, `test_dry_run.py`, `test_e2e_full_workflow.py`, `test_recovery_e2e.py`.

## T002: مراجعة Dependencies وتوافقها

| Project | Runtime | Key deps |
|---|---|---|
| search-manager-agent | Python 3.11+ | autogen-agentchat, autogen-ext, aiohttp |
| search-scout-agent | Node 20+ | deepagents, langchain family |
| content-extractor-agent | Node 20+ | deepagents, langchain, cheerio, puppeteer |
| deep-research-analysis-agent | Node 20+ | deepagents, langchain, duck-duck-scrape |
| report-drafting-agent | Node 20+ | deepagents, langchain family |
| shared | Node 20+ | zod, uuid, typescript, @types/node |

**نتيجة التوافق**:
- الحزمة المشتركة `shared/package.json` تحتوي حدًا أدنى متوافقًا للعقد والتحقق.
- لا توجد تبعية Python داخل `shared` ولا تبعية Node داخل `search-manager-agent`.

## T003: نتيجة فحص آلية النقل AutoGen ↔ TypeScript

- طبقة التنسيق في المنسق تُمرر envelope JSON إلى كل worker tool.
- workers تستقبل envelope عبر `stdin` أو `--envelope-path`.
- هذا يضمن استقلال التنفيذ عن تفاصيل SDK أو framework لكل طرف.

## T004: تحقق آلية Lock للحالة (Windows)

- تم تنفيذ utility في:
  - `shared/utils/file-lock.ts`
- الآلية:
  - lock file (`*.lock`) عبر `open(..., 'wx')`
  - كتابة atomic إلى ملف مؤقت ثم `rename`.

## T005: تحقق تسلسل HTTP/JSON

- تم إنشاء اختبار:
  - `search-manager-agent/tests/test_http_serialization.py`
- النطاق:
  - التحقق من شكل envelope المرسل من أدوات المنسق الأربعة.
  - التأكد من سلامة الحقول المطلوبة والتسلسل JSON.
