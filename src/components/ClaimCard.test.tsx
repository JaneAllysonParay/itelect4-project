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
  it("labels an approved claim without implying physical handover", () => {
    render(<ClaimCard claim={approvedClaim} />);

    expect(screen.getByText("Status: Claim approved")).toBeInTheDocument();
    expect(
      screen.getByText("Physical handover is not recorded in this system."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/returned|handed over|reserved/i)).toBeNull();
  });
});
