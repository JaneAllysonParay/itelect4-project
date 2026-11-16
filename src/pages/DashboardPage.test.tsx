import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import DashboardPage from "./DashboardPage";
import useAuthStore from "../store/authStore";

function renderDashboard() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>);
}

describe("campus dashboard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ token: null, userId: null, userName: null, userRole: null });
  });

  it("welcomes guests with public browsing and sign-in reporting actions", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { level: 1, name: "A clear path from lost to found." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse reports" })).toHaveAttribute("href", "/items");
    expect(screen.getByRole("link", { name: "Sign in to report an item" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /Create an account/ })).toHaveAttribute("href", "/register");
    expect(screen.getByText("You are browsing as a guest. Sign in or create an account to report items and manage Claims.")).toBeInTheDocument();
  });

  it("prioritizes My Reports and My Claims for a signed-in student", () => {
    useAuthStore.setState({ token: "student-token", userId: "student-1", userName: "Jane", userRole: "student" });
    renderDashboard();

    expect(screen.getByRole("heading", { level: 1, name: "Welcome back, Jane." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /My Reports/ })).toHaveAttribute("href", "/my-reports");
    expect(screen.getByRole("link", { name: /My Claims/ })).toHaveAttribute("href", "/my-claims");
    expect(screen.getByRole("link", { name: /Claims workflow/ })).toHaveAttribute("href", "/claims");
    expect(screen.getByRole("link", { name: /AI Report Review/ })).toHaveAttribute("href", "/review");
    expect(screen.queryByRole("link", { name: /Staff Claim review/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/User ID/)).not.toBeInTheDocument();
  });

  it("shows staff shortcuts only to security and admin roles", () => {
    useAuthStore.setState({ token: "staff-token", userId: "staff-1", userName: "Campus staff", userRole: "security" });
    const { rerender } = renderDashboard();

    expect(screen.getByRole("link", { name: /Staff Claim review/ })).toHaveAttribute("href", "/staff/claims");

    useAuthStore.setState({ token: "student-token", userId: "student-1", userName: "Alex", userRole: "student" });
    rerender(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: /Staff Claim review/ })).not.toBeInTheDocument();
  });

  it("explains that Claim approval and physical handover are separate", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { name: "How a Claim works" })).toBeInTheDocument();
    expect(screen.getByText("Approval reserves an item for an approved Claim; it does not mean the item has already been handed over.")).toBeInTheDocument();
    expect(screen.getByText("After approval, coordinate pickup. The report is returned only when handover is confirmed.")).toBeInTheDocument();
  });

  it("keeps the session details disclosure keyboard and screen-reader friendly", () => {
    renderDashboard();
    const disclosure = screen.getByRole("button", { name: "Show session details" });

    fireEvent.click(disclosure);

    expect(screen.getByRole("button", { name: "Hide session details" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/You are browsing as a guest/)).toBeVisible();
  });
});
