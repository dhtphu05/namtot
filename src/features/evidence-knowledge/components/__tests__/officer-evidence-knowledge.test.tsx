import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

describe("officer evidence knowledge workspace", () => {
  it("adds one officer navigation entry and route guard without shell redesign", () => {
    const sidebar = read("src/components/layout/Sidebar.tsx");
    const guard = read("src/features/auth/route-guard.ts");
    const route = read("src/routes/app.evidence-knowledge.tsx");

    assert.equal((sidebar.match(/to: "\/app\/evidence-knowledge"/g) ?? []).length, 1);
    assert.match(sidebar, /label: "Kho tiền lệ"/);
    assert.match(sidebar, /to: "\/app\/evidence-knowledge"/);
    assert.match(guard, /"\/app\/evidence-knowledge"/);
    assert.match(
      guard,
      /if \(matchesAny\(pathname, officerRoutes\)\) return reviewRoles\.includes\(role\)/,
    );
    assert.match(route, /createFileRoute\("\/app\/evidence-knowledge"\)/);
    assert.match(route, /requireAuthenticatedAppRoute\(location\.pathname, context\.queryClient\)/);
    assert.match(sidebar, /role === "student"[\s\S]*: "flex w-\[264px\]"/);
  });

  it("does not paint or query officer knowledge for student role state", () => {
    const page = read(
      "src/features/evidence-knowledge/components/OfficerEvidenceKnowledgePage.tsx",
    );

    assert.match(page, /user\?\.role === "officer"/);
    assert.match(page, /user\?\.role === "manager"/);
    assert.match(page, /user\?\.role === "committee"/);
    assert.match(page, /user\?\.role === "admin"/);
    assert.match(page, /useOfficerEvidenceKnowledgeSearch\(filters, canViewOfficerKnowledge\)/);
    assert.match(page, /canViewOfficerKnowledge && Boolean\(selected\?\.eventId\)/);
    assert.match(page, /if \(!canViewOfficerKnowledge\) \{\s*return null;\s*\}/);
  });

  it("uses the approved backend endpoints and preserves Event Registry as a separate flow", () => {
    const api = read("src/features/evidence-knowledge/api/evidence-knowledge.ts");
    const registryRoute = read("src/routes/app.event-registry.tsx");

    assert.match(api, /\/api\/evidence-knowledge\/officer\/search/);
    assert.match(api, /\/api\/evidence-knowledge\/officer\/events\/\$\{eventId\}/);
    assert.doesNotMatch(api, /\/api\/events/);
    assert.match(registryRoute, /createFileRoute\("\/app\/event-registry"\)/);
  });

  it("locks the officer two-pane layout and compact event rows", () => {
    const page = read(
      "src/features/evidence-knowledge/components/OfficerEvidenceKnowledgePage.tsx",
    );
    const list = read("src/features/evidence-knowledge/components/OfficerEventList.tsx");
    const workspace = read("src/features/evidence-knowledge/components/OfficerEventWorkspace.tsx");

    assert.match(page, /title="Kho minh chứng chuyên trách"/);
    assert.match(page, /showSearch=\{false\}/);
    assert.match(page, /h-11 min-w-0 flex-1/);
    assert.match(page, /border-r/);
    assert.match(page, /xl:grid-cols-\[340px_minmax\(0,1fr\)\]/);
    assert.doesNotMatch(page, /third|grid-cols-3|KPI|gradient|sparkle/i);
    assert.match(list, /h-\[72px\]/);
    assert.match(list, /divide-y divide-\[#E5E7EB\]/);
    assert.match(list, /w-\[3px\]/);
    assert.match(workspace, /getCriterionLabel\(detail\.criterion\)/);
    assert.match(workspace, /Hội đồng xác nhận/);
  });

  it("renders accepted-evidence gallery and protected wide detail dialog without personal data", () => {
    const gallery = read("src/features/evidence-knowledge/components/AcceptedEvidenceGallery.tsx");
    const sheet = read("src/features/evidence-knowledge/components/EvidencePrecedentSheet.tsx");

    assert.match(gallery, /minmax\(280px,340px\)/);
    assert.match(gallery, /aspect-video/);
    assert.match(gallery, /useSignedFileUrl/);
    assert.match(gallery, /object-contain/);
    assert.match(gallery, /Không tải được preview/);
    assert.doesNotMatch(gallery, /object-cover|shadow-lg|studentName|studentCode|reviewer/i);
    assert.match(sheet, /min\(1120px,92vw\)/);
    assert.match(sheet, /useSignedFileUrl/);
    assert.match(sheet, /object-contain/);
    assert.match(sheet, /Tổng quan/);
    assert.match(sheet, /Dữ liệu đọc từ minh chứng/);
    assert.match(sheet, /Lịch sử xử lý/);
    assert.match(sheet, /Thông tin cần đối chiếu/);
    assert.doesNotMatch(sheet, /studentName|studentCode|fullName|email|reviewer/i);
    assert.doesNotMatch(sheet, /Resolution Hub|Committee|raw provider|raw audit JSON/);
  });
});

describe("review precedent workflow", () => {
  it("loads precedent search when a review task opens", () => {
    const hooks = read("src/features/review/hooks/useReview.ts");
    const api = read("src/features/review/api/review.ts");
    const panel = read("src/features/review/components/ReviewDecisionPanel.tsx");

    assert.match(api, /\/api\/review\/tasks\/\$\{id\}\/precedents\/check/);
    assert.match(hooks, /useReviewTaskPrecedents/);
    assert.match(panel, /useReviewTaskPrecedents\(task\.id, canUsePrecedentSearch\(task\), 3\)/);
    assert.match(panel, /Đã tìm thấy tiền lệ phù hợp/);
  });

  it("keeps precedent actions explicit and free of confidence or AI wording", () => {
    const panel = read("src/features/review/components/ReviewDecisionPanel.tsx");
    const precedentPanel = panel.slice(
      panel.indexOf("function ReviewPrecedentPanel"),
      panel.indexOf("function ResolutionGuard"),
    );

    assert.match(precedentPanel, /Xem tiền lệ/);
    assert.match(precedentPanel, /Chấp nhận theo tiền lệ/);
    assert.match(panel, /precedentId: precedentRef\.precedentId/);
    assert.match(panel, /precedentEventId: precedent\.eventId/);
    assert.match(panel, /precedentEvidenceId: precedentRef\.precedentEvidenceId/);
    assert.doesNotMatch(precedentPanel, /confidence|percentage|AI recommendation|sparkle/i);
  });

  it("requires a business reason before continuing Hội đồng when a precedent exists", () => {
    const panel = read("src/features/review/components/ReviewDecisionPanel.tsx");

    assert.match(panel, /await precedentQuery\.refetch\(\)/);
    assert.match(panel, /Vui lòng chọn lý do vẫn chuyển Hội đồng/);
    assert.match(panel, /Vẫn chuyển Hội đồng/);
    assert.match(panel, /different_level/);
    assert.match(panel, /different_organizer/);
    assert.match(panel, /conflicting_information/);
    assert.match(panel, /other/);
    assert.match(panel, /Khác cấp xét/);
    assert.match(panel, /Khác đơn vị tổ chức/);
    assert.match(panel, /Thông tin minh chứng mâu thuẫn/);
    assert.match(panel, /Lý do khác/);
    assert.match(panel, /precedentId: guardPrecedentRef\?\.precedentId/);
    assert.match(panel, /precedentGuardViewed: Boolean\(guardPrecedent\)/);
    assert.match(panel, /precedentGuardReason/);
  });
});
