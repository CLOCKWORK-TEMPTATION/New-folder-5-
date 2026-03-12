from typing import Dict, Tuple


class HandoffValidator:
    """مدقق الحزمة الموحدة والتحولات القانونية للحالة."""

    REQUIRED_FIELDS = [
        "protocolVersion",
        "runId",
        "taskId",
        "workflowStage",
        "sender",
        "targetAgent",
        "objective",
        "userRequest",
        "constraints",
        "inputs",
        "execution",
        "trace",
    ]

    ALLOWED_TRANSITIONS = {
        "search": {"extract"},
        "extract": {"analyze"},
        "analyze": {"draft"},
        "draft": set(),
    }

    def validate_envelope(self, envelope: Dict) -> Tuple[bool, str]:
        if envelope.get("protocolVersion") != "research-task-envelope/v1":
            return False, "protocolVersion غير صالح"

        for field in self.REQUIRED_FIELDS:
            if field not in envelope:
                return False, f"الحقل المطلوب مفقود: {field}"

        return True, "valid"

    def validate_state_transition(self, from_stage: str, to_stage: str) -> Tuple[bool, str]:
        allowed = self.ALLOWED_TRANSITIONS.get(from_stage, set())
        if to_stage not in allowed:
            return False, f"انتقال غير قانوني: {from_stage} -> {to_stage}"
        return True, "valid"

