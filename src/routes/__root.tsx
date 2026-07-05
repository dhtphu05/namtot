import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { SmartUXRouteTracker } from "@/components/analytics/SmartUXRouteTracker";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "5TOT Platform — Hồ sơ Sinh viên 5 tốt" },
      {
        name: "description",
        content:
          "Nền tảng quản lý hồ sơ, AI tiền kiểm, xét duyệt và xuất danh sách Sinh viên 5 tốt.",
      },
      { property: "og:title", content: "5TOT Platform — Hồ sơ Sinh viên 5 tốt" },
      {
        property: "og:description",
        content:
          "Nền tảng quản lý hồ sơ, AI tiền kiểm, xét duyệt và xuất danh sách Sinh viên 5 tốt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "5TOT Platform — Hồ sơ Sinh viên 5 tốt" },
      {
        name: "twitter:description",
        content:
          "Nền tảng quản lý hồ sơ, AI tiền kiểm, xét duyệt và xuất danh sách Sinh viên 5 tốt.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ec3e2145-7696-4331-ac95-3148165a82e5/id-preview-bdf6100a--d10f1d69-070b-4a54-96d4-7668d5686d99.lovable.app-1782719439019.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ec3e2145-7696-4331-ac95-3148165a82e5/id-preview-bdf6100a--d10f1d69-070b-4a54-96d4-7668d5686d99.lovable.app-1782719439019.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
        <SmartUXHeadScript />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SmartUXHeadScript() {
  const enabled = import.meta.env.VITE_SMARTUX_ENABLED === "true";
  const scriptSrc = import.meta.env.VITE_SMARTUX_SCRIPT_SRC;
  const inlineScript = import.meta.env.VITE_SMARTUX_INLINE_SCRIPT;
  const smartUXEnv = import.meta.env.VITE_SMARTUX_ENV || "production";

  if (!enabled) return null;

  return (
    <>
      {scriptSrc ? (
        <script src={scriptSrc} async defer data-smartux="true" data-smartux-env={smartUXEnv} />
      ) : null}
      {!scriptSrc && inlineScript ? (
        <script
          data-smartux="true"
          data-smartux-env={smartUXEnv}
          dangerouslySetInnerHTML={{ __html: inlineScript }}
        />
      ) : null}
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SmartUXRouteTracker />
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
