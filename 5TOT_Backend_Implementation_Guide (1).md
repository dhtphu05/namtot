Tài liệu này gom backend plan, database tables, API catalog, cấu trúc thư mục production, phases triển khai và kiến trúc AI để team có thể bắt đầu code backend ngay sau giai đoạn FE-first.

# 5TOT Backend Implementation Guide

ExpressJS + TypeScript + Supabase PostgreSQL Database Only

# 1. Mục tiêu và phạm vi

Backend 5TOT cần cover được FE Lovable hiện tại và proposal: một hồ sơ SV5T duy nhất theo năm học, một bản nháp cập nhật liên tục, chọn cấp aim, nhập chỉ số rõ ràng như GPA/điểm rèn luyện, upload hoặc import minh chứng theo 5 tiêu chí, OCR/indexing, Evidence Card, Event Registry, Knowledge Base, AI tiền kiểm, Cascade Review, phân luồng cán bộ chuyên trách, Resolution Hub, audit, notification và export.

- Supabase chỉ dùng làm PostgreSQL database host; không dùng Supabase Auth, Storage, Edge Function, Realtime hoặc RLS làm core.
- ExpressJS chịu trách nhiệm auth, phân quyền, upload file, workflow nghiệp vụ, rules engine, orchestration AI/OCR, audit và notification.
- AI chỉ hỗ trợ đọc, bóc tách, tìm case tương tự, gợi ý và giải thích; cán bộ/Hội đồng xác nhận quyết định cuối cùng.
- Kiến trúc backend là modular monolith production-ready, không tách microservices trong MVP để tránh phức tạp không cần thiết.

## 1.1. Nguyên tắc nghiệp vụ bắt buộc

| Nguyên tắc          | Ý nghĩa backend                                                         | Ràng buộc cần enforce                                                       |
| ------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Một hồ sơ/năm       | Mỗi sinh viên chỉ có 01 hồ sơ SV5T cá nhân trong một năm học.           | Unique constraint: student_id + school_year + application_type.             |
| Một bản nháp        | Hồ sơ có một draft đang cập nhật, không tạo nhiều draft rời rạc.        | Application lưu current_draft_version; draft snapshot chỉ để lịch sử/audit. |
| Cấp aim là field    | Cấp Trường/ĐHĐN/Thành phố/Trung ương là target_level trong application. | Không tạo application riêng theo cấp.                                       |
| Minh chứng có tên   | Mỗi Evidence bắt buộc có evidence_name để search/đối chiếu.             | Validate evidence_name required ở API.                                      |
| AI không chốt       | AI gợi ý, cán bộ xác nhận.                                              | Không route AI nào được update final_result trực tiếp.                      |
| Cán bộ chuyên trách | Review task được tách theo tiêu chí/minh chứng và gán cán bộ.           | Officer chỉ thấy task được giao/đúng specialization.                        |

# 2. Kiến trúc tổng quan

```txt
React/Lovable Frontend
        |
        | HTTPS + Bearer JWT
        v
ExpressJS Backend (TypeScript)
  - Auth + RBAC
  - Application workflow
  - Evidence workflow
  - Event Registry indexing
  - Rules Engine + Cascade
  - Officer/Manager workflow
  - AI/OCR adapters
  - Audit + Notification
        |
        | Prisma/Drizzle connection
        v
Supabase PostgreSQL Database only
        |
        +-- Local filesystem in dev / S3/R2-compatible storage in prod
        +-- VNPT SmartReader/Smartbot/SmartUX adapters (real or mock)
```

## 2.1. Stack kỹ thuật đề xuất

| Layer          | Lựa chọn                     | Ghi chú                                          |
| -------------- | ---------------------------- | ------------------------------------------------ |
| Runtime        | Node.js LTS + TypeScript     | Strict mode, module boundary rõ ràng.            |
| HTTP framework | ExpressJS                    | Nhẹ, phù hợp MVP; bổ sung middleware production. |
| Database       | Supabase PostgreSQL          | Chỉ dùng DB host; backend tự xử lý bảo mật.      |
| ORM            | Prisma khuyến nghị           | Schema rõ, migration/seed dễ, team đọc nhanh.    |
| Validation     | Zod                          | Validate body/query/params/env.                  |
| Auth           | JWT + bcrypt                 | Không dùng Supabase Auth.                        |
| File upload    | Multer + Storage abstraction | Local dev; S3/R2/MinIO prod.                     |
| Job            | DB-backed indexing_jobs      | Không cần Redis ở MVP; tách worker sau.          |
| Logging        | Pino hoặc Winston            | Có requestId, userId, response time.             |
| Docs           | OpenAPI/Swagger              | Giúp FE integrate nhanh.                         |

## 2.2. Module domain chính

