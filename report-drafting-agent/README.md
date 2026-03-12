# Report Drafting Agent

وكيل الصياغة تم تحديثه لدعم استقبال العقد الموحد بين الوكلاء.

## التشغيل

```bash
npm install
npm run start
```

يعتمد هذا الوكيل على ملف البيئة الموحد في جذر المستودع فقط.

## Envelope Input

- قراءة JSON envelope من stdin
- أو من `--envelope-path=<file>`

## Unified Output

مخرجات الوكيل الآن تتضمن:
- `metadata` موحد
- `results` موحد

