import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  CopyPlus,
  Loader2,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CriterionIcon } from "@/components/AppIcon";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/store/auth-store";
import {
  isDuplicateDraftError,
  useArchiveCriteriaConfiguration,
  useCloneCriteriaDraft,
  useCriteriaConfiguration,
  usePublishCriteriaConfiguration,
  useSaveCriteriaConfiguration,
} from "../hooks";
import {
  CORE_CRITERION_SHORT_LABELS,
  getCriteriaInFixedOrder,
  hasExactlyFiveCoreCriteria,
} from "../criteria-model";
import {
  createOtherEvidence,
  createRule,
  createRuleGroup,
  deleteOtherEvidence,
  deleteRule,
  deleteRuleGroup,
  duplicateOtherEvidence,
  duplicateRule,
  duplicateRuleGroup,
  EDITOR_SECTION_KEYS,
  getCriterionRuleCount,
  getCriterionStateLabel,
  getGroupLogicSentence,
  getOtherEvidenceCount,
  getRuleSentence,
  GROUP_LOGIC_LABELS,
  hasMalformedOtherEvidence,
  isCoreEditorSection,
  moveOtherEvidencePurpose,
  moveRule,
  moveRuleGroup,
  moveRuleToGroup,
  normalizeEditorSection,
  OTHER_PURPOSE_LABELS,
  OTHER_SECTION_KEY,
  RULE_TYPE_DESCRIPTIONS,
  RULE_TYPE_LABELS,
  RULE_TYPE_ORDER,
  updateOtherEvidence,
  updateRule,
  updateRuleGroup,
  type EditorSectionKey,
  type OtherEvidenceInput,
  type RuleGroupInput,
  type RuleInput,
} from "../editor-model";
import {
  CORE_CRITERION_KEYS,
  DUT_COMMITTEE_REVIEW_LEVEL,
  DUT_COMMITTEE_UNIT_NAME,
  type CoreCriterionKey,
  type CriteriaConfiguration,
  type CriteriaConfigurationStatus,
  type CriterionRule,
  type CriterionRuleType,
  type OtherEvidenceGroup,
  type OtherEvidencePurpose,
  type OtherEvidenceType,
  type RuleGroup,
  type RuleGroupLogic,
} from "../types";
import {
  getBlockingValidationIssues,
  getWarningValidationIssues,
  validateCriteriaConfiguration,
  type CriteriaValidationIssue,
} from "../validation";
import { canManageCriteriaSettings } from "../permissions";

type CriteriaConfigurationEditorPageProps = {
  configurationId: string;
  section?: string;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type GroupDialogState = {
  mode: "create" | "edit";
  criterionKey: CoreCriterionKey;
  group?: RuleGroup;
} | null;

type RuleDialogState = {
  mode: "create" | "edit";
  criterionKey: CoreCriterionKey;
  groupId: string;
  rule?: CriterionRule;
} | null;

type OtherDialogState = {
  mode: "create" | "edit";
  group?: OtherEvidenceGroup;
  evidence?: OtherEvidenceType;
} | null;

type DeleteDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
} | null;

const operatorOptions: Array<{ value: CriterionRule["operator"]; label: string }> = [
  { value: "gte", label: "Từ mức này trở lên" },
  { value: "lte", label: "Không quá mức này" },
  { value: "eq", label: "Bằng đúng giá trị này" },
  { value: "exists", label: "Có minh chứng" },
  { value: "in", label: "Thuộc danh sách được chọn" },
];

const enumValueOptions = [
  "A2",
  "B1",
  "Khá",
  "Giỏi",
  "Cấp Khoa",
  "Cấp Trường",
  "Cấp Thành phố",
  "Cấp Trung ương",
];

export function CriteriaConfigurationEditorPage({
  configurationId,
  section,
}: CriteriaConfigurationEditorPageProps) {
  const user = useAuth((state) => state.user);

  if (!canManageCriteriaSettings(user?.role)) {
    return (
      <>
        <TopBar title="Cấu hình xét chọn" />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Chức năng này dành cho Hội đồng.
            </div>
          </div>
        </Card>
      </>
    );
  }

  return <CriteriaConfigurationEditorContent configurationId={configurationId} section={section} />;
}