| Module                    | Vai trò                                                 | FE liên quan                             |
| ------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| auth/users                | Đăng nhập, profile, role, cán bộ chuyên trách.          | Login, role switch/demo user.            |
| applications              | Một hồ sơ/năm, single draft, target level, submit.      | Dashboard, Bản nháp.                     |
| metrics                   | GPA, điểm rèn luyện, điểm thể dục, số ngày rõ ràng.     | Form nhập chỉ số.                        |
| evidences/files           | Tạo minh chứng, upload, indexing status, Evidence Card. | Minh chứng theo tiêu chí.                |
| event-registry            | HSV/Đoàn upload danh sách, OCR/index, sinh viên import. | Kho sự kiện hợp lệ.                      |
| knowledge-base            | Case đã duyệt/từ chối, mẫu GCN, lỗi thường gặp.         | Kho tri thức minh chứng, Officer review. |
| precheck/cascade/rules    | Rules Engine, AI pre-check, Cascade Review.             | AI tiền kiểm, Cascade.                   |
| review/manager/resolution | Task chuyên trách, phân công, xử lý mập mờ, chốt.       | Officer/Manager/Resolution Hub.          |
| notifications/audit       | Thông báo sinh viên, lịch sử thao tác.                  | Thông báo, Timeline, Audit.              |
| ai/vnpt/jobs              | SmartReader, Smartbot, SmartUX, OCR/indexing jobs.      | VNPT AI Center, chatbot, indexing.       |

# 3. Roadmap triển khai theo phase

| Phase    | Tên phase                           | Backend work                                                                  | Definition of Done                                  |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| Phase 0  | Project foundation                  | Express TS, Prisma, env validation, logger, error handler, OpenAPI skeleton.  | GET /health, GET /api/version chạy ổn.              |
| Phase 1  | Auth + RBAC                         | JWT login, bcrypt, user seed, middleware role/owner/specialization.           | FE login và gọi /api/me được.                       |
| Phase 2  | Single application + draft          | Application current, start, target level, autosave, submit state.             | Dashboard/Bản nháp dùng API thật; chặn nhiều hồ sơ. |
| Phase 3  | Metrics + Evidence upload           | GPA/điểm rèn luyện, tạo evidenceName, upload file, pending indexing.          | Sinh viên tạo minh chứng thật, có file metadata.    |
| Phase 4  | Mock OCR + Evidence Card            | DB-backed jobs, mock SmartReader adapter, Evidence Card, warnings/confidence. | Upload đổi trạng thái và sinh Evidence Card.        |
| Phase 5  | Event Registry                      | HSV/Đoàn tạo event, upload roster, OCR/index, check MSSV, import evidence.    | Kho sự kiện hợp lệ hoạt động end-to-end.            |
| Phase 6  | Rules Engine + Precheck + Cascade   | Criteria versions, rules theo cấp, missing items, suggested level.            | AI pre-check/Cascade dựa trên data DB.              |
| Phase 7  | Officer specialized review          | Submit auto-create review tasks; officer queue theo tiêu chí; decision.       | Cán bộ chỉ thấy task đúng chuyên trách.             |
| Phase 8  | Manager + Resolution + Notification | Phân công, workload, case mập mờ, thông báo bổ sung, audit.                   | Manager/Hội đồng demo được workflow.                |
| Phase 9  | AI integration real                 | SmartReader thật, Smartbot/RAG, SmartUX analytics, KB search nâng cao.        | FE VNPT AI Center phản ánh trạng thái thật.         |
| Phase 10 | Hardening & deploy                  | Test, seed demo, rate-limit, Docker, CI, backup, docs.                        | MVP ổn định 3 lần demo liên tiếp.                   |

## 3.1. Vertical slice nên code đầu tiên

```txt
Login
→ GET current application
→ Start application
→ Update target level
→ Input GPA + conduct score
→ Create evidence with evidenceName
→ Upload file
→ Pending indexing
→ Mock OCR creates Evidence Card
→ Create Event Registry
→ Check MSSV in event roster
→ Import event as evidence
→ Run precheck
→ Run cascade review
→ Submit application
→ Auto-create review tasks by criterion
→ Officer reviews one task
→ Audit log updates
```

# 4. Database design

Phần này mô tả schema logic. Khi implement bằng Prisma, nên tạo enum rõ ràng, dùng UUID cho id, timestamps đầy đủ, soft-delete nếu cần và index cho các cột search/filter thường dùng.

## 4.1. Enums lõi

| Enum               | Values                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Role               | student, class_representative, officer, manager, committee, admin                                                                     |
| Criterion          | ethics, academic, physical, volunteer, integration, priority, collective                                                              |
| Level              | school, university, city, central                                                                                                     |
| ApplicationStatus  | not_started, draft, prechecked, ready_to_submit, submitted, supplement_required, under_review, resolution_needed, completed, rejected |
| EvidenceSourceType | metric_input, event_import, manual_upload, collective_import                                                                          |
| IndexingStatus     | not_started, uploaded, pending_indexing, ocr_processing, extracting, checking_registry, indexed, failed, needs_manual_review          |
| ReviewTaskStatus   | waiting, reviewing, supplement_required, accepted, rejected, resolution_needed                                                        |
| JobStatus          | queued, processing, completed, failed                                                                                                 |

## 4.2. Bảng user, role và phân công

| Table                          | Cột chính                                                                                                              | Ghi chú                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| users                          | id, full_name, email, password_hash, phone, role, student_code, class_name, faculty, is_active, created_at, updated_at | Tự quản lý auth, không dùng Supabase Auth.    |
| officer_specializations        | id, officer_id, criterion, faculty_scope, is_active                                                                    | Dùng để filter task theo cán bộ chuyên trách. |
| user_sessions / refresh_tokens | id, user_id, token_hash, expires_at, revoked_at                                                                        | Tùy chọn nếu dùng refresh token.              |

