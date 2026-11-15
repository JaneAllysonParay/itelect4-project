import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ApiItem, ApiPage, ItemCategory, LifecycleStatus, ReportType } from "../types/index";
import ItemCard from "../components/ItemCard";
import { fetchItemsPage } from "../api/client";
import useAuthStore from "../store/authStore";

const PAGE_SIZE = 20;

function ItemsPage() {
  const [search, setSearch] = useState("");
  const [reportType, setReportType] = useState<ReportType | "">("");
  const [category, setCategory] = useState<ItemCategory | "">("");
  const [location, setLocation] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const token = useAuthStore((state) => state.token);
  const fromTime = from ? new Date(from).getTime() : undefined;
  const toTime = to ? new Date(to).getTime() : undefined;
  const invalidRange = (fromTime !== undefined && !Number.isFinite(fromTime)) ||
    (toTime !== undefined && !Number.isFinite(toTime)) ||
    (fromTime !== undefined && toTime !== undefined && fromTime > toTime);
  const fromIso = fromTime !== undefined && Number.isFinite(fromTime) ? new Date(fromTime).toISOString() : undefined;
  const toIso = toTime !== undefined && Number.isFinite(toTime) ? new Date(toTime).toISOString() : undefined;

  const queryKey = ["items", "public", search, reportType, category, location, lifecycleStatus, fromIso, toIso, page];
  const { data, isPending, isError, error } = useQuery<ApiPage<ApiItem>>({
    queryKey,
    queryFn: () => fetchItemsPage({
      page,
      limit: PAGE_SIZE,
      q: search.trim() || undefined,
      reportType: reportType || undefined,
      category: category || undefined,
      location: location.trim() || undefined,
      lifecycleStatus: lifecycleStatus || undefined,
      from: fromIso,
      to: toIso,
    }),
    enabled: !invalidRange,
  });
  const loading = !invalidRange && isPending;

  const resetFilters = (): void => {
    setSearch("");
    setReportType("");
    setCategory("");
    setLocation("");
    setLifecycleStatus("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campus reports</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Browse reported lost and found property.</p>
        </div>
        {token && (
          <div className="flex flex-wrap gap-2">
            <Link to="/report/lost" className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">Report lost property</Link>
            <Link to="/report/found" className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800">Report found property</Link>
          </div>
        )}
      </div>

      <section aria-label="Filter reports" className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-7 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid gap-1">
          <Label htmlFor="report-search">Search</Label>
          <Input id="report-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Title, description, location" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="report-type-filter">Report type</Label>
          <select id="report-type-filter" value={reportType} onChange={(event) => { setReportType(event.target.value as ReportType | ""); setPage(1); }} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All report types</option><option value="lost">Lost</option><option value="found">Found</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="category-filter">Category</Label>
          <select id="category-filter" value={category} onChange={(event) => { setCategory(event.target.value as ItemCategory | ""); setPage(1); }} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All categories</option><option value="electronics">Electronics</option><option value="clothing">Clothing</option><option value="bags">Bags</option><option value="keys">Keys</option><option value="documents">Documents</option><option value="accessories">Accessories</option><option value="other">Other</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="location-filter">Location</Label>
          <Input id="location-filter" value={location} onChange={(event) => { setLocation(event.target.value); setPage(1); }} placeholder="Any campus location" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="lifecycle-filter">Availability or status</Label>
          <select id="lifecycle-filter" value={lifecycleStatus} onChange={(event) => { setLifecycleStatus(event.target.value as LifecycleStatus | ""); setPage(1); }} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All statuses</option><option value="open">Open</option><option value="reserved">Reserved</option><option value="returned">Returned</option><option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="event-from">Event from</Label>
          <Input id="event-from" type="datetime-local" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="event-to">Event to</Label>
          <Input id="event-to" type="datetime-local" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
        </div>
      </section>
      {invalidRange && <p role="alert" className="mt-3 text-sm text-red-700">End date must be on or after the start date.</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={resetFilters} className="rounded px-2 py-1 text-sm font-medium text-blue-800 underline dark:text-blue-200">Clear filters</button>
        <p className="text-sm text-gray-600 dark:text-gray-300" aria-live="polite">Page {page} · {data?.totalCount ?? "count unavailable"} matching reports</p>
      </div>

      {loading && <p role="status" className="mt-6 p-4 text-gray-700 dark:text-gray-300">Loading reports...</p>}
      {!invalidRange && isError && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">We couldn’t load reports. {error.message}</p>}

      {!invalidRange && !loading && !isError && data?.data.length === 0 && (
        <p className="mt-6 rounded-lg border border-gray-200 p-6 text-gray-700 dark:border-gray-700 dark:text-gray-300">
          {page > 1 ? "No more reports match these filters." : search || reportType || category || location || lifecycleStatus || from || to
            ? "No reports match those filters. Try changing your search."
            : "There are no reports to browse yet."}
        </p>
      )}

      {!invalidRange && !loading && !isError && data && data.data.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((item) => <Link key={item.id} to={`/items/${item.id}`} className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"><ItemCard item={item} /></Link>)}
        </div>
      )}

      <nav aria-label="Report pages" className="mt-6 flex items-center justify-between">
        <button type="button" disabled={invalidRange || page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600">Previous page</button>
        <button type="button" disabled={invalidRange || !data?.hasMore || loading} onClick={() => setPage((current) => current + 1)} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600">Next page</button>
      </nav>
    </div>
  );
}

export default ItemsPage;
