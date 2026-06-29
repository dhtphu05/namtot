import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button } from "@/components/ui-kit";
import { FAQ_CHIPS } from "@/lib/mock-data";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, Mic, Volume2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/app/chatbot")({
  component: Chatbot,
});

interface Msg {
  id: string;
  from: "bot" | "user";
  text: string;
  confidence?: number;
  sources?: string[];
}

const ANSWERS: Record<string, Omit<Msg, "id" | "from">> = {
  default: {
    text: "Em có thể hỏi mình về hồ sơ, minh chứng, hoặc tiêu chí Sinh viên 5 tốt. Mình sẽ trả lời dựa trên Knowledge Base chính thức của Hội Sinh viên.",
    confidence: 0.95,
  },
  "Hồ sơ của em còn thiếu gì?": {
    text: "Theo phân tích AI, hồ sơ của em đang đạt 88% Cấp Thành phố. Em cần bổ sung **2 ngày tình nguyện** và xác minh thời hạn chứng chỉ **IELTS 5.5** để hoàn tất.",
    confidence: 0.92,
    sources: ["Quy chế SV5T 2024 - Điều 5", "Hồ sơ #SV-001"],
  },
  "Em có thể đạt cấp nào?": {
    text: "Hiện tại hồ sơ em **đạt Cấp Đại học Đà Nẵng và Cấp Trường**, **có khả năng đạt Cấp Thành phố** nếu bổ sung minh chứng tình nguyện. Cấp Trung ương chưa khả thi với hồ sơ hiện tại.",
    confidence: 0.88,
    sources: ["Cascade Review #2026-06-28"],
  },
  "Minh chứng tình nguyện như thế nào là hợp lệ?": {
    text: "Minh chứng tình nguyện hợp lệ cần: (1) **Giấy chứng nhận có dấu** của tổ chức Đoàn/Hội, (2) **Ghi rõ số ngày tham gia**, (3) **Cấp tổ chức** (Trường/Thành phố/Trung ương). Cấp Thành phố cần tối thiểu **5 ngày**.",
    confidence: 0.94,
    sources: ["Hướng dẫn SV5T - Tiêu chí Tình nguyện"],
  },
  "Chứng chỉ ngoại ngữ này có dùng cho tiêu chí hội nhập không?": {
    text: "Chứng chỉ **IELTS 5.5** của em hợp lệ cho tiêu chí Hội nhập nếu **còn hiệu lực** (2 năm kể từ ngày cấp). Em vui lòng bổ sung scan trang có ngày cấp để cán bộ xác minh.",
    confidence: 0.72,
    sources: ["Quy chế SV5T - Phụ lục 2"],
  },
  "Hạn bổ sung minh chứng là khi nào?": {
    text: "Hạn bổ sung minh chứng đợt này là **15/07/2026**. Sau ngày này, hồ sơ sẽ chuyển sang xét tự động theo cấp thấp hơn.",
    confidence: 0.99,
    sources: ["Thông báo Hội Sinh viên #2026-15"],
  },
};

function Chatbot() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m-0", from: "bot", text: "Xin chào! Mình là trợ lý 5TOT — powered by **VNPT Smartbot nâng cao**. Em cần hỗ trợ gì về hồ sơ Sinh viên 5 tốt?", confidence: 1 },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { id: `m-${Date.now()}`, from: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const ans = ANSWERS[text] || ANSWERS.default;
      setMessages((m) => [...m, { id: `m-${Date.now()}-b`, from: "bot", ...ans }]);
      setTyping(false);
    }, 1100);
  };

  return (
    <>
      <TopBar title="Chatbot SV5T" subtitle="VNPT Smartbot nâng cao • Trả lời theo Knowledge Base chính thức" />

      <div className="grid lg:grid-cols-4 gap-5 h-[calc(100vh-220px)]">
        <Card className="lg:col-span-3 flex flex-col !p-0 overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${m.from === "user" ? "justify-end" : ""}`}>
                  {m.from === "bot" && (
                    <div className="w-9 h-9 rounded-2xl gradient-brand flex items-center justify-center text-white shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${m.from === "user" ? "" : ""}`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm ${m.from === "user" ? "gradient-brand text-white" : "bg-[#F4FBFF] text-foreground"}`}>
                      <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") }} />
                    </div>
                    {m.from === "bot" && m.sources && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.sources.map((s) => (
                          <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-white shadow-sm text-brand-deep border border-[#dff2ff]">📎 {s}</span>
                        ))}
                      </div>
                    )}
                    {m.from === "bot" && m.confidence !== undefined && (
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                        Confidence: <b className={m.confidence > 0.85 ? "text-emerald-600" : "text-amber-600"}>{Math.round(m.confidence * 100)}%</b>
                        <button className="ml-1 text-[#00AEEF] hover:underline"><Volume2 className="w-3 h-3 inline" /> Đọc</button>
                        {m.confidence < 0.75 && (
                          <button className="ml-auto chip bg-amber-100 text-amber-800">Chuyển cán bộ xử lý →</button>
                        )}
                      </div>
                    )}
                  </div>
                  {m.from === "user" && (
                    <div className="w-9 h-9 rounded-2xl bg-[#0057C2] flex items-center justify-center text-white shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {typing && (
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-2xl gradient-brand flex items-center justify-center text-white"><Bot className="w-4 h-4" /></div>
                <div className="bg-[#F4FBFF] px-4 py-3 rounded-2xl flex gap-1">
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 rounded-full bg-[#00AEEF]" />
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 rounded-full bg-[#00AEEF]" />
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 rounded-full bg-[#00AEEF]" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#EEF9FF] p-4 bg-white">
            <div className="flex flex-wrap gap-2 mb-3">
              {FAQ_CHIPS.map((q) => (
                <button key={q} onClick={() => send(q)} className="chip hover:bg-[#dff2ff] cursor-pointer">{q}</button>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <button className="w-11 h-11 rounded-xl bg-[#EEF9FF] text-[#0057C2] flex items-center justify-center hover:bg-[#dff2ff]" title="Voice input (SmartVoice)">
                <Mic className="w-4 h-4" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Hỏi gì đó về hồ sơ SV5T..."
                className="flex-1 px-4 py-3 rounded-xl bg-[#F4FBFF] text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
              />
              <Button onClick={() => send(input)}><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        </Card>

        <Card glow>
          <h3 className="font-bold text-brand-deep mb-3">VNPT AI</h3>
          <div className="space-y-2 text-sm">
            <div className="p-3 rounded-xl bg-[#F4FBFF]">
              <div className="font-semibold text-brand-deep">🧠 Smartbot nâng cao</div>
              <div className="text-xs text-muted-foreground mt-1">RAG trên Knowledge Base SV5T</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F4FBFF]">
              <div className="font-semibold text-brand-deep">🎙️ SmartVoice</div>
              <div className="text-xs text-muted-foreground mt-1">Voice input + TTS đọc hướng dẫn</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50">
              <div className="font-semibold text-amber-800">⚠️ Khi confidence thấp</div>
              <div className="text-xs text-amber-700 mt-1">Tự động đề xuất chuyển cán bộ phụ trách</div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
