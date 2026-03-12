import os
from pathlib import Path
from dotenv import dotenv_values

_root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if not _root_env.exists():
    raise FileNotFoundError(
        f"Missing root environment file at {_root_env}. This agent reads configuration from the repository root .env only."
    )

_root_env_values = {
    key: value
    for key, value in dotenv_values(_root_env).items()
    if value is not None
}
os.environ.update(_root_env_values)

OPENAI_API_KEY = _root_env_values.get("OPENAI_API_KEY")
ANTHROPIC_API_KEY = _root_env_values.get("ANTHROPIC_API_KEY")
MODEL_NAME = _root_env_values.get("MODEL_NAME", "gpt-4o")

if not OPENAI_API_KEY:
    raise RuntimeError(
        "Missing OPENAI_API_KEY in the repository root .env file."
    )

# مسارات الوكلاء الأربعة
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AGENTS_DIR = BASE_DIR

SEARCH_SCOUT_DIR = os.path.join(AGENTS_DIR, "search-scout-agent")
CONTENT_EXTRACTOR_DIR = os.path.join(AGENTS_DIR, "content-extractor-agent")
DEEP_RESEARCH_DIR = os.path.join(AGENTS_DIR, "deep-research-analysis-agent")
REPORT_DRAFTING_DIR = os.path.join(AGENTS_DIR, "report-drafting-agent")
