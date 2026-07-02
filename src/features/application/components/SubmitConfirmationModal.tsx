import { Loader2, Send, X } from "lucide-react";
import { Button, Chip, Progress } from "@/components/ui-kit";
import type { ApplicationState, Criterion, Level, PrecheckResult } from "@/lib/api/types";
import { studentCriterionLabel } from "@/features/evidence/components/student-evidence-utils";

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp ĐHĐN",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const criteria: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

export function SubmitConfirmationModal({
  application,
  precheck,
  evidenceCounts,
  onCancel,
  onConfirm,
  pending,
}: {
  application: ApplicationState;
  precheck?: PrecheckResult | null;
  evidenceCounts: Partial<Record<Criterion, number>>;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const readinessScore = precheck?.readinessScore ?? application.readinessScore ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E3ECF6] px-5 py-4">
          <div>
            <Chip tone="warning">Kiểm tra trước khi nộp</Chip>
            <h3 className="mt-2 text-xl font-bold text-brand-deep">Xác nhận nộp hồ sơ</h3>
            <p className="mt-1 text-sm text-muted-foreground">Sau khi nộp, hồ sơ sẽ được khóa để cán bộ xét duyệt.</p>
          </div>
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-deep disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock label="Cấp đăng ký" value={levelLabel[application.targetLevel]} />
            <InfoBlock label="Trạng thái hiện tại" value={application.status} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-brand-deep">Mức sẵn sàng hiện tại</span>
              <b>{readinessScore}%</b>
            </div>
            <Progress value={readinessScore} />
          </div>

          <div>
            <h4 className="font-bold text-brand-deep">Tóm tắt 5 tiêu chí</h4>
            <div className="mt-3 grid gap-2">
              {criteria.map((criterion) => {
                const result = precheck?.criteriaResults?.find((item) => item.criterion === criterion);
                const count = evidenceCounts[criterion] ?? 0;
                const label = getCriterionSubmitLabel(count, result?.status, result?.warnings?.length);
                return (
                  <div key={criterion} className="flex items-center justify-between gap-3 rounded-lg bg-[#F6F9FC] px-3 py-2">
                    <span className="text-sm font-semibold text-brand-deep">{studentCriterionLabel[criterion]}</span>
                    <Chip tone={label.tone}>{label.text}</Chip>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Sau khi nộp, hồ sơ sẽ được khóa. Bạn chỉ có thể chỉnh sửa khi cán bộ yêu cầu bổ sung.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E3ECF6] px-5 py-4">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Quay lại bổ sung
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Xác nhận nộp hồ sơ
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F6F9FC] px-3 py-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold text-brand-deep">{value}</div>
    </div>
  );
}

function getCriterionSubmitLabel(count: number, status?: string, warningCount?: number) {
  if (!count) return { text: "Chưa có minh chứng", tone: "warning" as const };
  if (warningCount) return { text: "Cần cán bộ xác nhận", tone: "warning" as const };
  if (status === "passed" || status === "pending" || status === "passed_with_warning") {
    return { text: "Đủ dữ liệu", tone: "success" as const };
  }
  if (status === "failed") return { text: "Cần bổ sung", tone: "warning" as const };
  return { text: "Cần cán bộ xác nhận", tone: "brand" as const };
}

