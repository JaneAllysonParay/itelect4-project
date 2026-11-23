import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./RegisterPage";
import useAuthStore from "../store/authStore";

afterEach(() => vi.restoreAllMocks());
beforeEach(() => useAuthStore.getState().logout());

function renderRegisterPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/claims" element={<p>Claims workspace</p>} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RegisterPage", () => {
  it("validates required fields before sending a registration request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("registers, follows up with login, stores the returned student session, and navigates", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "student-1", name: "Jane Student", email: "jane@dlsl.edu.ph", role: "student", isActive: true }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "student-session", user: { id: "student-1", name: "Jane Student", email: "jane@dlsl.edu.ph", role: "student", isActive: true } }), { status: 200 }));
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText("Name"), "Jane Student");
    await user.type(screen.getByLabelText("Email"), "jane@dlsl.edu.ph");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Claims workspace")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("/api/auth/register");
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toEqual({ name: "Jane Student", email: "jane@dlsl.edu.ph", password: "correct-horse" });
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain("/api/auth/login");
    expect(JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body))).toEqual({ email: "jane@dlsl.edu.ph", password: "correct-horse" });
    expect(useAuthStore.getState()).toMatchObject({ token: "student-session", userId: "student-1", userRole: "student" });
  });

  it("shows server errors without attempting follow-up login", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "This email is already registered." }), { status: 409 }));
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText("Name"), "Jane Student");
    await user.type(screen.getByLabelText("Email"), "jane@dlsl.edu.ph");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This email is already registered.");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("links back to login", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByRole("link", { name: "Sign in" }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
