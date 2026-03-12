export interface FetchedDocument {
  source_url: string;
  author: string | null;
  publish_date: string | null;
  access_date: string;
  content_type: string;
  raw_content: string;
  binary_encoding?: "base64";
  retrieval_mode: "static" | "dynamic" | "ocr";
  title?: string | null;
}

export type ContentBlockType = "خبر" | "تحليل" | "رأي" | "إحصاء";

export interface CleanedContentBlock {
  type: ContentBlockType;
  text: string;
  stats_source: string | null;
}

export interface CleanedDocument {
  source_url: string;
  author: string | null;
  publish_date: string | null;
  access_date: string;
  content_type: string;
  title: string | null;
  cleaned_text: string;
  content_blocks: CleanedContentBlock[];
}

export interface UnifiedContentDocument {
  source_url: string;
  author: string | null;
  publish_date: string | null;
  access_date: string;
  source_type: "رسمي" | "أكاديمي" | "صحفي" | "مدونة";
  credibility_tier: 1 | 2 | 3;
  direct_quote_available: boolean;
  content_blocks: CleanedContentBlock[];
}
