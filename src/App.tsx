// src/App.tsx
import UserCard from "./components/UserCard";
import ItemCard from "./components/ItemCard";
import ClaimCard from "./components/ClaimCard";
import type { User, Item, Claim } from "./types";
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
const claims: Claim[] = [
  {
    id: 1,
    itemId: 1,
    claimantId: 2,
    claimDate: new Date(),
    status: "approved",
    proof: "Student ID presented",
  },
];
function App() {
  const handleViewItem = (item: Item): void => {
    alert(`Viewed Item: ${item.title}`);
  };

  return (
    <div className="app">
      <h1>Welcome to the Lost and Found System</h1>
      <UserCard user={student} />

      <ItemCard
        item={lostItem}
        onSelect={handleViewItem}
      />
      <ClaimCard claim={claims[0]} />
    </div>
  );
}

export default App;