---
name: 5tot-presentation-semantics
description: Normalize student-facing status, requirement labels, actions, evidence metadata, and final/review/completion priority for the 5TOT frontend.
---

# 5TOT Presentation Semantics

Use this skill when changing student-facing presentation semantics in the 5TOT frontend. Keep API payloads, requirement keys, routes, query keys, mutations, and backend contracts unchanged unless a separate business-contract task explicitly allows it.

## Required References

Read the relevant reference before editing:

- `references/status-priority.md` for final/review/supplement/completion priority.
- `references/operator-semantics.md` for `all_of`, `one_of`, `at_least_n`, activity aggregation, and optional groups.
- `references/requirement-labels.md` for criterion and requirement labels.
- `references/source-action-semantics.md` for source labels and next-action language.
- `references/evidence-presentation.md` for evidence metadata, filenames, statuses, and AI/SmartReader wording.

## Status Priority

Apply this display priority:

1. Final result.
2. Officer/committee decision.
3. Supplement request.
4. Resolution status.
5. Review status.
6. Criteria completion/precheck.
7. Raw requirement/evidence metadata.

## Hard Rules

- Do not expose requirement keys, enums, source code, or backend identifiers in student-facing UI.
- Do not display `one_of` as `x/total choices`.
- Let review accepted outrank completion `needs_verification`.
- Do not let completion count or warning text override a final result.
- Do not treat evidence count as criterion completion.
- Do not turn a waiting state into a button.
- Preserve `requirementKey` in API payloads.
- Provide Vietnamese fallback copy for unknown backend values.
- Do not show AI confidence or imply AI approval.
- Do not change the business contract.
- Add unit tests for every presentation selector added or changed.
