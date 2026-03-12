from src.state.recovery_handler import RecoveryHandler
from src.state.transfer_recorder import TransferRecorder


def test_resume_after_partial_failure(tmp_path, monkeypatch):
    monkeypatch.setattr("src.state.recovery_handler.time.sleep", lambda _x: None)
    recorder = TransferRecorder(runtime_dir=str(tmp_path))
    run_id = "run-recovery"
    recorder.record_transfer(run_id, "search", "extract", "task-1", "success")
    recorder.record_transfer(run_id, "extract", "analyze", "task-1", "failure", reason="injected failure")

    handler = RecoveryHandler(recorder)
    decision = handler.create_recovery_decision("injected failure", "analyze", retry_count=1)
    action = handler.execute_recovery(decision)
    resume = handler.resume_from_checkpoint(run_id)

    assert decision["action"] == "retry"
    assert action == "retry"
    assert resume["resumeFrom"] == "extract"

