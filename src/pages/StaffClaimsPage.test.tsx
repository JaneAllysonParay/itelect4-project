import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffClaimsPage from "./StaffClaimsPage";
import useAuthStore from "../store/authStore";

const apiMocks = vi.hoisted(() => ({
  confirmClaimHandover: vi.fn(),
  confirmItemCustody: vi.fn(),
  fetchClaimsForReviewPage: vi.fn(),
  fetchItemsForCustodyReviewPage: vi.fn(),
  updateClaimStatus: vi.fn(),
  updatePickupInstructions: vi.fn(),
}));
vi.mock("../api/client", () => apiMocks);

const waitingClaim = {
  id: "claim-1", itemId: "item-1", claimDate: "2026-11-13T08:00:00.000Z", status: "approved" as const,
  claimant: { name: "Student One", email: "student.one@example.edu" },
  proof: "Private scratch mark", pickupInstructions: "Contact the campus security office for the current arrangements.",
  item: {
    id: "item-1", title: "Blue tumbler", description: "Blue tumbler with a silver lid", location: "Library",
    dateReported: "2026-11-12T08:00:00.000Z", status: "claimed" as const,
    reportType: "found" as const, lifecycleStatus: "reserved" as const, archivedAt: null,
  },
};

function renderPage() {
  useAuthStore.setState({ token: "staff-token", userId: "security-1", userName: "Security", userRole: "security" });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><StaffClaimsPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

function page<T>(data: T[], totalCount = data.length, pageNumber = 1) {
  return { data, page: pageNumber, pageSize: 20, totalCount, hasMore: pageNumber * 20 < totalCount };
}

describe("StaffClaimsPage handover confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(queue === "awaiting_handover" ? page([waitingClaim]) : page([])));
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page([]));
    apiMocks.confirmClaimHandover.mockResolvedValue({});
    apiMocks.confirmItemCustody.mockResolvedValue({});
    apiMocks.updateClaimStatus.mockResolvedValue({});
    apiMocks.updatePickupInstructions.mockResolvedValue({});
  });

  it("requires an explicit physical-return checkbox before recording handover", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Awaiting handover" }));

    expect(await screen.findByRole("heading", { name: "Blue tumbler" })).toBeInTheDocument();
    expect(screen.getByText("Claimant: Student One · student.one@example.edu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start handover confirmation" })).toBeInTheDocument();
    expect(apiMocks.confirmClaimHandover).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Start handover confirmation" }));
    const checkbox = screen.getByRole("checkbox", { name: "I confirm the approved claimant has physically received this Item." });
    expect(screen.getByRole("button", { name: "Confirm physical handover" })).toBeDisabled();
    await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: "Confirm physical handover" }));

    await waitFor(() => expect(apiMocks.confirmClaimHandover).toHaveBeenCalledWith("claim-1", undefined));
  });

  it("navigates staff through bounded pages within a queue", async () => {
    const laterClaim = {
      ...waitingClaim,
      id: "claim-page-2",
      item: { ...waitingClaim.item, id: "item-page-2", title: "Later queue item" },
    };
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string, pageNumber: number) => Promise.resolve(
      queue === "pending" && pageNumber === 2 ? page([laterClaim], 21, 2) : page([], 21, pageNumber),
    ));
    const user = userEvent.setup();
    renderPage();

    const next = await screen.findByRole("button", { name: "Next page" });
    await user.click(next);
    expect(await screen.findByRole("heading", { name: "Later queue item" })).toBeInTheDocument();
    expect(apiMocks.fetchClaimsForReviewPage).toHaveBeenCalledWith("pending", 2);
  });

  it("resets pagination when staff switches queues", async () => {
    const laterClaim = {
      ...waitingClaim,
      id: "claim-page-2",
      item: { ...waitingClaim.item, id: "item-page-2", title: "Later queue item" },
    };
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string, pageNumber: number) => Promise.resolve(
      queue === "pending" && pageNumber === 1
        ? page([], 21, 1)
        : queue === "pending"
          ? page([laterClaim], 21, 2)
          : queue === "awaiting_handover" && pageNumber === 1
            ? page([waitingClaim])
            : page([], 21, pageNumber),
    ));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Next page" }));
    expect(await screen.findByRole("heading", { name: "Later queue item" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Awaiting handover" }));

    expect(await screen.findByRole("heading", { name: "Blue tumbler" })).toBeInTheDocument();
    expect(apiMocks.fetchClaimsForReviewPage).toHaveBeenCalledWith("awaiting_handover", 1);
    expect(screen.getByText(/Page 1 · 1 Claims/)).toBeInTheDocument();
  });

  it("disables ordinary approval for a pending found report with missing custody", async () => {
    const pendingMissingCustody = {
      ...waitingClaim,
      id: "claim-missing-custody",
      status: "pending" as const,
      item: {
        ...waitingClaim.item,
        status: "found" as const,
        reportType: "found" as const,
        lifecycleStatus: "open" as const,
        custodyStatus: null,
      },
    };
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(
      queue === "pending" ? page([pendingMissingCustody]) : page([]),
    ));
    renderPage();

    expect(await screen.findByText(/lacks valid custody information/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve and reserve" })).toBeDisabled();
  });

  it("keeps historical approved Claims in reconciliation without normal actions", async () => {
    const historicalClaim = {
      ...waitingClaim,
      id: "claim-historical",
      status: "approved" as const,
      approvedWorkflowStatus: "legacy" as const,
      item: null,
    };
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(
      queue === "legacy" ? page([historicalClaim]) : page([]),
    ));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Legacy cases" }));

    expect(await screen.findByText(/no handover is assumed or recorded/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve and reserve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start handover confirmation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject Claim" })).not.toBeInTheDocument();
  });
});
