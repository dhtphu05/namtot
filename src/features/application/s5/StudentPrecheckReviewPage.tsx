import { useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { StudentApplicationWorkspace } from "@/features/application/components/StudentApplicationWorkspace";
import {
  useCitySubmissionEligibility,
  useCurrentApplication,
  useCriteriaCompletion,
  useLatestPrecheck,
  usePrecheck,
  useStudentSubmissionDeadline,
  useSubmitApplication,
} from "@/features/application/hooks/useApplication";
import {
  ApplicationContextBar,
  ButtonV2,
  InlineStateMessage,
  PageTitleV2,
  SectionHeading,
} from "@/features/application/ui-v2/components";
import {
  buildS5CriterionReviews,
  getS5GateMessage,
  getStudentCitySubmissionGate,
  getStudentSubmitErrorCopy,
  selectS5AdvisoryRecommendations,
} from "@/features/application/s5/precheck-review";
import {
  CriterionReviewCard,
  EligibilityPanel,
  PageFrame,
  RetryButton,
  SubmissionWindowPanel,
} from "@/features/application/s5/StudentPrecheckReviewPanels";
import { useAuth } from "@/features/auth/store/auth-store";
import { useEvidences } from "@/features/evidence/hooks/useEvidence";
import type {
  ApplicationState,
  ApplicationSubmissionDeadline,
  CitySubmissionEligibility,
  CriterionCompletionItem,
  EvidenceResponse,
  PrecheckResult,
} from "@/lib/api/types";
import { getStatusPresentation } from "@/lib/status-labels";

type ApplicationWithPrecheck = ApplicationState & { latestPrecheckResult?: PrecheckResult | null };

export function StudentPrecheckReviewPage() {
  const current = useCurrentApplication();
  const application = (current.data?.application ?? null) as ApplicationWithPrecheck | null;
  const applicationId = application?.id;
  const isCityIndividual =
    application?.applicationType === "individual" && application.targetLevel === "city";
  const canUseCityPrecheck =
    isCityIndividual &&
    ["draft", "prechecked", "ready_to_submit"].includes(application?.status ?? "") &&
    !application?.submittedAt;

  const precheckQuery = useLatestPrecheck(applicationId);
  const completionQuery = useCriteriaCompletion(applicationId);
  const evidenceQuery = useEvidences(applicationId, { limit: 100 });
  const eligibilityQuery = useCitySubmissionEligibility(applicationId, canUseCityPrecheck);
  const deadlineQuery = useStudentSubmissionDeadline(applicationId, canUseCityPrecheck);
  const runPrecheck = usePrecheck();
  const submit = useSubmitApplication();
  const user = useAuth((state) => state.user);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [gateNotice, setGateNotice] = useState<string | null>(null);
  const [checkingHardGates, setCheckingHardGates] = useState(false);
  const gateCheckInFlight = useRef(false);
  const submitAttemptInFlight = useRef(false);

  const completionItems = useMemo(() => completionQuery.data?.items ?? [], [completionQuery.data]);
  const evidences = useMemo(() => normalizeEvidences(evidenceQuery.data), [evidenceQuery.data]);
  const evidenceListReady = evidenceQuery.data !== undefined && !evidenceQuery.isError;
  const criterionReviews = useMemo(
    () =>
      buildS5CriterionReviews(
        completionItems as Pick<
          CriterionCompletionItem,
          "criterion" | "status" | "evidenceCount"
        >[],
        evidenceListReady ? evidences : undefined,
      ),
    [completionItems, evidences, evidenceListReady],
  );
  const recommendations = useMemo(
    () => selectS5AdvisoryRecommendations(precheckQuery.data),
    [precheckQuery.data],
  );
  const gate = getStudentCitySubmissionGate({
    applicationStatus: application?.status,
    submittedAt: application?.submittedAt,
    finalStatus: application?.finalStatus,
    eligibility: eligibilityQuery.data as CitySubmissionEligibility | undefined,
    eligibilityLoading: canUseCityPrecheck && eligibilityQuery.isLoading,
    eligibilityError: canUseCityPrecheck && eligibilityQuery.isError,
    deadline: deadlineQuery.data as ApplicationSubmissionDeadline | undefined,
    deadlineLoading: canUseCityPrecheck && deadlineQuery.isLoading,
    deadlineError: canUseCityPrecheck && deadlineQuery.isError,
    advisoryCount: recommendations.length,
  });

  const refetchHardGates = async () => {
    if (gateCheckInFlight.current) return false;
    gateCheckInFlight.current = true;
    setCheckingHardGates(true);
    try {
      const [eligibilityResult, deadlineResult] = await Promise.all([
        eligibilityQuery.refetch(),
        deadlineQuery.refetch(),
      ]);
      const refreshedGate = getStudentCitySubmissionGate({
        applicationStatus: application?.status,
        submittedAt: application?.submittedAt,
        finalStatus: application?.finalStatus,
        eligibility: eligibilityResult.data as CitySubmissionEligibility | undefined,
        eligibilityLoading: eligibilityResult.isLoading,
        eligibilityError: eligibilityResult.isError,
        deadline: deadlineResult.data as ApplicationSubmissionDeadline | undefined,
        deadlineLoading: deadlineResult.isLoading,
        deadlineError: deadlineResult.isError,
      });
      if (!refreshedGate.allowed) {
        setGateNotice(getS5GateMessage(refreshedGate.reason).description);
        return false;
      }
      setGateNotice(null);
      return true;
    } finally {
      gateCheckInFlight.current = false;
      setCheckingHardGates(false);
    }
  };

  const prepareSubmit = async () => {
    if (!application?.id || submit.isPending) return;
    submit.reset();
    setGateNotice(null);
    if (!(await refetchHardGates())) return;
    setConfirmationOpen(true);
  };

  const confirmSubmit = async () => {
    if (!application?.id || submit.isPending || submitAttemptInFlight.current) return;
    if (!(await refetchHardGates())) return;
    submitAttemptInFlight.current = true;
    try {
      submit.mutate(
        { id: application.id, allowSubmitWithWarnings: true, studentFacingError: true },
        {
          onSuccess: () => setConfirmationOpen(false),
          onError: () => {
            void eligibilityQuery.refetch();
            void deadlineQuery.refetch();
          },
          onSettled: () => {
            submitAttemptInFlight.current = false;
          },
        },
      );
    } catch {
      submitAttemptInFlight.current = false;
      setGateNotice("Chưa thể gửi hồ sơ lúc này. Vui lòng thử lại sau.");
    }
  };

  if (current.isLoading) {
    return (
      <PageFrame>
        <PageTitleV2
          title="Kiểm tra hồ sơ"
          description="Rà soát 5 tiêu chí và điều kiện gửi hồ sơ."
        />
        <LoadingState label="Đang tải hồ sơ của bạn…" />
      </PageFrame>
    );
  }

  if (current.isError) {
    return (
      <PageFrame>
        <PageTitleV2
          title="Kiểm tra hồ sơ"
          description="Rà soát 5 tiêu chí và điều kiện gửi hồ sơ."
        />
        <InlineStateMessage
          tone="critical"
          title="Chưa tải được hồ sơ của bạn"
          description="Dữ liệu hồ sơ chưa sẵn sàng. Vui lòng thử tải lại."
          action={
            <ButtonV2 variant="tertiary" size="compact" onClick={() => void current.refetch()}>
              <RefreshCw aria-hidden="true" />
              Thử tải lại
            </ButtonV2>
          }
        />
      </PageFrame>
    );
  }

  if (!application) {
    const serverSchoolYear =
      current.data && "schoolYear" in current.data ? current.data.schoolYear : undefined;
    return (
      <PageFrame>
        <PageTitleV2
          title="Kiểm tra hồ sơ"
          description="Rà soát 5 tiêu chí và điều kiện gửi hồ sơ."
        />
        <ApplicationContextBar
          workspaceName={user?.workspace?.name}
          workspaceShortName={user?.workspace?.shortName}
          schoolYear={serverSchoolYear}
          links={[]}
        />
        <InlineStateMessage
          title="Bạn chưa có hồ sơ trong hệ thống"
          description="Bắt đầu hồ sơ để cập nhật thông tin và minh chứng. Thời gian nhận hồ sơ sẽ chỉ hiển thị khi có dữ liệu cho hồ sơ của bạn."
          action={
            <ButtonV2 asChild>
              <Link to="/app/application">Bắt đầu hồ sơ</Link>
            </ButtonV2>
          }
        />
      </PageFrame>
    );
  }

  if (
    !isCityIndividual ||
    application.status === "supplement_required" ||
    application.status === "resolution_needed"
  ) {
    return <StudentApplicationWorkspace initialTab="precheck" />;
  }

  const hasBeenSent = Boolean(
    application.submittedAt ||
    ["submitted", "under_review", "resolution_needed", "completed", "rejected"].includes(
      application.status,
    ),
  );
  const finalResult = Boolean(application.finalStatus && application.finalStatus !== "pending");
  const applicationStatus = getStatusPresentation("application", application.status);
  const finalStatus = finalResult ? getStatusPresentation("final", application.finalStatus) : null;
  const submitMessage = gate.allowed ? null : getS5GateMessage(gate.reason);

  return (
    <PageFrame>
      <PageTitleV2
        title="Kiểm tra hồ sơ"
        description="Rà soát 5 tiêu chí và điều kiện gửi hồ sơ."
      />

      <section
        aria-labelledby="s5-application-summary-title"
        className="min-w-0 rounded-lg border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-3 sm:p-4"
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="s5-application-summary-title"
              className="text-sm font-semibold text-[var(--student-v2-text-primary)]"
            >
              Sinh viên 5 tốt
            </h2>
            <p className="mt-1 text-[12px] leading-4 text-[var(--student-v2-text-secondary)]">
              {[
                user?.workspace?.shortName || user?.workspace?.name,
                `Năm học ${application.schoolYear}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--student-v2-surface-secondary)] px-3 py-1 text-sm font-medium text-[var(--student-v2-text-primary)]">
            {finalStatus?.label ?? applicationStatus.label}
          </span>
        </div>
        {finalResult && application.finalNote ? (
          <p className="mt-2 text-[13px] leading-5 text-[var(--student-v2-text-secondary)]">
            {application.finalNote}
          </p>
        ) : null}
      </section>

      <section aria-label="5 tiêu chí" className="min-w-0">
        <SectionHeading
          title="5 tiêu chí"
          action={
            !hasBeenSent ? (
              <ButtonV2
                variant="tertiary"
                size="compact"
                disabled={runPrecheck.isPending || !application.id}
                onClick={() => runPrecheck.mutate({ id: application.id })}
              >
                <RefreshCw aria-hidden="true" />
                {runPrecheck.isPending ? "Đang cập nhật gợi ý…" : "Cập nhật gợi ý"}
              </ButtonV2>
            ) : undefined
          }
        />

        {completionQuery.isError || evidenceQuery.isError ? (
          <InlineStateMessage
            tone="info"
            title="Một phần thông tin tiêu chí chưa tải được"
            description="Bạn vẫn có thể xem dữ liệu đã tải. Thử tải lại để cập nhật số minh chứng."
            className="mt-3"
            action={
              <ButtonV2
                variant="tertiary"
                size="compact"
                onClick={() => {
                  void completionQuery.refetch();
                  void evidenceQuery.refetch();
                }}
              >
                Thử tải lại
              </ButtonV2>
            }
          />
        ) : null}
        {completionQuery.isLoading && !completionQuery.data ? (
          <LoadingState label="Đang tải thông tin tiêu chí…" className="mt-3" />
        ) : (
          <div
            aria-label="Năm tiêu chí Sinh viên 5 tốt"
            className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {criterionReviews.map((item) => (
              <CriterionReviewCard
                key={item.criterion}
                criterion={item.criterion}
                title={item.label}
                informationLabel={item.informationLabel}
                evidenceCount={item.evidenceCount}
                href={hasBeenSent ? undefined : item.href}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="s5-recommendations-title" className="min-w-0">
        <SectionHeading title="Gợi ý kiểm tra" description="Gợi ý tự động chỉ để tham khảo." />
        <h2 id="s5-recommendations-title" className="sr-only">
          Gợi ý kiểm tra
        </h2>
        {precheckQuery.isLoading ? (
          <LoadingState label="Đang tải gợi ý kiểm tra…" className="mt-3" />
        ) : precheckQuery.isError ? (
          <InlineStateMessage
            tone="info"
            title="Chưa tải được gợi ý kiểm tra"
            description="Bạn có thể cập nhật gợi ý hoặc tiếp tục rà soát thông tin đang có."
            className="mt-3"
            action={
              <ButtonV2
                variant="tertiary"
                size="compact"
                onClick={() => void precheckQuery.refetch()}
              >
                Thử tải lại
              </ButtonV2>
            }
          />
        ) : recommendations.length ? (
          <div className="mt-2 border-t border-[var(--student-v2-divider)]">
            <p className="py-2 text-[13px] font-semibold leading-5 text-[var(--student-v2-text-primary)]">
              {recommendations.length} gợi ý nên xem lại
            </p>
            <ul className="divide-y divide-[var(--student-v2-divider)]">
              {recommendations.map((item) => (
                <li
                  key={item.criterion ?? item.label}
                  className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    {item.criterion ? (
                      <p className="font-medium text-[var(--student-v2-text-primary)]">
                        {item.label}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[13px] leading-5 text-[var(--student-v2-text-secondary)]">
                      {item.description}
                    </p>
                  </div>
                  {item.href && !hasBeenSent ? (
                    <a
                      className="inline-flex min-h-11 shrink-0 items-center font-semibold text-[var(--student-v2-institutional-blue)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)]"
                      href={item.href}
                    >
                      Xem {item.label}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-[var(--student-v2-text-secondary)]">
            Không có gợi ý cần chú ý.
          </p>
        )}
      </section>

      {canUseCityPrecheck ? (
        <section aria-label="Điều kiện và thời gian gửi hồ sơ" className="min-w-0">
          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            <EligibilityPanel
              data={eligibilityQuery.data ?? undefined}
              isLoading={eligibilityQuery.isLoading}
              isError={eligibilityQuery.isError}
              onRetry={() => void eligibilityQuery.refetch()}
            />
            <SubmissionWindowPanel
              data={deadlineQuery.data ?? undefined}
              isLoading={deadlineQuery.isLoading}
              isError={deadlineQuery.isError}
              onRetry={() => void deadlineQuery.refetch()}
            />
          </div>
        </section>
      ) : null}

      {runPrecheck.isError ? (
        <InlineStateMessage
          tone="critical"
          title="Chưa cập nhật được gợi ý"
          description="Thông tin hồ sơ của bạn vẫn được giữ nguyên. Thử cập nhật lại sau."
        />
      ) : null}

      {hasBeenSent ? (
        <div className="flex justify-end">
          <ButtonV2 asChild variant="secondary">
            <Link to="/app/application">Theo dõi hồ sơ</Link>
          </ButtonV2>
        </div>
      ) : !precheckQuery.data ? (
        <p className="text-[13px] text-[var(--student-v2-text-secondary)]">
          Cập nhật gợi ý để xem nội dung cần rà soát.
        </p>
      ) : (
        <section
          aria-labelledby="s5-submit-title"
          className="flex min-w-0 flex-col gap-3 rounded-lg border border-[var(--student-v2-border-default)] bg-[var(--student-v2-surface-primary)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <h2
              id="s5-submit-title"
              className="font-semibold text-[var(--student-v2-text-primary)]"
            >
              Gửi hồ sơ
            </h2>
            <p className="mt-1 text-[13px] text-[var(--student-v2-text-secondary)]">
              Gợi ý không ngăn việc gửi hồ sơ.
            </p>
            {!gate.allowed && submitMessage ? (
              <p
                id="s5-submit-gate-message"
                className="mt-2 text-[13px] leading-5 text-[var(--student-v2-text-secondary)]"
              >
                {submitMessage.title}. {submitMessage.description}
              </p>
            ) : null}
            {gateNotice ? (
              <p
                role="alert"
                className="mt-2 text-sm text-[var(--student-v2-progress-supplement-text)]"
              >
                {gateNotice}
              </p>
            ) : null}
          </div>
          <ButtonV2
            type="button"
            disabled={!gate.allowed || submit.isPending || checkingHardGates}
            aria-describedby={!gate.allowed ? "s5-submit-gate-message" : undefined}
            onClick={() => void prepareSubmit()}
          >
            {submit.isPending ? "Đang gửi hồ sơ…" : "Gửi hồ sơ"}
          </ButtonV2>
        </section>
      )}

      <ConfirmDialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          if (!submit.isPending && !checkingHardGates) setConfirmationOpen(open);
        }}
        title="Gửi hồ sơ xét cấp Thành phố?"
        description="Hồ sơ sẽ chuyển sang quy trình xét của Hội Sinh viên Thành phố. Sau khi được tiếp nhận, bạn sẽ không thể chỉnh sửa như khi còn là bản nháp."
        impact={
          recommendations.length
            ? `Hệ thống đang có ${recommendations.length} gợi ý tham khảo. Bạn đã xem lại và có thể chọn gửi hồ sơ dù còn các gợi ý này.`
            : "Vui lòng xác nhận bạn muốn chuyển hồ sơ sang quy trình xét cấp Thành phố."
        }
        confirmLabel={recommendations.length ? "Vẫn gửi hồ sơ" : "Gửi hồ sơ"}
        pendingLabel={checkingHardGates ? "Đang xác nhận điều kiện…" : "Đang gửi hồ sơ…"}
        error={gateNotice ?? (submit.error ? getStudentSubmitErrorCopy(submit.error) : null)}
        isPending={submit.isPending || checkingHardGates}
        onConfirm={confirmSubmit}
      />
    </PageFrame>
  );
}

function normalizeEvidences(value: unknown): EvidenceResponse[] {
  if (Array.isArray(value)) return value as EvidenceResponse[];
  if (value && typeof value === "object") {
    const record = value as { evidences?: unknown; items?: unknown; data?: unknown };
    if (Array.isArray(record.evidences)) return record.evidences as EvidenceResponse[];
    if (Array.isArray(record.items)) return record.items as EvidenceResponse[];
    if (Array.isArray(record.data)) return record.data as EvidenceResponse[];
  }
  return [];
}
