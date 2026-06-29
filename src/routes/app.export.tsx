import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { Download, FileSpreadsheet, FileText, Users } from "lucide-react";
import { STUDENTS, STATUS, LEVELS } from "@/lib/mock-data";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/export")({
  component: Export,
});

function Export() {
  const [preview, setPreview] = useState<string>("danh-sach-dat");
  const handle = (label: string) => toast.success(`Đã xuất: ${label}.xlsx`, { description: "File đã được tải về máy" });

  const list = {
    "danh-sach-dat": STUDENTS.filter((s) => ["approved", "reviewing", "submitted"].includes(s.status)),
    "can-bo-sung": STUDENTS.filter((s) => s.status === "supplement"),
  }[preview] || STUDENTS;

  return (
    <>
      <TopBar title="Export Center" subtitle="Xuất danh sách hồ sơ theo trạng thái và cấp xét" />

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { k: "danh-sach-dat", t: "Danh sách đạt", icon: FileSpreadsheet, c: "#22C55E" },
          { k: "can-bo-sung", t: "Danh sách cần bổ sung", icon: FileText, c: "#F59E0B" },
          { k: "audit", t: "Audit summary", icon: FileText, c: "#0057C2" },
          { k: "collective", t: "Báo cáo tập thể", icon: Users, c: "#00AEEF" },
        ].map((x) => (
          <button key={x.k} onClick={() => { setPreview(x.k); handle(x.t); }} className="card-soft p-5 text-left transition-all hover:-translate-y-1">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white mb-3" style={{ background: x.c }}>
              <x.icon className="w-5 h-5" />
            </div>
            <div className="font-bold text-brand-deep">{x.t}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Download className="w-3 h-3" /> Xuất .xlsx</div>
          </button>
        ))}
      </div>

      <Card>
        <h3 className="font-bold text-brand-deep mb-3">Xem trước</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 px-3">MSSV</th>
                <th className="py-2 px-3">Họ tên</th>
                <th className="py-2 px-3">Khoa</th>
                <th className="py-2 px-3">Lớp</th>
                <th className="py-2 px-3">Cấp aim</th>
                <th className="py-2 px-3">Trạng thái</th>
                <th className="py-2 px-3">GPA</th>
                <th className="py-2 px-3">DRL</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="hover:bg-[#F4FBFF]">
                  <td className="py-2 px-3 font-mono text-xs">{s.mssv}</td>
                  <td className="py-2 px-3 font-semibold text-brand-deep">{s.name}</td>
                  <td className="py-2 px-3 text-muted-foreground">{s.khoa}</td>
                  <td className="py-2 px-3 text-muted-foreground">{s.lop}</td>
                  <td className="py-2 px-3"><Chip>{LEVELS.find((l) => l.key === s.aim)?.label}</Chip></td>
                  <td className="py-2 px-3"><span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS[s.status].color}`}>{STATUS[s.status].label}</span></td>
                  <td className="py-2 px-3">{s.gpa}</td>
                  <td className="py-2 px-3">{s.drl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
