// ===== INTERFACES =====

export interface User {
  id: number;
  name: string;
  email: string;
  role: "student" | "security" | "admin";
  isActive: boolean;
}

export interface Item {
  id: number;
  title: string;
  description: string;
  location: string;
  dateReported: Date;
  reportType?: "lost" | "found";
  lifecycleStatus?: "open" | "reserved" | "returned" | "resolved";
  eventAt?: Date | null;
  category?: ItemCategory | null;
  custodyStatus?: CustodyStatus | null;
  status: "lost" | "found" | "claimed";
  ownerId: number;
  archivedAt?: Date | null;
}

export type ItemCategory =
  | "electronics"
  | "clothing"
  | "bags"
  | "keys"
  | "documents"
  | "accessories"
  | "other";

export type ReportType = "lost" | "found";
export type LifecycleStatus = "open" | "reserved" | "returned" | "resolved";
export type CustodyStatus = "finder_reported" | "security_reported" | "security_confirmed";

export interface Claim {
  id: number;
  itemId: number;
  claimantId: number;
  claimDate: Date;
  status: "pending" | "approved" | "rejected";
  proof: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  decisionSource?: "staff" | "system";
  decisionReason?: string;
  decisionAt?: Date;
  handoverAt?: Date;
  handoverBy?: string;
  pickupInstructions?: string;
}

export type UserRoleName = User["role"];

// Partial<T> -- every field becomes optional
export type UserUpdate = Partial<User>;

// Pick<T, K> -- keep ONLY the listed fields
export type UserPreview = Pick<User, "id" | "name" | "role">;

// Omit<T, K> -- remove specific fields
export type PublicUser = Omit<User, "email" | "isActive">;

// Record<K, T> -- fixed keys mapped to one type
export type UserCount = Record<"student" | "security" | "admin", number>;

// ===== ENUMS =====

export enum ClaimStatus {
  Pending,
  Approved,
  Rejected,
}

export const enum UserRole {
  Student = "student",
  Security = "security",
  Admin = "admin",
}

// ===== TYPE ALIASES =====

export type ID = string | number;

export type Location = {
  building: string;
  room: string;
};

export type DateFormatter = (date: Date) => string;

const itemId: ID = "LF-2026-001";

const itemLocation: Location = {
  building: "Sen. Jose Diokno Building",
  room: "E-Library",
};

console.log(itemLocation);

const formatDate: DateFormatter = (date) => date.toLocaleDateString();

console.log(itemId);
console.log(formatDate(new Date()));

// ===== UNION TYPES =====

export type StringOrNumber = string | number;

export type ItemStatus = "lost" | "found" | "claimed";

export function printId(id: StringOrNumber): void {
  console.log(`ID: ${id}`);
}

printId(101);
printId("LF-2026-001");

// ===== INTERSECTION TYPES =====

export type ItemWithOwner = Item & {
  owner: User;
  claimCount: number;
};

const lostItem: ItemWithOwner = {
  id: 1,
  title: "Blue Tumbler",
  description: "1 Liter Blue Tumbler",
  location: "E-Library",
  dateReported: new Date(),
  status: "lost",
  ownerId: 1,

  owner: {
    id: 1,
    name: "Alex Example",
    email: "alex.example@example.invalid",
    role: "student",
    isActive: true,
  },

  claimCount: 2,
};

console.log(lostItem);

// ===== GENERIC INTERFACE =====

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ===== API TYPES =====

// The API serializes dateReported as an ISO string.
export type ApiItem = Omit<
  Item,
  "id" | "ownerId" | "dateReported" | "archivedAt" | "eventAt" | "status"
> & {
  id: string;
  ownerId: string;
  dateReported: string;
  reportType?: ReportType | "unknown";
  lifecycleStatus?: LifecycleStatus | "unknown";
  status: Item["status"] | "unknown";
  eventAt?: string | null;
  archivedAt?: string | null;
  hasActiveClaims?: boolean;
  canArchive?: boolean;
  reservedAt?: string | null;
  reservedBy?: string | null;
  reservedClaimId?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  handoverAt?: string | null;
  handoverBy?: string | null;
  handoverClaimId?: string | null;
  handoverInternalNote?: string | null;
  custodyConfirmedAt?: string | null;
  custodyConfirmedBy?: string | null;
};

// The API serializes claimDate as an ISO string and generates the Claim ID.
export type ApiClaim = Omit<
  Claim,
  "id" | "itemId" | "claimantId" | "claimDate" | "reviewedAt" | "decisionAt" | "handoverAt"
> & {
  id: string;
  itemId: string;
  claimantId: string;
  claimDate: string;
  reviewedAt?: string;
  decisionAt?: string;
  handoverAt?: string;
  approvedWorkflowStatus?: "awaiting_handover" | "completed" | "legacy";
};

// Claims received by an item owner omit private proof details.
export interface ApiClaimItemContext {
  id: string;
  title: string;
  description: string;
  location: string;
  dateReported: string;
  status: ApiItem["status"];
  reportType?: ApiItem["reportType"];
  lifecycleStatus?: ApiItem["lifecycleStatus"];
  eventAt?: string | null;
  category?: ItemCategory | null;
  custodyStatus?: CustodyStatus | null;
  ownerId?: string;
  archivedAt?: string | null;
}

export type ApiMyClaim = ApiClaim & {
  item: ApiClaimItemContext | null;
};

export type ApiReceivedClaim = Omit<ApiClaim, "proof" | "claimantId" | "pickupInstructions" | "handoverBy"> & {
  item: ApiClaimItemContext | null;
};

// Staff review responses omit claimant identity and include only the item
// details needed to decide whether the pending Claim is still eligible.
export type ApiReviewClaim = Omit<ApiClaim, "claimantId"> & {
  item: ApiClaimItemContext | null;
  claimant?: { name: string; email: string };
};

// The browser chooses only the item and proof. The API supplies claim ownership,
// date, status, and ID.
export type NewClaim = Pick<Claim, "proof"> & {
  itemId: string;
};

type NewItemDetails = Pick<ApiItem, "title" | "description" | "location"> & {
  eventAt: string;
  category?: ItemCategory;
};

export type NewItem =
  | (NewItemDetails & { reportType: "lost"; custodyStatus?: never })
  | (NewItemDetails & { reportType: "found"; custodyStatus: Exclude<CustodyStatus, "security_confirmed"> });

export type ItemUpdate = Partial<Omit<NewItem, "reportType">>;
export interface ItemListFilters {
  page?: number;
  limit?: number;
  reportType?: ReportType;
  category?: ItemCategory;
  location?: string;
  lifecycleStatus?: LifecycleStatus;
  from?: string;
  to?: string;
  q?: string;
}

export interface ApiPage<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number | null;
  hasMore: boolean;
}
export type ClaimDecisionStatus = Exclude<ApiClaim["status"], "pending">;

export type ApiUser = Omit<User, "id"> & {
  id: string;
};

export interface AuthReply {
  token: string;
  user: ApiUser;
}

export interface AiItemReportReview {
  summary: string;
  keyDetails: string[];
  suggestions: string[];
  readiness: "ready" | "almost" | "not-yet";
}
