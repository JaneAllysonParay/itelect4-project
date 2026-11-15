import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import ItemFormPage from "./ItemFormPage";
import useAuthStore from "../store/authStore";

afterEach(() => vi.restoreAllMocks());

function renderForm(path: string, route: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={<ItemFormPage />} />
          <Route path="/items/:id" element={<p>Item details</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ItemFormPage reporting flows", () => {
  it("keeps /items/new as a report-type selection page", () => {
    renderForm("/items/new", "/items/new");

    expect(screen.getByRole("heading", { name: "Choose a report" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Report lost property" })).toHaveAttribute("href", "/report/lost");
    expect(screen.getByRole("link", { name: "Report found property" })).toHaveAttribute("href", "/report/found");
  });

  it("validates a lost report before sending it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderForm("/report/lost", "/report/:reportType");

    expect(screen.getByRole("heading", { name: "Report lost property" })).toBeInTheDocument();
    expect(screen.getByLabelText("Last-seen campus location")).toBeInTheDocument();
    expect(screen.queryByLabelText("Current custody information")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(await screen.findByText("Title must be at least 2 characters.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks found reporters for custody information and explains it is unverified", () => {
    renderForm("/report/found", "/report/:reportType");

    expect(screen.getByRole("heading", { name: "Report found property" })).toBeInTheDocument();
    expect(screen.getByLabelText("Campus location where found")).toBeInTheDocument();
    expect(screen.getByLabelText("Current custody information")).toBeInTheDocument();
    expect(screen.getByText(/Only authorized staff can confirm/i)).toBeInTheDocument();
  });

  it("requires an event time and custody information for a new found report", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderForm("/report/found", "/report/:reportType");

    await user.type(screen.getByLabelText("Item title"), "Blue tumbler");
    await user.type(screen.getByLabelText("Safe public description"), "Blue tumbler with a silver lid");
    await user.type(screen.getByLabelText("Campus location where found"), "Library");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(await screen.findByText("Enter when the item was last seen or found.")).toBeInTheDocument();
    expect(screen.getByText("Select the current custody information.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    { reportType: "lost", route: "/report/lost", locationLabel: "Last-seen campus location", custody: undefined },
    { reportType: "found", route: "/report/found", locationLabel: "Campus location where found", custody: "security_reported" },
  ] as const)("submits a new $reportType report with its required fields", async ({ reportType, route, locationLabel, custody }) => {
    useAuthStore.setState({ token: "owner-token", userId: "owner-1", userName: "Owner", userRole: "student" });
    const savedItem = {
      id: "item-1", title: "Blue tumbler", description: "Blue tumbler with a silver lid", location: "Library",
      dateReported: "2026-11-14T08:00:00.000Z", eventAt: "2026-11-13T08:00:00.000Z", reportType,
      lifecycleStatus: "open", status: reportType, ownerId: "owner-1", archivedAt: null,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(savedItem), { status: 201 }));
    const user = userEvent.setup();
    renderForm(route, "/report/:reportType");

    await user.type(screen.getByLabelText("Item title"), "Blue tumbler");
    await user.type(screen.getByLabelText("Safe public description"), "Blue tumbler with a silver lid");
    await user.type(screen.getByLabelText(locationLabel), "Library");
    await user.type(screen.getByLabelText(reportType === "lost" ? "When was it last seen?" : "When was it found?"), "2026-11-13T08:00");
    if (custody) await user.selectOptions(screen.getByLabelText("Current custody information"), custody);
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/items"),
      expect.objectContaining({ method: "POST", body: expect.any(String) }),
    ));
    const postCall = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST");
    const body = JSON.parse(String(postCall?.[1]?.body)) as Record<string, unknown>;
    expect(body.reportType).toBe(reportType);
    expect(body.eventAt).toBe(new Date("2026-11-13T08:00").toISOString());
    expect(body.custodyStatus).toBe(custody);
  });

  it("preserves staff-confirmed custody while an owner edits another field", async () => {
    useAuthStore.setState({ token: "owner-token", userId: "owner-1", userName: "Owner", userRole: "student" });
    const confirmedItem = {
      id: "item-1", title: "Blue tumbler", description: "Blue tumbler with a silver lid", location: "Library",
      dateReported: "2026-11-14T00:00:00.000Z", eventAt: "2026-11-13T08:00:00.000Z", category: "other",
      reportType: "found", lifecycleStatus: "open", status: "found", ownerId: "owner-1", archivedAt: null,
      custodyStatus: "security_confirmed", custodyConfirmedAt: "2026-11-14T08:00:00.000Z",
      custodyConfirmedBy: "security-1", hasActiveClaims: false,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/items/item-1") && (!init?.method || init.method === "GET")) return new Response(JSON.stringify(confirmedItem), { status: 200 });
      if (url.endsWith("/api/items/mine/item-1")) return new Response(JSON.stringify(confirmedItem), { status: 200 });
      if (url.endsWith("/api/items/item-1") && init?.method === "PATCH") return new Response(JSON.stringify(confirmedItem), { status: 200 });
      return new Response(JSON.stringify({ message: "Unexpected request" }), { status: 500 });
    });
    const user = userEvent.setup();
    renderForm("/items/item-1/edit", "/items/:id/edit");

    expect(await screen.findByText("Campus staff verified this custody state. It is preserved while you edit other report details.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText("Item title")).toHaveValue("Blue tumbler");
      expect(screen.getByLabelText("Safe public description")).toHaveValue("Blue tumbler with a silver lid");
      expect(screen.getByLabelText("Campus location where found")).toHaveValue("Library");
      expect(screen.getByLabelText("When was it found?")).toHaveValue("2026-11-13T16:00");
    });
    expect(screen.queryByLabelText("Current custody information")).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Item title"));
    await user.type(screen.getByLabelText("Item title"), "Updated blue tumbler");
    expect(screen.getByLabelText("Item title")).toHaveValue("Updated blue tumbler");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/items/item-1"),
      expect.objectContaining({ method: "PATCH", body: expect.any(String) }),
    ));
    const patchCall = fetchSpy.mock.calls.find(([input, init]) => String(input).endsWith("/api/items/item-1") && init?.method === "PATCH");
    expect(patchCall).toBeDefined();
    const body = JSON.parse(String(patchCall?.[1]?.body)) as Record<string, unknown>;
    expect(body.title).toBe("Updated blue tumbler");
    expect(body.custodyStatus).toBeUndefined();
    expect(body.custodyConfirmedAt).toBeUndefined();
    expect(body.custodyConfirmedBy).toBeUndefined();
  });

  it("lets the report owner add missing reporter custody to an old found report", async () => {
    useAuthStore.setState({ token: "owner-token", userId: "owner-1", userName: "Owner", userRole: "student" });
    const legacyFoundItem = {
      id: "item-legacy", title: "Blue tumbler", description: "Blue tumbler with a silver lid", location: "Library",
      dateReported: "2026-11-14T08:00:00.000Z", eventAt: null, reportType: "found", lifecycleStatus: "open",
      status: "found", ownerId: "owner-1", archivedAt: null, custodyStatus: null, hasActiveClaims: false,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/items/item-legacy") && (!init?.method || init.method === "GET")) return new Response(JSON.stringify(legacyFoundItem), { status: 200 });
      if (url.endsWith("/api/items/item-legacy") && init?.method === "PATCH") {
        return new Response(JSON.stringify({ ...legacyFoundItem, custodyStatus: "finder_reported" }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: "Unexpected request" }), { status: 500 });
    });
    const user = userEvent.setup();
    renderForm("/items/item-legacy/edit", "/items/:id/edit");

    const custody = await screen.findByLabelText("Current custody information");
    await user.selectOptions(custody, "finder_reported");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/items/item-legacy"),
      expect.objectContaining({ method: "PATCH", body: expect.any(String) }),
    ));
    const patchCall = fetchSpy.mock.calls.find(([input, init]) => String(input).endsWith("/api/items/item-legacy") && init?.method === "PATCH");
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({ custodyStatus: "finder_reported" });
  });
});
