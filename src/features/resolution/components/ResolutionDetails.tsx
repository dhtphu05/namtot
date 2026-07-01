import { Link, useParams } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { ArrowDownToLine, Check, Loader2, MessageSquare, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useDecideResolutionCase, useResolutionCase } from "../hooks/useResolution";
import type { KnowledgeDecision } from "../api/resolution";

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
  open: "Đang mở",
  in_review: "Hội đồng đang xét",
  resolved: "Đã xử lý",
  rejected: "Từ chối",
};

export function ResolutionDetails() {
  const { id } = useParams({ from: "/app/resolution/$id" });
  const { data, isLoading, isError, error } = useResolutionCase(id);
  const decision = useDecideResolutionCase();
  const [committeeNote, setCommitteeNote] = useState("");
  const [saveToKnowledgeBase, setSaveToKnowledgeBase] = useState(true);

  const defaultNote = useMemo(() => {
    if (!data) return "";
    return `Hội đồng đã xem xét case ${data.resolutionCase.id}. Lý do ban đầu: ${data.resolutionCase.reason}`;
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải resolution case...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-center font-semibold text-rose-600">
        {(error as Error)?.message || "Không tìm thấy resolution case."}
        <br />
        <Link to="/app/resolution">
          <Button variant="outline" className="mt-4">
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    );
  }

  const submit = (value: KnowledgeDecision) => {
    const note = committeeNote.trim() || defaultNote;
    decision.mutate({
      id,
      payload: {
        decision: value,
        committeeNote: note,
        updateRelatedTask: true,
        saveToKnowledgeBase,
        knowledgeBase: saveToKnowledgeBase
          ? {
              decision: value,
              reason: note,
              requiredFields: [],
              commonErrors: [],
            }
          : undefined,
      },
    });
  };

  return (
    <>
      <TopBar
        title={`Resolution - ${data.student.fullName}`}
        subtitle={`${data.student.studentCode ?? "Chưa có MSSV"} - ${data.evidence?.evidenceName ?? data.resolutionCase.reason}`}
        action={
          <Link to="/app/resolution">
            <Button variant="ghost">Quay lại danh sách</Button>
          </Link>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Chip tone="warning">{STATUS_LABEL[data.resolutionCase.status] ?? data.resolutionCase.status}</Chip>
            {data.evidence && <Chip>{CRITERION_LABEL[data.evidence.criterion] ?? data.evidence.criterion}</Chip>}
            <Chip tone="muted">{data.knowledgeBaseMatches.length} case tương tự</Chip>
          </div>

          <h3 className="mb-3 font-bold text-brand-deep">Thông tin case</h3>
          <div className="rounded-xl bg-[#F4FBFF] p-4 text-sm">
            <Info label="Sinh viên" value={`${data.student.fullName} (${data.student.studentCode ?? "Chưa có MSSV"})`} />
            <Info label="Lớp/Khoa" value={`${data.student.className ?? "-"} / ${data.student.faculty ?? "-"}`} />
            <Info label="Minh chứng" value={data.evidence?.evidenceName ?? "Không có evidence"} />
            <Info label="Lý do chuyển hội đồng" value={data.resolutionCase.reason} />
          </div>

          <h3 className="mb-3 mt-6 font-bold text-brand-deep">Case tương tự trong Knowledge Base</h3>
          <div className="space-y-2">
            {data.knowledgeBaseMatches.map((item, index) => (
              <div key={String(item.id ?? index)} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="font-semibold text-sm text-brand-deep">{String(item.evidenceName ?? item.eventName ?? `Case #${index + 1}`)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{String(item.reason ?? item.decision ?? "Không có mô tả")}</div>
              </div>
            ))}
            {data.knowledgeBaseMatches.length === 0 && (
              <div className="rounded-xl bg-[#F6F9FC] p-4 text-sm text-muted-foreground">Chưa có case tương tự.</div>
            )}
          </div>

          <h3 className="mb-3 mt-6 font-bold text-brand-deep">Audit gần nhất</h3>
          <div className="space-y-2">
            {data.auditTimeline.slice(0, 5).map((item, index) => (
              <div key={String(item.id ?? index)} className="rounded-xl bg-[#F6F9FC] p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-brand-deep">{String(item.action ?? "Audit")}</span>
                {item.note ? ` - ${String(item.note)}` : ""}
              </div>
            ))}
            {data.auditTimeline.length === 0 && <div className="text-sm text-muted-foreground">Chưa có audit liên quan.</div>}
          </div>
        </Card>

        <Card glow>
          <h3 className="mb-3 font-bold text-brand-deep">Quyết định hội đồng</h3>
          <textarea
            value={committeeNote}
            onChange={(event) => setCommitteeNote(event.target.value)}
            placeholder={defaultNote}
            rows={6}
            className="mb-3 w-full rounded-xl bg-[#F4FBFF] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
          />
          <label className="mb-4 flex items-center gap-2 text-xs font-semibold text-brand-deep">
            <input
              type="checkbox"
              checked={saveToKnowledgeBase}
              onChange={(event) => setSaveToKnowledgeBase(event.target.checked)}
            />
            Lưu làm tiền lệ cho Knowledge Base
          </label>
          <div className="space-y-2">
            <Button variant="success" className="w-full" onClick={() => submit("accepted")} disabled={decision.isPending}>
              <Check className="h-4 w-4" />
              Công nhận
            </Button>
            <Button variant="danger" className="w-full" onClick={() => submit("rejected")} disabled={decision.isPending}>
              <X className="h-4 w-4" />
              Không công nhận
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => submit("needs_supplement")} disabled={decision.isPending}>
              <MessageSquare className="h-4 w-4" />
              Yêu cầu bổ sung
            </Button>
            <Button variant="outline" className="w-full" onClick={() => submit("reference_only")} disabled={decision.isPending}>
              <ArrowDownToLine className="h-4 w-4" />
              Chỉ lưu tiền lệ
            </Button>
          </div>
          {decision.isPending && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang lưu quyết định...
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/70 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-semibold text-brand-deep">{value}</span>
    </div>
  );
}
