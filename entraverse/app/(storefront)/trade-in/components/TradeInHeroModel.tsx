"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    __entraverseModelViewerLoader?: Promise<void>;
  }
}

export function TradeInHeroModel() {
  const [isViewerReady, setIsViewerReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (typeof window === "undefined") {
      return;
    }

    if (customElements.get("model-viewer")) {
      setIsViewerReady(true);
      return;
    }

    window.__entraverseModelViewerLoader ??= import("@google/model-viewer").then(() => undefined);

    void window.__entraverseModelViewerLoader.then(() => {
      if (isMounted) {
        setIsViewerReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative h-[220px] w-full max-w-[280px] sm:h-[260px] sm:max-w-[320px] lg:h-[300px] lg:max-w-[360px]">
      <div className="absolute inset-x-12 bottom-4 h-10 rounded-full bg-[#07112e]/40 blur-2xl" />
      {isViewerReady ? (
        <model-viewer
          src="/assets/meta_quest_3.glb"
          alt="Model 3D Meta Quest 3"
          camera-controls
          auto-rotate
          autoplay
          shadow-intensity="1"
          exposure="1.05"
          environment-image="neutral"
          interaction-prompt="none"
          camera-orbit="0deg 78deg 1.65m"
          min-camera-orbit="auto 55deg auto"
          max-camera-orbit="auto 105deg auto"
          field-of-view="28deg"
          className="h-full w-full bg-transparent"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-[28px] border border-white/10 bg-white/5 text-center text-sm font-medium text-white/70 backdrop-blur-sm">
          Memuat preview 3D Meta Quest 3...
        </div>
      )}
    </div>
  );
}
