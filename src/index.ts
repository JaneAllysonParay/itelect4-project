// ===== IMPORTS =====
import type {
  User,
  Item,
  Claim,
  ApiResponse,
  StringOrNumber,
  UserUpdate,
  UserPreview,
  PublicUser,
  UserCount,
} from "./types/index";

import { ClaimStatus, UserRole } from "./types/index";

// ===== PRIMITIVE TYPE ANNOTATIONS =====

// Variables with explicit types
const projectName: string = "Campus Lost & Found Tracker";
const currentYear: number = 2026;
const isWebApp: boolean = true;
const nothing: null = null;
const notSet: undefined = undefined;

// Function: typed parameters + typed return value
function greet(name: string, year: number): string {
  return `Welcome to ${name} - AY ${year}!`;
}

// void: function that does NOT return a value
function logMessage(message: string): void {
  console.log(message);
}

logMessage(greet(projectName, currentYear));
console.log(isWebApp);
console.log(nothing);
console.log(notSet);

// ===== SPECIAL TYPES =====

// any -- disables TypeScript type checking for this value.
// This is included only as a Session 1 demonstration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let anything: any = "hello";

console.log(anything);

anything = 42;
console.log(anything);

anything = true;
console.log(anything);

// unknown -- safer than any because the value must be
// narrowed before it can be used safely.
const userInput: unknown = "lost wallet";

if (typeof userInput === "string") {
  console.log(userInput.toUpperCase());
}

// never -- represents a function that can never complete normally.
// Referencing the function below demonstrates the type without
// actually calling it and crashing the program.
function throwError(message: string): never {
  throw new Error(message);
}

console.log(typeof throwError);

// ===== USING INTERFACES =====

const student: User = {
  id: 1,
  name: "Jane Allyson L. Paray",
  email: "jane_allyson_paray@dlsl.edu.ph",
  role: "student",
  isActive: true,
};

const lostItem: Item = {
  id: 1,
  title: "Blue Tumbler",
  description: "1 Liter Blue Tumbler",
  location: "E-Library",
  dateReported: new Date(),
  status: "lost",
  ownerId: 1,
};

const claim: Claim = {
  id: 1,
  itemId: 1,
  claimantId: 1,
  claimDate: new Date(),
  status: "approved",
  proof: "Student ID presented",
};

console.log(student);
console.log(lostItem);
console.log(claim);

// ===== TYPE NARROWING =====

// Narrowing with typeof
function processInput(input: StringOrNumber): string {
  if (typeof input === "string") {
    return input.toUpperCase();
  }

  return input.toFixed(2);
}

// Narrowing with instanceof
function formatDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  return value;
}

console.log(processInput("wallet"));
console.log(processInput(101));
console.log(formatDate(new Date()));

// ===== GENERIC FUNCTIONS =====

function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}

function getById<T extends { id: number }>(
  items: T[],
  id: number,
): T | undefined {
  return items.find((item) => item.id === id);
}

const firstUser = getFirst<User>([student]);
const foundItem = getById<Item>([lostItem], 1);

console.log(firstUser?.name);
console.log(foundItem?.title);

// ===== GENERIC INTERFACE =====

const userResponse: ApiResponse<User> = {
  success: true,
  data: student,
};

const itemResponse: ApiResponse<Item[]> = {
  success: true,
  data: [lostItem],
};

console.log(userResponse.data.name);
console.log(itemResponse.data[0]?.title);

// ===== USING UTILITY TYPES =====

// Partial<T>
const patch: UserUpdate = {
  name: "Jane Allyson L. Paray",
};

// Pick<T,K>
const preview: UserPreview = {
  id: 1,
  name: "Jane Allyson L. Paray",
  role: "student",
};

// Omit<T,K>
const publicProfile: PublicUser = {
  id: 1,
  name: "Jane Allyson L. Paray",
  role: "student",
};

// Record<K,T>
const userCount: UserCount = {
  student: 150,
  security: 5,
  admin: 2,
};

console.log(patch);
console.log(preview);
console.log(publicProfile);
console.log(userCount);

// ===== ReturnType<T> =====

function createClaim(itemId: number) {
  return {
    id: 1,
    itemId,
    claimantId: 1,
    claimDate: new Date(),
    status: "approved" as const,
    proof: "Student ID",
  };
}

type NewClaim = ReturnType<typeof createClaim>;

const newClaim: NewClaim = createClaim(1);

console.log(newClaim);

// ===== USING ENUMS =====

let status: ClaimStatus = ClaimStatus.Approved;

console.log(ClaimStatus[status]); // "Approved"

status = ClaimStatus.Rejected;

console.log(status === ClaimStatus.Rejected); // true

const currentRole: UserRole = UserRole.Student;

console.log(currentRole); // "student"
