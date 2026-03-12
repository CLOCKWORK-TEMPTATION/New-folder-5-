import json
import asyncio
from src.config import SEARCH_SCOUT_DIR


async def run_search_scout(
    topic: str,
    objective: str,
    geographic_scope: str = "عالمي",
    time_frame: str = "2023-2026",
    languages: list = ["ar", "en"],
    engines: list = ["serper", "google"],
    max_results_per_engine: int = 10,
    excluded_domains: list = None
) -> str:
    """
    يُشغّل وكيل البحث والاستكشاف (search-scout-agent) لتوليد استعلامات ذكية وجمع روابط المصادر.

    Args:
        topic: موضوع البحث
        objective: هدف البحث
        geographic_scope: النطاق الجغرافي
        time_frame: الإطار الزمني
        languages: اللغات المطلوبة
        engines: محركات البحث
        max_results_per_engine: الحد الأقصى للنتائج لكل محرك
        excluded_domains: النطاقات المستبعدة

    Returns:
        JSON string يحتوي على النتائج المرتبة مع روابط وملخصات
    """
    search_plan = {
        "topic": topic,
        "objective": objective,
        "geographicScope": geographic_scope,
        "timeFrame": time_frame,
        "languages": languages,
        "searchTopic": "general",
        "engines": engines,
        "maxResultsPerEngine": max_results_per_engine,
        "excludedDomains": excluded_domains or ["pinterest.com", "quora.com"],
        "additionalInstructions": "ركّز على المصادر الموثوقة والأكاديمية"
    }

    input_json = json.dumps({"searchPlan": search_plan}, ensure_ascii=False)

    try:
        process = await asyncio.create_subprocess_exec(
            "npm", "run", "dev",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=SEARCH_SCOUT_DIR
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(input=input_json.encode()),
            timeout=120
        )

        if process.returncode == 0:
            return stdout.decode("utf-8")
        else:
            return json.dumps({"error": f"Search scout failed: {stderr.decode()}"})

    except asyncio.TimeoutError:
        return json.dumps({"error": "Search scout timed out after 120 seconds"})
    except Exception as e:
        return json.dumps({"error": f"Search scout error: {str(e)}"})
