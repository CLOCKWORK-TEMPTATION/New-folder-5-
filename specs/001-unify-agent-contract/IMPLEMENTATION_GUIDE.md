# Implementation Guide — 001-unify-agent-contract

## ما الذي تم بناؤه

1. مكتبة مشتركة `shared/` للعقود:
   - `shared/types/*`
   - `shared/validators/envelope-validator.ts`
2. إدارة الحالة في المنسق:
   - `state_manager.py`
   - `handoff_validator.py`
   - `transfer_recorder.py`
   - `recovery_handler.py`
3. تحديث الوكلاء الأربعة لقبول envelope موحد عبر stdin/`--envelope-path`.
4. اختبارات وحدة أساسية في `search-manager-agent/tests`.

## دورة النقل الموصى بها

1. SearchManager ينشئ envelope.
2. Worker الهدف يتحقق من الحقول الإلزامية فوراً.
3. Worker يرجع `metadata + results`.
4. SearchManager يسجل `StageTransferRecord` في `transfers.jsonl`.

## الاستعادة

- عند الفشل: `RecoveryHandler.detect_failure()`
- القرار: `create_recovery_decision()`
- التنفيذ: `execute_recovery()` بآلية backoff.

## ملاحظات

- هذا التنفيذ يوفر أساساً متماسكاً وقابلاً للتشغيل.
- اختبارات التكامل end-to-end الكاملة ما زالت مطلوبة في خطوات لاحقة.

