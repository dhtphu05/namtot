import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BookOpenCheck, Bot, ClipboardCheck, FileQuestion, Send, User } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { useApp } from "@/lib/store";

interface Message {
  id: string;
  from: "bot" | "user";
  text: string;
}

type AssistantContext = {
  applicationId?: string;
  criterionKey?: string;
  criterionLabel?: string;
  feedbackId?: string;
  message?: string;
  nextActions?: string[];
  source: "overview" | "criterion" | "feedback" | "default";
  status?: string;
};

const defaultSuggestions = [
  "Hồ sơ của em còn thiếu gì?",
  "Minh chứng nào hợp lệ cho tiêu chí này?",
  "Em nên sửa hồ sơ ở đâu?",
  "Hạn bổ sung minh chứng là khi nào?",
];

const suggestionsBySource: Record<AssistantContext["source"], string[]> = {
  overview: [
    "Hồ sơ của em còn thiếu gì?",
    "Em cần làm gì trước khi nộp?",
    "Khi nào em có thể nộp hồ sơ?",
  ],
  criterion: [
    "Minh chứng nào hợp lệ cho tiêu chí này?",
    "Tiêu chí này còn thiếu gì?",
    "Em nên bổ sung loại minh chứng nào?",
  ],
  feedback: ["Cán bộ yêu cầu bổ sung gì?", "Em nên sửa hồ sơ ở đâu?"],
  default: defaultSuggestions,
};

