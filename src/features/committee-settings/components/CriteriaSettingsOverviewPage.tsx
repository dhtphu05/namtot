import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, MoreHorizontal, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/features/auth/store/auth-store";
import {
  useCloneCriteriaDraft,
  useCreateCriteriaDraft,
  useCriteriaConfigurations,
  useResetCriteriaDemo,
  isDuplicateDraftError,
} from "../hooks";
import {
  DUT_COMMITTEE_REVIEW_LEVEL,
  DUT_COMMITTEE_UNIT_NAME,
  type CriteriaConfigurationSummary,
} from "../types";
import { canManageCriteriaSettings } from "../permissions";

type DraftSourceMode = "active" | "previous" | "basic";

export function CriteriaSettingsOverviewPage() {
  const user = useAuth((state) => state.user);

  if (!canManageCriteriaSettings(user?.role)) {
    return (
      <>
        <TopBar
          title="Cấu hình xét chọn"
          subtitle="Quản lý điều kiện xét chọn theo từng năm học."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Chức năng này dành cho Hội đồng.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Các vai trò khác tiếp tục sử dụng điều hướng hiện có.
            </div>
          </div>
        </Card>
      </>
    );
  }

  return <CriteriaSettingsOverviewContent />;
}

function CriteriaSettingsOverviewContent() {
  const configurationsQuery = useCriteriaConfigurations();
  const resetDemo = useResetCriteriaDemo();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const summaries = configurationsQuery.data ?? [];
  const published = summaries.find((item) => item.status === "published");
  const draft = summaries.find((item) => item.status === "draft");
  const archived = summaries.filter((item) => item.status === "archived");

  return (
    <>
      <TopBar
        title="Cấu hình xét chọn"
        subtitle="Quản lý điều kiện xét chọn theo từng năm học."
        action={
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Tạo bộ tiêu chí
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Mở tác vụ phụ"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--brand-primary)] shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-[var(--brand-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]/25"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setResetDialogOpen(true)}
                  disabled={resetDemo.isPending}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Đặt lại dữ liệu demo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="mb-5 rounded-lg border border-[#DCE7F2] bg-white px-4 py-3 text-sm text-muted-foreground">
        <div className="font-semibold text-brand-deep">{DUT_COMMITTEE_UNIT_NAME}</div>
        <div className="mt-1">
          {DUT_COMMITTEE_REVIEW_LEVEL} · Bản mô phỏng giao diện - thay đổi chưa ảnh hưởng đến quy
          trình xét duyệt thực tế.
        </div>
      </div>

      {configurationsQuery.isLoading ? (
        <OverviewSkeleton />
      ) : configurationsQuery.isError ? (
        <Card>
          <div className="py-8 text-center">
            <div className="font-semibold text-brand-deep">Chưa tải được cấu hình xét chọn.</div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void configurationsQuery.refetch()}
            >
              Thử lại
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          <PublishedSection configuration={published} onCreate={() => setCreateDialogOpen(true)} />
          <DraftSection configuration={draft} />
          <HistorySection configurations={archived} />
        </div>
      )}

      <CreateDraftDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        configurations={summaries}
      />
      <ResetDemoDialog
        open={resetDialogOpen}
        isPending={resetDemo.isPending}
        onOpenChange={setResetDialogOpen}
        onConfirm={() =>
          resetDemo.mutate(undefined, {
            onSuccess: () => setResetDialogOpen(false),
          })
        }
      />
    </>
  );
}

