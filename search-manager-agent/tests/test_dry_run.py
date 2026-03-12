from src.state.handoff_validator import HandoffValidator
from src.state.transfer_recorder import TransferRecorder


def test_dry_run_full_path(tmp_path):
    validator = HandoffValidator()
    recorder = TransferRecorder(runtime_dir=str(tmp_path))
    run_id = "run-dry"
    task_id = "task-dry"

    sequence = [("search", "extract"), ("extract", "analyze"), ("analyze", "draft")]
    for from_stage, to_stage in sequence:
        ok, _ = validator.validate_state_transition(from_stage, to_stage)
        assert ok is True
        recorder.record_transfer(run_id, from_stage, to_stage, task_id, "success", metadata={"dryRun": True})

    rows = recorder.read_transfer_log(run_id)
    assert len(rows) == 3
    assert all(row["metadata"].get("dryRun") is True for row in rows)

