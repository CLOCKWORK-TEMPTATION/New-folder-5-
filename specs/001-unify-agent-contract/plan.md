# خطة التطبيق: توحيد عقد النقل التنفيذي والاستئناف والجاهزية

**الفرع**: `001-unify-agent-contract` | **التاريخ**: 12 مارس 2026  
**المواصفة**: [spec.md](./spec.md) | **الحالة**: جاري التخطيط

---

## ملخص الميزة

توحيد آلية النقل التنفيذي بين مراحل النظام (البحث ← الاستخراج ← التحليل ← الصياغة) عبر عقد موحد يضمن سلامة الحالة والاستئناف الموثوق والجاهزية التشغيلية. الهدف: القضاء على تضارب الحالة، دعم الاستئناف بعد الفشل المرحلي، وتوحيد معيار الجاهزية قبل التسليم النهائي.

---

## السياق التقني

**الأساليب والإصدارات والمنصات:**

| البُعد | التفاصيل | الحالة |
|--------|---------|--------|
| لغة المنسق | Python 3.11+ | ثابتة |
| إطار المنسق | `autogen-agentchat` >= 0.4.0 | ثابتة |
| لغة الوكلاء | TypeScript 5.3+ | ثابتة |
| إطار الوكلاء | `deepagents` + `@langchain/*` | ثابتة |
| نوع النظام | نظام متعدد المشاريع (5 مشاريع) | ثابتة |
| الحفظ | ذاكرة تشغيل + JSON على القرص + Redis/SQLite اختياري | مقررة |
| الاختبار | pytest (Python) + Jest/Vitest (TypeScript) | ثابتة |
| أداة البناء | npm للـ TS + pip للـ Python (لا أدوات عالمية) | ثابتة |
| الأداء | ≤ 5 دقائق للاستئناف الكامل، 95% نجاح في الاختبارات الجافة | مقررة |
| القيود | 3 جولات بحث كحد أقصى، إعادة محاولات مع exponential backoff | مقررة |
| المقياس | 5 مشاريع متعاونة، 20+ اختبار قبولي، بيئات متعددة | مقررة |

---

## فحص الدستور (Constitution Check)

**البوابة 1: الفصل المعماري** [✓ لم يتم الانتهاء - أنظر الملاحظات]

| المتطلب | الحالة | الملاحظة |
|--------|--------|---------|
| المنسق يستخدم AutoGen فقط | ✓ توثيق | في search-manager-agent |
| الوكلاء يستخدمون deepagents فقط | ✓ توثيق | في 4 مشاريع worker |
| لا توجد استدعاءات مباشرة بين الوكلاء | ⚠ يحتاج تطبيق | جميع الاتصالات عبر المنسق فقط |
| عدم وجود نصوص حرة كعقد أساسي | ⚠ يحتاج تطبيق | يجب فرض EnvelopeV1 |

**البوابة 2: وحدة العقد التنفيذي** [❌ لم يُطبق]

| المتطلب | الحالة | الملاحظة |
|--------|--------|---------|
| وجود `research-task-envelope/v1` JSON Schema | ❌ غير موجود | يجب إنشاء ملف types موحد |
| جميع الوكلاء تقبل الغلاف الموحد | ❌ غير مطبق | يجب تحديث input adapters |
| جميع الوكلاء يعيدون نفس شكل النتيجة | ❌ غير مطبق | يجب توحيد output envelopes |

**البوابة 3: سلامة الحالة المشتركة** [❌ لم يُطبق]

| المتطلب | الحالة | الملاحظة |
|--------|--------|---------|
| وجود مسار `runtime/runs/<run-id>/state/` | ❌ غير موجود | يجب إنشاء FileMemoryStore موحد |
| ملف `workflow-state.json` مملوك للمنسق فقط | ❌ غير مطبق | يجب حماية الكتابة في المنسق |
| سجل الانتقالات غير القابل للتعديل | ❌ غير موجود | يجب إنشاء `transfers.jsonl` |
| مراجع الأثر بين المراحل (artifact paths) | ⚠ جزئي | موجود لكن غير موحد |

