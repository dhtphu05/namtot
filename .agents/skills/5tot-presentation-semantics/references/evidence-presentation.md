# Evidence Presentation

Evidence status is not criterion completion. Keep evidence cards scoped to file/read/review metadata and let criterion selectors decide criterion completion separately.

Rules:

- Show long filenames only in metadata rows or detail views; summarize on card fronts.
- Do not show raw `sourceType`, `responseKind`, `indexingStatus`, `requirementKey`, or backend enum values.
- Destructive actions should be visually secondary and confirmed or undoable when risk is high.
- Upload dialogs should carry criterion context and requirement context when available.
- Legacy evidence without `requirementKey` should still show a Vietnamese fallback and should not be treated as invalid by presentation alone.
- Unknown evidence values should render `Đang cập nhật` or `Nguồn dữ liệu khác`.
- Do not show confidence percentages or labels that imply AI approval. Use file readability wording only when useful, such as `Cần cán bộ kiểm tra`.
