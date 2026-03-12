from src.state.state_manager import StateManager
from src.state.transfer_recorder import TransferRecorder


def test_state_load_default(tmp_path):
    manager = StateManager(runtime_dir=str(tmp_path))
    state = manager.load_workflow_state("run1")
    assert state["runId"] == "run1"
    assert state["currentStage"] == "search"


def test_state_save_and_load(tmp_path):
    manager = StateManager(runtime_dir=str(tmp_path))
    state = manager.load_workflow_state("run1")
    state["currentStage"] = "extract"
    manager.save_workflow_state("run1", state)
    loaded = manager.load_workflow_state("run1")
    assert loaded["currentStage"] == "extract"


def test_advance_stage(tmp_path):
    manager = StateManager(runtime_dir=str(tmp_path))
    new_state = manager.advance_stage("run1", "extract")
    assert new_state["lastSuccessfulStage"] == "search"
    assert new_state["currentStage"] == "extract"


def test_record_transfer(tmp_path):
    recorder = TransferRecorder(runtime_dir=str(tmp_path))
    entry = recorder.record_transfer("run1", "search", "extract", "env1", "success")
    assert entry["status"] == "success"
    assert recorder.read_transfer_log("run1")