## 4.3. Bảng hồ sơ cá nhân/tập thể

| Table                       | Cột chính                                                                                                                                                                    | Constraint/Index                                                               | Mục đích                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| applications                | id, student_id, school_year, application_type, target_level, status, readiness_score, current_draft_version, submitted_at, final_level, final_status, created_at, updated_at | UNIQUE(student_id, school_year, application_type); INDEX(status, target_level) | Hồ sơ SV5T duy nhất theo năm học.                    |
| application_draft_snapshots | id, application_id, version, snapshot_json, created_by, created_at                                                                                                           | INDEX(application_id, version)                                                 | Lưu lịch sử autosave/version khi cần rollback/audit. |
| application_metrics         | id, application_id, metric_type, value, scale, evidence_file_id, verification_status, created_at                                                                             | UNIQUE(application_id, metric_type)                                            | GPA, điểm rèn luyện, điểm thể dục, số ngày rõ ràng.  |

## 4.4. Bảng minh chứng và file

| Table          | Cột chính                                                                                                                                             | Ghi chú                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| files          | id, owner_id, storage_type, file_path, public_url, original_name, mime_type, file_size, uploaded_by, created_at                                       | Metadata file; file vật lý nằm local/S3/R2.        |
| evidences      | id, application_id, evidence_name, criterion, source_type, event_id, status, indexing_status, confidence, assigned_officer_id, created_at, updated_at | evidence_name required để cán bộ search/đối chiếu. |
| evidence_files | id, evidence_id, file_id, file_role                                                                                                                   | Một evidence có thể có nhiều file.                 |
| evidence_cards | id, evidence_id, ocr_text, extracted_fields_json, warnings_json, matched_event_id, matched_knowledge_item_ids, confidence, ai_summary, created_at     | Output chuẩn hóa sau OCR/indexing.                 |

## 4.5. Event Registry và danh sách đã index

| Table              | Cột chính                                                                                                                                                                                                             | Ghi chú                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| event_registries   | id, event_name, criterion, organizer, organizer_level, start_date, end_date, converted_value, converted_unit, eligible_levels_json, participant_count, roster_indexed, sample_certificate_file_id, status, created_by | Danh mục sự kiện/hoạt động được HSV/Đoàn xác nhận.     |
| event_files        | id, event_id, file_id, indexing_status, column_mapping_json, index_quality_score, created_at                                                                                                                          | File danh sách/roster nguồn.                           |
| event_participants | id, event_id, student_code, student_name, class_name, faculty, participation_status, indexed_row, converted_value, source_file_id                                                                                     | Kết quả OCR/index danh sách để sinh viên import nhanh. |

## 4.6. Knowledge Base, rules, review, resolution

| Table                 | Cột chính                                                                                                                                                        | Mục đích                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| knowledge_base_items  | id, evidence_name, event_name, criterion, level, decision, reason, sample_certificate_file_id, required_fields_json, common_errors_json, usage_count, created_by | Case đã duyệt/từ chối, tiền lệ và lỗi thường gặp. |
| criteria_versions     | id, school_year, unit_scope, level, version_name, effective_from, effective_to, is_active                                                                        | Phiên bản tiêu chí theo năm/cấp/đơn vị.           |
| criteria_rules        | id, criteria_version_id, criterion, rule_key, rule_type, threshold_json, evidence_requirements_json, human_readable_text                                         | Rules Engine đọc từ DB hoặc seed constants.       |
| precheck_results      | id, application_id, result_json, readiness_score, missing_items_json, next_best_action, created_at                                                               | Kết quả tiền kiểm theo thời điểm.                 |
| cascade_reviews       | id, application_id, target_level, suggested_level, level_results_json, human_confirmation_required, created_at                                                   | Kết quả xét từ cấp aim xuống cấp phù hợp.         |
| review_tasks          | id, application_id, criterion, assigned_officer_id, status, decision, officer_note, due_date, created_at                                                         | Task chuyên trách theo tiêu chí.                  |
| review_task_evidences | review_task_id, evidence_id                                                                                                                                      | Bảng nối task - minh chứng.                       |
| resolution_cases      | id, application_id, evidence_id, reason, status, committee_decision, created_by, closed_by                                                                       | Case mập mờ cần Hội đồng xử lý.                   |

## 4.7. Jobs, audit, notification, collective

| Table                | Cột chính                                                                                                                        | Mục đích                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| indexing_jobs        | id, job_type, target_id, status, attempts, error_message, result_json, created_at, updated_at                                    | Xử lý OCR/indexing async.                      |
| audit_logs           | id, actor_id, actor_role, action, target_type, target_id, before_state_json, after_state_json, note, created_at                  | Truy vết toàn bộ thao tác AI/cán bộ/sinh viên. |
| notifications        | id, user_id, application_id, type, title, message, read_at, created_at                                                           | Thông báo bổ sung, kết quả, deadline.          |
| collective_profiles  | id, representative_id, class_name, school_year, target_level, status, readiness_score                                            | Hồ sơ tập thể duy nhất của lớp/chi hội.        |
| collective_members   | id, collective_profile_id, student_code, student_name, class_name, participation_status, individual_sv5t_level, violation_status | Roster lớp và trạng thái từng sinh viên.       |
| collective_evidences | id, collective_profile_id, evidence_id, collective_criterion                                                                     | Minh chứng tập thể follow tiêu chí.            |

