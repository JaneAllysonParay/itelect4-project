import type {
  AiItemReportReview,
  ApiClaim,
  ApiMyClaim,
  ApiItem,
  ApiReceivedClaim,
  ApiReviewClaim,
  ApiUser,
  ApiPage,
  ClaimDecisionStatus,
  AuthReply,
  NewClaim,
  NewItem,
  ItemUpdate,
  ItemListFilters,
} from "../types/index";
import useAuthStore from "../store/authStore";

export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "VITE_API_URL is missing. Copy .env.example to .env, fill it in, and restart npm run dev.",
  );
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  authenticatedRequest = false,
): Promise<T> {
  const response = await sendRequest(path, init, authenticatedRequest);
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

async function sendRequest(
  path: string,
  init: RequestInit,
  authenticatedRequest: boolean,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = useAuthStore.getState().token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && authenticatedRequest) {
      useAuthStore.getState().logout();
    }

    let message = `Request failed (${response.status})`;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
      ) {
        message = body.message;
      }
    } catch {
      // Keep the status-based fallback when the response has no JSON body.
    }
    throw new Error(message);
  }

  return response;
}

function paginationNumber(value: string | null, allowZero = false): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= (allowZero ? 0 : 1) ? parsed : undefined;
}

async function requestPage<T>(
  path: string,
  requestedPage: number,
  requestedPageSize: number,
  authenticatedRequest = false,
): Promise<ApiPage<T>> {
  const response = await sendRequest(path, {}, authenticatedRequest);
  const data = await response.json() as T[];
  const page = paginationNumber(response.headers.get("X-Page")) ?? requestedPage;
  const pageSize = paginationNumber(response.headers.get("X-Page-Size")) ?? requestedPageSize;
  const totalCount = paginationNumber(response.headers.get("X-Total-Count"), true) ?? null;
  const hasMoreHeader = response.headers.get("X-Has-More")?.toLowerCase();
  const hasMore = hasMoreHeader === "true"
    ? true
    : hasMoreHeader === "false"
      ? false
      : totalCount !== null && page * pageSize < totalCount;
  return { data, page, pageSize, totalCount, hasMore };
}

function filtersToQuery(filters: ItemListFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function fetchItems(filters: ItemListFilters = {}): Promise<ApiItem[]> {
  return request<ApiItem[]>(`/api/items${filtersToQuery(filters)}`);
}

export function fetchItemsPage(filters: ItemListFilters = {}): Promise<ApiPage<ApiItem>> {
  return requestPage<ApiItem>(`/api/items${filtersToQuery(filters)}`, filters.page ?? 1, filters.limit ?? 20);
}

export function fetchMyItems(filters: ItemListFilters = {}): Promise<ApiItem[]> {
  return request<ApiItem[]>(`/api/items/mine${filtersToQuery(filters)}`, {}, true);
}

export function fetchMyItemsPage(filters: ItemListFilters = {}): Promise<ApiPage<ApiItem>> {
  return requestPage<ApiItem>(`/api/items/mine${filtersToQuery(filters)}`, filters.page ?? 1, filters.limit ?? 20, true);
}

export function fetchItemsForCustodyReview(): Promise<ApiItem[]> {
  return request<ApiItem[]>("/api/items/staff/custody", {}, true);
}

export function fetchItemsForCustodyReviewPage(page = 1, limit = 20): Promise<ApiPage<ApiItem>> {
  return requestPage<ApiItem>(`/api/items/staff/custody${filtersToQuery({ page, limit })}`, page, limit, true);
}

export function fetchItemById(id: string): Promise<ApiItem> {
  return request<ApiItem>(`/api/items/${id}`);
}

export function fetchMyItemById(id: string): Promise<ApiItem> {
  return request<ApiItem>(`/api/items/mine/${id}`, {}, true);
}

export function createItem(newItem: NewItem): Promise<ApiItem> {
  return request<ApiItem>("/api/items", {
    method: "POST",
    body: JSON.stringify(newItem),
  }, true);
}

export function updateItem(id: string, updates: ItemUpdate): Promise<ApiItem> {
  return request<ApiItem>(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  }, true);
}

export function deleteItem(id: string): Promise<void> {
  return request<void>(`/api/items/${id}`, {
    method: "DELETE",
  }, true);
}

export function resolveItem(id: string): Promise<ApiItem> {
  return request<ApiItem>(`/api/items/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ confirmed: true }),
  }, true);
}

export function confirmItemCustody(id: string): Promise<ApiItem> {
  return request<ApiItem>(`/api/items/${id}/custody/confirm`, { method: "POST" }, true);
}

export function fetchClaims(): Promise<ApiMyClaim[]> {
  return request<ApiMyClaim[]>("/api/claims", {}, true);
}

export function fetchClaimsPage(page = 1, limit = 20): Promise<ApiPage<ApiMyClaim>> {
  return requestPage<ApiMyClaim>(`/api/claims${filtersToQuery({ page, limit })}`, page, limit, true);
}

export function fetchReceivedClaims(): Promise<ApiReceivedClaim[]> {
  return request<ApiReceivedClaim[]>("/api/claims/received", {}, true);
}

export function fetchReceivedClaimsPage(page = 1, limit = 20): Promise<ApiPage<ApiReceivedClaim>> {
  return requestPage<ApiReceivedClaim>(`/api/claims/received${filtersToQuery({ page, limit })}`, page, limit, true);
}

export function fetchClaimsForReview(queue: "pending" | "awaiting_handover" | "completed" | "rejected" | "legacy" = "pending"): Promise<ApiReviewClaim[]> {
  return request<ApiReviewClaim[]>(`/api/claims/review?queue=${queue}`, {}, true);
}

export function fetchClaimsForReviewPage(
  queue: "pending" | "awaiting_handover" | "completed" | "rejected" | "legacy" = "pending",
  page = 1,
  limit = 20,
): Promise<ApiPage<ApiReviewClaim>> {
  const params = new URLSearchParams({ queue, page: String(page), limit: String(limit) });
  return requestPage<ApiReviewClaim>(`/api/claims/review?${params.toString()}`, page, limit, true);
}

export function updateClaimStatus(
  id: string,
  status: ClaimDecisionStatus,
): Promise<ApiClaim> {
  return request<ApiClaim>(`/api/claims/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, true);
}

export function confirmClaimHandover(id: string, internalNote?: string): Promise<ApiReviewClaim> {
  return request<ApiReviewClaim>(`/api/claims/${id}/handover`, {
    method: "POST",
    body: JSON.stringify({ confirmed: true, internalNote }),
  }, true);
}

export function updatePickupInstructions(id: string, pickupInstructions: string): Promise<ApiReviewClaim> {
  return request<ApiReviewClaim>(`/api/claims/${id}/pickup-instructions`, {
    method: "PATCH",
    body: JSON.stringify({ pickupInstructions }),
  }, true);
}

export function askAi(prompt: string): Promise<AiItemReportReview> {
  return request<AiItemReportReview>("/api/ai", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  }, true);
}

export function createClaim(newClaim: NewClaim): Promise<ApiClaim> {
  return request<ApiClaim>("/api/claims", {
    method: "POST",
    body: JSON.stringify(newClaim),
  }, true);
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export function registerUser(
  credentials: RegisterCredentials,
): Promise<ApiUser> {
  return request<ApiUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function loginUser(credentials: LoginCredentials): Promise<AuthReply> {
  return request<AuthReply>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
