import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditDrawer } from "@/components/audit/AuditDrawer";
import type { AuditLogEntry } from "@/types/audit";
import { useEvidenceAudit } from "@/features/evidence/hooks/useEvidence";

type EvidenceAuditButtonProps = {
  evidenceId: string;
};

const actionLabels: Record<string, string> = {
  EVIDENCE_CREATED: "Minh chứng đã được tạo",
  FILE_UPLOADED: "File đã được tải lên",
  OCR_JOB_CREATED: "Tác vụ số hoá đã được tạo",
  SMARTREADER_FILE_UPLOADED: "File đã được gửi đến SmartReader",
  SMARTREADER_OCR_STARTED: "SmartReader bắt đầu đọc minh chứng",
  SMARTREADER_OCR_COMPLETED: "SmartReader đã đọc xong",
  EVIDENCE_CARD_GENERATED: "Thẻ minh chứng đã được tạo",
  EVIDENCE_NEEDS_MANUAL_REVIEW: "Cần cán bộ kiểm tra",
  EVIDENCE_INDEXING_FAILED: "Số hoá chưa thành công",
  EVENT_EVIDENCE_IMPORTED_BY_STUDENT: "Sinh viên đã thêm minh chứng từ sự kiện đã xác nhận",
};

export function EvidenceAuditButton({ evidenceId }: EvidenceAuditButtonProps) {
  const [open, setOpen] = useState(false);
  const auditQuery = useEvidenceAudit(evidenceId, open);
  const items = useMemo(
    () => mapAuditItems(auditQuery.data?.items ?? []),
    [auditQuery.data?.items],
  );

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <History className="h-4 w-4" />
        Lịch sử xử lý
      </Button>
      <AuditDrawer
        open={open}
        onOpenChange={setOpen}
        items={items}
        title="Lịch sử xử lý minh chứng"
        description="Các thao tác chính trong quá trình tải lên, số hoá và tạo thẻ minh chứng."
      />
    </>
  );
}

function mapAuditItems(items: AuditLogEntry[]): AuditLogEntry[] {
  return items.map((item) => ({
    ...item,
    action: actionLabels[item.action] ?? item.action,
  }));
}