# 5. API catalog

Tên endpoint có thể điều chỉnh theo convention của team. Tất cả response nên cùng format: { success, data, error, meta }. Tất cả route ghi nghiệp vụ quan trọng phải tạo audit log.

## 5.1. Auth & users

| Method | Path               | Role                  | Mục đích                                         |
| ------ | ------------------ | --------------------- | ------------------------------------------------ |
| POST   | /api/auth/login    | public                | Đăng nhập bằng email/password, trả access token. |
| POST   | /api/auth/register | admin/public tùy mode | Tạo user; MVP có thể chỉ seed user.              |
| POST   | /api/auth/refresh  | authenticated         | Cấp access token mới nếu dùng refresh token.     |
| POST   | /api/auth/logout   | authenticated         | Revoke refresh token/session.                    |
| GET    | /api/me            | authenticated         | Lấy profile người dùng hiện tại.                 |
| PATCH  | /api/me            | authenticated         | Cập nhật profile cơ bản.                         |
| GET    | /api/users         | manager/admin         | Danh sách user/cán bộ để phân công.              |

## 5.2. Application & draft

| Method | Path                                    | Role                  | Mục đích                                          |
| ------ | --------------------------------------- | --------------------- | ------------------------------------------------- |
| GET    | /api/applications/current               | student               | Lấy hồ sơ SV5T hiện tại theo năm học.             |
| POST   | /api/applications/current/start         | student               | Tạo hồ sơ nếu chưa có; enforce unique constraint. |
| PATCH  | /api/applications/:id/target-level      | owner                 | Cập nhật cấp aim trong cùng hồ sơ.                |
| PATCH  | /api/applications/:id/draft             | owner                 | Autosave bản nháp.                                |
| GET    | /api/applications/:id/timeline          | owner/officer/manager | Lịch sử hồ sơ/audit timeline.                     |
| POST   | /api/applications/:id/submit            | owner                 | Nộp chính thức, khóa hồ sơ và tạo review tasks.   |
| POST   | /api/applications/:id/reopen-supplement | officer/manager       | Mở quyền bổ sung theo yêu cầu cán bộ.             |

## 5.3. Metrics & evidences

| Method | Path                              | Role                  | Mục đích                                                  |
| ------ | --------------------------------- | --------------------- | --------------------------------------------------------- |
| POST   | /api/applications/:id/metrics     | owner                 | Nhập GPA, điểm rèn luyện, điểm thể dục, số ngày xác minh. |
| PATCH  | /api/metrics/:metricId            | owner/officer         | Cập nhật hoặc xác minh chỉ số.                            |
| GET    | /api/applications/:id/evidences   | owner/officer/manager | Danh sách minh chứng theo tiêu chí.                       |
| POST   | /api/applications/:id/evidences   | owner                 | Tạo minh chứng có evidenceName và sourceType.             |
| POST   | /api/evidences/:id/files          | owner                 | Upload file minh chứng.                                   |
| POST   | /api/evidences/:id/start-indexing | owner/officer         | Tạo OCR/indexing job.                                     |
| GET    | /api/evidences/:id/card           | owner/officer/manager | Lấy Evidence Card.                                        |
| PATCH  | /api/evidences/:id                | owner/officer         | Sửa tên minh chứng, tiêu chí, metadata hoặc trạng thái.   |
| DELETE | /api/evidences/:id                | owner                 | Xóa minh chứng khi còn draft/supplement mode.             |

## 5.4. Event Registry / HSV-Đoàn Data Import Center

| Method | Path                                  | Role                    | Mục đích                                        |
| ------ | ------------------------------------- | ----------------------- | ----------------------------------------------- |
| GET    | /api/events                           | student/officer/manager | Search sự kiện hợp lệ theo tiêu chí/cấp/đơn vị. |
| POST   | /api/events                           | officer/manager         | Tạo event registry item.                        |
| GET    | /api/events/:id                       | authenticated           | Chi tiết event, metadata, mẫu GCN.              |
| POST   | /api/events/:id/roster-files          | officer/manager         | Upload file danh sách sự kiện.                  |
| POST   | /api/events/:id/start-indexing        | officer/manager         | OCR/table extraction danh sách.                 |
| POST   | /api/events/:id/confirm-index         | officer/manager         | Xác nhận batch đã index.                        |
| GET    | /api/events/:id/participants          | officer/manager         | Xem danh sách participant đã index.             |
| POST   | /api/events/:id/check-participant     | student                 | Kiểm tra MSSV của sinh viên trong danh sách.    |
| POST   | /api/events/:id/import-to-application | student                 | Import event thành evidence trong hồ sơ.        |

## 5.5. Knowledge Base

