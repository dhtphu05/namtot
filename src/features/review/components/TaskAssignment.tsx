import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip, Progress } from "@/components/ui-kit";
import { AppIcon } from "@/components/AppIcon";
import { Loader2, RefreshCw } from "lucide-react";
import { useAssignReviewTask, useManagerWorkloads } from "../hooks/useManager";
import { useReviewTasks } from "../hooks/useReview";
import type { OfficerWorkload } from "../api/manager";
import type { ReviewTaskListItem } from "../api/review";

const CRITERION_LABEL: Record<string, string> = {
  ethics: "Đạo đức",
  academic: "Học tập",
  physical: "Thể lực",
  volunteer: "Tình nguyện",
  integration: "Hội nhập",
  priority: "Ưu tiên",
  collective: "Tập thể",
};

const STATUS_LABEL: Record<string, string> = {
  waiting: "Chờ xét",
  reviewing: "Đang xét",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội đồng",
  accepted: "Đạt",
  rejected: "Không đạt",
};

export function TaskAssignment() {
  const workloads = useManagerWorkloads();
  const tasks = useReviewTasks({ assignedToMe: undefined, limit: 100 });
  const assign = useAssignReviewTask();
  const officers = workloads.data?.officers ?? [];
  const reviewTasks = tasks.data?.items ?? [];
  const isLoading = workloads.isLoading || tasks.isLoading;
  const isError = workloads.isError || tasks.isError;

  const reassign = (taskId: string, officerId: string, task: ReviewTaskListItem) => {
    const officer = officers.find((item) => item.id === officerId);
    const needsOverride = officer ? !officer.specializations.includes(task.criterion) : false;
    assign.mutate({
      taskId,
      officerId,
      note: needsOverride ? `Manager override: cán bộ không chuyên trách tiêu chí ${task.criterion}.` : undefined,
    });
  };

  return (
    <>
      <TopBar
        title="Phân công cán bộ xét duyệt"
        subtitle="Dữ liệu workload và task lấy trực tiếp từ backend"
        action={
          <Button
            variant="outline"
            onClick={() => {
              workloads.refetch();
              tasks.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </Button>
        }
      />

      <Card className="mb-4">
        <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-deep">
          <AppIcon name="officer" />
          Workload từng cán bộ
        </h3>
        {workloads.isLoading && <LoadingRow label="Đang tải workload..." />}
        {workloads.isError && <ErrorRow label={(workloads.error as Error)?.message || "Không thể tải workload."} />}
        {!workloads.isLoading && !workloads.isError && (
          <div className="space-y-2">
            {officers.map((officer) => (
              <OfficerWorkloadRow key={officer.id} officer={officer} />
            ))}
            {officers.length === 0 && <Empty label="Chưa có cán bộ xét duyệt hoạt động." />}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-deep">
          <AppIcon name="assign" />
          Phân công / phân công lại task
        </h3>
        {isLoading && <LoadingRow label="Đang tải danh sách task..." />}
        {isError && <ErrorRow label={(tasks.error as Error)?.message || (workloads.error as Error)?.message || "Không thể tải dữ liệu phân công."} />}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-[#F6F9FC] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Đối tượng</th>
                  <th className="px-3 py-2">Tiêu chí</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">Minh chứng</th>
                  <th className="px-3 py-2">Cán bộ phụ trách</th>
                </tr>
              </thead>
              <tbody>
                {reviewTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    officers={officers}
                    pending={assign.isPending}
                    onAssign={(officerId) => reassign(task.id, officerId, task)}
                  />
                ))}
                {reviewTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      Chưa có task để phân công.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function OfficerWorkloadRow({ officer }: { officer: OfficerWorkload }) {
  const total = officer.workload.totalActive;
  return (
    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-[#F6F9FC]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0057C2] font-bold text-white">
        {initials(officer.fullName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-brand-deep">{officer.fullName}</div>
        <div className="text-[11px] text-muted-foreground">
          Chuyên trách: {officer.specializations.map((item) => CRITERION_LABEL[item] ?? item).join(", ") || "Chưa khai báo"}
          {officer.facultyScope ? ` - Khoa ${officer.facultyScope}` : ""}
        </div>
      </div>
      <div className="w-48">
        <Progress value={(total / 25) * 100} />
      </div>
      <span className="w-12 text-right text-[13px] font-bold text-brand-deep">{total}</span>
    </div>
  );
}

function TaskRow({
  task,
  officers,
  pending,
  onAssign,
}: {
  task: ReviewTaskListItem;
  officers: OfficerWorkload[];
  pending: boolean;
  onAssign: (officerId: string) => void;
}) {
  const owner = task.application
    ? `${task.application.student.fullName} (${task.application.student.studentCode ?? "Chưa có MSSV"})`
    : `${task.collectiveProfile?.className ?? "Tập thể"} (${task.collectiveProfile?.representative.fullName ?? "Chưa có đại diện"})`;
  const eligible = officers.filter((officer) => officer.specializations.includes(task.criterion));
  const options = eligible.length > 0 ? eligible : officers;

  return (
    <tr className="border-t border-[#EEF2F7]">
      <td className="px-3 py-2 font-semibold text-brand-deep">{owner}</td>
      <td className="px-3 py-2">
        <Chip tone={task.criterion === "collective" ? "warning" : "brand"}>{CRITERION_LABEL[task.criterion] ?? task.criterion}</Chip>
      </td>
      <td className="px-3 py-2">
        <Chip tone={task.status === "accepted" ? "success" : task.status === "rejected" ? "error" : "muted"}>
          {STATUS_LABEL[task.status] ?? task.status}
        </Chip>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{task.evidenceCount}</td>
      <td className="px-3 py-2">
        <select
          value={task.assignedOfficer?.id ?? ""}
          onChange={(event) => onAssign(event.target.value)}
          disabled={pending || options.length === 0}
          className="rounded-lg bg-[#F6F9FC] px-2 py-1.5 text-[12px] font-semibold text-brand-deep"
        >
          <option value="" disabled>
            Chọn cán bộ
          </option>
          {options.map((officer) => (
            <option key={officer.id} value={officer.id}>
              {officer.fullName}
              {eligible.some((item) => item.id === officer.id) ? "" : " (override)"}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function ErrorRow({ label }: { label: string }) {
  return <div className="py-8 text-center text-sm font-semibold text-rose-600">{label}</div>;
}

function Empty({ label }: { label: string }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{label}</div>;
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
