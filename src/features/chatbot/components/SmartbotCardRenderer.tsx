import { Bot, CheckCircle2, FileText, Image as ImageIcon, LifeBuoy, Search } from "lucide-react";
import { Chip } from "@/components/ui-kit";
import type { SmartbotMessageCard } from "../types";
import { SmartbotActionButton } from "./SmartbotActionButton";

type Props = {
  card: SmartbotMessageCard;
  onPostback: (payload: string, label: string) => void;
};

export function SmartbotCardRenderer({ card, onPostback }: Props) {
  if (card.type === "carousel") {
    return (
      <div className="space-y-3">
        {card.text && <p className="whitespace-pre-wrap text-sm leading-6">{card.text}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {(card.items ?? []).map((item, index) => (
            <div key={`${item.title ?? "item"}-${index}`} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
              <CardBody card={item} onPostback={onPostback} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card.type === "action_cards") {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          {card.title && <div className="text-base font-bold text-brand-deep">{card.title}</div>}
          {card.subtitle && <p className="text-sm leading-6 text-muted-foreground">{card.subtitle}</p>}
          {card.text && <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{card.text}</p>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(card.items ?? []).map((item, index) => (
            <div key={`${item.title ?? "item"}-${index}`} className="rounded-lg border border-[#E2E8F0] bg-[#FBFDFF] p-4">
              <CardBody card={item} onPostback={onPostback} />
            </div>
          ))}
        </div>
        {(card.buttons ?? []).length > 0 && (
          <div className="flex max-w-full flex-wrap gap-2">
            {card.buttons?.map((button) => (
              <SmartbotActionButton key={button.id} action={button} onPostback={onPostback} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <CardBody card={card} onPostback={onPostback} />;
}

function CardBody({ card, onPostback }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {card.type === "handoff" ? (
          <LifeBuoy className="h-4 w-4 text-amber-600" />
        ) : card.type === "matching_event" ? (
          <Search className="h-4 w-4 text-[#0057C2]" />
        ) : card.type === "evidence_summary" || card.type === "reviewer_draft" ? (
          <FileText className="h-4 w-4 text-[#0057C2]" />
        ) : card.type === "gap_item" ? (
          <CheckCircle2 className="h-4 w-4 text-amber-600" />
        ) : card.type === "image" ? (
          <ImageIcon className="h-4 w-4 text-[#0057C2]" />
        ) : (
          <Bot className="h-4 w-4 text-[#0057C2]" />
        )}
        <Chip tone={card.type === "handoff" ? "warning" : "brand"}>{labelForCard(card)}</Chip>
      </div>

      <div className="space-y-1">
        {card.title && <div className="font-semibold text-brand-deep">{card.title}</div>}
        {card.status && <Chip tone={statusTone(card)}>{card.status}</Chip>}
      </div>
      {card.subtitle && <div className="text-sm text-muted-foreground">{card.subtitle}</div>}
      {card.text && <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{card.text}</p>}
      {card.description && <p className="text-sm leading-6 text-muted-foreground">{card.description}</p>}
      {card.type === "image" && card.url && (
        <img src={card.url} alt={card.title ?? "Smartbot"} className="max-h-56 rounded-lg object-contain" />
      )}
      {(card.buttons ?? []).length > 0 && (
        <div className="flex max-w-full flex-wrap gap-2">
          {card.buttons?.map((button) => (
            <SmartbotActionButton key={button.id} action={button} onPostback={onPostback} />
          ))}
        </div>
      )}
    </div>
  );
}

function labelForCard(card: SmartbotMessageCard) {
  if (card.type === "gap_item" && isEvidenceState(card.status)) return "Minh chứng";
  return labelForType(card.type);
}

function labelForType(type: SmartbotMessageCard["type"]) {
  if (type === "quickreply") return "Gợi ý nhanh";
  if (type === "image") return "Hình ảnh";
  if (type === "carousel") return "Thẻ";
  if (type === "action_cards") return "Hành động";
  if (type === "gap_item") return "Gap";
  if (type === "evidence_summary") return "Minh chứng";
  if (type === "matching_event") return "Matching Hub";
  if (type === "reviewer_draft") return "Dự thảo";
  if (type === "handoff") return "Cần cán bộ";
  if (type === "unknown") return "Phản hồi";
  return "Trả lời";
}

function statusTone(card: SmartbotMessageCard) {
  const status = card.status ?? "";
  if (status.includes("Đã ghi nhận") || status.includes("Có dữ liệu") || status.includes("Đã đọc được") || card.type === "matching_event") return "success";
  if (card.type === "handoff" || card.type === "gap_item") return "warning";
  return "brand";
}

function isEvidenceState(status?: string) {
  return Boolean(
    status &&
      (status.includes("Đã ghi nhận") ||
        status.includes("Có dữ liệu") ||
        status.includes("Chưa có minh chứng") ||
        status.includes("Cần kiểm tra thêm")),
  );
}
