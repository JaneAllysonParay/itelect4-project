import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";
import useAuthStore from "../store/authStore";

afterEach(() => vi.restoreAllMocks());

beforeEach(() => useAuthStore.getState().logout());

function renderLoginPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/claims" element={<p>Claims workspace</p>} />
          <Route path="/register" element={<p>Registration page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  it("shows schema messages near the fields when the form is submitted empty", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", "email-error");
  });

  it("does not send credentials while the login form is invalid", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "jane@dlsl.edu.ph");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByText("At least 8 characters.")).toBeInTheDocument();
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stores the API session and follows the existing successful route", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      token: "session-token",
      user: { id: "student-1", name: "Jane Student", email: "jane@dlsl.edu.ph", role: "student", isActive: true },
    }), { status: 200 }));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "jane@dlsl.edu.ph");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByText("Claims workspace")).toBeInTheDocument();
    expect(useAuthStore.getState()).toMatchObject({ token: "session-token", userId: "student-1", userRole: "student" });
  });

  it("shows a readable server error and keeps the user on the form", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "Invalid credentials." }), { status: 401 }));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "jane@dlsl.edu.ph");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials.");
    expect(screen.getByLabelText("Password")).toHaveValue("correct-horse");
    expect(screen.queryByText("Claims workspace")).not.toBeInTheDocument();
  });

  it("disables duplicate submission while the request is pending", async () => {
    let finishRequest!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((resolve) => { finishRequest = resolve; }));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "jane@dlsl.edu.ph");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByRole("button", { name: "Signing in..." })).toBeDisabled();
    finishRequest(new Response(JSON.stringify({ token: "session-token", user: { id: "student-1", name: "Jane", email: "jane@dlsl.edu.ph", role: "student", isActive: true } }), { status: 200 }));
    await waitFor(() => expect(screen.getByText("Claims workspace")).toBeInTheDocument());
  });

  it("links to registration", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole("link", { name: "Create an account" }));

    expect(await screen.findByText("Registration page")).toBeInTheDocument();
  });
});
