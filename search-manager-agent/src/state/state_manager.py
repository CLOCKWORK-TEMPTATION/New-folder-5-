import json
import os
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict


class StateManager:
    """يدير حالة رحلة البحث الموحدة على القرص."""

    def __init__(self, runtime_dir: str = "runtime"):
        self.runtime_dir = runtime_dir
        self._lock = Lock()

    def _state_path(self, run_id: str) -> str:
        return os.path.join(self.runtime_dir, "runs", run_id, "state", "workflow-state.json")

    def _ensure_parent(self, path: str) -> None:
        os.makedirs(os.path.dirname(path), exist_ok=True)

    def load_workflow_state(self, run_id: str) -> Dict[str, Any]:
        path = self._state_path(run_id)
        if not os.path.exists(path):
            now = datetime.now(timezone.utc).isoformat()
            return {
                "runId": run_id,
                "currentStage": "search",
                "lastSuccessfulStage": None,
                "iterationCount": 1,
                "status": "running",
                "updatedAt": now,
                "errors": [],
                "checkpoints": [],
            }
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    def save_workflow_state(self, run_id: str, state: Dict[str, Any]) -> str:
        path = self._state_path(run_id)
        self._ensure_parent(path)
        state["updatedAt"] = datetime.now(timezone.utc).isoformat()
        temp_path = f"{path}.tmp"
        with self._lock:
            with open(temp_path, "w", encoding="utf-8") as handle:
                json.dump(state, handle, ensure_ascii=False, indent=2)
            os.replace(temp_path, path)
        return path

    def advance_stage(self, run_id: str, next_stage: str) -> Dict[str, Any]:
        state = self.load_workflow_state(run_id)
        state["lastSuccessfulStage"] = state.get("currentStage")
        state["currentStage"] = next_stage
        if next_stage == "draft":
            state["status"] = "completed"
        self.save_workflow_state(run_id, state)
        return state

