# Staff Lane State Dictionary — S0

Đây là dictionary của code hiện tại, không phải danh sách state mới. Chỉ các giá trị xuất hiện trong Prisma/schema, validation, route/service hoặc FE type hiện tại mới được ghi nhận.

## 1. Roles

| Role | Domain meaning hiện tại | Staff Lane relevance | Evidence |
|---|---|---|---|
| `student` | Chủ hồ sơ cá nhân | Ngoài Staff Lane | Prisma `Role`, FE role map |
| `class_representative` | Đại diện tập thể | Ngoài Staff Lane trực tiếp | Prisma `Role`, collective routes |
| `data_uploader` | Nhập quyết định/roster | Award Registry lane | Award routes router-wide guard |
| `officer` | Cán bộ legacy theo trường | Compatibility reviewer | review/resolution/evidence routes |
| `manager` | Quản lý legacy theo trường | Compatibility manager/finalizer | manager routes |
| `committee` | Hội đồng legacy theo trường | Compatibility committee/finalizer | manager/resolution routes |
| `city_officer` | Cán bộ City theo specialization | City Officer | City workspace review scope |
| `city_manager` | Điều phối/quản lý City | City Manager | seasons, assignment, results, deadlines |
| `city_committee` | Hội đồng City | City Committee | resolution, results/finalization, export/audit intent |
| `admin` | Quản trị hệ thống | Admin lane + cross-scope | admin routes |

Nguồn schema: `sv5tot-hackaithon-backend/prisma/schema.prisma`. Nguồn FE mapping: `namtot/src/features/auth/role-map.ts`, `src/lib/role-navigation.ts`, `src/features/auth/route-guard.ts`.

## 2. Workspace scope

| Value | Meaning | Current behavior |
|---|---|---|
| `SCHOOL` | Workspace trường | City review roles read active School workspaces through `reviewWorkspaceFilterFor` |
| `UNIVERSITY_SYSTEM` | Đơn vị hệ thống/ĐH | Exists in schema; needs lane-specific use confirmation |
| `CITY` | Workspace City | Required for `city_officer`, `city_manager`, `city_committee` in review scope |

Rules hiện tại:

- Legacy non-admin roles are filtered by their own `workspaceId`.
- City review roles must have a City workspace and can access active School resources via the review scope helper.
- Admin bypasses workspace filter in helpers.
- `assertReviewWorkspaceAccess` returns not-found for out-of-scope resources, reducing cross-workspace disclosure.

Evidence: `sv5tot-hackaithon-backend/src/shared/utils/review-workspace-scope.ts`, `src/shared/utils/workspace-scope.ts`, auth middleware and related scope tests.

## 3. Criteria

### Core Staff Lane criteria — exactly five

| Key | UI label family | Notes |
|---|---|---|
| `ethics` | Đạo đức tốt | Core |
| `academic` | Học tập tốt | Core |
| `physical` | Thể lực tốt | Core |
| `volunteer` | Tình nguyện tốt | Core |
| `integration` | Hội nhập tốt | Core |

FE source of truth for the five-key presentation is `src/lib/criteria-matrix.ts` (`CoreCriterion`, `coreCriteria`) and queue constants. BE seed source is `prisma/seeds/criteria/criteria.helpers.ts` (`coreCriteria`).

### Auxiliary enum values that still exist

| Key | Current meaning | Freeze treatment |
|---|---|---|
| `priority` | Thành tích/nhãn ưu tiên hoặc supporting evidence | Không coi là tiêu chí thứ sáu |
| `collective` | Tập thể/collective review domain | Tách khỏi individual five-criteria matrix |

Prisma `Criterion` and FE public types still include all seven values. Any Staff Lane response containing them must specify whether they are auxiliary keys or core criterion rows.

## 4. Application lifecycle

Prisma `ApplicationStatus` exact values:

| State | Meaning / current writer |
|---|---|
| `not_started` | Chưa bắt đầu |
| `draft` | Đang soạn |
| `prechecked` | Đã precheck |
| `ready_to_submit` | Đủ điều kiện gửi |
| `submitted` | Đã nộp |
| `supplement_required` | Cần bổ sung |
| `under_review` | Đang xét |
| `resolution_needed` | Cần Resolution/Committee |
| `completed` | Workflow completed |
| `rejected` | Bị từ chối |

Additional lifecycle fields are not states but must remain visible in contract: `cancelledAt/by/reason`, `archivedAt/by/reason`, `finalizedAt/by`, `finalStatus`, `finalLevel`, `finalNote`.

Manager/resolution/review services recompute application status from task, supplement and open resolution state. Finalization is a separate explicit action; 5/5 criteria does not itself imply final result.

## 5. Review task lifecycle

Prisma `ReviewTaskStatus` exact values:

| State | Meaning | Typical owner/action |
|---|---|---|
| `waiting` | Chờ xử lý/claim | officer/city officer can claim when specialized |
| `reviewing` | Đang xử lý | assigned officer or manager service |
| `supplement_required` | Đang chờ bổ sung | officer/manager/committee action path |
| `accepted` | Tiêu chí/task được chấp nhận | reviewer; manager can override according to service |
| `rejected` | Tiêu chí/task bị từ chối | reviewer; note required |
| `resolution_needed` | Đã chuyển hội đồng | reviewer escalation / resolution workflow |

