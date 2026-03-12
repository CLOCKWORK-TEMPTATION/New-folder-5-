from src.state.handoff_validator import HandoffValidator


def _valid_envelope():
    return {
        "protocolVersion": "research-task-envelope/v1",
        "runId": "run-1",
        "taskId": "task-1",
        "workflowStage": "search",
        "sender": "SearchManager",
        "targetAgent": "SearchScout",
        "objective": "obj",
        "userRequest": "request",
        "constraints": {},
        "inputs": {"artifacts": [], "inlineData": {}, "sharedStatePath": "state.json"},
        "execution": {"attempt": 1, "timeoutSeconds": 60},
        "trace": {"createdAt": "now", "createdBy": "mgr", "correlationId": "c1"},
    }


def test_validate_envelope_success():
    validator = HandoffValidator()
    ok, _ = validator.validate_envelope(_valid_envelope())
    assert ok is True


def test_validate_envelope_missing_field():
    validator = HandoffValidator()
    payload = _valid_envelope()
    del payload["targetAgent"]
    ok, msg = validator.validate_envelope(payload)
    assert ok is False
    assert "targetAgent" in msg


def test_validate_envelope_protocol():
    validator = HandoffValidator()
    payload = _valid_envelope()
    payload["protocolVersion"] = "bad"
    ok, msg = validator.validate_envelope(payload)
    assert ok is False
    assert "protocolVersion" in msg


def test_validate_state_transition_success():
    validator = HandoffValidator()
    ok, _ = validator.validate_state_transition("search", "extract")
    assert ok is True


def test_validate_state_transition_failure():
    validator = HandoffValidator()
    ok, msg = validator.validate_state_transition("search", "draft")
    assert ok is False
    assert "غير قانوني" in msg

