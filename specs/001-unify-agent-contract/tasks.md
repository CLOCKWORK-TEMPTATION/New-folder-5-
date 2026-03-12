# خطة المهام: توحيد عقد النقل التنفيذي والاستئناف والجاهزية

**الميزة**: `001-unify-agent-contract`  
**التاريخ**: 12 مارس 2026  
**إجمالي المهام**: 38  
**الحالة**: جاهز للتنفيذ

---

## ملخص تنفيذي

**الهدف الرئيسي**: توحيد آلية النقل التنفيذي بين مراحل النظام عبر عقد موحد، مع دعم الاستئناف الموثوق وتقرير جاهزية موحد.

**User Stories**:
- **US1 (P1)**: تشغيل دورة بحث بعقد نقل موحّد
- **US2 (P2)**: استئناف موثوق بعد الفشل الجزئي
- **US3 (P3)**: قرار جاهزية موحّد قبل التسليم

**معايير النجاح**:
- 100% من انتقالات المراحل تحتوي حقول الحزمة الموحدة
- 95% نجاح في الاختبارات الجافة لمسار النقل الكامل
- 90% استئناف ناجح من آخر انتقال معتمد خلال 5 دقائق
- تقرير جاهزية موحد خلال أقل من دقيقتين

---

## الاعتماديات والترتيب التنفيذي

```
Phase 1: البحث والتصميم
└─→ Phase 2: العقود والحوكمة
    └─→ Phase 3: التطبيق في المنسق
        └─→ Phase 4: التطبيق في الوكلاء
            └─→ Phase 5: الاختبار الشامل
```

### جدول الأولويات التفصيلي

| المرحلة | الهدف | الاعتماديات | المدة المتوقعة |
|--------|-------|-----------|--------------|
| Phase 1 | استكشاف + توضيح | لا توجد | 4 ساعات |
| Phase 2 | تصميم العقود + المخطط | Phase 1 ✓ | 3 ساعات |
| Phase 3 | تطبيق المنسق | Phase 2 ✓ | 6 ساعات |
| Phase 4 | تطبيق الوكلاء (4 × 2 ساعة) | Phase 3 ✓ | 8 ساعات |
| Phase 5 | اختبار + التحقق | Phase 4 ✓ | 4 ساعات |

**الإجمالي**: ~25 ساعة عمل (3 أيام بفريق 1-2 شخص)

---

## المهام المرحلية

### Phase 1: البحث والاستكشاف والتوضيحات

> **الهدف**: حل الأسئلة المتبقية وتوثيق الافتراضات والقيود التشغيلية

- [ ] T001 إنشاء research.md مع الأسئلة المتبقية الأربعة وحلولها المفترضة في `specs/001-unify-agent-contract/research.md`
- [ ] T002 [P] مراجعة dependencies الحالية في package.json و requirements.txt لجميع 5 مشاريع والتحقق من التوافقية في `shared/package.json` (جديد)
- [ ] T003 [P] فحص AutoGen documentation لتحديد كيفية تمرير كائنات TypeScript/JSON بين Python و TypeScript agents
- [ ] T004 [P] اختبار آلية Lock للحالة المشتركة على Windows باستخدام atomicwrites في `shared/utils/file-lock.ts` (جديد)
- [ ] T005 اختبار اتصال HTTP REST بين المنسق والوكلاء للتأكد من تسلسل JSON صحيح في `search-manager-agent/tests/test_http_serialization.py` (جديد)

---

### Phase 2: التصميم والعقود والحوكمة

> **الهدف**: تحديد بنية البيانات والعقود وتوثيق معايير الجاهزية

#### Phase 2.1: نموذج البيانات

- [ ] T006 إنشاء `data-model.md` مع جدول الكيانات الخمسة (ExecutionHandoffEnvelope، WorkflowState، StageTransferRecord، RecoveryDecision، BuildReadinessReport) في `specs/001-unify-agent-contract/data-model.md`
- [ ] T007 [P] توثيق تحويلات الحالة (state transitions) في `specs/001-unify-agent-contract/data-model.md` (قسم جديد)

#### Phase 2.2: العقود التنفيذية