`ReviewDecision` exact values: `accepted`, `rejected`, `supplement_required`, `resolution_needed`.

Important permission distinction:

- Route role lists are not task permissions.
- `ReviewService.getTaskPermissions` gives `canView`, `canAct`, `canClaim` and a reason.
- Committee roles view tasks only when status is `resolution_needed` in the current service implementation.
- City Officer claim/act is specialization-aware.

## 6. Supplement lifecycle

`SupplementRequest` exists as a model with `status String @default("active")`, not an enum. Current fields include criterion, official message, requested fields/evidence scope/accepted types JSON, deadline, createdBy, resubmittedAt, closedAt and history JSON.

Known contract values from current code/docs include:

- active/open request behavior
- resubmission/closed history behavior
- application/task status `supplement_required`

Because the DB field is free string, S1 must inventory all literal values before adding UI assumptions. Do not call it an enum in FE until BE contract is frozen.

## 7. Resolution lifecycle

Prisma `ResolutionStatus` exact values:

| Stored state | UI/workflow meaning |
|---|---|
| `open` | Case đang mở |
| `in_review` | Đang hội ý/xử lý |
| `resolved` | Đã xử lý |
| `rejected` | Resolution kết thúc theo hướng rejected |

Current compatibility aliases in service/query mapping include `analyzing`, `committee_review`, `closed`; these map to stored states or special `committeeDecision` content. Canonical write path is `/resolve`; `/status` is deprecated compatibility.

Resolution final decisions used by service/FE include `accepted`, `rejected`, `supplement_required`, and `closed_no_action` in the committee decision payload. Evidence and ReviewTask statuses are updated as part of resolution handling.

## 8. Final result

Prisma `FinalStatus` exact values:

- `pending`
- `passed`
- `failed`
- `partially_passed`

`Level` exact values:

- `school`
- `university`
- `city`
- `central`

Finalization must remain a human explicit action. Current manager service computes aggregation/suggested level and blocking reasons, then finalizer endpoints write the result. Reopen-final is an explicit compatibility/governance action with history.

## 9. Award Registry states

| Domain | Exact values |
|---|---|
| `AwardDecisionStatus` | `DRAFT`, `CONFIRMED`, `ARCHIVED` |
| `AwardRecipientMatchStatus` | `MATCHED`, `UNMATCHED`, `CONFLICT` |
| `RosterPreviewValidationStatus` | `valid`, `warning`, `invalid`, `duplicate`, `missing_student_code`, `needs_manual_review` |
| `DecisionImportStatus` (legacy) | `draft`, `uploaded`, `extracting_metadata`, `ocr_processing`, `parsing_roster`, `preview_ready`, `confirmed`, `failed`, `cancelled` |
| `IndexingStatus` | `not_started`, `uploaded`, `pending_indexing`, `ocr_processing`, `extracting`, `checking_registry`, `indexed`, `failed`, `needs_manual_review` |

Award Registry is not the same state machine as legacy Decision Import. Do not use `DecisionImportStatus` labels for `AwardDecisionStatus`.

## 10. Notification and audit values

`NotificationType` current values: `system`, `deadline`, `supplement_required`, `supplement_requested`, `precheck_completed`, `review_updated`, `resolution_updated`, `application_updated`, `export_ready`, `result_available`.

Audit records contain actor/workspace/action/target/before/after/note fields. The existence of an `AuditLog` model does not imply an entity-specific HTTP endpoint; current BE route only exposes the collection path `/api/audit/logs`.

## 11. Freeze rules

1. Core Staff Lane criterion rows are five only.
2. `priority` and `collective` remain auxiliary/legacy until an explicit product decision says otherwise.
3. Stored enum values are authoritative; FE labels and aliases must not create new backend states.
4. Route role, workspace scope and per-resource permission must be documented separately.
5. Explicit finalization is required; aggregation/suggestion is not a final result.

## 12. S1 permission and criteria alignment — 2026-09-30

### Individual City criteria contract

The shared BE source is `src/shared/constants/criteria.ts`:

```text
coreCriteria = [ethics, academic, physical, volunteer, integration]
```

It is re-exported by the rules module for source compatibility. City task creation, City dashboard bottlenecks, City analytics and City-facing individual summaries use this five-item contract. `priority` and `collective` are not a sixth/seventh individual City criterion; they remain available only where legacy or auxiliary domain behavior explicitly needs them.

### Review authority contract

- City Officer may claim/decide according to assignment and specialization.
- City Manager retains coordination and existing finalization authority.
- City Committee may view resolution-needed task context and use Resolution/finalization flows.
- City Committee cannot perform normal ReviewTask decision, request supplement or escalate-resolution mutations.
- Legacy Committee permissions and compatibility routes are not expanded or deleted.

### Endpoint contract

Audit collection is `/api/audit/logs`. City-capable Committee Inbox is `/api/manager/committee-inbox`; the legacy inbox remains `/api/committee/inbox` for its existing roles. Knowledge/precedent remains legacy-only.
