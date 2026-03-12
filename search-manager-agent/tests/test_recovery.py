from src.state.recovery_handler import RecoveryHandler
from src.state.transfer_recorder import TransferRecorder


def test_detect_failure():
    handler = RecoveryHandler()
    assert handler.detect_failure({"status": "failure"}) is True
    assert handler.detect_failure({"status": "success"}) is False


def test_create_recovery_decision_retry():
    handler = RecoveryHandler()
    decision = handler.create_recovery_decision("err", "search", 1)
    assert decision["action"] == "retry"
    assert decision["backoffSeconds"] == 2


def test_create_recovery_decision_abort():
    handler = RecoveryHandler()
    decision = handler.create_recovery_decision("err", "search", 3)
    assert decision["action"] == "abort"


def test_resume_from_checkpoint(tmp_path):
    recorder = TransferRecorder(runtime_dir=str(tmp_path))
    recorder.record_transfer("run1", "search", "extract", "env1", "success")
    handler = RecoveryHandler(recorder)
    result = handler.resume_from_checkpoint("run1")
    assert result["resumeFrom"] == "extract"

