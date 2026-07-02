import { CheckCircle2, CircleAlert, FileText, Lock, Send, Sparkles, Upload } from "lucide-react";
import { Button, Chip } from "@/components/ui-kit";
import type { ApplicationStatus, PrecheckResult } from "@/lib/api/types";

type StepStatus = "Hoàn thành" | "Đang làm" | "Cần bổ sung" | "Bị khóa" | "Chờ cán bộ";

type StudentFlowState = {
  applicationExists: boolean;
  applicationStatus?: ApplicationStatus | "not_started";
  evidenceCount: number;
  latestPrecheck?: PrecheckResult | null;
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
  const submitted = isSubmitted(state.applicationStatus);
  const needsSupplement = state.applicationStatus === "supplement_required";
  const steps = [
    {
      label: "Tạo hồ sơ",
      icon: FileText,
      status: state.applicationExists ? "Hoàn thành" : "Đang làm",
      actionLabel: "Tạo hồ sơ",
      action: onCreate,
    },
    {
      label: "Upload minh chứng",
      icon: Upload,
      status: !state.applicationExists
        ? "Bị khóa"
        : state.evidenceCount > 0
          ? needsSupplement
            ? "Cần bổ sung"
            : "Hoàn thành"
          : "Đang làm",
      actionLabel: "Upload minh chứng",
      action: onUpload,
    },
    {
      label: "Chạy tiền kiểm",
      icon: Sparkles,
      status: !state.applicationExists || state.evidenceCount === 0
        ? "Bị khóa"
        : state.latestPrecheck
          ? "Hoàn thành"
          : "Đang làm",
      actionLabel: "Chạy tiền kiểm",
      action: onPrecheck,
    },
    {
      label: "Nộp hồ sơ",
      icon: Send,
      status: !state.applicationExists || submitted
        ? submitted
          ? "Hoàn thành"
          : "Bị khóa"
        : state.latestPrecheck
          ? "Đang làm"
          : "Bị khóa",
      actionLabel: "Nộp hồ sơ",
      action: onSubmit,
    },
    {
      label: "Theo dõi xét duyệt",
      icon: CheckCircle2,
      status: submitted ? "Chờ cán bộ" : "Bị khóa",
      actionLabel: "Theo dõi xét duyệt",
      action: onTrack,
    },
  ] satisfies Array<{
    label: string;
    icon: typeof FileText;
    status: StepStatus;
    actionLabel: string;
    action?: () => void;
  }>;

  const active = steps.find((step) => step.status === "Đang làm" || step.status === "Cần bổ sung") ?? steps.find((step) => step.status === "Chờ cán bộ");

  return (
    <div className="rounded-xl border border-[#E3ECF6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-brand-deep">Lộ trình hồ sơ SV5T</h3>
          <p className="mt-1 text-xs text-muted-foreground">AI gợi ý, cán bộ xác nhận kết quả cuối cùng.</p>
        </div>
        {active?.action && (
          <Button size="sm" onClick={active.action} disabled={busy || active.status === "Bị khóa"}>
            {active.actionLabel}
          </Button>
        )}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <button
              key={step.label}
              className="min-h-[112px] rounded-lg border border-[#E3ECF6] bg-[#F8FBFE] p-3 text-left transition-colors hover:bg-[#F1F7FD] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={step.action}
              disabled={!step.action || busy || step.status === "Bị khóa"}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0057C2]">
                  {step.status === "Bị khóa" ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
              </div>
              <div className="mt-3 text-sm font-bold text-brand-deep">{step.label}</div>
              <div className="mt-2">
                <StatusChip status={step.status} />
              </div>
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
  if (status === "Cần bổ sung") return <Chip tone="warning">Cần bổ sung</Chip>;
  if (status === "Chờ cán bộ") return <Chip tone="warning">Chờ cán bộ</Chip>;
  return (
    <Chip tone="muted">
      <CircleAlert className="h-3 w-3" /> Bị khóa
    </Chip>
  );
}

function isSubmitted(status?: ApplicationStatus | "not_started") {
  return status === "submitted" || status === "under_review" || status === "completed" || status === "rejected" || status === "resolution_needed";
}