**البوابة 4: فصل المسؤوليات** [⚠ غير محتوم]

| الطرف | المسؤولية | الحالة | الملاحظة |
|-------|----------|--------|---------|
| المنسق | التخطيط + الترتيب + إعادة المحاولة + قرار `RESEARCH_COMPLETE` | ⚠ جزئي | يحتاج توضيح وتوثيق |
| وكيل البحث | جمع النتائج فقط | ✓ توثيق | SearchScout |
| وكيل الاستخراج | جلب المحتوى فقط | ✓ توثيق | ContentExtractor |
| وكيل التحليل | تقييم الموثوقية فقط | ⚠ مسؤولية إضافية | يقرر إعادة جولة بحث جديدة |
| وكيل الصياغة | كتابة التقرير فقط | ✓ توثيق | ReportDrafter |

**البوابة 5: جاهزية البناء** [⚠ تحتاج فحص كامل]

| المعيار | الحالة | اجراء |
|--------|--------|------|
| B1: التثبيت من ملفات الاعتماديات فقط | ⚠ متغير | يجب توثيق requirements.txt و package.json |
| B2: فحص الأنواع متاح وناجح | ⚠ متغير | TypeScript لها تشيك، Python حسبها |
| B3: أمر البناء بدون أدوات عالمية | ⚠ متغير | npm/pip محلي فقط |
| B4: قراءة العقد الموحد | ❌ غير مطبق | يجب تحديث جميع main() |
| B5: `.env.example` محدث | ⚠ متغير | يجب مراجعة |
| B6: المسار الإنتاجي بدون بيانات صلبة | ⚠ متغير | يجب إزالة examples |
| B7: رمز خروج صحيح ومخرجات موحدة | ❌ غير مطبق | يحتاج توحيد |

**القرار**:
- ✅ **الفصل المعماري صحيح** — بقاء AutoGen للمنسق وdeepagents للوكلاء ثابت.
- ⚠ **وحدة العقد تحتاج تطبيق فوري** — هذا هو قلب الميزة.
- ⚠ **سلامة الحالة تحتاج بنية محددة** — مسار runtime وملفات state وسجلات.
- ⚠ **فصل المسؤوليات يحتاج جعل شرط الإيقاف واضحاً** — متى يتوقف البحث ومن يقرر.
- ✅ **جاهزية البناء قابلة للفحص** — يجب فحص كل مشروع ضد معايير B1-B7.

---

## هيكل المشروع

### توثيق الميزة (هذا الدليل)

```
specs/001-unify-agent-contract/
├── spec.md              # المواصفة (الأصلية)
├── plan.md              # خطة التطبيق (هذا الملف - من speckit.plan)
├── research.md          # نتائج البحث والتوضيحات (Phase 0)
├── data-model.md        # نموذج البيانات والعقود (Phase 1)
├── quickstart.md        # دليل سريع للبدء (Phase 1)
├── contracts/           # تعاريف العقود الموحدة (Phase 1)
│   ├── envelope.ts      # JSON Schema للعقد الموحد
│   ├── transfer.ts      # نوع سجل الانتقال
│   ├── recovery.ts      # قرار الاستعادة
│   └── readiness.ts     # تقرير الجاهزية
├── checklists/          # قوائم التحقق التفصيلية
│   └── requirements.md  # الحد الأدنى من المتطلبات
└── tasks.md             # خطة المهام التفصيلية (Phase 2 - من speckit.task)
```

### الكود المصدري (جذر المستودع)

