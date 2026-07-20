import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  FileText,
  Loader2,
  MessageSquare,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { TopBar } from "@/components/layout/TopBar";
import { chatbotApi } from "@/features/chatbot/api/chatbot";
import { SmartbotCardRenderer } from "@/features/chatbot/components/SmartbotCardRenderer";
import type { ChatbotResponse } from "@/features/chatbot/types";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import { getSourcePresentation } from "@/features/application/presentation";
import { useAuth } from "@/features/auth/store/auth-store";
import type { KnowledgeBaseItem } from "@/features/evidence/api/knowledge-base";
import { useEvidences } from "@/features/evidence/hooks/useEvidence";
import { useKnowledgeBaseSearch } from "@/features/evidence/hooks/useKnowledgeBase";
import {
  formatEventDateRange,
  formatImportedValue,
} from "@/features/event/components/approved-evidence-utils";
import {
  useApprovedEvidenceSearch,
  useImportApprovedEvidence,
} from "@/features/event/hooks/useApprovedEvidenceSearch";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { ApprovedEvidenceSearchItem } from "@/types/evidence";
import {
  getStudentEvidenceStatus,
  type StudentEvidenceStatus,
} from "../utils/studentEvidenceStatus";
import { AddEvidenceDrawer } from "./AddEvidenceDrawer";
import { EvidenceDetailModal } from "./EvidenceDetailModal";
import {
  normalizeEvidenceCard,
  sourceTypeCopy,
  studentEvidenceCriteria,
} from "./evidence-card-utils";
import { formatStudentDate } from "./student-evidence-utils";

class EvidenceErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <ErrorState
            title="Không tải được minh chứng"
            message={this.state.error.message}
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export function EvidenceWorkspaceSafe() {
  return (
    <EvidenceErrorBoundary>
      <EvidenceWorkspace />
    </EvidenceErrorBoundary>
  );
}

function EvidenceWorkspace() {
  const user = useAuth((state) => state.user);
  const studentCode = user?.studentCode;
  const studentName = user?.fullName;
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [initialCriterion, setInitialCriterion] = React.useState<Criterion>("academic");
  const [initialEvidenceName, setInitialEvidenceName] = React.useState("");
  const [selectedEvidence, setSelectedEvidence] = React.useState<EvidenceResponse | null>(null);
  const [recentEvidence, setRecentEvidence] = React.useState<EvidenceResponse | null>(null);
  const currentApplication = useCurrentApplication();
  const applicationId = currentApplication.data?.application?.id;
  const applicationStatus = currentApplication.data?.application?.status;
  const evidenceQuery = useEvidences(applicationId);
  const evidenceList = React.useMemo(
    () => (Array.isArray(evidenceQuery.data) ? evidenceQuery.data : []),
    [evidenceQuery.data],
  );
  const isEditable = ["draft", "prechecked", "ready_to_submit", "supplement_required"].includes(
    applicationStatus ?? "",
  );

  const openUpload = (criterion: Criterion, evidenceName = "") => {
    setInitialCriterion(criterion);
    setInitialEvidenceName(evidenceName);
    setDrawerOpen(true);
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const criterion = params.get("criterion");
    const action = params.get("action");
    if (action !== "upload" || !isStudentCriterion(criterion)) return;
    openUpload(criterion);
  }, []);

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
        <TopBar title="Minh chứng của tôi" subtitle="Tạo hồ sơ để thêm minh chứng." />
        <EmptyState
          title="Bạn chưa có hồ sơ xét duyệt"
          description="Hãy tạo hồ sơ trước khi thêm minh chứng."
          action={
            <Button asChild>
              <Link to="/app/wizard">Tạo hồ sơ</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Minh chứng của tôi"
        subtitle="Hệ thống tự kiểm tra danh sách chính thức trước khi bạn upload."
      />

      <EvidenceAssistantCard
        applicationId={applicationId}
        onUploadPhysical={() => openUpload("physical")}
      />

      {evidenceQuery.isLoading ? (
        <LoadingState label="Đang tải minh chứng..." />
      ) : evidenceQuery.isError ? (
        <ErrorState
          title="Không thể tải danh sách minh chứng"
          message={
            evidenceQuery.error instanceof Error ? evidenceQuery.error.message : "Vui lòng thử lại."
          }
          onRetry={() => void evidenceQuery.refetch()}
        />
      ) : (
        <div className="space-y-5">
          {recentEvidence ? (
            <PostUploadEvidenceAssistant
              evidence={recentEvidence}
              onAddNote={() => setSelectedEvidence(recentEvidence)}
              onUploadAnother={() => openUpload(recentEvidence.criterion)}
            />
          ) : null}
          {studentEvidenceCriteria.map((criterion) => {
            const items = evidenceList.filter((item) => item.criterion === criterion.key);
            return (
              <CriterionEvidenceSection
                key={criterion.key}
                criterion={criterion}
                evidences={items}
                studentCode={studentCode}
                studentName={studentName}
                applicationId={applicationId}
                isEditable={isEditable}
                onUpload={(name) => openUpload(criterion.key, name)}
                onOpenEvidence={setSelectedEvidence}
                onImported={(evidence) => {
                  setSelectedEvidence(evidence);
                  setRecentEvidence(evidence);
                  void evidenceQuery.refetch();
                }}
              />
            );
          })}
        </div>
      )}

      {applicationId ? (
        <AddEvidenceDrawer
          applicationId={applicationId}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          initialCriterion={initialCriterion}
          initialEvidenceName={initialEvidenceName}
          onCreated={(evidence) => {
            setInitialEvidenceName("");
            setSelectedEvidence(evidence);
            setRecentEvidence(evidence);
            void evidenceQuery.refetch();
          }}
        />
      ) : null}

      <EvidenceDetailModal
        evidence={selectedEvidence}
        applicationId={applicationId}
        canEdit={isEditable}
        onClose={() => setSelectedEvidence(null)}
        onChanged={() => void evidenceQuery.refetch()}
      />
    </>
  );
}

