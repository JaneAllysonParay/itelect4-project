import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { deleteItem, fetchMyItemsPage, resolveItem } from "../api/client";
import type { ApiItem, ApiPage } from "../types/index";
import { lifecycleLabel, lifecycleStatusOf, reportTypeLabel, reportTypeOf } from "../lib/itemLifecycle";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/PageStates";
import StatusBadge, { type StatusTone } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

function formatDate(value?: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function MyReportsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const reports = useQuery<ApiPage<ApiItem>>({ queryKey: ["myReports", page], queryFn: () => fetchMyItemsPage({ limit: 20, page }) });
  const action = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: "archive" | "resolve" }) =>
      kind === "archive" ? deleteItem(id) : resolveItem(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myReports"] }),
        queryClient.invalidateQueries({ queryKey: ["items"] }),
      ]);
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My Reports"
        description="Manage reports you created, review their current status, and keep a history of archived property."
        eyebrow="Your campus activity"
        actions={(
          <>
            <Link to="/report/lost" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Report lost</Link>
            <Link to="/report/found" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Report found</Link>
          </>
        )}
      />

      <div className="space-y-4">
        {reports.isPending && <LoadingState label="Loading your reports..." />}
        {reports.isError && <ErrorState title="Your reports could not be loaded" description={reports.error.message || "Please try again in a moment."} />}
        {action.isError && <ErrorState title="The report action could not be completed" description={action.error.message || "Please try again."} />}

        {reports.data?.data.length === 0 && page === 1 && (
          <EmptyState
            title="No reports yet"
            description="Reports you submit will appear here with their event date, location, lifecycle, and available actions."
            action={(
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/report/lost" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Report lost property</Link>
                <Link to="/report/found" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted">Report found property</Link>
              </div>
            )}
          />
        )}

        {reports.data?.data.map((item) => {
          const type = reportTypeOf(item);
          const lifecycle = lifecycleStatusOf(item);
          const active = item.hasActiveClaims !== false;
          const editable = !item.archivedAt && lifecycle === "open" && type !== "unknown" && !active;
          const canResolve = !item.archivedAt && type === "lost" && lifecycle === "open";
          const canArchive = item.canArchive === true;
          const reportTone: StatusTone = type === "lost" ? "lost" : type === "found" ? "found" : "unknown";
          const lifecycleTone: StatusTone = lifecycle === "open"
            ? "open"
            : lifecycle === "reserved"
              ? "reserved"
              : lifecycle === "returned"
                ? "returned"
                : lifecycle === "resolved"
                  ? "resolved"
                  : "unknown";

          return (
            <article key={item.id} className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={reportTone}>{reportTypeLabel(item)}</StatusBadge>
                    <StatusBadge tone={lifecycleTone}>{lifecycleLabel(item)}</StatusBadge>
                    <StatusBadge tone={item.archivedAt ? "unavailable" : "open"}>{item.archivedAt ? "Archived" : "Not archived"}</StatusBadge>
                  </div>
                  <h2 className="mt-3 break-words text-lg font-semibold tracking-tight text-card-foreground sm:text-xl">
                    {item.archivedAt
                      ? item.title
                      : <Link to={`/items/${item.id}`} className="underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{item.title}</Link>}
                  </h2>
                  {item.description && <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
                </div>
              </div>

              <dl className="mt-4 grid min-w-0 gap-x-6 gap-y-3 rounded-xl bg-muted/60 p-4 text-sm sm:grid-cols-2">
                <div className="min-w-0"><dt className="font-medium text-foreground">Date reported</dt><dd className="mt-0.5 break-words text-muted-foreground">{formatDate(item.dateReported)}</dd></div>
                <div className="min-w-0"><dt className="font-medium text-foreground">Event date</dt><dd className="mt-0.5 break-words text-muted-foreground">{formatDate(item.eventAt)}</dd></div>
                <div className="min-w-0"><dt className="font-medium text-foreground">Location</dt><dd className="mt-0.5 break-words text-muted-foreground">{item.location}</dd></div>
              </dl>

              {active && <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed text-foreground">A Claim may still be active or its state could not be verified, so editing is paused. Archive controls are available only when the server explicitly marks this report eligible.</p>}
              {!active && lifecycle === "returned" && canArchive && <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm leading-relaxed text-foreground">Staff confirmed the handover. This Claim is historical, so the report may be archived.</p>}
              {!active && lifecycle === "returned" && !canArchive && <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed text-foreground">The returned report’s Claim and handover records need staff reconciliation before archival.</p>}

              {(editable || canResolve || canArchive) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {editable && <Link to={`/items/${item.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted">Edit report</Link>}
                  {canResolve && <Button type="button" variant="outline" disabled={action.isPending} onClick={() => { if (window.confirm("Have you recovered this property? This will close your lost report.")) action.mutate({ id: item.id, kind: "resolve" }); }}>{action.isPending ? "Saving..." : "I recovered this item"}</Button>}
                  {canArchive && <Button type="button" variant="outline" disabled={action.isPending} onClick={() => { if (window.confirm("Archive this report? It will be hidden from public browsing and kept in your report history.")) action.mutate({ id: item.id, kind: "archive" }); }}>{action.isPending ? "Saving..." : "Archive report"}</Button>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!reports.isPending && !reports.isError && reports.data && (page > 1 || reports.data.data.length > 0) && (
        <nav aria-label="My report pages" className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" disabled={page <= 1 || reports.isPending} onClick={() => setPage((current) => Math.max(1, current - 1))} className="w-full sm:w-auto">Previous page</Button>
          <p className="text-center text-sm text-muted-foreground">Page {page} · {reports.data?.totalCount ?? "count unavailable"} reports</p>
          <Button type="button" variant="outline" disabled={!reports.data?.hasMore || reports.isPending} onClick={() => setPage((current) => current + 1)} className="w-full sm:w-auto">Next page</Button>
        </nav>
      )}
      {!reports.isPending && !reports.isError && page > 1 && reports.data?.data.length === 0 && <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No reports remain on this page.</p>}
    </div>
  );
}

export default MyReportsPage;
