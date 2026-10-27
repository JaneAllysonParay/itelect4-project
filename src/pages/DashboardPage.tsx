import { useState } from "react";
import useToggle from "../hooks/useToggle";
import useAuthStore from "../store/authStore";

function DashboardPage() {
  const [isUserSelected, setIsUserSelected] = useState(false);
  const [showDetails, toggleDetails] = useToggle(false);
  const userName = useAuthStore((state) => state.userName);
  const userId = useAuthStore((state) => state.userId);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token);
  const dashboardName = isAuthenticated && userName ? userName : "Welcome";
  const userIdentity = isAuthenticated
    ? userId
      ? `User ID: ${userId}`
      : "User ID unavailable"
    : "Not signed in";

  return (
    <div>
      <h2
        className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        Dashboard
      </h2>
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {dashboardName}
          </h3>

          <p className="text-gray-600 dark:text-gray-300">{userIdentity}</p>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Status: {isAuthenticated ? "Signed in" : "Signed out"}
          </p>

          <button
            onClick={() => setIsUserSelected(true)}
            className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Select
          </button>

          <input
            onChange={(event) => console.log("Note:", event.target.value)}
            placeholder="Quick note (demo only)"
            className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
      <button
        onClick={toggleDetails}
        className="mt-4 rounded bg-gray-200 px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white">
        {showDetails ? "Hide" : "Show"} Details
      </button>
      {showDetails && isUserSelected && (
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          Selected: {dashboardName} ({userIdentity})
        </p>
      )}
    </div>
  );
}
export default DashboardPage;
