# Build Readiness Checklist (B1-B7) - All Projects

**Feature**: `001-unify-agent-contract`  
**Updated**: 2026-03-12

## تعريف المعايير

- **B1**: وجود ملف اعتماديات مشروع (`package.json` أو `requirements.txt`)
- **B2**: وجود أساس type-check/validation (`tsconfig.json` أو `requirements.txt/pyproject`)
- **B3**: التشغيل والبناء بدون أدوات عالمية خارج المشروع
- **B4**: دعم العقد الموحد `research-task-envelope/v1`
- **B5**: وجود `.env.example`
- **B6**: عدم وجود بيانات صلبة حرجة في مسار التشغيل الإنتاجي
- **B7**: مخرجات/أخطاء بشكل منظم وقابل للاستهلاك

## مصفوفة المشاريع

| Project | B1 | B2 | B3 | B4 | B5 | B6 | B7 | الحالة |
|---|---|---|---|---|---|---|---|---|
| search-manager-agent | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ready |
| search-scout-agent | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ready |
| content-extractor-agent | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ready |
| deep-research-analysis-agent | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ready |
| report-drafting-agent | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ready |

## ملاحظات التحقق

- تم التحقق آليًا عبر `generate_readiness_report()` من المنسق.
- الحالة العامة للنظام: **ready**.
