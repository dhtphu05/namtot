import { useEffect, useMemo, useState } from "react";
import { ArrowRight, DatabaseZap, FileUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/features/auth/store/auth-store";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import type { ApprovedEvidenceSearchItem } from "@/types/evidence";
import { EvidenceDetailModal } from "@/features/evidence/components/EvidenceDetailModal";
import {
  useApprovedEvidenceSearch,
  useImportApprovedEvidence,
} from "@/features/event/hooks/useApprovedEvidenceSearch";
import { ApprovedEvidenceCard } from "./ApprovedEvidenceCard";
import { ApprovedEvidenceFilters } from "./ApprovedEvidenceFilters";
import { ImportEvidenceModal } from "./ImportEvidenceModal";

type SearchStatus = "all" | "importable" | "imported";

export function ApprovedEvidencePage() {
  const user = useAuth((state) => state.user);
  const studentCode = user?.studentCode;
  const currentApplication = useCurrentApplication();
  const applicationId = currentApplication.data?.application?.id;
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 400);
  const [criterion, setCriterion] = useState<Criterion | "all">("all");
  const [status, setStatus] = useState<SearchStatus>("all");
  const [confirmItem, setConfirmItem] = useState<ApprovedEvidenceSearchItem | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceResponse | null>(null);
  const [importedEvidenceByEvent, setImportedEvidenceByEvent] = useState<
    Record<string, EvidenceResponse>
  >({});
  const search = useApprovedEvidenceSearch(
    {
      studentCode,
      criterion,
      q: debouncedQ,
      status,
    },
    Boolean(studentCode),
  );
  const importEvidence = useImportApprovedEvidence(applicationId);
  const searchError = search.error instanceof ApiError ? search.error : null;
  const items = search.data ?? [];

  const emptyCopy = useMemo(() => {
    if (debouncedQ || criterion !== "all" || status !== "all") {
      return {
        title: "Không có kết quả phù hợp",
        description: "Thử đổi tiêu chí hoặc từ khóa tìm kiếm.",
      };
    }

    return {
      title: "Chưa tìm thấy sự kiện đã xác nhận",
      description:
        "Hiện chưa có hoạt động đã xác nhận nào khớp với MSSV của bạn. Bạn vẫn có thể tải minh chứng thủ công ở mục Minh chứng của tôi.",
    };
  }, [criterion, debouncedQ, status]);

  const confirmImport = async () => {
    if (!confirmItem) return;
    const result = await importEvidence.mutateAsync({
      eventId: confirmItem.event.id,
      participantId: confirmItem.participant.id,
    });

    if (result?.evidence) {
      setImportedEvidenceByEvent((current) => ({
        ...current,
        [confirmItem.event.id]: result.evidence as EvidenceResponse,
      }));
      setSelectedEvidence(result.evidence as EvidenceResponse);
    }
    setConfirmItem(null);
  };

  if (currentApplication.isLoading) {
    return <LoadingState label="Đang tải hồ sơ hiện tại..." />;
  }

  if (currentApplication.isError) {
    return (
      <ErrorState
        title="Không thể tải hồ sơ"
        message={
          currentApplication.error instanceof Error
            ? currentApplication.error.message
            : "Vui lòng thử lại."
        }
        onRetry={() => void currentApplication.refetch()}
      />
    );
  }

  if (!currentApplication.data?.application) {
    return (
      <>
        <TopBar
          title="Tìm trong sự kiện đã xác nhận"
          subtitle="Vui lòng tạo hồ sơ trước khi thêm minh chứng từ sự kiện."
        />
        <EmptyState
          title="Bạn chưa có hồ sơ xét duyệt"
          description="Hãy tạo hồ sơ để thêm minh chứng từ sự kiện đã xác nhận."
          action={
            <Button asChild>
              <Link to="/app/wizard">Tạo hồ sơ ngay</Link>
            </Button>
          }
        />
      </>
    );
  }

  if (!studentCode) {
    return (
      <>
        <TopBar
          title="Tìm trong sự kiện đã xác nhận"
          subtitle="Không tìm thấy MSSV trong tài khoản hiện tại."
        />
        <ErrorState
          title="Thiếu MSSV"
          message="Tài khoản của bạn chưa có MSSV nên chưa thể tìm minh chứng từ sự kiện đã xác nhận."
        />
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Tìm trong sự kiện đã xác nhận"
        subtitle="Các hoạt động và danh sách đã được cán bộ xác nhận. Nếu bạn có tên trong danh sách, bạn có thể thêm vào hồ sơ mà không cần tải lại giấy chứng nhận."
        action={
          <Button asChild variant="outline">
            <Link to="/app/evidence">
              Minh chứng của tôi
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="mb-4 rounded-md border bg-white p-4 text-sm text-muted-foreground">
        Minh chứng thêm từ sự kiện đã xác nhận vẫn được cán bộ/Hội đồng kiểm tra trong quá trình xét
        duyệt.
      </div>

      <ApprovedEvidenceFilters
        q={q}
        criterion={criterion}
        status={status}
        studentCode={studentCode}
        onQueryChange={setQ}
        onCriterionChange={setCriterion}
        onStatusChange={setStatus}
      />

      <div className="mt-5">
        {search.isLoading ? (
          <LoadingState label="Đang tải sự kiện đã xác nhận..." />
        ) : search.isError ? (
          <ErrorState
            title={getErrorTitle(searchError)}
            message={getErrorMessage(searchError)}
            requestId={searchError?.meta?.requestId}
            onRetry={() => void search.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={debouncedQ || criterion !== "all" || status !== "all" ? DatabaseZap : FileUp}
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={
              debouncedQ || criterion !== "all" || status !== "all" ? null : (
                <Button asChild>
                  <Link to="/app/evidence">Tải minh chứng thủ công</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => {
              const importedEvidence = importedEvidenceByEvent[item.event.id];
              const evidenceId = importedEvidence?.id ?? item.evidenceId;
              return (
                <ApprovedEvidenceCard
                  key={`${item.event.id}-${item.participant.id}`}
                  item={{
                    ...item,
                    alreadyImported: item.alreadyImported || Boolean(importedEvidence),
                  }}
                  evidenceId={evidenceId}
                  isImporting={importEvidence.isPending}
                  onImport={() => setConfirmItem(item)}
                  onViewEvidence={() => {
                    if (importedEvidence) {
                      setSelectedEvidence(importedEvidence);
                      return;
                    }

                    if (item.evidenceId) {
                      setSelectedEvidence(
                        toEvidencePlaceholder(item, item.evidenceId, applicationId),
                      );
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <ImportEvidenceModal
        item={confirmItem}
        open={Boolean(confirmItem)}
        isSubmitting={importEvidence.isPending}
        onOpenChange={(open) => !open && setConfirmItem(null)}
        onConfirm={() => void confirmImport()}
      />

      <EvidenceDetailModal
        evidence={selectedEvidence}
        applicationId={applicationId}
        canEdit={false}
        onClose={() => setSelectedEvidence(null)}
      />
    </>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

function getErrorTitle(error: ApiError | null) {
  if (error?.status === 403) return "Bạn chỉ có thể xem minh chứng của chính mình";
  if (error?.status === 404) return "Không tìm thấy hoạt động hoặc danh sách này";
  return "Không thể tải sự kiện đã xác nhận";
}

function getErrorMessage(error: ApiError | null) {
  if (error?.status === 403) return "Bạn chỉ có thể xem và thêm minh chứng của chính mình.";
  if (error?.status === 404) return "Không tìm thấy hoạt động hoặc danh sách này.";
  if (error?.code?.toLowerCase().includes("already")) return "Minh chứng này đã có trong hồ sơ.";
  if (error?.code?.toLowerCase().includes("participant"))
    return "Bạn không thể thêm minh chứng của sinh viên khác.";
  return error?.message ?? "Vui lòng kiểm tra kết nối và thử lại.";
}

function toEvidencePlaceholder(
  item: ApprovedEvidenceSearchItem,
  evidenceId: string,
  applicationId?: string,
): EvidenceResponse {
  const now = new Date().toISOString();

  return {
    id: evidenceId,
    applicationId,
    evidenceName: item.event.eventName,
    criterion: item.event.criterion,
    sourceType: "event_import",
    status: "indexed",
    indexingStatus: "indexed",
    createdAt: now,
    updatedAt: now,
  };
}
