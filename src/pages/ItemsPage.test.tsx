import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ItemsPage from "./ItemsPage";
import { fetchItemsPage } from "../api/client";
import useAuthStore from "../store/authStore";

vi.mock("../api/client", () => ({
  API_URL: "http://localhost:4000",
  fetchItemsPage: vi.fn(),
}));

const mockedFetchItems = vi.mocked(fetchItemsPage);

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
    useAuthStore.setState({ token: null, userId: null, userName: null });
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
