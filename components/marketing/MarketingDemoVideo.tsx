"use client";

import { useI18n } from "@/components/i18n/i18nProvider";
import { useEffect, useRef, useState } from "react";

/** Local file in /public, or full HTTPS URL (e.g. CDN). iOS: H.264 + AAC, moov at start (`ffmpeg -movflags +faststart`). */
const DEMO_SRC =
  process.env.NEXT_PUBLIC_MARKETING_DEMO_VIDEO_URL?.trim() || "/mvp-demo.mp4";

/**
 * iOS Safari / iOS Chrome (WebKit) need playsInline + legacy webkit attrs, direct `src`,
 * and Range-friendly responses (middleware must not wrap the MP4 request).
 */
export function MarketingDemoVideo() {
  const { t } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("webkit-playsinline", "true");
    el.setAttribute("playsinline", "");
    el.setAttribute("x-webkit-airplay", "allow");
  }, []);

  if (failed) {
    return (
      <div className="mx-auto mt-8 w-full max-w-3xl rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-5)] py-[var(--space-6)] text-center sm:px-[var(--space-6)]">
        <p className="text-sm text-[var(--color-slate)]">{t("home.mkt.videoTour.loadError")}</p>
        <p className="mt-2 text-xs text-[var(--color-muted)]">{t("home.mkt.videoTour.missingFileHint")}</p>
        <a
          href={DEMO_SRC}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center text-sm font-semibold text-[var(--color-teal-deep)] underline underline-offset-2 hover:text-[var(--color-teal)]"
        >
          {t("home.mkt.videoTour.openDirect")}
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl px-[var(--space-4)] sm:px-[var(--space-6)]">
      <video
        ref={ref}
        className="mx-auto block h-auto w-full max-w-full rounded-[var(--radius-xl)] border border-[var(--color-border-light)] bg-black object-contain shadow-[var(--shadow-card)]"
        style={{ maxHeight: "min(70vh, 520px)" }}
        width={1280}
        height={720}
        controls
        playsInline
        preload="auto"
        src={DEMO_SRC}
        onError={() => setFailed(true)}
      >
        {t("home.mkt.videoTour.noHtml5")}
      </video>
    </div>
  );
}
