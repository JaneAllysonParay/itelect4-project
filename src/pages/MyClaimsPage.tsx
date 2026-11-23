import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { fetchClaimsPage } from "../api/client";
import type { ApiMyClaim, ApiPage } from "../types/index";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/PageStates";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { claimPresentation } from "../lib/claimPresentation";

function formatDate(value?: string): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function MyClaimsPage() {
  const [page, setPage] = useState(1);
  const claims = useQuery<ApiPage<ApiMyClaim>>({ queryKey: ["claims", "mine", page], queryFn: () => fetchClaimsPage(page) });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="My Claims" description="Follow the staff review of the ownership proof you submitted and check whether a physical handover has been recorded." eyebrow="Your Claim history" />

      <div className="space-y-4">
        {claims.isPending && <LoadingState label="Loading your Claims..." />}
        {claims.isError && <ErrorState title="Your Claims could not be loaded" description={claims.error.message || "Please try again in a moment."} />}

        {claims.data?.data.length === 0 && page === 1 && (
          <EmptyState
            title="No Claims submitted"
            description="Claims you submit for eligible found reports will appear here with their review and handover status."
            action={<Link to="/items" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Browse found reports</Link>}
          />
        )}

        {claims.data?.data.map((claim) => {
          const presentation = claimPresentation(claim);
          const item = claim.item;
          const isAwaitingHandover = claim.status === "approved" && claim.approvedWorkflowStatus === "awaiting_handover";
          const canShowPickup = isAwaitingHandover && item?.reportType === "found" && item.lifecycleStatus === "reserved";
          const hasCompletedHandover = claim.status === "approved" && claim.approvedWorkflowStatus === "completed" && Boolean(claim.handoverAt);

          return (
            <article key={claim.id} className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Submitted Claim</p>
                  <h2 className="mt-1 break-words text-lg font-semibold tracking-tight text-card-foreground sm:text-xl">{item?.title ?? "Item details unavailable"}</h2>
                  {item && <p className="mt-1 break-words text-sm text-muted-foreground">{item.reportType === "found" ? "Found report" : item.reportType === "lost" ? "Lost report" : "Historical report"} · {item.location}</p>}
                </div>
                <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
              </div>

              <dl className="mt-4 grid min-w-0 gap-x-6 gap-y-3 rounded-xl bg-muted/60 p-4 text-sm sm:grid-cols-2">
                <div><dt className="font-medium text-foreground">Submitted</dt><dd className="mt-0.5 text-muted-foreground">{formatDate(claim.claimDate)}</dd></div>
                {claim.reviewedAt && <div><dt className="font-medium text-foreground">Reviewed</dt><dd className="mt-0.5 text-muted-foreground">{formatDate(claim.reviewedAt)}</dd></div>}
                {hasCompletedHandover && <div><dt className="font-medium text-foreground">Handover recorded</dt><dd className="mt-0.5 text-muted-foreground">{formatDate(claim.handoverAt)}</dd></div>}
              </dl>

              <p className="mt-4 break-words text-sm leading-relaxed text-foreground">{presentation.message}</p>
              {claim.status === "rejected" && claim.decisionSource === "system" && claim.decisionReason && (
                <p className="mt-2 break-words rounded-lg border border-border bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">Reason: {claim.decisionReason}</p>
              )}

              {isAwaitingHandover && (
                <section aria-label="Private pickup information" className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h3 className="font-semibold text-foreground">Private pickup instructions</h3>
                  {canShowPickup
                    ? claim.pickupInstructions
                      ? <p className="mt-1 break-words whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{claim.pickupInstructions}</p>
                      : <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Staff have not added pickup instructions yet. Physical handover has not been recorded.</p>
                    : <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Pickup details are unavailable while the Item status is being verified. Contact campus staff for help.</p>}
                </section>
              )}

              {claim.status === "approved" && claim.approvedWorkflowStatus === "legacy" && (
                <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-foreground">This is a historical approved Claim. Available records do not confirm whether physical handover occurred.</p>
              )}
            </article>
          );
        })}
      </div>

      {claims.data && (page > 1 || claims.data.hasMore || (claims.data.totalCount !== null && claims.data.totalCount > 0)) && (
        <nav aria-label="My Claim pages" className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" disabled={page <= 1 || claims.isPending} onClick={() => setPage((current) => Math.max(1, current - 1))} className="w-full sm:w-auto">Previous page</Button>
          <p className="text-center text-sm text-muted-foreground">Page {page} · {claims.data.totalCount ?? "count unavailable"} Claims</p>
          <Button type="button" variant="outline" disabled={!claims.data.hasMore || claims.isPending} onClick={() => setPage((current) => current + 1)} className="w-full sm:w-auto">Next page</Button>
        </nav>
      )}
      {!claims.isPending && !claims.isError && page > 1 && claims.data?.data.length === 0 && <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No Claims remain on this page.</p>}
    </div>
  );
}

export default MyClaimsPage;
