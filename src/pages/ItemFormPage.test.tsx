import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import ItemFormPage from "./ItemFormPage";

afterEach(() => vi.restoreAllMocks());

describe("ItemFormPage", () => {
  it("does not send a request when the create form is invalid", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/items/new"]}>
          <Routes>
            <Route path="/items/new" element={<ItemFormPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Create item" }));

    expect(await screen.findByText("Title must be at least 2 characters.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
