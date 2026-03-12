"""
نقطة الدخول الرئيسية لـ Search Manager Agent
مثال: python -m src.main --query "ما هي أحدث تطورات الذكاء الاصطناعي في الطب 2024؟"
"""
import asyncio
import argparse
import sys
from src.agents.manager_agent import run_deep_search
from src.tools.readiness_tool import generate_readiness_report


def parse_args():
    parser = argparse.ArgumentParser(
        description="Search Manager - نظام البحث العميق متعدد الوكلاء",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
أمثلة:
  python -m src.main --query "ما هي أحدث تطورات الذكاء الاصطناعي في الطب 2024؟"
  python -m src.main --query "تأثير السياسات النقدية على التضخم في مصر" --model gpt-4o
        """
    )
    parser.add_argument(
        "--query", "-q",
        required=False,
        help="سؤال أو موضوع البحث"
    )
    parser.add_argument(
        "--model", "-m",
        default=None,
        help="اسم نموذج OpenAI (الافتراضي: من ملف .env)"
    )
    parser.add_argument(
        "--readiness",
        action="store_true",
        help="تشغيل فحص الجاهزية الموحد B1-B7 وإظهار التقرير"
    )
    return parser.parse_args()


async def main():
    args = parse_args()

    try:
        if args.readiness:
            print(generate_readiness_report())
            return
        if not args.query:
            raise ValueError("المعامل --query مطلوب عند تشغيل دورة البحث")

        result = await run_deep_search(
            query=args.query,
            model_name=args.model
        )
        print("\n" + "="*60)
        print("اكتمل البحث بنجاح")
        print("="*60)
    except KeyboardInterrupt:
        print("\nتم إيقاف البحث من المستخدم")
        sys.exit(0)
    except Exception as e:
        print(f"\nخطأ: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