| Method | Path                                       | Role                    | Mục đích                                               |
| ------ | ------------------------------------------ | ----------------------- | ------------------------------------------------------ |
| GET    | /api/knowledge-base/search                 | student/officer/manager | Search tên minh chứng, sự kiện, case đã duyệt/từ chối. |
| GET    | /api/knowledge-base/:id                    | authenticated           | Chi tiết case/mẫu GCN/lý do duyệt hoặc từ chối.        |
| POST   | /api/knowledge-base/from-reviewed-evidence | officer/manager         | Ghi case đã được cán bộ xác nhận vào KB.               |
| PATCH  | /api/knowledge-base/:id                    | manager/admin           | Cập nhật metadata, common errors, required fields.     |

## 5.6. AI pre-check, Cascade, Chatbot, SmartUX

| Method | Path                                        | Role                  | Mục đích                                                     |
| ------ | ------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| POST   | /api/applications/:id/precheck              | owner/officer         | Chạy Rules Engine + Evidence Card để tiền kiểm.              |
| GET    | /api/applications/:id/precheck/latest       | owner/officer/manager | Kết quả tiền kiểm mới nhất.                                  |
| POST   | /api/applications/:id/cascade-review        | owner/officer         | Xét từ cấp aim xuống cấp phù hợp; không chốt cuối.           |
| GET    | /api/applications/:id/cascade-review/latest | owner/officer/manager | Kết quả Cascade mới nhất.                                    |
| POST   | /api/chatbot/message                        | authenticated         | Smartbot/RAG trả lời câu hỏi theo tiêu chí/hồ sơ/trạng thái. |
| POST   | /api/smartux/events                         | authenticated         | Ghi event hành vi FE.                                        |
| GET    | /api/smartux/dashboard                      | manager               | Điểm nghẽn UX và thống kê thao tác.                          |

## 5.7. Review, Manager, Resolution, Notifications

| Method | Path                                      | Role                     | Mục đích                                         |
| ------ | ----------------------------------------- | ------------------------ | ------------------------------------------------ |
| GET    | /api/review/tasks                         | officer                  | Queue task được giao/đúng chuyên trách.          |
| GET    | /api/review/tasks/:id                     | assigned officer/manager | Chi tiết task + evidence + checklist + KB cases. |
| POST   | /api/review/tasks/:id/decision            | assigned officer         | Đạt/không đạt tiêu chí, ghi note và audit.       |
| POST   | /api/review/tasks/:id/request-supplement  | assigned officer         | Yêu cầu sinh viên bổ sung minh chứng.            |
| POST   | /api/review/tasks/:id/escalate-resolution | assigned officer         | Chuyển case mập mờ sang Resolution Hub.          |
| GET    | /api/manager/applications                 | manager/committee        | Bảng tổng hợp hồ sơ và trạng thái 5 tiêu chí.    |
| GET    | /api/manager/workloads                    | manager                  | Workload cán bộ theo tiêu chí.                   |
| POST   | /api/manager/review-tasks/:id/assign      | manager                  | Gán/reassign task.                               |
| GET    | /api/resolution/cases                     | committee/manager        | Danh sách case mập mờ.                           |
| POST   | /api/resolution/cases/:id/decision        | committee                | Chốt case mập mờ; có thể ghi vào KB.             |
| GET    | /api/notifications                        | authenticated            | Danh sách thông báo.                             |
| PATCH  | /api/notifications/:id/read               | authenticated            | Đánh dấu đã đọc.                                 |

# 6. Cấu trúc thư mục production

```txt
backend/
  src/
    main.ts
    app.ts

    config/
      env.ts
      cors.ts
      database.ts
      security.ts
      logger.ts

    infrastructure/
      database/
        prisma.ts
        transaction.ts
      storage/
        storage.interface.ts
        local-storage.service.ts
        s3-storage.service.ts
      queue/
        job-runner.ts
        job.repository.ts
      vnpt/
        vnpt-smartreader.client.ts
        vnpt-smartbot.client.ts
        vnpt-smartux.client.ts
      mail/
        mail.service.ts

    shared/
      constants/
        roles.ts
        criteria.ts
        levels.ts
        statuses.ts
      errors/
        app-error.ts
        error-codes.ts
      responses/
        api-response.ts
      types/
        express.d.ts
      utils/
        pagination.ts
        date.ts
        file.ts

    middlewares/
      auth.middleware.ts
      require-role.middleware.ts
      validate.middleware.ts
      error.middleware.ts
      not-found.middleware.ts
      request-id.middleware.ts
      rate-limit.middleware.ts
      upload.middleware.ts

    modules/
      auth/
        auth.routes.ts
        auth.controller.ts
        auth.service.ts
        auth.repository.ts
        auth.dto.ts
        auth.validation.ts
      users/
      applications/
      metrics/
      evidences/
      event-registry/
      knowledge-base/
      precheck/
      cascade/
      review/
      manager/
      collective/
      resolution/
      notifications/
      audit/
      jobs/
        processors/
          evidence-ocr.processor.ts
          event-roster-indexing.processor.ts
      rules/
        criteria.constants.ts
        school.rules.ts
        university.rules.ts
        city.rules.ts
        central.rules.ts
        precheck.engine.ts
        cascade.engine.ts
      ai/
        evidence-card.generator.ts
        confidence.scorer.ts
        chatbot.service.ts
        rag.service.ts

    docs/
      openapi.ts
      swagger.ts

  prisma/
    schema.prisma
    migrations/
    seed.ts

  uploads/
    evidences/
    event-rosters/
    certificates/
    exports/

  tests/
    unit/
    integration/
    e2e/

  scripts/
    seed.ts
    create-admin.ts
    reset-dev-db.ts
```

