import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { CRITERIA, LEVELS, MEDIA } from "@/lib/mock-data";
import { useState } from "react";
import { Search, ListChecks, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import { useCheckEventParticipant, useEvents, useImportEventToApplication } from "@/features/event/hooks/useEvents";
import type { Criterion, EventParticipantCheck, Level } from "@/lib/api/types";

const criterionMap: Record<string, Criterion> = {
  "dao-duc": "ethics",
  "hoc-tap": "academic",
  "the-luc": "physical",
  "tinh-nguyen": "volunteer",
  "hoi-nhap": "integration",
};

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

function criterionLabel(criterion: Criterion) {
  const item = CRITERIA.find((c) => criterionMap[c.key] === criterion);
  return item?.label ?? criterion;
}

function eventImage(event: { sampleCertificateFile?: { publicUrl?: string | null } | null }) {
  return event.sampleCertificateFile?.publicUrl || MEDIA.events[0];
}

export function EventLibrary() {
  const [q, setQ] = useState("");
  const [criterion, setCriterion] = useState<Criterion | "all">("all");
  const [check, setCheck] = useState<Record<string, EventParticipantCheck>>({});

  const { data: appRes, isLoading: appLoading } = useCurrentApplication();
  const applicationId = appRes?.application?.id;
  const eventsQuery = useEvents({
    q: q.trim() || undefined,
    criterion: criterion === "all" ? undefined : criterion,
    status: "active",
    limit: 100,
  });
  const checkParticipant = useCheckEventParticipant();
  const importEvent = useImportEventToApplication();

  const events = eventsQuery.data ?? [];

  const checkName = async (eventId: string) => {
    if (!applicationId) {
      toast.error("Hãy tạo hồ sơ trước khi kiểm tra sự kiện.");
      return;
    }

    const result = await checkParticipant.mutateAsync({ eventId, applicationId });
    setCheck((current) => ({ ...current, [eventId]: result }));
    if (result.found) {
      const value = result.participant?.convertedValue;
      toast.success(value == null ? "Tìm thấy MSSV trong danh sách sự kiện" : `Tìm thấy MSSV - được tính ${value}`);
    } else {
      toast.warning(result.reason ?? "Chưa tìm thấy MSSV trong danh sách đã index");
    }
  };

  const importEv = async (eventId: string) => {
    if (!applicationId) {
      toast.error("Hãy tạo hồ sơ trước khi import sự kiện.");
      return;
    }
    await importEvent.mutateAsync({ eventId, applicationId });
  };

  return (
    <>
      <TopBar
        title="Kho minh chứng & sự kiện hợp lệ"
        subtitle="Tìm các sự kiện đã được xác nhận roster trước khi import vào hồ sơ"
      />

      <Card className="!p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-[#F6F9FC] rounded-lg px-3 py-2 flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên sự kiện, đơn vị tổ chức..."
              className="bg-transparent flex-1 text-[13px] focus:outline-none"
            />
          </div>
          <select
            value={criterion}
            onChange={(e) => setCriterion(e.target.value as Criterion | "all")}
            className="bg-[#F6F9FC] rounded-lg px-3 py-2 text-[12.5px] font-semibold text-brand-deep"
          >
            <option value="all">Tất cả tiêu chí</option>
            {CRITERIA.map((c) => (
              <option key={c.key} value={criterionMap[c.key]}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {!appLoading && !applicationId && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="text-sm text-amber-900 flex-1">
              Bạn cần tạo hồ sơ sinh viên trước khi kiểm tra hoặc import sự kiện.
            </div>
            <Link to="/app/drafts">
              <Button size="sm">Tạo hồ sơ</Button>
            </Link>
          </div>
        </Card>
      )}

      {eventsQuery.isLoading ? (
        <div className="flex items-center justify-center p-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Đang tải kho sự kiện...
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map((e) => {
            const c = check[e.id];
            const canImport = Boolean(applicationId && c?.found && c.canImport);
            return (
              <Card key={e.id} className="!p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="font-bold text-brand-deep text-[14px] leading-snug">{e.eventName}</div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">
                      {e.organizer} - {levelLabel[e.organizerLevel]}
                    </div>
                  </div>
                  <Chip tone={e.rosterIndexed ? "success" : "muted"}>
                    {e.rosterIndexed ? "Indexed" : "Chưa index"}
                  </Chip>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  <Chip tone="brand">{criterionLabel(e.criterion)}</Chip>
                  <Chip>
                    {e.convertedValue ?? "-"} {e.convertedUnit ?? ""}
                  </Chip>
                  <Chip tone="muted">{e.participantCount} SV</Chip>
                </div>
                <div className="text-[11.5px] text-muted-foreground mb-2">
                  Cấp xét: {e.eligibleLevels.map((lv) => levelLabel[lv] ?? LEVELS.find((l) => l.key === lv)?.label ?? lv).join(" / ")}
                </div>
                <img src={eventImage(e)} alt="" className="rounded-md border border-[#EEF2F7] mb-2 max-h-32 object-cover w-full" />
                {c && (
                  <div className={`text-[11.5px] rounded-md p-2 mb-2 flex items-start gap-1.5 ${c.found ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                    {c.found ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                    {c.found
                      ? `Tìm thấy ${c.participant?.studentName ?? "MSSV của bạn"} - được tính ${c.participant?.convertedValue ?? e.convertedValue ?? "-"} ${e.convertedUnit ?? ""}`
                      : c.reason ?? "Chưa tìm thấy MSSV trong danh sách."}
                  </div>
                )}
                <div className="mt-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => checkName(e.id)}
                    disabled={!applicationId || checkParticipant.isPending}
                    className="flex-1"
                  >
                    {checkParticipant.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5" />}
                    Kiểm tra tên tôi
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => importEv(e.id)}
                    disabled={!canImport || importEvent.isPending}
                    className="flex-1"
                  >
                    {importEvent.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Import
                  </Button>
                </div>
              </Card>
            );
          })}
          {events.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3 text-center text-sm text-muted-foreground">
              Chưa có sự kiện active/indexed phù hợp.
            </Card>
          )}
        </div>
      )}
    </>
  );
}
