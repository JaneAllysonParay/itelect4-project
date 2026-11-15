import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "../store/authStore";
import { fetchClaims, fetchItems, fetchItemsPage, loginUser } from "./client";

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

describe("authoritative pagination headers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    { total: 0, page: 1, length: 0, more: false },
    { total: 1, page: 1, length: 1, more: false },
    { total: 19, page: 1, length: 19, more: false },
    { total: 20, page: 1, length: 20, more: false },
    { total: 21, page: 1, length: 20, more: true },
    { total: 40, page: 1, length: 20, more: true },
    { total: 40, page: 2, length: 20, more: false },
    { total: 21, page: 2, length: 1, more: false },
  ])("uses server metadata for $total records on page $page", async ({ total, page, length, more }) => {
    const body = Array.from({ length }, (_, index) => ({ id: `item-${index}` }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Page": String(page),
        "X-Page-Size": "20",
        "X-Total-Count": String(total),
        "X-Has-More": String(more),
      },
    })));

    const result = await fetchItemsPage({ page, limit: 20 });
    expect(result).toMatchObject({ data: body, page, pageSize: 20, totalCount: total, hasMore: more });
  });

  it("falls back safely when pagination headers are missing or malformed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: "item-1" }]), {
      status: 200,
      headers: { "X-Page": "0", "X-Page-Size": "0", "X-Total-Count": "-1", "X-Has-More": "perhaps" },
    })));

    await expect(fetchItemsPage({ page: 3, limit: 20 })).resolves.toMatchObject({
      page: 3,
      pageSize: 20,
      totalCount: null,
      hasMore: false,
      data: [{ id: "item-1" }],
    });
  });
});
