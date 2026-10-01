import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditDrawer } from "@/components/audit/AuditDrawer";
import type { AuditLogEntry } from "@/types/audit";
import { useEvidenceAudit } from "@/features/evidence/hooks/useEvidence";

type EvidenceAuditButtonProps = {
  evidenceId: string;
  label?: string;
};

const actionLabels: Record<string, string> = {
  EVIDENCE_CREATED: "Minh chứng đã được tạo",
  FILE_UPLOADED: "Đã tải tệp lên",
  OCR_JOB_CREATED: "Bắt đầu đọc nội dung tệp",
  SMARTREADER_FILE_UPLOADED: "Đã tải tệp lên",
  SMARTREADER_OCR_STARTED: "Bắt đầu đọc nội dung tệp",
  SMARTREADER_OCR_COMPLETED: "Đã đọc xong nội dung tệp",
  SMARTREADER_EVIDENCE_READ: "Đã đọc minh chứng",
  EVIDENCE_MISSING_INFO_DETECTED: "Phát hiện thông tin cần bổ sung",
  EVIDENCE_CARD_GENERATED: "Đã tạo tóm tắt minh chứng",
  EVIDENCE_SENT_TO_HUMAN_VERIFICATION: "Đã tiếp nhận để đối chiếu",
  EVIDENCE_NEEDS_MANUAL_REVIEW: "Đã tiếp nhận để đối chiếu",
  EVIDENCE_INDEXING_FAILED: "Chưa đọc được nội dung tệp",
  EVENT_EVIDENCE_IMPORTED_BY_STUDENT: "Đã thêm từ danh sách chính thức",
};

export function EvidenceAuditButton({
  evidenceId,
  label = "Lịch sử xử lý",
}: EvidenceAuditButtonProps) {
  const [open, setOpen] = useState(false);
  const auditQuery = useEvidenceAudit(evidenceId, open);
  const items = useMemo(
    () => mapAuditItems(auditQuery.data?.items ?? []),
    [auditQuery.data?.items],
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        <History className="h-4 w-4" />
        {label}
      </Button>
      <AuditDrawer
        open={open}
        onOpenChange={setOpen}
        items={items}
        title="Lịch sử xử lý minh chứng"
        description="Các bước chính, không hiển thị dữ liệu kỹ thuật mặc định."
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