```
New folder (5)/                              # جذر النظام
├── search-manager-agent/                   # المنسق (Python/AutoGen)
│   ├── src/
│   │   ├── main.py                         # نقطة الدخول الرئيسية
│   │   ├── config.py                       # إعدادات البيئة
│   │   ├── agents/
│   │   │   └── manager_agent.py           # تعريف وكيل المنسق
│   │   ├── tools/                          # أدوات استدعاء الوكلاء
│   │   │   ├── search_scout_tool.py
│   │   │   ├── content_extractor_tool.py
│   │   │   ├── deep_research_tool.py
│   │   │   ├── report_drafting_tool.py
│   │   │   └── readiness_tool.py           # أداة التحقق من الجاهزية (جديد)
│   │   └── state/                          # إدارة الحالة المشتركة
│   │       ├── state_manager.py            # (جديد)
│   │       ├── handoff_validator.py        # (جديد)
│   │       └── recovery_handler.py         # (جديد)
│   ├── requirements.txt
│   └── tests/
│       ├── test_envelope_validation.py
│       ├── test_state_transfers.py
│       ├── test_recovery.py
│       └── test_build_readiness.py
│
├── search-scout-agent/                     # وكيل البحث (TypeScript/deepagents)
│   ├── src/
│   │   ├── index.ts
│   │   └── types/
│   │       ├── index.ts                    # استيراد EnvelopeV1 من shared
│   │       └── adapter.ts                  # (جديد) محول الحزمة
│   ├── package.json
│   └── tests/
│
├── content-extractor-agent/                # وكيل الاستخراج (TypeScript/deepagents)
│   ├── src/
│   │   ├── index.ts
│   │   └── types/
│   │       ├── index.ts
│   │       └── adapter.ts
│   ├── package.json
│   └── tests/
│
├── deep-research-analysis-agent/           # وكيل التحليل (TypeScript/deepagents)
│   ├── src/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   └── types/
│   │       ├── index.ts
│   │       └── adapter.ts                  # (جديد)
│   ├── package.json
│   └── tests/
│
├── report-drafting-agent/                  # وكيل الصياغة (TypeScript/deepagents)
│   ├── src/
│   │   ├── index.ts
│   │   └── types/
│   │       ├── index.ts
│   │       └── adapter.ts
│   ├── package.json
│   └── tests/
│
├── shared/                                 # (جديد) مكتبة مشتركة
│   ├── types/
│   │   ├── envelope.ts                    # العقد الموحد (تعريف واحد)
│   │   ├── transfer.ts
│   │   ├── recovery.ts
│   │   ├── readiness.ts
│   │   └── index.ts                       # تصدير موحد
│   ├── validators/
│   │   ├── envelope-validator.ts          # (جديد) فحص صحة الحزمة
│   │   └── index.ts
│   └── package.json
│
├── runtime/                                # (جديد) حالة التشغيل
│   ├── runs/
│   │   └── {run-id}/                      # لكل تشغيل
│   │       ├── state/
│   │       │   ├── workflow-state.json    # الحالة المشتركة (يملكها المنسق)
│   │       │   ├── transfers.jsonl        # سجل الانتقالات (لحفظ)
│   │       │   └── recovery-checkpoint.json
│   │       ├── 01-search/
│   │       ├── 02-extraction/
│   │       ├── 03-analysis/
│   │       └── 04-report/
│   └── logs/
│
├── specs/
│   ├── 001-unify-agent-contract/
│   │   ├── spec.md
│   │   ├── plan.md                        # (توسيع هذا الملف)
│   │   ├── research.md                    # (جديد - Phase 0)
│   │   ├── data-model.md                  # (جديد - Phase 1)
│   │   ├── quickstart.md                  # (جديد - Phase 1)
│   │   ├── contracts/                     # (جديد - Phase 1)
│   │   ├── checklists/
│   │   └── tasks.md                       # (جديد - Phase 2)
│   ├── 002-enhancement/
│   └── ...
│
├── .specify/                               # تكوين النظام
│   ├── scripts/
│   │   └── powershell/
│   │       ├── setup-plan.ps1
│   │       └── update-agent-context.ps1
│   ├── templates/
│   │   └── plan-template.md
│   └── memory/
│       ├── constitution.md
│       └── context.yaml
│
└── root-level files
    ├── package.json                        # (محدث) للـ shared
    ├── tsconfig.json                       # (موحد) للـ shared
    ├── .env.example
    └── CLAUDE.md (موجود بالفعل)
```

