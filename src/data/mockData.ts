// src/data/mockData.ts

// allLostItems and allClaims are DELETED.
// They now live in db.json and are fetched through src/api/client.ts.
//
// `student` stays because there is no /users endpoint yet
// and the current user is still hard-coded.

import type { User } from "../types/index";

export const student: User = {
  id: 1,
  name: "Jane Allyson L. Paray",
  email: "jane_allyson_paray@dlsl.edu.ph",
  role: "student",
  isActive: true,
};
