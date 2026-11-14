"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

// A friendly full-page error screen: a sad office chair, a headline, a short
// explanation, a Try again button and (optionally) a way home.
export function ErrorScreen({
  title = "Sorry, something went wrong on our end.",
  description = "We're having trouble loading this page right now. Please try again in a moment. If the problem continues, you can return to the home page.",
  onRetry,
  showHome = true,
  homeHref = "/",
  helpText = "Need help? Contact your IT team.",
}: {
  title?: string;
  description?: ReactNode;
  // Called by "Try again". May be async; the button shows a spinner meanwhile.
  onRetry?: () => void | Promise<void>;
  showHome?: boolean;
  homeHref?: string;
  helpText?: string;
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="alert"
      className="flex min-h-screen w-full flex-1 items-center justify-center bg-gradient-to-b from-white to-[#F7F8FC] px-6 py-10"
    >
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <SadChairIllustration />

        <h1 className="mt-6 max-w-md text-[28px] font-bold leading-tight tracking-tight text-[#16213E] sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-[14px] leading-relaxed text-slate-500">{description}</p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button
              onClick={() => void handleRetry()}
              disabled={retrying}
              className="h-11 gap-2 rounded-lg bg-indigo-600 px-6 text-[13.5px] font-medium text-white hover:bg-indigo-700"
            >
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {retrying ? "Trying…" : "Try again"}
            </Button>
          )}
          {showHome && (
            <Link
              href={homeHref}
              className={buttonVariants({
                variant: "outline",
                className:
                  "h-11 rounded-lg border-indigo-300 bg-white px-6 text-[13.5px] font-medium text-indigo-600 hover:bg-indigo-50",
              })}
            >
              Go to Home
            </Link>
          )}
        </div>

        {helpText && <p className="mt-8 text-[11.5px] text-slate-400">{helpText}</p>}
      </div>
    </div>
  );
}

// A sad office chair with a sticky note, a plant, and a desk with a laptop.
function SadChairIllustration() {
  return (
    <svg
      viewBox="0 0 360 250"
      className="h-auto w-[300px] sm:w-[360px]"
      role="img"
      aria-label="An empty office chair with a sad face on a sticky note"
    >
      {/* soft background shape and floor shadow */}
      <path
        d="M52 168c-8-52 30-96 86-100 38-3 54 14 98 8 44-6 82 22 86 64 3 34-22 56-70 62H110c-40 0-62-12-58-34z"
        fill="#EEF2FF"
      />
      <ellipse cx="180" cy="228" rx="150" ry="8" fill="#E5E9FB" />

      {/* plant */}
      <g>
        <ellipse cx="70" cy="140" rx="17" ry="40" fill="#6FCF97" transform="rotate(-28 70 140)" />
        <ellipse cx="92" cy="132" rx="15" ry="42" fill="#58B985" transform="rotate(18 92 132)" />
        <ellipse cx="80" cy="128" rx="13" ry="36" fill="#7AD6A1" transform="rotate(-4 80 128)" />
        <path d="M66 184h32l-4 38H70z" fill="#fff" stroke="#DDE3F7" strokeWidth="2" strokeLinejoin="round" />
        <path d="M68 190h28" stroke="#DDE3F7" strokeWidth="2" />
      </g>

      {/* desk cabinet with laptop and mug */}
      <g>
        <rect x="262" y="160" width="76" height="62" rx="3" fill="#EEF2FF" stroke="#C9D3F5" strokeWidth="2" />
        <rect x="256" y="152" width="88" height="9" rx="3" fill="#F4F6FF" stroke="#C9D3F5" strokeWidth="2" />
        <path d="M270 184h60M270 204h60" stroke="#C9D3F5" strokeWidth="2" strokeLinecap="round" />
        <path d="M302 152l8-30 34-6-6 36z" fill="#DDE5FF" stroke="#B8C5F0" strokeWidth="2" strokeLinejoin="round" />
        <path d="M296 152h42" stroke="#B8C5F0" strokeWidth="3" strokeLinecap="round" />
        <rect x="262" y="136" width="16" height="16" rx="3" fill="#fff" stroke="#C9D3F5" strokeWidth="2" />
        <path d="M278 141h4a3 3 0 010 7h-4" fill="none" stroke="#C9D3F5" strokeWidth="2" />
      </g>

      {/* chair: base, stem, seat, arms, back */}
      <g>
        <path d="M160 196l-28 22M200 196l28 22M180 196v-4M180 196l-6 24M180 196l6 24" stroke="#2F3A55" strokeWidth="6" strokeLinecap="round" />
        <circle cx="132" cy="220" r="6" fill="#2F3A55" />
        <circle cx="228" cy="220" r="6" fill="#2F3A55" />
        <circle cx="174" cy="224" r="6" fill="#2F3A55" />
        <circle cx="186" cy="224" r="6" fill="#2F3A55" />
        <rect x="174" y="168" width="12" height="30" rx="4" fill="#3E4A68" />
        <path d="M120 156c0-12 14-20 60-20s62 8 62 20-14 16-62 16-60-4-60-16z" fill="#6B7A9E" />
        <path d="M128 156c6 8 22 10 52 10s48-2 54-10" fill="none" stroke="#56658A" strokeWidth="3" strokeLinecap="round" />
        {/* arm rests */}
        <path d="M130 150v-26c0-6 14-6 14 0" fill="none" stroke="#3E4A68" strokeWidth="7" strokeLinecap="round" />
        <path d="M232 150v-26c0-6-14-6-14 0" fill="none" stroke="#3E4A68" strokeWidth="7" strokeLinecap="round" />
        {/* back rest */}
        <path
          d="M136 134l-6-80c-1-14 8-24 22-26l60-4c14-1 24 8 25 22l6 66c1 14-8 24-22 26l-62 6c-13 1-22-1-23-10z"
          fill="#56658A"
          transform="rotate(-6 180 90)"
        />
        <path
          d="M150 128l-5-70c0-8 5-12 12-13l50-3c8 0 12 4 13 12l5 62c0 8-5 12-12 13l-50 5c-7 0-12-2-13-6z"
          fill="#6B7A9E"
          transform="rotate(-6 180 90)"
        />
      </g>

      {/* sticky note with a sad face */}
      <g transform="rotate(8 190 80)">
        <rect x="166" y="52" width="58" height="58" rx="3" fill="#fff" stroke="#E5E9FB" strokeWidth="2" />
        <rect x="186" y="46" width="22" height="10" rx="2" fill="#E2E6F5" opacity="0.9" />
        <circle cx="184" cy="76" r="2.6" fill="#4B5675" />
        <circle cx="206" cy="76" r="2.6" fill="#4B5675" />
        <path d="M184 96c4-6 18-6 22 0" fill="none" stroke="#4B5675" strokeWidth="2.6" strokeLinecap="round" />
      </g>

      {/* little alert sparks */}
      <g stroke="#6366F1" strokeWidth="3" strokeLinecap="round">
        <path d="M250 22l6 12" />
        <path d="M262 30l10 6" />
        <path d="M268 44l14 2" />
      </g>
    </svg>
  );
}
