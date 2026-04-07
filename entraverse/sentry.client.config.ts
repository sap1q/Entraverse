import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    ignoreErrors: [
      "top.GLOBALS",
      "fbq",
      "_gat",
      "chrome-extension://",
      "__CLASS_DEFINITIONS__",
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
  });
}

export function setupSentryErrorHandlers() {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("unhandledrejection", (event) => {
    Sentry.captureException(event.reason);
  });
}
