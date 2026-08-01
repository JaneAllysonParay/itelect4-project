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
  const [claimList, setClaimList] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [showClaimDetails, toggleClaimDetails] = useToggle(false);
  const [isDarkMode, toggleDarkMode] = useToggle(false);

  const previousSearch = usePrevious(searchTerm);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentUser(student);
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
    return (
      <div className="animate-pulse p-6 text-gray-500">
        Loading lost-and-found data...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="m-6 rounded-lg bg-red-50 p-4 text-red-700">
        Could not load lost-and-found data. Please try again.
      </div>
    );
  }

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 p-6 transition-colors dark:bg-gray-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to the Lost and Found System
          </h1>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white transition hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            placeholder="Search lost items..."
            onChange={handleSearchChange}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
          />

          <button
            type="button"
            onClick={handleFocusSearch}
            className="rounded bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            Focus Search
          </button>
        </div>

        {previousSearch !== undefined &&
          previousSearch !== searchTerm &&
          previousSearch !== "" && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Previous search: "{previousSearch}"
            </p>
          )}

        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            User Information
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentUser && (
              <UserCard user={currentUser} onSelect={setSelectedUser} />
            )}
          </div>

          {selectedUser && (
            <p className="mt-3 text-gray-700 dark:text-gray-300">
              Selected user: <strong>{selectedUser.name}</strong>
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            Lost Items
          </h2>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No lost items found.
            </p>
          )}
        </section>

        <section className="mt-8">
          <button
            type="button"
            onClick={toggleClaimDetails}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {showClaimDetails ? "Hide" : "Show"} Claim Details
          </button>

          {showClaimDetails && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {claimList.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
