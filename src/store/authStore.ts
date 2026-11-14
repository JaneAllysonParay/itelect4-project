import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRoleName } from "../types/index";

interface AuthState {
  token: string | null;
  userId: string | null;
  userName: string | null;
  userRole: UserRoleName | null;
  setSession: (
    token: string,
    userId: string,
    userName: string,
    userRole: UserRoleName,
  ) => void;
  logout: () => void;
}

function isUserRoleName(value: unknown): value is UserRoleName {
  return value === "student" || value === "security" || value === "admin";
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      userName: null,
      userRole: null,
      setSession: (token, userId, userName, userRole) =>
        set({ token, userId, userName, userRole }),
      logout: () =>
        set({ token: null, userId: null, userName: null, userRole: null }),
    }),
    {
      name: "itelect4-auth", // the localStorage key it writes to
      partialize: (state) => ({
        // Save session details; Zustand recreates the actions on load.
        token: state.token,
        userId: state.userId,
        userName: state.userName,
        userRole: state.userRole,
      }),
      version: 1,
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<AuthState> | undefined;
        if (persisted?.token && !isUserRoleName(persisted.userRole)) {
          return {
            token: null,
            userId: null,
            userName: null,
            userRole: null,
          };
        }
        return persistedState as {
          token: string | null;
          userId: string | null;
          userName: string | null;
          userRole: UserRoleName | null;
        };
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState> | undefined;

        // Legacy sessions without a role cannot safely drive role-gated UI.
        // Require sign-in again instead of guessing a role from the client.
        if (persisted?.token && !isUserRoleName(persisted.userRole)) {
          return currentState;
        }

        return { ...currentState, ...persisted };
      },
    },
  ),
);
export default useAuthStore;
