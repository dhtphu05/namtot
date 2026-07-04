import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AuditLogEntry } from "@/types/audit";
import { AuditTimeline } from "./AuditTimeline";

type AuditDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: AuditLogEntry[] | null;
  title?: string;
  description?: string;
};

export function AuditDrawer({
  open,
  onOpenChange,
  items,
  title = "Lịch sử thao tác",
  description = "Theo dõi các hành động chính mà không hiển thị raw JSON mặc định.",
}: AuditDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <AuditTimeline items={items} className="mt-6" />
      </SheetContent>
    </Sheet>
  );
}
