import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ApiClaim, ApiReviewClaim } from "../types/index";
import ClaimCard from "./ClaimCard";

const approvedClaim: ApiClaim = {
  id: "claim-1",
  itemId: "item-1",
  claimantId: "student-1",
  claimDate: "2026-11-14T00:00:00.000Z",
  status: "approved",
  proof: "A distinctive mark on the base",
};

describe("ClaimCard status language", () => {
  it("shows a neutral message for an approved claim without canonical workflow evidence", () => {
    render(<ClaimCard claim={approvedClaim} />);

    expect(screen.getByText("Historical approved Claim")).toBeInTheDocument();
    expect(screen.getByText("This approved Claim does not have a reliable handover record. Contact campus staff to verify its status.")).toBeInTheDocument();
    expect(screen.queryByText(/awaiting physical handover|Handover completed/i)).toBeNull();
  });

  it("labels an approved canonical reservation as awaiting handover", () => {
    render(<ClaimCard claim={{ ...approvedClaim, approvedWorkflowStatus: "awaiting_handover" }} />);

    expect(screen.getByText("Approved · awaiting physical handover")).toBeInTheDocument();
    expect(screen.getByText("The Claim was approved and the Item reserved, but physical handover is not yet confirmed.")).toBeInTheDocument();
  });

  it("labels only a fully recorded handover as completed", () => {
    render(<ClaimCard claim={{ ...approvedClaim, approvedWorkflowStatus: "completed", handoverAt: "2026-11-14T08:00:00.000Z" }} />);

    expect(screen.getByText("Handover completed")).toBeInTheDocument();
    expect(screen.getByText("The physical handover was recorded.")).toBeInTheDocument();
  });

  it("does not label completion without a recorded handover timestamp", () => {
    render(<ClaimCard claim={{ ...approvedClaim, approvedWorkflowStatus: "completed" }} />);

    expect(screen.getByText("Historical approved Claim")).toBeInTheDocument();
    expect(screen.queryByText("Handover completed")).not.toBeInTheDocument();
  });

  it("does not expose received-Claim proof even if it appears in unexpected response data", () => {
    const receivedClaim = {
      id: "received-claim", itemId: "item-1", claimantId: "another-student", claimDate: "2026-11-14T00:00:00.000Z",
      status: "pending", proof: "Should never be visible to the report owner.",
      pickupInstructions: "Should remain private to the approved claimant and staff.",
      item: { id: "item-1", title: "Blue tumbler", description: "Blue cup", location: "Library", dateReported: "2026-11-12T08:00:00.000Z", status: "found" },
    } as unknown as ApiClaim;
    render(<ClaimCard claim={receivedClaim} context="received" />);

    expect(screen.getByText("Blue tumbler")).toBeInTheDocument();
    expect(screen.queryByText(/Should never be visible/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Should remain private/)).not.toBeInTheDocument();
  });

  it("shows staff Item type and lifecycle context while keeping review actions out of student views", () => {
    const reviewClaim: ApiReviewClaim = {
      ...approvedClaim,
      status: "pending",
      item: {
        id: "item-1",
        title: "Blue tumbler",
        description: "Blue cup",
        location: "Library",
        dateReported: "2026-11-12T08:00:00.000Z",
        reportType: "found",
        lifecycleStatus: "open",
        status: "found",
      },
    };
    const actions = <button type="button">Staff only decision control</button>;

    const { rerender } = render(<ClaimCard claim={reviewClaim} context="review" reviewActions={actions} />);
    expect(screen.getByText("Found report · Open")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Staff only decision control" })).toBeInTheDocument();

    rerender(<ClaimCard claim={reviewClaim} context="mine" reviewActions={actions} />);
    expect(screen.queryByRole("button", { name: "Staff only decision control" })).not.toBeInTheDocument();
  });
});
