import {
  getNxtStpsVerifiedDescription,
  getNxtStpsVerifiedLabel,
  isNxtStpsVerified,
} from "@/lib/organizations/verification";

export function NxtStpsVerifiedBadge({
  org,
  className,
}: {
  org: { lifecycle_status?: string | null; public_profile_status?: string | null };
  className?: string;
}) {
  if (!isNxtStpsVerified(org)) return null;

  return (
    <span
      className={[
        "text-[10px] rounded-full border px-2 py-0.5",
        "border-teal-800/50 bg-teal-950/20 text-teal-200/90",
        className ?? "",
      ].join(" ")}
      title={getNxtStpsVerifiedDescription()}
      aria-label={getNxtStpsVerifiedLabel()}
    >
      {getNxtStpsVerifiedLabel()}
    </span>
  );
}

