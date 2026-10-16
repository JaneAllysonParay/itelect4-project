// src/data/mockData.ts

// Dashboard sample user retained from the GT3 exercise; Item and Claim data now
// load from the backend API. The API does not expose a user-profile endpoint.

import type { User } from "../types/index";

export const student: User = {
  id: 1,
  name: "Jane Allyson L. Paray",
  email: "jane_allyson_paray@dlsl.edu.ph",
  role: "student",
  isActive: true,
};
