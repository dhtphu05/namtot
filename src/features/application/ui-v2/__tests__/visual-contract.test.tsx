import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AccessibleIconButton,
  ApplicationContextBar,
  ButtonV2,
  CriteriaNavigationRowV2,
  EvidenceCardV2,
  EvidenceGallery,
  OfficialDataTile,
  FiveCriteriaSpineV2,
  GuideSheetTriggerV2,
  InstitutionalLockup,
  StatusPillV2,
  buttonV2ClassName,
  criteriaNavigationRowV2ClassName,
  getEvidencePreviewKind,
  getStatusPillV2ClassName,
  mapStudentDisplayStatusToV2ProgressStatus,
  studentApplicationV2ProgressLabels,
} from "@/features/application/ui-v2/components";
import {
  getOptionalAchievementCopy,
  getSafeRequirementLabel,
  validateAcademicGpaValue,
  validateConductScoreValue,
} from "@/features/application/ui-v2/view-models/criterion-data";

describe("student application UI V2 visual contract", () => {
  it("maps the four progress statuses to stable Vietnamese labels and semantic classes", () => {
    assert.deepEqual(Object.values(studentApplicationV2ProgressLabels), [
      "Hoàn thành",
      "Đang chờ",
      "Cần bổ sung",
      "Chưa bắt đầu",
    ]);
    assert.match(getStatusPillV2ClassName("complete"), /--student-v2-progress-complete-bg/);
    assert.match(getStatusPillV2ClassName("waiting"), /--student-v2-progress-waiting-bg/);
    assert.match(getStatusPillV2ClassName("supplement"), /--student-v2-progress-supplement-bg/);
    assert.match(getStatusPillV2ClassName("not-started"), /--student-v2-progress-not-started-bg/);
  });

  it("maps presentation semantics display states into four V2 progress states", () => {
    assert.equal(mapStudentDisplayStatusToV2ProgressStatus("accepted"), "complete");
    assert.equal(mapStudentDisplayStatusToV2ProgressStatus("ready"), "complete");
    assert.equal(mapStudentDisplayStatusToV2ProgressStatus("under_review"), "waiting");
    assert.equal(mapStudentDisplayStatusToV2ProgressStatus("needs_verification"), "waiting");
    assert.equal(mapStudentDisplayStatusToV2ProgressStatus("resolution"), "waiting");
    assert.equal(mapStudentDisplayStatusToV2ProgressStatus("supplement_required"), "supplement");
    assert.equal(mapStudentDisplayStatusToV2ProgressStatus("rejected"), "not-started");
    assert.equal(mapStudentDisplayStatusToV2ProgressStatus(null), "not-started");
  });

  it("emits button variant classes from semantic tokens, not local hex colors", () => {
    const primary = buttonV2ClassName({ variant: "primary" });
    const secondary = buttonV2ClassName({ variant: "secondary" });
    const tertiary = buttonV2ClassName({ variant: "tertiary" });

    assert.match(primary, /--student-v2-primary-action-blue/);
    assert.match(secondary, /--student-v2-surface-selected/);
    assert.match(tertiary, /bg-transparent/);
    assert.doesNotMatch(`${primary} ${secondary} ${tertiary}`, /#[0-9a-f]{6}/i);
  });

  it("marks active criterion navigation rows with the selected surface and active marker", () => {
    const active = criteriaNavigationRowV2ClassName({ active: true });
    const inactive = criteriaNavigationRowV2ClassName({ active: false });

    assert.match(active, /border-l-\[var\(--student-v2-institutional-blue\)\]/);
    assert.match(active, /--student-v2-surface-selected/);
    assert.match(inactive, /border-l-transparent/);
    assert.match(inactive, /--student-v2-surface-hover/);
  });

  it("renders accessible labels for guide and evidence opening controls", () => {
    const guide = renderToStaticMarkup(
      <GuideSheetTriggerV2 criterionName="Đạo đức tốt" onClick={() => undefined} />,
    );
    const evidence = renderToStaticMarkup(
      <EvidenceCardV2
        title="Giấy chứng nhận"
        metadata="PDF"
        status="waiting"
        preview={{ kind: "document" }}
      />,
    );
    const iconButton = renderToStaticMarkup(
      <AccessibleIconButton label="Mở trung tâm hỗ trợ">
        <span aria-hidden="true">?</span>
      </AccessibleIconButton>,
    );

    assert.match(guide, /aria-label="Xem điều kiện cho tiêu chí Đạo đức tốt"/);
    assert.match(evidence, /aria-label="Xem minh chứng Giấy chứng nhận"/);
    assert.match(iconButton, /aria-label="Mở trung tâm hỗ trợ"/);
    assert.match(iconButton, /focus-visible:ring-2/);
  });

  it("renders neutral institutional fallback while workspace data is missing", () => {
    const lockup = renderToStaticMarkup(<InstitutionalLockup />);
    const context = renderToStaticMarkup(<ApplicationContextBar />);

    assert.match(lockup, /HỘI SINH VIÊN VIỆT NAM/);
    assert.match(lockup, /Đơn vị triển khai/);
    assert.match(context, /Đơn vị đang tải/);
    assert.match(context, /Thông tin đơn vị sẽ hiển thị khi tải xong/);
  });

  it("keeps long workspace names visible and wrapped instead of truncated", () => {
    const longName = "Trường Đại học Công nghệ, Kỹ thuật và Đổi mới sáng tạo khu vực miền Trung";
    const html = renderToStaticMarkup(<InstitutionalLockup workspaceName={longName} />);

    assert.match(html, new RegExp(longName));
    assert.match(html, /\[overflow-wrap:anywhere\]/);
    assert.doesNotMatch(html, /\btruncate\b/);
  });

  it("renders keyboard-focusable utility links in the application context bar", () => {
    const html = renderToStaticMarkup(
      <ApplicationContextBar workspaceName="Trường kiểm thử" schoolYear="2025-2026" />,
    );

    assert.match(html, /Quy định áp dụng/);
    assert.match(html, /Trung tâm hỗ trợ/);
    assert.match(html, /Thông tin hệ thống/);
    assert.match(html, /min-h-11/);
    assert.match(html, /focus-visible:ring-2/);
  });

  it("maps evidence preview types according to the V2 presentation contract", () => {
    assert.equal(getEvidencePreviewKind({ mimeType: "application/pdf" }), "document");
    assert.equal(
      getEvidencePreviewKind({
        mimeType: "image/jpeg",
        evidenceName: "Ảnh hoạt động tình nguyện",
      }),
      "photo",
    );
    assert.equal(getEvidencePreviewKind({ mimeType: "image/jpeg" }), "unknown");
    assert.equal(getEvidencePreviewKind({ sourceType: "event_import" }), "official_data");
    assert.equal(getEvidencePreviewKind({ isOfficialData: true }), "official_data");
    assert.equal(getEvidencePreviewKind({ isLoading: true }), "loading");
    assert.equal(getEvidencePreviewKind({ isFailed: true }), "failed");
  });

  it("renders evidence gallery thumbnails with document contain and photo cover rules", () => {
    const documentCard = renderToStaticMarkup(
      <EvidenceCardV2
        title="Bảng điểm"
        metadata="PDF"
        status="waiting"
        preview={{ kind: "document", src: "/thumb/transcript.png" }}
      />,
    );
    const photoCard = renderToStaticMarkup(
      <EvidenceCardV2
        title="Ảnh hoạt động"
        metadata="JPG"
        status="complete"
        preview={{ kind: "photo", src: "/thumb/activity.jpg" }}
      />,
    );
    const unknownCard = renderToStaticMarkup(
      <EvidenceCardV2
        title="Minh chứng khác"
        metadata="JPG"
        status="waiting"
        preview={{ kind: "unknown", src: "/thumb/unknown.jpg" }}
      />,
    );

    assert.match(documentCard, /object-contain/);
    assert.doesNotMatch(documentCard, /object-cover/);
    assert.match(photoCard, /object-cover/);
    assert.match(unknownCard, /Minh chứng/);
    assert.doesNotMatch(unknownCard, /object-cover/);
  });

  it("renders official data as a tile without source file identifiers", () => {
    const html = renderToStaticMarkup(
      <OfficialDataTile
        sourceLabel="Dữ liệu chính thức"
        eventTitle="Ngày hội sinh viên"
        recordedValue="5 ngày"
      />,
    );

    assert.match(html, /Dữ liệu chính thức/);
    assert.match(html, /Ngày hội sinh viên/);
    assert.match(html, /5 ngày/);
    assert.doesNotMatch(html, /sourceFileId|signedUrl|staff/i);
  });

  it("keeps thumbnail cards accessible and preview-opening without requesting signed URLs", () => {
    const html = renderToStaticMarkup(
      <EvidenceGallery>
        <EvidenceCardV2
          title="Giấy xác nhận"
          metadata="PDF"
          status="waiting"
          preview={{ kind: "document" }}
          actionItems={[{ label: "Xem minh chứng", onSelect: () => undefined }]}
        />
      </EvidenceGallery>,
    );
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );

    assert.match(html, /aria-label="Xem minh chứng Giấy xác nhận"/);
    assert.match(html, /aria-label="Thao tác với minh chứng Giấy xác nhận"/);
    assert.match(html, /sm:grid-cols-2/);
    assert.match(html, /xl:grid-cols-3/);
    assert.doesNotMatch(source, /src: file\?\.publicUrl|src: file\?\.url|getSignedFileUrl/);
  });

  it("renders status pills and criterion rows without criterion-specific colors", () => {
    const html = renderToStaticMarkup(
      <>
        <ButtonV2 variant="primary">Nộp hồ sơ</ButtonV2>
        <StatusPillV2 status="complete" />
        <CriteriaNavigationRowV2
          number="01"
          title="Đạo đức tốt"
          status="complete"
          active
          detail="Đã có dữ liệu"
        />
      </>,
    );

    assert.match(html, /Hoàn thành/);
    assert.match(html, /aria-current="step"/);
    assert.doesNotMatch(html, /ethics|academic|physical|volunteer|integration/);
  });

  it("renders the criteria spine as one grouped five-segment surface", () => {
    const html = renderToStaticMarkup(
      <FiveCriteriaSpineV2
        items={[
          { key: "ethics", number: "01", title: "Đạo đức tốt", status: "waiting" },
          { key: "academic", number: "02", title: "Học tập tốt", status: "not-started" },
          { key: "physical", number: "03", title: "Thể lực tốt", status: "complete" },
          { key: "volunteer", number: "04", title: "Tình nguyện tốt", status: "supplement" },
          { key: "integration", number: "05", title: "Hội nhập tốt", status: "waiting" },
        ]}
      />,
    );

    assert.match(html, /lg:grid-cols-5/);
    assert.match(html, /min-w-\[150px\]/);
    assert.match(html, /min-h-\[104px\]/);
    assert.doesNotMatch(html, /grid-cols-5 gap-/);
    assert.doesNotMatch(html, /shadow-/);
  });

  it("keeps the application workspace V2 on the fixed two-column contract", () => {
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );

    assert.match(source, /lg:grid-cols-\[232px_minmax\(0,1fr\)\]/);
    assert.match(source, /top-6/);
    assert.match(source, /StickyNextActionBarV2/);
    assert.match(source, /max-w-\[420px\]/);
    assert.doesNotMatch(source, /grid-cols-\[232px_minmax\(0,1fr\)_/);
    assert.doesNotMatch(source, /QuickGuidePanel/);
  });

  it("uses the provided Hội Sinh viên emblem in the student V2 sidebar only", () => {
    const source = readFileSync("src/components/layout/Sidebar.tsx", "utf8");

    assert.match(source, /hsvvn-emblem\.webp/);
    assert.match(source, /StudentV2Lockup/);
    assert.match(source, /w-\[296px\]/);
    assert.match(source, /whitespace-nowrap/);
    assert.match(source, /user\?\.studentCode/);
    assert.match(source, /user\?\.faculty/);
    assert.match(source, /user\?\.className/);
  });

  it("validates conduct score and GPA according to the selected scale", () => {
    assert.equal(validateConductScoreValue("87"), null);
    assert.match(validateConductScoreValue("101") ?? "", /0-100/);
    assert.equal(validateAcademicGpaValue("3.8", 4), null);
    assert.match(validateAcademicGpaValue("4.2", 4) ?? "", /0-4/);
    assert.equal(validateAcademicGpaValue("8.5", 10), null);
    assert.match(validateAcademicGpaValue("10.5", 10) ?? "", /0-10/);
  });

  it("keeps conduct violation verification passive for students", () => {
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );

    assert.match(source, /noViolationPassiveCopy/);
    assert.match(source, /Sinh viên không tự xác minh mục này/);
    assert.doesNotMatch(source, /confirmViolation|verifyNoViolation|onConfirmViolation/);
  });

  it("keeps ethics and academic edit forms closed until action and closes only after save success", () => {
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );

    assert.match(source, /const \[formOpen, setFormOpen\] = useState\(false\)/);
    assert.match(source, /const saved = await onSaveMetric\(\)/);
    assert.match(source, /if \(saved\) \{\s*setFormOpen\(false\)/);
  });

  it("renders optional achievement copy and never exposes raw achievement enum keys", () => {
    assert.equal(getOptionalAchievementCopy({ optional: true }), "Không bắt buộc ở cấp hiện tại");
    assert.equal(
      getOptionalAchievementCopy({ optional: false }),
      "Cần bổ sung theo cấu hình hiện tại",
    );
    assert.equal(
      getSafeRequirementLabel({ key: "student_research", title: "student_research" }),
      "Nghiên cứu khoa học",
    );
    assert.equal(
      getSafeRequirementLabel({ key: "journal_article", title: "journal_article" }),
      "Bài báo khoa học",
    );
    assert.doesNotMatch(
      getSafeRequirementLabel({ key: "unknown_raw_key", title: "unknown_raw_key" }),
      /unknown_raw_key|_/,
    );
  });

  it("implements physical one_of path selection without default open forms or raw path badges", () => {
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );

    assert.match(source, /PhysicalDataSectionV2/);
    assert.match(source, /PathSelectionSurfaceV2/);
    assert.match(source, /Đổi hình thức/);
    assert.match(source, /confirmUnsavedPathChange/);
    assert.match(source, /setCourseFormOpen\(false\)/);
    assert.doesNotMatch(source, /Chưa có["'`]\s*\}\s*<\/StatusPillV2>/);
  });

  it("uses volunteer backend aggregation and does not perform frontend conversion", () => {
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );

    assert.match(source, /aggregation\?\.verifiedTotal/);
    assert.match(source, /aggregation\?\.pendingVerificationTotal/);
    assert.match(source, /aggregation\?\.threshold/);
    assert.match(source, /aggregation\?\.unit/);
    assert.match(source, /VolunteerLedgerV2/);
    assert.doesNotMatch(source, /conversionRate|convertVolunteer|frontend conversion/i);
  });

  it("keeps volunteer add-activity form closed by default and preserves input on failure", () => {
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );

    assert.match(source, /const \[formOpen, setFormOpen\] = useState\(false\)/);
    assert.match(source, /Thêm hoạt động/);
    assert.match(source, /await onAddActivity/);
    assert.match(source, /catch \(error\) \{\s*toast\.error/);
  });

  it("derives integration paths dynamically and preserves unknown backend keys", () => {
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );
    const hookSource = readFileSync("src/features/application/hooks/useApplication.ts", "utf8");
    const apiSource = readFileSync("src/features/application/api/application.ts", "utf8");

    assert.match(source, /IntegrationDataSectionV2/);
    assert.match(source, /getPathRequirements\(completion, "integration_path"\)/);
    assert.match(source, /unknownLabel="Hình thức khác"/);
    assert.match(source, /requirementKey: selectedPath\.key/);
    assert.doesNotMatch(source, /selectedPathKey.*foreign_language/);
    assert.match(hookSource, /requirementKey: string/);
    assert.match(apiSource, /requirementKey: string/);
  });

  it("renders integration dynamic fields from schema and keeps official event action path-scoped", () => {
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );

    assert.match(source, /getFormFields\(selectedPath\)/);
    assert.match(source, /DynamicFieldInputV2/);
    assert.match(source, /getRequirementFieldLabel\(field\)/);
    assert.match(source, /selectedPath\.acceptedSources\?\.includes\("official_event"\)/);
    assert.match(source, /selectedCriterion !== "physical"/);
    assert.match(source, /selectedCriterion !== "integration"/);
  });

  it("hides mutation actions when readonly or supplement lock makes the criterion non-editable", () => {
    const source = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );

    assert.match(source, /disabled=\{!canEdit/);
    assert.match(source, /canEdit \? \(/);
    assert.match(source, /canEditSelectedCriterion/);
    assert.match(source, /isSelectedLocked/);
  });

  it("keeps official library imports scoped without page reload or auto-accepting criteria", () => {
    const workspaceSource = readFileSync(
      "src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx",
      "utf8",
    );
    const librarySource = readFileSync(
      "src/features/event/components/OfficialEventLibraryStudent.tsx",
      "utf8",
    );
    const hookSource = readFileSync(
      "src/features/event/hooks/useApprovedEvidenceSearch.ts",
      "utf8",
    );

    assert.match(workspaceSource, /<OfficialEventLibraryDialog/);
    assert.match(workspaceSource, /applicationId=\{application\.id\}/);
    assert.match(workspaceSource, /criterion=\{selectedCriterion\}/);
    assert.match(workspaceSource, /hideCriterionFilters/);
    assert.match(librarySource, /setFilter\(criterion \?\? "all"\)/);
    assert.match(
      librarySource,
      /const fallbackCriterion = selectedItem\?\.criterion \?\? criterion/,
    );
    assert.match(hookSource, /invalidateQueries/);
    assert.doesNotMatch(hookSource, /queryClient\.clear|window\.location|reload|accepted/);
  });

  it("renders feedback as an inbox without duplicating overview next actions", () => {
    const source = readFileSync("src/features/notifications/components/Notifications.tsx", "utf8");

    assert.match(source, /type StudentFeedbackTab = "action" \| "handled" \| "all"/);
    assert.match(source, /role="tablist"/);
    assert.match(source, /aria-selected=\{active\}/);
    assert.match(source, /Cần xử lý/);
    assert.match(source, /Đã xử lý/);
    assert.match(source, /Tất cả/);
    assert.match(source, /function FeedbackRow/);
    assert.match(source, /getFeedbackSourceLabel/);
    assert.match(source, /formatFeedbackTimestamp/);
    assert.match(source, /function FeedbackPagination/);
    assert.doesNotMatch(source, /Quay lại hồ sơ/);
    assert.doesNotMatch(source, /getNextActions/);
  });

  it("uses V2 status semantics in student feedback rows", () => {
    const source = readFileSync("src/features/notifications/components/Notifications.tsx", "utf8");

    assert.match(source, /StatusPillV2/);
    assert.match(source, /StudentApplicationV2ProgressStatus/);
    assert.match(source, /if \(item\.isActionable\) return "supplement"/);
    assert.match(source, /if \(item\.status === "read"\) return "complete"/);
    assert.match(source, /return "waiting"/);
  });

  it("rolls back optimistic mark-read updates when the notification patch fails", () => {
    const source = readFileSync("src/features/notifications/hooks/useNotifications.ts", "utf8");

    assert.match(source, /onMutate: async \(notificationId\)/);
    assert.match(source, /getQueriesData<Notification\[\]>/);
    assert.match(source, /setQueriesData<Notification\[\]>/);
    assert.match(source, /return \{ previous \}/);
    assert.match(source, /onError: \(_error, _notificationId, context\)/);
    assert.match(source, /queryClient\.setQueryData\(queryKey, data\)/);
  });

  it("keeps the assistant composer mounted and reachable in a fixed messaging layout", () => {
    const source = readFileSync("src/features/chatbot/components/SmartbotPanel.tsx", "utf8");

    assert.match(source, /h-\[calc\(100vh-128px\)\]/);
    assert.match(source, /role="log"/);
    assert.match(source, /aria-live=\{isStreaming \? "off" : "polite"\}/);
    assert.match(source, /className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5"/);
    assert.match(source, /<form/);
    assert.match(source, /sticky bottom-0/);
    assert.match(source, /htmlFor=\{composerId\}/);
    assert.match(source, /min-h-11 min-w-11/);
  });

  it("preserves assistant streaming, fallback and rendered conversation on stream errors", () => {
    const source = readFileSync("src/features/chatbot/components/SmartbotPanel.tsx", "utf8");

    assert.match(source, /streamChatbotMessage\(payload/);
    assert.match(source, /onMeta/);
    assert.match(source, /onDelta/);
    assert.match(source, /onCard/);
    assert.match(source, /onFinal/);
    assert.match(source, /chatbotApi\.sendMessage\(payload\)/);
    assert.match(source, /setError\(err instanceof Error/);
    assert.doesNotMatch(source, /setMessages\(\[\]\)/);
  });

  it("collapses assistant quick suggestions after conversation begins and keeps mobile scroll", () => {
    const source = readFileSync("src/features/chatbot/components/SmartbotPanel.tsx", "utf8");

    assert.match(source, /hasConversationStarted = messages\.some/);
    assert.match(source, /!\{?hasConversationStarted\}?/);
    assert.match(source, /overflow-x-auto/);
    assert.match(source, /shrink-0/);
    assert.match(source, /data-assistant-quick-suggestions="mobile-scroll"/);
  });

  it("states that assistant guidance is contextual and official decisions remain human-owned", () => {
    const source = readFileSync("src/features/core/components/StudentSupport.tsx", "utf8");

    assert.match(source, /quy định/);
    assert.match(source, /ngữ cảnh hồ sơ hiện tại/);
    assert.match(source, /Quyết định chính thức/);
    assert.match(source, /cán bộ hoặc Hội đồng/);
  });

  it("keeps visible student AI surfaces on V2 without restoring generic Smartbot route", () => {
    const overviewSource = readFileSync(
      "src/features/application/ui-v2/StudentOverviewV2.tsx",
      "utf8",
    );
    const supportSource = readFileSync("src/features/core/components/StudentSupport.tsx", "utf8");
    const evidenceCardSource = readFileSync(
      "src/features/evidence/components/EvidenceCardPanel.tsx",
      "utf8",
    );

    assert.match(overviewSource, /Trợ lý theo hồ sơ/);
    assert.match(overviewSource, /Gợi ý theo tiến độ/);
    assert.match(overviewSource, /AI có thể đọc minh chứng/);
    assert.match(supportSource, /StudentAssistantExplanation/);
    assert.doesNotMatch(supportSource, /SmartbotPanel/);
    assert.match(evidenceCardSource, /AI tiền kiểm minh chứng/);
    assert.doesNotMatch(evidenceCardSource, /SmartReader gợi ý/);
  });
});
