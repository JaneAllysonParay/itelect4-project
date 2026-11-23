import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffClaimsPage from "./StaffClaimsPage";
import useAuthStore from "../store/authStore";
import type { ApiItem, ApiPage, ApiReviewClaim } from "../types/index";

const apiMocks = vi.hoisted(() => ({
  confirmClaimHandover: vi.fn(),
  confirmItemCustody: vi.fn(),
  fetchClaimsForReviewPage: vi.fn(),
  fetchItemsForCustodyReviewPage: vi.fn(),
  updateClaimStatus: vi.fn(),
  updatePickupInstructions: vi.fn(),
}));
vi.mock("../api/client", () => apiMocks);

const foundItem: ApiItem = {
  id: "item-1",
  title: "Blue tumbler",
  description: "Blue tumbler with a silver lid",
  location: "Library",
  dateReported: "2026-11-12T08:00:00.000Z",
  eventAt: "2026-11-11T08:00:00.000Z",
  status: "found",
  ownerId: "student-owner",
  reportType: "found",
  lifecycleStatus: "open",
  custodyStatus: "security_reported",
  archivedAt: null,
};

const pendingClaim: ApiReviewClaim = {
  id: "claim-pending",
  itemId: foundItem.id,
  claimDate: "2026-11-13T08:00:00.000Z",
  status: "pending",
  proof: "Private scratch mark under the lid",
  claimant: { name: "Student One", email: "student.one@example.edu" },
  item: foundItem,
};

const waitingItem: ApiItem = {
  ...foundItem,
  status: "claimed",
  lifecycleStatus: "reserved",
  custodyStatus: "security_confirmed",
  reservedClaimId: "claim-waiting",
};

const waitingClaim: ApiReviewClaim = {
  ...pendingClaim,
  id: "claim-waiting",
  itemId: waitingItem.id,
  status: "approved",
  approvedWorkflowStatus: "awaiting_handover",
  proof: "Private scratch mark",
  pickupInstructions: "Contact the campus security office for current arrangements.",
  item: { ...waitingItem, title: "Blue tumbler" },
};

function page<T>(data: T[], totalCount: number | null = data.length, pageNumber = 1, more?: boolean): ApiPage<T> {
  const pageSize = 20;
  return {
    data,
    page: pageNumber,
    pageSize,
    totalCount,
    hasMore: more ?? (totalCount !== null && pageNumber * pageSize < totalCount),
  };
}

