import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const pageSource = () =>
  readFileSync("src/features/event/components/ApprovedEvidencePage.tsx", "utf8");
const librarySource = () =>
  readFileSync("src/features/event/components/OfficialEventLibraryStudent.tsx", "utf8");
const drawerSource = () =>
  readFileSync("src/features/evidence/components/AddEvidenceDrawer.tsx", "utf8");
const sidebarSource = () => readFileSync("src/components/layout/Sidebar.tsx", "utf8");
const navigationSource = () => readFileSync("src/lib/role-navigation.ts", "utf8");
const studentShellSource = () => readFileSync("src/components/layout/StudentAppShell.tsx", "utf8");
const routeGuardSource = () => readFileSync("src/features/auth/route-guard.ts", "utf8");
const referenceLibrarySource = () => {
  const source = librarySource();
  const start = source.indexOf("const referenceCriterionOptions");
  const end = source.indexOf("export function OfficialEventLibraryBrowser");
  return source.slice(start, end);
};

describe("student evidence reference library", () => {
  it("renders the required page identity and single primary page action", () => {
    const source = pageSource();

    assert.match(source, /title="Kho minh chứng"/);
    assert.match(source, /rightAction=\{/);
    assert.match(source, />\s*Thêm minh chứng\s*<\/Button>/);
    assert.match(source, /Trang này giúp bạn tham khảo tên hoạt động đã từng được chấp nhận/);
    assert.doesNotMatch(source, /hero|illustration|KPI|gradient/i);
  });

  it("keeps one debounced search input with examples and stale-request cancellation", () => {
    const source = referenceLibrarySource();
    const hookSource = readFileSync(
      "src/features/event/hooks/useApprovedEvidenceSearch.ts",
      "utf8",
    );
    const eventApiSource = readFileSync("src/features/event/api/events.ts", "utf8");
    const apiClientSource = readFileSync("src/lib/api/client.ts", "utf8");

    assert.match(source, /placeholder="Tìm theo tên sự kiện hoặc tên viết tắt\.\.\."/);
    assert.match(source, /Mùa hè xanh, MHX 2025, hiến máu, NCKH/);
    assert.match(source, /useDebouncedValue\(search, 280\)/);
    assert.match(source, /projection: "reference"/);
    assert.match(source, /min-h-11 w-full/);
    assert.doesNotMatch(source, /sparkle|confidence|AI label|technical/i);
    assert.match(hookSource, /queryFn: async \(\{ signal \}\)/);
    assert.match(eventApiSource, /options\?: \{ signal\?: AbortSignal \}/);
    assert.match(eventApiSource, /signal: options\?\.signal/);
    assert.match(apiClientSource, /isAbortError/);
  });

  it("preserves search and filter in compatible route search params", () => {
    const source = pageSource();
    const routeSource = readFileSync("src/routes/app.event-library.tsx", "utf8");

    assert.match(routeSource, /q: typeof search\.q === "string"/);
    assert.match(routeSource, /criterion: typeof search\.criterion === "string"/);
    assert.match(source, /replace: true/);
    assert.match(source, /q: nextSearch\.trim\(\) \|\| undefined/);
    assert.match(source, /criterion: nextCriterion === "all" \? undefined : nextCriterion/);
  });

  it("renders compact all plus 01-05 official criterion filters without five large cards", () => {
    const source = referenceLibrarySource();

    assert.match(source, /referenceCriterionOptions/);
    assert.match(source, /value: "all",\s*number: "00",\s*label: "Tất cả"/);
    assert.match(source, /value: "ethics", number: "01", label: getCoreCriterionLabel\("ethics"\)/);
    assert.match(
      source,
      /value: "academic", number: "02", label: getCoreCriterionLabel\("academic"\)/,
    );
    assert.match(
      source,
      /value: "physical", number: "03", label: getCoreCriterionLabel\("physical"\)/,
    );
    assert.match(
      source,
      /value: "volunteer", number: "04", label: getCoreCriterionLabel\("volunteer"\)/,
    );
    assert.match(
      source,
      /value: "integration", number: "05", label: getCoreCriterionLabel\("integration"\)/,
    );
    assert.match(source, /role="tablist"/);
    assert.match(source, /overflow-x-auto/);
    assert.match(source, /min-h-11/);
    assert.doesNotMatch(source, /grid-cols-5|criterion-specific|emerald|amber/);
  });

  it("uses compact grouped ReferenceEventTile rows with safe usage metadata", () => {
    const source = referenceLibrarySource();

    assert.match(source, /function ReferenceEventTile/);
    assert.match(source, /"eventId" \| "title" \| "criterion" \| "approvedUsageCount"/);
    assert.match(source, /eventId: item\.eventId/);
    assert.match(source, /title: item\.title/);
    assert.match(source, /approvedUsageCount: item\.approvedUsageCount \?\? 0/);
    assert.match(source, /h-\[64px\]/);
    assert.match(source, /line-clamp-2/);
    assert.match(source, /rounded-md border border-slate-200 bg-white/);
    assert.match(source, /ChevronRight/);
    assert.match(source, /lượt đã được duyệt/);
    assert.match(source, /focus-visible:ring-2/);
    assert.doesNotMatch(
      source,
      /item\.organizer|item\.organizerLevel|item\.state|approvalSource|ocr|reviewer|confidence/i,
    );
  });

  it("adds the student navigation entry and keeps route guard ownership", () => {
    const sidebar = sidebarSource();
    const navigation = navigationSource();
    const shell = studentShellSource();
    const guard = routeGuardSource();

    assert.equal((navigation.match(/to: "\/app\/event-library"/g) ?? []).length, 1);
    assert.match(
      navigation,
      /label: "Kho minh chứng", to: "\/app\/event-library", icon: "knowledge"/,
    );
    assert.match(sidebar, /getRoleNavigation\(/);
    assert.match(sidebar, /return "\/app\/event-library"/);
    assert.match(shell, /label: "Kho minh chứng", to: "\/app\/event-library", icon: BookOpenCheck/);
    assert.match(shell, /grid grid-cols-5 gap-1/);
    assert.match(shell, /return "\/app\/event-library"/);
    assert.match(
      guard,
      /const studentEvidenceRoutes = \["\/app\/evidence", "\/app\/event-library"\]/,
    );
    assert.match(guard, /return role === "student"/);
  });

  it("opens the existing Add Evidence modal with canonical reference prefill and autocomplete", () => {
    const page = pageSource();
    const drawer = drawerSource();

    assert.match(page, /<AddEvidenceDrawer/);
    assert.match(page, /eventId: referenceEvent\.eventId/);
    assert.match(page, /title: referenceEvent\.title/);
    assert.match(page, /criterion: referenceEvent\.criterion \?\? selectedCriterion/);
    assert.match(page, /approvedUsageCount: referenceEvent\.approvedUsageCount \?\? 0/);
    assert.match(page, /initialCriterion=\{selectedCriterion\}/);
    assert.match(page, /initialEvidenceName=\{referenceEvent\?\.title \?\? ""\}/);
    assert.match(page, /submitLabel="Thêm vào hồ sơ"/);
    assert.match(drawer, /DialogContent/);
    assert.match(drawer, /useOfficialEventLibrary/);
    assert.match(drawer, /selectedReferenceEvent\?\.eventId/);
    assert.match(drawer, /referenceEventId: selectedReferenceEvent\.eventId/);
    assert.match(drawer, /referenceEventTitle: selectedReferenceEvent\.title/);
    assert.match(drawer, /student_reference_library/);
    assert.match(drawer, /Bạn vẫn cần tải file minh chứng của mình/);
    assert.match(drawer, /Ghi chú cho cán bộ/);
    assert.match(drawer, /Thay file/);
    assert.match(drawer, /Xóa file/);
    assert.doesNotMatch(page, /Import minh chứng/);
  });

  it("keeps loading, empty, error, keyboard and mobile geometry compact", () => {
    const page = pageSource();
    const source = referenceLibrarySource();

    assert.match(page, /function ReferencePageSkeleton/);
    assert.match(page, /h-11 w-full/);
    assert.match(source, /function ReferenceEventSkeleton/);
    assert.match(source, /h-\[64px\]/);
    assert.match(source, /function ReferenceEventEmpty/);
    assert.match(source, /Không tìm thấy sự kiện phù hợp/);
    assert.match(source, /function ReferenceEventError/);
    assert.match(source, /Chưa tải được kho minh chứng/);
    assert.match(source, /aria-label="Xóa tìm kiếm"/);
    assert.match(page, /StudentPageShell className="px-4 md:px-6"/);
    assert.doesNotMatch(
      `${page}${source}`,
      /document-level horizontal overflow|nested cards|large icon/i,
    );
  });
});
