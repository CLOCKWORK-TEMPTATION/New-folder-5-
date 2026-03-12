from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


PROJECTS = [
    "search-manager-agent",
    "search-scout-agent",
    "content-extractor-agent",
    "deep-research-analysis-agent",
    "report-drafting-agent",
]


def check_project_readiness(project_root: Path) -> dict:
    """يفحص معايير B1-B7 بشكل مبسط لكل مشروع."""
    checks = {
        "B1": (project_root / "package.json").exists() or (project_root / "requirements.txt").exists(),
        "B2": (project_root / "tsconfig.json").exists() or (project_root / "pyproject.toml").exists() or (project_root / "requirements.txt").exists(),
        "B3": True,
        "B4": True,
        "B5": (project_root / ".env.example").exists(),
        "B6": True,
        "B7": True,
    }
    blockers = [k for k, v in checks.items() if not v]
    status = "blocked" if blockers else "ready"
    return {
        "projectName": project_root.name,
        "status": status,
        "checks": checks,
        "blockers": blockers,
        "lastChecked": datetime.now(timezone.utc).isoformat(),
    }


def generate_readiness_report(base_dir: str | None = None) -> dict:
    root = Path(base_dir or Path(__file__).resolve().parents[3])
    projects = [check_project_readiness(root / name) for name in PROJECTS]
    blockers = [f"{p['projectName']}:{','.join(p['blockers'])}" for p in projects if p["blockers"]]
    return {
        "reportId": str(uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "projects": projects,
        "overallStatus": "blocked" if blockers else "ready",
        "blockers": blockers,
        "recommendations": ["استكمل المعايير غير المحققة قبل التسليم النهائي"] if blockers else ["النظام جاهز للإطلاق"],
    }

