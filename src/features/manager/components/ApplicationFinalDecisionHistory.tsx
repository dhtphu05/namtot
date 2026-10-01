import { Card } from "@/components/ui-kit";
import type { ApplicationFinalDecisionHistoryItem } from "../types";

export function ApplicationFinalDecisionHistory({
  cityOnly = false,
  history,
}: {
  cityOnly?: boolean;
  history: ApplicationFinalDecisionHistoryItem[];
}) {
  if (!history.length) return null;

  return (
    <Card>
      <h2 className="font-bold text-brand-deep">Lịch sử kết quả trước đây</h2>
      <div className="mt-3 space-y-3">
        {history.map((item) => (
          <article key={item.id} className="rounded-lg border bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">
              Kết quả trước đó: {finalLabel(item.finalStatus, item.finalLevel, cityOnly)}
            </p>
            {item.finalNote ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.finalNote}</p>
            ) : null}
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Người chốt</dt>
                <dd>{item.finalizedBy?.fullName ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Thay thế lúc</dt>
                <dd>{new Date(item.supersededAt).toLocaleString("vi-VN")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Người thay thế</dt>
                <dd>{item.supersededBy?.fullName ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lý do</dt>
                <dd>{item.supersedeReason}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </Card>
  );
}

function finalLabel(status: string, level: string | null, cityOnly: boolean) {
  if (cityOnly) {
    if (status === "pending") return "Chưa chốt";
    if (status === "passed" && level === "city") return "Đạt Thành phố";
    if (status === "passed" && !level) return "Cần đối soát";
    return "Chưa đạt Thành phố";
  }
  const statusText: Record<string, string> = {
    passed: "Đạt",
    partially_passed: "Đạt cấp thấp hơn",
    failed: "Chưa đạt",
    pending: "Chưa chốt",
  };
  const levelText: Record<string, string> = {
    school: "cấp Trường",
    university: "cấp ĐHĐN",
    city: "cấp Thành phố",
    central: "cấp Trung ương",
  };
  const label = statusText[status] ?? status;
  return level ? `${label} ${levelText[level] ?? level}` : label;
}