function CriteriaConfigurationEditorContent({
  configurationId,
  section,
}: CriteriaConfigurationEditorPageProps) {
  const configurationQuery = useCriteriaConfiguration(configurationId);

  if (configurationQuery.isLoading) {
    return (
      <>
        <TopBar title="Cấu hình xét chọn" subtitle="Đang tải bộ tiêu chí." />
        <EditorSkeleton />
      </>
    );
  }

  if (configurationQuery.isError || !configurationQuery.data) {
    return (
      <>
        <TopBar title="Cấu hình xét chọn" />
        <Card>
          <div className="py-10 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Không tìm thấy bộ tiêu chí này.
            </div>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/app/committee/settings">Quay lại Cấu hình xét chọn</Link>
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return <EditorSurface configuration={configurationQuery.data} section={section} />;
}

function EditorSurface({
  configuration,
  section,
}: {
  configuration: CriteriaConfiguration;
  section?: string;
}) {
  const navigate = useNavigate();
  const cloneDraft = useCloneCriteriaDraft();
  const saveMutation = useSaveCriteriaConfiguration();
  const publishMutation = usePublishCriteriaConfiguration();
  const archiveMutation = useArchiveCriteriaConfiguration();
  const [draft, setDraft] = useState(configuration);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [groupDialog, setGroupDialog] = useState<GroupDialogState>(null);
  const [ruleDialog, setRuleDialog] = useState<RuleDialogState>(null);
  const [otherDialog, setOtherDialog] = useState<OtherDialogState>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const [validationIssues, setValidationIssues] = useState<CriteriaValidationIssue[] | null>(null);
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [highlightTargetId, setHighlightTargetId] = useState<string | null>(null);
  const lastSavedSerializedRef = useRef(JSON.stringify(configuration));
  const selectedSection = normalizeEditorSection(section);
  const readonly = draft.status !== "draft";

  useEffect(() => {
    setDraft(configuration);
    lastSavedSerializedRef.current = JSON.stringify(configuration);
    setSaveState("idle");
  }, [configuration]);

  useEffect(() => {
    const normalized = normalizeEditorSection(section);
    if (section === normalized) return;
    void navigate({
      to: "/app/committee/settings/criteria/$configurationId",
      params: { configurationId: draft.id },
      search: { section: normalized },
      replace: true,
    });
  }, [draft.id, navigate, section]);

  useEffect(() => {
    if (readonly) return;
    const serialized = JSON.stringify(draft);
    if (serialized === lastSavedSerializedRef.current) return;
    setSaveState("dirty");
    const timeout = window.setTimeout(() => {
      setSaveState("saving");
      saveMutation.mutate(draft, {
        onSuccess: (saved) => {
          lastSavedSerializedRef.current = JSON.stringify(saved);
          setSaveState("saved");
        },
        onError: () => {
          setSaveState("error");
          toast.error("Chưa thể lưu bản nháp. Vui lòng thử lại.");
        },
      });
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [draft, readonly, saveMutation]);

  const issues = useMemo(() => validateCriteriaConfiguration(draft), [draft]);
  const blockingIssues = getBlockingValidationIssues(issues);

  function setSection(nextSection: EditorSectionKey) {
    void navigate({
      to: "/app/committee/settings/criteria/$configurationId",
      params: { configurationId: draft.id },
      search: { section: nextSection },
    });
  }

  function applyDraftChange(updater: (current: CriteriaConfiguration) => CriteriaConfiguration) {
    if (readonly) return;
    setDraft((current) => updater(current));
  }

  async function createEditableDraft(targetSchoolYear: string) {
    try {
      const nextDraft = await cloneDraft.mutateAsync({
        sourceConfigurationId: draft.id,
        targetSchoolYear,
      });
      toast.success("Đã tạo bản nháp để chỉnh sửa.");
      setCloneDialogOpen(false);
      void navigate({
        to: "/app/committee/settings/criteria/$configurationId",
        params: { configurationId: nextDraft.id },
        search: { section: selectedSection },
      });
    } catch (error) {
      if (isDuplicateDraftError(error)) {
        throw error;
      }
      toast.error("Chưa thể tạo bản nháp. Vui lòng thử lại.");
      throw error;
    }
  }

  function checkConfiguration() {
    setValidationIssues(validateCriteriaConfiguration(draft));
  }

  function publishDraft() {
    const currentIssues = validateCriteriaConfiguration(draft);
    const errors = getBlockingValidationIssues(currentIssues);
    if (errors.length) {
      setValidationIssues(currentIssues);
      return;
    }
    setApplyConfirmOpen(true);
  }

  async function confirmApply() {
    try {
      const serialized = JSON.stringify(draft);
      if (serialized !== lastSavedSerializedRef.current) {
        setSaveState("saving");
        const saved = await saveMutation.mutateAsync(draft);
        lastSavedSerializedRef.current = JSON.stringify(saved);
      }
      const published = await publishMutation.mutateAsync(draft.id);
      setDraft(published);
      setApplyConfirmOpen(false);
      setSaveState("idle");
      toast.success("Đã áp dụng bộ tiêu chí mô phỏng");
    } catch {
      setSaveState("error");
      toast.error("Chưa thể áp dụng bộ tiêu chí mô phỏng. Vui lòng thử lại.");
    }
  }

  function archiveConfiguration() {
    archiveMutation.mutate(draft.id, {
      onSuccess: (archived) => {
        setDraft(archived);
        setArchiveDialogOpen(false);
        toast.success("Đã lưu bộ tiêu chí vào lịch sử.");
      },
      onError: () =>
        toast.error("Chưa thể lưu vào lịch sử khi chưa có bộ tiêu chí thay thế đang áp dụng."),
    });
  }

  function goToIssue(issue: CriteriaValidationIssue) {
    setValidationIssues(null);
    setSection(issue.section);
    const targetId = getIssueTargetId(issue);
    setHighlightTargetId(targetId);
    window.setTimeout(() => {
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = element?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      focusable?.focus();
    }, 80);
    window.setTimeout(() => setHighlightTargetId(null), 1800);
  }

  function retrySave() {
    setSaveState("saving");
    saveMutation.mutate(draft, {
      onSuccess: (published) => {
        lastSavedSerializedRef.current = JSON.stringify(published);
        setSaveState("saved");
      },
      onError: () => setSaveState("error"),
    });
  }

  const activeCriterion = isCoreEditorSection(selectedSection)
    ? draft.criteria[selectedSection]
    : null;

  return (
    <>
      <TopBar
        title={`Bộ tiêu chí năm học ${draft.schoolYear}`}
        subtitle={`${DUT_COMMITTEE_UNIT_NAME} · ${DUT_COMMITTEE_REVIEW_LEVEL}`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!readonly ? <SaveIndicator state={saveState} onRetry={retrySave} /> : null}
            {readonly ? (
              <Button
                type="button"
                onClick={() => setCloneDialogOpen(true)}
                disabled={cloneDraft.isPending}
              >
                {cloneDraft.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Tạo bản nháp
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={checkConfiguration}>
                  <CheckCircle2 className="h-4 w-4" />
                  Kiểm tra
                </Button>
                <Button type="button" onClick={publishDraft} disabled={publishMutation.isPending}>
                  {publishMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Áp dụng
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-[#DCE7F2] bg-white px-4 py-3">
        <StatusBadge status={draft.status} />
        <span className="text-sm text-muted-foreground">
          {readonly
            ? "Bộ tiêu chí đang ở chế độ chỉ xem. Tạo bản nháp để chỉnh sửa."
            : "Bản nháp tự lưu trên trình duyệt của Hội đồng khi có thay đổi hợp lệ."}
        </span>
        {blockingIssues.length && !readonly ? (
          <Chip tone="warning">{blockingIssues.length} điểm cần xử lý</Chip>
        ) : null}
        {readonly && draft.status === "published" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setArchiveDialogOpen(true)}
          >
            Lưu vào lịch sử
          </Button>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <SectionNav configuration={draft} selectedSection={selectedSection} onSelect={setSection} />

        {activeCriterion ? (
          <CriterionSection
            criterionKey={activeCriterion.key}
            configuration={draft}
            readonly={readonly}
            onOpenGroupDialog={setGroupDialog}
            onOpenRuleDialog={setRuleDialog}
            onDelete={setDeleteDialog}
            onChange={applyDraftChange}
            highlightTargetId={highlightTargetId}
          />
        ) : (
          <OtherEvidenceSection
            configuration={draft}
            readonly={readonly}
            onOpenOtherDialog={setOtherDialog}
            onDelete={setDeleteDialog}
            onChange={applyDraftChange}
            highlightTargetId={highlightTargetId}
          />
        )}
      </div>

      <GroupDialog
        state={groupDialog}
        onOpenChange={(open) => !open && setGroupDialog(null)}
        onSave={(input) => {
          if (!groupDialog) return;
          applyDraftChange((current) =>
            groupDialog.mode === "create"
              ? createRuleGroup(current, groupDialog.criterionKey, input)
              : updateRuleGroup(current, groupDialog.criterionKey, groupDialog.group!.id, input),
          );
          toast.success(
            groupDialog.mode === "create"
              ? "Đã thêm nhóm điều kiện."
              : "Đã cập nhật nhóm điều kiện.",
          );
          setGroupDialog(null);
        }}
      />
      <RuleDialog
        state={ruleDialog}
        groups={ruleDialog ? draft.criteria[ruleDialog.criterionKey].ruleGroups : []}
        onOpenChange={(open) => !open && setRuleDialog(null)}
        onSave={(input) => {
          if (!ruleDialog) return;
          applyDraftChange((current) =>
            ruleDialog.mode === "create"
              ? createRule(current, ruleDialog.criterionKey, ruleDialog.groupId, input)
              : updateRule(
                  current,
                  ruleDialog.criterionKey,
                  ruleDialog.groupId,
                  ruleDialog.rule!.id,
                  input,
                ),
          );
          toast.success(
            ruleDialog.mode === "create" ? "Đã thêm điều kiện." : "Đã cập nhật điều kiện.",
          );
          setRuleDialog(null);
        }}
      />
      <OtherEvidenceDialog
        state={otherDialog}
        onOpenChange={(open) => !open && setOtherDialog(null)}
        onSave={(input) => {
          if (!otherDialog) return;
          applyDraftChange((current) =>
            otherDialog.mode === "create"
              ? createOtherEvidence(current, input)
              : updateOtherEvidence(current, otherDialog.evidence!.id, input),
          );
          toast.success(
            otherDialog.mode === "create"
              ? "Đã thêm minh chứng khác."
              : "Đã cập nhật minh chứng khác.",
          );
          setOtherDialog(null);
        }}
      />
      <ConfirmDeleteDialog
        state={deleteDialog}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
      />
      <ValidationResultsDialog
        issues={validationIssues}
        configuration={draft}
        onOpenChange={(open) => !open && setValidationIssues(null)}
        onGoToIssue={goToIssue}
      />
      <ApplyConfirmDialog
        open={applyConfirmOpen}
        configuration={draft}
        isApplying={publishMutation.isPending || saveMutation.isPending}
        onOpenChange={setApplyConfirmOpen}
        onConfirm={() => void confirmApply()}
      />
      <CloneDraftDialog
        open={cloneDialogOpen}
        source={draft}
        isPending={cloneDraft.isPending}
        onOpenChange={setCloneDialogOpen}
        onCreate={(targetSchoolYear) => createEditableDraft(targetSchoolYear)}
      />
      <ArchiveConfirmDialog
        open={archiveDialogOpen}
        isPending={archiveMutation.isPending}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={archiveConfiguration}
      />
    </>
  );
}

function SectionNav({
  configuration,
  selectedSection,
  onSelect,
}: {
  configuration: CriteriaConfiguration;
  selectedSection: EditorSectionKey;
  onSelect: (section: EditorSectionKey) => void;
}) {
  const tabs = EDITOR_SECTION_KEYS.map((section, index) => {
    if (section === OTHER_SECTION_KEY) {
      return {
        key: section,
        label: "Khác",
        eyebrow: "Không tính vào 5/5",
        state: `${getOtherEvidenceCount(configuration)} loại minh chứng`,
        icon: null,
      };
    }
    const criterion = configuration.criteria[section];
    return {
      key: section,
      label: criterion.shortLabel,
      eyebrow: `Tiêu chí 0${index + 1}`,
      state: getCriterionStateLabel(criterion),
      icon: <CriterionIcon criterion={criterion.key} size={18} />,
    };
  });

  return (
    <aside className="min-w-0">
      <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            aria-selected={selectedSection === tab.key}
            className={cn(
              "min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold shadow-[0_0_0_1px_rgba(15,23,42,0.08)]",
              selectedSection === tab.key
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-white text-brand-deep",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="hidden rounded-lg border border-[#DCE7F2] bg-white lg:block">
        <div className="border-b border-[#E5E7EB] px-4 py-3">
          <div className="text-sm font-bold text-brand-deep">Mục cấu hình</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {hasExactlyFiveCoreCriteria(configuration)
              ? "Luôn giữ đúng 5 tiêu chí cốt lõi."
              : "Đang khôi phục cấu trúc tiêu chí."}
          </div>
        </div>
        <div className="divide-y divide-[#E5E7EB]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              aria-current={selectedSection === tab.key ? "page" : undefined}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F6F9FC]",
                selectedSection === tab.key && "bg-[#EEF9FF]",
              )}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#0057C2]">
                {tab.icon ?? <span className="text-sm font-bold">K</span>}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase text-muted-foreground">
                  {tab.eyebrow}
                </div>
                <div className="mt-0.5 text-sm font-bold text-brand-deep">{tab.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{tab.state}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function CriterionSection({
  criterionKey,
  configuration,
  readonly,
  onOpenGroupDialog,
  onOpenRuleDialog,
  onDelete,
  onChange,
  highlightTargetId,
}: {
  criterionKey: CoreCriterionKey;
  configuration: CriteriaConfiguration;
  readonly: boolean;
  onOpenGroupDialog: (state: GroupDialogState) => void;
  onOpenRuleDialog: (state: RuleDialogState) => void;
  onDelete: (state: DeleteDialogState) => void;
  onChange: (updater: (current: CriteriaConfiguration) => CriteriaConfiguration) => void;
  highlightTargetId: string | null;
}) {
  const criterion = configuration.criteria[criterionKey];
  const issues = validateCriteriaConfiguration(configuration).filter(
    (issue) => issue.section === criterionKey && issue.severity === "error",
  );

  return (
    <section
      id={getSectionTargetId(criterionKey)}
      className={cn(
        "min-w-0 rounded-lg border border-[#DCE7F2] bg-white transition-colors",
        highlightTargetId === getSectionTargetId(criterionKey) && "bg-amber-50",
      )}
    >
      <div className="flex flex-col gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF9FF] text-[#0057C2]">
              <CriterionIcon criterion={criterion.key} size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-deep">{criterion.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {getCriterionRuleCount(criterion)} điều kiện trong {criterion.ruleGroups.length}{" "}
                nhóm.
              </p>
            </div>
          </div>
          {issues.length ? (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{issues[0].message}</span>
            </div>
          ) : null}
        </div>
        {!readonly ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.info("Dữ liệu năm trước đã có trong bản nháp demo.")}
            >
              <RotateCcw className="h-4 w-4" />
              Dùng dữ liệu mẫu
            </Button>
            <Button
              type="button"
              onClick={() => onOpenGroupDialog({ mode: "create", criterionKey })}
            >
              <Plus className="h-4 w-4" />
              Thêm nhóm
            </Button>
          </div>
        ) : null}
      </div>

      {criterion.ruleGroups.length ? (
        <div className="divide-y divide-[#E5E7EB]">
          {criterion.ruleGroups.map((group, index) => (
            <RuleGroupBlock
              key={group.id}
              group={group}
              criterionKey={criterionKey}
              readonly={readonly}
              isFirst={index === 0}
              isLast={index === criterion.ruleGroups.length - 1}
              allGroups={criterion.ruleGroups}
              onOpenGroupDialog={onOpenGroupDialog}
              onOpenRuleDialog={onOpenRuleDialog}
              onDelete={onDelete}
              onChange={onChange}
              highlightTargetId={highlightTargetId}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <div className="text-base font-semibold text-brand-deep">Chưa có nhóm điều kiện</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Bản nháp có thể tạm trống, nhưng cần có điều kiện trước khi áp dụng.
          </p>
          {!readonly ? (
            <Button
              className="mt-4"
              type="button"
              onClick={() => onOpenGroupDialog({ mode: "create", criterionKey })}
            >
              <Plus className="h-4 w-4" />
              Thêm nhóm đầu tiên
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function RuleGroupBlock({
  group,
  criterionKey,
  readonly,
  isFirst,
  isLast,
  allGroups,
  onOpenGroupDialog,
  onOpenRuleDialog,
  onDelete,
  onChange,
  highlightTargetId,
}: {
  group: RuleGroup;
  criterionKey: CoreCriterionKey;
  readonly: boolean;
  isFirst: boolean;
  isLast: boolean;
  allGroups: RuleGroup[];
  onOpenGroupDialog: (state: GroupDialogState) => void;
  onOpenRuleDialog: (state: RuleDialogState) => void;
  onDelete: (state: DeleteDialogState) => void;
  onChange: (updater: (current: CriteriaConfiguration) => CriteriaConfiguration) => void;
  highlightTargetId: string | null;
}) {
  const minimumInvalid =
    group.logic === "minimum" &&
    group.rules.length > 0 &&
    (!group.minimumRequired || group.minimumRequired > group.rules.length);

  return (
    <div
      id={getGroupTargetId(group.id)}
      className={cn(
        "px-5 py-4 transition-colors",
        highlightTargetId === getGroupTargetId(group.id) && "bg-amber-50",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-brand-deep">{group.title}</h3>
            <Chip tone={minimumInvalid || !group.rules.length ? "warning" : "muted"}>
              {group.rules.length ? `${group.rules.length} điều kiện` : "Chưa có điều kiện"}
            </Chip>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{getGroupLogicSentence(group)}</p>
        </div>
        {!readonly ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenRuleDialog({ mode: "create", criterionKey, groupId: group.id })}
            >
              <Plus className="h-4 w-4" />
              Thêm điều kiện
            </Button>
            <GroupMenu
              group={group}
              criterionKey={criterionKey}
              isFirst={isFirst}
              isLast={isLast}
              onOpenGroupDialog={onOpenGroupDialog}
              onDelete={onDelete}
              onChange={onChange}
            />
          </div>
        ) : null}
      </div>

      {group.rules.length ? (
        <div className="mt-4 divide-y divide-[#E5E7EB] rounded-md border border-[#E5E7EB]">
          {group.rules.map((rule, index) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              group={group}
              criterionKey={criterionKey}
              readonly={readonly}
              isFirst={index === 0}
              isLast={index === group.rules.length - 1}
              allGroups={allGroups}
              onOpenRuleDialog={onOpenRuleDialog}
              onDelete={onDelete}
              onChange={onChange}
              highlightTargetId={highlightTargetId}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-md bg-[#F6F9FC] px-3 py-3 text-sm text-amber-700">
          Nhóm này đang trống. Có thể lưu nháp, nhưng cần thêm điều kiện trước khi áp dụng.
        </div>
      )}
    </div>
  );
}

function GroupMenu({
  group,
  criterionKey,
  isFirst,
  isLast,
  onOpenGroupDialog,
  onDelete,
  onChange,
}: {
  group: RuleGroup;
  criterionKey: CoreCriterionKey;
  isFirst: boolean;
  isLast: boolean;
  onOpenGroupDialog: (state: GroupDialogState) => void;
  onDelete: (state: DeleteDialogState) => void;
  onChange: (updater: (current: CriteriaConfiguration) => CriteriaConfiguration) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="ghost" aria-label="Tùy chọn nhóm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onOpenGroupDialog({ mode: "edit", criterionKey, group })}>
          <Pencil className="h-4 w-4" />
          Sửa nhóm
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isFirst}
          onClick={() =>
            onChange((current) => moveRuleGroup(current, criterionKey, group.id, "up"))
          }
        >
          <MoveUp className="h-4 w-4" />
          Đưa lên
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isLast}
          onClick={() =>
            onChange((current) => moveRuleGroup(current, criterionKey, group.id, "down"))
          }
        >
          <MoveDown className="h-4 w-4" />
          Đưa xuống
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange((current) => duplicateRuleGroup(current, criterionKey, group.id))}
        >
          <CopyPlus className="h-4 w-4" />
          Nhân bản nhóm
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-rose-700"
          onClick={() =>
            onDelete({
              title: "Xóa nhóm điều kiện",
              description: `Nhóm "${group.title}" và các điều kiện bên trong sẽ bị xóa khỏi bản nháp.`,
              confirmLabel: "Xóa nhóm",
              onConfirm: () =>
                onChange((current) => deleteRuleGroup(current, criterionKey, group.id)),
            })
          }
        >
          <Trash2 className="h-4 w-4" />
          Xóa nhóm
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RuleRow({
  rule,
  group,
  criterionKey,
  readonly,
  isFirst,
  isLast,
  allGroups,
  onOpenRuleDialog,
  onDelete,
  onChange,
  highlightTargetId,
}: {
  rule: CriterionRule;
  group: RuleGroup;
  criterionKey: CoreCriterionKey;
  readonly: boolean;
  isFirst: boolean;
  isLast: boolean;
  allGroups: RuleGroup[];
  onOpenRuleDialog: (state: RuleDialogState) => void;
  onDelete: (state: DeleteDialogState) => void;
  onChange: (updater: (current: CriteriaConfiguration) => CriteriaConfiguration) => void;
  highlightTargetId: string | null;
}) {
  return (
    <div
      id={getRuleTargetId(rule.id)}
      aria-label={`Điều kiện ${rule.label}`}
      className={cn(
        "flex flex-col gap-3 px-4 py-3 transition-colors sm:flex-row sm:items-start sm:justify-between",
        highlightTargetId === getRuleTargetId(rule.id) && "bg-amber-50",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-bold text-brand-deep">{rule.label}</div>
          <Chip tone="brand">{RULE_TYPE_LABELS[rule.type]}</Chip>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{getRuleSentence(rule)}</p>
        {rule.evidenceTypes?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {rule.evidenceTypes.map((evidence) => (
              <span
                key={evidence}
                className="rounded-md bg-[#F6F9FC] px-2 py-1 text-xs text-muted-foreground"
              >
                {evidence}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {!readonly ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="ghost" aria-label="Tùy chọn điều kiện">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() =>
                onOpenRuleDialog({ mode: "edit", criterionKey, groupId: group.id, rule })
              }
            >
              <Pencil className="h-4 w-4" />
              Sửa điều kiện
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isFirst}
              onClick={() =>
                onChange((current) => moveRule(current, criterionKey, group.id, rule.id, "up"))
              }
            >
              <MoveUp className="h-4 w-4" />
              Đưa lên
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLast}
              onClick={() =>
                onChange((current) => moveRule(current, criterionKey, group.id, rule.id, "down"))
              }
            >
              <MoveDown className="h-4 w-4" />
              Đưa xuống
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Chuyển sang nhóm</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {allGroups
                  .filter((item) => item.id !== group.id)
                  .map((targetGroup) => (
                    <DropdownMenuItem
                      key={targetGroup.id}
                      onClick={() =>
                        onChange((current) =>
                          moveRuleToGroup(current, criterionKey, group.id, targetGroup.id, rule.id),
                        )
                      }
                    >
                      {targetGroup.title}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              onClick={() =>
                onChange((current) => duplicateRule(current, criterionKey, group.id, rule.id))
              }
            >
              <CopyPlus className="h-4 w-4" />
              Nhân bản điều kiện
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-700"
              onClick={() =>
                onDelete({
                  title: "Xóa điều kiện",
                  description: `Điều kiện "${rule.label}" sẽ bị xóa khỏi nhóm "${group.title}".`,
                  confirmLabel: "Xóa điều kiện",
                  onConfirm: () =>
                    onChange((current) => deleteRule(current, criterionKey, group.id, rule.id)),
                })
              }
            >
              <Trash2 className="h-4 w-4" />
              Xóa điều kiện
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

function OtherEvidenceSection({
  configuration,
  readonly,
  onOpenOtherDialog,
  onDelete,
  onChange,
  highlightTargetId,
}: {
  configuration: CriteriaConfiguration;
  readonly: boolean;
  onOpenOtherDialog: (state: OtherDialogState) => void;
  onDelete: (state: DeleteDialogState) => void;
  onChange: (updater: (current: CriteriaConfiguration) => CriteriaConfiguration) => void;
  highlightTargetId: string | null;
}) {
  return (
    <section
      id={getSectionTargetId("other")}
      className={cn(
        "min-w-0 rounded-lg border border-[#DCE7F2] bg-white transition-colors",
        highlightTargetId === getSectionTargetId("other") && "bg-amber-50",
      )}
    >
      <div className="flex flex-col gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-deep">Khác</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Minh chứng hỗ trợ, không tính là tiêu chí thứ sáu và không ảnh hưởng số 5/5.
          </p>
          {hasMalformedOtherEvidence(configuration) ? (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Phát hiện minh chứng Khác có cấu hình bắt buộc. Mục này chỉ dùng để hỗ trợ xét chọn.
              </span>
            </div>
          ) : null}
        </div>
        {!readonly ? (
          <Button type="button" onClick={() => onOpenOtherDialog({ mode: "create" })}>
            <Plus className="h-4 w-4" />
            Thêm minh chứng
          </Button>
        ) : null}
      </div>
      <div className="divide-y divide-[#E5E7EB]">
        {getOtherEvidenceCount(configuration) === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Chưa có minh chứng bổ sung.
            </div>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Mục này có thể dùng cho minh chứng ưu tiên, tham khảo hoặc cần Hội đồng xác minh.
            </p>
            {!readonly ? (
              <Button
                className="mt-4"
                type="button"
                onClick={() => onOpenOtherDialog({ mode: "create" })}
              >
                <Plus className="h-4 w-4" />
                Thêm loại minh chứng
              </Button>
            ) : null}
          </div>
        ) : (
          configuration.otherEvidenceGroups.map((group) => (
            <div key={group.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-brand-deep">{group.title}</h3>
                <Chip tone="muted">{OTHER_PURPOSE_LABELS[group.purpose]}</Chip>
              </div>
              {group.evidenceTypes.length ? (
                <div className="mt-4 divide-y divide-[#E5E7EB] rounded-md border border-[#E5E7EB]">
                  {group.evidenceTypes.map((evidence) => (
                    <div
                      key={evidence.id}
                      id={getOtherTargetId(evidence.id)}
                      aria-label={`Minh chứng ${evidence.label}, ${OTHER_PURPOSE_LABELS[group.purpose]}`}
                      className={cn(
                        "flex flex-col gap-3 px-4 py-3 transition-colors sm:flex-row sm:items-start sm:justify-between",
                        highlightTargetId === getOtherTargetId(evidence.id) && "bg-amber-50",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-brand-deep">{evidence.label}</div>
                        {evidence.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {evidence.description}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(evidence.relatedCriteria ?? group.relatedCriteria).map(
                            (criterionKey) => (
                              <span
                                key={criterionKey}
                                className="rounded-md bg-[#F6F9FC] px-2 py-1 text-xs text-muted-foreground"
                              >
                                {configuration.criteria[criterionKey].shortLabel}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                      {!readonly ? (
                        <OtherEvidenceMenu
                          group={group}
                          evidence={evidence}
                          onOpenOtherDialog={onOpenOtherDialog}
                          onDelete={onDelete}
                          onChange={onChange}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-md bg-[#F6F9FC] px-3 py-3 text-sm text-muted-foreground">
                  Chưa có minh chứng trong nhóm này.
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function OtherEvidenceMenu({
  group,
  evidence,
  onOpenOtherDialog,
  onDelete,
  onChange,
}: {
  group: OtherEvidenceGroup;
  evidence: OtherEvidenceType;
  onOpenOtherDialog: (state: OtherDialogState) => void;
  onDelete: (state: DeleteDialogState) => void;
  onChange: (updater: (current: CriteriaConfiguration) => CriteriaConfiguration) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="ghost" aria-label="Tùy chọn minh chứng">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={() => onOpenOtherDialog({ mode: "edit", group, evidence })}>
          <Pencil className="h-4 w-4" />
          Sửa minh chứng
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Chuyển cách xử lý</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(Object.keys(OTHER_PURPOSE_LABELS) as OtherEvidencePurpose[]).map((purpose) => (
              <DropdownMenuItem
                key={purpose}
                disabled={purpose === group.purpose}
                onClick={() =>
                  onChange((current) => moveOtherEvidencePurpose(current, evidence.id, purpose))
                }
              >
                {OTHER_PURPOSE_LABELS[purpose]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onClick={() => onChange((current) => duplicateOtherEvidence(current, evidence.id))}
        >
          <CopyPlus className="h-4 w-4" />
          Nhân bản minh chứng
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-rose-700"
          onClick={() =>
            onDelete({
              title: "Xóa minh chứng",
              description: `Minh chứng "${evidence.label}" sẽ bị xóa khỏi mục Khác.`,
              confirmLabel: "Xóa minh chứng",
              onConfirm: () => onChange((current) => deleteOtherEvidence(current, evidence.id)),
            })
          }
        >
          <Trash2 className="h-4 w-4" />
          Xóa minh chứng
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupDialog({
  state,
  onOpenChange,
  onSave,
}: {
  state: GroupDialogState;
  onOpenChange: (open: boolean) => void;
  onSave: (input: RuleGroupInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [logic, setLogic] = useState<RuleGroupLogic>("all");
  const [minimumRequired, setMinimumRequired] = useState("1");
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(state?.group?.title ?? "");
    setLogic(state?.group?.logic ?? "all");
    setMinimumRequired(String(state?.group?.minimumRequired ?? 1));
    setError("");
  }, [state]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const minimum = Number(minimumRequired);
    const ruleCount = state?.group?.rules.length ?? 0;
    if (!title.trim()) {
      setError("Nhập tên nhóm điều kiện.");
      return;
    }
    if (
      logic === "minimum" &&
      (!Number.isInteger(minimum) || minimum < 1 || (ruleCount > 0 && minimum > ruleCount))
    ) {
      setError("Số điều kiện tối thiểu phải hợp lệ với số điều kiện trong nhóm.");
      return;
    }
    onSave({
      title,
      logic,
      minimumRequired: logic === "minimum" ? minimum : undefined,
    });
  }

  return (
    <Dialog open={Boolean(state)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {state?.mode === "edit" ? "Sửa nhóm điều kiện" : "Thêm nhóm điều kiện"}
            </DialogTitle>
            <DialogDescription>Đặt cách tính cho các điều kiện trong nhóm.</DialogDescription>
          </DialogHeader>
          <Field label="Tên nhóm" htmlFor="group-title" error={error}>
            <Input
              id="group-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field label="Cách đạt nhóm">
            <Select value={logic} onValueChange={(value) => setLogic(value as RuleGroupLogic)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GROUP_LOGIC_LABELS) as RuleGroupLogic[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {GROUP_LOGIC_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {logic === "minimum" ? (
            <Field label="Số điều kiện tối thiểu" htmlFor="group-minimum">
              <Input
                id="group-minimum"
                inputMode="numeric"
                value={minimumRequired}
                onChange={(event) => setMinimumRequired(event.target.value)}
              />
            </Field>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">Lưu nhóm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RuleDialog({
  state,
  groups,
  onOpenChange,
  onSave,
}: {
  state: RuleDialogState;
  groups: RuleGroup[];
  onOpenChange: (open: boolean) => void;
  onSave: (input: RuleInput) => void;
}) {
  const [form, setForm] = useState(() => toRuleFormState());
  const [error, setError] = useState("");
  const activeGroup = groups.find((group) => group.id === state?.groupId);

  useEffect(() => {
    setForm(toRuleFormState(state?.rule));
    setError("");
  }, [state]);

  function update<K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateRuleForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave(ruleFormToInput(form));
  }

  return (
    <Dialog open={Boolean(state)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{state?.mode === "edit" ? "Sửa điều kiện" : "Thêm điều kiện"}</DialogTitle>
            <DialogDescription>
              {activeGroup
                ? `Nhóm: ${activeGroup.title}`
                : "Chọn nội dung điều kiện bằng ngôn ngữ nghiệp vụ."}
            </DialogDescription>
          </DialogHeader>
          <Field label="Tên hiển thị" htmlFor="rule-label" error={error}>
            <Input
              id="rule-label"
              value={form.label}
              onChange={(event) => update("label", event.target.value)}
            />
          </Field>
          <Field label="Loại điều kiện">
            <Select
              value={form.type}
              onValueChange={(value) => update("type", value as CriterionRuleType)}
              disabled={state?.mode === "edit"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPE_ORDER.map((type) => (
                  <SelectItem key={type} value={type}>
                    {RULE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {RULE_TYPE_DESCRIPTIONS[form.type]}
            </p>
          </Field>
          <RuleSpecificFields form={form} update={update} />
          <div className="rounded-md bg-[#F6F9FC] px-3 py-2 text-sm text-muted-foreground">
            Xem trước:{" "}
            {getRuleSentence({
              ...ruleFormToInput(form),
              id: "preview",
              operator: ruleFormToInput(form).operator ?? "gte",
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">Lưu điều kiện</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type RuleFormState = {
  label: string;
  type: CriterionRuleType;
  operator: CriterionRule["operator"];
  value: string;
  unit: string;
  scale: string;
  metricLabel: string;
  evidenceLabel: string;
  contextLabel: string;
  sumLabel: string;
  dateMode: NonNullable<CriterionRule["dateMode"]>;
  startDate: string;
  endDate: string;
  acceptedValues: string[];
  manualInstruction: string;
};

function RuleSpecificFields({
  form,
  update,
}: {
  form: RuleFormState;
  update: <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => void;
}) {
  if (form.type === "numeric_threshold") {
    return (
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Cách so sánh">
          <Select
            value={form.operator}
            onValueChange={(value) => update("operator", value as CriterionRule["operator"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operatorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Giá trị" htmlFor="rule-value">
          <Input
            id="rule-value"
            inputMode="decimal"
            value={form.value}
            onChange={(event) => update("value", event.target.value)}
          />
        </Field>
        <Field label="Thang đo" htmlFor="rule-scale">
          <Input
            id="rule-scale"
            inputMode="decimal"
            value={form.scale}
            onChange={(event) => update("scale", event.target.value)}
          />
        </Field>
        <Field label="Tên số liệu" htmlFor="rule-metric-label">
          <Input
            id="rule-metric-label"
            value={form.metricLabel}
            onChange={(event) => update("metricLabel", event.target.value)}
          />
        </Field>
      </div>
    );
  }
  if (form.type === "evidence_count") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Loại minh chứng hoặc hoạt động" htmlFor="rule-count-evidence">
          <Input
            id="rule-count-evidence"
            value={form.evidenceLabel}
            onChange={(event) => update("evidenceLabel", event.target.value)}
          />
        </Field>
        <Field label="Số lượng yêu cầu" htmlFor="rule-value">
          <Input
            id="rule-value"
            inputMode="numeric"
            value={form.value}
            onChange={(event) => update("value", event.target.value)}
          />
        </Field>
        <Field label="Đơn vị" htmlFor="rule-unit">
          <Input
            id="rule-unit"
            value={form.unit}
            onChange={(event) => update("unit", event.target.value)}
          />
        </Field>
      </div>
    );
  }
  if (form.type === "evidence_sum") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Loại minh chứng" htmlFor="rule-sum-evidence">
          <Input
            id="rule-sum-evidence"
            value={form.evidenceLabel}
            onChange={(event) => update("evidenceLabel", event.target.value)}
          />
        </Field>
        <Field label="Thông tin cần cộng" htmlFor="rule-sum-label">
          <Input
            id="rule-sum-label"
            value={form.sumLabel}
            onChange={(event) => update("sumLabel", event.target.value)}
          />
        </Field>
        <Field label="Tổng yêu cầu" htmlFor="rule-value">
          <Input
            id="rule-value"
            inputMode="decimal"
            value={form.value}
            onChange={(event) => update("value", event.target.value)}
          />
        </Field>
      </div>
    );
  }
  if (form.type === "boolean_condition") {
    return (
      <Field label="Kết quả yêu cầu">
        <Select value={form.value || "true"} onValueChange={(value) => update("value", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Được xác nhận là đạt</SelectItem>
            <SelectItem value="false">Được xác nhận là không xảy ra</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    );
  }
  if (form.type === "evidence_presence") {
    return (
      <Field label="Loại minh chứng phù hợp" htmlFor="rule-evidence">
        <Input
          id="rule-evidence"
          value={form.evidenceLabel}
          onChange={(event) => update("evidenceLabel", event.target.value)}
        />
      </Field>
    );
  }
  if (form.type === "organizer_level") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Hoạt động hoặc minh chứng" htmlFor="rule-level-context">
          <Input
            id="rule-level-context"
            value={form.contextLabel}
            onChange={(event) => update("contextLabel", event.target.value)}
          />
        </Field>
        <Field label="Cấp tối thiểu">
          <Select
            value={form.value || "Cấp Khoa"}
            onValueChange={(value) => update("value", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumValueOptions.slice(4).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    );
  }
  if (form.type === "date_range") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Cách xác định thời gian">
          <Select
            value={form.dateMode}
            onValueChange={(value) => update("dateMode", value as RuleFormState["dateMode"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Khoảng ngày cụ thể</SelectItem>
              <SelectItem value="school_year">Theo năm học</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Từ ngày" htmlFor="rule-start-date">
          <Input
            id="rule-start-date"
            type="date"
            value={form.startDate}
            onChange={(event) => update("startDate", event.target.value)}
          />
        </Field>
        <Field label="Đến ngày" htmlFor="rule-end-date">
          <Input
            id="rule-end-date"
            type="date"
            value={form.endDate}
            onChange={(event) => update("endDate", event.target.value)}
          />
        </Field>
      </div>
    );
  }
  if (form.type === "enum_match") {
    return (
      <div className="space-y-3">
        <Field label="Trường hoặc bối cảnh" htmlFor="rule-enum-context">
          <Input
            id="rule-enum-context"
            value={form.contextLabel}
            onChange={(event) => update("contextLabel", event.target.value)}
          />
        </Field>
        <Field label="Giá trị được chấp nhận">
          <div className="flex flex-wrap gap-2">
            {enumValueOptions.map((value) => {
              const selected = form.acceptedValues.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    update(
                      "acceptedValues",
                      selected
                        ? form.acceptedValues.filter((item) => item !== value)
                        : [...form.acceptedValues, value],
                    )
                  }
                  className={cn(
                    "min-h-9 rounded-md px-3 text-sm font-semibold shadow-[0_0_0_1px_rgba(15,23,42,0.08)]",
                    selected ? "bg-[var(--brand-primary)] text-white" : "bg-white text-brand-deep",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    );
  }
  if (form.type === "manual_confirmation") {
    return (
      <Field label="Hướng xử lý cho Hội đồng" htmlFor="rule-manual-instruction">
        <Textarea
          id="rule-manual-instruction"
          value={form.manualInstruction}
          onChange={(event) => update("manualInstruction", event.target.value)}
        />
      </Field>
    );
  }
  return (
    <div className="rounded-md bg-[#F6F9FC] px-3 py-2 text-sm text-muted-foreground">
      Điều kiện này sẽ được Hội đồng xác minh thủ công trước khi kết luận.
    </div>
  );
}

function OtherEvidenceDialog({
  state,
  onOpenChange,
  onSave,
}: {
  state: OtherDialogState;
  onOpenChange: (open: boolean) => void;
  onSave: (input: OtherEvidenceInput) => void;
}) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<OtherEvidencePurpose>("reference");
  const [relatedCriteria, setRelatedCriteria] = useState<CoreCriterionKey[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setLabel(state?.evidence?.label ?? "");
    setDescription(state?.evidence?.description ?? "");
    setPurpose(state?.evidence?.handling ?? state?.group?.purpose ?? "reference");
    setRelatedCriteria(state?.evidence?.relatedCriteria ?? state?.group?.relatedCriteria ?? []);
    setError("");
  }, [state]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) {
      setError("Nhập tên minh chứng.");
      return;
    }
    onSave({ label, description, purpose, relatedCriteria });
  }

  return (
    <Dialog open={Boolean(state)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {state?.mode === "edit" ? "Sửa minh chứng Khác" : "Thêm minh chứng Khác"}
            </DialogTitle>
            <DialogDescription>
              Mục này chỉ hỗ trợ Hội đồng tham khảo, ưu tiên hoặc xác minh.
            </DialogDescription>
          </DialogHeader>
          <Field label="Tên minh chứng" htmlFor="other-label" error={error}>
            <Input
              id="other-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </Field>
          <Field label="Cách xử lý">
            <Select
              value={purpose}
              onValueChange={(value) => setPurpose(value as OtherEvidencePurpose)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OTHER_PURPOSE_LABELS) as OtherEvidencePurpose[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {OTHER_PURPOSE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Liên quan đến tiêu chí">
            <div className="flex flex-wrap gap-2">
              {CORE_CRITERION_KEYS.map((key) => {
                const selected = relatedCriteria.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setRelatedCriteria((current) =>
                        selected ? current.filter((item) => item !== key) : [...current, key],
                      )
                    }
                    className={cn(
                      "min-h-9 rounded-md px-3 text-sm font-semibold shadow-[0_0_0_1px_rgba(15,23,42,0.08)]",
                      selected
                        ? "bg-[var(--brand-primary)] text-white"
                        : "bg-white text-brand-deep",
                    )}
                  >
                    {CORE_CRITERION_SHORT_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Ghi chú" htmlFor="other-description">
            <Textarea
              id="other-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">Lưu minh chứng</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDeleteDialog({
  state,
  onOpenChange,
}: {
  state: DeleteDialogState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(state)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state?.title}</DialogTitle>
          <DialogDescription>{state?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              state?.onConfirm();
              toast.success("Đã xóa khỏi bản nháp.");
              onOpenChange(false);
            }}
          >
            {state?.confirmLabel ?? "Xóa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValidationResultsDialog({
  issues,
  configuration,
  onOpenChange,
  onGoToIssue,
}: {
  issues: CriteriaValidationIssue[] | null;
  configuration: CriteriaConfiguration;
  onOpenChange: (open: boolean) => void;
  onGoToIssue: (issue: CriteriaValidationIssue) => void;
}) {
  const errors = getBlockingValidationIssues(issues ?? []);
  const warnings = getWarningValidationIssues(issues ?? []);
  const grouped = groupIssuesBySection([...errors, ...warnings]);
  const valid = Boolean(issues) && errors.length === 0;

  return (
    <Dialog open={Boolean(issues)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-live="polite">
        <DialogHeader>
          <DialogTitle>
            {valid
              ? "Bộ tiêu chí đã đầy đủ và sẵn sàng áp dụng."
              : `Còn ${errors.length} vấn đề cần xử lý`}
          </DialogTitle>
          <DialogDescription>
            {valid
              ? `5/5 tiêu chí đã được cấu hình. ${
                  getOtherEvidenceCount(configuration)
                    ? `Mục Khác có ${getOtherEvidenceCount(configuration)} loại minh chứng bổ sung.`
                    : "Mục Khác hiện chưa có minh chứng bổ sung."
                }`
              : "Các mục bên dưới có thể mở trực tiếp đến phần cần sửa."}
          </DialogDescription>
        </DialogHeader>
        {valid && warnings.length === 0 ? (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            Không có lỗi chặn áp dụng trong bản nháp hiện tại.
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {grouped.map(([section, sectionIssues]) => (
              <section key={section} className="border-t border-[#E5E7EB] pt-3">
                <h3 className="text-sm font-bold text-brand-deep">{getSectionLabel(section)}</h3>
                <div className="mt-2 space-y-2">
                  {sectionIssues.map((issue) => (
                    <div key={issue.id} className="rounded-md bg-[#F6F9FC] px-3 py-2">
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            issue.severity === "error" ? "text-rose-700" : "text-amber-700",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-brand-deep">{issue.message}</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="mt-1 px-0"
                            onClick={() => onGoToIssue(issue)}
                          >
                            Đến phần cần sửa
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplyConfirmDialog({
  open,
  configuration,
  isApplying,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  configuration: CriteriaConfiguration;
  isApplying: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const otherCount = getOtherEvidenceCount(configuration);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Áp dụng bộ tiêu chí năm học {configuration.schoolYear}?</DialogTitle>
          <DialogDescription>
            Thao tác này chỉ áp dụng trong dữ liệu mô phỏng trên thiết bị.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-brand-deep">Bộ tiêu chí gồm đầy đủ:</p>
          <ul className="space-y-1">
            {getCriteriaInFixedOrder(configuration).map((criterion) => (
              <li key={criterion.key}>• {criterion.label}</li>
            ))}
          </ul>
          <p>
            {otherCount
              ? `Ngoài ra có ${otherCount} loại minh chứng bổ sung trong mục Khác.`
              : "Mục Khác hiện chưa có minh chứng bổ sung."}
          </p>
          <p>Sau khi áp dụng, bộ tiêu chí sẽ chuyển sang chế độ chỉ xem trong bản mô phỏng.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Quay lại
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isApplying}>
            {isApplying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Áp dụng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloneDraftDialog({
  open,
  source,
  isPending,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  source: CriteriaConfiguration;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (targetSchoolYear: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [schoolYear, setSchoolYear] = useState(suggestNextSchoolYear(source.schoolYear));
  const [duplicateDraftId, setDuplicateDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSchoolYear(suggestNextSchoolYear(source.schoolYear));
      setDuplicateDraftId(null);
    }
  }, [open, source.schoolYear]);

  async function submit() {
    try {
      await onCreate(schoolYear);
    } catch (error) {
      if (isDuplicateDraftError(error)) {
        setDuplicateDraftId(error.draftId);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo bản nháp từ bộ tiêu chí này?</DialogTitle>
          <DialogDescription>
            Hệ thống sẽ sao chép toàn bộ điều kiện sang một bản nháp mới để bạn chỉnh sửa an toàn.
          </DialogDescription>
        </DialogHeader>
        <Field label="Năm học mới" htmlFor="clone-school-year">
          <Input
            id="clone-school-year"
            value={schoolYear}
            onChange={(event) => {
              setSchoolYear(event.target.value);
              setDuplicateDraftId(null);
            }}
          />
        </Field>
        {duplicateDraftId ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            Năm học này đã có một bản nháp.
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          {duplicateDraftId ? (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                void navigate({
                  to: "/app/committee/settings/criteria/$configurationId",
                  params: { configurationId: duplicateDraftId },
                  search: { section: "ethics" },
                });
              }}
            >
              Mở bản nháp
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isPending || !schoolYear.trim()}
              onClick={() => void submit()}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Tạo bản nháp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveConfirmDialog({
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lưu bộ tiêu chí này vào lịch sử?</DialogTitle>
          <DialogDescription>
            Bộ tiêu chí sẽ chuyển sang chế độ chỉ xem và vẫn có thể được dùng để tạo bản nháp mới.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" disabled={isPending} onClick={onConfirm}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Lưu vào lịch sử
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <div className="text-sm text-rose-700">{error}</div> : null}
    </div>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "saving" || state === "dirty") {
    return (
      <span
        aria-live="polite"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang lưu...
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span
        aria-live="polite"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"
      >
        <Save className="h-4 w-4" />
        Đã lưu
      </span>
    );
  }
  if (state === "error") {
    return (
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <AlertTriangle className="h-4 w-4" />
        Lưu lại
      </Button>
    );
  }
  return null;
}

function StatusBadge({ status }: { status: CriteriaConfigurationStatus }) {
  if (status === "published") return <Chip tone="success">Đang áp dụng</Chip>;
  if (status === "archived") return <Chip tone="muted">Đã lưu trữ</Chip>;
  return <Chip tone="warning">Bản nháp</Chip>;
}

function EditorSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 rounded-lg" />
      <Skeleton className="h-72 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

function toRuleFormState(rule?: CriterionRule): RuleFormState {
  return {
    label: rule?.label ?? "",
    type: rule?.type ?? "numeric_threshold",
    operator: rule?.operator ?? "gte",
    value: rule?.value === undefined ? "" : String(rule.value),
    unit: rule?.unit ?? "",
    scale: rule?.scale === undefined ? defaultScaleForRule(rule) : String(rule.scale),
    metricLabel: rule?.metricLabel ?? "",
    evidenceLabel: rule?.evidenceLabel ?? "",
    contextLabel: rule?.contextLabel ?? "",
    sumLabel: rule?.sumLabel ?? "",
    dateMode: rule?.dateMode ?? "custom",
    startDate: rule?.startDate ?? "",
    endDate: rule?.endDate ?? "",
    acceptedValues: rule?.acceptedValues ?? (typeof rule?.value === "string" ? [rule.value] : []),
    manualInstruction: rule?.manualInstruction ?? "",
  };
}

function validateRuleForm(form: RuleFormState) {
  if (!form.label.trim()) return "Nhập tên điều kiện.";
  if (["numeric_threshold", "evidence_count", "evidence_sum"].includes(form.type)) {
    const value = Number(form.value);
    if (!Number.isFinite(value)) return "Nhập giá trị bằng số.";
    if (value < 0) return "Giá trị tối thiểu phải lớn hơn hoặc bằng 0.";
  }
  if (form.type === "numeric_threshold") {
    const scale = Number(form.scale);
    if (!Number.isFinite(scale) || scale <= 0) return "Thang điểm hoặc giới hạn phải lớn hơn 0.";
    if (Number(form.value) > scale) return "Giá trị yêu cầu không được lớn hơn thang đo đã chọn.";
  }
  if (
    form.type === "evidence_count" &&
    (!Number.isInteger(Number(form.value)) || Number(form.value) < 1)
  ) {
    return "Số lượng phải là số nguyên từ 1 trở lên.";
  }
  if (
    form.type === "evidence_sum" &&
    (!form.evidenceLabel.trim() || !form.sumLabel.trim() || Number(form.value) <= 0)
  ) {
    return "Vui lòng nhập loại minh chứng, thông tin cần cộng và tổng yêu cầu lớn hơn 0.";
  }
  if (form.type === "evidence_presence" && !form.evidenceLabel.trim()) {
    return "Vui lòng chọn loại minh chứng được chấp nhận.";
  }
  if (form.type === "organizer_level" && !form.value) return "Chọn cấp tối thiểu.";
  if (form.type === "organizer_level" && !form.contextLabel.trim()) {
    return "Vui lòng mô tả hoạt động hoặc minh chứng cần kiểm tra cấp.";
  }
  if (
    form.type === "date_range" &&
    form.dateMode === "custom" &&
    (!form.startDate || !form.endDate)
  ) {
    return "Chọn đầy đủ ngày bắt đầu và ngày kết thúc.";
  }
  if (form.type === "date_range" && form.dateMode === "custom" && form.endDate < form.startDate) {
    return "Ngày kết thúc phải sau ngày bắt đầu.";
  }
  if (form.type === "enum_match" && form.acceptedValues.length === 0) {
    return "Chọn ít nhất một giá trị được chấp nhận.";
  }
  if (form.type === "enum_match" && !form.contextLabel.trim()) {
    return "Vui lòng mô tả trường hoặc bối cảnh cần so khớp.";
  }
  if (form.type === "manual_confirmation" && !form.manualInstruction.trim()) {
    return "Vui lòng nhập hướng xử lý để Hội đồng xác minh.";
  }
  return "";
}

function ruleFormToInput(form: RuleFormState): RuleInput {
  if (["numeric_threshold", "evidence_count", "evidence_sum"].includes(form.type)) {
    const value = Number(form.value);
    return {
      label: form.label,
      type: form.type,
      operator: form.operator,
      value,
      unit: form.unit,
      scale: form.type === "numeric_threshold" ? Number(form.scale) : undefined,
      metricLabel: form.metricLabel,
      evidenceLabel: form.evidenceLabel,
      contextLabel: form.contextLabel,
      sumLabel: form.sumLabel,
      evidenceCount: form.type === "evidence_count" ? value : undefined,
    };
  }
  if (form.type === "boolean_condition") {
    return { label: form.label, type: form.type, operator: "eq", value: form.value !== "false" };
  }
  if (form.type === "organizer_level") {
    return {
      label: form.label,
      type: form.type,
      operator: "gte",
      value: form.value,
      contextLabel: form.contextLabel,
      evidenceLabel: form.evidenceLabel,
    };
  }
  if (form.type === "date_range") {
    return {
      label: form.label,
      type: form.type,
      operator: "exists",
      dateMode: form.dateMode,
      startDate: form.startDate,
      endDate: form.endDate,
    };
  }
  if (form.type === "enum_match") {
    return {
      label: form.label,
      type: form.type,
      operator: "in",
      acceptedValues: form.acceptedValues,
      contextLabel: form.contextLabel,
    };
  }
  if (form.type === "evidence_presence") {
    return {
      label: form.label,
      type: form.type,
      operator: "exists",
      evidenceLabel: form.evidenceLabel,
    };
  }
  return {
    label: form.label,
    type: form.type,
    operator: "exists",
    manualInstruction: form.manualInstruction,
  };
}

function defaultScaleForRule(rule?: CriterionRule) {
  if (!rule || rule.type !== "numeric_threshold") return "";
  const text = `${rule.unit ?? ""} ${rule.metricLabel ?? ""} ${rule.label}`.toLowerCase();
  if (text.includes("gpa")) return "4";
  if (text.includes("rèn luyện") || text.includes("điểm")) return "100";
  return "";
}

function groupIssuesBySection(issues: CriteriaValidationIssue[]) {
  const grouped = new Map<EditorSectionKey, CriteriaValidationIssue[]>();
  for (const issue of issues) {
    const items = grouped.get(issue.section) ?? [];
    items.push(issue);
    grouped.set(issue.section, items);
  }
  return Array.from(grouped.entries());
}

function getSectionLabel(section: EditorSectionKey) {
  if (section === "other") return "Khác";
  return CORE_CRITERION_SHORT_LABELS[section];
}

function getIssueTargetId(issue: CriteriaValidationIssue) {
  if (issue.ruleId) return getRuleTargetId(issue.ruleId);
  if (issue.groupId) return getGroupTargetId(issue.groupId);
  if (issue.otherEvidenceId) return getOtherTargetId(issue.otherEvidenceId);
  return getSectionTargetId(issue.section);
}

function getSectionTargetId(section: EditorSectionKey) {
  return `criteria-section-${section}`;
}

function getGroupTargetId(groupId: string) {
  return `criteria-group-${groupId}`;
}

function getRuleTargetId(ruleId: string) {
  return `criteria-rule-${ruleId}`;
}

function getOtherTargetId(evidenceId: string) {
  return `criteria-other-${evidenceId}`;
}

function suggestNextSchoolYear(schoolYear: string) {
  const match = schoolYear.match(/(\d{4})\D+(\d{4})/);
  if (!match) return "2027-2028";
  const start = Number(match[1]) + 1;
  const end = Number(match[2]) + 1;
  return `${start}-${end}`;
}
