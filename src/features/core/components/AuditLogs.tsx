import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip } from "@/components/ui-kit";
import { useApp } from "@/lib/store";

export function AuditLogs() {
  const audit = useApp((s) => s.audit);
  return (
    <>
      <TopBar title="Audit Log" subtitle="Mọi quyết định của AI và con người đều được lưu vết" />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Người thực hiện</th>
                <th className="py-3 px-3">Vai trò</th>
                <th className="py-3 px-3">Hành động</th>
                <th className="py-3 px-3">Trước</th>
                <th className="py-3 px-3">Sau</th>
                <th className="py-3 px-3">Lý do</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((e) => (
                <tr key={e.id} className="hover:bg-[#F4FBFF] transition-colors">
                  <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {e.time}
                  </td>
                  <td className="py-3 px-3 font-semibold text-brand-deep">{e.actor}</td>
                  <td className="py-3 px-3">
                    <Chip
                      tone={
                        e.role === "AI"
                          ? "brand"
                          : e.role === "Sinh viên"
                            ? "muted"
                            : e.role === "Cán bộ"
                              ? "success"
                              : "warning"
                      }
                    >
                      {e.role}
                    </Chip>
                  </td>
                  <td className="py-3 px-3">{e.action}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{e.before}</td>
                  <td className="py-3 px-3 text-xs font-semibold text-brand-deep">→ {e.after}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{e.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
