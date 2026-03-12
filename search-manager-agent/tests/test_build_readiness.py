from src.tools.readiness_tool import check_project_readiness, generate_readiness_report


def test_check_project_readiness_blocked(tmp_path):
    result = check_project_readiness(tmp_path)
    assert result["status"] == "blocked"
    assert "B1" in result["blockers"]


def test_generate_readiness_report_structure(tmp_path):
    report = generate_readiness_report(base_dir=str(tmp_path))
    assert "reportId" in report
    assert "projects" in report
    assert report["overallStatus"] in {"ready", "blocked"}

