import { z } from "zod";
import { contentReviewStatusSchema } from "@/lib/gita/validation";

export const LIBRARY_CATEGORIES = [
  "gita_learning",
  "krishna_literature",
  "chanting_guidance",
  "video_lecture",
  "devotional_article",
  "external_resource",
] as const;

export const LIBRARY_RESOURCE_TYPES = [
  "article",
  "video",
  "book",
  "external_link",
  "devotional_reading",
  "chanting_guidance",
  "study_guide",
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];
export type LibraryResourceType = (typeof LIBRARY_RESOURCE_TYPES)[number];

export const libraryCategorySchema = z.enum(LIBRARY_CATEGORIES);
export const libraryResourceTypeSchema = z.enum(LIBRARY_RESOURCE_TYPES);

const PRIVATE_OR_LOCAL_HOST_REGEX =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1\]|::1|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/i;

/**
 * Strictly validates external HTTP/HTTPS URLs and blocks javascript:/data:/SSRF hosts.
 */
export function validateSafeExternalUrl(raw: string):
  | { ok: true; normalized: string; hostname: string }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "URL is empty." };
  }
  if (trimmed.length > 1024) {
    return { ok: false, error: "URL must be 1024 characters or fewer." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid URL starting with https:// or http://." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only https:// or http:// URLs are permitted." };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "Embedded credentials in URLs are not permitted." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    PRIVATE_OR_LOCAL_HOST_REGEX.test(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return {
      ok: false,
      error: "Localhost or private network URLs are not permitted.",
    };
  }

  return { ok: true, normalized: parsed.toString(), hostname };
}

export function validateSafePosterUrl(raw: string):
  | { ok: true; normalized: string }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Poster URL is empty." };
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.length > 1024) {
      return { ok: false, error: "Poster path must be 1024 characters or fewer." };
    }
    return { ok: true, normalized: trimmed };
  }
  const external = validateSafeExternalUrl(trimmed);
  if (!external.ok) return external;
  return { ok: true, normalized: external.normalized };
}

const optionalSafeExternalUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))
  .superRefine((val, ctx) => {
    if (val === null) return;
    const res = validateSafeExternalUrl(val);
    if (!res.ok) {
      ctx.addIssue({ code: "custom", message: res.error });
    }
  });

const optionalSafePosterUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))
  .superRefine((val, ctx) => {
    if (val === null) return;
    const res = validateSafePosterUrl(val);
    if (!res.ok) {
      ctx.addIssue({ code: "custom", message: res.error });
    }
  });

export function slugifyLibraryTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  if (base.length >= 4) return base;
  return `resource-${base || "item"}`.slice(0, 72);
}

export const librarySearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120, "Search query must be 120 characters or fewer.")
    .optional()
    .default(""),
  category: z
    .union([z.literal(""), libraryCategorySchema])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  type: z
    .union([z.literal(""), libraryResourceTypeSchema])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  tag: z
    .string()
    .trim()
    .max(48)
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toLowerCase() : undefined)),
  saved: z
    .enum(["1", "true", "0", "false", ""])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export const libraryBookmarkInputSchema = z.object({
  resourceId: z.uuid("Valid library resource ID is required."),
});

export const libraryHistoryInputSchema = z.object({
  resourceId: z.uuid("Valid library resource ID is required."),
});

export const libraryResourceAdminSchema = z
  .object({
    id: z.uuid().optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9][a-z0-9-]{2,80}[a-z0-9]$/,
        "Slug must be 4–82 lowercase letters, numbers, or hyphens."
      ),
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters.")
      .max(160, "Title must be 160 characters or fewer."),
    summary: z
      .string()
      .trim()
      .min(5, "Description summary must be at least 5 characters.")
      .max(600, "Description summary must be 600 characters or fewer."),
    category: libraryCategorySchema,
    resourceType: libraryResourceTypeSchema,
    bodyMarkdown: z
      .string()
      .trim()
      .max(50000, "Article content must be 50,000 characters or fewer.")
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
    externalUrl: optionalSafeExternalUrlSchema,
    mediaUrl: optionalSafeExternalUrlSchema,
    posterUrl: optionalSafePosterUrlSchema,
    sourceId: z.uuid().nullable().optional(),
    authorOrSpeaker: z
      .string()
      .trim()
      .max(160)
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
    languageCode: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z]{2,8}(-[a-z]{2,8})?$/, "Invalid ISO language code.")
      .default("en"),
    estimatedMinutes: z
      .union([
        z.literal(""),
        z.null(),
        z.coerce.number().int().min(1).max(2400),
      ])
      .optional()
      .transform((v) =>
        v === "" || v === undefined || v === null ? null : v
      ),
    licenseName: z
      .string()
      .trim()
      .max(160)
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
    copyrightNotice: z
      .string()
      .trim()
      .max(600)
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
    attributionText: z
      .string()
      .trim()
      .max(600)
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
    isOriginalContent: z.boolean().default(false),
    isArchived: z.boolean().default(false),
    tags: z
      .array(z.string().trim().toLowerCase().min(1).max(40))
      .max(12)
      .optional()
      .default([]),
    reviewStatus: contentReviewStatusSchema.default("pending_review"),
  })
  .superRefine((d, ctx) => {
    if (
      (d.resourceType === "external_link" ||
        d.category === "external_resource") &&
      !d.externalUrl
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["externalUrl"],
        message: "External resources and links require a verified external URL.",
      });
    }

    if (d.reviewStatus === "approved") {
      if (!d.bodyMarkdown && !d.externalUrl && !d.mediaUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["bodyMarkdown"],
          message:
            "Published resources must provide reading content, media URL, or an approved external link.",
        });
      }

      if (
        !d.isOriginalContent &&
        !d.sourceId &&
        (!d.attributionText || !d.licenseName)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["attributionText"],
          message:
            "External or sourced material requires explicit license and attribution (or a linked content source) before publication.",
        });
      }
    }
  });

export const libraryResourceStatusSchema = z.object({
  id: z.uuid("Valid resource ID is required."),
  action: z.enum([
    "publish",
    "unpublish",
    "needs_correction",
    "archive",
    "unarchive",
  ]),
});

