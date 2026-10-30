import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ItemsPage from "./ItemsPage";
import { fetchItems } from "../api/client";
import useAuthStore from "../store/authStore";

vi.mock("../api/client", () => ({
  API_URL: "http://localhost:4000",
  fetchItems: vi.fn(),
}));

const mockedFetchItems = vi.mocked(fetchItems);

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
    mockedFetchItems.mockReset().mockResolvedValue([]);
  });

  it("shows the create action for an authenticated session without a user ID", async () => {
    useAuthStore.setState({ token: "signed-in-token", userName: "Jane" });
    renderItemsPage();

    const createLink = await screen.findByRole("link", {
      name: "Report an item",
    });

    expect(createLink).toHaveAttribute("href", "/items/new");
  });

  it("hides the create action when signed out", async () => {
    renderItemsPage();

    expect(await screen.findByRole("heading", { name: "Items" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Report an item" }),
    ).not.toBeInTheDocument();
  });
});
