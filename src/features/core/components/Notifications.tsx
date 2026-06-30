import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { useApp } from "@/lib/store";
import { Bell, Check, AlertTriangle, Info } from "lucide-react";



export function Notifications() {
  const items = useApp((s) => s.notifications);
  const markAll = useApp((s) => s.markAllRead);

  const iconFor = (t: string) =>
    t === "success" ? <Check className="w-4 h-4" /> :
    t === "warning" ? <AlertTriangle className="w-4 h-4" /> :
    t === "error" ? <AlertTriangle className="w-4 h-4" /> :
    <Info className="w-4 h-4" />;

  const tint = (t: string) =>
    t === "success" ? "bg-emerald-500" :
    t === "warning" ? "bg-amber-500" :
    t === "error" ? "bg-rose-500" :
    "bg-[#00AEEF]";

  return (
    <>
      <TopBar
        title="Thông báo"
        subtitle="Cập nhật trạng thái hồ sơ, yêu cầu bổ sung, deadline (VNPT OTT)"
        action={<Button variant="secondary" onClick={markAll}>Đánh dấu đã đọc</Button>}
      />
      <Card>
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className={`p-4 rounded-2xl flex items-start gap-4 ${n.read ? "bg-white" : "bg-[#F4FBFF]"}`}>
              <div className={`w-10 h-10 rounded-2xl ${tint(n.type)} text-white flex items-center justify-center shrink-0`}>
                {iconFor(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-brand-deep">{n.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{n.desc}</div>
                <div className="text-xs text-muted-foreground mt-1">{n.time}</div>
              </div>
              {!n.read && <Chip tone="brand">Mới</Chip>}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