function renderPage(role: "student" | "security" | "admin" | null = "security") {
  useAuthStore.setState({ token: role ? "staff-token" : null, userId: "staff-1", userName: "Campus Staff", userRole: role });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><StaffClaimsPage /></MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

describe("StaffClaimsPage access and queues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(
      page(queue === "awaiting_handover" ? [waitingClaim] : []),
    ));
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page([]));
    apiMocks.confirmClaimHandover.mockResolvedValue({});
    apiMocks.confirmItemCustody.mockResolvedValue({});
    apiMocks.updateClaimStatus.mockResolvedValue({});
    apiMocks.updatePickupInstructions.mockResolvedValue({});
  });

  it.each(["security", "admin"] as const)("loads staff data for the %s role", async (role) => {
    renderPage(role);

    expect(await screen.findByRole("heading", { name: "Staff Claim Management" })).toBeInTheDocument();
    await waitFor(() => {
      expect(apiMocks.fetchClaimsForReviewPage).toHaveBeenCalledWith("pending", 1);
      expect(apiMocks.fetchItemsForCustodyReviewPage).toHaveBeenCalledWith(1);
    });
  });

  it("does not issue staff API requests for students or signed-out visitors", async () => {
    const { rerender } = renderPage("student");
    expect(await screen.findByRole("alert")).toHaveTextContent("Only active security or admin staff");
    expect(apiMocks.fetchClaimsForReviewPage).not.toHaveBeenCalled();
    expect(apiMocks.fetchItemsForCustodyReviewPage).not.toHaveBeenCalled();

    useAuthStore.setState({ token: null, userId: null, userName: null, userRole: null });
    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><StaffClaimsPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Only active security or admin staff");
    expect(apiMocks.fetchClaimsForReviewPage).not.toHaveBeenCalled();
  });

  it("uses the pending queue by default and exposes all five original queues", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "Pending review" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Awaiting handover" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Completed handovers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejected / history" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Legacy cases" })).toBeInTheDocument();
    expect(apiMocks.fetchClaimsForReviewPage).toHaveBeenCalledWith("pending", 1);
  });

  it.each([
    ["Awaiting handover", "awaiting_handover"],
    ["Completed handovers", "completed"],
    ["Rejected / history", "rejected"],
    ["Legacy cases", "legacy"],
  ] as const)("fetches the %s queue with its original API value", async (label, queue) => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: label }));
    await waitFor(() => expect(apiMocks.fetchClaimsForReviewPage).toHaveBeenCalledWith(queue, 1));
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  });

  it("resets Claim pagination when switching queues and keeps custody pagination independent", async () => {
    const laterClaim = { ...waitingClaim, id: "claim-page-two", itemId: "item-page-two", item: { ...waitingItem, id: "item-page-two", title: "Later page item" } };
    const custodyItem = { ...foundItem, title: "Key set" };
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string, pageNumber: number) => Promise.resolve(
      queue === "pending" && pageNumber === 1
        ? page([], 21, 1)
        : queue === "pending" && pageNumber === 2
          ? page([laterClaim], 21, 2)
          : queue === "awaiting_handover" && pageNumber === 1
            ? page([waitingClaim])
            : page([], 21, pageNumber),
    ));
    apiMocks.fetchItemsForCustodyReviewPage.mockImplementation((pageNumber: number) => Promise.resolve(
      page(pageNumber === 1 ? [custodyItem] : [], 21, pageNumber),
    ));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Next page" }));
    expect(await screen.findByRole("heading", { name: "Later page item" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next custody page" }));
    expect(await screen.findByText("No custody reports on page 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Awaiting handover" }));

    expect(await screen.findByRole("heading", { name: "Blue tumbler" })).toBeInTheDocument();
    expect(apiMocks.fetchClaimsForReviewPage).toHaveBeenCalledWith("awaiting_handover", 1);
    expect(apiMocks.fetchItemsForCustodyReviewPage).toHaveBeenCalledTimes(2);
    expect(apiMocks.fetchItemsForCustodyReviewPage).toHaveBeenNthCalledWith(1, 1);
    expect(apiMocks.fetchItemsForCustodyReviewPage).toHaveBeenNthCalledWith(2, 2);
    expect(screen.getByText(/Page 2 · 21 custody reports · 20 per page/)).toBeInTheDocument();
  });

  it("allows server pagination when totalCount is unknown and hasMore is true", async () => {
    apiMocks.fetchClaimsForReviewPage.mockImplementation((_queue: string, pageNumber: number) => Promise.resolve(
      page(pageNumber === 2 ? [pendingClaim] : [], null, pageNumber, pageNumber === 1),
    ));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/count unavailable/)).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Next page" });
    expect(next).toBeEnabled();
    await user.click(next);
    expect(await screen.findByText("Private scratch mark under the lid")).toBeInTheDocument();
    expect(apiMocks.fetchClaimsForReviewPage).toHaveBeenCalledWith("pending", 2);
  });

  it("shows a helpful empty state for a later page with no records", async () => {
    apiMocks.fetchClaimsForReviewPage.mockImplementation((_queue: string, pageNumber: number) => Promise.resolve(
      page(pageNumber === 1 ? [pendingClaim] : [], 21, pageNumber, pageNumber === 1),
    ));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Next page" }));
    expect(await screen.findByText("No records on page 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("distinguishes loading and server errors from an empty queue", async () => {
    let resolveQueue!: (value: ApiPage<ApiReviewClaim>) => void;
    apiMocks.fetchClaimsForReviewPage.mockReturnValue(new Promise((resolve) => { resolveQueue = resolve; }));
    const { unmount } = renderPage();
    expect(await screen.findByRole("status")).toHaveTextContent("Loading pending review");
    unmount();

    apiMocks.fetchClaimsForReviewPage.mockRejectedValueOnce(new Error("Queue service is unavailable"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Queue service is unavailable");
    expect(screen.queryByText("No pending review")).not.toBeInTheDocument();
    await act(async () => resolveQueue(page([])));
  });
});

describe("StaffClaimsPage pending decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(page(queue === "pending" ? [pendingClaim] : [])));
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page([]));
    apiMocks.confirmClaimHandover.mockResolvedValue({});
    apiMocks.confirmItemCustody.mockResolvedValue({});
    apiMocks.updateClaimStatus.mockImplementation(async (id: string, status: string) => ({ ...pendingClaim, id, status }));
    apiMocks.updatePickupInstructions.mockResolvedValue({});
  });

  it("shows staff-only proof, claimant details, Item status, and explicit reservation guidance", async () => {
    renderPage();

    expect(await screen.findByText("Private scratch mark under the lid")).toBeInTheDocument();
    expect(screen.getByText("Student One · student.one@example.edu")).toBeInTheDocument();
    expect(screen.getByText("Found report · Open")).toBeInTheDocument();
    expect(screen.getByText(/Approval reserves an eligible found Item/)).toBeInTheDocument();
  });

  it("handles missing claimant data and invalid dates without inventing metadata", async () => {
    const incompleteClaim: ApiReviewClaim = {
      ...pendingClaim,
      claimant: undefined,
      item: { ...foundItem, dateReported: "not-a-date", eventAt: "not-a-date" },
    };
    apiMocks.fetchClaimsForReviewPage.mockResolvedValue(page([incompleteClaim]));
    renderPage();

    expect(await screen.findByText("Not available in this response")).toBeInTheDocument();
    expect(screen.getByText("Reported: Not provided")).toBeInTheDocument();
    expect(screen.getByText(/^Submitted:/)).not.toHaveTextContent("Not provided");
  });

  it.each([
    ["missing Item", { ...pendingClaim, id: "missing-item", item: null }],
    ["archived Item", { ...pendingClaim, id: "archived-item", item: { ...foundItem, archivedAt: "2026-11-20T00:00:00.000Z" } }],
    ["missing custody", { ...pendingClaim, id: "missing-custody", item: { ...foundItem, custodyStatus: null } }],
    ["unknown custody", { ...pendingClaim, id: "unknown-custody", item: { ...foundItem, custodyStatus: null } }],
    ["incompatible lifecycle", { ...pendingClaim, id: "wrong-lifecycle", item: { ...foundItem, lifecycleStatus: "reserved", status: "claimed" } }],
    ["ineligible report type", { ...pendingClaim, id: "lost-report", item: { ...foundItem, reportType: "lost", lifecycleStatus: "open", status: "lost" } }],
  ] as const)("does not allow approval for a %s", async (_name, claim) => {
    apiMocks.fetchClaimsForReviewPage.mockResolvedValue(page([claim as ApiReviewClaim]));
    renderPage();

    expect(await screen.findByRole("button", { name: "Approve and reserve" })).toBeDisabled();
  });

  it("preserves the existing pure-legacy eligibility rule", async () => {
    const legacyOpenClaim: ApiReviewClaim = {
      ...pendingClaim,
      item: {
        id: "legacy-found-item",
        title: "Old found report",
        description: "Old API shape",
        location: "Library",
        dateReported: foundItem.dateReported,
        status: "found",
        custodyStatus: "finder_reported",
      },
    };
    apiMocks.fetchClaimsForReviewPage.mockResolvedValue(page([legacyOpenClaim]));
    renderPage();

    expect(await screen.findByRole("button", { name: "Approve and reserve" })).toBeEnabled();
  });

  it("requires deliberate confirmation before approval and reports success only after the server responds", async () => {
    let resolveDecision!: (value: ApiReviewClaim) => void;
    apiMocks.updateClaimStatus.mockReturnValue(new Promise((resolve) => { resolveDecision = resolve; }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Approve and reserve" }));
    expect(screen.getByText(/It does not confirm pickup or physical handover/)).toBeInTheDocument();
    expect(apiMocks.updateClaimStatus).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(apiMocks.updateClaimStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Approve and reserve" }));
    const confirm = screen.getByRole("button", { name: "Confirm approval and reservation" });
    await user.click(confirm);
    expect(await screen.findByRole("button", { name: "Saving decision..." })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Saving decision..." }));
    expect(apiMocks.updateClaimStatus).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Claim approved and the eligible found Item reserved/)).not.toBeInTheDocument();
    expect(apiMocks.updateClaimStatus).toHaveBeenCalledWith("claim-pending", "approved");

    await act(async () => resolveDecision({ ...pendingClaim, status: "approved" }));
    expect(await screen.findByRole("status")).toHaveTextContent("This is not a physical handover.");
    expect(screen.queryByText("Handover completed")).not.toBeInTheDocument();
  });

  it("keeps rejection functional without changing its payload and supports cancellation", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reject Claim" }));
    expect(screen.getByText(/Rejecting this Claim closes it/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(apiMocks.updateClaimStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Reject Claim" }));
    await user.click(screen.getByRole("button", { name: "Confirm Claim rejection" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The Claim was rejected and the server confirmed the decision.");
    expect(apiMocks.updateClaimStatus).toHaveBeenCalledWith("claim-pending", "rejected");
  });

  it("keeps a pending decision attached to its Claim when staff switch queues", async () => {
    let resolveDecision!: (value: ApiReviewClaim) => void;
    apiMocks.updateClaimStatus.mockReturnValue(new Promise((resolve) => { resolveDecision = resolve; }));
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(
      page(queue === "pending" ? [pendingClaim] : queue === "awaiting_handover" ? [waitingClaim] : []),
    ));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Approve and reserve" }));
    await user.click(screen.getByRole("button", { name: "Confirm approval and reservation" }));
    await user.click(screen.getByRole("button", { name: "Awaiting handover" }));
    expect(await screen.findByRole("button", { name: "Start handover confirmation for Blue tumbler" })).toBeInTheDocument();
    expect(screen.queryByText(/Claim approved and the eligible found Item reserved/)).not.toBeInTheDocument();

    await act(async () => resolveDecision({ ...pendingClaim, status: "approved" }));
    await user.click(screen.getByRole("button", { name: "Pending review" }));
    expect(await screen.findByRole("status")).toHaveTextContent("This is not a physical handover.");
    expect(apiMocks.confirmClaimHandover).not.toHaveBeenCalled();
  });

  it("distinguishes automatic closures from staff rejections in history", async () => {
    const systemClosed: ApiReviewClaim = {
      ...pendingClaim,
      id: "system-closed",
      status: "rejected",
      decisionSource: "system",
      decisionReason: "The found report became unavailable.",
      decisionAt: "2026-11-20T08:00:00.000Z",
    };
    const staffRejected: ApiReviewClaim = {
      ...pendingClaim,
      id: "staff-rejected",
      status: "rejected",
      decisionSource: "staff",
      decisionReason: "The submitted ownership details did not match.",
      decisionAt: "2026-11-21T08:00:00.000Z",
    };
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(
      page(queue === "rejected" ? [systemClosed, staffRejected] : []),
    ));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Rejected / history" }));

    expect(await screen.findByText("Closed automatically by the system")).toBeInTheDocument();
    expect(screen.getByText("Rejected by staff")).toBeInTheDocument();
    expect(screen.getByText("Reason: The submitted ownership details did not match.")).toBeInTheDocument();
    expect(screen.getByText("Reason: The found report became unavailable.")).toBeInTheDocument();
  });

  it("shows an API decision conflict and does not report false success", async () => {
    apiMocks.updateClaimStatus.mockRejectedValueOnce(new Error("Claim is no longer pending"));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Approve and reserve" }));
    await user.click(screen.getByRole("button", { name: "Confirm approval and reservation" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Claim is no longer pending");
    expect(screen.queryByText(/Claim approved and the eligible found Item reserved/)).not.toBeInTheDocument();
  });
});

describe("StaffClaimsPage pickup instructions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(page(queue === "awaiting_handover" ? [waitingClaim] : [])));
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page([]));
    apiMocks.confirmClaimHandover.mockResolvedValue({});
    apiMocks.confirmItemCustody.mockResolvedValue({});
    apiMocks.updateClaimStatus.mockResolvedValue({});
    apiMocks.updatePickupInstructions.mockImplementation(async (id: string, text: string) => ({ ...waitingClaim, id, pickupInstructions: text }));
  });

  it("displays existing private instructions and saves trimmed text for the selected Claim", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));

    const textarea = await screen.findByRole("textbox", { name: "Instructions" });
    expect(textarea).toHaveValue(waitingClaim.pickupInstructions);
    expect(screen.getByText(/private to this claimant and authorized staff/)).toBeInTheDocument();
    await user.clear(textarea);
    await user.paste("  Please contact campus staff.  ");
    expect(screen.getByRole("button", { name: "Save instructions for Blue tumbler" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Save instructions for Blue tumbler" }));

    expect(apiMocks.updatePickupInstructions).toHaveBeenCalledWith("claim-waiting", "Please contact campus staff.");
    expect(await screen.findByRole("status")).toHaveTextContent("Pickup instructions were saved and confirmed in the server response.");
  });

  it("validates the trimmed minimum and enforces the 1000-character maximum", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));
    const textarea = await screen.findByRole("textbox", { name: "Instructions" });

    await user.clear(textarea);
    await user.paste("  ab  ");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save instructions for Blue tumbler" })).toBeDisabled();
    expect(textarea).toHaveAttribute("maxLength", "1000");
    expect(apiMocks.updatePickupInstructions).not.toHaveBeenCalled();
  });

  it("keeps independent drafts for multiple Claims and associates unique fields", async () => {
    const secondClaim: ApiReviewClaim = {
      ...waitingClaim,
      id: "claim-waiting-two",
      itemId: "item-two",
      claimant: { name: "Student Two", email: "student.two@example.edu" },
      item: { ...waitingItem, id: "item-two", title: "Silver key ring" },
      pickupInstructions: "Ask campus staff for this Claim's arrangements.",
    };
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(page(queue === "awaiting_handover" ? [waitingClaim, secondClaim] : [])));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));

    const fields = await screen.findAllByRole("textbox", { name: "Instructions" });
    expect(fields).toHaveLength(2);
    const ids = fields.map((field) => field.getAttribute("id"));
    expect(new Set(ids).size).toBe(2);
    await user.clear(fields[0]);
    await user.paste("Draft for the blue tumbler.");
    await user.clear(fields[1]);
    await user.paste("Draft for the silver key ring.");
    expect(fields[0]).toHaveValue("Draft for the blue tumbler.");
    expect(fields[1]).toHaveValue("Draft for the silver key ring.");
  });

  it("preserves a failed pickup draft and allows an accurate retry", async () => {
    apiMocks.updatePickupInstructions.mockRejectedValueOnce(new Error("Instructions must be between 5 and 1000 characters"));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));
    const textarea = await screen.findByRole("textbox", { name: "Instructions" });
    await user.clear(textarea);
    await user.paste("Contact the campus office.");
    await user.click(screen.getByRole("button", { name: "Save instructions for Blue tumbler" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Instructions must be between 5 and 1000 characters");
    expect(textarea).toHaveValue("Contact the campus office.");
    expect(screen.queryByText(/were saved and confirmed/)).not.toBeInTheDocument();
  });

  it("locks only the saving Claim's instructions until the server responds", async () => {
    let resolveSave!: (value: ApiReviewClaim) => void;
    apiMocks.updatePickupInstructions.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));
    const textarea = await screen.findByRole("textbox", { name: "Instructions" });
    await user.clear(textarea);
    await user.paste("Contact campus staff.");
    await user.click(screen.getByRole("button", { name: "Save instructions for Blue tumbler" }));

    expect(await screen.findByRole("button", { name: "Saving instructions..." })).toBeDisabled();
    expect(textarea).toBeDisabled();
    expect(apiMocks.updatePickupInstructions).toHaveBeenCalledTimes(1);
    await act(async () => resolveSave({ ...waitingClaim, pickupInstructions: "Contact campus staff." }));
    expect(await screen.findByRole("status")).toHaveTextContent("saved and confirmed in the server response");
    expect(screen.getByRole("textbox", { name: "Instructions" })).toHaveValue("Contact campus staff.");
  });
});

