import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { ArrowRight, Menu, Moon, PackageSearch, Plus, ShieldCheck, Sun, X } from "lucide-react";
import useAuthStore from "../store/authStore";
import useUiStore from "../store/uiStore";

function Layout() {
  const isDarkMode = useUiStore((state) => state.isDarkMode);
  const toggleDarkMode = useUiStore((state) => state.toggleDarkMode);
  const token = useAuthStore((state) => state.token);
  const userName = useAuthStore((state) => state.userName);
  const userRole = useAuthStore((state) => state.userRole);
  const logout = useAuthStore((state) => state.logout);
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const isMobileMenuOpen = mobileMenuPath === location.pathname;
  const isAuthenticated = Boolean(token);
  const isStaff = userRole === "security" || userRole === "admin";

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setMobileMenuPath(null);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    `inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const closeMobileMenu = (): void => {
    if (!isMobileMenuOpen) return;
    setMobileMenuPath(null);
    document.getElementById("main-content")?.focus();
  };

  const toggleMobileMenu = (): void => {
    setMobileMenuPath(isMobileMenuOpen ? null : location.pathname);
  };

  const primaryLinks = (
    <>
      <NavLink to="/" end className={navLinkClass} onClick={closeMobileMenu}>Dashboard</NavLink>
      <NavLink to="/items" className={navLinkClass} onClick={closeMobileMenu}>Browse reports</NavLink>
      {isAuthenticated && (
        <>
          <NavLink to="/my-reports" className={navLinkClass} onClick={closeMobileMenu}>My Reports</NavLink>
          <NavLink to="/my-claims" className={navLinkClass} onClick={closeMobileMenu}>My Claims</NavLink>
          <NavLink to="/claims" className={navLinkClass} onClick={closeMobileMenu}>Claims</NavLink>
          <NavLink to="/review" className={navLinkClass} onClick={closeMobileMenu}>AI Report Review</NavLink>
          {isStaff && (
            <NavLink to="/staff/claims" className={navLinkClass} onClick={closeMobileMenu}>
              <ShieldCheck aria-hidden="true" className="mr-1.5 size-4" /> Staff Claim review
            </NavLink>
          )}
        </>
      )}
    </>
  );

  const themeControl = (
    <button
      type="button"
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} theme`}
      aria-pressed={isDarkMode}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      {isDarkMode ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
      <span className="hidden xl:inline">{isDarkMode ? "Light theme" : "Dark theme"}</span>
    </button>
  );

  const reportActions = (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/report/lost"
        onClick={closeMobileMenu}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus aria-hidden="true" className="size-4" /> Report lost
      </Link>
      <Link
        to="/report/found"
        onClick={closeMobileMenu}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <Plus aria-hidden="true" className="size-4" /> Report found
      </Link>
    </div>
  );

  return (
    <div className={isDarkMode ? "dark min-h-screen bg-background text-foreground" : "min-h-screen bg-background text-foreground"}>
      <a href="#main-content" className="sr-only z-50 rounded-md bg-card px-4 py-2 text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Campus Lost and Found Tracker home" onClick={closeMobileMenu} className="flex min-w-0 items-center gap-3 rounded-lg">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <PackageSearch aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm leading-tight font-semibold text-foreground sm:text-base">Campus Lost &amp; Found</span>
              <span className="block text-xs text-muted-foreground">Tracker</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 lg:flex">
              {isAuthenticated ? (
                <>
                  {reportActions}
                  <div className="ml-1 flex max-w-48 items-center gap-2 border-l border-border pl-3">
                    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                      {(userName?.trim().charAt(0) || "A").toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{userName || "Signed in"}</span>
                      <span className="block text-xs text-muted-foreground">{userRole ?? "Account"}</span>
                    </span>
                  </div>
                  <button type="button" onClick={logout} className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Sign in</Link>
                  <Link to="/register" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Create account</Link>
                </>
              )}
            </div>
            {themeControl}
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={`${isMobileMenuOpen ? "Close" : "Open"} navigation menu`}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={toggleMobileMenu}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              {isMobileMenuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            </button>
          </div>
        </div>

        <div className="hidden border-t border-border lg:block">
          <nav aria-label="Primary navigation" className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-2 sm:px-6">
            {primaryLinks}
          </nav>
        </div>

        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          hidden={!isMobileMenuOpen}
          className="border-t border-border bg-card px-4 py-3 sm:px-6 lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-1">
            {primaryLinks}
            {isAuthenticated ? (
              <>
                <div className="mt-2 border-t border-border pt-3">{reportActions}</div>
                <div className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-foreground">{userName || "Signed in"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{userRole ?? "Account"}</span>
                </div>
                <button type="button" onClick={() => { logout(); closeMobileMenu(); }} className="min-h-11 rounded-lg px-3 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-3">
                <Link to="/login" onClick={closeMobileMenu} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted">Sign in</Link>
                <Link to="/register" onClick={closeMobileMenu} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Create account <ArrowRight aria-hidden="true" className="size-4" /></Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
