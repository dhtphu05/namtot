import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck, FileUp } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/store/auth-store";
import { useAwardDecisions } from "@/features/award-registry/hooks/useAwardRegistry";
import { getAwardDecisionStatusPresentation } from "@/features/award-registry/presentation";
import { errorMessage } from "@/features/award-registry/utils/errors";

export const Route = createFileRoute("/app/data-uploader")({
  component: DataUploaderHome,
});

function DataUploaderHome() {
  const user = useAuth((state) => state.user);
  const decisions = useAwardDecisions({ page: 1, limit: 5, archive: "exclude" });
  const rows = decisions.data?.items ?? [];
  const drafts = rows.filter((decision) => decision.status === "DRAFT");
  const workspaceName = user?.workspace?.shortName || user?.workspace?.name || "Đơn vị của bạn";

  return (
    <>
      <TopBar
        title="Tổng quan dữ liệu công nhận"
        subtitle="Đưa quyết định và danh sách sinh viên đã được đơn vị công nhận vào hệ thống để phục vụ kiểm tra điều kiện hồ sơ cấp Thành phố."
        action={
          <Button asChild>
            <Link to="/app/award-registry">
              Tạo quyết định công nhận <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col">
      <div
        className={`grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.42fr)] ${
          rows.length > 0 ? "order-2" : "order-1"
        }`}
      >
        <Card className="border-slate-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
              <FileUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                Đơn vị quản lý dữ liệu
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{workspaceName}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Quyết định công nhận là nguồn dữ liệu chính thức để hệ thống đối chiếu điều kiện hồ
                sơ Sinh viên 5 tốt cấp Thành phố. Bạn chỉ cần tạo quyết định, tải hai tài liệu và
                xử lý những dòng cần kiểm tra trước khi xác nhận.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Lộ trình xử lý</h2>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li><span className="font-medium text-slate-900">1.</span> Tạo quyết định công nhận</li>
                <li><span className="font-medium text-slate-900">2.</span> Tải văn bản và danh sách</li>
                <li><span className="font-medium text-slate-900">3.</span> Kiểm tra dữ liệu rồi xác nhận</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>

      <section
        className={`mt-5 ${rows.length > 0 ? "order-1" : "order-2"}`}
        aria-labelledby="current-work-title"
      >
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Công việc hiện tại</p>
            <h2 id="current-work-title" className="mt-1 text-lg font-semibold text-slate-950">
              Những quyết định cần tiếp tục
            </h2>
          </div>
          {rows.length > 0 && (
            <Link
              to="/app/award-registry"
              className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
            >
              Xem tất cả quyết định
            </Link>
          )}
        </div>

        {decisions.isLoading ? (
          <LoadingState label="Đang tải công việc hiện tại..." />
        ) : decisions.isError ? (
          <ErrorState
            title="Không thể tải công việc hiện tại"
            message={errorMessage(decisions.error)}
            onRetry={() => void decisions.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Chưa có quyết định công nhận"
            description="Bắt đầu từ nút Tạo quyết định công nhận ở đầu trang để đưa dữ liệu của đơn vị vào hệ thống."
          />
        ) : drafts.length === 0 ? (
          <Card className="border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-700">Không có bản nháp cần tiếp tục trong danh sách gần đây.</p>
            <p className="mt-1 text-xs text-slate-500">Các quyết định đang hoạt động đều đã xác nhận hoặc không cần thao tác thêm.</p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {drafts.slice(0, 3).map((decision) => {
              const status = getAwardDecisionStatusPresentation(decision.status);
              return (
                <Link
                  key={decision.id}
                  to="/app/award-registry/$awardDecisionId"
                  params={{ awardDecisionId: decision.id }}
                  className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {decision.decisionNumber || "Chưa có số quyết định"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Năm học {decision.schoolYear.replace("-", "–")}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-600">Mở workspace để tải tài liệu và kiểm tra dữ liệu.</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 group-hover:underline">
                    Tiếp tục <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      </div>
    </>
  );
}
