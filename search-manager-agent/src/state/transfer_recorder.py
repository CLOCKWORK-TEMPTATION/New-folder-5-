import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import uuid4


class TransferRecorder:
    """يسجل انتقالات المراحل كسجل JSONL غير قابل للتعديل."""

    def __init__(self, runtime_dir: str = "runtime"):
        self.runtime_dir = runtime_dir

    def _log_path(self, run_id: str) -> str:
        return os.path.join(self.runtime_dir, "runs", run_id, "state", "transfers.jsonl")

    def record_transfer(
        self,
        run_id: str,
        from_stage: str,
        to_stage: str,
        envelope_id: str,
        status: str,
        reason: str = "",
        metadata: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        path = self._log_path(run_id)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        record = {
            "transferId": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "fromStage": from_stage,
            "toStage": to_stage,
            "envelopeId": envelope_id,
            "status": status,
            "reason": reason,
            "metadata": metadata or {},
        }
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        return record

    def read_transfer_log(self, run_id: str) -> List[Dict[str, Any]]:
        path = self._log_path(run_id)
        if not os.path.exists(path):
            return []
        rows: List[Dict[str, Any]] = []
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
        return rows

