import json
import asyncio
import os
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
    cmd = [
        "npm", "run", "dev", "--",
        "--query", query,
        "--depth", depth,
        "--freshness", freshness,
        "--max-sources", str(max_sources),
        "--min-credibility", str(min_credibility)
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