**القرار الهيكلي**:
- ✅ مجلد `shared/` جديد للعقود الموحدة (types + validators).
- ✅ مجلد `runtime/` لحالة التشغيل لكل run-id.
- ✅ إضافة محولات (adapters) في كل وكيل للتوافق مع EnvelopeV1.
- ✅ إضافة وحدات state في المنسق لإدارة الحالة المشتركة والاستعادة.

---

## الأولويات والمراحل

### مصفوفة الأولويات

| المجال | المهمة | الأولوية | المرحلة | التقدير |
|--------|--------|---------|---------|---------|
| العقد التنفيذي | إنشاء `envelope.ts` وJSON Schema | P0 | Phase 1 | 2 ساعة |
| العقد التنفيذي | تطبيق Validators في `shared/` | P0 | Phase 1 | 1 ساعة |
| الحالة المشتركة | بناء `state-manager.py` في المنسق | P1 | Phase 1 | 3 ساعات |
| الحالة المشتركة | سجل الانتقالات (transfers.jsonl) | P1 | Phase 1 | 1 ساعة |
| التكيف | تحديث main() في SearchScout | P1 | Phase 2 | 2 ساعة |
| التكيف | تحديث main() في ContentExtractor | P1 | Phase 2 | 2 ساعة |
| التكيف | تحديث main() في DeepResearcher | P1 | Phase 2 | 2 ساعة |
| التكيف | تحديث main() في ReportDrafter | P1 | Phase 2 | 2 ساعة |
| الاستعادة | تطبيق Recovery Handler | P2 | Phase 2 | 3 ساعات |
| الجاهزية | فحص جاهزية البناء (B1-B7) | P2 | Phase 2 | 2 ساعة |
| التحقق | اختبارات قبول شاملة (20+) | P2 | Phase 3 | 4 ساعات |

**خط الزمن الإجمالي**: ≈ 25 ساعة عمل (3 أيام بفريق 3 أشخاص).

---

## Phase 0: البحث والتوضيحات

### المهام البحثية

1. **الأسئلة المحلولة بالفعل في المواصفة**:
   - ✓ بنية حزمة الاستدعاء الموحدة (JSON Schema موجود)
   - ✓ معايير إعادة المحاولات (3 محاولات + exponential backoff)
   - ✓ الحد الأقصى لجولات البحث (3 جولات ثابتة)
   - ✓ معيار قبول التحليل (60% confirmedFacts)
   - ✓ آلية حفظ الحالة (memory + JSON + DB اختياري)

2. **الأسئلة المتبقية** (يجب حلها في research.md):

   a) **التكامل مع AutoGen**: هل يدعم AutoGen تمرير كائنات TypeScript من الوكلاء؟
      - البحث: نوع الاتصال (HTTP/RPC/JSON-RPC)
      - الحل الافتراضي: HTTP REST مع تسلسل JSON

   b) **آلية قفل الحالة**: كيف نمنع تضارب الكتابة على `workflow-state.json` من عدة مراحل متوازية؟
      - البحث: نمط Lock/Mutex في Python
      - الحل الافتراضي: File-based locking (fcntl على Linux/atomicwrites على Windows)

   c) **الانتقال من بيانات القديمة**: هل هناك بيانات قديمة موجودة في المشاريع يجب تحويلها؟
      - البحث: القيود والتوافقية
      - الحل الافتراضي: migration layer موحدة

   d) **اختبار الحالة المشتركة**: ما أفضل طريقة لاختبار حالة مشتركة بين عمليات Python و TypeScript؟
      - البحث: أدوات اختبار multi-process
      - الحل الافتراضي: pytest + fixtures + مراقب الملفات