export function StudentSupport() {
  const nav = useNavigate();
  const notifications = useApp((s) => s.notifications);
  const context = useMemo(readAssistantContext, []);
  const suggestions = suggestionsBySource[context.source] ?? defaultSuggestions;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m-0",
      from: "bot",
      text: getInitialMessage(context),
    },
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
      {
        id: `b-${Date.now()}`,
        from: "bot",
        text: getAssistantAnswer(clean, context),
      },
    ]);
  };

  return (
    <>
      <TopBar
        title="Trợ lý"
        subtitle="Hỏi nhanh theo ngữ cảnh hồ sơ, tiêu chí hoặc phản hồi bạn đang xử lý."
      />

      <div className="grid min-w-0 gap-5 lg:grid-cols-5">
        <Card className="flex min-h-[560px] min-w-0 flex-col overflow-hidden !p-0 lg:col-span-3">
          <div className="border-b border-[#EEF2F7] px-5 py-4">
            <div className="flex min-w-0 items-center gap-2 font-bold text-brand-deep">
              <Bot className="h-4 w-4 shrink-0" /> Trợ lý hồ sơ SV5T
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex min-w-0 gap-3 ${message.from === "user" ? "justify-end" : ""}`}
                >
                  {message.from === "bot" && <Avatar icon={<Bot className="h-4 w-4" />} />}
                  <div
                    className={`min-w-0 max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 ${
                      message.from === "user"
                        ? "bg-[#0057C2] text-white"
                        : "bg-[#F4FAFF] text-foreground"
                    }`}
                  >
                    {message.text}
                  </div>
                  {message.from === "user" && <Avatar icon={<User className="h-4 w-4" />} />}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#EEF2F7] bg-white p-4">
            <div className="mb-3 flex min-w-0 flex-wrap gap-2">
              {suggestions.map((item) => (
                <button key={item} onClick={() => send(item)} className="chip hover:bg-[#E5EFFA]">
                  {item}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && send(input)}
                placeholder="Hỏi về hồ sơ, minh chứng hoặc phản hồi..."
                className="min-w-0 flex-1 rounded-lg bg-[#F6F9FC] px-4 py-3 text-sm outline-none ring-[#0057C2]/30 focus:ring-2"
              />
              <Button onClick={() => send(input)} className="shrink-0">
                <Send className="h-4 w-4" /> Gửi
              </Button>
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-5 lg:col-span-2">
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
                  <summary className="cursor-pointer text-sm font-semibold text-brand-deep">
                    {item}
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Hệ thống ghi nhận thông tin trong hồ sơ, còn cán bộ sẽ xác nhận cuối cùng.
                  </p>
                </details>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 font-bold text-brand-deep">
              <Bell className="h-4 w-4" /> Phản hồi mới
            </div>
            <div className="mt-3 space-y-2">
              {notifications.slice(0, 3).map((item) => (
                <div key={item.id} className="min-w-0 rounded-lg bg-[#F6F9FC] px-3 py-2">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold text-brand-deep">
                      {item.title}
                    </div>
                    {!item.read && <Chip tone="brand">Mới</Chip>}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 font-bold text-brand-deep">
              <ClipboardCheck className="h-4 w-4" /> Chuẩn bị nộp
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Mở hồ sơ để kiểm tra các tiêu chí, chạy tiền kiểm và xem điều kiện nộp.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Button className="w-full" onClick={() => nav({ to: "/app/application" })}>
                Hồ sơ & minh chứng
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => nav({ to: "/app/application" })}
              >
                Tiền kiểm
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 font-bold text-brand-deep">
              <BookOpenCheck className="h-4 w-4" /> Hướng dẫn chuẩn bị hồ sơ
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="rounded-lg bg-[#F6F9FC] px-3 py-2">
                Kiểm tra thông tin cá nhân và cấp đăng ký.
              </div>
              <div className="rounded-lg bg-[#F6F9FC] px-3 py-2">
                Thêm minh chứng cho từng tiêu chí chính.
              </div>
              <div className="rounded-lg bg-[#F6F9FC] px-3 py-2">
                Xem tiền kiểm trước khi nộp hồ sơ.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function readAssistantContext(): AssistantContext {
  if (typeof window === "undefined") return { source: "default" };
  const params = new URLSearchParams(window.location.search);
  const rawSource = params.get("source");
  const source =
    rawSource === "overview" || rawSource === "criterion" || rawSource === "feedback"
      ? rawSource
      : "default";

  return {
    source,
    applicationId: params.get("applicationId") ?? undefined,
    criterionKey: params.get("criterionKey") ?? undefined,
    criterionLabel: params.get("criterionLabel") ?? undefined,
    feedbackId: params.get("feedbackId") ?? undefined,
    message: params.get("message") ?? undefined,
    nextActions: params.get("nextActions")?.split("|").filter(Boolean),
    status: params.get("status") ?? undefined,
  };
}

function getInitialMessage(context: AssistantContext) {
  if (context.source === "overview") {
    return "Mình có thể giúp bạn xem hồ sơ còn thiếu gì, bước tiếp theo và thời điểm có thể nộp. Cán bộ sẽ xác nhận cuối cùng.";
  }
  if (context.source === "criterion") {
    return `Mình có thể giúp bạn tìm minh chứng phù hợp cho ${context.criterionLabel || "tiêu chí này"}. Cán bộ sẽ xác nhận cuối cùng.`;
  }
  if (context.source === "feedback") {
    return "Mình có thể giúp bạn hiểu phản hồi và tìm đúng nơi để bổ sung. Cán bộ sẽ xác nhận cuối cùng.";
  }
  return "Mình có thể giúp bạn kiểm tra hồ sơ, minh chứng, hạn bổ sung và cách chuẩn bị trước khi nộp.";
}

function getAssistantAnswer(question: string, context: AssistantContext) {
  if (question.includes("Cán bộ yêu cầu bổ sung gì")) {
    return context.message
      ? `Hệ thống ghi nhận phản hồi: "${context.message}". Bạn có thể cần bổ sung đúng tiêu chí liên quan rồi quay lại kiểm tra hồ sơ.`
      : "Hệ thống ghi nhận phản hồi trong mục Phản hồi. Bạn có thể mở từng phản hồi để xem tiêu chí, lý do và hạn bổ sung nếu có.";
  }
  if (question.includes("sửa hồ sơ ở đâu")) {
    return context.criterionKey
      ? `Bạn có thể vào Hồ sơ & minh chứng, tiêu chí ${context.criterionLabel || context.criterionKey} để bổ sung hoặc chỉnh minh chứng liên quan.`
      : "Bạn có thể vào Hồ sơ & minh chứng, chọn tiêu chí đang được nhắc trong phản hồi rồi bổ sung minh chứng phù hợp.";
  }
  if (question.includes("còn thiếu gì") || question.includes("làm gì trước khi nộp")) {
    const actions = context.nextActions?.slice(0, 3).join("; ");
    return actions
      ? `Hệ thống ghi nhận các việc nên ưu tiên: ${actions}. Bạn có thể xử lý từng mục trong Hồ sơ & minh chứng trước khi nộp.`
      : "Bạn có thể cần kiểm tra 5 tiêu chí, bổ sung minh chứng còn thiếu và chạy tiền kiểm trước khi nộp. Cán bộ sẽ xác nhận cuối cùng.";
  }
  if (question.includes("Khi nào em có thể nộp")) {
    return "Bạn có thể nộp khi hồ sơ ở trạng thái sẵn sàng, các tiêu chí chính đã có minh chứng phù hợp và tiền kiểm không còn cảnh báo quan trọng.";
  }
  if (question.includes("Minh chứng nào hợp lệ") || question.includes("bổ sung loại minh chứng")) {
    return `Minh chứng nên thể hiện rõ tên hoạt động hoặc kết quả, thời gian trong năm xét, đơn vị xác nhận và liên quan trực tiếp đến ${context.criterionLabel || "tiêu chí đang chọn"}.`;
  }
  if (question.includes("Tiêu chí này còn thiếu gì")) {
    return "Bạn có thể cần xem trạng thái tiêu chí, số minh chứng đã có và cảnh báo tiền kiểm. Mình có thể giúp bạn tìm đúng nơi để bổ sung.";
  }
  if (question.includes("Hạn bổ sung")) {
    return "Hạn bổ sung sẽ hiển thị trực tiếp trên phản hồi nếu cán bộ đặt thời hạn. Bạn nên ưu tiên xử lý phản hồi có hạn gần nhất.";
  }
  return "Mình đã ghi nhận câu hỏi. Bạn có thể mở Hồ sơ & minh chứng để xử lý minh chứng, hoặc mở Phản hồi để xem yêu cầu từ cán bộ.";
}

function Avatar({ icon }: { icon: ReactNode }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0057C2] text-white">
      {icon}
    </div>
  );
}
