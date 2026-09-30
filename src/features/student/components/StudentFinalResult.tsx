import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FileText, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import {
  getFinalStatusLabel,
  getReviewTaskStatusLabel,
  getStudentApplicationStatusLabel,
  getStatusTone,
} from "@/lib/status-labels";
import {
  criterionLabel,
  levelLabel,
  type ApplicationReviewTaskSummary,
  type Level,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const resultToneClass = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  brand: "border-blue-200 bg-blue-50 text-blue-700",
  muted: "border-slate-200 bg-slate-50 text-slate-600",
};

export function StudentFinalResult() {
  const currentApplication = useCurrentApplication();
  const application = currentApplication.data?.application ?? null;
  const isFinalized = Boolean(application?.finalizedAt && application.finalStatus !== "pending");
  const finalTone = getStatusTone(application?.finalStatus ?? application?.status);

  if (currentApplication.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-[8px] border border-slate-200 bg-white" />
        <div className="h-64 rounded-[8px] border border-slate-200 bg-white" />
      </div>
    );
  }

  if (currentApplication.isError) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" aria-hidden="true" />
          <div>
            <h1 className="text-[22px] font-bold text-slate-950">Không tải được kết quả</h1>
            <p className="mt-1 text-[15px] leading-6 text-slate-600">
              Vui lòng thử tải lại trang hoặc kiểm tra kết nối.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!application) {
    return (
      <section className="rounded-[8px] border border-slate-200 bg-white p-5">
        <h1 className="text-[26px] font-bold text-slate-950">Kết quả</h1>
        <p className="mt-2 text-[15px] leading-6 text-slate-600">
          Bạn chưa có hồ sơ để xem kết quả.
        </p>
        <Link
          to="/app/application"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#0057C2] px-4 text-[15px] font-semibold text-white"
        >
          Bắt đầu hồ sơ
        </Link>
      </section>
    );
  }

  const reviewTasks = (application.reviewTasks ?? []).filter((task) =>
    Boolean(task.criterion && criterionLabel[task.criterion]),
  );

  if (!isFinalized) {
    return (
      <div className="mx-auto w-full max-w-[1040px]">
        <section className="rounded-[8px] border border-slate-200 bg-white p-4 sm:p-5">
          <h1 className="text-[24px] font-bold leading-8 text-slate-950">Kết quả</h1>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {getStudentApplicationStatusLabel(application.status)}
          </p>
          <p className="mt-3 text-sm leading-5 text-slate-600">
            Kết quả sẽ hiển thị sau khi hồ sơ được xét và chốt.
          </p>
          <Link
            to="/app/application"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-[#EAF3FF] px-4 text-sm font-semibold text-[#0057C2]"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Quay lại hồ sơ
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-5">
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight text-slate-950">Kết quả</h1>
          </div>
          <StatusBadge tone={finalTone}>{getFinalStatusLabel(application.finalStatus)}</StatusBadge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultFact label="Năm học" value={application.schoolYear} />
          <ResultFact label="Cấp đăng ký" value={formatLevel(application.targetLevel)} />
          <ResultFact
            label="Kết quả cuối"
            value={
              isFinalized
                ? formatFinalResult(application.finalStatus, application.finalLevel)
                : "Chưa chốt"
            }
          />
          <ResultFact label="Thời gian chốt" value={formatDate(application.finalizedAt)} />
        </div>

        {application.finalNote ? (
          <div className="mt-5 rounded-[8px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-[13px] font-semibold uppercase text-slate-500">
              Ghi chú kết quả
            </div>
            <p className="mt-1 text-[15px] leading-6 text-slate-800">{application.finalNote}</p>
          </div>
        ) : null}
      </section>

      {reviewTasks.length ? (
        <section className="rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#0057C2]" aria-hidden="true" />
            <h2 className="text-[20px] font-bold text-slate-950">Tóm tắt tiêu chí</h2>
          </div>
          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {reviewTasks.map((task) => (
              <CriterionResultRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/app/application"
          className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-[#EAF3FF] px-4 text-[15px] font-semibold text-[#0057C2]"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          Xem hồ sơ
        </Link>
        <Link
          to="/app/feedback"
          className="inline-flex min-h-11 items-center justify-center rounded-[8px] px-4 text-[15px] font-semibold text-[#0057C2] hover:bg-[#F8FAFC]"
        >
          Xem phản hồi
        </Link>
      </div>
    </div>
  );
}

function CriterionResultRow({ task }: { task: ApplicationReviewTaskSummary }) {
  const tone = getStatusTone(task.status);
  return (
    <div className="flex min-h-16 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-semibold text-slate-950">{criterionLabel[task.criterion]}</div>
        {task.officerNote || task.decisionReason ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600">
            {task.officerNote ?? task.decisionReason}
          </p>
        ) : null}
      </div>
      <StatusBadge tone={tone}>{getReviewTaskStatusLabel(task.status)}</StatusBadge>
    </div>
  );
}

function ResultFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
      <div className="text-[13px] font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-[15px] font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function StatusBadge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 w-fit items-center gap-1 rounded-full border px-3 text-[13px] font-semibold",
        resultToneClass[tone as keyof typeof resultToneClass] ?? resultToneClass.muted,
      )}
    >
      {tone === "success" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function formatFinalResult(status?: string | null, level?: Level | null) {
  if (status === "passed" && level) return `Đạt ${formatLevel(level)}`;
  if (status === "partially_passed" && level) return `Đạt cấp thấp hơn: ${formatLevel(level)}`;
  if (status === "failed") return "Chưa đạt";
  return getFinalStatusLabel(status);
}

function formatLevel(level?: Level | null) {
  return level ? levelLabel[level] : "--";
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
