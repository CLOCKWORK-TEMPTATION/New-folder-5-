import asyncio
import json
import os

from src.state.state_manager import StateManager
from src.state.transfer_recorder import TransferRecorder
from src.tools.content_extractor_tool import run_content_extractor
from src.tools.deep_research_tool import run_deep_research
from src.tools.report_drafting_tool import run_report_drafting
from src.tools.search_scout_tool import run_search_scout


class _FakeProcess:
    def __init__(self):
        self.input_data = b""
        self.returncode = 0

    async def communicate(self, input=None):
        if input:
            self.input_data = input
        return b'{"ok": true}', b""


def test_orchestrator_state_path_pattern():
    manager = StateManager(runtime_dir="runtime")
    path = manager._state_path("run-a")
    assert path.endswith(os.path.join("state", "workflow-state.json"))


def test_orchestrator_only_writes_workflow_state(tmp_path):
    manager = StateManager(runtime_dir=str(tmp_path))
    path = manager.save_workflow_state("run-a", manager.load_workflow_state("run-a"))
    assert path.endswith(os.path.join("state", "workflow-state.json"))
    assert os.path.exists(path)


def test_transfer_log_separated_from_workflow_state(tmp_path):
    recorder = TransferRecorder(runtime_dir=str(tmp_path))
    record = recorder.record_transfer("run-a", "search", "extract", "task-a", "success")
    assert record["toStage"] == "extract"
    assert os.path.exists(os.path.join(str(tmp_path), "runs", "run-a", "state", "transfers.jsonl"))


def test_search_scout_worker_stage_and_state_path(monkeypatch):
    proc = _FakeProcess()

    async def fake_exec(*_args, **_kwargs):
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    asyncio.run(run_search_scout(topic="t", objective="o"))
    payload = json.loads(proc.input_data.decode("utf-8"))
    assert payload["workflowStage"] == "search"
    assert payload["inputs"]["sharedStatePath"].endswith("workflow-state.json")


def test_content_extractor_worker_stage_and_state_path(monkeypatch):
    proc = _FakeProcess()

    async def fake_exec(*_args, **_kwargs):
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    asyncio.run(run_content_extractor(urls=["https://example.com"]))
    payload = json.loads(proc.input_data.decode("utf-8"))
    assert payload["workflowStage"] == "extract"
    assert payload["inputs"]["sharedStatePath"].endswith("workflow-state.json")


def test_deep_research_worker_stage_and_state_path(monkeypatch):
    proc = _FakeProcess()
    captured = {}
    real_exists = os.path.exists

    async def fake_exec(*args, **_kwargs):
        envelope_path = args[-1]
        with open(envelope_path, "r", encoding="utf-8") as handle:
            captured["payload"] = json.load(handle)
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    monkeypatch.setattr(os.path, "exists", lambda p: False if str(p).endswith("final-report.md") else real_exists(p))
    asyncio.run(run_deep_research(query="q"))
    assert captured["payload"]["workflowStage"] == "analyze"
    assert captured["payload"]["inputs"]["sharedStatePath"].endswith("workflow-state.json")


def test_report_drafter_worker_stage_and_state_path(monkeypatch):
    proc = _FakeProcess()

    async def fake_exec(*_args, **_kwargs):
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    asyncio.run(run_report_drafting(topic="t", data="d", sources=[]))
    payload = json.loads(proc.input_data.decode("utf-8"))
    assert payload["workflowStage"] == "draft"
    assert payload["inputs"]["sharedStatePath"].endswith("workflow-state.json")


def test_worker_targets_are_separated(monkeypatch):
    proc = _FakeProcess()

    async def fake_exec(*_args, **_kwargs):
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    asyncio.run(run_search_scout(topic="t", objective="o"))
    scout = json.loads(proc.input_data.decode("utf-8"))
    asyncio.run(run_content_extractor(urls=[]))
    extractor = json.loads(proc.input_data.decode("utf-8"))
    assert scout["targetAgent"] != extractor["targetAgent"]


def test_worker_artifacts_do_not_override_global_state(monkeypatch):
    proc = _FakeProcess()

    async def fake_exec(*_args, **_kwargs):
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    asyncio.run(run_content_extractor(urls=["https://example.com/a"]))
    payload = json.loads(proc.input_data.decode("utf-8"))
    assert all("workflow-state.json" not in item for item in payload["inputs"]["artifacts"])


def test_state_and_stage_artifacts_are_isolated():
    shared_state = "runtime/runs/run-x/state/workflow-state.json"
    worker_output = "runtime/runs/run-x/02-extraction/output.json"
    assert "/state/" in shared_state
    assert "/02-extraction/" in worker_output

