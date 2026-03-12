/**
 * وكيل التوثيق والمراجع - Citation & Evidence Linker SubAgent
 *
 * المسؤوليات:
 * - ربط كل ادعاء أو رقم أو استنتاج بمصدره الأصلي
 * - توليد المراجع بالصيغة المطلوبة (APA, inline, footnotes)
 * - التحقق من أن كل مصدر مذكور مستخدم فعلاً
 * - التحقق من أن كل ادعاء جوهري موثّق
 */
import type { SubAgent } from "deepagents";
import { CITATION_LINKER_PROMPT } from "../prompts/citation-linker.js";
import {
  linkClaimToSource,
  formatCitation,
  verifyCitationCompleteness,
} from "../tools/citation-tools.js";

export const citationLinkerAgent: SubAgent = {
  name: "citation-linker",
  description:
    "يربط كل ادعاء ورقم واستنتاج في التقرير بمصدره الأصلي، يولّد المراجع بصيغة APA أو inline أو footnotes، ويتحقق من اكتمال التوثيق.",
  systemPrompt: CITATION_LINKER_PROMPT,
  tools: [linkClaimToSource, formatCitation, verifyCitationCompleteness],
};
