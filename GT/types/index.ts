// ===== INTERFACES =====
// An interface defines the SHAPE of an object.

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
  status: "lost" | "found" | "claimed";
  ownerId: number;
}

export interface Claim {
  id: number;
  itemId: number;
  claimantId: number;
  claimDate: Date;
  status: "pending" | "approved" | "rejected";
  proof: string;
}

// Partial<T> -- every field becomes optional
export type UserUpdate = Partial<User>;

// Pick<T, K> -- keep ONLY the listed fields
export type UserPreview = Pick<User, "id" | "name" | "role">;

// Omit<T, K> -- remove specific fields
export type PublicUser = Omit<User, "email" | "isActive">;

// Record<K, T> -- fixed keys mapped to one type
export type UserCount = Record<"student" | "security" | "admin", number>;

// ===== ENUMS =====

// Regular enum
export enum ClaimStatus {
  Pending,
  Approved,
  Rejected,
}

// const enum
export const enum UserRole {
  Student = "student",
  Security = "security",
  Admin = "admin",
}

// ===== TYPE ALIASES =====

// Alias for string or number IDs
export type ID = string | number;

// Alias for item location
export type Location = {
  building: string;
  room: string;
};

// Alias for formatting dates
export type DateFormatter = (date: Date) => string;

// Using them
const itemId: ID = "LF-2026-001";

const itemLocation: Location = {
  building: "Sen. Jose Diokno Building",
  room: "E-Library",
};

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
    name: "Jane Allyson L. Paray",
    email: "jane_allyson_paray@dlsl.edu.ph",
    role: "student",
    isActive: true,
  },

  claimCount: 2,
};

// ===== GENERIC INTERFACE =====

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
