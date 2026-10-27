import { create } from "zustand";
import { persist } from "zustand/middleware";
interface AuthState {
  token: string | null;
  userId: string | null;
  userName: string | null;
  setSession: (token: string, userId: string, userName: string) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      userName: null,
      setSession: (token, userId, userName) => set({ token, userId, userName }),
      logout: () => set({ token: null, userId: null, userName: null }),
    }),
    {
      name: "itelect4-auth", // the localStorage key it writes to
      partialize: (state) => ({
        // Save session details; Zustand recreates the actions on load.
        token: state.token,
        userId: state.userId,
        userName: state.userName,
      }),
    },
  ),
);
export default useAuthStore;