function EvidenceAssistantCard({
  applicationId,
  onUploadPhysical,
}: {
  applicationId?: string;
  onUploadPhysical: () => void;
}) {
  return (
    <section className="mb-5 rounded-md border border-[#DDEAF7] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FF] text-[#0057C2]">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-brand-deep">Trợ lý minh chứng cấp Trường</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Tìm minh chứng đã được xác nhận trước khi upload hoặc mở nhanh đúng tiêu chí cần bổ
              sung.
            </p>
          </div>
        </div>

        <div className="flex max-w-full flex-wrap gap-2">
          <Link
            to="/app/chatbot"
            search={{ context: "evidence", targetLevel: "school", applicationId } as never}
          >
            <Button type="button" size="sm" variant="outline">
              <MessageSquare className="h-4 w-4" />
              Hỏi AI
            </Button>
          </Link>
          <Link to="/app/event-library" search={{ criterion: "volunteer" } as never}>
            <Button type="button" size="sm" variant="outline">
              <Search className="h-4 w-4" />
              Tìm minh chứng
            </Button>
          </Link>
          <Button type="button" size="sm" onClick={onUploadPhysical}>
            <FilePlus2 className="h-4 w-4" />
            Upload thể lực
          </Button>
        </div>
      </div>
    </section>
  );
}