describe("StaffClaimsPage physical handover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(
      page(queue === "awaiting_handover" ? [waitingClaim] : queue === "completed" ? [] : []),
    ));
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page([]));
    apiMocks.confirmClaimHandover.mockResolvedValue({ ...waitingClaim, approvedWorkflowStatus: "completed", handoverAt: "2026-11-23T08:00:00.000Z" });
    apiMocks.confirmItemCustody.mockResolvedValue({});
    apiMocks.updateClaimStatus.mockResolvedValue({});
    apiMocks.updatePickupInstructions.mockResolvedValue({});
  });

  it("starts closed, focuses the acknowledgement, requires it, and sends the correct optional note", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));

    const start = await screen.findByRole("button", { name: "Start handover confirmation for Blue tumbler" });
    expect(screen.queryByRole("checkbox", { name: /physically handed the property/ })).not.toBeInTheDocument();
    expect(apiMocks.confirmClaimHandover).not.toHaveBeenCalled();
    await user.click(start);
    const checkbox = screen.getByRole("checkbox", { name: "I have verified this is the approved claimant and physically handed the property to them." });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveFocus();
    expect(screen.getByRole("button", { name: "Confirm physical handover" })).toBeDisabled();

    await user.click(checkbox);
    await user.type(screen.getByRole("textbox", { name: "Internal note (optional)" }), "Verified photo ID at handover.");
    await user.click(screen.getByRole("button", { name: "Confirm physical handover" }));

    expect(apiMocks.confirmClaimHandover).toHaveBeenCalledWith("claim-waiting", "Verified photo ID at handover.");
    expect(await screen.findByRole("status")).toHaveTextContent("The server recorded the physical handover");
    expect(screen.getByRole("status")).toHaveTextContent("Nov");
  });

  it("allows a confirmed handover without an optional internal note", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));
    await user.click(await screen.findByRole("button", { name: "Start handover confirmation for Blue tumbler" }));
    await user.click(screen.getByRole("checkbox", { name: /physically handed the property/ }));
    await user.click(screen.getByRole("button", { name: "Confirm physical handover" }));

    expect(apiMocks.confirmClaimHandover).toHaveBeenCalledWith("claim-waiting", undefined);
    expect(await screen.findByRole("status")).toHaveTextContent("The server recorded the physical handover");
  });

  it("cancels handover without a request and restores focus to its start control", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));
    const start = await screen.findByRole("button", { name: "Start handover confirmation for Blue tumbler" });
    await user.click(start);
    await user.click(screen.getByRole("button", { name: "Cancel handover confirmation" }));

    expect(apiMocks.confirmClaimHandover).not.toHaveBeenCalled();
    expect(screen.queryByRole("checkbox", { name: /physically handed the property/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start handover confirmation for Blue tumbler" })).toHaveFocus();
  });

  it("does not show completion after an API conflict and preserves the confirmation draft", async () => {
    apiMocks.confirmClaimHandover.mockRejectedValueOnce(new Error("Reservation is no longer active"));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));
    await user.click(await screen.findByRole("button", { name: "Start handover confirmation for Blue tumbler" }));
    const checkbox = screen.getByRole("checkbox", { name: /physically handed the property/ });
    await user.click(checkbox);
    const note = screen.getByRole("textbox", { name: "Internal note (optional)" });
    await user.type(note, "Check current reservation.");
    await user.click(screen.getByRole("button", { name: "Confirm physical handover" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Reservation is no longer active");
    expect(checkbox).toBeChecked();
    expect(note).toHaveValue("Check current reservation.");
    expect(screen.queryByText("Handover completed")).not.toBeInTheDocument();
  });

  it("does not label a handover completed without canonical server evidence", async () => {
    apiMocks.confirmClaimHandover.mockResolvedValueOnce({ ...waitingClaim, approvedWorkflowStatus: "awaiting_handover", handoverAt: undefined });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Awaiting handover" }));
    await user.click(await screen.findByRole("button", { name: "Start handover confirmation for Blue tumbler" }));
    await user.click(screen.getByRole("checkbox", { name: /physically handed the property/ }));
    await user.click(screen.getByRole("button", { name: "Confirm physical handover" }));

    expect(await screen.findByRole("status")).toHaveTextContent("did not include canonical completed-handover evidence");
    expect(screen.queryByText("Handover completed")).not.toBeInTheDocument();
  });

  it.each(["completed", "legacy"] as const)("does not show handover controls in the %s queue", async (queue) => {
    const completedClaim: ApiReviewClaim = { ...waitingClaim, status: "approved", approvedWorkflowStatus: "completed", handoverAt: "2026-11-21T08:00:00.000Z" };
    const legacyClaim: ApiReviewClaim = { ...waitingClaim, item: null, status: "approved", approvedWorkflowStatus: "legacy", handoverAt: undefined };
    apiMocks.fetchClaimsForReviewPage.mockImplementation((selected: string) => Promise.resolve(
      page(selected === "completed" ? [completedClaim] : selected === "legacy" ? [legacyClaim] : []),
    ));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: queue === "completed" ? "Completed handovers" : "Legacy cases" }));

    expect(await screen.findByRole("heading", { name: queue === "legacy" ? "Ownership Claim" : "Blue tumbler" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /handover confirmation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm physical handover" })).not.toBeInTheDocument();
    if (queue === "legacy") expect(screen.getByText(/Physical return must not be assumed/)).toBeInTheDocument();
    if (queue === "completed") expect(screen.getByText(/Recorded on/)).toBeInTheDocument();
  });
});

