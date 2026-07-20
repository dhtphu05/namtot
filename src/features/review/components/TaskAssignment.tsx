import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EmptyReviewState } from "./EmptyReviewState";

export function TaskAssignment() {
  return (
    <>
      <TopBar
        title="Phân công cán bộ"
        subtitle="Theo dõi workload và phân bổ tác vụ xét duyệt theo dữ liệu backend."
      />
      <Card>
        <EmptyReviewState
          title="Trang phân công đã được chuyển sang phiên bản mới"
          description="Vui lòng mở trang phân công chính để xem workload cán bộ và phân bổ theo tiêu chí."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link to="/app/assignment">
              Mở trang phân công
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
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
          Chuyên trách:{" "}
          {officer.specializations.map((item) => CRITERION_LABEL[item] ?? item).join(", ") ||
            "Chưa khai báo"}
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
    ? `${task.application.student?.fullName ?? "Chưa có dữ liệu"} (${task.application.student?.studentCode ?? "Chưa có MSSV"})`
    : `${task.collectiveProfile?.className ?? "Tập thể"} (${task.collectiveProfile?.representative?.fullName ?? "Chưa có đại diện"})`;
  const eligible = officers.filter((officer) => officer.specializations.includes(task.criterion));
  const options = eligible.length > 0 ? eligible : officers;

  return (
    <tr className="border-t border-[#EEF2F7]">
      <td className="px-3 py-2 font-semibold text-brand-deep">{owner}</td>
      <td className="px-3 py-2">
        <Chip tone={task.criterion === "collective" ? "warning" : "brand"}>
          {CRITERION_LABEL[task.criterion] ?? task.criterion}
        </Chip>
      </td>
      <td className="px-3 py-2">
        <Chip
          tone={
            task.status === "accepted" ? "success" : task.status === "rejected" ? "error" : "muted"
          }
        >
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
