import type { ReactNode } from "react";
import type {
  ApiClaim,
  ApiMyClaim,
  ApiReceivedClaim,
  ApiReviewClaim,
} from "../types/index";
import StatusBadge from "./StatusBadge";
import { claimPresentation } from "../lib/claimPresentation";
import { lifecycleStatusOf, reportTypeOf } from "../lib/itemLifecycle";

interface ClaimCardProps {
  claim: ApiClaim | ApiMyClaim | ApiReceivedClaim | ApiReviewClaim;
  variant?: "default" | "compact";
  context?: "mine" | "received" | "review";
  reviewActions?: ReactNode;
}

function formatDate(value?: string): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function ClaimCard({ claim, variant = "default", context = "mine", reviewActions }: ClaimCardProps) {
  const isCompact = variant === "compact";
  const hasItemContext = "item" in claim;
  const item = hasItemContext ? claim.item : null;
  const presentation = claimPresentation(claim);
  const canShowProof = context === "mine" || context === "review";
  const itemLifecycle = item ? lifecycleStatusOf(item) : "unknown";
  const itemType = item ? reportTypeOf(item) : "unknown";
  const itemStatusTone = itemLifecycle === "open"
    ? "open"
    : itemLifecycle === "reserved"
      ? "reserved"
      : itemLifecycle === "returned"
        ? "returned"
        : itemLifecycle === "resolved"
          ? "resolved"
          : "unknown";
  const itemLifecycleLabel = itemLifecycle === "open"
    ? "Open"
    : itemLifecycle === "reserved"
      ? "Reserved"
      : itemLifecycle === "returned"
        ? "Returned"
        : itemLifecycle === "resolved"
          ? "Resolved"
          : "lifecycle status unknown";
  const itemStatusLabel = `${itemType === "found" ? "Found report" : itemType === "lost" ? "Lost report" : "Report type unknown"} · ${itemLifecycleLabel}`;

  return (
    <article className={`min-w-0 rounded-2xl border border-border bg-card text-card-foreground shadow-sm ${isCompact ? "p-4" : "p-5"}`}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <h3 className={`min-w-0 break-words font-semibold tracking-tight ${isCompact ? "text-sm" : "text-base"}`}>
          {item?.title ?? "Ownership Claim"}
        </h3>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
          {context === "review" && item && <StatusBadge tone={itemStatusTone}>{itemStatusLabel}</StatusBadge>}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Submitted: {formatDate(claim.claimDate)}</p>

      {!isCompact && (
        <>
          {item ? (
            <div className="mt-3 grid gap-1 break-words border-t border-border pt-3 text-sm text-muted-foreground">
              <p>Report type: {item.reportType === "lost" || (!item.reportType && item.status === "lost")
                ? "Lost report"
                : item.reportType === "found" || (!item.reportType && item.status === "found")
                  ? "Found report"
                  : "Historical report · type unknown"}</p>
              <p>Location: {item.location}</p>
              <p>Reported: {formatDate(item.dateReported)}</p>
              <p>Archive status: {item.archivedAt ? "Archived" : "Active"}</p>
              {item.description && <p>Description: {item.description}</p>}
            </div>
          ) : hasItemContext ? (
            <p className="mt-3 text-sm text-muted-foreground">Item details unavailable.</p>
          ) : null}

          {canShowProof && "proof" in claim && claim.proof && (
            <p className="mt-3 break-words whitespace-pre-wrap text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Proof: </span>{claim.proof}
            </p>
          )}
          {claim.reviewedAt && <p className="mt-2 text-sm text-muted-foreground">Reviewed: {formatDate(claim.reviewedAt)}</p>}
          <p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground">{presentation.message}</p>
          {claim.status === "rejected" && claim.decisionSource === "system" && claim.decisionReason && (
            <p className="mt-2 break-words text-sm text-muted-foreground">Reason: {claim.decisionReason}</p>
          )}
        </>
      )}
      {context === "review" && reviewActions && (
        <div className="mt-4 border-t border-border pt-4">{reviewActions}</div>
      )}
    </article>
  );
}

export default ClaimCard;
