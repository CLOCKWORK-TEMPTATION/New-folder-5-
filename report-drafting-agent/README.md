# Report Drafting Agent

وكيل الصياغة تم تحديثه لدعم استقبال العقد الموحد بين الوكلاء.

## التشغيل

```bash
npm install
npm run start
```

## Envelope Input

- قراءة JSON envelope من stdin
- أو من `--envelope-path=<file>`

## Unified Output

مخرجات الوكيل الآن تتضمن:
- `metadata` موحد
- `results` موحد

