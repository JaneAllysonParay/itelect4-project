import type { ReactNode } from "react";

export type StatusTone = "lost" | "found" | "open" | "reserved" | "returned" | "resolved" | "unknown";

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  title?: string;
}

const toneClasses: Record<StatusTone, string> = {
  lost: "bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-100",
  found: "bg-teal-100 text-teal-950 dark:bg-teal-950 dark:text-teal-100",
  open: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100",
  reserved: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  returned: "bg-slate-200 text-slate-950 dark:bg-slate-700 dark:text-slate-100",
  resolved: "bg-indigo-100 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-100",
  unknown: "bg-muted text-foreground",
};

function StatusBadge({ tone, children, title }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center rounded-full px-2.5 py-1 text-xs leading-snug font-semibold ${toneClasses[tone]}`}
      title={title}
    >
      {children}
    </span>
  );
}

export default StatusBadge;
