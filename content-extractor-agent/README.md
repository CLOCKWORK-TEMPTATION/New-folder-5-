# Content Extractor Agent

وكيل استخراج المحتوى يدعم الآن استقبال **ExecutionHandoffEnvelope** بصيغة:
`research-task-envelope/v1`.

## التشغيل

```bash
npm install
npm run dev
```

يعتمد هذا الوكيل على ملف البيئة الموحد في جذر المستودع فقط.

## إدخال العقد الموحد

- عبر `stdin` (JSON envelope)
- أو عبر `--envelope-path=<file>`

المخرج موحد بصيغة:
- `metadata`
- `results`

