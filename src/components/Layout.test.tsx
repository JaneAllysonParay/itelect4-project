import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import Layout from "./Layout";
import useAuthStore from "../store/authStore";
import useUiStore from "../store/uiStore";

function renderLayout(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<p>Dashboard route content</p>} />
          <Route path="items" element={<p>Reports route content</p>} />
          <Route path="staff/claims" element={<p>Staff review content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("responsive application navigation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ token: null, userId: null, userName: null, userRole: null });
    useUiStore.setState({ isDarkMode: false });
  });

  it("shows public navigation and authentication actions to guests", () => {
    renderLayout();

    const primaryNavigation = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    expect(primaryNavigation.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(primaryNavigation.getByRole("link", { name: "Browse reports" })).toHaveAttribute("href", "/items");
    expect(primaryNavigation.queryByRole("link", { name: "Staff Claim review" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register");
    expect(screen.queryByRole("link", { name: "Report lost" })).not.toBeInTheDocument();
  });

  it("shows student report and Claim routes without staff-only review", () => {
    useAuthStore.setState({ token: "student-token", userId: "student-1", userName: "Jane", userRole: "student" });
    renderLayout();

    const primaryNavigation = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    expect(primaryNavigation.getByRole("link", { name: "Browse reports" })).toBeInTheDocument();
    expect(primaryNavigation.getByRole("link", { name: "My Reports" })).toHaveAttribute("href", "/my-reports");
    expect(primaryNavigation.getByRole("link", { name: "My Claims" })).toHaveAttribute("href", "/my-claims");
    expect(primaryNavigation.getByRole("link", { name: "Claims" })).toHaveAttribute("href", "/claims");
    expect(primaryNavigation.getByRole("link", { name: "AI Report Review" })).toHaveAttribute("href", "/review");
    expect(primaryNavigation.queryByRole("link", { name: "Staff Claim review" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Report lost" })).toHaveAttribute("href", "/report/lost");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it.each(["security", "admin"] as const)("shows staff review to %s accounts", (role) => {
    useAuthStore.setState({ token: "staff-token", userId: "staff-1", userName: "Campus staff", userRole: role });
    renderLayout();

    expect(within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("link", { name: "Staff Claim review" })).toHaveAttribute("href", "/staff/claims");
  });

  it("opens the mobile menu, closes with Escape, and returns focus to its toggle", () => {
    renderLayout();
    const menuButton = screen.getByRole("button", { name: "Open navigation menu" });

    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(within(screen.getByRole("navigation", { name: "Mobile navigation" })).getByRole("link", { name: "Browse reports" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the mobile menu after following a link", () => {
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    fireEvent.click(within(screen.getByRole("navigation", { name: "Mobile navigation" })).getByRole("link", { name: "Browse reports" }));

    expect(screen.getByText("Reports route content")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("closes the mobile menu after navigating through the brand link", () => {
    renderLayout("/items");
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    fireEvent.click(screen.getByRole("link", { name: "Campus Lost and Found Tracker home" }));

    expect(screen.getByText("Dashboard route content")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("toggles the theme and keeps the preference in local storage", () => {
    const { container } = renderLayout();
    const themeButton = screen.getByRole("button", { name: "Switch to dark theme" });

    fireEvent.click(themeButton);

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toHaveAttribute("aria-pressed", "true");
    expect(container.firstElementChild).toHaveClass("dark");
    expect(JSON.parse(window.localStorage.getItem("itelect4-ui") ?? "{}").state.isDarkMode).toBe(true);
  });
});
