# وكيل التحليل والتقييم

هذا مشروع مستقل بالكامل مبني باستخدام

`deepagents`

ولا يعتمد على أي ملف أو بنية موجودة في الجذر الحالي.

تمت ترقية البنية لتقترب أكثر من أفضل ممارسات وثائق

`Deep Agents`

من خلال:

- وكلاء فرعيين مجمّعين
- سياق مهيكل
- مخرجات مهيكلة
- فصل ذاكرة العمل عن الذاكرة طويلة الأجل
- دعم تتبع

`LangSmith`

اختيارياً عبر متغيرات البيئة

## ماذا يفعل

يبني وكيلاً رئيسياً للتنسيق بين أربع مهام متخصصة:

1. البحث وجمع المصادر.
2. التحقق من المصداقية والتحيز وحداثة المصدر.
3. استخلاص الحقائق وربطها بهدف البحث.
4. كشف التناقضات والفجوات واتخاذ قرار الحاجة لجولة بحث إضافية.

## الوكلاء الفرعيون

`research_discovery_agent`

يجمع المصادر الأولية ويكتب ملفات موجزة لكل مصدر داخل مساحة العمل.

`credibility_verifier`

يفحص موثوقية المصدر ومؤشرات التحيز وتضارب المصالح وحداثة النشر.

`fact_extractor_relevance_filter`

يستخرج الحقائق المرشحة ويربطها بهدف البحث ويستبعد الحشو.

`contradiction_gap_detector`

يجمع الحقائق بحسب الموضوع، يكشف التعارضات العددية والزمنية، ويقرر إن كانت هناك حاجة لبحث إضافي.

## الترقيات المعمارية

`CompiledSubAgent`

كل وكيل فرعي أصبح وكيلاً مُجمّعاً مستقلاً له تعليماته وسياقه ومخرجاته المهيكلة.

`contextSchema`

كل تشغيل يمرر سياقاً مهيكلاً يشمل هدف البحث ودرجة العمق وحدّ المصداقية والحد الأقصى للمصادر ومساحة الذاكرة.

`structured output`

كل وكيل فرعي، وكذلك الوكيل الرئيسي، يعيد مخرجاً مهيكلاً يمكن استهلاكه آلياً بسهولة.

`CompositeBackend`

ملفات العمل اليومية تبقى تحت

`/workspace`

بينما الذاكرة طويلة الأجل تُحفظ تحت

`/memories`

عبر

`StoreBackend`

مدعوم بمخزن ملفي محلي.

## الأدوات المخصصة

`internet_search`

بحث ويب عبر

`DuckDuckGo`

بدون مفاتيح خارجية.

`fetch_source_content`

يجلب الصفحة ويستخرج النص المفيد والميتا داتا الأساسية.

`inspect_source_credibility`

يُنتج تقييماً استدلالياً للمصدر مع درجة ثقة تفسيرية.

`extract_candidate_facts`

يستخرج جمل مرشحة عالية الصلة بهدف البحث.

`cluster_facts_by_topic`

يجمع الحقائق في عناقيد موضوعية تقريبية.

`find_numeric_disagreements`

يكشف اختلافات الأرقام والتواريخ بين الحقائق المتشابهة.

## التشغيل

1. ثبّت الاعتمادات:

```bash
npm install
```

2. أنشئ ملف البيئة من المثال:

```bash
copy .env.example .env
```

3. ضع المفتاح المناسب:

`OPENAI_API_KEY`

يمكنك أيضاً تخصيص نموذج مختلف لكل دور:

`OPENAI_COORDINATOR_MODEL`

`OPENAI_RESEARCH_MODEL`

`OPENAI_VERIFIER_MODEL`

`OPENAI_EXTRACTOR_MODEL`

`OPENAI_DETECTOR_MODEL`

ولتفعيل التتبع:

`LANGSMITH_API_KEY`

4. شغّل الوكيل:

```bash
npm run dev -- --query "حلل أثر السياسات النقدية على التضخم في مصر خلال آخر عامين"
```

يمكنك أيضاً تمرير

`--thread`

للاحتفاظ بسياق جلسة متكرر.

ويمكنك تمرير خيارات السياق التالية:

```bash
npm run dev -- --query "..." --depth deep --freshness recent-preferred --max-sources 8 --min-credibility 65 --domain-hint economics --memory-namespace egypt-inflation
```

## مخرجات التشغيل

كل ملفات العمل تُكتب داخل هذا المسار:

`runtime/workspace`

وتشمل:

- ملفات جمع المصادر.
- تقارير المصداقية.
- ملفات الحقائق.
- تقارير الفجوات والتناقضات.
- التقرير النهائي.

أما الذاكرة طويلة الأجل فتُخزَّن هنا:

`runtime/store/file-store.json`

## مراجع التقنية

- [Deep Agents Overview](https://docs.langchain.com/oss/javascript/deepagents/overview)
- [Deep Agents Subagents](https://docs.langchain.com/oss/javascript/deepagents/subagents)
- [Deep Agents Backends](https://docs.langchain.com/oss/javascript/deepagents/backends)
