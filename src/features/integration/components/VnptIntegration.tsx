import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip } from "@/components/ui-kit";
import { VNPT_SERVICES } from "@/lib/mock-data";
import { motion } from "framer-motion";

export function VnptIntegration() {
  return (
    <>
      <TopBar
        title="VNPT AI Integration Center"
        subtitle="Toàn bộ dịch vụ AI của VNPT đang được nền tảng 5TOT sử dụng"
      />

      <Card glow className="mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Chip>9 dịch vụ AI được tích hợp</Chip>
            <h2 className="text-2xl font-bold text-brand-deep mt-3">Hệ sinh thái VNPT AI</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Từ OCR minh chứng, chatbot, eKYC đến phân tích UX và thông báo OTT — 5TOT Platform tận
              dụng đầy đủ năng lực AI của VNPT để rút ngắn thời gian xét duyệt và tăng độ tin cậy.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Evidence Cards / ngày" v="280+" />
            <Stat label="Câu hỏi xử lý" v="1.2K" />
            <Stat label="eKYC thành công" v="98%" />
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {VNPT_SERVICES.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-soft p-5"
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: `${s.color}22`, color: s.color }}
              >
                {s.name.split(" ").pop()?.[0] ?? "AI"}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-brand-deep">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
              </div>
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Được dùng cho
            </div>
            <ul className="space-y-1 text-sm">
              {s.uses.map((u) => (
                <li key={u} className="flex items-start gap-2">
                  <span className="text-[#00AEEF] mt-0.5">●</span> {u}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="p-3 rounded-xl bg-[#F4FBFF]">
      <div className="text-2xl font-extrabold text-brand-deep">{v}</div>
      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</div>
    </div>
  );
}
