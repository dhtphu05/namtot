import { CheckCircle2, CircleAlert, ClipboardCheck, FileText, Send, Upload } from "lucide-react";
import { Button, Chip } from "@/components/ui-kit";
import type { ApplicationStatus, PrecheckResult } from "@/lib/api/types";

type StepStatus = "Hoàn thành" | "Đang làm" | "Đang xét duyệt" | "Cần bổ sung" | "Bị khóa";

type StudentFlowState = {
  applicationExists: boolean;
  applicationStatus?: ApplicationStatus | "not_started";
  evidenceCount: number;
  criteriaTouched?: boolean;
  latestPrecheck?: PrecheckResult | null;
  missingWorkCount?: number;
};

export function StudentFlowStepper({
  state,
  onCreate,
  onUpload,
  onPrecheck,
  onSubmit,
  onTrack,
  busy,
}: {
  state: StudentFlowState;
  onCreate?: () => void;
  onUpload?: () => void;
  onPrecheck?: () => void;
  onSubmit?: () => void;
  onTrack?: () => void;
  busy?: boolean;
}) {
  const needsSupplement =
    state.applicationStatus === "supplement_required" ||
    String(state.applicationStatus) === "draft_supplement";
  const finalDone = hasFinalResult(state.applicationStatus);
  const inReview = isInReview(state.applicationStatus);
  const hasMissingWork = (state.missingWorkCount ?? 0) > 0;
  const steps = [
    {
      label: "Tạo hồ sơ",
      icon: FileText,
      status: state.applicationExists ? "Hoàn thành" : "Đang làm",
      actionLabel: "Tạo hồ sơ",
      action: onCreate,
    },
    {
      label: "Điền 5 tiêu chí",
      icon: ClipboardCheck,
      status: !state.applicationExists
        ? "Bị khóa"
        : state.criteriaTouched
          ? "Hoàn thành"
          : "Đang làm",
      actionLabel: "Điền 5 tiêu chí",
      action: onUpload,
    },
    {
      label: "Thêm minh chứng",
      icon: Upload,
      status: !state.applicationExists
        ? "Bị khóa"
        : state.evidenceCount > 0
          ? needsSupplement
            ? "Cần bổ sung"
            : "Hoàn thành"
          : "Đang làm",
      actionLabel: "Thêm minh chứng",
      action: onUpload,
    },
    {
      label: "Kiểm tra hồ sơ",
      icon: ClipboardCheck,
      status: !state.applicationExists
        ? "Bị khóa"
        : state.latestPrecheck
          ? "Hoàn thành"
          : "Đang làm",
      actionLabel: "Kiểm tra lại",
      action: onPrecheck,
    },
    {
      label: finalDone
        ? "Hoàn thành"
        : needsSupplement
          ? "Cần bổ sung"
          : inReview
            ? "Đang xét duyệt"
            : hasMissingWork
              ? "Chưa thể nộp"
              : "Nộp / Theo dõi",
      icon: Send,
      status:
        !state.applicationExists || finalDone || inReview || needsSupplement
          ? finalDone
            ? "Hoàn thành"
            : needsSupplement
              ? "Cần bổ sung"
              : inReview
                ? "Đang xét duyệt"
                : "Bị khóa"
          : hasMissingWork
            ? "Đang làm"
            : state.latestPrecheck
              ? "Đang làm"
              : "Bị khóa",
      actionLabel:
        finalDone || inReview || needsSupplement
          ? "Theo dõi xét duyệt"
          : hasMissingWork
            ? "Hoàn thiện phần còn thiếu"
            : "Nộp hồ sơ",
      action:
        finalDone || inReview || needsSupplement ? onTrack : hasMissingWork ? onUpload : onSubmit,
    },
  ] satisfies Array<{
    label: string;
    icon: typeof FileText;
    status: StepStatus;
    actionLabel: string;
    action?: () => void;
  }>;

  const active = steps.find((step) => step.status === "Đang làm" || step.status === "Cần bổ sung");

  return (
    <div className="rounded-xl border border-[#E3ECF6] bg-white/85 px-3 py-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-brand-deep">Lộ trình hồ sơ</h3>
          {active ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Bước hiện tại: {active.label}
            </p>
          ) : null}
        </div>
        {active?.action && (
          <Button size="sm" onClick={active.action} disabled={busy || active.status === "Bị khóa"}>
            {active.actionLabel}
          </Button>
        )}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <button
              key={step.label}
              className="inline-flex min-h-8 shrink-0 items-center gap-2 rounded-full border border-[#E3ECF6] bg-[#F8FBFE] px-2.5 py-1 text-left transition-colors hover:bg-[#F1F7FD] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={step.action}
              disabled={!step.action || busy || step.status === "Bị khóa"}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#0057C2]">
                {step.status === "Hoàn thành" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">{index + 1}</span>
              <span className="text-xs font-bold text-brand-deep">{step.label}</span>
              <StatusChip status={step.status} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: StepStatus }) {
  if (status === "Hoàn thành") return <Chip tone="success">Hoàn thành</Chip>;
  if (status === "Đang làm") return <Chip tone="brand">Đang làm</Chip>;
  if (status === "Đang xét duyệt") return <Chip tone="brand">Đang xét duyệt</Chip>;
  if (status === "Cần bổ sung") return <Chip tone="warning">Cần bổ sung</Chip>;
  return (
    <Chip tone="muted">
      <CircleAlert className="h-3 w-3" /> Bị khóa
    </Chip>
  );
}

function isInReview(status?: ApplicationStatus | "not_started") {
  return status === "submitted" || status === "under_review" || status === "resolution_needed";
}

function hasFinalResult(status?: ApplicationStatus | "not_started") {
  return status === "completed" || status === "rejected";
}
