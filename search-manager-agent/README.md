# Search Manager Agent - وكيل مدير البحث

وكيل Orchestrator مبني بـ **AutoGen** ينسّق فريقاً من 5 وكلاء متخصصة لتنفيذ بحث عميق وشامل.

## الفريق

| الوكيل | الدور | التقنية |
|--------|-------|---------|
| SearchManager | المدير والمنسّق | AutoGen (Python) |
| SearchScout | البحث وجمع الروابط | TypeScript + deepagents |
| ContentExtractor | استخراج المحتوى | TypeScript + deepagents |
| DeepResearcher | التحليل واكتشاف الثغرات | TypeScript + deepagents |
| ReportDrafter | صياغة التقرير النهائي | TypeScript + deepagents |

## التثبيت

```bash
# تثبيت المتطلبات
pip install -r requirements.txt

# إعداد متغيرات البيئة من الجذر
# استخدم الملف الموحد في جذر المستودع:
# ..\.env
```

## الاستخدام

```bash
python -m src.main --query "ما هي أحدث تطورات الذكاء الاصطناعي في الطب 2024؟"
```

## سير العمل

```
المستخدم
    |
    | سؤال بحثي
    v
SearchManager (يحلل ويضع الخطة)
    |
    | خطة بحث
    v
SearchScout (يبحث ويجمع الروابط)
    |
    | قائمة روابط مرتبة
    v
ContentExtractor (يستخرج النصوص)
    |
    | محتوى منظم
    v
DeepResearcher (يحلل ويكتشف الثغرات)
    |
    +-- ثغرات؟ --> SearchManager --> SearchScout (جولة إضافية)
    |
    +-- مكتمل --> ReportDrafter (يكتب التقرير)
                        |
                        v
            SearchManager (يراجع ويسلّم)
                        |
                        v
                المستخدم (التقرير النهائي)
```

## متغيرات البيئة

| المتغير | الوصف | الافتراضي |
|---------|-------|-----------|
| `OPENAI_API_KEY` | مفتاح OpenAI API من ملف البيئة في الجذر | مطلوب |
| `ANTHROPIC_API_KEY` | مفتاح Anthropic API من ملف البيئة في الجذر | اختياري |
| `MODEL_NAME` | اسم النموذج المستخدم من ملف البيئة في الجذر | `gpt-4o` |

## بنية الملفات

```
search-manager-agent/
├── src/
│   ├── __init__.py
│   ├── main.py               # نقطة الدخول
│   ├── config.py             # إعدادات ومسارات
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── search_scout_tool.py        # أداة البحث
│   │   ├── content_extractor_tool.py   # أداة استخراج المحتوى
│   │   ├── deep_research_tool.py       # أداة التحليل العميق
│   │   └── report_drafting_tool.py     # أداة صياغة التقارير
│   └── agents/
│       ├── __init__.py
│       └── manager_agent.py  # تعريف الفريق والوكلاء
├── requirements.txt
├── .env.example            # ملف إرشادي فقط - التشغيل يعتمد على .env في الجذر
└── README.md
```

## المتطلبات

- Python 3.10+
- pip
- Node.js 18+ (لتشغيل الوكلاء TypeScript)
- وكلاء TypeScript الأربعة في المجلد الأب
