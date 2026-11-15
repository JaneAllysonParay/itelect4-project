import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyReportsPage from "./MyReportsPage";

const apiMocks = vi.hoisted(() => ({ fetchMyItemsPage: vi.fn(), deleteItem: vi.fn(), resolveItem: vi.fn() }));
vi.mock("../api/client", () => apiMocks);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><MyReportsPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MyReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchMyItemsPage.mockResolvedValue({ data: [
      { id: "lost-1", title: "Lost keys", description: "Silver key ring", location: "Hall", dateReported: "2026-11-13T08:00:00.000Z", eventAt: "2026-11-12T08:00:00.000Z", reportType: "lost", lifecycleStatus: "open", status: "lost", ownerId: "student-1", archivedAt: null, hasActiveClaims: false, canArchive: true },
      { id: "reserved-1", title: "Found umbrella", description: "Navy umbrella", location: "Library", dateReported: "2026-11-10T08:00:00.000Z", eventAt: "2026-11-10T07:00:00.000Z", reportType: "found", lifecycleStatus: "reserved", status: "claimed", ownerId: "student-1", archivedAt: null, hasActiveClaims: true, canArchive: false },
      { id: "archived-1", title: "Archived notebook", description: "Blue notebook", location: "Hall", dateReported: "2026-11-09T08:00:00.000Z", reportType: "lost", lifecycleStatus: "resolved", status: "lost", ownerId: "student-1", archivedAt: "2026-11-10T00:00:00.000Z", hasActiveClaims: false, canArchive: false },
      { id: "returned-1", title: "Returned umbrella", description: "Green umbrella", location: "Quad", dateReported: "2026-11-08T08:00:00.000Z", reportType: "found", lifecycleStatus: "returned", status: "claimed", ownerId: "student-1", archivedAt: null, handoverAt: "2026-11-09T08:00:00.000Z", hasActiveClaims: false, canArchive: true },
    ], page: 1, pageSize: 20, totalCount: 4, hasMore: false });
    apiMocks.resolveItem.mockResolvedValue({});
    apiMocks.deleteItem.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows owned report state and offers resolution only for an open lost report", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "My Reports" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Lost keys" })).toBeInTheDocument();
    expect(screen.getAllByText("Date reported:").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "I recovered this item" })).toBeInTheDocument();
    expect(screen.getByText(/Editing and archiving are paused/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Edit report" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Edit report" })).toHaveAttribute("href", "/items/lost-1/edit");
    expect(screen.queryByRole("link", { name: "Archived notebook" })).not.toBeInTheDocument();
    expect(screen.getByText("Archived notebook")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Archive report" })).toHaveLength(2);
    expect(screen.getByText(/This Claim is historical, so the report may be archived/i)).toBeInTheDocument();
  });

  it("records a reporter resolution after explicit recovery confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "I recovered this item" }));
    expect(apiMocks.resolveItem).toHaveBeenCalledWith("lost-1");
  });

  it("hides archival when a returned Item has no verified matching Claim record", async () => {
    apiMocks.fetchMyItemsPage.mockResolvedValue({ data: [
      { id: "returned-unknown", title: "Returned umbrella", description: "Green umbrella", location: "Quad", dateReported: "2026-11-08T08:00:00.000Z", reportType: "found", lifecycleStatus: "returned", status: "claimed", ownerId: "student-1", archivedAt: null, handoverAt: "2026-11-09T08:00:00.000Z", hasActiveClaims: false, canArchive: false },
    ], page: 1, pageSize: 20, totalCount: 1, hasMore: false });
    renderPage();

    expect(await screen.findByText(/Claim and handover records need staff reconciliation before archival/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive report" })).not.toBeInTheDocument();
  });
});
