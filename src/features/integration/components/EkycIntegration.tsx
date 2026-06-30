import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { ScanFace, Camera, IdCard, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { toast } from "sonner";



export function EkycIntegration() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const pushAudit = useApp((s) => s.pushAudit);

  const run = async () => {
    setStep(1);
    for (let i = 1; i <= 4; i++) {
      await new Promise((r) => setTimeout(r, 800));
      setStep(i + 1);
    }
    setDone(true);
    pushAudit({ actor: "VNPT eKYC", role: "AI", action: "Xác thực sinh viên", before: "Chưa xác thực", after: "Đã xác thực", reason: "OCR + Liveness + Compare face thành công" });
    toast.success("Đã xác thực thông tin sinh viên");
  };

  const steps = [
    { t: "OCR thẻ sinh viên", desc: "VNPT eKYC bóc tách Họ tên / MSSV / Khoa từ ảnh thẻ", icon: IdCard },
    { t: "Liveness card", desc: "Kiểm tra thẻ là thật, không phải ảnh chụp lại", icon: ScanFace },
    { t: "Liveness face", desc: "Kiểm tra khuôn mặt thật, chống deepfake", icon: Camera },
    { t: "Compare face", desc: "Đối chiếu khuôn mặt với ảnh trên thẻ", icon: Check },
  ];

  return (
    <>
      <TopBar title="Xác thực eKYC (tùy chọn)" subtitle="VNPT eKYC — bỏ qua nếu muốn bổ sung sau" />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-brand-deep mb-4">4 bước xác thực</h3>
          <div className="space-y-3">
            {steps.map((s, i) => {
              const idx = i + 1;
              const isDone = step > idx;
              const isActive = step === idx;
              return (
                <motion.div key={s.t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={`p-4 rounded-2xl flex items-center gap-4 transition-all ${isDone ? "bg-emerald-50" : isActive ? "gradient-brand text-white shadow-[var(--shadow-glow)]" : "bg-[#F4FBFF]"}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-white text-[#0057C2]" : "bg-white text-[#0057C2]"}`}>
                    {isDone ? <Check className="w-6 h-6" /> : <s.icon className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${isActive ? "text-white" : "text-brand-deep"}`}>{s.t}</div>
                    <div className={`text-xs ${isActive ? "text-white/85" : "text-muted-foreground"}`}>{s.desc}</div>
                  </div>
                  {isActive && <div className="shimmer h-2 w-20 rounded-full" />}
                </motion.div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-6">
            <Button onClick={run} disabled={step > 0 && !done}>{done ? "Xác thực lại" : "Bắt đầu xác thực"}</Button>
            <Button variant="ghost" onClick={() => toast.info("Đã bỏ qua eKYC — có thể bổ sung sau")}>Bỏ qua, bổ sung sau</Button>
          </div>
        </Card>

        <Card glow>
          <h3 className="font-bold text-brand-deep mb-3">Kết quả</h3>
          {done ? (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500 mx-auto flex items-center justify-center text-white mb-3">
                <Check className="w-10 h-10" />
              </div>
              <div className="font-bold text-emerald-700">Đã xác thực sinh viên</div>
              <p className="text-xs text-muted-foreground mt-2">Hồ sơ được đánh dấu "Verified" trong audit log</p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-10">Chưa có kết quả — bấm "Bắt đầu xác thực"</div>
          )}
        </Card>
      </div>
    </>
  );
}
