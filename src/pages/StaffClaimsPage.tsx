import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  confirmClaimHandover,
  confirmItemCustody,
  fetchClaimsForReviewPage,
  fetchItemsForCustodyReviewPage,
  updateClaimStatus,
  updatePickupInstructions,
} from "../api/client";
import ClaimCard from "../components/ClaimCard";
import { Button } from "@/components/ui/button";
import type { ApiItem, ApiPage, ApiReviewClaim } from "../types/index";
import useAuthStore from "../store/authStore";

type Queue = "pending" | "awaiting_handover" | "completed" | "rejected" | "legacy";
const queueLabels: Record<Queue, string> = {
  pending: "Pending review",
  awaiting_handover: "Awaiting handover",
  completed: "Completed handovers",
  rejected: "Rejected / history",
  legacy: "Legacy cases",
};

function eventDate(value?: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not provided" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function isOpenFoundClaim(claim: ApiReviewClaim): boolean {
  if (!claim.item || claim.item.archivedAt) return false;
  const hasCustodyInformation = claim.item.custodyStatus === "finder_reported" ||
    claim.item.custodyStatus === "security_reported" ||
    claim.item.custodyStatus === "security_confirmed";
  if (!hasCustodyInformation) return false;
  const isPureLegacy = claim.item.reportType === undefined && claim.item.lifecycleStatus === undefined;
  return isPureLegacy
    ? claim.item.status === "found"
    : claim.item.reportType === "found" && claim.item.lifecycleStatus === "open" && claim.item.status === "found";
}

function custodyLabel(item: ApiItem): string {
  if (item.custodyStatus === "security_confirmed") return "Security-confirmed campus custody";
  if (item.custodyStatus === "security_reported") return "Reporter says it was turned over to security";
  if (item.custodyStatus === "finder_reported") return "Finder reports holding the item";
  return "No custody information";
}

function StaffClaimsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.userRole);
  const canReview = role === "security" || role === "admin";
  const [queue, setQueue] = useState<Queue>("pending");
  const [queuePage, setQueuePage] = useState(1);
  const [custodyPage, setCustodyPage] = useState(1);
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [handoverId, setHandoverId] = useState<string | null>(null);
  const [handoverConfirmed, setHandoverConfirmed] = useState(false);
  const [internalNote, setInternalNote] = useState("");

  const claims = useQuery<ApiPage<ApiReviewClaim>>({
    queryKey: ["claims", "review", queue, queuePage],
    queryFn: () => fetchClaimsForReviewPage(queue, queuePage),
    enabled: canReview,
  });
  const custody = useQuery<ApiPage<ApiItem>>({
    queryKey: ["items", "staff-custody", custodyPage],
    queryFn: () => fetchItemsForCustodyReviewPage(custodyPage),
    enabled: canReview,
  });

  const refresh = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["claims"] }),
      queryClient.invalidateQueries({ queryKey: ["receivedClaims"] }),
      queryClient.invalidateQueries({ queryKey: ["myReports"] }),
      queryClient.invalidateQueries({ queryKey: ["items"] }),
    ]);
  };
  const decision = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) => updateClaimStatus(id, status),
    onSuccess: refresh,
  });
  const saveInstructions = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => updatePickupInstructions(id, text),
    onSuccess: refresh,
  });
  const handover = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => confirmClaimHandover(id, note || undefined),
    onSuccess: async () => {
      setHandoverId(null);
      setHandoverConfirmed(false);
      setInternalNote("");
      await refresh();
    },
  });
  const confirmCustody = useMutation({
    mutationFn: confirmItemCustody,
    onSuccess: refresh,
  });

  if (!canReview) {
    return <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">Only active security or admin staff can access Claim review.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Claim review</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">Review private ownership proof, reserve eligible found items, and record physical handover only after it has occurred.</p>
      </header>

      <section aria-labelledby="claim-queue-heading">
        <h2 id="claim-queue-heading" className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Claim queues</h2>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Claim queues">
          {(Object.keys(queueLabels) as Queue[]).map((key) => (
            <Button key={key} type="button" variant={queue === key ? "default" : "outline"} aria-pressed={queue === key} onClick={() => { setQueue(key); setQueuePage(1); }}>{queueLabels[key]}</Button>
          ))}
        </div>
        {claims.isPending && <p role="status">Loading {queueLabels[queue].toLowerCase()}...</p>}
        {claims.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{claims.error.message}</p>}
        {decision.isError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-red-700">{decision.error.message}</p>}
        {saveInstructions.isError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-red-700">{saveInstructions.error.message}</p>}
        {handover.isError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-red-700">{handover.error.message}</p>}
        {!claims.isPending && !claims.isError && claims.data?.data.length === 0 && <p className="rounded-lg border border-gray-200 p-5 text-gray-700 dark:border-gray-700 dark:text-gray-300">There are no claims on this page of the queue.</p>}

        <div className="grid gap-4">
          {claims.data?.data.map((claim) => (
            <article key={claim.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <ClaimCard claim={claim} context="review" />
              {claim.claimant && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Claimant: {claim.claimant.name} · {claim.claimant.email}</p>}
              {queue === "pending" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!isOpenFoundClaim(claim) && <p className="basis-full text-sm text-amber-800 dark:text-amber-200">This Claim cannot be approved because the Item is missing, archived, lacks valid custody information, or is not an open found report.</p>}
                  <Button type="button" disabled={decision.isPending || !isOpenFoundClaim(claim)} onClick={() => decision.mutate({ id: claim.id, status: "approved" })}>Approve and reserve</Button>
                  <Button type="button" variant="outline" disabled={decision.isPending} onClick={() => decision.mutate({ id: claim.id, status: "rejected" })}>Reject Claim</Button>
                </div>
              )}

              {queue === "awaiting_handover" && (
                <div className="mt-4 grid gap-4">
                  <section className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Private pickup instructions</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Only this approved claimant and authorized staff can view these instructions.</p>
                    <label className="mt-3 grid gap-1 text-sm font-medium" htmlFor={`pickup-${claim.id}`}>Instructions
                      <textarea id={`pickup-${claim.id}`} value={instructions[claim.id] ?? claim.pickupInstructions ?? ""} onChange={(event) => setInstructions((current) => ({ ...current, [claim.id]: event.target.value }))} rows={3} maxLength={1000} placeholder="Enter a general pickup location or instructions to contact the campus security office. Do not assume a location or schedule." className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </label>
                    <Button type="button" className="mt-2" disabled={saveInstructions.isPending || (instructions[claim.id] ?? claim.pickupInstructions ?? "").trim().length < 5} onClick={() => saveInstructions.mutate({ id: claim.id, text: (instructions[claim.id] ?? claim.pickupInstructions ?? "").trim() })}>Save pickup instructions</Button>
                  </section>
                  <section className="rounded-md border border-amber-300 p-3 dark:border-amber-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Physical handover</h3>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">Claim approval only reserves the Item. Record this after staff have verified the approved claimant and the property is actually handed over.</p>
                    {handoverId !== claim.id ? (
                      <Button type="button" variant="outline" className="mt-3" onClick={() => { setHandoverId(claim.id); setHandoverConfirmed(false); setInternalNote(""); }}>Start handover confirmation</Button>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        <label className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
                          <input type="checkbox" checked={handoverConfirmed} onChange={(event) => setHandoverConfirmed(event.target.checked)} className="mt-1 size-4" />
                          I confirm the approved claimant has physically received this Item.
                        </label>
                        <label className="grid gap-1 text-sm font-medium" htmlFor={`handover-note-${claim.id}`}>Internal note (optional)
                          <textarea id={`handover-note-${claim.id}`} value={internalNote} maxLength={1000} onChange={(event) => setInternalNote(event.target.value)} rows={2} className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal text-foreground" />
                        </label>
                        <div className="flex gap-2">
                          <Button type="button" disabled={!handoverConfirmed || handover.isPending} onClick={() => handover.mutate({ id: claim.id, note: internalNote.trim() })}>{handover.isPending ? "Recording..." : "Confirm physical handover"}</Button>
                          <Button type="button" variant="outline" onClick={() => { setHandoverId(null); setHandoverConfirmed(false); }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {queue === "completed" && claim.handoverAt && <p className="mt-3 text-sm text-green-800 dark:text-green-200">Handover recorded {eventDate(claim.handoverAt)} by authorized staff.</p>}
              {queue === "rejected" && claim.decisionSource === "system" && claim.decisionReason && <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">System decision: {claim.decisionReason}. {eventDate(claim.decisionAt)}</p>}
              {queue === "legacy" && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">Historical approved Claim without reliable reservation or handover metadata. Review this case using campus records; no handover is assumed or recorded here.</p>}
            </article>
          ))}
        </div>
        {claims.data && claims.data.totalCount !== null && claims.data.totalCount > 0 && <nav aria-label={`${queueLabels[queue]} pages`} className="mt-4 flex items-center justify-between text-sm">
          <button type="button" disabled={queuePage <= 1 || claims.isPending} onClick={() => setQueuePage((current) => Math.max(1, current - 1))} className="underline disabled:opacity-50">Previous page</button>
          <span>Page {queuePage} · {claims.data.totalCount} Claims</span>
          <button type="button" disabled={!claims.data.hasMore || claims.isPending} onClick={() => setQueuePage((current) => current + 1)} className="underline disabled:opacity-50">Next page</button>
        </nav>}
      </section>

      <section aria-labelledby="custody-heading">
        <h2 id="custody-heading" className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Found-item custody</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">Staff can confirm custody after verifying the property is physically in campus security care.</p>
        {custody.isPending && <p role="status">Loading custody reports...</p>}
        {custody.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{custody.error.message}</p>}
        {custody.data?.data.length === 0 && <p className="rounded-lg border border-gray-200 p-4 text-gray-700 dark:border-gray-700 dark:text-gray-300">No found reports have custody information on this page.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {custody.data?.data.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white"><Link to={`/items/${item.id}`} className="underline">{item.title}</Link></h3>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{item.location} · {custodyLabel(item)}</p>
              {item.custodyStatus !== "security_confirmed" && <Button type="button" className="mt-3" disabled={confirmCustody.isPending} onClick={() => confirmCustody.mutate(item.id)}>Confirm campus security custody</Button>}
            </article>
          ))}
        </div>
        {custody.data && custody.data.totalCount !== null && custody.data.totalCount > 0 && <nav aria-label="Custody report pages" className="mt-4 flex items-center justify-between text-sm">
          <button type="button" disabled={custodyPage <= 1 || custody.isPending} onClick={() => setCustodyPage((current) => Math.max(1, current - 1))} className="underline disabled:opacity-50">Previous page</button>
          <span>Page {custodyPage} · {custody.data.totalCount} reports</span>
          <button type="button" disabled={!custody.data.hasMore || custody.isPending} onClick={() => setCustodyPage((current) => current + 1)} className="underline disabled:opacity-50">Next page</button>
        </nav>}
        {confirmCustody.isError && <p role="alert" className="mt-3 text-sm text-red-700">{confirmCustody.error.message}</p>}
      </section>
    </div>
  );
}

export default StaffClaimsPage;