---

## Phase 1: التصميم والعقود

### 1.1 تحديد الكيانات (data-model.md)

| الكيان | الحقول | التحقق | التحولات |
|--------|--------|--------|---------|
| **ExecutionHandoffEnvelope** | `protocolVersion` (v1)، `runId` (UUID)، `taskId` (string)، `workflowStage` (enum)، `sender`، `targetAgent`، `objective`، `inputs`، `execution`، `trace` | JSON schema validation | create → validate → accept/reject |
| **WorkflowState** | `runId`، `currentStage`، `iterationCount`، `lastSuccessfulStage`، `errors`، `checkpoints` | Non-null runId، stage in enum | init → advance → pause/resume → complete |
| **StageTransferRecord** | `transferId` (UUID)، `timestamp`، `fromStage`، `toStage`، `status` (success/failure)، `reason`، `metadata` | Immutable timestamp | log → archive (never update) |
| **RecoveryDecision** | `failureReason`، `retryCount`، `action` (retry/resume/abort)، `justification`، `nextCheckpoint` | Reason must be non-empty، retryCount ≤ 3 | evaluate → decide → execute |
| **BuildReadinessReport** | `reportId`، `timestamp`، `projects` (list)، `overallStatus` (ready/blocked)، `blockers` (list)، `recommendations` | 100% project coverage | generate → validate → sign-off |

### 1.2 العقود التنفيذية (contracts/)

ستُنشأ 4 ملفات TypeScript:

**عقد 1: envelope.ts** — تعريف الحزمة الموحدة
```typescript
export interface ExecutionHandoffEnvelope {
  protocolVersion: "research-task-envelope/v1";
  runId: string;                           // UUID
  taskId: string;
  parentTaskId?: string | null;
  workflowStage: "search" | "extract" | "analyze" | "draft";
  sender: string;
  targetAgent: string;
  objective: string;
  userRequest: string;
  constraints: Record<string, unknown>;
  inputs: {
    artifacts: string[];                   // Paths to files
    inlineData: Record<string, unknown>;
    sharedStatePath: string;               // Path to state file
  };
  execution: {
    attempt: number;
    timeoutSeconds: number;
  };
  trace: {
    createdAt: string;                     // ISO-8601
    createdBy: string;
    correlationId: string;
  };
}
```

**عقد 2: transfer.ts** — سجل الانتقالات
```typescript
export interface StageTransferRecord {
  transferId: string;                      // UUID
  timestamp: string;                       // ISO-8601
  fromStage: string;
  toStage: string;
  envelopeId: string;
  status: "success" | "failure" | "retry";
  reason?: string;                        // Error message if failure
  metadata: Record<string, unknown>;      // Duration, artifact count, etc.
}
```

**عقد 3: recovery.ts** — قرار الاستعادة
```typescript
export interface RecoveryDecision {
  failureReason: string;
  failedStage: string;
  lastValidCheckpoint: string;            // Timestamp
  retryCount: number;
  maxRetries: number;
  action: "retry" | "resume_from_checkpoint" | "abort";
  backoffMs: number;                      // Exponential backoff
  justification: string;
  nextAction: string;
}
```

**عقد 4: readiness.ts** — تقرير الجاهزية
```typescript
export interface ProjectReadinessStatus {
  projectName: string;
  status: "ready" | "blocked" | "warning";
  checks: Record<string, boolean>;        // B1, B2, B3, ...
  blockers: string[];                     // Reasons for blocking
  lastChecked: string;                    // ISO-8601
}

export interface BuildReadinessReport {
  reportId: string;
  timestamp: string;
  projects: ProjectReadinessStatus[];
  overallStatus: "ready" | "blocked";
  blockers: string[];
  recommendations: string[];
}
```

### 1.3 دليل البدء السريع (quickstart.md)

