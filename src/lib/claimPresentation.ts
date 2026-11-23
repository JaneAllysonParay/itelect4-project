import type { ApiClaim } from "../types/index";

type ClaimStatusFields = Pick<
  ApiClaim,
  "status" | "decisionSource" | "decisionReason" | "approvedWorkflowStatus" | "handoverAt"
>;

export type ClaimPresentation = {
  label: string;
  message: string;
  tone: "pending" | "approved" | "rejected" | "completed" | "unavailable";
};

export function claimPresentation(claim: ClaimStatusFields): ClaimPresentation {
  if (claim.status === "pending") {
    return {
      label: "Pending review",
      message: "Ownership proof is awaiting staff review.",
      tone: "pending",
    };
  }

  if (claim.status === "approved") {
    if (claim.approvedWorkflowStatus === "completed" && claim.handoverAt) {
      return {
        label: "Handover completed",
        message: "The physical handover was recorded.",
        tone: "completed",
      };
    }

    if (claim.approvedWorkflowStatus === "awaiting_handover") {
      return {
        label: "Approved · awaiting physical handover",
        message: "The Claim was approved and the Item reserved, but physical handover is not yet confirmed.",
        tone: "approved",
      };
    }

    return {
      label: "Historical approved Claim",
      message: "This approved Claim does not have a reliable handover record. Contact campus staff to verify its status.",
      tone: "unavailable",
    };
  }

  if (claim.decisionSource === "system") {
    return {
      label: "Closed automatically",
      message: "The report became unavailable, so the Claim was closed automatically.",
      tone: "unavailable",
    };
  }

  return {
    label: "Not approved",
    message: "The Claim was not approved.",
    tone: "rejected",
  };
}
