import { useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { LEVELS } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, User, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";



export function Wizard() {
  const [step, setStep] = useState(1);
  const setWizard = useApp((s) => s.setWizard);
  const pushAudit = useApp((s) => s.pushAudit);
  const pushNotification = useApp((s) => s.pushNotification);
  const nav = useNavigate();

  const [type, setType] = useState<"ca-nhan" | "tap-the" | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Nguyễn Linh An",
    mssv: "21IT001",
    khoa: "Công nghệ Thông tin",
    lop: "21IT_CLC1",
    email: "an.nl.21it@sv.udn.vn",
    phone: "0905 123 456",
    gpa: "3.72",
    drl: "92",
    year: "2024-2025",
  });
  const [saved, setSaved] = useState(false);

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const saveDraft = () => {
    setSaved(true);
    setWizard({ type: type ?? undefined, level: level ?? undefined });
    pushAudit({ actor: form.name, role: "Sinh viên", action: "Lưu bản nháp", before: "Mới", after: "Đã lưu", reason: "Wizard step " + step });
    toast.success("Đã lưu bản nháp", { description: "Tự động sao lưu vào Draft Center" });
    setTimeout(() => setSaved(false), 2000);
  };

  const finish = () => {
    pushNotification({ title: "Hồ sơ đã sẵn sàng để upload minh chứng", desc: `Cấp aim: ${LEVELS.find((l) => l.key === level)?.label}`, type: "success" });
    nav({ to: "/app/upload" });
  };

  return (
    <>
      <TopBar title="Tạo hồ sơ mới" subtitle="Hoàn tất 4 bước để bắt đầu upload minh chứng" />

      {/* Stepper */}
      <div className="card-soft p-5 mb-6">
        <div className="grid grid-cols-4 gap-3">
          {["Loại hồ sơ", "Cấp xét", "Thông tin", "Hoàn tất"].map((t, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={t} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${done ? "bg-emerald-500 text-white" : active ? "gradient-brand text-white shadow-[var(--shadow-glow)]" : "bg-slate-100 text-slate-500"}`}>
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <div className={`text-sm font-semibold ${active ? "text-brand-deep" : "text-muted-foreground"}`}>{t}</div>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        {step === 1 && (
          <div>
            <h3 className="font-bold text-brand-deep text-lg mb-1">Bước 1 — Chọn loại hồ sơ</h3>
            <p className="text-sm text-muted-foreground mb-5">Hồ sơ cá nhân hay hồ sơ tập thể?</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { k: "ca-nhan", label: "Hồ sơ cá nhân", icon: User, desc: "Sinh viên 5 tốt cá nhân — 5 tiêu chí" },
                { k: "tap-the", label: "Hồ sơ tập thể", icon: Users, desc: "Tập thể Sinh viên 5 tốt — Lớp / Chi hội" },
              ].map((o) => {
                const active = type === o.k;
                return (
                  <button
                    key={o.k}
                    onClick={() => setType(o.k as any)}
                    className={`text-left p-6 rounded-2xl transition-all hover:-translate-y-1 ${active ? "gradient-brand text-white shadow-[var(--shadow-glow)]" : "card-soft"}`}
                  >
                    <o.icon className={`w-8 h-8 mb-3 ${active ? "text-white" : "text-[#00AEEF]"}`} />
                    <div className={`font-bold text-lg ${active ? "text-white" : "text-brand-deep"}`}>{o.label}</div>
                    <div className={`text-sm mt-1 ${active ? "text-white/85" : "text-muted-foreground"}`}>{o.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="font-bold text-brand-deep text-lg mb-1">Bước 2 — Chọn cấp xét</h3>
            <p className="text-sm text-muted-foreground mb-5">Hệ thống sẽ chạy Cascade Review từ cấp aim xuống các cấp thấp hơn.</p>
            <div className="grid md:grid-cols-2 gap-4">
              {LEVELS.map((l) => {
                const active = level === l.key;
                const recommend = l.key === "thanh-pho";
                return (
                  <button
                    key={l.key}
                    onClick={() => setLevel(l.key)}
                    className={`text-left p-5 rounded-2xl transition-all hover:-translate-y-1 relative ${active ? "gradient-brand text-white shadow-[var(--shadow-glow)]" : "card-soft"}`}
                  >
                    {recommend && (
                      <span className="absolute top-3 right-3 chip bg-amber-100 text-amber-700">
                        <Sparkles className="w-3 h-3" /> AI gợi ý
                      </span>
                    )}
                    <div className={`text-xs uppercase font-bold tracking-wider ${active ? "text-white/80" : "text-muted-foreground"}`}>Cấp {l.difficulty}/4</div>
                    <div className={`font-bold text-lg mt-1 ${active ? "text-white" : "text-brand-deep"}`}>{l.label}</div>
                    <div className={`text-sm mt-1 ${active ? "text-white/85" : "text-muted-foreground"}`}>{l.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="font-bold text-brand-deep text-lg mb-1">Bước 3 — Thông tin sinh viên</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {saved && <span className="text-emerald-600 font-semibold">✓ Đã lưu nháp</span>}
              {!saved && "Tự động lưu sau 30 giây"}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                ["name", "Họ và tên"], ["mssv", "MSSV"], ["khoa", "Khoa"], ["lop", "Lớp"],
                ["email", "Email"], ["phone", "Số điện thoại"], ["gpa", "GPA"], ["drl", "Điểm rèn luyện"], ["year", "Năm học xét"],
              ].map(([k, l]) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">{l}</label>
                  <input
                    value={(form as any)[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" onClick={saveDraft}>Lưu bản nháp</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 mx-auto rounded-full gradient-brand flex items-center justify-center text-white shadow-[var(--shadow-glow)] mb-4">
              <Check className="w-10 h-10" />
            </motion.div>
            <h3 className="font-bold text-brand-deep text-xl">Hồ sơ đã được khởi tạo</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {form.name} • {LEVELS.find((l) => l.key === level)?.label} • Loại: {type === "ca-nhan" ? "Cá nhân" : "Tập thể"}
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={finish}>Tiếp tục upload minh chứng <ChevronRight className="w-4 h-4" /></Button>
              <Button variant="ghost" onClick={() => nav({ to: "/app/ekyc" })}>Xác thực eKYC trước</Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-5 border-t border-[#EEF9FF]">
          <Button variant="ghost" onClick={prev} disabled={step === 1}><ChevronLeft className="w-4 h-4" /> Quay lại</Button>
          {step < 4 && (
            <Button onClick={next} disabled={(step === 1 && !type) || (step === 2 && !level)}>
              Tiếp tục <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    </>
  );
}
