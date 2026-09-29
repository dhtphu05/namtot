import { useMemo, useState } from "react";
import { ArrowRight, Eye, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { UxStatusCard } from "@/components/status/UxStatusCard";
import { StatusBadge } from "@/components/status/StatusBadge";
import { useAuth } from "@/features/auth/store/auth-store";
import type { Criterion, Role } from "@/lib/api/types";
import type { DecisionImport, DecisionImportStatus } from "@/types/decision-import";
import { useDecisionImports } from "@/features/decision-import/hooks/useDecisionImports";
import { CreateDecisionImportWizard } from "./CreateDecisionImportWizard";
import {
  compactFacts,
  criterionOptions,
  decisionStatusIcon,
  fallbackDecisionUxStatus,
  formatCriterion,
  formatDecisionDateTime,
  getDecisionDisplayTitle,
  isPresentDisplayValue,
  statusOptions,
} from "./decision-import-utils";

const allowedRoles: Role[] = ["officer", "manager", "committee", "admin"];
const hiddenStatuses: DecisionImportStatus[] = ["failed", "cancelled"];
const visibleStatusOptions = statusOptions.filter(
  (item) => item.value === "all" || !hiddenStatuses.includes(item.value),
);

export function DecisionImportList() {
  const role = useAuth((state) => state.user?.role);
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [status, setStatus] = useState<DecisionImportStatus | "all">("all");
  const [criterion, setCriterion] = useState<Criterion | "all">("all");
  const [q, setQ] = useState("");
  const filters = useMemo(
    () => ({
      status,
      criterion,
      q: q.trim() || undefined,
    }),
    [criterion, q, status],
  );
  const imports = useDecisionImports(filters);
  const items = useMemo(
    () => (imports.data ?? []).filter((item) => !hiddenStatuses.includes(item.status)),
    [imports.data],
  );

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Đọc quyết định và danh sách SV5T"
          subtitle="Tải quyết định, công văn hoặc danh sách sinh viên để lưu vào kho minh chứng chính thức."
        />
        <ErrorState
          title="Bạn không có quyền truy cập"
          message="Chỉ cán bộ, quản lý hoặc quản trị viên mới có thể import quyết định."
        />
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Đọc quyết định và danh sách SV5T"
        subtitle="Tải quyết định, công văn hoặc danh sách sinh viên để lưu vào kho minh chứng chính thức."
        action={
          <Button type="button" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4" />
            Tạo phiên đọc quyết định
          </Button>
        }
      />

      <div className="rounded-md border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="relative block">
            <span className="sr-only">Tìm kiếm phiên import</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="pl-9"
              placeholder="Tên quyết định, hoạt động, người tạo..."
            />
          </label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as DecisionImportStatus | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {visibleStatusOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={criterion}
            onValueChange={(value) => setCriterion(value as Criterion | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tiêu chí" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tiêu chí</SelectItem>
              {criterionOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5">
        {imports.isLoading ? (
          <LoadingState label="Đang tải danh sách quyết định..." />
        ) : imports.isError ? (
          <ErrorState
            title="Không thể tải danh sách quyết định"
            message={imports.error instanceof Error ? imports.error.message : "Vui lòng thử lại."}
            onRetry={() => void imports.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Chưa có phiên import nào."
            description="Tạo phiên đọc quyết định đầu tiên để kiểm tra danh sách sinh viên và lưu vào kho chính thức."
            action={
              <Button type="button" onClick={() => setWizardOpen(true)}>
                Tạo phiên đọc quyết định
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => (
              <DecisionImportCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <CreateDecisionImportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={(importId) => {
          void imports.refetch();
          void importId;
        }}
        onStarted={(importId) => {
          navigate({
            to: "/app/decision-imports/$decisionImportId",
            params: { decisionImportId: importId },
          });
        }}
      />
    </>
  );
}

function DecisionImportCard({ item }: { item: DecisionImport }) {
  const Icon = decisionStatusIcon(item.status);
  const uxStatus = fallbackDecisionUxStatus(item);
  const title = getDecisionDisplayTitle(item);
  const criterion = formatCriterion(item.criterion);
  const subtitleParts = [
    item.eventName && item.eventName !== title ? item.eventName : null,
    item.organizer,
  ].filter(isPresentDisplayValue);
  const facts = compactFacts([
    { label: "Danh sách", value: formatPreviewSummary(item) },
    { label: "Người tạo", value: item.createdByName },
    { label: "Cập nhật gần nhất", value: formatDecisionDateTime(item.updatedAt) },
  ]);
  const primaryLabel = item.status === "confirmed" ? "Xem kết quả" : "Tiếp tục kiểm tra";
  const secondaryLabel = item.status === "confirmed" ? "Mở kho sự kiện" : "Kiểm tra danh sách";

  return (
    <article className="rounded-md border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            {criterion ? <Badge variant="outline">{criterion}</Badge> : null}
            <StatusBadge domain="decisionImport" status={item.status} compact />
            {item.fileStatus ? <Badge variant="outline">File: {item.fileStatus}</Badge> : null}
          </div>
          <h2 className="line-clamp-2 text-base font-bold text-brand-deep">{title}</h2>
          {subtitleParts.length ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitleParts.map(String).join(" · ")}
            </p>
          ) : null}
        </div>
        <Icon
          className={`h-6 w-6 shrink-0 text-primary ${item.status === "processing" ? "animate-spin" : ""}`}
        />
      </div>

      <div className="mt-4">
        <UxStatusCard status={uxStatus} className="p-3" />
      </div>

      {facts.length ? (
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {facts.map((fact) => (
            <Info key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
        <Button asChild type="button" size="sm">
          <Link to="/app/decision-imports/$decisionImportId" params={{ decisionImportId: item.id }}>
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        {item.status === "confirmed" ? (
          <Button asChild type="button" size="sm" variant="outline">
            <Link to="/app/event-registry">
              <Eye className="h-4 w-4" />
              {secondaryLabel}
            </Link>
          </Button>
        ) : (
          <Button asChild type="button" size="sm" variant="outline">
            <Link
              to="/app/decision-imports/$decisionImportId"
              params={{ decisionImportId: item.id }}
            >
              <Eye className="h-4 w-4" />
              {secondaryLabel}
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  if (!isPresentDisplayValue(value)) return null;

  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value}</div>
    </div>
  );
}

function formatPreviewSummary(item: DecisionImport) {
  const summary = item.previewSummary;
  if (!summary) return null;
  return `${summary.validRows}/${summary.totalRows} dòng hợp lệ`;
}