- [ ] T008 إنشاء مجلد `shared/types/` ومجلد `shared/validators/` في جذر المستودع
- [ ] T009 كتابة `envelope.ts` مع تعريف الحزمة الموحدة (ExecutionHandoffEnvelope) في `shared/types/envelope.ts`
- [ ] T010 كتابة `transfer.ts` مع تعريف سجل الانتقالات (StageTransferRecord) في `shared/types/transfer.ts`
- [ ] T011 كتابة `recovery.ts` مع تعريف قرار الاستعادة (RecoveryDecision) في `shared/types/recovery.ts`
- [ ] T012 كتابة `readiness.ts` مع تعريف تقرير الجاهزية (BuildReadinessReport) في `shared/types/readiness.ts`
- [ ] T013 [P] كتابة `index.ts` لتصدير جميع الأنواع في `shared/types/index.ts`
- [ ] T014 كتابة `envelope-validator.ts` مع دالة التحقق من صحة الحزمة في `shared/validators/envelope-validator.ts`
- [ ] T015 [P] كتابة `index.ts` لتصدير جميع المدققين في `shared/validators/index.ts`
- [ ] T016 إنشاء `shared/package.json` بـ dependencies الدنيا (zod, uuid, typescript) في `shared/package.json`
- [ ] T017 إنشاء `shared/tsconfig.json` موحد في `shared/tsconfig.json`

#### Phase 2.3: معايير الجاهزية

- [ ] T018 كتابة `specs/001-unify-agent-contract/checklists/requirements.md` مع معايير B1-B7 لكل مشروع
- [ ] T019 كتابة `quickstart.md` مع 5 أقسام (setup، dry-run example، handoff example، recovery example، readiness report example) في `specs/001-unify-agent-contract/quickstart.md`

---

### Phase 3: التطبيق في المنسق (search-manager-agent)

> **الهدف**: بناء إدارة الحالة المشتركة والتحقق من الحزم والاستعادة

#### Phase 3.1: إدارة الحالة المشتركة

- [ ] T020 [US1] إنشاء مجلد `search-manager-agent/src/state/` وملف `state_manager.py` مع فئة StateManager تدير الحالة المشتركة في `search-manager-agent/src/state/state_manager.py`
- [ ] T021 [US1] تطبيق دالة `load_workflow_state()` لتحميل workflow-state.json من disk في `search-manager-agent/src/state/state_manager.py`
- [ ] T022 [US1] تطبيق دالة `save_workflow_state()` لحفظ الحالة على disk بشكل آمن (file locking) في `search-manager-agent/src/state/state_manager.py`
- [ ] T023 [US1] تطبيق دالة `advance_stage()` لنقل الحالة من مرحلة إلى أخرى في `search-manager-agent/src/state/state_manager.py`
- [ ] T024 [P] [US1] إنشاء ملف `search-manager-agent/src/state/handoff_validator.py` مع فئة HandoffValidator تتحقق من صحة الحزم الواردة
- [ ] T025 [US1] تطبيق دالة `validate_envelope()` للتحقق من وجود جميع الحقول المطلوبة في `search-manager-agent/src/state/handoff_validator.py`
- [ ] T026 [US1] تطبيق دالة `validate_state_transition()` للتحقق من انتقال الحالة القانوني في `search-manager-agent/src/state/handoff_validator.py`

#### Phase 3.2: سجل الانتقالات

- [ ] T027 [US1] إنشاء ملف `search-manager-agent/src/state/transfer_recorder.py` لتسجيل الانتقالات غير القابلة للتعديل في `search-manager-agent/src/state/transfer_recorder.py`
- [ ] T028 [US1] تطبيق دالة `record_transfer()` لكتابة سجل انتقال إلى transfers.jsonl في `search-manager-agent/src/state/transfer_recorder.py`
- [ ] T029 [P] [US1] تطبيق دالة `read_transfer_log()` لقراءة سجل الانتقالات الكامل في `search-manager-agent/src/state/transfer_recorder.py`

#### Phase 3.3: الاستعادة والاستئناف

- [ ] T030 [US2] إنشاء ملف `search-manager-agent/src/state/recovery_handler.py` لمعالجة الفشل والاستئناف في `search-manager-agent/src/state/recovery_handler.py`
- [ ] T031 [US2] تطبيق دالة `detect_failure()` للكشف عن الفشل المرحلي تلقائياً في `search-manager-agent/src/state/recovery_handler.py`
- [ ] T032 [US2] تطبيق دالة `create_recovery_decision()` لإنشاء قرار استعادة مع retry logic في `search-manager-agent/src/state/recovery_handler.py` (exponential backoff: 1s, 2s, 4s)
- [ ] T033 [US2] تطبيق دالة `execute_recovery()` لتنفيذ القرار (retry/resume/abort) في `search-manager-agent/src/state/recovery_handler.py`
- [ ] T034 [US2] تطبيق دالة `resume_from_checkpoint()` للبدء من آخر انتقال معتمد في `search-manager-agent/src/state/recovery_handler.py`

