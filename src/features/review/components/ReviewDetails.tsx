import { Link, useParams } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { AlertTriangle, Check, FileText, Loader2, MessageSquare, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useEscalateResolution, useRequestSupplement, useReviewTaskDetail, useSubmitDecision } from "../hooks/useReview";
import type { ReviewTaskDetail as ReviewTaskDetailData } from "../api/review";

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

const STATUS_LABEL: Record<string, string> = {
  waiting: "Chờ xét",
  reviewing: "Đang xét",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội đồng",
  accepted: "Đạt tiêu chí",
  rejected: "Không đạt",
};

export function ReviewDetails() {
  const { id } = useParams({ from: "/app/review/$id" });
  const { data, isLoading, isError, error } = useReviewTaskDetail(id);
  const submitDecision = useSubmitDecision();
  const requestSupplement = useRequestSupplement();
  const escalateResolution = useEscalateResolution();
  const [note, setNote] = useState("");

  const isPending = submitDecision.isPending || requestSupplement.isPending || escalateResolution.isPending;

  const context = useMemo(() => (data ? getContext(data) : null), [data]);
  const primaryEvidence = data?.evidences[0];
  const previewUrl = primaryEvidence?.files?.find((file) => file.publicUrl)?.publicUrl ?? null;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-brand-deep" />
        <p className="font-semibold text-muted-foreground">Đang tải dữ liệu xét duyệt...</p>
      </div>
    );
  }

  if (isError || !data || !context) {
    return (
      <div className="p-8 text-center font-semibold text-rose-600">
        {(error as Error)?.message || "Không tìm thấy thông tin task xét duyệt."}
        <br />
        <Link to="/app/queue">
          <Button variant="outline" className="mt-4">
            Quay lại hàng chờ
          </Button>
        </Link>
      </div>
    );
  }

  const decide = (decision: "accepted" | "rejected") => {
    const officerNote = note.trim() || (decision === "accepted" ? "Đạt tiêu chí." : "Không đạt tiêu chí.");
    submitDecision.mutate({
      id,
      payload: {
        decision,
        officerNote,
        evidenceDecisions: data.evidences.map((evidence) => ({
          evidenceId: evidence.id,
          status: decision,
          note: officerNote,
        })),
      },
    });
  };

  const supplement = () => {
    const reason = note.trim();
    if (!reason) return;
    requestSupplement.mutate({
      id,
      payload: {
        reason,
        requestedEvidenceName: primaryEvidence?.evidenceName,
        allowedCriteria: [data.task.criterion],
      },
    });
  };

  const escalate = () => {
    const reason = note.trim() || "Cần hội đồng xem xét do minh chứng chưa đủ rõ để quyết định.";
    escalateResolution.mutate({
      id,
      payload: { reason, evidenceId: primaryEvidence?.id },
    });
  };

  return (
    <>
      <TopBar
        title={`Xét duyệt - ${CRITERION_LABEL[data.task.criterion] ?? data.task.criterion}`}
        subtitle={`${context.title} - ${context.subtitle} - ${context.level}`}
        action={
          <Link to="/app/queue">
            <Button variant="ghost">Quay lại hàng chờ</Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-bold text-brand-deep">
              <FileText className="h-4 w-4" />
              Minh chứng cần xét
            </h3>
            <Chip tone="muted">{data.evidences.length} file/minh chứng</Chip>
          </div>
          {previewUrl ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-xl bg-[#F4FBFF] p-3">
              <img src={previewUrl} alt={primaryEvidence?.evidenceName ?? "Minh chứng"} className="max-h-[70vh] rounded-lg shadow-lg" />
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl bg-[#F4FBFF] p-6 text-center">
              <FileText className="mb-3 h-10 w-10 text-[#0057C2]" />
              <div className="font-semibold text-brand-deep">Không có preview trực tiếp</div>
              <div className="mt-1 max-w-md text-sm text-muted-foreground">
                Backend đã trả dữ liệu task, nhưng file hiện chưa có `publicUrl` để hiển thị trong trình duyệt.
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-5">
          <Card>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                <FileText className="h-4 w-4" />
                Thông tin task
              </h3>
              <Chip tone={data.task.status === "accepted" ? "success" : data.task.status === "rejected" ? "error" : "brand"}>
                {STATUS_LABEL[data.task.status] ?? data.task.status}
              </Chip>
            </div>
            <Info label="Đối tượng" value={context.title} />
            <Info label="Loại hồ sơ" value={context.type} />
            <Info label="Tiêu chí" value={CRITERION_LABEL[data.task.criterion] ?? data.task.criterion} />
            <Info label="Cấp aim" value={context.level} />
            <Info label="Cán bộ phụ trách" value={data.task.assignedOfficer?.fullName ?? "Chưa phân công"} />
            <Info label="Hạn xử lý" value={formatDate(data.task.dueDate)} />
          </Card>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-bold text-brand-deep">
              <Sparkles className="h-4 w-4" />
              Dữ liệu hỗ trợ quyết định
            </h3>
            <div className="space-y-2 text-sm">
              {data.evidences.map((evidence) => (
                <div key={evidence.id} className="rounded-lg bg-[#F6F9FC] p-3">
                  <div className="font-semibold text-brand-deep">{evidence.evidenceName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {CRITERION_LABEL[evidence.criterion] ?? evidence.criterion} - {evidence.status} - AI{" "}
                    {typeof evidence.confidence === "number" ? `${Math.round(evidence.confidence * 100)}%` : "chưa có"}
                  </div>
                </div>
              ))}
              {data.knowledgeBaseMatches.length > 0 && (
                <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                  Có {data.knowledgeBaseMatches.reduce((sum, item) => sum + item.matches.length, 0)} case tương tự trong Knowledge Base.
                </div>
              )}
            </div>
          </Card>

          <Card glow>
            <h3 className="mb-2 font-bold text-brand-deep">Ghi chú quyết định</h3>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nhập ghi chú cho sinh viên/tập thể hoặc lý do chuyển hội đồng..."
              rows={5}
              className="w-full rounded-xl bg-[#F4FBFF] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="success" onClick={() => decide("accepted")} disabled={isPending}>
                <Check className="h-4 w-4" />
                Đạt tiêu chí
              </Button>
              <Button variant="danger" onClick={() => decide("rejected")} disabled={isPending}>
                <X className="h-4 w-4" />
                Không đạt
              </Button>
              <Button variant="secondary" onClick={supplement} disabled={isPending || !note.trim()}>
                <MessageSquare className="h-4 w-4" />
                Yêu cầu bổ sung
              </Button>
              <Button variant="outline" onClick={escalate} disabled={isPending}>
                <AlertTriangle className="h-4 w-4" />
                Chuyển hội đồng
              </Button>
            </div>
            {isPending && (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang gửi quyết định...
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#EEF9FF] py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-brand-deep">{value}</span>
    </div>
  );
}

function getContext(data: ReviewTaskDetailData) {
  if (data.application && data.student) {
    return {
      type: "Hồ sơ cá nhân",
      title: data.student.fullName,
      subtitle: `${data.student.studentCode ?? "Chưa có MSSV"} - ${data.student.className ?? data.student.faculty ?? "Chưa có lớp"}`,
      level: LEVEL_LABEL[data.application.targetLevel] ?? data.application.targetLevel,
    };
  }
  if (data.collectiveProfile) {
    return {
      type: "Hồ sơ tập thể",
      title: data.collectiveProfile.className,
      subtitle: `Đại diện ${data.collectiveProfile.representative.fullName}`,
      level: LEVEL_LABEL[data.collectiveProfile.targetLevel] ?? data.collectiveProfile.targetLevel,
    };
  }
  return null;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}
