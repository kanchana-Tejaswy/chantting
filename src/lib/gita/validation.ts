import { z } from "zod";

export const TOTAL_GITA_CHAPTERS = 18;

export const CONTENT_REVIEW_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "needs_correction",
] as const;

export const FEEDBACK_CATEGORIES = [
  "sanskrit_typo",
  "transliteration",
  "translation_accuracy",
  "attribution",
  "respectful_tone",
  "other",
] as const;

export const FEEDBACK_STATUSES = [
  "open",
  "reviewing",
  "resolved",
  "declined",
] as const;

export type ContentReviewStatus = (typeof CONTENT_REVIEW_STATUSES)[number];
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const contentReviewStatusSchema = z.enum(CONTENT_REVIEW_STATUSES);
export const feedbackCategorySchema = z.enum(FEEDBACK_CATEGORIES);
export const feedbackStatusSchema = z.enum(FEEDBACK_STATUSES);

export const chapterNumberSchema = z.coerce
  .number()
  .int("Chapter must be a whole number.")
  .min(1, "Bhagavad Gītā chapters range from 1 to 18.")
  .max(TOTAL_GITA_CHAPTERS, "Bhagavad Gītā chapters range from 1 to 18.");

export const verseNumberSchema = z.coerce
  .number()
  .int("Verse number must be a whole number.")
  .min(1, "Verse number must be at least 1.")
  .max(200, "Verse number is out of expected range (1–200).");

const optionalHttpUrlSchema = z
  .string()
  .trim()
  .max(1024, "URL must be at most 1024 characters.")
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))
  .refine(
    (val) =>
      val === null || val.startsWith("https://") || val.startsWith("http://"),
    "URL must begin with https:// or http://."
  );

/**
 * Strips PostgREST filter punctuation and LIKE wildcards from search terms.
 */
export function sanitizeSearchText(raw: string): string {
  return raw
    .replaceAll(",", " ")
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .replaceAll("%", " ")
    .replaceAll("_", " ")
    .replaceAll("\\", " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Recognizes direct verse references like "2.47", "2:47", "BG 2.47",
 * "Chapter 2 Verse 47", or "Chapter 2".
 */
export function parseVerseReference(
  input: string
): { chapter: number; verse?: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const chVerseMatch = trimmed.match(
    /^(?:(?:bg|gita|bhagavad\s+gita)\s+)?(?:ch(?:apter)?\.?\s*)?(\d{1,2})\s*(?:[.:]|verse\s*|v\.?\s*)\s*(\d{1,3})$/i
  );
  if (chVerseMatch) {
    const ch = Number.parseInt(chVerseMatch[1]!, 10);
    const v = Number.parseInt(chVerseMatch[2]!, 10);
    if (ch >= 1 && ch <= TOTAL_GITA_CHAPTERS && v >= 1 && v <= 200) {
      return { chapter: ch, verse: v };
    }
    return null;
  }

  const chOnlyMatch = trimmed.match(
    /^(?:(?:bg|gita|bhagavad\s+gita)\s+)?ch(?:apter)?\.?\s*(\d{1,2})$/i
  );
  if (chOnlyMatch) {
    const ch = Number.parseInt(chOnlyMatch[1]!, 10);
    if (ch >= 1 && ch <= TOTAL_GITA_CHAPTERS) {
      return { chapter: ch };
    }
  }

  return null;
}

export const gitaSearchQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(120, "Search query must be 120 characters or fewer.")
      .optional()
      .default(""),
    chapter: z
      .union([z.literal(""), chapterNumberSchema])
      .optional()
      .transform((val) => (val === "" || val === undefined ? undefined : val)),
    verse: z
      .union([z.literal(""), verseNumberSchema])
      .optional()
      .transform((val) => (val === "" || val === undefined ? undefined : val)),
  })
  .refine((data) => !(data.verse !== undefined && data.chapter === undefined), {
    message: "Specify a chapter (1–18) when filtering by verse number.",
    path: ["chapter"],
  });

export const bookmarkInputSchema = z.object({
  verseId: z.uuid("Valid verse ID is required."),
});

export const noteInputSchema = z.object({
  verseId: z.uuid("Valid verse ID is required."),
  noteText: z
    .string()
    .trim()
    .min(1, "Personal note cannot be empty.")
    .max(4000, "Personal note must be 4000 characters or fewer."),
});

export const readingHistoryInputSchema = z.object({
  verseId: z.uuid("Valid verse ID is required."),
});

export const collectionCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Collection title is required.")
    .max(120, "Collection title must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export const collectionUpdateSchema = z.object({
  id: z.uuid("Valid collection ID is required."),
  title: z
    .string()
    .trim()
    .min(1, "Collection title is required.")
    .max(120, "Collection title must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export const collectionDeleteSchema = z.object({
  id: z.uuid("Valid collection ID is required."),
});

export const collectionItemInputSchema = z.object({
  collectionId: z.uuid("Valid collection ID is required."),
  verseId: z.uuid("Valid verse ID is required."),
  sortOrder: z.coerce.number().int().min(0).max(5000).optional().default(0),
});