سيتضمن:
1. خطوات التثبيت للمشاريع الخمسة
2. كيفية تشغيل تحقق جاف (dry-run)
3. أمثلة على استدعاء المنسق مع عقد موحد
4. كيفية التعامل مع فشل ومحاولة الاستئناف
5. قراءة تقرير الجاهزية

### 1.4 تحديث سياق الوكيل (Agent Context Update)

سيتم تشغيل:
```powershell
.\.specify\scripts\powershell\update-agent-context.ps1 -AgentType copilot
```

هذا سيضيف إلى ملف سياق الوكيل الحالي (CLAUDE.md أو الخاص بـ VS Code):
- تعريف العقد الموحد (Envelope)
- الأدوار المحدثة للوكلاء والمنسق
- الملفات الجديدة: shared/، runtime/، contracts/
- قائمة المهام الجديدة في Phase 2

---

## Phase 2: التطبيق والاختبار

### 2.1 تنفيذ العقد الموحد في shared/

**المهام**:
1. ✓ إنشاء `shared/types/envelope.ts` بالـ JSON Schema
2. ✓ إنشاء `shared/types/transfer.ts`
3. ✓ إنشاء `shared/types/recovery.ts`
4. ✓ إنشاء `shared/types/readiness.ts`
5. ✓ إنشاء `shared/validators/envelope-validator.ts`
6. ✓ إنشاء `shared/package.json` مع npm link للوكلاء

### 2.2 تطبيق إدارة الحالة في المنسق

