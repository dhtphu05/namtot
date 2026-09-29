import { useActiveCriteriaConfigs } from "@/features/core/hooks/useActiveCriteriaConfigs";
import { levelLabel } from "@/lib/api/types";
import { TopBar } from "@/components/layout/TopBar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { CriterionBadge } from "@/components/status/CriterionBadge";
import { Info } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import type { ActiveCriteriaConfig } from "@/features/core/api/criteria";

function formatIssuedDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

function CriteriaConfigCard({ config }: { config: ActiveCriteriaConfig }) {
  const issuedDate = formatIssuedDate(config.sourceIssuedAt);

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-base">{config.title}</CardTitle>
          <CardDescription>
            {levelLabel[config.scope]} · Mã cấu hình {config.code}
          </CardDescription>
          {config.description ? (
            <p className="text-sm text-muted-foreground">{config.description}</p>
          ) : null}
        </div>
        <Badge variant="secondary" className="w-fit shrink-0">
          Đang hoạt động
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid gap-3 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Văn bản nguồn</dt>
            <dd className="mt-1 break-words font-medium">{config.sourceDocumentName}</dd>
          </div>
          {config.sourceDocumentNumber ? (
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Số văn bản</dt>
              <dd className="mt-1 break-words font-medium">{config.sourceDocumentNumber}</dd>
            </div>
          ) : null}
          {config.sourceOrganization ? (
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Cơ quan ban hành</dt>
              <dd className="mt-1 break-words font-medium">{config.sourceOrganization}</dd>
            </div>
          ) : null}
          {config.sourcePeriodLabel || issuedDate ? (
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Thời gian</dt>
              <dd className="mt-1 font-medium">
                {[config.sourcePeriodLabel, issuedDate].filter(Boolean).join(" · ")}
              </dd>
            </div>
          ) : null}
          {config.sourceNote ? (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Ghi chú nguồn</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">{config.sourceNote}</dd>
            </div>
          ) : null}
        </dl>

        <section aria-label={`Các nội dung trong ${config.title}`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Nội dung được công khai</h3>
            <span className="text-xs text-muted-foreground">{config.rules.length} mục</span>
          </div>
          {config.rules.length ? (
            <ul className="divide-y rounded-md border">
              {config.rules.map((rule) => (
                <li key={rule.ruleKey} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{rule.title}</div>
                      {rule.studentFriendlyText ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {rule.studentFriendlyText}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <CriterionBadge criterion={rule.criterion} compact />
                      <Badge variant="secondary">
                        {rule.priorityRule
                          ? "Nội dung ưu tiên"
                          : rule.mandatory
                            ? "Bắt buộc"
                            : "Không bắt buộc"}
                      </Badge>
                    </div>
                  </div>
                  {rule.acceptedEvidenceHints.length ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">Gợi ý minh chứng: </span>
                      {rule.acceptedEvidenceHints.join("; ")}
                    </p>
                  ) : null}
                  {rule.missingActionHints.length ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">Gợi ý hoàn thiện: </span>
                      {rule.missingActionHints.join("; ")}
                    </p>
                  ) : null}
                  {(rule.source.page !== null || rule.source.section) && (
                    <p className="text-xs text-muted-foreground">
                      Trích dẫn: {rule.source.documentName}
                      {rule.source.page !== null ? `, trang ${rule.source.page}` : ""}
                      {rule.source.section ? `, ${rule.source.section}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Chưa có nội dung được công khai"
              description="Cấu hình này chưa có quy tắc hoạt động trong dữ liệu trả về."
              className="p-4"
            />
          )}
        </section>
      </CardContent>
    </Card>
  );
}

export function Settings() {
  const query = useActiveCriteriaConfigs();
  const requestId = query.error instanceof ApiError ? query.error.meta?.requestId : undefined;

  return (
    <>
      <TopBar
        title="Bộ tiêu chí"
        subtitle="Thông tin cấu hình đang được API công khai ở chế độ chỉ đọc"
      />

      <Alert className="mb-4 border-border bg-[var(--surface-muted)]">
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Phạm vi thông tin</AlertTitle>
        <AlertDescription>
          Danh sách này phản ánh cấu hình active được trả về từ API, không đại diện đầy đủ cho toàn
          bộ luật runtime của hệ thống. Các mục ở đây chỉ để tra cứu; màn hình không hỗ trợ chỉnh
          sửa hay kích hoạt cấu hình.
        </AlertDescription>
      </Alert>

      {query.isPending ? (
        <LoadingState label="Đang tải cấu hình tiêu chí..." />
      ) : query.isError ? (
        <ErrorState
          title="Không thể tải cấu hình tiêu chí"
          message={query.error.message || "Vui lòng thử tải lại."}
          requestId={requestId}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.configs.length === 0 ? (
        <EmptyState
          title="Chưa có cấu hình tiêu chí đang hoạt động"
          description="API hiện không trả về cấu hình active nào trong phạm vi tài khoản của bạn."
        />
      ) : (
        <div className="space-y-4">
          {query.data.configs.map((config) => (
            <CriteriaConfigCard key={config.id} config={config} />
          ))}
        </div>
      )}
    </>
  );
}
