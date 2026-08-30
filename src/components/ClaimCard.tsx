import type { ApiClaim } from "../types/index";

interface ClaimCardProps {
  claim: ApiClaim;
  variant?: "default" | "compact";
}

function ClaimCard({ claim, variant = "default" }: ClaimCardProps) {
  const isCompact = variant === "compact";

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
        Item ID: {claim.itemId}
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Status: {claim.status}
      </p>

      {!isCompact && (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Claimant ID: {claim.claimantId}
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Proof: {claim.proof}
          </p>
        </>
      )}
    </div>
  );
}

export default ClaimCard;
