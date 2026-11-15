import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { fetchClaimsPage } from "../api/client";
import type { ApiMyClaim, ApiPage } from "../types/index";

function formatDate(value?: string): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusMessage(claim: ApiMyClaim): string {
  if (claim.status === "pending") return "Your Claim is awaiting review.";
  if (claim.status === "approved") {
    if (claim.approvedWorkflowStatus === "completed") return "Handover completed.";
    if (claim.approvedWorkflowStatus === "awaiting_handover") return "Approved — awaiting physical handover.";
    return "Historical approved Claim — contact campus security to verify its status.";
  }
  return claim.decisionSource === "system"
    ? "This report is no longer available, so the Claim was closed automatically."
    : "Your Claim was not approved.";
}

function statusLabel(claim: ApiMyClaim): string {
  if (claim.status === "pending") return "Pending review";
  if (claim.status !== "approved") return "Not approved";
  if (claim.approvedWorkflowStatus === "completed") return "Handover completed";
  if (claim.approvedWorkflowStatus === "awaiting_handover") return "Approved · awaiting physical handover";
  return "Historical approved Claim";
}

function MyClaimsPage() {
  const [page, setPage] = useState(1);
  const claims = useQuery<ApiPage<ApiMyClaim>>({ queryKey: ["claims", "mine", page], queryFn: () => fetchClaimsPage(page) });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Claims</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">Track staff review and any confirmed physical handover.</p>
      </header>

      {claims.isPending && <p role="status" className="rounded-lg p-4 text-gray-700 dark:text-gray-300">Loading your Claims...</p>}
      {claims.isError && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">We couldn’t load your Claims. {claims.error.message}</p>}
      {claims.data?.data.length === 0 && page === 1 && (
        <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300">You haven’t submitted a Claim yet.</p>
          <Link to="/items" className="mt-3 inline-block text-blue-800 underline dark:text-blue-200">Browse found reports</Link>
        </div>
      )}

      <div className="grid gap-4">
        {claims.data?.data.map((claim) => (
          <article key={claim.id} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{claim.item?.title ?? "Item details unavailable"}</h2>
                {claim.item && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{claim.item.reportType === "found" ? "Found report" : claim.item.reportType === "lost" ? "Lost report" : "Historical report"} · {claim.item.location}</p>}
              </div>
              <span className="rounded border border-gray-300 px-2 py-1 text-sm font-medium text-gray-800 dark:border-gray-600 dark:text-gray-200">
                {statusLabel(claim)}
              </span>
            </div>
            <dl className="mt-3 grid gap-1 text-sm text-gray-700 sm:grid-cols-2 dark:text-gray-300">
              <div><dt className="inline font-medium">Submitted: </dt><dd className="inline">{formatDate(claim.claimDate)}</dd></div>
              {claim.reviewedAt && <div><dt className="inline font-medium">Reviewed: </dt><dd className="inline">{formatDate(claim.reviewedAt)}</dd></div>}
              {claim.approvedWorkflowStatus === "completed" && claim.handoverAt && <div><dt className="inline font-medium">Handover recorded: </dt><dd className="inline">{formatDate(claim.handoverAt)}</dd></div>}
            </dl>
            <p className="mt-3 text-sm text-gray-800 dark:text-gray-200" role="status">{statusMessage(claim)}</p>
            {claim.decisionSource === "system" && claim.decisionReason && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{claim.decisionReason}</p>}
            {claim.approvedWorkflowStatus === "awaiting_handover" && (
              <div className="mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950/30 dark:text-blue-100">
                {claim.pickupInstructions
                  ? <><h3 className="font-semibold">Private pickup instructions</h3><p className="mt-1 whitespace-pre-wrap">{claim.pickupInstructions}</p></>
                  : <p>Staff have not added private pickup instructions yet. Physical handover has not been recorded.</p>}
              </div>
            )}
          </article>
        ))}
      </div>
      {!claims.isPending && !claims.isError && claims.data && claims.data.totalCount !== null && claims.data.totalCount > 0 && (
        <nav aria-label="My Claim pages" className="mt-5 flex items-center justify-between">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600">Previous page</button>
          <p className="text-sm text-gray-600 dark:text-gray-300">Page {page} · {claims.data.totalCount} Claims</p>
          <button type="button" disabled={!claims.data.hasMore} onClick={() => setPage((current) => current + 1)} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600">Next page</button>
        </nav>
      )}
    </div>
  );
}

export default MyClaimsPage;
