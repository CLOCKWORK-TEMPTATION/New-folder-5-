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
    raw_input = {
        "topic": topic,
        "data": data,
        "sources": sources,
        "reportType": report_type,
        "targetAudience": target_audience,
        "languageLevel": language_level,
        "citationFormat": citation_format,
        "outputFormat": output_format,
        "additionalInstructions": additional_instructions
    }

    input_json = json.dumps({"rawInput": raw_input}, ensure_ascii=False)

    try:
        process = await asyncio.create_subprocess_exec(
            "npm", "run", "dev",
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
