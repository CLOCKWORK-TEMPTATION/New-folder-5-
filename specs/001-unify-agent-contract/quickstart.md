# Quickstart — Unified Agent Contract

## 1) Setup

```bash
# Python orchestrator
cd search-manager-agent
pip install -r requirements.txt

# TypeScript workers (repeat per project)
cd ../search-scout-agent && npm install
cd ../content-extractor-agent && npm install
cd ../deep-research-analysis-agent && npm install
cd ../report-drafting-agent && npm install
```

## 2) Dry-run example

```bash
cd search-manager-agent
python -m src.main --query "اختبار dry-run لعقد النقل الموحد"
```

## 3) Handoff example

المنسق ينشئ Envelope موحداً بالصيغة `research-task-envelope/v1` ثم يمرره للوكيل الهدف عبر `stdin`.

## 4) Recovery example

عند فشل مرحلة، يُسجَّل checkpoint ويُنشأ RecoveryDecision:
- retry (1s, 2s, 4s)
- resume_from_checkpoint
- abort

## 5) Readiness report example

```bash
cd search-manager-agent
python -c "from src.tools.readiness_tool import generate_readiness_report; print(generate_readiness_report())"
```
