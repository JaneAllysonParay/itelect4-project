import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type {
  ApiItem,
  ApiMyClaim,
  ApiReceivedClaim,
  ApiReviewClaim,
  ApiPage,
  ClaimDecisionStatus,
} from "../types/index";
import { claimSchema } from "../schemas/claimSchema";
import type { ClaimFormValues } from "../schemas/claimSchema";
import ClaimCard from "../components/ClaimCard";
import useAuthStore from "../store/authStore";

import PageHeader from "@/components/PageHeader";
import SectionCard from "@/components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/PageStates";
import FieldLabel from "@/components/FieldLabel";
import { Button } from "@/components/ui/button";
import { isClaimableFoundItem } from "../lib/itemLifecycle";

import {
  fetchClaimsPage,
  fetchClaimsForReviewPage,
  createClaim,
  fetchItemsPage,
  fetchReceivedClaimsPage,
  updateClaimStatus,
  fetchItemById,
} from "../api/client";

const fieldClassName = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ClaimsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedItemId = searchParams.get("itemId") ?? "";
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);
  const [itemPage, setItemPage] = useState(1);
  const [myClaimsPage, setMyClaimsPage] = useState(1);
  const [receivedPage, setReceivedPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const userId = useAuthStore((state) => state.userId);
  const userRole = useAuthStore((state) => state.userRole);
  const canReviewClaims = userRole === "security" || userRole === "admin";

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    mode: "onBlur",
    defaultValues: { itemId: "", proof: "" },
  });

  const items = useQuery<ApiPage<ApiItem>>({
    queryKey: ["items", "claim-selector", itemPage],
    queryFn: () => fetchItemsPage({ page: itemPage, limit: 20, reportType: "found", lifecycleStatus: "open" }),
  });
  const requestedItem = useQuery<ApiItem>({
    queryKey: ["items", requestedItemId],
    queryFn: () => fetchItemById(requestedItemId),
    enabled: Boolean(requestedItemId),
  });

  useEffect(() => {
    if (requestedItemId && requestedItem.data && isClaimableFoundItem(requestedItem.data, userId)) {
      setValue("itemId", requestedItemId, { shouldValidate: true });
    }
  }, [requestedItemId, requestedItem.data, setValue, userId]);

  const myClaims = useQuery<ApiPage<ApiMyClaim>>({
    queryKey: ["claims", "mine", myClaimsPage],
    queryFn: () => fetchClaimsPage(myClaimsPage),
  });
  const receivedClaims = useQuery<ApiPage<ApiReceivedClaim>>({
    queryKey: ["receivedClaims", receivedPage],
    queryFn: () => fetchReceivedClaimsPage(receivedPage),
  });
  const reviewClaims = useQuery<ApiPage<ApiReviewClaim>>({
    queryKey: ["claims", "review", "pending", reviewPage],
    queryFn: () => fetchClaimsForReviewPage("pending", reviewPage),
    enabled: canReviewClaims,
  });

  const addClaim = useMutation({
    mutationFn: createClaim,
    onMutate: () => setClaimSuccess(false),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["claims"] }),
        queryClient.invalidateQueries({ queryKey: ["claims", "review"] }),
      ]);
      reset();
      setClaimSuccess(true);
    },
  });

  const decideClaim = useMutation({
    mutationFn: (decision: { id: string; status: ClaimDecisionStatus }) =>
      updateClaimStatus(decision.id, decision.status),
    onMutate: () => setDecisionMessage(null),
    onSuccess: async (_updatedClaim, decision) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["claims"] }),
        queryClient.invalidateQueries({ queryKey: ["receivedClaims"] }),
        queryClient.invalidateQueries({ queryKey: ["items"] }),
        queryClient.invalidateQueries({ queryKey: ["claims", "review"] }),
      ]);
      setDecisionMessage(
        decision.status === "approved"
          ? "Claim approved and the found item reserved. Staff must separately confirm physical handover."
          : "Claim rejected.",
      );
    },
  });

  const onSubmit = (values: ClaimFormValues): void => {
    setClaimSuccess(false);
    addClaim.mutate({ itemId: values.itemId, proof: values.proof });
  };

  const claimableItems = (items.data?.data ?? []).filter((item) => isClaimableFoundItem(item, userId));
  if (requestedItem.data && isClaimableFoundItem(requestedItem.data, userId) && !claimableItems.some((item) => item.id === requestedItem.data!.id)) {
    claimableItems.unshift(requestedItem.data);
  }
  const showMyClaimsPagination = Boolean(myClaims.data && (myClaimsPage > 1 || myClaims.data.hasMore || (myClaims.data.totalCount !== null && myClaims.data.totalCount > 0)));
  const showReceivedPagination = Boolean(receivedClaims.data && (receivedPage > 1 || receivedClaims.data.hasMore || (receivedClaims.data.totalCount !== null && receivedClaims.data.totalCount > 0)));

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <PageHeader
        title="Claims"
        description="Submit private ownership proof for an eligible found report, track your own submissions, or review Claims received on your reports."
        eyebrow="Ownership and follow-up"
        actions={(
          <>
            <Link to="/my-claims" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted">My Claims</Link>
            {canReviewClaims && <Link to="/staff/claims" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Staff Claim review</Link>}
          </>
        )}
      />

      <form onSubmit={handleSubmit(onSubmit)} aria-busy={addClaim.isPending}>
        <SectionCard title="Submit an ownership Claim" description="Choose an eligible found report and tell authorized campus staff how you can identify the property.">
          <div className="grid min-w-0 gap-5">
            <div className="grid min-w-0 gap-2">
              <FieldLabel htmlFor="itemId">Item</FieldLabel>
              <select id="itemId" {...register("itemId")} aria-required="true" aria-invalid={Boolean(errors.itemId)} aria-describedby={errors.itemId ? "itemId-help itemId-error" : "itemId-help"} className={fieldClassName}>
                <option value="">Select an item...</option>
                {claimableItems.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <p id="itemId-help" className="text-sm leading-relaxed text-muted-foreground">Only eligible found reports from other users are available. The server checks eligibility again when you submit.</p>
              {errors.itemId && <p id="itemId-error" className="text-sm text-destructive">{errors.itemId.message}</p>}
              {items.isPending && <p role="status" className="text-sm text-muted-foreground">Loading eligible found reports...</p>}
              {items.isError && <p role="alert" className="break-words text-sm text-destructive">Eligible reports could not be loaded. {items.error.message}</p>}
              {requestedItemId && requestedItem.isPending && <p role="status" className="text-sm text-muted-foreground">Checking the report opened from the item details page...</p>}
              {requestedItemId && requestedItem.isError && <p className="break-words text-sm text-muted-foreground">The requested report could not be checked. Select an eligible found report from the list.</p>}
              {items.data && !items.isPending && !items.isError && claimableItems.length === 0 && (
                <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
                  {items.data.hasMore ? "There are no eligible found reports on this page. Check the next page or browse reports." : "There are no eligible found reports available on this page."}
                </p>
              )}
              {items.data && (items.data.totalCount !== null || items.data.hasMore || itemPage > 1) && (
                <nav aria-label="Claimable item pages" className="mt-1 flex flex-col gap-2 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="outline" size="sm" disabled={itemPage <= 1 || items.isPending} onClick={() => setItemPage((current) => Math.max(1, current - 1))}>Previous reports</Button>
                  <span className="text-center text-muted-foreground">Page {itemPage} · {items.data.totalCount ?? "count unavailable"} eligible found reports</span>
                  <Button type="button" variant="outline" size="sm" disabled={!items.data.hasMore || items.isPending} onClick={() => setItemPage((current) => current + 1)}>More reports</Button>
                </nav>
              )}
            </div>

            <div className="grid min-w-0 gap-2">
              <FieldLabel htmlFor="proof">Private ownership proof</FieldLabel>
              <textarea
                id="proof"
                {...register("proof")}
                aria-required="true"
                aria-invalid={Boolean(errors.proof)}
                aria-describedby={errors.proof ? "proof-help proof-error" : "proof-help"}
                rows={4}
                className={`${fieldClassName} min-h-32 resize-y`}
                placeholder="Describe a detail that helps staff verify the item belongs to you"
              />
              <p id="proof-help" className="text-sm leading-relaxed text-muted-foreground">Only authorized campus staff review this proof. Keep private ownership evidence out of public report descriptions.</p>
              {errors.proof && <p id="proof-error" className="break-words text-sm text-destructive">{errors.proof.message}</p>}
            </div>

            {addClaim.isError && <p role="alert" className="break-words rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Your Claim could not be submitted. {addClaim.error.message}</p>}
            {claimSuccess && <p role="status" className="break-words rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm leading-relaxed text-foreground">Claim submitted. Authorized staff will review your proof. This does not approve the Claim or authorize pickup. <Link to="/my-claims" className="font-medium text-primary underline underline-offset-4">Track it in My Claims</Link>.</p>}
            <Button type="submit" disabled={addClaim.isPending || claimableItems.length === 0} className="w-full sm:w-auto sm:justify-self-start">
              {addClaim.isPending ? "Submitting Claim..." : "Submit Claim"}
            </Button>
          </div>
        </SectionCard>
      </form>

      <section aria-labelledby="received-claims-heading" className="space-y-4">
        <header>
          <h2 id="received-claims-heading" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Claims on your reports</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">This view shows Claim status and report details. Private ownership proof is not shown here.</p>
        </header>
        {receivedClaims.isPending && <LoadingState label="Loading Claims on your reports..." />}
        {receivedClaims.isError && <ErrorState title="Claims on your reports could not be loaded" description={receivedClaims.error.message || "Please try again."} />}
        {receivedClaims.data?.data.length === 0 && receivedPage === 1 && <EmptyState title="No Claims received" description="Claims submitted on your reports will appear here. Private proof stays limited to authorized review." />}
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {receivedClaims.data?.data.map((claim) => <ClaimCard key={claim.id} claim={claim} context="received" />)}
        </div>
        {showReceivedPagination && receivedClaims.data && (
          <nav aria-label="Received Claim pages" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" disabled={receivedPage <= 1 || receivedClaims.isPending} onClick={() => setReceivedPage((current) => Math.max(1, current - 1))} className="w-full sm:w-auto">Previous page</Button>
            <p className="text-center text-sm text-muted-foreground">Page {receivedPage} · {receivedClaims.data.totalCount ?? "count unavailable"} received Claims</p>
            <Button type="button" variant="outline" disabled={!receivedClaims.data.hasMore || receivedClaims.isPending} onClick={() => setReceivedPage((current) => current + 1)} className="w-full sm:w-auto">Next page</Button>
          </nav>
        )}
      </section>

      {canReviewClaims && (
        <section aria-labelledby="review-claims-heading" className="space-y-4">
          <header>
            <h2 id="review-claims-heading" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Claims awaiting staff review</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Staff review controls and eligibility checks remain available for authorized roles.</p>
          </header>
          {reviewClaims.isPending && <LoadingState label="Loading claims for review..." />}
          {reviewClaims.isError && <ErrorState title="Claims for review could not be loaded" description={reviewClaims.error.message || "Please try again."} />}
          {reviewClaims.data?.data.length === 0 && reviewPage === 1 && <EmptyState title="No pending Claims" description="There are no pending Claims on this page of the staff review queue." />}
          {decisionMessage && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-foreground">{decisionMessage}</p>}
          {decideClaim.isError && <ErrorState title="The Claim decision could not be saved" description={decideClaim.error.message || "Please try again."} />}
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {reviewClaims.data?.data.map((claim) => (
              <article key={claim.id} className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <ClaimCard claim={claim} context="review" />
                {claim.item?.archivedAt ? (
                  <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-foreground">This item is archived. The pending claim can be rejected but cannot be approved.</p>
                ) : claim.item === null ? (
                  <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-foreground">Item details are unavailable. This claim cannot be approved.</p>
                ) : !isClaimableFoundItem(claim.item as ApiItem, userId) ? (
                  <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-foreground">This item is unavailable for claims and cannot be approved.</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={decideClaim.isPending || !claim.item || Boolean(claim.item.archivedAt) || !isClaimableFoundItem(claim.item as ApiItem, userId)}
                    onClick={() => decideClaim.mutate({ id: claim.id, status: "approved" })}
                  >Approve</Button>
                  <Button type="button" variant="outline" disabled={decideClaim.isPending} onClick={() => decideClaim.mutate({ id: claim.id, status: "rejected" })}>Reject</Button>
                </div>
              </article>
            ))}
          </div>
          {reviewClaims.data && (reviewPage > 1 || reviewClaims.data.hasMore || (reviewClaims.data.totalCount !== null && reviewClaims.data.totalCount > 0)) && (
            <nav aria-label="Pending review Claim pages" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" disabled={reviewPage <= 1 || reviewClaims.isPending} onClick={() => setReviewPage((current) => Math.max(1, current - 1))} className="w-full sm:w-auto">Previous page</Button>
              <p className="text-center text-sm text-muted-foreground">Page {reviewPage} · {reviewClaims.data.totalCount ?? "count unavailable"} pending Claims</p>
              <Button type="button" variant="outline" disabled={!reviewClaims.data.hasMore || reviewClaims.isPending} onClick={() => setReviewPage((current) => current + 1)} className="w-full sm:w-auto">Next page</Button>
            </nav>
          )}
        </section>
      )}

      <section aria-labelledby="my-submissions-heading" className="space-y-4">
        <header>
          <h2 id="my-submissions-heading" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Your submissions</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">See the Claims you submitted, including pending staff decisions.</p>
        </header>
        {myClaims.isPending && <LoadingState label="Loading your Claim submissions..." />}
        {myClaims.isError && <ErrorState title="Your Claim submissions could not be loaded" description={myClaims.error.message || "Please try again."} />}
        {myClaims.data?.data.length === 0 && myClaimsPage === 1 && <EmptyState title="No Claim submissions yet" description="When you submit a Claim, its status and any supported handover record will appear here." />}
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {myClaims.data?.data.map((claim) => <ClaimCard key={claim.id} claim={claim} context="mine" />)}
        </div>
        {showMyClaimsPagination && myClaims.data && (
          <nav aria-label="My Claim pages" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" disabled={myClaimsPage <= 1 || myClaims.isPending} onClick={() => setMyClaimsPage((current) => Math.max(1, current - 1))} className="w-full sm:w-auto">Previous page</Button>
            <p className="text-center text-sm text-muted-foreground">Page {myClaimsPage} · {myClaims.data.totalCount ?? "count unavailable"} Claims</p>
            <Button type="button" variant="outline" disabled={!myClaims.data.hasMore || myClaims.isPending} onClick={() => setMyClaimsPage((current) => current + 1)} className="w-full sm:w-auto">Next page</Button>
          </nav>
        )}
      </section>
    </div>
  );
}

export default ClaimsPage;
