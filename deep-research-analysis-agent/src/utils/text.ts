const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "among",
  "been",
  "being",
  "between",
  "could",
  "does",
  "during",
  "from",
  "have",
  "into",
  "just",
  "many",
  "more",
  "most",
  "other",
  "over",
  "such",
  "than",
  "that",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "very",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would"
]);

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function slugify(value: string, fallback = "item"): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function tokenize(text: string): string[] {
  return normalizeWhitespace(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function splitIntoSentences(text: string, maxSentences = 250): string[] {
  return text
    .replace(/\r/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 35 && sentence.length <= 400)
    .slice(0, maxSentences);
}

export function keywordOverlapScore(text: string, keywords: string[]): number {
  const tokens = tokenize(text);
  if (tokens.length === 0 || keywords.length === 0) {
    return 0;
  }

  const tokenSet = new Set(tokens);
  let score = 0;

  for (const keyword of keywords) {
    if (tokenSet.has(keyword)) {
      score += 1;
    }
  }

  return score;
}

export function jaccardSimilarity(
  a: Iterable<string>,
  b: Iterable<string>
): number {
  const aSet = new Set(a);
  const bSet = new Set(b);

  if (aSet.size === 0 || bSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const item of aSet) {
    if (bSet.has(item)) {
      intersection += 1;
    }
  }

  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : intersection / union;
}

export function extractNumbers(text: string): string[] {
  return text.match(/\b\d[\d,./-]*\b/g) ?? [];
}

export function uniqueBy<T>(
  items: T[],
  getKey: (item: T) => string
): T[] {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
  }

  return output;
}
