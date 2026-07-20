<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# Repository Guidance

This is the frontend repo for the 5TOT platform.

## Required Context

Before meaningful work, read:

- `docs/CODEBASE_CONTEXT.md`
- `docs/UI_GUIDE.md` for any UI change

Update `docs/CODEBASE_CONTEXT.md` in place after meaningful implementation work. Do not create duplicate or timestamped context files.

Update `docs/UI_GUIDE.md` only when the design system or reusable UI conventions intentionally change.

## Frontend Rules

- Follow the existing TanStack Router, feature-module, React Query, Zustand, Tailwind, and Radix/shadcn-style patterns.
- Reuse existing components and feature API clients before adding new abstractions.
- Do not hand-edit `src/routeTree.gen.ts`.
- Preserve the current operational UI style: quiet, dense, workflow-focused, compact, and token-driven.
- Do not introduce oversized cards, thick bordered panels, decorative gradients, marketing heroes, or a new visual language unless explicitly requested.
- For UI work, inspect the existing route/component first and verify desktop and mobile behavior when practical.

## Verification

Use the narrowest relevant checks:

- `npm run build`
- `npm run lint`

If a check cannot be run or fails for pre-existing reasons, report that clearly.

## Instruction Priority

For Requirement Tree and presentation-semantics work, apply instructions in this order:

1. Frozen business contract and security/workspace rules.
2. `docs/UI_GUIDE.md`.
3. `.agents/skills/5tot-presentation-semantics`.
4. Existing reusable components/API patterns.
5. `.agents/skills/redesign-existing-projects`.
6. `.agents/skills/web-design-guidelines` for audit.
7. `minimalist-ui` only in a later polish phase.

External skills must not override 5TOT business semantics.
