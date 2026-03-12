import json
import asyncio
from src.config import CONTENT_EXTRACTOR_DIR


async def run_content_extractor(urls: list) -> str:
    """
    يُشغّل وكيل استخراج المحتوى (content-extractor-agent) لجلب نصوص الصفحات من الروابط.

    Args:
        urls: قائمة روابط لاستخراج محتواها

    Returns:
        JSON string يحتوي على المحتوى المستخرج من كل رابط (title, body, metadata)
    """
    message = f"قم باستخراج المحتوى من الروابط التالية:\n" + "\n".join(urls)
    input_data = json.dumps({"messages": [{"role": "user", "content": message}]}, ensure_ascii=False)

    try:
        process = await asyncio.create_subprocess_exec(
            "npm", "run", "dev",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=CONTENT_EXTRACTOR_DIR
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(input=input_data.encode()),
            timeout=180
        )

        if process.returncode == 0:
            return stdout.decode("utf-8")
        else:
            return json.dumps({"error": f"Content extractor failed: {stderr.decode()}"})

    except asyncio.TimeoutError:
        return json.dumps({"error": "Content extractor timed out after 180 seconds"})
    except Exception as e:
        return json.dumps({"error": f"Content extractor error: {str(e)}"})
