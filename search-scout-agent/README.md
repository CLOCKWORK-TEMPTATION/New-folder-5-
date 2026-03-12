# Search Scout Agent

هذا الوكيل يدعم العقد الموحد `ExecutionHandoffEnvelope` في الإصدار:
`research-task-envelope/v1`.

## التشغيل

```bash
npm install
npm run start
```

## نمط الإدخال

- `stdin` لحزمة envelope
- أو `--envelope-path=<file>`

## نمط الإخراج

يرجع JSON موحد يحتوي:
- `metadata`
- `results`