## 6.1. Luồng chuẩn trong một module

```txt
Route
  → auth middleware
  → role/permission middleware
  → validate middleware
  → controller
  → service
  → repository
  → Prisma/PostgreSQL
```

Controller chỉ nhận request và trả response. Service chứa nghiệp vụ. Repository chỉ query DB. Rules Engine không nằm trong controller. Các flow quan trọng như submit hồ sơ, import event, officer decision, confirm indexing và resolution decision phải chạy trong database transaction.

# 7. AI feature architecture

AI trong 5TOT không phải một route chatbot đơn lẻ. AI là pipeline biến file/minh chứng rời rạc thành dữ liệu có cấu trúc để Rules Engine và cán bộ sử dụng. Phần khó nhất là OCR/indexing danh sách sự kiện và chuẩn hóa Evidence Card, không phải chatbot.

## 7.1. Danh sách tính năng AI và độ khó

| AI feature                 | Độ khó        | MVP implementation                                        | Production direction                                                   |
| -------------------------- | ------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| SmartReader OCR minh chứng | Trung bình    | Mock adapter trả OCR text/extracted fields theo file mẫu. | Gọi VNPT SmartReader, retry, log confidence, lưu raw response.         |
| OCR danh sách sự kiện      | Khó           | Upload roster CSV/XLSX/PDF mẫu, mock table extraction.    | SmartReader table extraction + column mapping + officer confirm batch. |
| Evidence Card Generator    | Khó vừa       | Sinh card từ extracted fields + rule-based warnings.      | Chuẩn hóa nhiều loại chứng chỉ/GCN/bảng điểm.                          |
| Confidence Scoring         | Khó ngầm      | Rule-based: đủ field, match event, OCR quality, conflict. | Calibrated scoring theo dữ liệu lịch sử.                               |
| Knowledge Base Search      | Khó vừa       | Postgres full-text + metadata filter.                     | Fuzzy/trigram/pgvector semantic search.                                |
| AI Pre-check               | Trung bình    | Rules Engine + text explanation.                          | Versioned criteria + personalized explanations.                        |
| Cascade Review             | Trung bình    | Rule check từ target_level xuống.                         | Multiple unit criteria versions, manager override.                     |
| Smartbot Helpdesk          | Trung bình    | RAG over FAQ/criteria/application status.                 | Guardrails, source citation, ticket fallback.                          |
| Reviewer Copilot           | Trung bình    | Summary + draft supplement request.                       | Context-aware drafting with editable templates.                        |
| SmartUX                    | Dễ-Trung bình | Track FE events, dashboard basic.                         | Funnel analysis, drop-off, heatmap-style insights.                     |

## 7.2. OCR/indexing job flow

```txt
Upload file
→ create files record
→ create evidence/event_file record
→ create indexing_jobs row
→ API returns pending_indexing
→ worker picks queued job
→ SmartReaderAdapter.extractEvidence() or extractRosterTable()
→ parse/normalize result
→ create/update Evidence Card or EventParticipant rows
→ update indexing_status
→ calculate confidence + warnings
→ write audit log
→ notify user if needed
```

## 7.3. SmartReader Adapter contract

```txt
interface SmartReaderAdapter {
  extractEvidence(input: FileInput): Promise<{
    rawText: string;
    documentType: string;
    extractedFields: Record<string, unknown>;
    warnings: string[];
    ocrQuality: number;
    rawResponse?: unknown;
  }>;

  extractRosterTable(input: FileInput): Promise<{
    columns: string[];
    rows: Record<string, unknown>[];
    suggestedMapping: Record<string, string>;
    ocrQuality: number;
    rawResponse?: unknown;
  }>;
}
```

## 7.4. Evidence Card fields

| Field                                | Nguồn dữ liệu                                             | Dùng cho                               |
| ------------------------------------ | --------------------------------------------------------- | -------------------------------------- |
| evidenceName                         | Student input / event import / OCR suggestion             | Search, review task, audit, export.    |
| criterion                            | Student chọn / event registry / classifier                | Phân task cán bộ, rule check.          |
| sourceType                           | metric_input/event_import/manual_upload/collective_import | Đánh giá độ tin cậy và workflow.       |
| eventName, organizer, organizerLevel | Event Registry/OCR                                        | Đối chiếu cấp tổ chức, tính ngày/buổi. |
| startDate, endDate, issuedDate       | OCR/manual/event metadata                                 | Kiểm tra khung thời gian xét.          |
| convertedValue                       | Event registry/rules                                      | Số ngày tình nguyện, số buổi, award.   |
| studentName, studentCode             | OCR/event participant/user profile                        | Match đúng sinh viên.                  |
| GPA/conduct score/language level     | Metric input/OCR                                          | Rules Engine.                          |
| warnings                             | Scorer/rule                                               | Cần bổ sung/cần xác minh.              |
| confidence                           | Rule-based scorer                                         | Phân luồng cán bộ và UI trust.         |

