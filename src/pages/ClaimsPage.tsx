import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type {
  ApiClaim,
  ApiItem,
  ClaimDecisionStatus,
} from "../types/index";
import { claimSchema } from "../schemas/claimSchema";
import type { ClaimFormValues } from "../schemas/claimSchema";
import ClaimCard from "../components/ClaimCard";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  fetchClaims,
  createClaim,
  fetchItems,
  fetchReceivedClaims,
  updateClaimStatus,
} from "../api/client";

function ClaimsPage() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    mode: "onBlur",
    defaultValues: {
      itemId: "",
      proof: "",
    },
  });

  const items = useQuery<ApiItem[]>({
    queryKey: ["items"],
    queryFn: fetchItems,
  });

  const {
    data,
    isPending,
    isError,
    error,
  } = useQuery<ApiClaim[]>({
    queryKey: ["claims"],
    queryFn: fetchClaims,
  });

  const receivedClaims = useQuery<ApiClaim[]>({
    queryKey: ["receivedClaims"],
    queryFn: fetchReceivedClaims,
  });

  const addClaim = useMutation({
    mutationFn: createClaim,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["claims"],
      });

      reset();
    },
  });

  const decideClaim = useMutation({
    mutationFn: (decision: { id: string; status: ClaimDecisionStatus }) =>
      updateClaimStatus(decision.id, decision.status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["claims"] }),
        queryClient.invalidateQueries({ queryKey: ["receivedClaims"] }),
        queryClient.invalidateQueries({ queryKey: ["items"] }),
      ]);
    },
  });

  const onSubmit = (values: ClaimFormValues): void => {
    addClaim.mutate({
      itemId: values.itemId,
      proof: values.proof,
    });
  };

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

            {items.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>

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
        {receivedClaims.data?.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No one has claimed your items yet.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {receivedClaims.data?.map((claim) => (
            <div key={claim.id}>
              <ClaimCard claim={claim} />
              {claim.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    disabled={decideClaim.isPending}
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
              )}
            </div>
          ))}
        </div>
        {decideClaim.isError && (
          <p className="mt-3 text-sm text-red-700">{decideClaim.error.message}</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>
    </div>
  );
}

export default ClaimsPage;
