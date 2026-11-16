import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ApiItem, ApiPage, ItemCategory, LifecycleStatus, ReportType } from "../types/index";
import ItemCard from "../components/ItemCard";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../components/PageStates";
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
  const advancedFilterCount = [reportType, category, location.trim(), lifecycleStatus, from, to].filter(Boolean).length;
  const activeFilterCount = advancedFilterCount + (search.trim() ? 1 : 0);

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
  const currentPage = data?.page ?? page;
  const matchingReportCount = data?.totalCount !== null && data?.totalCount !== undefined
    ? `${data.totalCount} matching report${data.totalCount === 1 ? "" : "s"}`
    : "matching count unavailable";

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

  const updatePage = (nextPage: number): void => {
    setPage(Math.max(1, nextPage));
  };

  return (
    <div>
      <PageHeader
        eyebrow="Public reports"
        title="Campus reports"
        description="Search lost and found property reports from the campus community."
        actions={token ? (
          <>
            <Link to="/report/lost" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Report lost property</Link>
            <Link to="/report/found" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted">Report found property</Link>
          </>
        ) : undefined}
      />

      <SectionCard title="Search reports" description="Search by description or campus location, then narrow results with optional filters." className="mb-5">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Label htmlFor="report-search" className="sr-only">Search reports</Label>
          <Input
            id="report-search"
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search title, description, or location"
            className="h-12 pl-10"
          />
        </div>

        <details className="group mt-4 rounded-xl border border-border bg-background" open>
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-foreground marker:hidden focus-visible:outline-offset-[-3px] [&::-webkit-details-marker]:hidden">
            <span className="flex-1">Advanced filters</span>
            <span className="text-xs font-medium text-muted-foreground">{advancedFilterCount ? `${advancedFilterCount} applied` : "Optional"}</span>
            <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="report-type-filter">Report type</Label>
              <select id="report-type-filter" value={reportType} onChange={(event) => { setReportType(event.target.value as ReportType | ""); setPage(1); }} className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-sm">
                <option value="">All report types</option><option value="lost">Lost</option><option value="found">Found</option>
              </select>
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="category-filter">Category</Label>
              <select id="category-filter" value={category} onChange={(event) => { setCategory(event.target.value as ItemCategory | ""); setPage(1); }} className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-sm">
                <option value="">All categories</option><option value="electronics">Electronics</option><option value="clothing">Clothing</option><option value="bags">Bags</option><option value="keys">Keys</option><option value="documents">Documents</option><option value="accessories">Accessories</option><option value="other">Other</option>
              </select>
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="location-filter">Location</Label>
              <Input id="location-filter" value={location} onChange={(event) => { setLocation(event.target.value); setPage(1); }} placeholder="Any campus location" />
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="lifecycle-filter">Availability or status</Label>
              <select id="lifecycle-filter" value={lifecycleStatus} onChange={(event) => { setLifecycleStatus(event.target.value as LifecycleStatus | ""); setPage(1); }} className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-sm">
                <option value="">All statuses</option><option value="open">Open</option><option value="reserved">Reserved</option><option value="returned">Returned · handover confirmed</option><option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="event-from">Event from</Label>
              <Input id="event-from" type="datetime-local" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="event-to">Event to</Label>
              <Input id="event-to" type="datetime-local" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
            </div>
          </div>
        </details>
      </SectionCard>

      {invalidRange && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">End date must be on or after the start date.</p>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied · ` : ""}
          Page {currentPage} · {matchingReportCount}
        </p>
        <button type="button" onClick={resetFilters} disabled={activeFilterCount === 0} className="inline-flex min-h-11 items-center justify-center self-start rounded-lg px-3 text-sm font-semibold text-primary underline decoration-primary/50 underline-offset-4 hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline sm:self-auto">
          Clear all filters
        </button>
      </div>

      {loading && <LoadingState label="Loading reports..." />}
      {!invalidRange && isError && <ErrorState title="Reports could not be loaded" description={error.message || "Please try again in a moment."} />}

      {!invalidRange && !loading && !isError && data?.data.length === 0 && (
        <EmptyState
          title={page > 1 ? "No more reports on this page" : activeFilterCount ? "No matching reports" : "No reports to browse yet"}
          description={page > 1 ? "Try the previous page or adjust your filters." : activeFilterCount ? "Try a different search or clear the filters to see more reports." : "When campus members share a lost or found report, it will appear here."}
          action={activeFilterCount > 0 ? <button type="button" onClick={resetFilters} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted">Clear filters</button> : undefined}
        />
      )}

      {!invalidRange && !loading && !isError && data && data.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((item) => (
            <Link key={item.id} to={`/items/${item.id}`} aria-label={`View report: ${item.title}`} className="group block h-full rounded-2xl focus-visible:outline-offset-4">
              <ItemCard item={item} />
            </Link>
          ))}
        </div>
      )}

      <nav aria-label="Report pages" className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        <button type="button" disabled={invalidRange || currentPage <= 1 || loading} onClick={() => updatePage(currentPage - 1)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
          Previous page
        </button>
        <span aria-live="polite" className="text-center text-xs text-muted-foreground sm:text-sm">Page {currentPage}</span>
        <button type="button" disabled={invalidRange || !data?.hasMore || loading} onClick={() => updatePage(currentPage + 1)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
          Next page
        </button>
      </nav>
    </div>
  );
}

export default ItemsPage;
