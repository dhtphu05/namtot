import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip, Button, Progress, StatCard } from "@/components/ui-kit";
import { COLLECTIVES } from "@/lib/mock-data";
import { Users, Download, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/collective/$id")({
  component: CollDetail,
});

function CollDetail() {
  const { id } = useParams({ from: "/app/collective/$id" });
  const c = COLLECTIVES.find((x) => x.id === id) ?? COLLECTIVES[0];
  const checks = [
    { t: "100% sinh viên đăng ký phong trào", ok: c.registered === c.total },
    { t: "≥ 25% đạt SV5T cấp Trường", ok: c.sv5tTruong / c.total >= 0.25 },
    { t: "≥ 1 thành viên đạt cấp cao hơn", ok: c.sv5tHigher > 0 },
    { t: "Có minh chứng hoạt động tập thể", ok: true },
  ];

  return (
    <>
      <TopBar title={c.name} subtitle={c.type} action={<Link to="/app/collective"><Button variant="ghost">← Danh sách</Button></Link>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Tổng sinh viên" value={c.total} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Đăng ký phong trào" value={`${c.registered}/${c.total}`} tint="#22C55E" />
        <StatCard label="Đạt SV5T cấp Trường" value={c.sv5tTruong} tint="#00AEEF" />
        <StatCard label="Đạt cấp cao hơn" value={c.sv5tHigher} tint="#0057C2" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-brand-deep mb-3">Checklist tập thể</h3>
          <div className="space-y-2">
            {checks.map((ch) => (
              <div key={ch.t} className={`p-3 rounded-xl flex items-center gap-3 ${ch.ok ? "bg-emerald-50" : "bg-amber-50"}`}>
                <CheckCircle2 className={`w-5 h-5 ${ch.ok ? "text-emerald-500" : "text-amber-500"}`} />
                <div className={`text-sm font-semibold ${ch.ok ? "text-emerald-800" : "text-amber-800"}`}>{ch.t}</div>
                <Chip tone={ch.ok ? "success" : "warning"} >{ch.ok ? "Đạt" : "Chưa đạt"}</Chip>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-brand-deep mt-6 mb-3">Hình ảnh hoạt động tập thể</h3>
          <div className="grid grid-cols-3 gap-2">
            {["https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&h=400&fit=crop"].map((u) => (
              <img key={u} src={u} className="rounded-xl object-cover w-full h-32" alt="" />
            ))}
          </div>
        </Card>
        <Card glow>
          <h3 className="font-bold text-brand-deep mb-3">Tiến độ tổng</h3>
          <div className="text-4xl font-extrabold text-brand-deep">{c.progress}%</div>
          <div className="mt-2"><Progress value={c.progress} /></div>
          <div className="space-y-2 mt-5">
            <Button className="w-full" onClick={() => toast.success("Đã upload minh chứng")}><Upload className="w-4 h-4" /> Upload minh chứng</Button>
            <Button variant="secondary" className="w-full" onClick={() => toast.success("Đã xuất báo cáo tập thể")}><Download className="w-4 h-4" /> Export báo cáo</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
