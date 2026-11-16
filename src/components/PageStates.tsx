import type { ReactNode } from "react";
import { AlertCircle, LoaderCircle, SearchX } from "lucide-react";

interface LoadingStateProps {
  label: string;
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

interface ErrorStateProps {
  title: string;
  description: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center sm:px-8" aria-labelledby="empty-state-title">
      <SearchX aria-hidden="true" className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h2 id="empty-state-title" className="text-lg font-semibold text-card-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  );
}

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <section role="alert" aria-live="assertive" className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-destructive">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed">{description}</p>
      </div>
    </section>
  );
}
