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

const defaultSmartUXInlineScript = `
var VNPT = VNPT || {};
VNPT.q = VNPT.q || [];

VNPT.app_key = 'c2770e700c8c7532c7bbb92427366b6f0d37b342';

VNPT.url = 'https://console-smartux.vnpt.vn';

VNPT.q.push(['track_sessions']);
VNPT.q.push(['track_pageview']);
VNPT.q.push(['track_clicks']);
VNPT.q.push(['track_scrolls']);
VNPT.q.push(['track_errors']);
VNPT.q.push(['track_links']);
VNPT.q.push(['track_forms']);
VNPT.q.push(['collect_from_forms']);

(function () {
const paths = ['https://console-smartux.vnpt.vn/sdk/web/core-track.js', 'https://console-smartux.vnpt.vn/sdk/web/minify.min.js'];
for (let i in paths) {
    var cly = document.createElement('script'); cly.type = 'text/javascript';
    cly.async = true;
    cly.src = paths[i];
    cly.onload = i == 0 ? function () { VNPT.init() } : function() { window.minify = require("html-minifier").minify; };
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(cly, s);
}
})();
`;

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
      { title: "5TOT - Hệ thống quản lý hồ sơ Sinh viên 5 tốt thành phố Đà Nẵng" },
      {
        name: "description",
        content:
          "Hệ thống quản lý hồ sơ và xét chọn danh hiệu Sinh viên 5 tốt cấp Thành phố Đà Nẵng.",
      },
      {
        property: "og:title",
        content: "5TOT - Hệ thống quản lý hồ sơ Sinh viên 5 tốt thành phố Đà Nẵng",
      },
      {
        property: "og:description",
        content:
          "Hệ thống quản lý hồ sơ và xét chọn danh hiệu Sinh viên 5 tốt cấp Thành phố Đà Nẵng.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "5TOT Đà Nẵng" },
      { property: "og:locale", content: "vi_VN" },
      { property: "og:image", content: "https://sv5tot.lcdkhoacntt-dut.page/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Ảnh landing page hệ thống 5TOT Đà Nẵng" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "5TOT - Hệ thống quản lý hồ sơ Sinh viên 5 tốt thành phố Đà Nẵng",
      },
      {
        name: "twitter:description",
        content:
          "Hệ thống quản lý hồ sơ và xét chọn danh hiệu Sinh viên 5 tốt cấp Thành phố Đà Nẵng.",
      },
      {
        name: "twitter:image",
        content: "https://sv5tot.lcdkhoacntt-dut.page/og-image.jpg",
      },
      { name: "twitter:image:alt", content: "Ảnh landing page hệ thống 5TOT Đà Nẵng" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "500x500", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
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
  const enabled = import.meta.env.VITE_SMARTUX_ENABLED !== "false";
  const scriptSrc = import.meta.env.VITE_SMARTUX_SCRIPT_SRC;
  const inlineScript = import.meta.env.VITE_SMARTUX_INLINE_SCRIPT || defaultSmartUXInlineScript;
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
