import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { CRITERIA, LEVELS } from "@/lib/mock-data";
import { useState } from "react";
import { Search, ListChecks, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useEvents, useCheckParticipant, useImportToApplication } from "@/features/event/hooks/useEvent";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import { useAuth } from "@/features/auth/store/auth-store";
import { Link, useNavigate } from "@tanstack/react-router";
import { SmartbotPanel } from "@/features/chatbot/components/SmartbotPanel";

export function EventLibrary() {
  const user = useAuth((s) => s.user);
  const studentCode = user?.studentCode;
  const nav = useNavigate();
  const criterionMap: Record<string, string> = {
    "dao-duc": "ethics",
    "hoc-tap": "academic",
    "the-luc": "physical",
    "tinh-nguyen": "volunteer",
    "hoi-nhap": "integration",
  };
  
  const { data: appRes } = useCurrentApplication();
  const application = appRes?.application;
  const applicationId = application?.id;
  const canImportEvent =
    !!application &&
    ["draft", "prechecked", "ready_to_submit", "supplement_required", "draft_supplement"].includes(
      String(application.status),
    );

  const [q, setQ] = useState("");
  const [criterion, setCriterion] = useState("all");
  const [check, setCheck] = useState<Record<string, { ok: boolean; message?: string; loading?: boolean }>>({});

  // Query events from real API using search input and criterion filters
  const { data: eventsList = [], isLoading: isLoadingEvents } = useEvents({
    search: q || undefined,
    criterion: criterion !== "all" ? criterion : undefined,
  });

  const checkParticipantMutation = useCheckParticipant();
  const importToAppMutation = useImportToApplication();

  const checkName = async (id: string) => {
    setCheck((c) => ({ ...c, [id]: { ok: false, loading: true } }));
    try {
      const res = await checkParticipantMutation.mutateAsync({
        eventId: id,
        studentCode: studentCode || undefined,
        applicationId: applicationId || undefined,
      });

      if (res.matched) {
        const roleText = res.participant?.role ? ` - Vai trò: ${res.participant.role}` : "";
        const hoursText = res.participant?.hours ? ` (${res.participant.hours} giờ)` : "";
        setCheck((c) => ({
          ...c,
          [id]: {
            ok: true,
            message: `Có tên trong danh sách${roleText}${hoursText}`,
            loading: false,
          },
        }));
        toast.success("Đã tìm thấy thông tin của bạn trong danh sách tham gia!");
      } else {
        setCheck((c) => ({
          ...c,
          [id]: {
            ok: false,
            message: res.message || "Chưa tìm thấy MSSV của bạn trong danh sách sự kiện này",
            loading: false,
          },
        }));
        toast.warning("Không tìm thấy trong danh sách.");
      }
    } catch (err: any) {
      setCheck((c) => ({ ...c, [id]: { ok: false, message: `Kiểm tra thất bại: ${err.message}`, loading: false } }));
      toast.error(`Kiểm tra thất bại: ${err.message}`);
    }
  };

  const importEv = async (id: string) => {
    if (!applicationId) {
      toast.error("Vui lòng tạo hồ sơ trước khi import sự kiện.");
      return;
    }
    if (!canImportEvent) {
      toast.error("Hồ sơ đang được xét duyệt nên chưa thể thêm sự kiện mới.");
      return;
    }
    importToAppMutation.mutate(
      { eventId: id, applicationId },
      {
        onSuccess: () => {
          toast.success("Đã thêm sự kiện vào minh chứng!", {
            action: {
              label: "Xem trong Minh chứng",
              onClick: () => nav({ to: "/app/evidence" }),
            },
          });
        },
      }
    );
  };

  if (!appRes || appRes.state === "not_started" || !appRes.application) {
    return (
      <>
        <TopBar title="Kho sự kiện" subtitle="Vui lòng tạo hồ sơ trước khi thêm sự kiện vào minh chứng." />
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <div className="text-muted-foreground font-semibold">Bạn cần tạo hồ sơ trước khi tham chiếu kho sự kiện.</div>
          <Link to="/app/wizard">
            <Button>Tạo hồ sơ ngay <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Kho minh chứng & sự kiện hợp lệ"
        subtitle="Tìm các sự kiện đã được xác nhận roster trước khi import vào hồ sơ"
      />

      <div className="mb-5">
        <SmartbotPanel
          applicationId={applicationId}
          contextScope="student_helpdesk"
          pageContext={{ page: "matching_hub", criterion: "volunteer" }}
          compact
          initialPrompt="Mình có thể tìm minh chứng trong Matching Hub cho tiêu chí Tình nguyện tốt cấp Trường."
          quickPrompts={["Tìm minh chứng tình nguyện", "Mùa hè xanh 2025", "Hiến máu nhân đạo đợt 1"]}
        />
      </div>

      {!canImportEvent ? (
        <Card className="mb-4 bg-[#FFF7E6]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-bold text-amber-950">Hồ sơ đang được xét duyệt</div>
              <p className="mt-1 text-sm text-amber-900">Bạn vẫn có thể tra cứu sự kiện, nhưng chưa thể thêm mới vào hồ sơ cho đến khi cán bộ yêu cầu bổ sung.</p>
            </div>
            <Button variant="secondary" onClick={() => nav({ to: "/app/cascade" })}>Theo dõi xét duyệt</Button>
          </div>
        </Card>
      ) : null}

            <Card className="!p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[min(100%,260px)] flex-1 items-center gap-2 rounded-lg bg-[#F6F9FC] px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên minh chứng, tên sự kiện, đơn vị tổ chức…"
              className="min-w-0 flex-1 bg-transparent text-[13px] focus:outline-none"
            />
          </div>
          <select
            value={criterion}
            onChange={(e) => setCriterion(e.target.value)}
            className="bg-[#F6F9FC] rounded-lg px-3 py-2 text-[12.5px] font-semibold text-[#0057C2]"
          >
            <option value="all">Tất cả tiêu chí</option>
            {CRITERIA.map((c) => (
              <option key={c.key} value={criterionMap[c.key] ?? c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isLoadingEvents ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0057C2]" /></div>
      ) : eventsList.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Không tìm thấy sự kiện nào phù hợp.</div>
      ) : (
        <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {eventsList.map((e) => {
            const cr = CRITERIA.find(c => c.key === e.criterion);
            const c = check[e.id];
            return (
              <Card key={e.id} className="!p-4 flex flex-col justify-between h-full bg-white shadow-sm border border-[#EEF2F7]">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-brand-deep text-[14px] leading-snug">{e.eventName}</div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5">
                        {e.organizer || "Đơn vị tổ chức"}
                      </div>
                    </div>
                    {e.status === "indexed" && <Chip tone="success">Đã xác thực</Chip>}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {cr && <Chip tone="brand">{cr.label}</Chip>}
                    {e.level && <Chip>{e.level === "school" ? "Cấp Trường" : e.level === "university" ? "Cấp Đại học" : e.level === "city" ? "Cấp Thành phố" : "Cấp Trung ương"}</Chip>}
                    {e.participantCount !== undefined && e.participantCount !== null && (
                      <Chip tone="muted">{e.participantCount} SV tham gia</Chip>
                    )}
                  </div>

                  {e.startDate && (
                    <div className="text-[11px] text-muted-foreground">
                      Thời gian: {new Date(e.startDate).toLocaleDateString("vi-VN")}
                      {e.endDate && ` - ${new Date(e.endDate).toLocaleDateString("vi-VN")}`}
                    </div>
                  )}

                  {c && !c.loading && (
                    <div
                      className={`text-[11.5px] rounded-md p-2.5 flex items-start gap-1.5 ${
                        c.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-amber-50 text-amber-800 border border-amber-100"
                      }`}
                    >
                      {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                      <span className="leading-snug">{c.message}</span>
                    </div>
                  )}

                  {c?.loading && (
                    <div className="text-[11.5px] text-muted-foreground p-2 flex items-center gap-2 bg-[#F4FBFF] border border-[#DCE7F2] rounded-md">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0057C2]" /> Đang kiểm tra danh sách...
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => checkName(e.id)}
                    disabled={checkParticipantMutation.isPending || c?.loading}
                    className="flex-1 text-xs"
                  >
                    <ListChecks className="w-3.5 h-3.5 mr-1" /> Kiểm tra
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => importEv(e.id)}
                    disabled={!canImportEvent || !c?.ok || importToAppMutation.isPending}
                    className="flex-1 text-xs"
                  >
                    {importToAppMutation.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    Thêm vào hồ sơ
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
