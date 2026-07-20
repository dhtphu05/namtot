# Status Priority

Student-facing status must be chosen from the highest available business layer:

1. Final result: final status, final level, final note, finalized timestamp.
2. Officer or committee decision: accepted, rejected, criterion finalization.
3. Supplement request: active requested fields, reason, deadline, opened criterion.
4. Resolution status: waiting for council, accepted, rejected, supplement required.
5. Review status: submitted, under review, task assignment, task decision.
6. Criteria completion/precheck: not started, in progress, needs verification, ready for precheck, warning.
7. Raw requirement/evidence metadata: requirement item status, response kind, source type, file status.

Rules:

- If final result exists, display final result first and demote completion counts to metadata.
- If a review task is accepted, do not show the same criterion as requiring verification because of stale completion data.
- If supplement is active, make the supplement criterion and requested work primary.
- If completion is `accepted`, show accepted/reviewed wording rather than generic ready-for-precheck wording.
- Unknown statuses need Vietnamese fallback such as `Đang cập nhật trạng thái`.
