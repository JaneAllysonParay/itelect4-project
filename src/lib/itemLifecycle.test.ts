import { describe, expect, it } from "vitest";
import { isClaimableFoundItem, lifecycleStatusOf, reportTypeOf } from "./itemLifecycle";
import type { ApiItem } from "../types/index";

function item(fields: Partial<ApiItem>): ApiItem {
  return {
    id: "item-1",
    title: "Blue tumbler",
    description: "Blue tumbler with a silver lid",
    location: "Library",
    dateReported: "2026-11-14T00:00:00.000Z",
    status: "found",
    ownerId: "another-user",
    ...fields,
  };
}

describe("conservative Item lifecycle interpretation", () => {
  it.each([
    { status: "lost" as const, reportType: "lost", lifecycle: "open" },
    { status: "found" as const, reportType: "found", lifecycle: "open" },
  ])("maps pure legacy $status reports to open", ({ status, reportType: expectedType, lifecycle: expectedLifecycle }) => {
    const legacy = item({ status });
    expect(reportTypeOf(legacy)).toBe(expectedType);
    expect(lifecycleStatusOf(legacy)).toBe(expectedLifecycle);
  });

  it("keeps a pure legacy claimed report unavailable", () => {
    const legacy = item({ status: "claimed" });
    expect(reportTypeOf(legacy)).toBe("unknown");
    expect(lifecycleStatusOf(legacy)).toBe("unknown");
    expect(isClaimableFoundItem(legacy)).toBe(false);
  });

  it("keeps found reports without custody information visible but not claimable", () => {
    const legacy = item({ status: "found" });
    expect(reportTypeOf(legacy)).toBe("found");
    expect(lifecycleStatusOf(legacy)).toBe("open");
    expect(isClaimableFoundItem(legacy)).toBe(false);
    expect(isClaimableFoundItem(item({ status: "found", custodyStatus: "finder_reported" }))).toBe(true);
  });

  it.each([
    { reportType: "found" as const, status: "found" as const },
    { reportType: "found" as const, lifecycleStatus: "reserved" as const, status: "found" as const },
    { reportType: "lost" as const, lifecycleStatus: "returned" as const, status: "claimed" as const },
  ])("marks partial or contradictory canonical state unavailable: %o", (fields) => {
    const ambiguous = item(fields);
    expect(reportTypeOf(ambiguous)).toBe("unknown");
    expect(lifecycleStatusOf(ambiguous)).toBe("unknown");
    expect(isClaimableFoundItem(ambiguous)).toBe(false);
  });
});
