import json
import asyncio
from src.config import REPORT_DRAFTING_DIR


async def run_report_drafting(
    topic: str,
    data: str,
    sources: list,
    report_type: str = "analytical",
    target_audience: str = "عام",
    language_level: str = "formal",
    citation_format: str = "APA",
    output_format: str = "markdown",
    additional_instructions: str = ""
) -> str:
    """
    يُشغّل وكيل صياغة التقارير (report-drafting-agent) لإنتاج تقرير احترافي منظم.

    Args:
        topic: موضوع التقرير
        data: البيانات الخام والحقائق المستخلصة
        sources: قائمة المصادر مع الروابط والمحتوى
        report_type: نوع التقرير (technical/analytical/executive/research)
        target_audience: الجمهور المستهدف
        language_level: مستوى اللغة (formal/semi-formal/simplified)
        citation_format: صيغة التوثيق (APA/inline/footnotes)
        output_format: صيغة المخرج (markdown/pdf/docx)
        additional_instructions: تعليمات إضافية

    Returns:
        JSON string يحتوي على FinalReport (title, executiveSummary, tableOfContents, body, bibliography)
    """
    envelope = {
        "protocolVersion": "research-task-envelope/v1",
        "runId": "runtime-run",
        "taskId": "report-drafting-task",
        "workflowStage": "draft",
        "sender": "SearchManager",
        "targetAgent": "ReportDrafter",
        "objective": topic,
        "userRequest": "صياغة التقرير النهائي",
        "constraints": {
            "reportType": report_type,
            "targetAudience": target_audience,
            "languageLevel": language_level,
            "citationFormat": citation_format,
            "outputFormat": output_format
        },
        "inputs": {
            "artifacts": [],
            "inlineData": {
                "data": data,
                "sources": sources,
                "additionalInstructions": additional_instructions
            },
            "sharedStatePath": "runtime/runs/runtime-run/state/workflow-state.json"
        },
        "execution": {"attempt": 1, "timeoutSeconds": 240},
        "trace": {
            "createdAt": "2026-03-12T00:00:00Z",
            "createdBy": "search-manager-agent",
            "correlationId": "runtime-run"
        }
    }

    input_json = json.dumps(envelope, ensure_ascii=False)

    try:
        process = await asyncio.create_subprocess_exec(
            "npm", "run", "start",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=REPORT_DRAFTING_DIR
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(input=input_json.encode()),
            timeout=240
        )

        if process.returncode == 0:
            return stdout.decode("utf-8")
        else:
            return json.dumps({"error": f"Report drafting failed: {stderr.decode()}"})

    except asyncio.TimeoutError:
        return json.dumps({"error": "Report drafting timed out after 240 seconds"})
    except Exception as e:
        return json.dumps({"error": f"Report drafting error: {str(e)}"})
