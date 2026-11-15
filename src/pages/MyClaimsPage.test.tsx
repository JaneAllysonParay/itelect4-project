import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyClaimsPage from "./MyClaimsPage";

const apiMocks = vi.hoisted(() => ({ fetchClaimsPage: vi.fn() }));
vi.mock("../api/client", () => apiMocks);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><MyClaimsPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MyClaimsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchClaimsPage.mockResolvedValue({ data: [
      {
        id: "claim-private-id", itemId: "item-1", claimantId: "student-1", claimDate: "2026-11-13T08:00:00.000Z",
        status: "approved", proof: "Private ownership proof", pickupInstructions: "Ask staff for the current pickup location.",
        approvedWorkflowStatus: "awaiting_handover",
        item: { id: "item-1", title: "Blue tumbler", description: "Blue cup", location: "Library", dateReported: "2026-11-12T08:00:00.000Z", status: "claimed", reportType: "found", lifecycleStatus: "reserved" },
      },
      {
        id: "claim-returned-id", itemId: "item-2", claimantId: "student-1", claimDate: "2026-11-10T08:00:00.000Z",
        status: "approved", proof: "Old proof", handoverAt: "2026-11-14T08:00:00.000Z",
        approvedWorkflowStatus: "completed",
        item: { id: "item-2", title: "Red notebook", description: "Red notebook", location: "Hall", dateReported: "2026-11-09T08:00:00.000Z", status: "claimed", reportType: "found", lifecycleStatus: "returned" },
      },
      {
        id: "claim-historical-id", itemId: "item-3", claimantId: "student-1", claimDate: "2026-11-08T08:00:00.000Z",
        status: "approved", proof: "Historical proof", approvedWorkflowStatus: "legacy",
        item: { id: "item-3", title: "Old keychain", description: "Small keychain", location: "Hall", dateReported: "2026-11-07T08:00:00.000Z", status: "unknown", reportType: "unknown", lifecycleStatus: "unknown" },
      },
    ], page: 1, pageSize: 20, totalCount: 3, hasMore: false });
  });

  it("shows distinct awaiting, completed, and historical approved outcomes", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "My Claims" })).toBeInTheDocument();
    expect(await screen.findByText("Blue tumbler")).toBeInTheDocument();
    expect(screen.getByText("Approved — awaiting physical handover.")).toBeInTheDocument();
    expect(screen.getByText("Ask staff for the current pickup location.")).toBeInTheDocument();
    expect(screen.getByText("Handover completed.")).toBeInTheDocument();
    expect(screen.getByText("Historical approved Claim — contact campus security to verify its status.")).toBeInTheDocument();
    expect(screen.getByText("Approved · awaiting physical handover")).toBeInTheDocument();
    expect(screen.getByText("Handover completed")).toBeInTheDocument();
    expect(screen.getByText("Historical approved Claim")).toBeInTheDocument();
    expect(screen.queryByText("claim-private-id")).not.toBeInTheDocument();
    expect(screen.queryByText("Private ownership proof")).not.toBeInTheDocument();
  });
});
