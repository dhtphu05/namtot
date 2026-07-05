# VNPT SmartUX Integration

## App model

Frontend 5TOT is a TanStack Start React app with SSR plus client-side hydration and router navigation. Initial HTML is rendered through the root shell, then the app hydrates and subsequent route changes happen client-side.

## Injection point

SmartUX is injected in the root shell head at `src/routes/__root.tsx` through `SmartUXHeadScript`. The route tracker is mounted in the root component through `SmartUXRouteTracker`.

The integration is fail-safe:

- no `window` or `document` access during SSR;
- no script is rendered when SmartUX is disabled;
- SDK calls are no-op if the script is blocked or not loaded;
- custom payloads are sanitized before dispatch.

## Environment variables

```env
VITE_SMARTUX_ENABLED=true
VITE_SMARTUX_ENV=development
VITE_SMARTUX_SCRIPT_SRC=
VITE_SMARTUX_INLINE_SCRIPT=
```

Production Vercel setup:

```env
VITE_SMARTUX_ENABLED=true
VITE_SMARTUX_ENV=production
VITE_SMARTUX_SCRIPT_SRC=<script-url-from-smartux-console>
```

The app includes the VNPT inline snippet provided for this project as the default fallback, so SmartUX is on unless `VITE_SMARTUX_ENABLED=false` is set explicitly. Use `VITE_SMARTUX_INLINE_SCRIPT` only when VNPT provides a replacement full inline snippet. If both script URL and inline script are configured, the external URL is preferred to avoid duplicate SDK loading.

## Acceptance checks

1. Deploy production.
2. Open `https://sv5tot.lcdkhoacntt-dut.live/`.
3. Open DevTools > Network and reload.
4. Confirm the SmartUX script returns `200` or `204`.
5. Navigate through `/app`, `/app/evidence`, and `/app/ai-precheck`.
6. Confirm SmartUX console receives sessions, pageviews, and user flow.
7. Confirm Tag Manager can see stable `data-smartux-tag` attributes on core CTAs.

## Privacy policy

SmartUX must only receive behavior metadata. Do not send:

- student names, student codes, email, phone, identity number, or address;
- OCR text, raw evidence text, AI extracted document content;
- real file names;
- private file URLs, signed URLs, or private public URLs.

Allowed metadata examples:

- `role`
- `page`
- `action`
- `criterion`
- `target_level`
- `status`
- `error_code`
- `duration_ms`
- `source_type`
- `file_type`
- `count`
- `step`
- `flow`
- `result_type`