## 7.5. Confidence scoring đề xuất

```txt
base = 0.50
+0.15 nếu OCR quality >= 0.85
+0.15 nếu đủ required fields của loại minh chứng
+0.10 nếu match Event Registry theo MSSV/event
+0.10 nếu match Knowledge Base case approved tương tự
-0.15 nếu thiếu ngày cấp/thời gian
-0.15 nếu thiếu đơn vị xác nhận
-0.20 nếu không match tên/MSSV sinh viên
-0.20 nếu OCR quality thấp hoặc ảnh mờ
Clamp về 0.00 - 1.00
```

Confidence là chỉ báo hỗ trợ phân luồng, không phải xác suất pháp lý và không quyết định đạt/rớt. Dưới 0.70 nên đánh dấu cần cán bộ xác minh; dưới 0.50 nên đưa vào queue confidence thấp hoặc Resolution Hub nếu ảnh hưởng kết quả.

## 7.6. Rules Engine và Cascade

```txt
Precheck input:
- application
- metrics
- evidences
- evidenceCards
- eventImports
- criteriaVersion

Precheck output:
- readinessScore
- criteriaResults[ethics|academic|physical|volunteer|integration]
- missingItems
- warnings
- nextBestAction
- humanReviewRequired

Cascade output:
- targetLevel
- levelResults[central|city|university|school]
- suggestedLevel
- gapsByLevel
- explanation
- humanConfirmationRequired = true
```

# 8. Mapping FE hiện tại → Backend API

| FE route/screen    | Backend API chính                                               | Data cần trả về                                                                |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| /app Dashboard     | GET /api/applications/current; GET /api/notifications           | Application card, status, readiness, target level, next action, notifications. |
| /app/drafts        | PATCH /applications/:id/draft; POST /metrics; GET /evidences    | Single draft workspace, autosave, metrics, 5 criteria progress.                |
| /app/evidence      | GET/POST evidences; upload files; start-indexing; get card      | Evidence list by criterion, indexing status, Evidence Cards.                   |
| /app/event-library | GET /events; check-participant; import-to-application           | Event cards, indexed roster status, MSSV check result.                         |
| /app/ai-precheck   | POST /precheck; GET latest                                      | Readiness, missing items, next best action, criteria status.                   |
| /app/cascade       | POST /cascade-review; GET latest                                | Level results, suggested level, human confirmation message.                    |
| /app/chatbot       | POST /chatbot/message                                           | Answer based on criteria/application/KB; fallback ticket if low confidence.    |
| /app/vnpt          | GET /api/ai/status; GET /api/jobs/stats                         | Adapter status, job counts, mock/real mode.                                    |
| Officer Review     | GET /review/tasks; GET task detail; decision/request supplement | Task queue specialized by criterion, Evidence Card, decision panel.            |
| Manager            | GET /manager/applications; workloads; assign/reassign           | 5-criteria progress, officer workload, blocking criterion.                     |
| Collective         | GET /collective/current; import roster; evidence; readiness     | Class roster, ratios, collective criteria, evidence groups.                    |

# 9. Core workflows cần implement

## 9.1. Sinh viên upload minh chứng thủ công

1. Student tạo evidence với evidenceName, criterion, sourceType=manual_upload.
1. Upload file qua /api/evidences/:id/files.
1. Backend tạo files/evidence_files và indexing_jobs.
1. Worker chạy SmartReader/mock OCR.
1. Backend tạo evidence_card, warnings, confidence và matched KB/Event nếu có.
1. UI hiển thị Evidence Card; audit log ghi uploaded/indexed.

## 9.2. Sinh viên import từ sự kiện đã xác nhận

1. Student search Event Registry theo tên sự kiện/tiêu chí/cấp xét.
1. Student bấm kiểm tra tên tôi trong danh sách.
1. Backend match event_participants theo student_code, có thể fallback fuzzy name nếu cần.
1. Nếu found, backend tạo evidence sourceType=event_import và auto-fill metadata.
1. Evidence này có confidence cao hơn vì đến từ danh sách đã confirm.
1. Audit log ghi import_event_evidence.

## 9.3. HSV/Đoàn upload danh sách sự kiện

1. Officer/manager tạo Event Registry item.
1. Upload roster file vào event_files.
1. Tạo indexing job loại event_roster_ocr.
1. SmartReader/mock OCR trích bảng participant.
1. UI hiển thị column mapping và errors.
1. Officer confirm batch; backend tạo event_participants và roster_indexed=true.
1. Event trở thành searchable/importable cho sinh viên.

## 9.4. Nộp hồ sơ và tạo review tasks

1. Student submit application khi trạng thái draft/prechecked/ready_to_submit.
1. Service chạy transaction: update application status=submitted/under_review.
1. Tạo review_tasks theo các tiêu chí có evidence/metric hoặc tiêu chí bắt buộc.
1. Assign officer theo officer_specializations và workload.
1. Tạo notification cho cán bộ liên quan.
1. Audit log ghi submitted và task_created.

## 9.5. Officer decision

