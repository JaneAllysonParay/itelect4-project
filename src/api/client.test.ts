import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "../store/authStore";
import { fetchClaims, fetchItems, loginUser } from "./client";

function setSignedInSession(): void {
  useAuthStore.setState({
    token: "valid-session-token",
    userId: "student-1",
    userName: "Student",
    userRole: "student",
  });
}

function jsonResponse(status: number): Response {
  return new Response(JSON.stringify({ message: "Request rejected" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API authentication failures", () => {
  beforeEach(() => {
    setSignedInSession();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    useAuthStore.getState().logout();
    await useAuthStore.persist.clearStorage();
  });

  it("clears the session after a protected request receives 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

    await expect(fetchClaims()).rejects.toThrow("Request rejected");

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().userRole).toBeNull();
  });

  it("keeps the session when a public request receives 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

    await expect(fetchItems()).rejects.toThrow("Request rejected");

    expect(useAuthStore.getState().token).toBe("valid-session-token");
  });

  it("does not clear an existing session when login credentials are rejected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));

    await expect(
      loginUser({ email: "wrong@example.edu", password: "wrong-password" }),
    ).rejects.toThrow("Request rejected");

    expect(useAuthStore.getState().token).toBe("valid-session-token");
  });

  it("keeps the session after a protected request receives 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(403)));

    await expect(fetchClaims()).rejects.toThrow("Request rejected");

    expect(useAuthStore.getState().token).toBe("valid-session-token");
  });

  it("keeps the session after a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(fetchClaims()).rejects.toThrow("offline");

    expect(useAuthStore.getState().token).toBe("valid-session-token");
  });
});
