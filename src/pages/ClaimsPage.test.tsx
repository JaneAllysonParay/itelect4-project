import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRoleName } from "../types/index";
import useAuthStore from "../store/authStore";
import ClaimsPage from "./ClaimsPage";

const apiMocks = vi.hoisted(() => ({
  fetchClaimsPage: vi.fn(),
  fetchClaimsForReviewPage: vi.fn(),
  createClaim: vi.fn(),
  fetchItemsPage: vi.fn(),
  fetchReceivedClaimsPage: vi.fn(),
  updateClaimStatus: vi.fn(),
  fetchItemById: vi.fn(),
}));

vi.mock("../api/client", () => apiMocks);

function renderClaimsPage(role: UserRoleName, path = "/claims") {
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
      <MemoryRouter initialEntries={[path]}>
        <ClaimsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function page<T>(data: T[], totalCount = data.length, pageNumber = 1, pageSize = 20) {
  return { data, page: pageNumber, pageSize, totalCount, hasMore: pageNumber * pageSize < totalCount };
}

describe("claim review controls", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiMocks.fetchClaimsPage.mockResolvedValue(page([]));
    apiMocks.fetchClaimsForReviewPage.mockResolvedValue(page([]));
    apiMocks.createClaim.mockResolvedValue({});
    apiMocks.fetchItemsPage.mockResolvedValue(page([
      {
        id: "public-item",
        title: "Public item",
        ownerId: "another-user",
        status: "found",
        custodyStatus: "finder_reported",
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
    ]));
    apiMocks.fetchReceivedClaimsPage.mockResolvedValue(page([
      {
        id: "received-claim",
        itemId: "own-item",
        claimantId: "another-user",
        claimDate: "2026-11-14T00:00:00.000Z",
        status: "pending",
        proof: "Private proof must stay hidden",
      },
    ]));
    apiMocks.updateClaimStatus.mockResolvedValue({});
  });

  it("hides staff decisions and proof from ordinary item owners", async () => {
    renderClaimsPage("student");

    expect(
      await screen.findByText("Pending review"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
    expect(screen.queryByText(/Proof:/)).toBeNull();
    expect(screen.queryByText("Private proof must stay hidden")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Claims awaiting staff review"),
    ).toBeNull();
    expect(apiMocks.fetchClaimsForReviewPage).not.toHaveBeenCalled();

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
    apiMocks.fetchClaimsForReviewPage.mockResolvedValue(page([
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
          custodyStatus: "finder_reported",
          archivedAt: null,
        },
      },
    ]));
    renderClaimsPage("security");

    expect(
      await screen.findByText("Claims awaiting staff review"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("A unique scratch on the blue base"),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Blue tumbler" })).toBeInTheDocument();
    expect(screen.getByText("Report type: Found report")).toBeInTheDocument();
    expect(screen.getByText("Location: Library")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
    expect(screen.queryByText(/Claimant ID:/)).toBeNull();
    expect(apiMocks.fetchClaimsForReviewPage).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Claim approved and the found item reserved. Staff must separately confirm physical handover.");
  });

  it("allows rejecting archived or missing-item claims but disables approval", async () => {
    apiMocks.fetchClaimsForReviewPage.mockResolvedValue(page([
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
    ]));

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

  it("lets students select a claimable found report beyond the initial 20", async () => {
    const firstPageItems = Array.from({ length: 20 }, (_, index) => ({
      id: `first-${index}`, title: `First page report ${index}`, description: "Found item description",
      location: "Library", dateReported: "2026-11-14T00:00:00.000Z", status: "found" as const,
      reportType: "found" as const, lifecycleStatus: "open" as const, ownerId: "another-user", archivedAt: null, custodyStatus: "finder_reported" as const,
    }));
    const outsideItem = {
      id: "aaaaaaaaaaaaaaaaaaaaaaaa", title: "Outside first page", description: "Found item description",
      location: "Library", dateReported: "2026-11-14T00:00:00.000Z", status: "found" as const,
      reportType: "found" as const, lifecycleStatus: "open" as const, ownerId: "another-user", archivedAt: null, custodyStatus: "finder_reported" as const,
    };
    apiMocks.fetchItemsPage.mockImplementation(({ page: requestedPage }: { page?: number }) => Promise.resolve(
      requestedPage === 2 ? page([outsideItem], 21, 2) : page(firstPageItems, 21, 1),
    ));
    const user = userEvent.setup();
    renderClaimsPage("student");

    const next = await screen.findByRole("button", { name: "More reports" });
    await user.click(next);
    const option = await screen.findByRole("option", { name: "Outside first page" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Item" }), option);
    await user.type(screen.getByLabelText("Private ownership proof"), "A matching scratch on the lid");
    await user.click(screen.getByRole("button", { name: "Submit Claim" }));

    await waitFor(() => expect(apiMocks.createClaim).toHaveBeenCalled());
    expect(apiMocks.createClaim.mock.calls[0]?.[0]).toEqual({
      itemId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      proof: "A matching scratch on the lid",
    });
  });

  it("selects a direct-linked eligible Item even when it is outside the first page", async () => {
    const outsideItem = {
      id: "bbbbbbbbbbbbbbbbbbbbbbbb", title: "Direct-linked report", description: "Found item description", location: "Library",
      dateReported: "2026-11-14T00:00:00.000Z", status: "found" as const, reportType: "found" as const,
      lifecycleStatus: "open" as const, ownerId: "another-user", archivedAt: null, custodyStatus: "security_reported" as const,
    };
    const firstPageItems = Array.from({ length: 20 }, (_, index) => ({
      ...outsideItem, id: `first-${index}`, title: `First page report ${index}`,
    }));
    apiMocks.fetchItemsPage.mockResolvedValue(page(firstPageItems, 21, 1));
    apiMocks.fetchItemById.mockResolvedValue(outsideItem);
    const user = userEvent.setup();
    renderClaimsPage("student", `/claims?itemId=${outsideItem.id}`);

    const itemSelect = await screen.findByRole("combobox", { name: "Item" });
    await waitFor(() => expect(itemSelect).toHaveValue(outsideItem.id));
    expect(screen.getByRole("option", { name: "Direct-linked report" })).toBeInTheDocument();
    await user.selectOptions(itemSelect, outsideItem.id);
    const proofInput = screen.getByLabelText("Private ownership proof");
    await user.type(proofInput, "A distinct mark on the base");
    const submitButton = screen.getByRole("button", { name: "Submit Claim" });
    expect(submitButton).toBeEnabled();
    expect(itemSelect).toHaveValue(outsideItem.id);
    expect(proofInput).toHaveValue("A distinct mark on the base");
    await user.click(submitButton);

    await waitFor(() => expect(apiMocks.createClaim).toHaveBeenCalled());
    expect(apiMocks.createClaim.mock.calls[0]?.[0]).toEqual({ itemId: outsideItem.id, proof: "A distinct mark on the base" });
  });

  it("shows truthful success feedback only after the API confirms submission", async () => {
    const itemId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    apiMocks.fetchItemsPage.mockResolvedValue(page([
      { id: itemId, title: "Public item", ownerId: "another-user", status: "found", custodyStatus: "finder_reported" },
    ]));
    apiMocks.createClaim.mockResolvedValue({ id: "new-claim", status: "pending" });
    const user = userEvent.setup();
    renderClaimsPage("student");

    const itemSelect = await screen.findByRole("combobox", { name: "Item" });
    await screen.findByRole("option", { name: "Public item" });
    await user.selectOptions(itemSelect, itemId);
    await user.type(screen.getByLabelText("Private ownership proof"), "A distinct stitch by the handle");
    await user.click(screen.getByRole("button", { name: "Submit Claim" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Claim submitted. Authorized staff will review your proof. This does not approve the Claim or authorize pickup.");
    expect(screen.getByRole("link", { name: "Track it in My Claims" })).toHaveAttribute("href", "/my-claims");
  });

  it("shows a server error after a failed Claim submission", async () => {
    const itemId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    apiMocks.fetchItemsPage.mockResolvedValue(page([
      { id: itemId, title: "Public item", ownerId: "another-user", status: "found", custodyStatus: "finder_reported" },
    ]));
    apiMocks.createClaim.mockRejectedValue(new Error("Item is no longer available."));
    const user = userEvent.setup();
    renderClaimsPage("student");

    const itemSelect = await screen.findByRole("combobox", { name: "Item" });
    await screen.findByRole("option", { name: "Public item" });
    await user.selectOptions(itemSelect, itemId);
    await user.type(screen.getByLabelText("Private ownership proof"), "A distinct stitch by the handle");
    await user.click(screen.getByRole("button", { name: "Submit Claim" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Item is no longer available.");
  });

  it("labels the received, staff-review, and submitted empty queues independently", async () => {
    apiMocks.fetchReceivedClaimsPage.mockResolvedValue(page([]));
    renderClaimsPage("security");

    const sections = await Promise.all([
      screen.findByRole("region", { name: "No Claims received" }),
      screen.findByRole("region", { name: "No pending Claims" }),
      screen.findByRole("region", { name: "No Claim submissions yet" }),
    ]);
    const headingIds = sections.map((section) => {
      const heading = section.querySelector("h2");
      expect(heading).not.toBeNull();
      expect(section).toHaveAttribute("aria-labelledby", heading?.id);
      return heading!.id;
    });

    expect(new Set(headingIds).size).toBe(sections.length);
    expect(new Set(Array.from(document.querySelectorAll("[id]"), (element) => element.id)).size)
      .toBe(document.querySelectorAll("[id]").length);
  });
});