#### Phase 3.4: تقرير الجاهزية

- [ ] T035 [US3] إنشاء ملف `search-manager-agent/src/tools/readiness_tool.py` for evaluating build readiness في `search-manager-agent/src/tools/readiness_tool.py` (جديد)
- [ ] T036 [US3] تطبيق دالة `check_project_readiness()` للتحقق من معايير B1-B7 لمشروع واحد في `search-manager-agent/src/tools/readiness_tool.py`
- [ ] T037 [US3] تطبيق دالة `generate_readiness_report()` لتوليد تقرير موحد يغطي المشاريع الخمسة في `search-manager-agent/src/tools/readiness_tool.py`

#### Phase 3.5: دمج في المنسق الرئيسي

- [ ] T038 [P] [US1] تحديث `search-manager-agent/src/main.py` لاستخدام StateManager والتحقق من الحزم في بداية كل دورة
- [ ] T039 [US1] تحديث `search-manager-agent/src/agents/manager_agent.py` لتسجيل الانتقالات بعد كل مرحلة ناجحة
- [ ] T040 [US2] تحديث logic المنسق لاستدعاء RecoveryHandler عند اكتشاف فشل
- [ ] T041 [P] [US3] إضافة استدعاء readiness_tool قبل الإعلان عن `RESEARCH_COMPLETE`

---

### Phase 4: التطبيق في الوكلاء (4 × Worker Agents)

> **الهدف**: تحديث الوكلاء لقبول العقد الموحد وإرجاع النتائج بشكل موحد

#### Phase 4.1: SearchScout Agent

- [ ] T042 [P] [US1] إنشاء `search-scout-agent/src/types/adapter.ts` لمحول الحزمة الموحدة في `search-scout-agent/src/types/adapter.ts` (جديد)
- [ ] T043 [US1] تحديث `search-scout-agent/src/index.ts` لاستقبال ExecutionHandoffEnvelope والتحقق الفوري من الحقول المطلوبة
- [ ] T044 [US1] تعديل main() في SearchScout لقراءة العقد من stdin أو HTTP بدلاً من CLI args
- [ ] T045 [US1] تحديث output format في SearchScout لإرجاع نتائج بصيغة موحدة (metadata + results array)

#### Phase 4.2: ContentExtractor Agent

- [ ] T046 [P] [US1] إنشاء `content-extractor-agent/src/types/adapter.ts` في `content-extractor-agent/src/types/adapter.ts` (جديد)
- [ ] T047 [US1] تحديث `content-extractor-agent/src/index.ts` لاستقبال ExecutionHandoffEnvelope والتحقق الفوري
- [ ] T048 [US1] تعديل main() في ContentExtractor لقراءة العقد من stdin أو HTTP
- [ ] T049 [US1] تحديث output format في ContentExtractor لإرجاع نتائج موحدة

#### Phase 4.3: DeepResearchAnalyzer Agent

- [ ] T050 [P] [US1] إنشاء `deep-research-analysis-agent/src/types/adapter.ts` في `deep-research-analysis-agent/src/types/adapter.ts` (جديد)
- [ ] T051 [US1] تحديث `deep-research-analysis-agent/src/index.ts` لاستقبال ExecutionHandoffEnvelope والتحقق الفوري
- [ ] T052 [US1] تعديل CLI في DeepResearcher لدعم --envelope-path بدلاً من --query فقط
- [ ] T053 [US1] تحديث output format لإرجاع confirmedFacts و gapPercentage في شكل موحد
- [ ] T054 [US2] تطبيق logic الاستئناف: إذا وصل restored checkpoint، ادمجه مع النتائج الجديدة

#### Phase 4.4: ReportDrafter Agent

- [ ] T055 [P] [US1] إنشاء `report-drafting-agent/src/types/adapter.ts` في `report-drafting-agent/src/types/adapter.ts` (جديد)
- [ ] T056 [US1] تحديث `report-drafting-agent/src/index.ts` لاستقبال ExecutionHandoffEnvelope والتحقق الفوري
- [ ] T057 [US1] تعديل main() في ReportDrafter لقراءة العقد من stdin أو HTTP
- [ ] T058 [US1] تحديث output format لإرجاع التقرير النهائي مع metadata موحدة

