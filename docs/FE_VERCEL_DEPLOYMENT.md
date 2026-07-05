# Frontend Vercel Deployment

This frontend is a TanStack Start SSR app deployed through Nitro's Vercel preset.

## Vercel Project Settings

- Root Directory: `namtot` when importing the parent repository, or `.` when importing this frontend repository directly.
- Install Command: `pnpm install --frozen-lockfile`.
- Build Command: `pnpm build`.
- Development Command: `pnpm dev`.
- Output Directory: leave unset. Nitro generates the Vercel SSR output.

## Environment Variables

Set this variable in Vercel for Preview and Production:

```bash
VITE_API_BASE_URL=https://<backend-production-url>
```

The frontend API client reads `VITE_API_BASE_URL` at build time. Do not use the local fallback URL for production deploys.

## Source Hygiene

Do not commit local or generated deployment artifacts:

- `.env`
- `.env.*`
- `.output`
- `.vercel`
- `.wrangler`
- `node_modules`

These are already covered by `.gitignore`; keep production values in Vercel Project Environment Variables.

## Preview Checklist

- `/`, `/login`, and `/signup` render successfully.
- A nested route such as `/app/overview` renders and refreshes without a 404.
- Browser network requests target the configured `VITE_API_BASE_URL`.
- No secrets are present in the production bundle or build logs.
