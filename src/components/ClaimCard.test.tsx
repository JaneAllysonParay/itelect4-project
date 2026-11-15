import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ApiClaim } from "../types/index";
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

    expect(screen.getByText("Status: Historical approved Claim")).toBeInTheDocument();
    expect(screen.getByText("Historical approved Claim — contact campus security to verify its status.")).toBeInTheDocument();
    expect(screen.queryByText(/awaiting physical handover|Handover completed/i)).toBeNull();
  });

  it("labels an approved canonical reservation as awaiting handover", () => {
    render(<ClaimCard claim={{ ...approvedClaim, approvedWorkflowStatus: "awaiting_handover" }} />);

    expect(screen.getByText("Status: Approved · awaiting physical handover")).toBeInTheDocument();
    expect(screen.getByText("Approved — awaiting physical handover.")).toBeInTheDocument();
  });

  it("labels only a fully recorded handover as completed", () => {
    render(<ClaimCard claim={{ ...approvedClaim, approvedWorkflowStatus: "completed", handoverAt: "2026-11-14T08:00:00.000Z" }} />);

    expect(screen.getByText("Status: Handover completed")).toBeInTheDocument();
    expect(screen.getByText("Handover completed.")).toBeInTheDocument();
  });
});
