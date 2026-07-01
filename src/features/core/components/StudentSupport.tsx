import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Bot, Bell, BookOpenCheck, ClipboardCheck, FileQuestion, Send, User } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { useApp } from "@/lib/store";

interface Message {
  id: string;
  from: "bot" | "user";
  text: string;
}

const suggestions = [
  "Em còn thiếu gì để nộp hồ sơ?",
  "Minh chứng tình nguyện như thế nào là hợp lệ?",
  "Em có thể import sự kiện nào vào hồ sơ?",
  "Hạn bổ sung minh chứng là khi nào?",
];

const answers: Record<string, string> = {
  "Em còn thiếu gì để nộp hồ sơ?": "Hồ sơ của em còn cần bổ sung 2 ngày tình nguyện nếu giữ aim Cấp Thành phố, xác minh minh chứng thể lực và kiểm tra ngày cấp chứng chỉ ngoại ngữ.",
  "Minh chứng tình nguyện như thế nào là hợp lệ?": "Minh chứng nên có tên hoạt động, số ngày tham gia, đơn vị tổ chức và xác nhận của Đoàn - Hội hoặc đơn vị phụ trách.",
  "Em có thể import sự kiện nào vào hồ sơ?": "Em có thể kiểm tra Mùa hè xanh, Sinh viên khỏe hoặc các sự kiện đã có danh sách tham gia trong Kho minh chứng.",
  "Hạn bổ sung minh chứng là khi nào?": "Các hạn bổ sung sẽ hiển thị trong thông báo mới nhất và trên thẻ yêu cầu bổ sung sau khi cán bộ xét hồ sơ.",
};

export function StudentSupport() {
  const nav = useNavigate();
  const notifications = useApp((s) => s.notifications);
  const [messages, setMessages] = useState<Message[]>([
    { id: "m-0", from: "bot", text: "Mình có thể giúp em kiểm tra hồ sơ, minh chứng, hạn bổ sung và cách chuẩn bị trước khi nộp." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setInput("");
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, from: "user", text: clean },
      { id: `b-${Date.now()}`, from: "bot", text: answers[clean] ?? "Mình đã ghi nhận câu hỏi. Với hồ sơ cụ thể, em nên mở Hồ sơ của tôi để xem việc cần làm tiếp theo." },
    ]);
  };

  return (
    <>
      <TopBar
        title="Hỗ trợ"
        subtitle="Hỏi nhanh về hồ sơ, xem câu hỏi thường gặp, thông báo mới và hướng dẫn chuẩn bị."
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3 flex min-h-[620px] flex-col !p-0 overflow-hidden">
          <div className="border-b border-[#EEF2F7] px-5 py-4">
            <div className="flex items-center gap-2 font-bold text-brand-deep">
              <Bot className="h-4 w-4" /> Trợ lý hồ sơ SV5T
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.from === "user" ? "justify-end" : ""}`}
                >
                  {message.from === "bot" && <Avatar icon={<Bot className="h-4 w-4" />} />}
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${message.from === "user" ? "bg-[#0057C2] text-white" : "bg-[#F4FAFF] text-foreground"}`}>
                    {message.text}
                  </div>
                  {message.from === "user" && <Avatar icon={<User className="h-4 w-4" />} />}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#EEF2F7] bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button key={item} onClick={() => send(item)} className="chip hover:bg-[#E5EFFA]">
                  {item}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && send(input)}
                placeholder="Hỏi về hồ sơ, minh chứng hoặc hạn bổ sung..."
                className="flex-1 rounded-lg bg-[#F6F9FC] px-4 py-3 text-sm outline-none ring-[#0057C2]/30 focus:ring-2"
              />
              <Button onClick={() => send(input)}><Send className="h-4 w-4" /> Gửi</Button>
            </div>
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="flex items-center gap-2 font-bold text-brand-deep">
              <FileQuestion className="h-4 w-4" /> Câu hỏi thường gặp
            </div>
            <div className="mt-3 space-y-2">
              {[
                "Một hồ sơ có thể aim nhiều cấp không?",
                "Minh chứng upload thủ công cần thông tin gì?",
                "Khi nào cán bộ yêu cầu bổ sung?",
              ].map((item) => (
                <details key={item} className="rounded-lg bg-[#F6F9FC] px-3 py-2">
                  <summary className="cursor-pointer text-sm font-semibold text-brand-deep">{item}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">5TOT sẽ hướng dẫn trong Hồ sơ của tôi và cán bộ xác nhận quyết định cuối cùng.</p>
                </details>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 font-bold text-brand-deep">
              <Bell className="h-4 w-4" /> Thông báo mới
            </div>
            <div className="mt-3 space-y-2">
              {notifications.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-lg bg-[#F6F9FC] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-brand-deep">{item.title}</div>
                    {!item.read && <Chip tone="brand">Mới</Chip>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 font-bold text-brand-deep">
              <ClipboardCheck className="h-4 w-4" /> Nộp hồ sơ
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Mở hồ sơ để kiểm tra các tiêu chí, chạy tiền kiểm và nộp chính thức.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Button className="w-full" onClick={() => nav({ to: "/app/drafts" })}>
                Hồ sơ của tôi
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => nav({ to: "/app/ai-precheck" })}>
                Tiền kiểm
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 font-bold text-brand-deep">
              <BookOpenCheck className="h-4 w-4" /> Hướng dẫn chuẩn bị hồ sơ
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="rounded-lg bg-[#F6F9FC] px-3 py-2">Kiểm tra thông tin cá nhân và cấp aim.</div>
              <div className="rounded-lg bg-[#F6F9FC] px-3 py-2">Thêm minh chứng cho từng tiêu chí chính.</div>
              <div className="rounded-lg bg-[#F6F9FC] px-3 py-2">Xem tiền kiểm trước khi nộp hồ sơ.</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Avatar({ icon }: { icon: React.ReactNode }) {
  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0057C2] text-white">{icon}</div>;
}
