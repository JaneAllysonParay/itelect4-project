import { NavLink, Outlet } from "react-router";
import useAuthStore from "../store/authStore";
import useUiStore from "../store/uiStore";

function Layout() {
  const isDarkMode = useUiStore((state) => state.isDarkMode);
  const toggleDarkMode = useUiStore((state) => state.toggleDarkMode);
  const userName = useAuthStore((state) => state.userName);
  const userRole = useAuthStore((state) => state.userRole);
  const logout = useAuthStore((state) => state.logout);

  const base = "rounded px-3 py-1.5 text-sm";
  const activeLink = `${base} bg-blue-600 font-semibold text-white`;
  const idleLink = `${base} text-gray-700 hover:bg-gray-200 dark:text-gray-300`;
  const linkClass = ({ isActive }: { isActive: boolean }): string => isActive ? activeLink : idleLink;

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <span className="mr-2 font-bold text-gray-900 dark:text-white">Campus Lost &amp; Found</span>
          <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
          <NavLink to="/items" className={linkClass}>Browse reports</NavLink>
          {userName === null ? (
            <>
              <NavLink to="/login" className={linkClass}>Login</NavLink>
              <NavLink to="/register" className={linkClass}>Register</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/report/lost" className={linkClass}>Report lost</NavLink>
              <NavLink to="/report/found" className={linkClass}>Report found</NavLink>
              <NavLink to="/my-reports" className={linkClass}>My Reports</NavLink>
              <NavLink to="/my-claims" className={linkClass}>My Claims</NavLink>
              <NavLink to="/claims" className={linkClass}>Claims</NavLink>
              <NavLink to="/review" className={linkClass}>AI Report Review</NavLink>
              {(userRole === "security" || userRole === "admin") && <NavLink to="/staff/claims" className={linkClass}>Staff Claim review</NavLink>}
              <button type="button" onClick={logout} className="rounded px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">Logout ({userName})</button>
            </>
          )}
          <button type="button" onClick={toggleDarkMode} className="ml-auto rounded bg-gray-800 px-3 py-1.5 text-sm text-white dark:bg-gray-200 dark:text-gray-900">
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </nav>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
}

export default Layout;
