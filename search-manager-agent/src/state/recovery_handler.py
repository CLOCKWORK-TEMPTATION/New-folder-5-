import time
from typing import Any, Dict

from .transfer_recorder import TransferRecorder


class RecoveryHandler:
    """ينفذ منطق كشف الفشل واتخاذ قرار الاستئناف."""

    def __init__(self, recorder: TransferRecorder | None = None):
        self.recorder = recorder or TransferRecorder()

    def detect_failure(self, stage_result: Dict[str, Any]) -> bool:
        return bool(stage_result.get("error")) or stage_result.get("status") == "failure"

    def create_recovery_decision(
        self, failure_reason: str, failed_stage: str, retry_count: int, max_retries: int = 3
    ) -> Dict[str, Any]:
        if retry_count < max_retries:
            backoff_s = 2**retry_count
            return {
                "failureReason": failure_reason,
                "failedStage": failed_stage,
                "retryCount": retry_count,
                "maxRetries": max_retries,
                "action": "retry",
                "backoffSeconds": backoff_s,
                "justification": "لم يتم استهلاك جميع المحاولات",
            }
        return {
            "failureReason": failure_reason,
            "failedStage": failed_stage,
            "retryCount": retry_count,
            "maxRetries": max_retries,
            "action": "abort",
            "backoffSeconds": 0,
            "justification": "تم استهلاك جميع المحاولات",
        }

    def execute_recovery(self, decision: Dict[str, Any]) -> str:
        action = decision.get("action", "abort")
        if action == "retry":
            time.sleep(decision.get("backoffSeconds", 1))
            return "retry"
        if action == "resume_from_checkpoint":
            return "resume"
        return "abort"

    def resume_from_checkpoint(self, run_id: str) -> Dict[str, Any]:
        records = self.recorder.read_transfer_log(run_id)
        if not records:
            return {"resumeFrom": "search", "reason": "no-checkpoint"}
        last_success = next((r for r in reversed(records) if r.get("status") == "success"), None)
        if not last_success:
            return {"resumeFrom": "search", "reason": "no-success-transfer"}
        return {"resumeFrom": last_success["toStage"], "reason": "last-success-transfer"}