describe("StaffClaimsPage custody verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchClaimsForReviewPage.mockImplementation((queue: string) => Promise.resolve(page(queue === "awaiting_handover" ? [waitingClaim] : [])));
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page([]));
    apiMocks.confirmClaimHandover.mockResolvedValue({});
    apiMocks.confirmItemCustody.mockImplementation(async (id: string) => ({ ...foundItem, id, custodyStatus: "security_confirmed" }));
    apiMocks.updateClaimStatus.mockResolvedValue({});
    apiMocks.updatePickupInstructions.mockResolvedValue({});
  });

  it("distinguishes reporter-supplied, staff-confirmed, and unknown custody", async () => {
    const items: ApiItem[] = [
      { ...foundItem, id: "finder", title: "Finder item", custodyStatus: "finder_reported" },
      { ...foundItem, id: "reported", title: "Reported item", custodyStatus: "security_reported" },
      { ...foundItem, id: "confirmed", title: "Confirmed item", custodyStatus: "security_confirmed" },
      { ...foundItem, id: "unknown", title: "Unknown item", custodyStatus: null },
    ];
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page(items));
    renderPage();

    expect(await screen.findByText("Finder reports holding the property")).toBeInTheDocument();
    expect(screen.getByText("Reporter says it was turned over to security")).toBeInTheDocument();
    expect(screen.getByText("Campus security custody confirmed")).toBeInTheDocument();
    expect(screen.getByText("Custody information not established")).toBeInTheDocument();
    expect(screen.getByText(/This is reporter-supplied information and still requires staff verification/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Unknown item" })).toHaveAttribute("href", "/items/unknown");
    expect(screen.queryByRole("button", { name: "Verify custody for Confirmed item" })).not.toBeInTheDocument();
  });

  it("requires physical custody acknowledgement and calls the existing API for the selected Item", async () => {
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page([{ ...foundItem, title: "Key set" }]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Verify custody for Key set" }));
    const checkbox = screen.getByRole("checkbox", { name: "I have physically verified that this property is in campus security custody." });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveFocus();
    const confirm = screen.getByRole("button", { name: "Confirm campus security custody" });
    expect(confirm).toBeDisabled();
    expect(apiMocks.confirmItemCustody).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(apiMocks.confirmItemCustody).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Verify custody for Key set" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Verify custody for Key set" }));
    await user.click(screen.getByRole("checkbox", { name: "I have physically verified that this property is in campus security custody." }));
    await user.click(screen.getByRole("button", { name: "Confirm campus security custody" }));
    expect(apiMocks.confirmItemCustody).toHaveBeenCalledWith("item-1");
    expect(await screen.findByRole("status")).toHaveTextContent("The server confirmed campus security custody.");
  });

  it("handles custody conflicts without showing a verified state", async () => {
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page([{ ...foundItem, title: "Key set" }]));
    apiMocks.confirmItemCustody.mockRejectedValueOnce(new Error("Item is archived"));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Verify custody for Key set" }));
    await user.click(screen.getByRole("checkbox", { name: "I have physically verified that this property is in campus security custody." }));
    await user.click(screen.getByRole("button", { name: "Confirm campus security custody" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Item is archived");
    expect(screen.queryByText(/server confirmed campus security custody/i)).not.toBeInTheDocument();
  });

  it("does not offer confirmation for archived or unrecognized report records", async () => {
    const unsupportedItem = { ...foundItem, id: "unknown-report", title: "Unknown report", reportType: "unknown", lifecycleStatus: "unknown" } as unknown as ApiItem;
    apiMocks.fetchItemsForCustodyReviewPage.mockResolvedValue(page([
      { ...foundItem, id: "archived", title: "Archived keys", archivedAt: "2026-11-20T00:00:00.000Z" },
      unsupportedItem,
    ]));
    renderPage();

    expect(await screen.findByText(/This report is archived and cannot be confirmed/)).toBeInTheDocument();
    expect(screen.getByText(/does not identify an eligible found report/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Verify custody for Archived keys/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Verify custody for Unknown report/ })).not.toBeInTheDocument();
  });
});
