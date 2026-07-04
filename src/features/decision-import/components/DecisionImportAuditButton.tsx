import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditDrawer } from "@/components/audit/AuditDrawer";
import type { AuditLogEntry } from "@/types/audit";
import { useDecisionImportAudit } from "@/features/decision-import/hooks/useDecisionImports";

type DecisionImportAuditButtonProps = {
  importId: string;
};

const actionLabels: Record<string, string> = {
  DECISION_IMPORT_CREATED: "Phiên đọc quyết định đã được tạo",
  DECISION_IMPORT_FILE_UPLOADED: "Tài liệu đã được tải lên",
  DECISION_IMPORT_STARTED: "Bắt đầu đọc danh sách",
  SMARTREADER_ADMIN_DOC_EXTRACTED: "Đã đọc thông tin văn bản",
  SMARTREADER_OCR_STARTED: "Bắt đầu đọc bảng danh sách",
  SMARTREADER_OCR_COMPLETED: "Đã đọc xong bảng danh sách",
  DECISION_ROSTER_PARSED: "Đã chuẩn hoá danh sách sinh viên",
  DECISION_COLUMN_MAPPING_UPDATED: "Cột danh sách đã được cập nhật",
  DECISION_IMPORT_CONFIRMED: "Danh sách đã được xác nhận",
  EVENT_REGISTRY_CREATED: "Sự kiện đã được tạo trong kho",
  EVENT_REGISTRY_UPDATED: "Sự kiện đã được cập nhật",
  EVENT_ROSTER_CONFIRMED: "Danh sách sinh viên đã được lưu",
};

export function DecisionImportAuditButton({ importId }: DecisionImportAuditButtonProps) {
  const [open, setOpen] = useState(false);
  const auditQuery = useDecisionImportAudit(importId, open);
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
        title="Lịch sử đọc quyết định"
        description="Theo dõi các bước xử lý chính của phiên đọc quyết định."
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
