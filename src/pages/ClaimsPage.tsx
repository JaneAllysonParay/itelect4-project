import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type {
  ApiClaim,
  ApiItem,
  ApiReceivedClaim,
  ApiReviewClaim,
  ApiPage,
  ClaimDecisionStatus,
} from "../types/index";
import { claimSchema } from "../schemas/claimSchema";
import type { ClaimFormValues } from "../schemas/claimSchema";
import ClaimCard from "../components/ClaimCard";
import useAuthStore from "../store/authStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function ClaimsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedItemId = searchParams.get("itemId") ?? "";
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);
  const [itemPage, setItemPage] = useState(1);
  const [myClaimsPage, setMyClaimsPage] = useState(1);
  const [receivedPage, setReceivedPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
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
    defaultValues: {
      itemId: "",
      proof: "",
    },
  });

  useEffect(() => {
    if (requestedItemId) setValue("itemId", requestedItemId, { shouldValidate: true });
  }, [requestedItemId, setValue]);

  const items = useQuery<ApiPage<ApiItem>>({
    queryKey: ["items", "claim-selector", itemPage],
    queryFn: () => fetchItemsPage({ page: itemPage, limit: 20, reportType: "found", lifecycleStatus: "open" }),
  });
  const requestedItem = useQuery<ApiItem>({
    queryKey: ["items", requestedItemId],
    queryFn: () => fetchItemById(requestedItemId),
    enabled: Boolean(requestedItemId),
  });

  const myClaims = useQuery<ApiPage<ApiClaim>>({
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

  const {
    isPending,
    isError,
    error,
  } = myClaims;

  const addClaim = useMutation({
    mutationFn: createClaim,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["claims"],
      });
      queryClient.invalidateQueries({ queryKey: ["claims", "review"] });

      reset();
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
    addClaim.mutate({
      itemId: values.itemId,
      proof: values.proof,
    });
  };

  const claimableItems = (items.data?.data ?? []).filter((item) => isClaimableFoundItem(item, userId));
  if (requestedItem.data && isClaimableFoundItem(requestedItem.data, userId) && !claimableItems.some((item) => item.id === requestedItem.data!.id)) {
    claimableItems.unshift(requestedItem.data);
  }

  if (isPending) {
    return (
      <div className="animate-pulse p-6 text-gray-900 dark:text-white">
        Loading claims...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        {error.message}
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        Claims
      </h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Track your submissions in <Link to="/my-claims" className="text-blue-800 underline dark:text-blue-200">My Claims</Link>.
        {canReviewClaims && <> Staff can manage all review and handover queues in <Link to="/staff/claims" className="text-blue-800 underline dark:text-blue-200">Staff Claim review</Link>.</>}
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mb-6 grid gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="itemId" className="text-foreground">
            Item
          </Label>

          <select
            id="itemId"
            {...register("itemId")}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
          >
            <option value="">Select an item...</option>

            {claimableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
          </select>
          {items.isPending && <p role="status" className="text-sm text-gray-600 dark:text-gray-300">Loading eligible found reports...</p>}
          {items.data && <nav aria-label="Claimable item pages" className="mt-2 flex items-center justify-between text-sm">
            <button type="button" disabled={itemPage <= 1 || items.isPending} onClick={() => setItemPage((current) => Math.max(1, current - 1))} className="underline disabled:opacity-50">Previous reports</button>
            <span>Page {itemPage} · {items.data.totalCount ?? "count unavailable"} eligible found reports</span>
            <button type="button" disabled={!items.data.hasMore || items.isPending} onClick={() => setItemPage((current) => current + 1)} className="underline disabled:opacity-50">More reports</button>
          </nav>}

          {errors.itemId && (
            <p className="text-sm text-red-600">{errors.itemId.message}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="proof" className="text-foreground">
            Proof
          </Label>

          <Input
            id="proof"
            {...register("proof")}
            aria-invalid={errors.proof ? true : undefined}
            placeholder="Describe your proof of ownership"
          />

          {errors.proof && (
            <p className="text-sm text-red-600">{errors.proof.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={addClaim.isPending}
          className="justify-self-start"
        >
          {addClaim.isPending ? "Saving..." : "Add claim"}
        </Button>
      </form>

      {items.isError && (
        <p className="mb-4 text-sm text-red-700">{items.error.message}</p>
      )}

      {addClaim.isError && (
        <p className="mb-4 text-sm text-red-700">{addClaim.error.message}</p>
      )}

      <section className="mb-8">
        <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          Claims on your items
        </h3>

        {receivedClaims.isPending && <p>Loading received claims...</p>}
        {receivedClaims.isError && (
          <p className="mb-4 text-sm text-red-700">
            {receivedClaims.error.message}
          </p>
        )}
        {receivedClaims.data?.data.length === 0 && receivedPage === 1 && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No one has claimed your items yet.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {receivedClaims.data?.data.map((claim) => (
            <div key={claim.id}>
              <ClaimCard claim={claim} />
            </div>
          ))}
        </div>
        {receivedClaims.data && receivedClaims.data.totalCount !== null && receivedClaims.data.totalCount > 0 && <nav aria-label="Received Claim pages" className="mt-3 flex items-center justify-between text-sm">
          <button type="button" disabled={receivedPage <= 1} onClick={() => setReceivedPage((current) => Math.max(1, current - 1))} className="underline disabled:opacity-50">Previous</button>
          <span>Page {receivedPage} · {receivedClaims.data.totalCount} received Claims</span>
          <button type="button" disabled={!receivedClaims.data.hasMore} onClick={() => setReceivedPage((current) => current + 1)} className="underline disabled:opacity-50">Next</button>
        </nav>}
      </section>

      {canReviewClaims && (
        <section className="mb-8">
          <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
            Claims awaiting staff review
          </h3>
          {reviewClaims.isPending && <p>Loading claims for review...</p>}
          {reviewClaims.isError && (
            <p className="mb-4 text-sm text-red-700">
              {reviewClaims.error.message}
            </p>
          )}
          {reviewClaims.data?.data.length === 0 && reviewPage === 1 && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No pending claims need review.
            </p>
          )}
          {decisionMessage && (
            <p role="status" className="mb-3 text-sm text-green-700">
              {decisionMessage}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {reviewClaims.data?.data.map((claim) => (
              <div key={claim.id}>
                <ClaimCard claim={claim} />
                {claim.item?.archivedAt ? (
                  <p className="mt-2 text-sm text-amber-700">
                    This item is archived. The pending claim can be rejected but
                    cannot be approved.
                  </p>
                ) : claim.item === null ? (
                  <p className="mt-2 text-sm text-amber-700">
                    Item details are unavailable. This claim cannot be approved.
                  </p>
              ) : !isClaimableFoundItem(claim.item as ApiItem, userId) ? (
                  <p className="mt-2 text-sm text-amber-700">
                    This item is unavailable for claims and cannot be approved.
                  </p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    disabled={
                      decideClaim.isPending ||
                      !claim.item ||
                      Boolean(claim.item.archivedAt) ||
                      !isClaimableFoundItem(claim.item as ApiItem, userId)
                    }
                    onClick={() =>
                      decideClaim.mutate({ id: claim.id, status: "approved" })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={decideClaim.isPending}
                    onClick={() =>
                      decideClaim.mutate({ id: claim.id, status: "rejected" })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {reviewClaims.data && reviewClaims.data.totalCount !== null && reviewClaims.data.totalCount > 0 && <nav aria-label="Pending review Claim pages" className="mt-3 flex items-center justify-between text-sm">
            <button type="button" disabled={reviewPage <= 1} onClick={() => setReviewPage((current) => Math.max(1, current - 1))} className="underline disabled:opacity-50">Previous</button>
            <span>Page {reviewPage} · {reviewClaims.data.totalCount} pending Claims</span>
            <button type="button" disabled={!reviewClaims.data.hasMore} onClick={() => setReviewPage((current) => current + 1)} className="underline disabled:opacity-50">Next</button>
          </nav>}
          {decideClaim.isError && (
            <p className="mt-3 text-sm text-red-700">
              {decideClaim.error.message}
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(myClaims.data?.data ?? []).map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>
      {myClaims.data && myClaims.data.totalCount !== null && myClaims.data.totalCount > 0 && <nav aria-label="My Claim pages" className="mt-5 flex items-center justify-between text-sm">
        <button type="button" disabled={myClaimsPage <= 1} onClick={() => setMyClaimsPage((current) => Math.max(1, current - 1))} className="underline disabled:opacity-50">Previous</button>
        <span>Page {myClaimsPage} · {myClaims.data.totalCount} Claims</span>
        <button type="button" disabled={!myClaims.data.hasMore} onClick={() => setMyClaimsPage((current) => current + 1)} className="underline disabled:opacity-50">Next</button>
      </nav>}
    </div>
  );
}

export default ClaimsPage;
