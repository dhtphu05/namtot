import type { AwardDecision, AwardRosterProcessing } from "@/types/award-registry";

type WorkflowStep = {
  label: string;
  description: string;
  state: "complete" | "current" | "upcoming";
};

function getAwardWorkflowSteps(
  decision: Pick<AwardDecision, "status" | "decisionFile" | "rosterFile">,
  processing?: AwardRosterProcessing,
): WorkflowStep[] {
  const hasPreview = processing?.status === "preview_ready";
  const isConfirmed = decision.status === "CONFIRMED";
  const isArchived = decision.status === "ARCHIVED";
  return [
    {
      label: "Thông tin quyết định",
      description: "Số, ngày và năm học",
      state: "complete",
    },
    {
      label: "Văn bản quyết định",
      description: decision.decisionFile ? "Đã tải tài liệu căn cứ" : "Cần tải tài liệu căn cứ",
      state: decision.decisionFile ? "complete" : "current",
    },
    {
      label: "Danh sách sinh viên được công nhận",
      description: decision.rosterFile ? "Đã tải danh sách" : "Cần tải danh sách",
      state: decision.rosterFile ? "complete" : decision.decisionFile ? "current" : "upcoming",
    },
    {
      label: "Kiểm tra dữ liệu",
      description: hasPreview
        ? "Đã có dữ liệu để kiểm tra"
        : processing?.status === "processing"
          ? "Hệ thống đang đọc danh sách"
          : "Hệ thống sẽ đọc và đối chiếu danh sách",
      state: hasPreview
        ? "complete"
        : processing?.status === "processing" || decision.rosterFile
          ? "current"
          : "upcoming",
    },
    {
      label: "Xác nhận",
      description: isConfirmed
        ? "Dữ liệu đã trở thành chính thức"
        : isArchived
          ? "Đang lưu trữ; dữ liệu không còn hiệu lực sử dụng"
          : "Xác nhận sau khi xử lý hết các vấn đề",
      state: isConfirmed || isArchived ? "complete" : hasPreview ? "current" : "upcoming",
    },
  ];
}

export function AwardWorkflowProgress({
  decision,
  processing,
}: {
  decision: Pick<AwardDecision, "status" | "decisionFile" | "rosterFile">;
  processing?: AwardRosterProcessing;
}) {
  const steps = getAwardWorkflowSteps(decision, processing);

  return (
    <section
      className="mb-4 rounded-xl border border-slate-200 bg-white p-3"
      aria-labelledby="award-workflow-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="award-workflow-title" className="mt-1 text-base font-semibold text-slate-950">
            Tiến độ hoàn thiện quyết định
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Theo dõi phần đã hoàn tất và việc cần làm tiếp theo.
        </p>
      </div>
      <ol className="mt-3 grid gap-2 md:grid-cols-5">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={`rounded-lg border p-2.5 ${
              step.state === "complete"
                ? "border-emerald-200 bg-emerald-50/60"
                : step.state === "current"
                  ? "border-sky-200 bg-sky-50/70"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.state === "complete"
                    ? "bg-emerald-600 text-white"
                    : step.state === "current"
                      ? "bg-sky-700 text-white"
                      : "bg-slate-200 text-slate-600"
                }`}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="text-xs font-semibold text-slate-900">{step.label}</span>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-slate-600">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
