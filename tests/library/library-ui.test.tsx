import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { LibraryDirectoryView } from "@/components/library/library-directory-view";
import { LibraryDetailView } from "@/components/library/library-detail-view";
import { LibraryAdminStudio } from "@/components/library/library-admin-studio";
import type { LibraryResource } from "@/lib/library/domain";

const MOCK_RESOURCE: LibraryResource = {
  id: "lib-1",
  slug: "calm-japa-primer",
  title: "Quiet Foundations of Daily Japa",
  summary: "A calm non-sectarian guide to daily mantra meditation habits.",
  category: "chanting_guidance",
  resource_type: "chanting_guidance",
  body_markdown: "# Quiet Steadiness\n\nChant with steady attention.\n\n> Steadiness nourishes devotion.",
  media_url: null,
  poster_url: null,
  external_url: "https://example.org/verified-lecture",
  source_id: null,
  author_or_speaker: "Editorial Test Contributor",
  language_code: "en",
  estimated_minutes: 6,
  license_name: "CC BY 4.0",
  copyright_notice: "Verified test copyright statement.",
  attribution_text: "SMARAN Editorial Archive",
  is_original_content: false,
  is_archived: false,
  tags: ["japa", "clarity"],
  review_status: "approved",
  reviewed_by: "admin-1",
  reviewed_at: "2026-11-11T00:00:00Z",
  created_at: "2026-11-11T00:00:00Z",
  updated_at: "2026-11-11T00:00:00Z",
  source: null,
};

describe("Phase 9 Spiritual Library UI rendering & empty states", () => {
  it("renders honest empty state when no verified library resources exist", () => {
    const html = renderToStaticMarkup(
      <LibraryDirectoryView
        viewer={null}
        allResources={[]}
        filteredResources={[]}
        bookmarkedIds={[]}
        recentlyViewed={[]}
        categoryCounts={{}}
        availableTags={[]}
        activeFilters={{ q: "", savedOnly: false }}
      />
    );

    expect(html).toContain("Spiritual Library &amp; Learning Resources");
    expect(html).toContain("No Verified Library Resources Published Yet");
    expect(html).toContain("Bhagavad Gītā Study");
    expect(html).not.toContain("Library Studio");
  });

  it("renders directory filters, recently viewed, and detail view without unsafe iframe embeds", () => {
    const dirHtml = renderToStaticMarkup(
      <LibraryDirectoryView
        viewer={{
          userId: "u-1",
          email: "gopi@example.org",
          displayName: "Gopi",
          timezone: "UTC",
          isAdmin: false,
          adminRole: null,
        }}
        allResources={[MOCK_RESOURCE]}
        filteredResources={[MOCK_RESOURCE]}
        bookmarkedIds={["lib-1"]}
        recentlyViewed={[
          {
            id: 1,
            resource_id: "lib-1",
            viewed_at: "2026-11-11T09:00:00Z",
            resource: MOCK_RESOURCE,
          },
        ]}
        categoryCounts={{ chanting_guidance: 1 }}
        availableTags={["japa", "clarity"]}
        activeFilters={{ q: "", savedOnly: false }}
      />
    );
    expect(dirHtml).toContain("Quiet Foundations of Daily Japa");
    expect(dirHtml).toContain("Recently Viewed");
    expect(dirHtml).toContain("Saved");

    const detailHtml = renderToStaticMarkup(
      <LibraryDetailView
        viewer={null}
        resource={MOCK_RESOURCE}
        relatedResources={[]}
        initialBookmarked={false}
        lastViewedAt={null}
      />
    );

    expect(detailHtml).toContain("Quiet Steadiness");
    expect(detailHtml).toContain("Steadiness nourishes devotion.");
    expect(detailHtml).toContain("Open on example.org");
    expect(detailHtml).toContain('rel="noopener noreferrer"');
    expect(detailHtml).not.toContain("<iframe");
    expect(detailHtml).toContain("Provenance &amp; Permissions");
    expect(detailHtml).toContain("CC BY 4.0");
  });

  it("renders LibraryAdminStudio with publish, unpublish, and archive controls", () => {
    const html = renderToStaticMarkup(
      <LibraryAdminStudio
        viewer={{
          userId: "admin-1",
          email: "admin@example.org",
          displayName: "Admin",
          timezone: "UTC",
          isAdmin: true,
          adminRole: "scripture_admin",
        }}
        resources={[MOCK_RESOURCE]}
        sources={[]}
        auditLogs={[]}
      />
    );

    expect(html).toContain("Manage Spiritual Library Resources");
    expect(html).toContain("Unpublish");
    expect(html).toContain("Archive");
  });
});