**الملفات الجديدة في search-manager-agent/**:
1. `src/state/state-manager.py` — إدارة `workflow-state.json`
2. `src/state/handoff-validator.py` — فحص الحزم الواردة
3. `src/state/recovery-handler.py` — استعادة من checkpoint

### 2.3 تحديث التكيفات (Adapters) في الوكلاء

لكل وكيل: إنشاء ملف `src/types/adapter.ts` يحول المدخلات إلى `ExecutionHandoffEnvelope` والمخرجات إلى نفس الصيغة.

### 2.4 اختبارات قبول (20+)

| اختبار | المسؤول | المخرج |
|-------|--------|--------|
| test_envelope_schema_valid | shared | ✓/❌ |
| test_envelope_schema_invalid | shared | ✓/❌ |
| test_state_write_and_read | state-manager | state file |
| test_concurrent_state_access | state-manager | lock behavior |
| test_transfer_immutable_log | transfer logger | transfers.jsonl |
| test_recovery_from_checkpoint | recovery handler | resume success rate |
| test_search_scout_accepts_envelope | search-scout | adapter output |
| test_content_extractor_accepts_envelope | content-extractor | adapter output |
| test_deep_researcher_accepts_envelope | deep-research | adapter output |
| test_report_drafter_accepts_envelope | report-drafting | adapter output |
| test_dry_run_full_path | e2e orchestrator | ✓ completion |
| test_readiness_all_5_projects | readiness checker | report file |
| test_readiness_one_project_blocked | readiness checker | blocked status |
| test_retry_with_exponential_backoff | recovery handler | timing profile |
| test_max_retries_exceeded | recovery handler | abort status |
| test_max_iterations_3_limit | orchestrator | iteration count ≤ 3 |
| test_gap_detection_triggers_new_search | deep-research + orchestrator | new iteration |
| test_confirmed_facts_threshold_60_percent | gate keeper | approve/reject signal |
| test_handoff_missing_required_field | validator | rejection reason |
| test_resume_from_last_valid_checkpoint | recovery + orchestrator | state recovery |

---

## الاعتماديات والمخاطر

### الاعتماديات الحرجة

| الاعتماد | الملكية | الحالة | المخاطر |
|---------|--------|--------|--------|
| AutoGen 0.4.0+ | Microsoft | ✓ محدد | توافقية الإصدارات |
| deepagents + LangChain | مجتمع | ✓ محدد | تحديثات غير متوقعة |
| Python 3.11+ | Python.org | ✓ ثابت | بيئات الإنتاج |
| TypeScript 5.3+ | Microsoft | ✓ ثابت | تجميع cross-platform |
| JSON Schema Validator | مختلفة (ajv) | ⚠ جديد | اختيار المكتبة الصحيحة |
| File locking (fcntl) | نظام تشغيل | ⚠ منصة-محددة | توافقية Windows |

### المخاطر التشغيلية

| المخاطرة | الاحتمالية | التأثير | التخفيف |
|---------|-----------|--------|--------|
| تضارب الحالة المشتركة بين وكلاء متعاملين | عالية | فقدان البيانات | آلية قفل قوية + اختبارات متزامنة |
| فشل استئناف بسبب checkpoint قديم | متوسطة | إعادة كاملة غير ضرورية | حفظ checkpoints على فترات |
| توقف النظام عند 3 جولات بحث دون إغلاق فجوات | محتملة | تقرير غير مكتمل | توثيق واضح للحدود + تحذيرات |
| عدم توافقية AutoGen مع أنواع TypeScript | منخفضة | أخطاء تسلسل | اختبارات تكامل مبكرة |
| نسيان تحديث `.env.example` في مشروع واحد | عالية | فشل التثبيت | قائمة تحقق في جاهزية البناء |

---

## النتائج والتسليم

### المخرجات المتوقعة (Deliverables)

- ✓ `shared/` — مكتبة عقود موحدة (TypeScript + npm)
- ✓ `runtime/` — بنية حفظ حالة موحدة
- ✓ محولات في كل وكيل تقبل EnvelopeV1
- ✓ وحدات state و recovery في المنسق
- ✓ 20+ اختبار قبول خضراء
- ✓ توثيق شامل (data-model.md، quickstart.md، contracts عقود)
- ✓ تقرير جاهزية بناء موحد

### معايير النجاح (Success Criteria من spec.md)

✓ **SC-001**: 100% من الانتقالات تحتوي الحقول الموحدة ← اختبار schema validation
✓ **SC-002**: 95% نجاح في dry runs كاملة ← 20 تشغيل تجريبي
✓ **SC-003**: استئناف خلال 5 دقائق في 90% من الحالات ← اختبارات recovery
✓ **SC-004**: تقرير جاهزية خلال دقيقتين لـ 5 مشاريع ← محقق في readiness tool
✓ **SC-005**: انخفاض 60% في أخطاء تضارب الحالة ← قياس baseline
✓ **SC-006**: عدم الإعلان عن اكتمال مع حالة "blocked" ← assert في المنسق

---

## الملاحظات الختامية

### ما تم حله في هذه الخطة

1. توضيح الفصل بين مسؤوليات المنسق والوكلاء مع حالة الشاملة منفصلة.
2. تحديد بنية مشاريع جديدة (`shared/` و `runtime/`) تدعم توحيد العقود.
3. تحديد العقود الأربعة الرئيسية (Envelope, Transfer, Recovery, Readiness).
4. مصفوفة اختبارات شاملة (20+ اختبار) تغطي جميع حالات الاستخدام.
5. خطة مراحل واضحة مع تقديرات زمنية (Phase 0/1/2).

### المتابعة اللازمة  

1. **Phase 0 (بحث)**: إنشاء research.md بإجابات الأسئلة (اتصال AutoGen، قفل ملفات، migration، اختبار).
2. **Phase 1 (تصميم)**: إنشاء data-model.md بالتفاصيل الدقيقة + contracts/ بالأنواع.
3. **Phase 2 (تطبيق)**: التطبيق وفق خريطة الطريق (shared/ → state manager → adapters → tests).

---

**حالة الملف**: جاهز للمراجعة والبدء بـ Phase 0.
**آخر تحديث**: 12 مارس 2026
**المسؤول**: فريق التطبيق
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
