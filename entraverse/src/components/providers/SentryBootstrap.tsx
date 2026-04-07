"use client";

import { useEffect } from "react";
import { initSentry, setupSentryErrorHandlers } from "@/sentry.client.config";

export function SentryBootstrap() {
  useEffect(() => {
    initSentry();
    setupSentryErrorHandlers();
  }, []);

  return null;
}
