import { TopBar } from "@/components/layout/TopBar";
import { Card, StatCard, Button } from "@/components/ui-kit";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area } from "recharts";
import { Lightbulb, TrendingDown, MousePointerClick, Clock, Activity, Bot } from "lucide-react";
import { toast } from "sonner";

const dropOff = [
  { step: "Chọn loại", users: 100 },
  { step: "Chọn cấp", users: 92 },
  { step: "Thông tin", users: 85 },
  { step: "Upload", users: 62 },
  { step: "AI tiền kiểm", users: 58 },
  { step: "Nộp", users: 51 },
];
const timeSeries = Array.from({ length: 14 }).map((_, i) => ({ d: `${i + 15}/06`, sub: 30 + Math.round(Math.sin(i) * 8 + i * 2), rev: 25 + Math.round(Math.cos(i) * 6 + i * 1.5) }));

export function Analytics() {
  return (
    <>
      <TopBar title="SmartUX Analytics" subtitle="VNPT SmartUX • Phân tích hành vi & trải nghiệm" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Completion rate" value="51%" delta="+8% tháng" icon={<Activity className="w-5 h-5" />} />
        <StatCard label="Avg upload attempts" value="2.4" icon={<MousePointerClick className="w-5 h-5" />} tint="#F59E0B" />
        <StatCard label="Chatbot containment" value="72%" delta="+5%" icon={<Bot className="w-5 h-5" />} tint="#22C55E" />
        <StatCard label="Officer review time TB" value="11p" icon={<Clock className="w-5 h-5" />} tint="#0057C2" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Drop-off theo bước</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dropOff}>
              <XAxis dataKey="step" fontSize={11} stroke="#0057C2" />
              <YAxis fontSize={11} stroke="#0057C2" />
              <Tooltip />
              <Bar dataKey="users" radius={[10, 10, 0, 0]} fill="#00AEEF" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="font-bold text-brand-deep mb-3">Hồ sơ nộp & xét theo ngày</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00AEEF" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#00AEEF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0057C2" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#0057C2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" fontSize={11} stroke="#0057C2" />
              <YAxis fontSize={11} stroke="#0057C2" />
              <Tooltip />
              <Area dataKey="sub" stroke="#00AEEF" fill="url(#a1)" name="Nộp" />
              <Area dataKey="rev" stroke="#0057C2" fill="url(#a2)" name="Xét" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card glow>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-brand-deep flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Insight cards</h3>
          <Button variant="secondary" onClick={() => toast.success("Đã tạo backlog cải tiến UX (5 mục)")}>Tạo backlog cải tiến UX</Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: "Drop-off bước Upload", d: "Sinh viên bỏ dở nhiều nhất ở bước upload minh chứng (-23%)", tint: "bg-amber-50 text-amber-800" },
            { t: "Tiêu chí Tình nguyện", d: "Cán bộ mất nhiều thời gian nhất khi xét tiêu chí Tình nguyện", tint: "bg-rose-50 text-rose-800" },
            { t: "Ảnh mờ phổ biến", d: "Ảnh mờ là lỗi upload phổ biến nhất — 34% trường hợp", tint: "bg-purple-50 text-purple-800" },
            { t: "Chatbot containment", d: "Chatbot xử lý được 72% câu hỏi thường gặp mà không cần cán bộ", tint: "bg-emerald-50 text-emerald-800" },
          ].map((c) => (
            <div key={c.t} className={`p-4 rounded-2xl ${c.tint}`}>
              <div className="font-bold text-sm">{c.t}</div>
              <div className="text-xs mt-1">{c.d}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
