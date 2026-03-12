# Data Model — 001-unify-agent-contract

## الكيانات الأساسية

| Entity | Purpose | Core Fields |
|---|---|---|
| ExecutionHandoffEnvelope | عقد النقل الموحد بين المراحل | protocolVersion, runId, taskId, workflowStage, sender, targetAgent, inputs, execution, trace |
| WorkflowState | حالة التشغيل المركزية لرحلة البحث | runId, currentStage, lastSuccessfulStage, iterationCount, status, checkpoints, errors |
| StageTransferRecord | سجل انتقال غير قابل للتعديل | transferId, timestamp, fromStage, toStage, status, reason, metadata |
| RecoveryDecision | قرار الاستئناف بعد الفشل | failureReason, failedStage, retryCount, action, backoffMs, lastValidCheckpoint |
| BuildReadinessReport | تقرير جاهزية موحّد للمشاريع الخمسة | reportId, timestamp, projects[], overallStatus, blockers, recommendations |

## WorkflowState structure

```json
{
  "runId": "uuid",
  "currentStage": "search|extract|analyze|draft",
  "lastSuccessfulStage": "search|extract|analyze|draft|null",
  "iterationCount": 1,
  "status": "running|failed|completed",
  "updatedAt": "ISO-8601",
  "checkpoints": [],
  "errors": []
}
```

## State Transitions

1. `search -> extract`
2. `extract -> analyze`
3. `analyze -> draft`
4. `draft -> completed` (logical terminal transition)

الانتقال العكسي غير مسموح إلا عبر RecoveryDecision صريح (`resume_from_checkpoint`).

