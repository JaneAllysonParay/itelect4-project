import { afterEach, beforeEach, describe, expect, it } from "vitest";
import useAuthStore from "./authStore";

describe("persisted authentication compatibility", () => {
  beforeEach(async () => {
    await useAuthStore.persist.clearStorage();
    useAuthStore.setState({
      token: null,
      userId: null,
      userName: null,
      userRole: null,
    });
  });

  afterEach(async () => {
    useAuthStore.getState().logout();
    await useAuthStore.persist.clearStorage();
  });

  it("requires a fresh login for a legacy persisted session without a role", async () => {
    localStorage.setItem(
      "itelect4-auth",
      JSON.stringify({
        state: {
          token: "legacy-token",
          userId: "student-1",
          userName: "Student",
        },
        version: 0,
      }),
    );

    await useAuthStore.persist.rehydrate();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().userId).toBeNull();
    expect(useAuthStore.getState().userRole).toBeNull();
  });
});
