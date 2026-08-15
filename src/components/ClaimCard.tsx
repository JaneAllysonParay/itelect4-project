// src/components/ClaimCard.tsx
import type { Claim } from "../types";

interface ClaimCardProps {
  claim: Claim;
  variant?: "default" | "compact";
}

function ClaimCard({ claim }: ClaimCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-gray-900 dark:text-white">Claim ID: {claim.id}</p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Item ID: {claim.itemId}
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Claimant ID: {claim.claimantId}
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Status: {claim.status}
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Proof: {claim.proof}
      </p>
    </div>
  );
}


export default ClaimCard;