function CriterionEvidenceSection({
  criterion,
  evidences,
  studentCode,
  studentName,
  applicationId,
  isEditable,
  onUpload,
  onOpenEvidence,
  onImported,
}: {
  criterion: (typeof studentEvidenceCriteria)[number];
  evidences: EvidenceResponse[];
  studentCode?: string | null;
  studentName?: string | null;
  applicationId?: string;
  isEditable: boolean;
  onUpload: (evidenceName?: string) => void;
  onOpenEvidence: (evidence: EvidenceResponse) => void;
  onImported: (evidence: EvidenceResponse) => void;
}) {
  return (
    <section className="rounded-md border bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-brand-deep">{criterion.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{criterionDescription[criterion.key]}</p>
      </div>

      <CriterionAssistantBlock
        applicationId={applicationId}
        criterion={criterion.key}
        onUpload={() => onUpload()}
      />

      <OfficialMatchBlock
        criterion={criterion.key}
        studentCode={studentCode}
        studentName={studentName}
        applicationId={applicationId}
        isEditable={isEditable}
        onUpload={() => onUpload()}
        onImported={onImported}
      />

      <ApprovedEvidenceReferenceBlock
        criterion={criterion.key}
        onUseName={(name) => onUpload(name)}
      />

      <CompactEvidenceList evidences={evidences} className="mt-4" onOpenEvidence={onOpenEvidence} />
    </section>
  );
}

function CriterionAssistantBlock({
  applicationId,
  criterion,
  onUpload,
}: {
  applicationId?: string;
  criterion: Criterion;
  onUpload: () => void;
}) {
  const [response, setResponse] = React.useState<ChatbotResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (criterion !== "volunteer" && criterion !== "physical") return null;

  const sendPrompt = async (text: string) => {
    if (!applicationId || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await chatbotApi.sendMessage({
        text,
        applicationId,
        contextScope: "student_helpdesk",
        pageContext: { page: "evidence", criterion },
      });
      setResponse(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa gửi được yêu cầu tới trợ lý.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostback = (payload: string, label: string) => {
    void sendPrompt(payload.startsWith("fivetot://action/") ? label : payload);
  };

  const copy =
    criterion === "volunteer"
      ? {
          text: "Bạn có thể tìm minh chứng đã được xác nhận trước khi upload file.",
          primary: "Tìm minh chứng của tôi trong Matching Hub",
          secondary: "Minh chứng tình nguyện cần gì?",
          upload: "Upload minh chứng mới",
        }
      : {
          text: "Bạn có thể upload minh chứng Thể lực tốt như điểm môn thể dục loại Khá trở lên, giấy chứng nhận Sinh viên khỏe, hoạt động thể thao hoặc xác nhận rèn luyện thể thao định kỳ.",
          primary: "Upload minh chứng thể lực",
          secondary: "Minh chứng thể lực cần gì?",
          upload: "Hỏi cán bộ",
        };

  return (
    <div className="mb-4 rounded-md border border-[#D8E8F8] bg-[#F8FCFF] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-deep">
            <MessageSquare className="h-4 w-4 text-[#0057C2]" />
            Trợ lý tiêu chí cấp Trường
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.text}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {criterion === "volunteer" ? (
          <Button
            type="button"
            size="sm"
            disabled={isLoading || !applicationId}
            onClick={() => void sendPrompt(copy.primary)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {copy.primary}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={onUpload}>
            <FilePlus2 className="h-4 w-4" />
            {copy.primary}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isLoading || !applicationId}
          onClick={() => void sendPrompt(copy.secondary)}
        >
          {copy.secondary}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={criterion === "volunteer" ? onUpload : () => void sendPrompt(copy.upload)}
          disabled={criterion === "physical" && (isLoading || !applicationId)}
        >
          {copy.upload}
        </Button>
      </div>
      {error ? (
        <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {response ? (
        <div className="mt-3 space-y-3 rounded-md border bg-white p-3">
          {response.messages.map((card, index) => (
            <SmartbotCardRenderer
              key={`${card.type}-${index}`}
              card={card}
              onPostback={handlePostback}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PostUploadEvidenceAssistant({
  evidence,
  onAddNote,
  onUploadAnother,
}: {
  evidence: EvidenceResponse;
  onAddNote: () => void;
  onUploadAnother: () => void;
}) {
  const card = (evidence as EvidenceResponse & { card?: { missingFields?: unknown[] } | null })
    .card;
  const hasMissingFields = Array.isArray(card?.missingFields) && card.missingFields.length > 0;
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-emerald-900">Trợ lý sau upload</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900">
            {hasMissingFields
              ? "Minh chứng chưa thể hiện rõ thông tin cần thiết. Bạn có thể upload thêm giấy xác nhận hoặc ghi chú để cán bộ kiểm tra."
              : "Hệ thống đã đọc được thông tin từ minh chứng:\n- Tên hoạt động\n- Tiêu chí\n- Thời gian hoặc số ngày\n- Đơn vị xác nhận\n\nMinh chứng đã được ghi nhận và sẽ được cán bộ xác nhận khi xét duyệt."}
          </p>
        </div>
        <Badge variant="outline">{evidence.evidenceName}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onAddNote}>
          {hasMissingFields ? "Ghi chú cho cán bộ" : "Nộp minh chứng này"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onUploadAnother}>
          {hasMissingFields ? "Upload bổ sung" : "Upload file khác"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onAddNote}>
          {hasMissingFields ? "Vẫn nộp minh chứng này" : "Thêm ghi chú"}
        </Button>
      </div>
    </section>
  );
}

function isStudentCriterion(value: string | null): value is Criterion {
  return studentEvidenceCriteria.some((criterion) => criterion.key === value);
}

function OfficialMatchBlock({
  criterion,
  studentCode,
  studentName,
  applicationId,
  isEditable,
  onUpload,
  onImported,
}: {
  criterion: Criterion;
  studentCode?: string | null;
  studentName?: string | null;
  applicationId?: string;
  isEditable: boolean;
  onUpload: () => void;
  onImported: (evidence: EvidenceResponse) => void;
}) {
  const officialSearch = useApprovedEvidenceSearch(
    {
      studentCode,
      studentName,
      criterion,
      status: "all",
    },
    true,
  );
  const importEvidence = useImportApprovedEvidence(applicationId);
  const officialItems = officialSearch.data ?? [];

  const importItem = async (item: ApprovedEvidenceSearchItem) => {
    const result = await importEvidence.mutateAsync({
      eventId: item.event.id,
      participantId: item.participant.id,
    });
    if (result?.evidence) {
      onImported(result.evidence as EvidenceResponse);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/20 p-3">
        <div>
          <h3 className="font-semibold text-foreground">Minh chứng chính thức của bạn</h3>
          <p className="text-sm text-muted-foreground">
            Hệ thống tự kiểm tra theo họ tên hoặc MSSV của bạn trong các danh sách đã xác nhận.
          </p>
        </div>

        <div className="mt-3">
          {officialSearch.isFetching ? (
            <InlineLoading label="Đang kiểm tra danh sách chính thức..." />
          ) : officialSearch.isError ? (
            <OfficialFallbackBox
              message="Chưa kiểm tra được danh sách chính thức lúc này."
              onUpload={onUpload}
            />
          ) : officialItems.length ? (
            <div className="space-y-3">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                Tìm thấy minh chứng chính thức phù hợp
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {officialItems.slice(0, 4).map((item) => (
                  <OfficialMatchCard
                    key={`${item.event.id}-${item.participant.id}`}
                    item={item}
                    isImporting={importEvidence.isPending}
                    isEditable={isEditable}
                    onImport={() => void importItem(item)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <OfficialFallbackBox
              message="Chưa tìm thấy minh chứng chính thức cho tiêu chí này."
              onUpload={onUpload}
            />
          )}
        </div>
      </div>

      <SearchFallbackBlock
        criterion={criterion}
        studentCode={studentCode}
        studentName={studentName}
        isEditable={isEditable}
        isImporting={importEvidence.isPending}
        onImport={(item) => void importItem(item)}
        onUpload={onUpload}
      />

      <UploadFallbackBlock onUpload={onUpload} />
    </div>
  );
}

function SearchFallbackBlock({
  criterion,
  studentCode,
  studentName,
  isEditable,
  isImporting,
  onImport,
  onUpload,
}: {
  criterion: Criterion;
  studentCode?: string | null;
  studentName?: string | null;
  isEditable: boolean;
  isImporting: boolean;
  onImport: (item: ApprovedEvidenceSearchItem) => void;
  onUpload: () => void;
}) {
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebouncedValue(q, 400);
  const hasQuery = Boolean(debouncedQ.trim());
  const search = useApprovedEvidenceSearch(
    {
      studentCode,
      studentName,
      criterion,
      q: debouncedQ,
      status: "all",
    },
    hasQuery,
  );
  const items = search.data ?? [];

  return (
    <div className="rounded-md border bg-white p-3">
      <h3 className="font-semibold text-foreground">Tìm thêm theo tên hoạt động</h3>
      <div className="mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={criterionPlaceholder[criterion]}
            className="pl-9"
          />
        </div>
      </div>

      {hasQuery ? (
        <div className="mt-3">
          {search.isFetching ? (
            <InlineLoading label="Đang tìm trong danh sách chính thức..." />
          ) : search.isError ? (
            <OfficialFallbackBox
              message="Chưa tìm được danh sách này. Bạn vẫn có thể upload minh chứng để cán bộ xác minh."
              onUpload={onUpload}
            />
          ) : items.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {items.slice(0, 4).map((item) => (
                <OfficialMatchCard
                  key={`${item.event.id}-${item.participant.id}`}
                  item={item}
                  isImporting={isImporting}
                  isEditable={isEditable}
                  onImport={() => onImport(item)}
                />
              ))}
            </div>
          ) : (
            <OfficialFallbackBox
              message="Chưa tìm thấy bạn trong danh sách này. Bạn vẫn có thể upload minh chứng để cán bộ xác minh."
              onUpload={onUpload}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function UploadFallbackBlock({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-3">
      <div>
        <h3 className="font-semibold text-foreground">Upload minh chứng</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Nếu chưa có trong danh sách chính thức, bạn có thể upload giấy chứng nhận hoặc file xác
          nhận.
        </p>
      </div>
      <Button type="button" size="sm" onClick={onUpload}>
        <FilePlus2 className="h-4 w-4" />
        Upload minh chứng
      </Button>
    </div>
  );
}

function ApprovedEvidenceReferenceBlock({
  criterion,
  onUseName,
}: {
  criterion: Criterion;
  onUseName: (name: string) => void;
}) {
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebouncedValue(q, 400);
  const reference = useKnowledgeBaseSearch({
    criterion,
    q: debouncedQ.trim() || undefined,
    decision: "accepted",
    page: 1,
    limit: 3,
  });
  const items = reference.data?.items ?? [];

  return (
    <div className="mt-4 rounded-md border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Tham khảo minh chứng đã được duyệt</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Xem các loại minh chứng thường được chấp nhận cho tiêu chí này.
          </p>
        </div>
        <BookOpenCheck className="h-5 w-5 text-primary" />
      </div>

      <div className="mt-3">
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tìm mẫu minh chứng..."
        />
      </div>

      <div className="mt-3">
        {reference.isLoading ? (
          <InlineLoading label="Đang tải dữ liệu tham khảo..." />
        ) : reference.isError || !items.length ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Chưa có dữ liệu tham khảo.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {items.map((item) => (
              <ReferenceCard key={item.id} item={item} onUseName={onUseName} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReferenceCard({
  item,
  onUseName,
}: {
  item: KnowledgeBaseItem;
  onUseName: (name: string) => void;
}) {
  const title = item.evidenceName ?? item.eventName ?? "Minh chứng tham khảo";
  const requiredFields = item.requiredFieldsJson.slice(0, 3);

  return (
    <article className="rounded-md border bg-muted/10 p-3">
      <h4 className="line-clamp-2 font-semibold text-foreground">{title}</h4>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{criterionShortCopy[item.criterion] ?? item.criterion}</Badge>
        {requiredFields.map((field) => (
          <Badge key={field} variant="outline">
            {field}
          </Badge>
        ))}
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
        {item.reason ||
          "Minh chứng nên thể hiện tên hoạt động, thời gian tham gia và đơn vị xác nhận."}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3"
        onClick={() => onUseName(title)}
      >
        Dùng tên này cho minh chứng mới
      </Button>
    </article>
  );
}

function OfficialMatchCard({
  item,
  isImporting,
  isEditable,
  onImport,
}: {
  item: ApprovedEvidenceSearchItem;
  isImporting: boolean;
  isEditable: boolean;
  onImport: () => void;
}) {
  const alreadyImported = item.alreadyImported || Boolean(item.evidenceId);
  const dateRange = formatEventDateRange(item.event.startDate, item.event.endDate);
  const importedValue = formatImportedValue(item);
  const hasMetadata = Boolean(dateRange || importedValue || item.event.officialDocumentNo);

  return (
    <article className="rounded-md border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="line-clamp-2 font-semibold text-foreground">{item.event.eventName}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.event.organizer || "Đơn vị tổ chức"}
          </p>
        </div>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      </div>
      {hasMetadata ? (
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <InlineInfo label="Thời gian" value={dateRange} />
          <InlineInfo label="Giá trị" value={importedValue} />
          <InlineInfo label="Số văn bản" value={item.event.officialDocumentNo} />
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">
          Có tên bạn trong danh sách
        </Badge>
        {alreadyImported ? (
          <Badge variant="outline">Đã thêm vào hồ sơ</Badge>
        ) : item.importable && isEditable ? (
          <Button type="button" size="sm" onClick={onImport} disabled={isImporting}>
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Thêm vào hồ sơ
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function OfficialFallbackBox({ message, onUpload }: { message: string; onUpload: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div>
        <div className="font-semibold">Chưa tìm thấy trong danh sách chính thức</div>
        <p className="mt-1">{message}</p>
      </div>
      <Button type="button" size="sm" onClick={onUpload}>
        Upload minh chứng
      </Button>
    </div>
  );
}

function InlineLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-white p-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function CompactEvidenceList({
  evidences,
  className,
  onOpenEvidence,
}: {
  evidences: EvidenceResponse[];
  className?: string;
  onOpenEvidence: (evidence: EvidenceResponse) => void;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">Minh chứng đã thêm</h3>
        <span className="text-sm text-muted-foreground">{evidences.length} mục</span>
      </div>
      {evidences.length ? (
        <div className="divide-y rounded-md border">
          {evidences.map((evidence) => (
            <CompactEvidenceRow
              key={evidence.id}
              evidence={evidence}
              onOpen={() => onOpenEvidence(evidence)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Chưa có minh chứng cho tiêu chí này.
        </div>
      )}
    </div>
  );
}

function CompactEvidenceRow({
  evidence,
  onOpen,
}: {
  evidence: EvidenceResponse;
  onOpen: () => void;
}) {
  const card = normalizeEvidenceCard((evidence as EvidenceResponse & { card?: unknown }).card);
  const status = getStudentEvidenceStatus(evidence, card);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="line-clamp-1 font-semibold text-foreground">{evidence.evidenceName}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusTag status={status} />
            <span>
              {sourceTypeCopy[evidence.sourceType] ?? getSourcePresentation(evidence.sourceType)}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatStudentDate(evidence.updatedAt)}
            </span>
          </div>
        </div>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onOpen}>
        Xem
      </Button>
    </div>
  );
}

function StatusTag({ status }: { status: StudentEvidenceStatus }) {
  const className = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  }[status.tone];

  return (
    <Badge className={className} variant="outline">
      {status.label}
    </Badge>
  );
}

function InlineInfo({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className="rounded-md bg-muted/40 px-2.5 py-2">
      <div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words font-semibold text-foreground">{value}</div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

const criterionDescription: Record<Criterion, string> = {
  ethics: "Khen thưởng, hoạt động Đoàn - Hội.",
  academic: "Nghiên cứu khoa học, cuộc thi học thuật.",
  physical: "Sinh viên khỏe, giải thể thao.",
  volunteer: "Mùa hè xanh, hiến máu, Chủ nhật xanh.",
  integration: "Tập huấn Đoàn - Hội, giao lưu quốc tế.",
  priority: "Thành tích ưu tiên.",
  collective: "Minh chứng tập thể.",
};

const criterionPlaceholder: Record<Criterion, string> = {
  volunteer: "Mùa hè xanh, Hiến máu, Chủ nhật xanh...",
  integration: "Tập huấn Đoàn - Hội, giao lưu quốc tế...",
  physical: "Sinh viên khỏe, giải thể thao...",
  academic: "Nghiên cứu khoa học, cuộc thi học thuật...",
  ethics: "Khen thưởng, hoạt động Đoàn - Hội...",
  priority: "Giấy khen, cuộc thi, thành tích nổi bật...",
  collective: "Hoạt động tập thể, phong trào lớp...",
};

const criterionShortCopy: Record<string, string> = {
  ethics: "Đạo đức",
  academic: "Học tập",
  physical: "Thể lực",
  volunteer: "Tình nguyện",
  integration: "Hội nhập",
  priority: "Ưu tiên",
  collective: "Tập thể",
};
