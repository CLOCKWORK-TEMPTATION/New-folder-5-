import json
import asyncio
import os
import tempfile
from src.config import DEEP_RESEARCH_DIR


async def run_deep_research(
    query: str,
    depth: str = "deep",
    freshness: str = "recent-preferred",
    max_sources: int = 8,
    min_credibility: int = 65
) -> str:
    """
    يُشغّل وكيل التحليل البحثي العميق (deep-research-analysis-agent) للتحقق من المصداقية واستخلاص الحقائق.

    Args:
        query: الاستعلام البحثي
        depth: عمق البحث (shallow/moderate/deep)
        freshness: تفضيل حداثة المصادر
        max_sources: الحد الأقصى للمصادر
        min_credibility: الحد الأدنى لدرجة المصداقية (0-100)

    Returns:
        محتوى التقرير النهائي بصيغة Markdown مع الحقائق والتناقضات المكتشفة
    """
    envelope = {
        "protocolVersion": "research-task-envelope/v1",
        "runId": "runtime-run",
        "taskId": "deep-research-task",
        "workflowStage": "analyze",
        "sender": "SearchManager",
        "targetAgent": "DeepResearcher",
        "objective": "تحليل المخرجات والتحقق من الثغرات",
        "userRequest": query,
        "constraints": {"depth": depth, "freshness": freshness},
        "inputs": {
            "artifacts": [],
            "inlineData": {"maxSources": max_sources, "minCredibility": min_credibility},
            "sharedStatePath": "runtime/runs/runtime-run/state/workflow-state.json"
        },
        "execution": {"attempt": 1, "timeoutSeconds": 300},
        "trace": {
            "createdAt": "2026-03-12T00:00:00Z",
            "createdBy": "search-manager-agent",
            "correlationId": "runtime-run"
        }
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as temp:
        json.dump(envelope, temp, ensure_ascii=False)
        temp_path = temp.name

    cmd = [
        "npm", "run", "dev", "--",
        "--envelope-path", temp_path
    ]

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=DEEP_RESEARCH_DIR
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=300
        )

        # محاولة قراءة التقرير النهائي من الملف
        report_path = os.path.join(DEEP_RESEARCH_DIR, "runtime", "workspace", "reports", "final-report.md")
        if os.path.exists(report_path):
            with open(report_path, "r", encoding="utf-8") as f:
                return f.read()

        if process.returncode == 0:
            return stdout.decode("utf-8")
        else:
            return json.dumps({"error": f"Deep research failed: {stderr.decode()}"})

    except asyncio.TimeoutError:
        return json.dumps({"error": "Deep research timed out after 300 seconds"})
    except Exception as e:
        return json.dumps({"error": f"Deep research error: {str(e)}"})
    finally:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
