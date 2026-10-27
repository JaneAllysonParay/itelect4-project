import type {
  AiItemReportReview,
  ApiClaim,
  ApiItem,
  ApiUser,
  ClaimDecisionStatus,
  AuthReply,
  NewClaim,
  NewItem,
  ItemUpdate,
} from "../types/index";
import useAuthStore from "../store/authStore";

export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "VITE_API_URL is missing. Copy .env.example to .env, fill it in, and restart npm run dev.",
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchItems(): Promise<ApiItem[]> {
  return request<ApiItem[]>("/api/items");
}

export function fetchItemById(id: string): Promise<ApiItem> {
  return request<ApiItem>(`/api/items/${id}`);
}

export function createItem(newItem: NewItem): Promise<ApiItem> {
  return request<ApiItem>("/api/items", {
    method: "POST",
    body: JSON.stringify(newItem),
  });
}

export function updateItem(id: string, updates: ItemUpdate): Promise<ApiItem> {
  return request<ApiItem>(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteItem(id: string): Promise<void> {
  return request<void>(`/api/items/${id}`, {
    method: "DELETE",
  });
}

export function fetchClaims(): Promise<ApiClaim[]> {
  return request<ApiClaim[]>("/api/claims");
}

export function fetchReceivedClaims(): Promise<ApiClaim[]> {
  return request<ApiClaim[]>("/api/claims/received");
}

export function updateClaimStatus(
  id: string,
  status: ClaimDecisionStatus,
): Promise<ApiClaim> {
  return request<ApiClaim>(`/api/claims/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function askAi(prompt: string): Promise<AiItemReportReview> {
  return request<AiItemReportReview>("/api/ai", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function createClaim(newClaim: NewClaim): Promise<ApiClaim> {
  return request<ApiClaim>("/api/claims", {
    method: "POST",
    body: JSON.stringify(newClaim),
  });
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
