"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ProgressStep = {
  title: string;
  caption: string;
};

interface TradeInProgressTrackerProps {
  steps: readonly ProgressStep[];
  currentStep: number;
  progressPercent: number;
}

export function TradeInProgressTracker({
  steps,
  currentStep,
  progressPercent,
}: TradeInProgressTrackerProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_-34px_rgba(15,23,42,0.4)]">
      <div className="h-1.5 w-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="overflow-x-auto px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex min-w-max gap-3 lg:grid lg:min-w-0 lg:grid-cols-4">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isComplete = stepNumber < currentStep;

            return (
              <div
                key={step.title}
                className={cn(
                  "min-w-[220px] rounded-2xl border px-4 py-4 transition lg:min-w-0",
                  isActive
                    ? "border-blue-200 bg-blue-50"
                    : isComplete
                      ? "border-blue-100 bg-white"
                      : "border-slate-200 bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border text-sm font-semibold transition",
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : isComplete
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-500"
                    )}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500">{step.caption}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
