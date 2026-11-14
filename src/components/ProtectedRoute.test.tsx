import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import useAuthStore from "../store/authStore";
import ProtectedRoute from "./ProtectedRoute";

describe("ProtectedRoute session expiration", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: "valid-session-token",
      userId: "student-1",
      userName: "Student",
      userRole: "student",
    });
  });

  afterEach(async () => {
    useAuthStore.getState().logout();
    await useAuthStore.persist.clearStorage();
  });

  it("redirects to login when an authenticated request clears the session", async () => {
    render(
      <MemoryRouter initialEntries={["/claims"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/claims" element={<p>Protected claims</p>} />
          </Route>
          <Route path="/login" element={<p>Login screen</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected claims")).toBeInTheDocument();

    act(() => useAuthStore.getState().logout());

    await waitFor(() => {
      expect(screen.getByText("Login screen")).toBeInTheDocument();
    });
  });
});