export const collectionItemRemoveSchema = z.object({
  collectionId: z.uuid("Valid collection ID is required."),
  verseId: z.uuid("Valid verse ID is required."),
});

export const contentFeedbackInputSchema = z
  .object({
    verseId: z.uuid().nullable().optional(),
    translationId: z.uuid().nullable().optional(),
    explanationId: z.uuid().nullable().optional(),
    category: feedbackCategorySchema,
    message: z
      .string()
      .trim()
      .min(5, "Please describe the suggested correction in at least 5 characters.")
      .max(2000, "Message must be 2000 characters or fewer."),
  })
  .refine(
    (d) => Boolean(d.verseId || d.translationId || d.explanationId),
    "Please attach a verse, translation, or explanation reference."
  );

// --- Admin Content Management Schemas ---

export const contentSourceAdminSchema = z.object({
  id: z.uuid().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]{2,64}[a-z0-9]$/,
      "Slug must be 4–66 lowercase letters, numbers, or hyphens."
    ),
  title: z
    .string()
    .trim()
    .min(2, "Source title must be at least 2 characters.")
    .max(160, "Source title must be 160 characters or fewer."),
  authorOrTranslator: z
    .string()
    .trim()
    .min(2, "Translator or author name is required.")
    .max(160, "Translator or author name must be 160 characters or fewer."),
  traditionOrLineage: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  licenseName: z
    .string()
    .trim()
    .min(2, "License information (e.g., Public Domain, CC BY-SA 4.0) is required.")
    .max(160),
  licenseUrl: optionalHttpUrlSchema,
  attributionText: z
    .string()
    .trim()
    .min(4, "Attribution text is required for every scripture source.")
    .max(600),
  sourceUrl: optionalHttpUrlSchema,
  reviewStatus: contentReviewStatusSchema.default("pending_review"),
});

export const chapterAdminSchema = z.object({
  chapterNumber: chapterNumberSchema,
  sanskritTitle: z.string().trim().min(1, "Sanskrit title is required.").max(200),
  transliterationTitle: z
    .string()
    .trim()
    .min(1, "IAST transliteration title is required.")
    .max(200),
  englishTitle: z.string().trim().min(1, "English title is required.").max(200),
  summary: z.string().trim().min(5, "Chapter description is required.").max(2500),
  verseCount: verseNumberSchema,
  themeTags: z
    .array(z.string().trim().min(1).max(48))
    .max(12)
    .optional()
    .default([]),
});

export const wordByWordEntrySchema = z.object({
  sanskrit: z.string().trim().min(1).max(160),
  transliteration: z.string().trim().max(160).optional().default(""),
  meaning: z.string().trim().min(1).max(400),
});

export const verseAdminSchema = z.object({
  id: z.uuid().optional(),
  chapterNumber: chapterNumberSchema,
  verseNumber: verseNumberSchema,
  sanskritDevanagari: z
    .string()
    .trim()
    .min(3, "Original Devanāgarī Sanskrit text is required.")
    .max(3000),
  transliterationIast: z
    .string()
    .trim()
    .min(3, "IAST transliteration text is required.")
    .max(3000),
  wordByWord: z.array(wordByWordEntrySchema).max(80).nullable().optional(),
  sourceId: z.uuid().nullable().optional(),
  reviewStatus: contentReviewStatusSchema.default("pending_review"),
});

export const translationAdminSchema = z.object({
  id: z.uuid().optional(),
  verseId: z.uuid("Target verse ID is required."),
  sourceId: z.uuid("Attributed source & license record is required."),
  languageCode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,8}(-[a-z]{2,8})?$/, "Invalid language code.")
    .default("en"),
  translationText: z
    .string()
    .trim()
    .min(3, "Translation text is required.")
    .max(6000),
  isPrimary: z.boolean().optional().default(false),
  reviewStatus: contentReviewStatusSchema.default("pending_review"),
});

export const explanationAdminSchema = z
  .object({
    id: z.uuid().optional(),
    verseId: z.uuid("Target verse ID is required."),
    sourceId: z.uuid().nullable().optional(),
    title: z
      .string()
      .trim()
      .max(160)
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
    explanationText: z
      .string()
      .trim()
      .min(5, "Explanation text must be at least 5 characters.")
      .max(12000),
    isAiAssisted: z.boolean().default(false),
    humanReviewedConfirmed: z.boolean().optional().default(false),
    reviewStatus: contentReviewStatusSchema.default("pending_review"),
  })
  .refine(
    (d) => !(d.isAiAssisted && d.reviewStatus === "approved" && !d.humanReviewedConfirmed),
    {
      message:
        "AI-assisted commentary requires explicit human review confirmation before publishing.",
      path: ["humanReviewedConfirmed"],
    }
  );

export const adminDeleteIdSchema = z.object({
  id: z.uuid("Valid record ID is required."),
});

export const adminDeleteChapterSchema = z.object({
  chapterNumber: chapterNumberSchema,
});

export const feedbackResolutionSchema = z.object({
  id: z.uuid("Valid feedback ID is required."),
  status: feedbackStatusSchema,
  resolutionNotes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

