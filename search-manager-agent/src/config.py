import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o")

# مسارات الوكلاء الأربعة
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AGENTS_DIR = BASE_DIR

SEARCH_SCOUT_DIR = os.path.join(AGENTS_DIR, "search-scout-agent")
CONTENT_EXTRACTOR_DIR = os.path.join(AGENTS_DIR, "content-extractor-agent")
DEEP_RESEARCH_DIR = os.path.join(AGENTS_DIR, "deep-research-analysis-agent")
REPORT_DRAFTING_DIR = os.path.join(AGENTS_DIR, "report-drafting-agent")