---

### Phase 5: الاختبار الشامل والتحقق

> **الهدف**: التحقق من أن جميع المهام مكتملة ومتوافقة والنظام يعمل بكامل القدرة

#### Phase 5.1: اختبارات الوحدة

- [ ] T059 [P] كتابة اختبارات `search-manager-agent/tests/test_envelope_validation.py` مع 8 حالات اختبار لتحقق الحزمة
- [ ] T060 [P] كتابة اختبارات `search-manager-agent/tests/test_state_transfers.py` مع 6 حالات لنقل الحالة
- [ ] T061 [P] كتابة اختبارات `search-manager-agent/tests/test_recovery.py` مع 5 حالات للاستعادة
- [ ] T062 [P] كتابة اختبارات `search-manager-agent/tests/test_build_readiness.py` مع 4 حالات لتقرير الجاهزية

#### Phase 5.2: اختبارات التكامل

- [ ] T063 اختبار end-to-end: تشغيل استعلام كامل وتتبع الحزم عبر جميع الوكلاء في `search-manager-agent/tests/test_e2e_full_workflow.py` (جديد)
- [ ] T064 اختبار جاف (dry-run): التحقق من مسار النقل كاملاً بدون جودة محتوى في `search-manager-agent/tests/test_dry_run.py` (جديد)
- [ ] T065 اختبار الاستئناف: حقن فشل متعمد ثم استئناف والتحقق من الاستكمال في `search-manager-agent/tests/test_recovery_e2e.py` (جديد)

#### Phase 5.3: فحص الجاهزية

- [ ] T066 [P] تشغيل فحص الجاهزية على كل 5 مشاريع والتحقق من مطابقة معايير B1-B7 في `specs/001-unify-agent-contract/checklists/requirements.md` (تحديث output)
- [ ] T067 توثيق نتائج التحقق في `PRODUCTION_READINESS_ANALYSIS.md` (جديد/تحديث)

#### Phase 5.4: التوثيق النهائي

- [ ] T068 [P] تحديث CLAUDE.md في جذر المستودع مع أوامر التشغيل الجديدة ومثال على استخدام العقد الموحد
- [ ] T069 تحديث README.md في كل مشروع مع توثيق التغييرات المتعلقة بالعقد الموحد
- [ ] T070 إنشاء IMPLEMENTATION_GUIDE.md في `specs/001-unify-agent-contract/` مع أمثلة عملية للمطورين

#### Phase 5.5: التحقق من حدود الأدوار والمهام الإضافية

- [ ] T071 [P] فحص حدود الأدوار الفاصلة: تحقق من أن المنسق فقط يكتب workflow-state.json، وكل وكيل يكتب في مجلد مرحلته فقط - 10 حالات اختبار في `search-manager-agent/tests/test_role_boundaries.py`
- [ ] T072 [Optional - Phase 6] تطبيق Redis adapter اختياري للحالة المشتركة في بيئات الإنتاج - ملف `shared/adapters/redis-state-adapter.ts`
- [ ] T073 [Optional - Phase 6] تطبيق SQLite adapter اختياري للحالة المشتركة للتطبيقات المحلية - ملف `shared/adapters/sqlite-state-adapter.ts`

---

## أمثلة التنفيذ الموازي

### تنفيذ Phase 2 بالتوازي

```
Developer A:
  T006 → T007 (data-model.md)           [في نفس الوقت مع]

Developer B:
  T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 
  (shared/ structure + types + validators)

Developer C:
  T018 → T019 (checklists + quickstart)
```

**النتيجة**: Phase 2 يكتمل في ~3 ساعات بـ 3 أشخاص

### تنفيذ Phase 4 بالتوازي

```
Developer A:
  T042, T043, T044, T045 (SearchScout)

Developer B:
  T046, T047, T048, T049 (ContentExtractor)

Developer C:
  T050, T051, T052, T053, T054 (DeepResearchAnalyzer)

Developer D:
  T055, T056, T057, T058 (ReportDrafter)
```

**النتيجة**: Phase 4 يكتمل في ~2 ساعة بـ 4 أشخاص

---

## معايير الاختبار المستقلة لكل User Story

### US1: تشغيل دورة بحث بعقد نقل موحّد