1. Officer mở task được giao hoặc đúng specialization.
1. Backend kiểm quyền assigned_officer_id/specialized criterion.
1. Officer chọn đạt/không đạt/yêu cầu bổ sung/chuyển Resolution Hub.
1. Service chạy transaction: update task, evidence status, application aggregation nếu cần.
1. Nếu yêu cầu bổ sung: tạo notification cho sinh viên và mở supplement mode có scope.
1. Nếu quyết định đã xác nhận: có thể ghi Knowledge Base item sau khi manager/committee duyệt.

# 10. Security, permission và audit

| Risk                                | Cách xử lý trong Express                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Sinh viên tạo nhiều hồ sơ           | Unique constraint + service check before create.                                |
| Student xem hồ sơ người khác        | requireApplicationOwner hoặc manager/officer permission.                        |
| Officer xem/chấm ngoài chuyên trách | requireAssignedOfficer hoặc requireOfficerSpecialization.                       |
| AI tự chốt kết quả                  | AI service chỉ trả suggestion; final endpoints chỉ officer/committee.           |
| File minh chứng bị public           | Không public direct path; backend route kiểm quyền trước khi stream/signed URL. |
| Upload file độc hại                 | Limit size, mime whitelist, scan nếu có, random path, không execute uploads.    |
| Dữ liệu OCR sai                     | Confidence + warnings + human review; giữ raw response để audit.                |
| Trạng thái lệch khi submit/decision | DB transaction cho các flow nhiều bảng.                                         |

## 10.1. Middleware production tối thiểu

- helmet cho HTTP security headers.
- cors config theo domain FE, không dùng wildcard trong production.
- rate limit cho auth, upload, chatbot.
- request-id middleware để trace log.
- Zod validation cho body/query/params.
- global error handler không trả stack ở production.
- file upload middleware với size limit, mime allowlist và path randomization.

# 11. Testing strategy

| Test type         | Nội dung bắt buộc                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Unit tests        | Rules Engine, Cascade Engine, confidence scorer, permission guards, evidence normalizer.              |
| Integration tests | Auth, single application constraint, metrics/evidence CRUD, event import, submit creates tasks.       |
| E2E happy path    | Student login → create hồ sơ → upload/import evidence → precheck → submit → officer review.           |
| E2E edge cases    | Duplicate application, low confidence evidence, event not found, supplement request, resolution case. |
| Seed demo tests   | Seed data chạy lại nhiều lần không lỗi, demo users có dữ liệu đủ cho FE.                              |

# 12. Environment variables

```txt
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,https://sv5tot-v1.lovable.app
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
STORAGE_DRIVER=local
VNPT_MODE=mock
VNPT_BASE_URL=
VNPT_API_KEY=
SMARTBOT_MODE=mock
LOG_LEVEL=info
```

# 13. Seed data cho demo

| Nhóm seed          | Dữ liệu đề xuất                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Users              | 1 student Nguyễn Linh An; 5 officers chuyên trách; 1 manager; 1 committee; 1 class representative. |
| Application        | Hồ sơ năm học 2025-2026, target Cấp Thành phố, readiness 68-80%.                                   |
| Metrics            | GPA 3.42/4.0; điểm rèn luyện 87/100; có/không điểm F.                                              |
| Events             | Mùa hè xanh 2025, Hiến máu đợt 1, Tập huấn Đoàn-Hội, Hội thảo quốc tế, Sinh viên khỏe.             |
| Event Participants | Student có trong Mùa hè xanh 3 ngày, Hiến máu 1 ngày, chưa có trong một event để demo not found.   |
| Evidence KB        | Case approved/rejected/needs_review cho GCN tình nguyện, IELTS, ảnh hoạt động không xác nhận.      |
| Review Tasks       | Task tình nguyện low/missing 2 ngày; task học tập accepted; task hội nhập needs_review.            |

# 14. Checklist implement nhanh

## 14.1. Must-have cho demo backend thật

- JWT login + seed users theo role.
- GET current application và enforce 1 hồ sơ/năm.
- Update target level và autosave draft.
- Input GPA/điểm rèn luyện.
- Tạo evidence có evidenceName + sourceType.
- Upload file local + pending indexing.
- Mock OCR sinh Evidence Card.
- Event Registry search/check MSSV/import evidence.
- Precheck + Cascade bằng Rules Engine.
- Submit tạo review tasks theo tiêu chí.
- Officer chuyên trách review một task.
- Audit log xuất hiện sau mỗi action.

## 14.2. Nice-to-have nếu còn thời gian

- SmartReader real adapter thay mock.
- Smartbot RAG với criteria + application status.
- Evidence Knowledge Base fuzzy search/pgvector.
- SmartUX dashboard từ FE events.
- Export PDF/Excel danh sách xét duyệt.
- Docker compose + CI pipeline + OpenAPI docs đầy đủ.

# 15. Kết luận triển khai

Backend 5TOT nên bắt đầu từ vertical slice chứng minh được bản chất proposal: một hồ sơ duy nhất, minh chứng có tên và nguồn, OCR/indexing thành Evidence Card, import sự kiện đã xác nhận, Rules Engine tiền kiểm, Cascade Review và review task chuyên trách. Khi slice này chạy thật, FE hiện tại sẽ không còn là demo tĩnh mà trở thành MVP có workflow nghiệp vụ rõ ràng, đủ thuyết phục để trình bày vòng tiếp theo.
