// src/App.tsx
import "./App.css";

import { useEffect, useRef, useState } from "react";
import type { User, Item, Claim } from "./types";

import UserCard from "./components/UserCard";
import ItemCard from "./components/ItemCard";
import ClaimCard from "./components/ClaimCard";

import useToggle from "./hooks/useToggle";
import usePrevious from "./hooks/usePrevious";

// Mock User
const student: User = {
  id: 1,
  name: "Jane Allyson L. Paray",
  email: "jane_allyson_paray@dlsl.edu.ph",
  role: "student",
  isActive: true,
};

// Mock Item
const lostItem: Item = {
  id: 1,
  title: "Blue Tumbler",
  description: "1 Liter Blue Tumbler",
  location: "E-Library",
  dateReported: new Date(),
  status: "lost",
  ownerId: 1,
};

// Additional Mock Item
const lostItem2: Item = {
  id: 2,
  title: "Black Umbrella",
  description: "Foldable black umbrella",
  location: "College Lobby",
  dateReported: new Date(),
  status: "lost",
  ownerId: 1,
};

// Mock Claim
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [claimList, setClaimList] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [showClaimDetails, toggleClaimDetails] = useToggle(false);
  const previousSearch = usePrevious(searchTerm);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentUser(student);

      // Both mock items are loaded into state
      setItems([lostItem, lostItem2]);

      setClaimList(claims);
      setIsLoading(false);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setSearchTerm(event.target.value);
  };

  const handleSelectItem = (item: Item): void => {
    alert(
      `Item Details
      Title: ${item.title}
      Description: ${item.description}
      Location: ${item.location}
      Status: ${item.status}
      Date Reported: ${item.dateReported.toLocaleDateString()}`,
    );
  };

  const handleFocusSearch = (): void => {
    searchInputRef.current?.focus();
  };

  const filteredItems = items.filter((item) => {
    const normalizedSearch = searchTerm.toLowerCase();

    return (
      item.title.toLowerCase().includes(normalizedSearch) ||
      item.description.toLowerCase().includes(normalizedSearch) ||
      item.location.toLowerCase().includes(normalizedSearch)
    );
  });

  if (isLoading) {
    return <p>Loading lost-and-found data...</p>;
  }

  return (
    <div className="app">
      <h1>Welcome to the Lost and Found System</h1>

      <div className="search-section">
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          placeholder="Search lost items..."
          onChange={handleSearchChange}
        />

        <button type="button" onClick={handleFocusSearch}>
          Focus Search
        </button>
      </div>

      {previousSearch !== undefined &&
        previousSearch !== searchTerm &&
        previousSearch !== "" && <p>Previous search: "{previousSearch}"</p>}

      <section>
        <h2>User Information</h2>

        {currentUser && (
          <UserCard user={currentUser} onSelect={setSelectedUser} />
        )}

        {selectedUser && (
          <p>
            Selected user: <strong>{selectedUser.name}</strong>
          </p>
        )}
      </section>

      <section>
        <h2>Lost Items</h2>

        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} onSelect={handleSelectItem} />
          ))
        ) : (
          <p>No lost items found.</p>
        )}
      </section>

      <section>
        <button type="button" onClick={toggleClaimDetails}>
          {showClaimDetails ? "Hide" : "Show"} Claim Details
        </button>

        {showClaimDetails &&
          claimList.map((claim) => <ClaimCard key={claim.id} claim={claim} />)}
      </section>
    </div>
  );
}

export default App;
