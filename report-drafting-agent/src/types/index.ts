/**
 * أنواع البيانات المستخدمة في وكيل صياغة التقارير
 */

/** نوع التقرير */
export type ReportType = "technical" | "analytical" | "executive" | "research";

/** صيغة المراجع */
export type CitationFormat = "APA" | "inline" | "footnotes";

/** صيغة المخرج النهائي */
export type OutputFormat = "markdown" | "pdf" | "docx";

/** مستوى اللغة */
export type LanguageLevel = "formal" | "semi-formal" | "simplified";

/** بيانات الإدخال الخام */
export interface RawInputData {
  topic: string;
  data: string;
  sources: SourceReference[];
  reportType: ReportType;
  targetAudience: string;
  languageLevel: LanguageLevel;
  citationFormat: CitationFormat;
  outputFormat: OutputFormat;
  additionalInstructions?: string;
}

/** مرجع مصدر */
export interface SourceReference {
  id: string;
  title: string;
  author?: string;
  url?: string;
  date?: string;
  content: string;
  type: "article" | "report" | "data" | "interview" | "other";
}

/** قسم في المخطط الهيكلي */
export interface OutlineSection {
  number: string;
  title: string;
  depth: "deep" | "moderate" | "brief";
  instructions: string;
  relatedSections: string[];
  requiredSources: string[];
  estimatedWordCount: number;
}

/** المخطط الهيكلي */
export interface ReportOutline {
  title: string;
  reportType: ReportType;
  sections: OutlineSection[];
  writingGuidelines: string;
  totalEstimatedWords: number;
}

/** قسم مكتوب */
export interface WrittenSection {
  sectionNumber: string;
  title: string;
  content: string;
  claims: Claim[];
  wordCount: number;
}

/** ادعاء يحتاج توثيق */
export interface Claim {
  text: string;
  sectionNumber: string;
  sourceId?: string;
  verified: boolean;
}

/** مرجع موثق */
export interface FormattedCitation {
  sourceId: string;
  inTextCitation: string;
  fullReference: string;
  format: CitationFormat;
}

/** نتيجة التوثيق */
export interface CitationResult {
  sections: WrittenSection[];
  citations: FormattedCitation[];
  bibliography: string;
  unverifiedClaims: Claim[];
}

/** مشكلة في المراجعة */
export interface QAIssue {
  type: "inconsistency" | "repetition" | "terminology" | "formatting" | "missing_citation";
  location: string;
  description: string;
  suggestion: string;
  severity: "critical" | "major" | "minor";
}

/** نتيجة المراجعة */
export interface QAResult {
  issues: QAIssue[];
  overallScore: number;
  passedChecks: string[];
  requiresRevision: boolean;
}

/** التقرير النهائي */
export interface FinalReport {
  title: string;
  executiveSummary: string;
  tableOfContents: string;
  body: string;
  bibliography: string;
  metadata: {
    generatedAt: string;
    reportType: ReportType;
    wordCount: number;
    sectionCount: number;
    sourceCount: number;
    outputFormat: OutputFormat;
  };
}
