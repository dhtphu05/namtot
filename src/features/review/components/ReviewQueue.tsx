import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { ChevronRight, Filter, Loader2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useReviewTasks } from "../hooks/useReview";
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

const LEVEL_LABEL: Record<string, string> = {
  school: "Cấp trường",
  university: "Cấp ĐH Đà Nẵng",
  city: "Cấp thành phố",
  central: "Cấp Trung ương",
};

const TASK_STATUS: Record<string, { label: string; tone: "brand" | "success" | "warning" | "error" | "muted" }> = {
  waiting: { label: "Chờ xét", tone: "muted" },
  reviewing: { label: "Đang xét", tone: "brand" },
  supplement_required: { label: "Cần bổ sung", tone: "warning" },
  resolution_needed: { label: "Cần hội đồng", tone: "warning" },
  accepted: { label: "Đạt tiêu chí", tone: "success" },
  rejected: { label: "Không đạt", tone: "error" },
};

const CRITERIA = ["ethics", "academic", "physical", "volunteer", "integration", "priority", "collective"];

export function ReviewQueue() {
  const [criterion, setCriterion] = useState("all");
  const [status, setStatus] = useState("all");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({
      criterion: criterion === "all" ? undefined : criterion,
      status: status === "all" ? undefined : status,
      assignedToMe: scope === "mine" ? true : undefined,
      q: search.trim() || undefined,
      page: 1,
      limit: 50,
    }),
    [criterion, search, scope, status],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useReviewTasks(filters);
  const tasks = data?.items ?? [];

  return (
    <>
      <TopBar
        title="Không gian xét duyệt chuyên trách"
        subtitle="Danh sách task từ backend, phân quyền theo tài khoản đang đăng nhập"
        action={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tải lại
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Tab active={criterion === "all"} onClick={() => setCriterion("all")}>
          Tất cả
        </Tab>
        {CRITERIA.map((item) => (
          <Tab key={item} active={criterion === item} onClick={() => setCriterion(item)}>
            {CRITERION_LABEL[item]}
          </Tab>
        ))}
      </div>

      <Card className="!p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="mr-1 text-[12px] font-semibold text-muted-foreground">Lọc:</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg bg-[#F6F9FC] px-3 py-1.5 text-[12px] font-semibold text-brand-deep"
          >
            <option value="all">Mọi trạng thái</option>
            {Object.entries(TASK_STATUS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as "mine" | "all")}
            className="rounded-lg bg-[#F6F9FC] px-3 py-1.5 text-[12px] font-semibold text-brand-deep"
          >
            <option value="mine">Task của tôi</option>
            <option value="all">Tất cả task được phép xem</option>
          </select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sinh viên, MSSV, lớp, tập thể..."
              className="w-full rounded-lg bg-[#F6F9FC] py-1.5 pl-8 pr-3 text-[12px] font-semibold text-brand-deep"
            />
          </div>
        </div>
      </Card>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[#F6F9FC] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Đối tượng</th>
                <th className="px-3 py-2.5">Tiêu chí</th>
                <th className="px-3 py-2.5">Cấp aim</th>
                <th className="px-3 py-2.5">Minh chứng</th>
                <th className="px-3 py-2.5">Cán bộ</th>
                <th className="px-3 py-2.5">Trạng thái</th>
                <th className="px-3 py-2.5">Hạn</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-brand-deep/50" />
                    <div className="text-xs text-muted-foreground">Đang tải danh sách task...</div>
                  </td>
                </tr>
              )}
              {isError && !isLoading && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-rose-600">
                    {(error as Error)?.message || "Có lỗi xảy ra khi tải danh sách xét duyệt."}
                  </td>
                </tr>
              )}
              {!isLoading &&
                !isError &&
                tasks.map((task) => <ReviewTaskRow key={task.id} task={task} />)}
              {!isLoading && !isError && tasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    Không có task phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function ReviewTaskRow({ task }: { task: ReviewTaskListItem }) {
  const owner = getOwner(task);
  const status = TASK_STATUS[task.status] ?? TASK_STATUS.waiting;
  return (
    <tr className="border-t border-[#EEF2F7] hover:bg-[#F6F9FC]">
      <td className="px-3 py-2.5">
        <div className="font-semibold text-brand-deep">{owner.title}</div>
        <div className="text-[11px] text-muted-foreground">{owner.subtitle}</div>
      </td>
      <td className="px-3 py-2.5">
        <Chip tone={task.criterion === "collective" ? "warning" : "brand"}>
          {CRITERION_LABEL[task.criterion] ?? task.criterion}
        </Chip>
      </td>
      <td className="px-3 py-2.5 text-[11.5px]">{owner.level}</td>
      <td className="px-3 py-2.5 text-[11.5px]">{task.evidenceCount} minh chứng</td>
      <td className="px-3 py-2.5 text-[11.5px]">{task.assignedOfficer?.fullName ?? "Chưa phân công"}</td>
      <td className="px-3 py-2.5">
        <Chip tone={status.tone}>{status.label}</Chip>
      </td>
      <td className="px-3 py-2.5 text-[11.5px]">{formatDate(task.dueDate)}</td>
      <td className="px-3 py-2.5 text-right">
        <Link
          to="/app/review/$id"
          params={{ id: task.id }}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0057C2] hover:underline"
        >
          Mở
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}

function getOwner(task: ReviewTaskListItem) {
  if (task.application) {
    return {
      title: task.application.student.fullName,
      subtitle: `${task.application.student.studentCode ?? "Chưa có MSSV"} - ${task.application.student.className ?? task.application.student.faculty ?? "Chưa có lớp"}`,
      level: LEVEL_LABEL[task.application.targetLevel] ?? task.application.targetLevel,
    };
  }
  if (task.collectiveProfile) {
    return {
      title: task.collectiveProfile.className,
      subtitle: `Tập thể - đại diện ${task.collectiveProfile.representative.fullName}`,
      level: LEVEL_LABEL[task.collectiveProfile.targetLevel] ?? task.collectiveProfile.targetLevel,
    };
  }
  return { title: "Không xác định", subtitle: "Task thiếu chủ sở hữu", level: "-" };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
        active
          ? "bg-[#0057C2] text-white"
          : "border border-[#EEF2F7] bg-white text-brand-deep hover:bg-[#F1F7FD]"
      }`}
    >
      {children}
    </button>
  );
}