function PublishedSection({
  configuration,
  onCreate,
}: {
  configuration?: CriteriaConfigurationSummary;
  onCreate: () => void;
}) {
  return (
    <section className="rounded-lg border border-[#DCE7F2] bg-white">
      <SectionHeading title="Đang áp dụng" />
      {configuration ? (
        <div className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-brand-deep">
                  Năm học {configuration.schoolYear}
                </h2>
                <Chip tone="success">Đang áp dụng</Chip>
              </div>
              <p className="mt-2 text-sm font-semibold text-brand-deep">
                Đủ {configuration.coreCriteriaCount} tiêu chí
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {configuration.criteriaLabels.join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link
                  to="/app/committee/settings/criteria/$configurationId"
                  params={{ configurationId: configuration.id }}
                  search={{ section: "ethics" }}
                >
                  Xem cấu hình
                </Link>
              </Button>
              <Button type="button" variant="secondary" onClick={onCreate}>
                <Copy className="h-4 w-4" />
                Tạo bản nháp từ bộ này
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <EmptyState title="Chưa có bộ tiêu chí đang áp dụng." />
        </div>
      )}
    </section>
  );
}

function DraftSection({ configuration }: { configuration?: CriteriaConfigurationSummary }) {
  return (
    <section className="rounded-lg border border-[#DCE7F2] bg-white">
      <SectionHeading title="Đang chuẩn bị" />
      {configuration ? (
        <div className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-brand-deep">
                Bộ tiêu chí năm học {configuration.schoolYear}
              </h2>
              <p className="mt-2 text-sm font-semibold text-amber-700">
                Còn {configuration.validationIssues.length} vấn đề cần xử lý
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {configuration.validationIssues.map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            </div>
            <Button asChild>
              <Link
                to="/app/committee/settings/criteria/$configurationId"
                params={{ configurationId: configuration.id }}
                search={{ section: "ethics" }}
              >
                Tiếp tục cấu hình
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <EmptyState title="Chưa có bản nháp đang chuẩn bị." />
        </div>
      )}
    </section>
  );
}

function HistorySection({ configurations }: { configurations: CriteriaConfigurationSummary[] }) {
  return (
    <section className="rounded-lg border border-[#DCE7F2] bg-white">
      <SectionHeading title="Lịch sử các năm trước" />
      <div className="divide-y divide-[#E5E7EB]">
        {configurations.length ? (
          configurations.map((configuration) => (
            <div
              key={configuration.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-[92px] text-sm font-bold text-brand-deep">
                  {configuration.schoolYear}
                </div>
                <Chip tone="muted">Đã lưu trữ</Chip>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/app/committee/settings/criteria/$configurationId"
                  params={{ configurationId: configuration.id }}
                  search={{ section: "ethics" }}
                >
                  Xem
                </Link>
              </Button>
            </div>
          ))
        ) : (
          <div className="p-5 text-sm text-muted-foreground">Chưa có dữ liệu các năm trước.</div>
        )}
      </div>
    </section>
  );
}

function CreateDraftDialog({
  configurations,
  onOpenChange,
  open,
}: {
  configurations: CriteriaConfigurationSummary[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const navigate = useNavigate();
  const createDraft = useCreateCriteriaDraft();
  const cloneDraft = useCloneCriteriaDraft();
  const [schoolYear, setSchoolYear] = useState("2027–2028");
  const [sourceMode, setSourceMode] = useState<DraftSourceMode>("active");
  const [duplicateDraftId, setDuplicateDraftId] = useState<string | null>(null);

  const published = useMemo(
    () => configurations.find((item) => item.status === "published"),
    [configurations],
  );
  const previous = useMemo(
    () => configurations.find((item) => item.status === "archived"),
    [configurations],
  );

  const selectedSchoolYearAlreadyHasDraft = configurations.some(
    (item) => item.schoolYear === schoolYear && item.status === "draft",
  );
  const existingDraft = configurations.find(
    (item) => item.schoolYear === schoolYear && item.status === "draft",
  );
  const effectiveDuplicateDraftId = duplicateDraftId ?? existingDraft?.id ?? null;

  async function submit() {
    if (selectedSchoolYearAlreadyHasDraft && existingDraft) {
      setDuplicateDraftId(existingDraft.id);
      return;
    }

    try {
      const configuration =
        sourceMode === "basic"
          ? await createDraft.mutateAsync({ schoolYear })
          : await cloneDraft.mutateAsync({
              sourceConfigurationId:
                sourceMode === "previous" && previous ? previous.id : (published?.id ?? ""),
              targetSchoolYear: schoolYear,
            });
      toast.success("Đã tạo bản nháp.");
      onOpenChange(false);
      setDuplicateDraftId(null);
      void navigate({
        to: "/app/committee/settings/criteria/$configurationId",
        params: { configurationId: configuration.id },
        search: { section: "ethics" },
      });
    } catch (error) {
      if (isDuplicateDraftError(error)) {
        setDuplicateDraftId(error.draftId);
        return;
      }
      toast.error("Chưa thể tạo bản nháp. Vui lòng thử lại.");
    }
  }

  function openDuplicate() {
    if (!effectiveDuplicateDraftId) return;
    onOpenChange(false);
    void navigate({
      to: "/app/committee/settings/criteria/$configurationId",
      params: { configurationId: effectiveDuplicateDraftId },
      search: { section: "ethics" },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setDuplicateDraftId(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo bản nháp tiêu chí</DialogTitle>
          <DialogDescription>Chọn năm học và nguồn khởi tạo cho bộ tiêu chí mới.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <label className="block text-sm font-semibold text-brand-deep">
            Năm học
            <input
              value={schoolYear}
              onChange={(event) => {
                setSchoolYear(event.target.value);
                setDuplicateDraftId(null);
              }}
              className="mt-2 h-10 w-full rounded-lg border border-[#DCE7F2] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0057C2]/20"
            />
          </label>

          <label className="block text-sm font-semibold text-brand-deep">
            Khởi tạo từ
            <Select
              value={sourceMode}
              onValueChange={(value) => setSourceMode(value as DraftSourceMode)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Bộ đang áp dụng</SelectItem>
                <SelectItem value="previous">Một năm học trước</SelectItem>
                <SelectItem value="basic">Bộ tiêu chí cơ bản</SelectItem>
              </SelectContent>
            </Select>
          </label>

          {effectiveDuplicateDraftId ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              Năm học này đã có một bản nháp.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          {effectiveDuplicateDraftId ? (
            <Button type="button" onClick={openDuplicate}>
              Mở bản nháp
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={createDraft.isPending || cloneDraft.isPending || !schoolYear.trim()}
            >
              Tạo bản nháp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetDemoDialog({
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
          <DialogTitle>Đặt lại dữ liệu demo?</DialogTitle>
          <DialogDescription>
            Toàn bộ thay đổi trên thiết bị sẽ bị xóa và dữ liệu mẫu của Hội đồng Trường Đại học Bách
            khoa - Đại học Đà Nẵng sẽ được khôi phục.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Giữ dữ liệu
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Đang đặt lại..." : "Đặt lại"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="border-b border-[#E5E7EB] px-5 py-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-brand-deep">{title}</h2>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-lg border border-[#DCE7F2] bg-white p-5">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="mt-4 h-6 w-72 max-w-full rounded-md" />
          <Skeleton className="mt-3 h-4 w-2/3 rounded-md" />
        </div>
      ))}
    </div>
  );
}
