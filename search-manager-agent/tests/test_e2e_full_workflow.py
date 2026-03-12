from src.state.handoff_validator import HandoffValidator
from src.state.state_manager import StateManager
from src.state.transfer_recorder import TransferRecorder


def _envelope(stage: str):
    return {
        "protocolVersion": "research-task-envelope/v1",
        "runId": "run-e2e",
        "taskId": "task-e2e",
        "workflowStage": stage,
        "sender": "SearchManager",
        "targetAgent": "worker",
        "objective": "obj",
        "userRequest": "request",
        "constraints": {},
        "inputs": {"artifacts": [], "inlineData": {}, "sharedStatePath": "runtime/runs/run-e2e/state/workflow-state.json"},
        "execution": {"attempt": 1, "timeoutSeconds": 120},
        "trace": {"createdAt": "2026-03-12T00:00:00Z", "createdBy": "mgr", "correlationId": "c1"},
    }


def test_handoff_envelope_completeness(tmp_path):
    run_id = "run-e2e"
    manager = StateManager(runtime_dir=str(tmp_path))
    validator = HandoffValidator()
    recorder = TransferRecorder(runtime_dir=str(tmp_path))
    manager.save_workflow_state(run_id, manager.load_workflow_state(run_id))

    transitions = [("search", "extract"), ("extract", "analyze"), ("analyze", "draft")]
    for from_stage, to_stage in transitions:
        ok, _ = validator.validate_envelope(_envelope(from_stage))
        assert ok is True
        ok, _ = validator.validate_state_transition(from_stage, to_stage)
        assert ok is True
        manager.advance_stage(run_id, to_stage)
        recorder.record_transfer(run_id, from_stage, to_stage, "task-e2e", "success")

    final_state = manager.load_workflow_state(run_id)
    log = recorder.read_transfer_log(run_id)
    assert final_state["currentStage"] == "draft"
    assert final_state["status"] == "completed"
    assert len(log) == 3

