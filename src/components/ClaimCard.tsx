// src/components/ClaimCard.tsx
import type { Claim } from "../types";

interface ClaimCardProps {
  claim: Claim;
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
      <h3
        className={`font-bold text-gray-900 dark:text-white ${
          isCompact ? "text-sm" : "text-lg"
        }`}
      >
        Claim ID: {claim.id}
      </h3>

      {!isCompact && (
        <>
          <p className="text-gray-600 dark:text-gray-300">
            Item ID: {claim.itemId}
          </p>

          <p className="text-gray-600 dark:text-gray-300">
            Claimant ID: {claim.claimantId}
          </p>
        </>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Status: {claim.status}
      </p>
    </div>
  );
}

export default ClaimCard;
