/**
 * وكيل الكتابة التحريرية - Section Writer SubAgent
 *
 * المسؤوليات:
 * - كتابة كل قسم بالأسلوب المناسب حسب نوع التقرير
 * - التعامل مع نبرة الكتابة والمستوى اللغوي المطلوب
 */
import type { SubAgent } from "deepagents";
import { SECTION_WRITER_PROMPT } from "../prompts/section-writer.js";
import {
  writeSection,
  adjustTone,
  createTransition,
} from "../tools/writing-tools.js";

export const sectionWriterAgent: SubAgent = {
  name: "section-writer",
  description:
    "يكتب قسماً واحداً من التقرير بأسلوب احترافي متكيّف مع نوع التقرير (تقني، تحليلي، تنفيذي) والجمهور المستهدف، مع تمييز الادعاءات التي تحتاج توثيق.",
  systemPrompt: SECTION_WRITER_PROMPT,
  tools: [writeSection, adjustTone, createTransition],
};
