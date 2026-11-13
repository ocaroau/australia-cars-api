import { cn } from "@/lib/utils";

/** Wordmark set like an Australian highway sign: white condensed caps on road-sign green. */
export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md bg-[#00703c] px-2.5 py-1 font-display text-[17px] leading-none font-bold tracking-wide text-white uppercase",
        "ring-1 ring-white/70 ring-inset shadow-[0_0_0_2px_#00703c]",
        className,
      )}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
        <path d="M2.5 15 L6.5 1 M13.5 15 L9.5 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 2.5 V4.5 M8 7 V9.5 M8 12 V15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      Australia Cars
    </span>
  );
}
