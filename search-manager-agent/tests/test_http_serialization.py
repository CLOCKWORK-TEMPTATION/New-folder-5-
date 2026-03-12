import asyncio
import json

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


def test_search_scout_json_serialization(monkeypatch):
    proc = _FakeProcess()

    async def fake_exec(*_args, **_kwargs):
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    result = asyncio.run(run_search_scout(topic="x", objective="y"))
    payload = json.loads(proc.input_data.decode("utf-8"))
    assert "ok" in json.loads(result)
    assert payload["protocolVersion"] == "research-task-envelope/v1"
    assert payload["workflowStage"] == "search"
    assert payload["inputs"]["sharedStatePath"].endswith("workflow-state.json")


def test_content_extractor_json_serialization(monkeypatch):
    proc = _FakeProcess()

    async def fake_exec(*_args, **_kwargs):
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    result = asyncio.run(run_content_extractor(urls=["https://example.com"]))
    payload = json.loads(proc.input_data.decode("utf-8"))
    assert "ok" in json.loads(result)
    assert payload["protocolVersion"] == "research-task-envelope/v1"
    assert payload["workflowStage"] == "extract"
    assert payload["inputs"]["artifacts"] == ["https://example.com"]


def test_report_drafting_json_serialization(monkeypatch):
    proc = _FakeProcess()

    async def fake_exec(*_args, **_kwargs):
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    result = asyncio.run(
        run_report_drafting(
            topic="t",
            data="d",
            sources=[{"url": "https://example.com"}],
        )
    )
    payload = json.loads(proc.input_data.decode("utf-8"))
    assert "ok" in json.loads(result)
    assert payload["protocolVersion"] == "research-task-envelope/v1"
    assert payload["workflowStage"] == "draft"
    assert payload["inputs"]["inlineData"]["data"] == "d"


def test_deep_research_envelope_file_serialization(monkeypatch):
    proc = _FakeProcess()
    captured = {}
    real_exists = __import__("os").path.exists

    async def fake_exec(*args, **_kwargs):
        envelope_path = args[-1]
        with open(envelope_path, "r", encoding="utf-8") as handle:
            captured["payload"] = json.load(handle)
        return proc

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    monkeypatch.setattr(
        __import__("os").path,
        "exists",
        lambda p: False if str(p).endswith("final-report.md") else real_exists(p),
    )

    result = asyncio.run(run_deep_research(query="abc"))
    assert "ok" in json.loads(result)
    assert captured["payload"]["protocolVersion"] == "research-task-envelope/v1"
    assert captured["payload"]["workflowStage"] == "analyze"
    assert captured["payload"]["inputs"]["sharedStatePath"].endswith("workflow-state.json")

