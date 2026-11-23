import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByText("The Claim was approved and the Item reserved, but physical handover is not yet confirmed.")).toBeInTheDocument();
    expect(screen.getByText("Ask staff for the current pickup location.")).toBeInTheDocument();
    expect(screen.getByText("The physical handover was recorded.")).toBeInTheDocument();
    expect(screen.getByText("This approved Claim does not have a reliable handover record. Contact campus staff to verify its status.")).toBeInTheDocument();
    expect(screen.getByText("Approved · awaiting physical handover")).toBeInTheDocument();
    expect(screen.getByText("Handover completed")).toBeInTheDocument();
    expect(screen.getByText("Historical approved Claim")).toBeInTheDocument();
    expect(screen.queryByText("claim-private-id")).not.toBeInTheDocument();
    expect(screen.queryByText("Private ownership proof")).not.toBeInTheDocument();
  });

  it("explains pending, rejected, and system-closed Claims accurately", async () => {
    apiMocks.fetchClaimsPage.mockResolvedValue({ data: [
      { id: "pending-claim", itemId: "item-pending", claimantId: "student-1", claimDate: "2026-11-14T08:00:00.000Z", status: "pending", proof: "A private proof detail", item: null },
      { id: "rejected-claim", itemId: "item-rejected", claimantId: "student-1", claimDate: "2026-11-13T08:00:00.000Z", status: "rejected", proof: "Another private detail", decisionSource: "staff", item: null },
      { id: "system-claim", itemId: "item-system", claimantId: "student-1", claimDate: "2026-11-12T08:00:00.000Z", status: "rejected", proof: "Not public", decisionSource: "system", decisionReason: "The report was archived.", item: null },
      { id: "incomplete-handover", itemId: "item-incomplete", claimantId: "student-1", claimDate: "2026-11-11T08:00:00.000Z", status: "approved", proof: "Private detail", approvedWorkflowStatus: "completed", item: null },
    ], page: 1, pageSize: 20, totalCount: 4, hasMore: false });
    renderPage();

    expect(await screen.findByText("Ownership proof is awaiting staff review.")).toBeInTheDocument();
    expect(screen.getByText("The Claim was not approved.")).toBeInTheDocument();
    expect(screen.getByText("The report became unavailable, so the Claim was closed automatically.")).toBeInTheDocument();
    expect(screen.getByText("Reason: The report was archived.")).toBeInTheDocument();
    expect(screen.getAllByText("Historical approved Claim")).toHaveLength(1);
    expect(screen.queryByText("A private proof detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Another private detail")).not.toBeInTheDocument();
  });

  it("withholds pickup instructions when Item context is missing or not reserved", async () => {
    apiMocks.fetchClaimsPage.mockResolvedValue({ data: [
      {
        id: "wrong-lifecycle", itemId: "item-1", claimantId: "student-1", claimDate: "2026-11-13T08:00:00.000Z",
        status: "approved", pickupInstructions: "Do not show this location.", approvedWorkflowStatus: "awaiting_handover",
        item: { id: "item-1", title: "Wrong lifecycle", description: "Found item", location: "Hall", dateReported: "2026-11-12T08:00:00.000Z", status: "found", reportType: "found", lifecycleStatus: "open" },
      },
      {
        id: "missing-item", itemId: "item-2", claimantId: "student-1", claimDate: "2026-11-12T08:00:00.000Z",
        status: "approved", pickupInstructions: "Do not show missing-item instructions.", approvedWorkflowStatus: "awaiting_handover", item: null,
      },
    ], page: 1, pageSize: 20, totalCount: 2, hasMore: false });
    renderPage();

    expect(await screen.findAllByText("Pickup details are unavailable while the Item status is being verified. Contact campus staff for help.")).toHaveLength(2);
    expect(screen.queryByText("Do not show this location.")).not.toBeInTheDocument();
    expect(screen.queryByText("Do not show missing-item instructions.")).not.toBeInTheDocument();
  });

  it("shows an empty state and paginates using the server page response", async () => {
    apiMocks.fetchClaimsPage.mockResolvedValueOnce({ data: [], page: 1, pageSize: 20, totalCount: 0, hasMore: true });
    apiMocks.fetchClaimsPage.mockResolvedValueOnce({ data: [], page: 2, pageSize: 20, totalCount: null, hasMore: false });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("heading", { name: "No Claims submitted" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("Page 2 · count unavailable Claims")).toBeInTheDocument();
    expect(apiMocks.fetchClaimsPage).toHaveBeenNthCalledWith(2, 2);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});
