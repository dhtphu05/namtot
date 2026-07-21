import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Criterion } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { StudentAssistantExplanation } from "./StudentAssistantExplanation";
import { useResubmitSupplement, useStudentAssistantContext } from "../hooks/useStudentAssistant";

type Props = {
  applicationId: string;
  reviewTaskId: string;
  criterion: Criterion;
  officialMessage: string;
  deadline?: string | null;
  requestedFields?: string[];
  className?: string;
};

export function SupplementCoachWorkspace({
  applicationId,
  className,
  criterion,
  deadline,
  officialMessage,
  requestedFields,
  reviewTaskId,
}: Props) {
  const params = {
    contextType: "supplement" as const,
    contextId: reviewTaskId,
    applicationId,
    criterion,
    reviewTaskId,
  };
  const context = useStudentAssistantContext(params);
  const resubmit = useResubmitSupplement(applicationId, reviewTaskId);
  const resubmitAction = context.data?.allowedActions.find(
    (action) => action.type === "resubmit_supplement",
  );
  const canResubmit = Boolean(resubmitAction?.allowed);

  return (
    <section
      className={cn(
        "grid min-w-0 gap-4 rounded-md border border-amber-200 bg-amber-50/40 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(280px,2fr)]",
        className,
      )}
    >
      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-amber-800">
            Yêu cầu chính thức từ cán bộ
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">
            {officialMessage}
          </p>
        </div>
        {deadline ? (
          <p className="text-sm font-medium text-amber-900">Hạn bổ sung: {formatDate(deadline)}</p>
        ) : null}
        {requestedFields?.length ? (
          <div>
            <p className="text-sm font-semibold text-amber-950">Nội dung cần xử lý</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900">
              {requestedFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canResubmit || resubmit.isPending}
            onClick={() => resubmit.mutate(context.data?.contextVersion)}
          >
            {resubmit.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Gửi lại bổ sung
          </Button>
          {!canResubmit ? (
            <p className="min-w-0 self-center text-sm text-amber-800">
              {resubmitAction?.disabledReason ||
                "Hoàn tất minh chứng được yêu cầu trước khi gửi lại."}
            </p>
          ) : null}
        </div>
      </div>

      <StudentAssistantExplanation
        params={params}
        title="Trợ lý bổ sung"
        compact
        className="border-amber-200 bg-white"
      />
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
