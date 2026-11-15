import type {
  ApiClaim,
  ApiMyClaim,
  ApiReceivedClaim,
  ApiReviewClaim,
} from "../types/index";

interface ClaimCardProps {
  claim: ApiClaim | ApiMyClaim | ApiReceivedClaim | ApiReviewClaim;
  variant?: "default" | "compact";
}

function formatDate(value?: string): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function claimMessage(claim: Pick<ApiClaim, "status" | "decisionSource" | "approvedWorkflowStatus">): string {
  if (claim.status === "pending") return "Your Claim is awaiting review.";
  if (claim.status === "approved") {
    const approvedClaim = claim as ApiClaim;
    if (approvedClaim.approvedWorkflowStatus === "completed") return "Handover completed.";
    if (approvedClaim.approvedWorkflowStatus === "awaiting_handover") return "Approved — awaiting physical handover.";
    return "Historical approved Claim — contact campus security to verify its status.";
  }
  return claim.decisionSource === "system" ? "This Item is no longer available." : "Your Claim was not approved.";
}

function ClaimCard({ claim, variant = "default" }: ClaimCardProps) {
  const isCompact = variant === "compact";
  const hasItemContext = "item" in claim;
  const item = hasItemContext ? claim.item : null;
  const statusLabel = claim.status === "pending"
    ? "Pending review"
    : claim.status === "approved"
      ? claim.approvedWorkflowStatus === "completed" && claim.handoverAt
        ? "Handover completed"
        : claim.approvedWorkflowStatus === "awaiting_handover"
          ? "Approved · awaiting physical handover"
          : "Historical approved Claim"
      : "Not approved";

  return (
    <article className={`rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${isCompact ? "p-3" : "p-5"}`}>
      <h3 className={`font-semibold text-gray-900 dark:text-white ${isCompact ? "text-sm" : "text-base"}`}>
        {item?.title ?? "Ownership Claim"}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Submitted: {formatDate(claim.claimDate)}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Status: {statusLabel}</p>

      {!isCompact && (
        <>
          {item ? (
            <div className="mt-2 grid gap-1 border-t border-gray-200 pt-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
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
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Item details unavailable.</p>
          ) : null}

          {"proof" in claim && claim.proof && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Proof: {claim.proof}</p>}
          {claim.reviewedAt && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Reviewed: {formatDate(claim.reviewedAt)}</p>}
          {claim.approvedWorkflowStatus === "completed" && claim.handoverAt
            ? <p className="mt-1 text-sm text-green-800 dark:text-green-200" role="status">{claimMessage(claim)}</p>
            : claim.status === "approved"
              ? <p className="mt-1 text-sm text-gray-600 dark:text-gray-300" role="status">{claimMessage(claim)}</p>
              : null}
        </>
      )}
    </article>
  );
}

export default ClaimCard;
