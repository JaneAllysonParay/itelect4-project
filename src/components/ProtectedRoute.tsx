import { Navigate, Outlet } from "react-router";
import useAuthStore from "../store/authStore";
import type { ReactNode } from "react";

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: Array<"student" | "security" | "admin">;
  children?: ReactNode;
}) {
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.userRole);
  // No token? Send them to the login page instead of the page
  // they asked for.
  if (token === null) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/items" replace />;
  }
  // There IS a token, so render whichever child route matched.
  return children ?? <Outlet />;
}
export default ProtectedRoute;
