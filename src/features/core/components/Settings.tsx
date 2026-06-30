import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip, Button } from "@/components/ui-kit";
import { CRITERIA } from "@/lib/mock-data";
import { CriterionIcon } from "@/components/AppIcon";
import { toast } from "sonner";



export function Settings() {
  return (
    <>
      <TopBar title="Cấu hình tiêu chí" subtitle="Quản lý các phiên bản tiêu chí Sinh viên 5 tốt" />
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-brand-deep">Phiên bản tiêu chí hiện hành</h3>
            <p className="text-xs text-muted-foreground mt-1">Áp dụng cho kỳ xét 2024-2025</p>
          </div>
          <Chip tone="success">v2024.10 (Active)</Chip>
        </div>
        <div className="space-y-2">
          {[
            { v: "v2024.10", d: "10/2024 — bản hiện hành", active: true },
            { v: "v2023.09", d: "09/2023 — bản trước đó" },
            { v: "v2022.08", d: "08/2022 — đã ngừng" },
          ].map((p) => (
            <div key={p.v} className="flex items-center justify-between p-3 rounded-xl bg-[#F4FBFF]">
              <div>
                <div className="font-semibold text-brand-deep">{p.v}</div>
                <div className="text-xs text-muted-foreground">{p.d}</div>
              </div>
              {p.active ? <Chip tone="success">Đang dùng</Chip> : <Button size="sm" variant="ghost" onClick={() => toast.success("Đã chuyển phiên bản")}>Kích hoạt</Button>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-brand-deep mb-3">5 tiêu chí</h3>
        <div className="space-y-2">
          {CRITERIA.map((c) => (
            <div key={c.key} className="p-4 rounded-2xl bg-[#F4FBFF] flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.color}1A`, color: c.color }}>
                <CriterionIcon criterion={c.key} size={20} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-brand-deep">{c.label}</div>
                <div className="text-xs text-muted-foreground">Trọng số: 20% • Yêu cầu minh chứng: có</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toast.info("Mở trình chỉnh sửa tiêu chí")}>Chỉnh sửa</Button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
