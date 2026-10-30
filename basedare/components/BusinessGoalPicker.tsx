"use client";
import { useState } from "react";
import Link from "next/link";
import { Camera, Store, Sparkles, Check } from "lucide-react";
import {
  BUSINESS_GOAL_ORDER,
  BUSINESS_REQUESTS,
  businessRequestHref,
  type BusinessRequestKind,
} from "@/lib/business-request";
export default function BusinessGoalPicker({
  source = "buyer-workspace",
  city,
}: {
  city?: string | null;
  source?: "buyer-workspace" | "home-business";
}) {
  const [goal, setGoal] = useState<BusinessRequestKind>();
  return (
    <div>
      <fieldset>
        <legend className="text-lg font-bold text-white">
          What would you like to achieve?
        </legend>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {BUSINESS_GOAL_ORDER.map((kind) => {
            const Icon =
              kind === "content-brief"
                ? Camera
                : kind === "activity-brief"
                  ? Store
                  : Sparkles;
            return (
              <label
                key={kind}
                className={
                  "bd-well relative flex cursor-pointer items-start gap-2 p-3 transition focus-within:ring-2 focus-within:ring-amber-100 md:block md:p-5 " +
                  (goal === kind
                    ? "!border-amber-200/45 !bg-amber-200/[0.06]"
                    : "hover:!border-white/25")
                }
              >
                <input
                  type="radio"
                  name="business-goal"
                  value={kind}
                  checked={goal === kind}
                  onChange={() => setGoal(kind)}
                  className="sr-only"
                />
                <span className="flex size-8 shrink-0 md:size-10 items-center justify-center rounded-xl border border-amber-200/20 bg-amber-200/5 text-amber-100">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="block pr-3 md:mt-4">
                  <strong className="block text-base font-black text-white">
                    {BUSINESS_REQUESTS[kind].title}
                  </strong>
                  <span className="mt-2 block text-sm leading-5 text-white/65 sm:leading-6">
                    {BUSINESS_REQUESTS[kind].outcome}
                  </span>
                </span>
                {goal === kind ? (
                  <Check
                    aria-hidden="true"
                    size={16}
                    className="absolute right-3 top-3 text-amber-100"
                  />
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        {goal ? (
          <Link
            className="bd-action bd-action--gold min-h-12 w-full !text-base sm:w-auto"
            href={businessRequestHref(goal, source, city)}
          >
            Grow my business <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <button
            disabled
            className="bd-action bd-action--gold min-h-12 w-full !text-base disabled:opacity-45 sm:w-auto"
          >
            Grow my business <span aria-hidden="true">→</span>
          </button>
        )}
        <p className="text-sm leading-6 text-white/60">
          {goal
            ? "A short enquiry next. No account or payment needed."
            : "Choose a goal to get started. No account needed."}
        </p>
      </div>
    </div>
  );
}
