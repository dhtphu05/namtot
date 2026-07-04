import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, Loader2, Search, UploadCloud } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip, Progress } from "@/components/ui-kit";
import { useEventParticipants, useEvents } from "@/features/event/hooks/useEvents";
import {
  criterionLabel,
  levelLabel,
  type Criterion,
  type EventRegistryItem,
} from "@/lib/api/types";

const criteria: Array<{ value: Criterion | "all"; label: string; short: string }> = [
  { value: "all", label: "Tất cả", short: "Tất cả" },
  { value: "ethics", label: criterionLabel.ethics, short: "Đạo đức" },
  { value: "academic", label: criterionLabel.academic, short: "Học tập" },
  { value: "physical", label: criterionLabel.physical, short: "Thể lực" },
  { value: "volunteer", label: criterionLabel.volunteer, short: "Tình nguyện" },
  { value: "integration", label: criterionLabel.integration, short: "Hội nhập" },
];

export function EventRegistry() {
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [criterion, setCriterion] = useState<Criterion | "all">("all");
  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      criterion: criterion === "all" ? undefined : criterion,
      limit: 80,
    }),
    [criterion, q],
  );
  const eventsQuery = useEvents(filters);
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  useEffect(() => {
    if (!events.length) {
      setActive(null);
      return;
    }
    if (!active || !events.some((event) => event.id === active)) {
      setActive(events[0].id);
    }
  }, [active, events]);

  const event = events.find((item) => item.id === active) ?? events[0] ?? null;
  const participantsQuery = useEventParticipants(event?.id, { limit: 100 });
  const participants = participantsQuery.data ?? [];

  return (
    <>
      <TopBar
        title="Kho sự kiện chính thức"
        subtitle="Danh sách sự kiện đã được tạo từ quyết định, công văn hoặc danh sách xác nhận SV5T."
        action={
          <Button asChild>
            <Link to="/app/decision-imports">
              <UploadCloud className="h-4 w-4" />
              Import quyết định
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:h-[calc(100vh-132px)] lg:min-h-0 lg:grid-cols-12 lg:overflow-hidden">
        <aside className="min-h-0 space-y-3 lg:col-span-4 lg:flex lg:flex-col">
          <Card className="shrink-0 !p-3">
            <label className="flex items-center gap-2 rounded-lg bg-[#F6F9FC] px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="sr-only">Tìm sự kiện hoặc đơn vị</span>
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Tìm sự kiện, đơn vị..."
                className="flex-1 bg-transparent text-[12.5px] focus:outline-none"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-1">
              {criteria.map((item) => (
                <FilterChip
                  key={item.value}
                  active={criterion === item.value}
                  onClick={() => setCriterion(item.value)}
                >
                  {item.short}
                </FilterChip>
              ))}
            </div>
          </Card>

          <Card className="min-h-0 !p-2 lg:flex-1 lg:overflow-y-auto">
            {eventsQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : eventsQuery.isError ? (
              <ErrorState
                title="Không tải được kho sự kiện"
                message={
                  eventsQuery.error instanceof Error
                    ? eventsQuery.error.message
                    : "Vui lòng thử lại."
                }
                onRetry={() => void eventsQuery.refetch()}
              />
            ) : events.length ? (
              <ul className="space-y-1">
                {events.map((item) => {
                  const isActive = item.id === event?.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActive(item.id)}
                        className={`w-full rounded-lg p-2.5 text-left ${
                          isActive ? "bg-[#F1F7FD]" : "hover:bg-[#F6F9FC]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-brand-deep">
                            {item.eventName}
                          </div>
                          <Chip tone={item.rosterIndexed ? "success" : "warning"}>
                            {item.rosterIndexed ? "Đã index" : "Chờ xác nhận"}
                          </Chip>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {compactText([
                            item.organizer,
                            levelLabel[item.organizerLevel],
                            `${item.participantCount} SV`,
                          ])}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="Chưa có sự kiện trong kho"
                description="Xác nhận một phiên import quyết định để tạo sự kiện chính thức."
                action={
                  <Button asChild>
                    <Link to="/app/decision-imports">Mở Import quyết định</Link>
                  </Button>
                }
              />
            )}
          </Card>
        </aside>

        <section className="min-h-0 space-y-3 lg:col-span-5 lg:flex lg:flex-col">
          {event ? (
            <>
              <EventSummaryCard event={event} participantCount={participants.length} />
              <IndexingCard event={event} />
              <ParticipantsTable
                rows={participants}
                isLoading={participantsQuery.isLoading}
                isError={participantsQuery.isError}
                onRetry={() => void participantsQuery.refetch()}
              />
            </>
          ) : null}
        </section>

        <aside className="min-h-0 space-y-3 lg:col-span-3 lg:overflow-y-auto">
          {event ? <EventFacts event={event} /> : null}
        </aside>
      </div>
    </>
  );
}

function EventSummaryCard({
  event,
  participantCount,
}: {
  event: EventRegistryItem;
  participantCount: number;
}) {
  const facts = [
    {
      label: "Quy đổi",
      value: formatConvertedValue(event.convertedValue, event.convertedUnit),
    },
    {
      label: "Người tham gia",
      value: String(event.participantCount || participantCount),
    },
    { label: "Cấp tổ chức", value: levelLabel[event.organizerLevel] },
  ].filter((fact) => isPresent(fact.value));

  return (
    <Card className="shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sự kiện
          </div>
          <h3 className="mt-0.5 text-[17px] font-bold text-brand-deep">{event.eventName}</h3>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {compactText([event.organizer, formatDateRange(event.startDate, event.endDate)])}
          </div>
        </div>
        <Chip tone={event.rosterIndexed ? "success" : "warning"}>
          {event.rosterIndexed ? "Đã index" : "Chờ xác nhận"}
        </Chip>
      </div>
      {facts.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {facts.map((fact) => (
            <Pill key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function IndexingCard({ event }: { event: EventRegistryItem }) {
  return (
    <Card className="shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[14px] font-bold text-brand-deep">Danh sách & trạng thái index</h4>
        <Chip tone={event.rosterIndexed ? "success" : "warning"}>
          {event.rosterIndexed ? "Sẵn sàng import" : "Đang chờ"}
        </Chip>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-[#F6F9FC] p-3">
        <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-md bg-white text-primary">
          <CalendarCheck className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 text-[12.5px]">
          <div className="truncate font-semibold text-brand-deep">{event.eventName}</div>
          <div className="text-[11px] text-muted-foreground">
            {event.rosterIndexed
              ? "Danh sách đã được xác nhận trong kho sự kiện chính thức."
              : "Sự kiện đã có trong kho, danh sách đang chờ xác nhận."}
          </div>
          <div className="mt-1.5">
            <Progress value={event.rosterIndexed ? 100 : 65} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ParticipantsTable({
  rows,
  isLoading,
  isError,
  onRetry,
}: {
  rows: ReturnType<typeof useEventParticipants>["data"];
  isLoading?: boolean;
  isError?: boolean;
  onRetry: () => void;
}) {
  const safeRows = rows ?? [];
  const showClass = safeRows.some((row) => isPresent(row.className));
  const showFaculty = safeRows.some((row) => isPresent(row.faculty));
  const showStatus = safeRows.some((row) => isPresent(row.participationStatus));
  const showConverted = safeRows.some(
    (row) => typeof row.convertedValue === "number" || isPresent(row.convertedUnit),
  );
  const colSpan = 2 + [showClass, showFaculty, showStatus, showConverted].filter(Boolean).length;

  return (
    <Card className="min-h-0 lg:flex lg:flex-1 lg:flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[14px] font-bold text-brand-deep">Danh sách sinh viên</h4>
        <span className="text-[11px] text-muted-foreground">{safeRows.length} dòng</span>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Không tải được danh sách sinh viên"
          message="Vui lòng thử lại sau."
          onRetry={onRetry}
        />
      ) : (
        <div className="min-h-0 overflow-auto rounded-lg border border-[#EEF2F7] lg:flex-1">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead className="sticky top-0 z-10 bg-[#F6F9FC] text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Họ tên</th>
                <th className="px-3 py-2">MSSV</th>
                {showClass ? <th className="px-3 py-2">Lớp</th> : null}
                {showFaculty ? <th className="px-3 py-2">Khoa</th> : null}
                {showStatus ? <th className="px-3 py-2">Tham gia</th> : null}
                {showConverted ? <th className="px-3 py-2">Quy đổi</th> : null}
              </tr>
            </thead>
            <tbody>
              {safeRows.map((row) => (
                <tr key={row.id} className="border-t border-[#EEF2F7]">
                  <td className="px-3 py-2 font-semibold text-brand-deep">{row.studentName}</td>
                  <td className="px-3 py-2">{row.studentCode}</td>
                  {showClass ? <td className="px-3 py-2">{row.className ?? ""}</td> : null}
                  {showFaculty ? <td className="px-3 py-2">{row.faculty ?? ""}</td> : null}
                  {showStatus ? (
                    <td className="px-3 py-2">
                      {row.participationStatus ? (
                        <Chip tone="success">
                          {formatParticipationStatus(row.participationStatus)}
                        </Chip>
                      ) : null}
                    </td>
                  ) : null}
                  {showConverted ? (
                    <td className="px-3 py-2 font-semibold">
                      {formatConvertedValue(row.convertedValue, row.convertedUnit) ?? ""}
                    </td>
                  ) : null}
                </tr>
              ))}
              {!safeRows.length ? (
                <tr>
                  <td colSpan={colSpan} className="px-3 py-6 text-center text-muted-foreground">
                    Chưa có dòng sinh viên cho sự kiện này.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function EventFacts({ event }: { event: EventRegistryItem }) {
  const certificateUrl = event.sampleCertificateFile?.publicUrl;
  const facts = [
    { label: "Tiêu chí áp dụng", value: criterionLabel[event.criterion] },
    {
      label: "Cấp xét được phép",
      value: event.eligibleLevels.map((level) => levelLabel[level]).join(", "),
    },
    {
      label: "Đơn vị quy đổi",
      value: formatConvertedValue(event.convertedValue, event.convertedUnit),
    },
  ].filter((fact) => isPresent(fact.value));

  return (
    <>
      {facts.length ? (
        <Card>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mapping & quy đổi
          </div>
          {facts.map((fact) => (
            <KV key={fact.label} k={fact.label} v={fact.value} />
          ))}
        </Card>
      ) : null}

      {certificateUrl ? (
        <Card>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mẫu giấy chứng nhận
          </div>
          <img src={certificateUrl} alt="" className="w-full rounded-md border border-[#EEF2F7]" />
        </Card>
      ) : null}

      <Card>
        <div className="mb-2 text-[12.5px] text-muted-foreground">
          {event.rosterIndexed
            ? "Sự kiện đã sẵn sàng để sinh viên import minh chứng vào hồ sơ."
            : "Nếu danh sách chưa đúng, kiểm tra lại phiên import quyết định trước khi xác nhận."}
        </div>
        {event.rosterIndexed ? (
          <Button className="w-full" disabled>
            <CheckCircle2 className="h-4 w-4" />
            Đã xác nhận index
          </Button>
        ) : (
          <Button asChild className="w-full" variant="outline">
            <Link to="/app/decision-imports">Xem phiên import quyết định</Link>
          </Button>
        )}
      </Card>
    </>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active ? "bg-[#0057C2] text-white" : "bg-[#F1F7FD] text-brand-deep"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F6F9FC] p-2">
      <div className="text-[10.5px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[13.5px] font-bold text-brand-deep">{value}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#EEF2F7] py-1.5 text-[12px] last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold text-brand-deep">{v}</span>
    </div>
  );
}

function compactText(values: Array<string | number | null | undefined>) {
  return values.filter(isPresent).map(String).join(" • ");
}

function isPresent(value: unknown): value is string | number {
  if (typeof value === "number") return true;
  return typeof value === "string" && value.trim().length > 0;
}

function formatConvertedValue(value?: number | null, unit?: string | null) {
  if (typeof value !== "number" && !unit) return null;
  return [typeof value === "number" ? value : null, unit].filter(isPresent).join(" ");
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return null;
  if (startDate && endDate && startDate !== endDate) {
    return `${formatDate(startDate)} → ${formatDate(endDate)}`;
  }
  return formatDate(startDate ?? endDate);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date);
}

function formatParticipationStatus(value: string) {
  const normalized = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    confirmed: "Đã xác nhận",
    participated: "Tham gia",
    participant: "Tham gia",
    attended: "Tham gia",
    present: "Tham gia",
    absent: "Vắng",
    pending: "Chờ xác nhận",
  };
  return labels[normalized] ?? value;
}