**معايير القبول**:
- ✓ الحزمة المُرسلة تحتوي جميع الحقول المطلوبة (protocolVersion, runId, taskId, workflowStage, etc.)
- ✓ كل مرحلة تتحقق من الحزمة قبل البدء وترفضها إذا كانت ناقصة
- ✓ سجل الانتقالات يحتوي على 4 سجلات (search→extract, extract→analyze, analyze→draft) لكل تشغيل كامل
- ✓ تتبع كامل من البداية للنهاية في أقل من 10 دقائق

**اختبار مستقل**:
```bash
cd search-manager-agent
python -m pytest tests/test_envelope_validation.py -v
python -m pytest tests/test_state_transfers.py -v
python -m pytest tests/test_e2e_full_workflow.py::test_handoff_envelope_completeness -v
```

---

### US2: استئناف موثوق بعد الفشل الجزئي

**معايير القبول**:
- ✓ عند فشل مرحلة، يُنشأ checkpoint معتمد وقبل الفشل
- ✓ الاستئناف يبدأ من آخر انتقال معتمد دون إعادة المراحل السابقة
- ✓ عدد محاولات إعادة المحاولة لا يتجاوز 3، مع exponential backoff
- ✓ عند استنزاف المحاولات، يُصدر قرار إيقاف واضح مع المبرر

**اختبار مستقل**:
```bash
cd search-manager-agent
python -m pytest tests/test_recovery.py -v
python -m pytest tests/test_recovery_e2e.py::test_resume_after_partial_failure -v
```

---

### US3: قرار جاهزية موحّد قبل التسليم

**معايير القبول**:
- ✓ التقرير يغطي المشاريع الخمسة بنسبة 100%
- ✓ كل مشروع له حالة واضحة (ready / blocked / warning)
- ✓ الحالة العامة = blocked إذا كان هناك مشروع واحد محظور
- ✓ التقرير يُصدّر في أقل من دقيقتين

**اختبار مستقل**:
```bash
cd search-manager-agent
python -m pytest tests/test_build_readiness.py -v
# أيضاً: تشغيل اختبار يدوي على جميع 5 مشاريع
bash scripts/check-all-projects.sh
```

---

## المخاطر والتخفيفات

| المخطر | الاحتمالية | التأثير | التخفيف |
|--------|-----------|--------|--------|
| عدم التوافق بين AutoGen و TypeScript JSON | متوسط | عالي | T005: اختبار مبكر للاتصال HTTP |
| Lock contention على file state | منخفض | عالي | T021-T022: استخدام atomicwrites |
| حالة قديمة على disk تسبب أخطاء | منخفض | متوسط | T020: دالة migration في StateManager |
| وكيل واحد ينسى العقد الموحد | عالي | متوسط | T043-T058: اختبار كل وكيل منفصل |
| الاختبارات تفشل في 11 PM 😄 | منخفض | صفر | نوم كافي قبل الاختبار |

---

## ملاحظات إضافية

### معايير القبول العام

- [ ] جميع ملفات `.py` تمر على `pylint` و `mypy`
- [ ] جميع ملفات `.ts` تمر على `eslint` و `tsc --noEmit`
- [ ] لا توجد committed secrets أو بيانات hardcoded
- [ ] جميع ملفات `.env.example` محدثة

### معايير التوثيق

- [ ] كل دالة جديدة لها docstring بالعربية
- [ ] كل enum وinterface لها comment توضيحي
- [ ] أمثلة الاستخدام موجودة في quickstart.md

### معايير الأداء

- [ ] RecoveryHandler ينفذ إعادة المحاولة خلال < 5 ثوان
- [ ] تقرير الجاهزية يُنشأ خلال < 2 دقيقة لجميع المشاريع
- [ ] المسار الجاف الكامل (dry-run) ينجح في 95% من التشغيلات

---

## الخطوات التالية بعد التسليم

1. **تشغيل الاختبارات الشاملة** (T059-T065)
2. **مراجعة الكود** من فريق التطوير
3. **فحص الجاهزية** قبل الدمج (T066-T067)
4. **الدمج إلى main branch** مع squash commit
5. **الإغلاق الرسمي للمهام** في tracking system

---

**تم التحديث**: 12 مارس 2026 08:30 AM  
**الحالة**: جاهز للتنفيذ الفوري  
**التقدير الإجمالي**: 25 ساعة عمل (3 أيام)
