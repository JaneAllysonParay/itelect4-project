import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ItemsPage from "./ItemsPage";
import { fetchItemsPage } from "../api/client";
import useAuthStore from "../store/authStore";
import type { ApiItem, ApiPage } from "../types/index";

vi.mock("../api/client", () => ({
  API_URL: "http://localhost:4000",
  fetchItemsPage: vi.fn(),
}));

const mockedFetchItems = vi.mocked(fetchItemsPage);

function item(id: string, title = "Blue tumbler"): ApiItem {
  return {
    id,
    title,
    description: "A blue insulated tumbler with a silver lid.",
    location: "E-Library",
    status: "found",
    reportType: "found",
    lifecycleStatus: "open",
    ownerId: "someone-else",
    dateReported: "2026-11-14T00:00:00.000Z",
    eventAt: "2026-11-13T08:00:00.000Z",
    category: "electronics",
  };
}

function pageResult(page: number, items: ApiItem[], hasMore = false): ApiPage<ApiItem> {
  return { data: items, page, pageSize: 20, totalCount: items.length, hasMore };
}

function renderItemsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ItemsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ItemsPage creation access", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, userId: null, userName: null, userRole: null });
    mockedFetchItems.mockReset().mockResolvedValue({ data: [], page: 1, pageSize: 20, totalCount: 0, hasMore: false });
  });

  it("shows the create action for an authenticated session without a user ID", async () => {
    useAuthStore.setState({ token: "signed-in-token", userName: "Jane" });
    renderItemsPage();

    const createLink = await screen.findByRole("link", {
      name: "Report lost property",
    });

    expect(createLink).toHaveAttribute("href", "/report/lost");
    expect(screen.getByRole("link", { name: "Report found property" })).toHaveAttribute("href", "/report/found");
  });

  it("hides the create action when signed out", async () => {
    renderItemsPage();

    expect(await screen.findByRole("heading", { name: "Campus reports" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Report lost property" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer an extra page for an exact page-size multiple", async () => {
    mockedFetchItems.mockResolvedValue({ data: Array.from({ length: 20 }, (_, index) => ({
      id: `item-${index}`, title: `Item ${index}`, description: "A matching description", location: "Library",
      status: "found", reportType: "found", lifecycleStatus: "open", ownerId: "someone-else", dateReported: "2026-11-14T00:00:00.000Z",
    })), page: 1, pageSize: 20, totalCount: 20, hasMore: false });
    renderItemsPage();

    const next = await screen.findByRole("button", { name: "Next page" });
    expect(next).toBeDisabled();
    expect(mockedFetchItems).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
  });

  it("passes every browse filter to the existing server-side paginated API", async () => {
    renderItemsPage();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search reports" }), { target: { value: "blue tumbler" } });
    fireEvent.change(screen.getByLabelText("Report type"), { target: { value: "lost" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "electronics" } });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Library" } });
    fireEvent.change(screen.getByLabelText("Availability or status"), { target: { value: "reserved" } });
    fireEvent.change(screen.getByLabelText("Event from"), { target: { value: "2026-11-15T12:00" } });
    fireEvent.change(screen.getByLabelText("Event to"), { target: { value: "2026-11-16T12:00" } });

    await waitFor(() => expect(mockedFetchItems).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 1,
      limit: 20,
      q: "blue tumbler",
      reportType: "lost",
      category: "electronics",
      location: "Library",
      lifecycleStatus: "reserved",
      from: new Date("2026-11-15T12:00").toISOString(),
      to: new Date("2026-11-16T12:00").toISOString(),
    })));
    expect(screen.getByText(/^7 filters applied/)).toBeInTheDocument();
  });

  it("keeps advanced filters keyboard-operable and collapsible", () => {
    renderItemsPage();
    const summary = screen.getByText("Advanced filters");
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(true);

    fireEvent.click(summary);
    expect(details?.open).toBe(false);
    fireEvent.click(summary);
    expect(details?.open).toBe(true);
  });

  it("clears search and advanced filters with an accessible reset action", async () => {
    renderItemsPage();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search reports" }), { target: { value: "keys" } });
    fireEvent.change(screen.getByLabelText("Report type"), { target: { value: "found" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "keys" } });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Library" } });
    fireEvent.change(screen.getByLabelText("Availability or status"), { target: { value: "open" } });

    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(screen.getByRole("searchbox", { name: "Search reports" })).toHaveValue("");
    expect(screen.getByLabelText("Report type")).toHaveValue("");
    expect(screen.getByLabelText("Category")).toHaveValue("");
    expect(screen.getByLabelText("Location")).toHaveValue("");
    expect(screen.getByLabelText("Availability or status")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeDisabled();
  });

  it("uses the response page and hasMore metadata for pagination", async () => {
    mockedFetchItems.mockImplementation(({ page = 1 } = {}) => Promise.resolve(
      pageResult(page, [item(`item-${page}`, `Report page ${page}`)], page === 1),
    ));
    renderItemsPage();

    const nextPage = await screen.findByRole("button", { name: "Next page" });
    await waitFor(() => expect(nextPage).toBeEnabled());
    fireEvent.click(nextPage);

    await waitFor(() => expect(mockedFetchItems).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 20 })));
    expect(await screen.findByRole("link", { name: "View report: Report page 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByText("Page 2 · 1 matching report")).toBeInTheDocument();
  });

  it("shows announced loading and useful empty states", async () => {
    let resolveQuery: (value: ApiPage<ApiItem>) => void = () => undefined;
    mockedFetchItems.mockImplementation(() => new Promise((resolve) => { resolveQuery = resolve; }));
    renderItemsPage();

    expect(screen.getByRole("status")).toHaveTextContent("Loading reports...");
    await act(async () => resolveQuery(pageResult(1, [])));
    expect(await screen.findByRole("heading", { name: "No reports to browse yet" })).toBeInTheDocument();
    expect(screen.getByText("When campus members share a lost or found report, it will appear here.")).toBeInTheDocument();
  });

  it("announces an API error and keeps the filter controls available", async () => {
    mockedFetchItems.mockRejectedValue(new Error("Service temporarily unavailable"));
    renderItemsPage();

    expect(await screen.findByRole("heading", { name: "Reports could not be loaded" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Service temporarily unavailable");
    expect(screen.getByRole("searchbox", { name: "Search reports" })).toBeInTheDocument();
  });

  it("shows date validation without a loading state or sending an invalid range", async () => {
    renderItemsPage();
    await screen.findByRole("heading", { name: "Campus reports" });
    fireEvent.change(screen.getByLabelText("Event from"), { target: { value: "2026-11-15T12:00" } });
    await waitFor(() => expect(mockedFetchItems).toHaveBeenCalledTimes(2));
    const requestCount = mockedFetchItems.mock.calls.length;
    fireEvent.change(screen.getByLabelText("Event to"), { target: { value: "2026-11-14T12:00" } });

    expect(await screen.findByRole("alert")).toHaveTextContent("End date must be on or after the start date.");
    expect(screen.queryByText("Loading reports...")).not.toBeInTheDocument();
    expect(mockedFetchItems).toHaveBeenCalledTimes(requestCount);
    expect(screen.getByLabelText("Event from")).toHaveValue("2026-11-15T12:00");
    expect(screen.getByLabelText("Event to")).toHaveValue("2026-11-14T12:00");
  });
});
