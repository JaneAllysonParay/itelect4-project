import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { deleteItem, fetchMyItemsPage, resolveItem } from "../api/client";
import type { ApiItem, ApiPage } from "../types/index";
import { lifecycleLabel, lifecycleStatusOf, reportTypeLabel, reportTypeOf } from "../lib/itemLifecycle";

function formatDate(value?: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function MyReportsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const reports = useQuery<ApiPage<ApiItem>>({ queryKey: ["myReports", page], queryFn: () => fetchMyItemsPage({ limit: 20, page }) });
  const action = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: "archive" | "resolve" }) =>
      kind === "archive" ? deleteItem(id) : resolveItem(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myReports"] }),
        queryClient.invalidateQueries({ queryKey: ["items"] }),
      ]);
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Reports</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Reports you created, including archived reports.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/report/lost" className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Report lost</Link>
          <Link to="/report/found" className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold dark:border-gray-600">Report found</Link>
        </div>
      </header>

      {reports.isPending && <p role="status" className="rounded-lg p-4 text-gray-700 dark:text-gray-300">Loading your reports...</p>}
      {reports.isError && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">We couldn’t load your reports. {reports.error.message}</p>}
      {action.isError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{action.error.message}</p>}

      {reports.data?.data.length === 0 && page === 1 && (
        <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
          <p className="text-gray-800 dark:text-gray-200">You haven’t reported anything yet. If you’ve lost or found something on campus, you can create a report.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/report/lost" className="text-blue-800 underline dark:text-blue-200">Report lost property</Link>
            <Link to="/report/found" className="text-blue-800 underline dark:text-blue-200">Report found property</Link>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {reports.data?.data.map((item) => {
          const type = reportTypeOf(item);
          const lifecycle = lifecycleStatusOf(item);
          const active = item.hasActiveClaims !== false;
          const editable = !item.archivedAt && lifecycle === "open" && type !== "unknown" && !active;
          const canResolve = !item.archivedAt && type === "lost" && lifecycle === "open";
          const canArchive = item.canArchive === true;
          return (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{reportTypeLabel(item)}</p>
                  <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{item.archivedAt
                    ? item.title
                    : <Link to={`/items/${item.id}`} className="underline decoration-transparent hover:decoration-current">{item.title}</Link>}</h2>
                </div>
                <span className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-800 dark:border-gray-600 dark:text-gray-200">{item.archivedAt ? "Archived" : "Active"}</span>
              </div>
              <dl className="mt-3 grid gap-1 text-sm text-gray-700 sm:grid-cols-2 dark:text-gray-300">
                <div><dt className="inline font-medium">Date reported: </dt><dd className="inline">{formatDate(item.dateReported)}</dd></div>
                <div><dt className="inline font-medium">Event date: </dt><dd className="inline">{formatDate(item.eventAt)}</dd></div>
                <div><dt className="inline font-medium">Location: </dt><dd className="inline">{item.location}</dd></div>
                <div><dt className="inline font-medium">Lifecycle: </dt><dd className="inline">{lifecycleLabel(item)}</dd></div>
              </dl>
              {active && <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">A Claim may still be active or its state could not be verified. Editing and archiving are paused.</p>}
              {!active && lifecycle === "returned" && canArchive && <p className="mt-3 text-sm text-green-800 dark:text-green-200">Staff confirmed the handover. This Claim is historical, so the report may be archived.</p>}
              {!active && lifecycle === "returned" && !canArchive && <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">The returned report’s Claim and handover records need staff reconciliation before archival.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {editable && <Link to={`/items/${item.id}/edit`} className="rounded border border-gray-300 px-3 py-2 text-sm font-medium dark:border-gray-600">Edit report</Link>}
                {canResolve && <button type="button" disabled={action.isPending} onClick={() => { if (window.confirm("Have you recovered this property? This will close your lost report.")) action.mutate({ id: item.id, kind: "resolve" }); }} className="rounded border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-gray-600">{action.isPending ? "Saving..." : "I recovered this item"}</button>}
                {canArchive && <button type="button" disabled={action.isPending} onClick={() => { if (window.confirm("Archive this report? It will be hidden from public browsing and kept in your report history.")) action.mutate({ id: item.id, kind: "archive" }); }} className="rounded border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-gray-600">{action.isPending ? "Saving..." : "Archive report"}</button>}
              </div>
            </article>
          );
        })}
      </div>
      {!reports.isPending && !reports.isError && (reports.data?.data.length ?? 0) > 0 && (
        <nav aria-label="My report pages" className="mt-5 flex items-center justify-between">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600">Previous page</button>
          <p className="text-sm text-gray-600 dark:text-gray-300">Page {page} · {reports.data?.totalCount ?? "count unavailable"} reports</p>
          <button type="button" disabled={!reports.data?.hasMore} onClick={() => setPage((current) => current + 1)} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600">Next page</button>
        </nav>
      )}
      {!reports.isPending && !reports.isError && page > 1 && reports.data?.data.length === 0 && <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">No reports remain on this page.</p>}
    </div>
  );
}

export default MyReportsPage;
