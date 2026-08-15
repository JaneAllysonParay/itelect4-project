import type { User, Item, Claim } from "../types/index";

export const student: User = {
    id: 1,
    name: "Jane Allyson L. Paray",
    email: "jane_allyson_paray@dlsl.edu.ph",
    role: "student",
    isActive: true,
};

export const allLostItems: Item[] = [
    {
    id: 1,
    title: "Blue Tumbler",
    description: "1 Liter Blue Tumbler",
    location: "E-Library",
    dateReported: new Date(),
    status: "lost",
    ownerId: 1,
},
{
  id: 2,
  title: "Black Umbrella",
  description: "Foldable black umbrella",
  location: "College Lobby",
  dateReported: new Date(),
  status: "lost",
  ownerId: 1,
},
];

export const allClaims: Claim[] = [
    {
    id: 1,
    itemId: 1,
    claimantId: 2,
    claimDate: new Date(),
    status: "approved",
    proof: "Student ID presented",
    }
];


