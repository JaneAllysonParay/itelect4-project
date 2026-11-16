import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiItem } from "../types/index";
import useAuthStore from "../store/authStore";
import ItemDetailPage from "./ItemDetailPage";

const apiMocks = vi.hoisted(() => ({
  deleteItem: vi.fn(),
  fetchItemById: vi.fn(),
  fetchMyItemById: vi.fn(),
}));

vi.mock("../api/client", () => apiMocks);

function renderItemDetailPage(item: ApiItem) {
  useAuthStore.setState({
    token: "test-token",
    userId: "owner-1",
    userName: "Owner",
    userRole: "student",
  });
  apiMocks.fetchItemById.mockResolvedValue(item);
  apiMocks.fetchMyItemById.mockResolvedValue({ ...item, hasActiveClaims: false, canArchive: item.canArchive ?? false });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/items/${item.id}`]}>
        <Routes>
          <Route path="/items/:id" element={<ItemDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Item detail edit controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const item: ApiItem = {
    id: "item-1",
    title: "Blue tumbler",
    description: "Blue tumbler with a silver lid",
    location: "Library",
    dateReported: "2026-11-14T00:00:00.000Z",
    status: "found",
    ownerId: "owner-1",
  };

  it("hides the edit flow for a claimed item owned by the signed-in user", async () => {
    renderItemDetailPage({ ...item, status: "claimed", reportType: "found", lifecycleStatus: "reserved" });

    expect(
      await screen.findByText("Reports that have left the open state can no longer be edited."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit item" })).not.toBeInTheDocument();
  });

  it("keeps the edit flow for an unclaimed item owned by the signed-in user", async () => {
    renderItemDetailPage(item);

    expect(await screen.findByRole("link", { name: "Edit item" })).toHaveAttribute(
      "href",
      "/items/item-1/edit",
    );
  });

  it("offers archival for a returned report after verified handover", async () => {
    const returned: ApiItem = {
      ...item,
      status: "claimed",
      reportType: "found",
      lifecycleStatus: "returned",
      handoverAt: "2026-11-14T08:00:00.000Z",
      canArchive: true,
    };
    apiMocks.fetchItemById.mockResolvedValue(returned);
    apiMocks.fetchMyItemById.mockResolvedValue({ ...returned, hasActiveClaims: false, canArchive: true });
    renderItemDetailPage(returned);

    expect(await screen.findByRole("button", { name: "Archive item" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit item" })).not.toBeInTheDocument();
  });

  it("presents a partial canonical record as unavailable and blocks actions", async () => {
    const partial: ApiItem = {
      ...item,
      reportType: "found",
      canArchive: false,
    };
    renderItemDetailPage(partial);

    expect(await screen.findAllByText("Historical report · type unknown")).toHaveLength(1);
    expect(screen.getAllByText("Unavailable · historical status unknown")).toHaveLength(1);
    expect(screen.getByText(/incomplete or inconsistent/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Submit a Claim" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive item" })).not.toBeInTheDocument();
  });
});
