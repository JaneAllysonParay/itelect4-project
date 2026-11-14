import type {
  ApiClaim,
  ApiReceivedClaim,
  ApiReviewClaim,
} from "../types/index";

interface ClaimCardProps {
  claim: ApiClaim | ApiReceivedClaim | ApiReviewClaim;
  variant?: "default" | "compact";
}

const claimStatusLabel: Record<ApiClaim["status"], string> = {
  pending: "Awaiting review",
  approved: "Claim approved",
  rejected: "Claim rejected",
};

function ClaimCard({ claim, variant = "default" }: ClaimCardProps) {
  const isCompact = variant === "compact";
  const hasItemContext = "item" in claim;
  const item = hasItemContext ? claim.item : null;

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
        isCompact ? "p-3" : "p-5"
      }`}
    >
      <p
        className={`font-semibold text-gray-900 dark:text-white ${
          isCompact ? "text-sm" : "text-base"
        }`}
      >
        Claim ID: {claim.id}
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Claim date: {new Date(claim.claimDate).toLocaleDateString()}
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Status: {claimStatusLabel[claim.status]}
      </p>

      {!isCompact && (
        <>
          {item ? (
            <div className="mt-2 grid gap-1 border-t border-gray-200 pt-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              <p className="font-medium text-gray-900 dark:text-white">
                Item: {item.title}
              </p>
              <p>
                Report type: {item.status === "lost"
                  ? "Lost report"
                  : item.status === "found"
                    ? "Found report"
                    : "Not available from current status"}
              </p>
              <p>
                Item status: {item.status === "claimed"
                  ? "Unavailable for claims"
                  : item.status}
              </p>
              <p>Location: {item.location}</p>
              <p>Reported: {new Date(item.dateReported).toLocaleDateString()}</p>
              <p>Archive status: {item.archivedAt ? "Archived" : "Active"}</p>
              {item.description && <p>Description: {item.description}</p>}
            </div>
          ) : hasItemContext ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Item details unavailable.
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Item ID: {claim.itemId}
            </p>
          )}

          {"proof" in claim && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Proof: {claim.proof}
            </p>
          )}
          {claim.reviewedAt && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Reviewed: {new Date(claim.reviewedAt).toLocaleDateString()}
            </p>
          )}
          {claim.status === "approved" && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Physical handover is not recorded in this system.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default ClaimCard;
