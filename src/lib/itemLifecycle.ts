import type { ApiItem, LifecycleStatus, ReportType } from "../types/index";

function canonicalStateOf(item: Pick<ApiItem, "reportType" | "lifecycleStatus" | "status">): {
  reportType: ReportType;
  lifecycleStatus: LifecycleStatus;
} | null {
  if (item.reportType === "lost" && (item.lifecycleStatus === "open" || item.lifecycleStatus === "resolved") && item.status === "lost") {
    return { reportType: "lost", lifecycleStatus: item.lifecycleStatus };
  }
  if (item.reportType === "found" && item.lifecycleStatus === "open" && item.status === "found") {
    return { reportType: "found", lifecycleStatus: "open" };
  }
  if (item.reportType === "found" && (item.lifecycleStatus === "reserved" || item.lifecycleStatus === "returned") && item.status === "claimed") {
    return { reportType: "found", lifecycleStatus: item.lifecycleStatus };
  }
  return null;
}

export function reportTypeOf(item: Pick<ApiItem, "reportType" | "lifecycleStatus" | "status">): ReportType | "unknown" {
  if (item.reportType !== undefined || item.lifecycleStatus !== undefined) {
    return canonicalStateOf(item)?.reportType ?? "unknown";
  }
  return item.status === "lost" || item.status === "found" ? item.status : "unknown";
}

export function lifecycleStatusOf(item: Pick<ApiItem, "reportType" | "lifecycleStatus" | "status">): LifecycleStatus | "unknown" {
  if (item.reportType !== undefined || item.lifecycleStatus !== undefined) {
    return canonicalStateOf(item)?.lifecycleStatus ?? "unknown";
  }
  if (item.status === "lost" || item.status === "found") return "open";
  return "unknown";
}

export function isClaimableFoundItem(item: ApiItem, currentUserId?: string | null): boolean {
  return reportTypeOf(item) === "found" &&
    lifecycleStatusOf(item) === "open" &&
    (item.custodyStatus === "finder_reported" || item.custodyStatus === "security_reported" || item.custodyStatus === "security_confirmed") &&
    !item.archivedAt &&
    item.ownerId !== currentUserId;
}

export function reportTypeLabel(item: Pick<ApiItem, "reportType" | "status">): string {
  const type = reportTypeOf(item);
  return type === "lost" ? "Lost report" : type === "found" ? "Found report" : "Historical report · type unknown";
}

export function lifecycleLabel(item: Pick<ApiItem, "lifecycleStatus" | "status">): string {
  const status = lifecycleStatusOf(item);
  if (status === "open") return "Open";
  if (status === "reserved") return "Reserved for an approved Claim";
  if (status === "returned") return "Returned · handover confirmed";
  if (status === "resolved") return "Resolved by reporter or staff";
  return "Unavailable · historical status unknown";
}
