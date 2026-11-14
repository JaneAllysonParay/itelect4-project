import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRoleName } from "../types/index";
import useAuthStore from "../store/authStore";
import ClaimsPage from "./ClaimsPage";

const apiMocks = vi.hoisted(() => ({
  fetchClaims: vi.fn(),
  fetchClaimsForReview: vi.fn(),
  createClaim: vi.fn(),
  fetchItems: vi.fn(),
  fetchReceivedClaims: vi.fn(),
  updateClaimStatus: vi.fn(),
}));

vi.mock("../api/client", () => apiMocks);

function renderClaimsPage(role: UserRoleName) {
  useAuthStore.setState({
    token: "test-token",
    userId: "owner-1",
    userName: "Owner",
    userRole: role,
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClaimsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("claim review controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchClaims.mockResolvedValue([]);
    apiMocks.fetchClaimsForReview.mockResolvedValue([]);
    apiMocks.createClaim.mockResolvedValue({});
    apiMocks.fetchItems.mockResolvedValue([
      {
        id: "public-item",
        title: "Public item",
        ownerId: "another-user",
        status: "found",
      },
      {
        id: "own-item",
        title: "My own item",
        ownerId: "owner-1",
        status: "lost",
      },
      {
        id: "claimed-item",
        title: "Already claimed item",
        ownerId: "another-user",
        status: "claimed",
      },
    ]);
    apiMocks.fetchReceivedClaims.mockResolvedValue([
      {
        id: "received-claim",
        itemId: "own-item",
        claimantId: "another-user",
        claimDate: "2026-11-14T00:00:00.000Z",
        status: "pending",
      },
    ]);
    apiMocks.updateClaimStatus.mockResolvedValue({});
  });

  it("hides staff decisions and proof from ordinary item owners", async () => {
    renderClaimsPage("student");

    expect(
      await screen.findByText("Status: Awaiting review"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
    expect(screen.queryByText(/Proof:/)).toBeNull();
    expect(
      screen.queryByText("Claims awaiting staff review"),
    ).toBeNull();
    expect(apiMocks.fetchClaimsForReview).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Item" })).toHaveTextContent(
        "Public item",
      );
    });
    expect(screen.getByRole("combobox", { name: "Item" })).not.toHaveTextContent(
      "My own item",
    );
    expect(screen.getByRole("combobox", { name: "Item" })).not.toHaveTextContent(
      "Already claimed item",
    );
  });

  it("shows proof and decision controls to security reviewers", async () => {
    apiMocks.fetchClaimsForReview.mockResolvedValue([
      {
        id: "review-claim",
        itemId: "public-item",
        claimantId: "student-1",
        claimDate: "2026-11-14T00:00:00.000Z",
        status: "pending",
        proof: "A unique scratch on the blue base",
        item: {
          id: "public-item",
          title: "Blue tumbler",
          description: "Blue with a silver lid",
          location: "Library",
          dateReported: "2026-11-13T00:00:00.000Z",
          status: "found",
          archivedAt: null,
        },
      },
    ]);
    renderClaimsPage("security");

    expect(
      await screen.findByText("Claims awaiting staff review"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Proof: A unique scratch on the blue base"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Item: Blue tumbler")).toBeInTheDocument();
    expect(screen.getByText("Report type: Found report")).toBeInTheDocument();
    expect(screen.getByText("Location: Library")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
    expect(screen.queryByText(/Claimant ID:/)).toBeNull();
    expect(apiMocks.fetchClaimsForReview).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent(
      "Claim approved. Physical handover is not recorded in this system.",
    );
  });

  it("allows rejecting archived or missing-item claims but disables approval", async () => {
    apiMocks.fetchClaimsForReview.mockResolvedValue([
      {
        id: "archived-claim",
        itemId: "archived-item",
        claimDate: "2026-11-14T00:00:00.000Z",
        status: "pending",
        proof: "Proof for archived item",
        item: {
          id: "archived-item",
          title: "Archived tumbler",
          description: "Blue tumbler",
          location: "Library",
          dateReported: "2026-11-13T00:00:00.000Z",
          status: "found",
          archivedAt: "2026-11-14T00:00:00.000Z",
        },
      },
      {
        id: "orphan-claim",
        itemId: "missing-item",
        claimDate: "2026-11-14T00:00:00.000Z",
        status: "pending",
        proof: "Proof for unavailable item",
        item: null,
      },
    ]);

    renderClaimsPage("security");

    expect(await screen.findByText("Archive status: Archived")).toBeInTheDocument();
    expect(screen.getByText("Item details unavailable.")).toBeInTheDocument();
    expect(
      screen.getByText(/pending claim can be rejected but cannot be approved/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Item details are unavailable. This claim cannot be approved."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Approve" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Approve" }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getAllByRole("button", { name: "Reject" }).every((button) => (button as HTMLButtonElement).disabled)).toBe(false);
  });
});
