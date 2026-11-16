import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router";
import type { ApiItem } from "../types/index";
import ItemCard from "../components/ItemCard";
import { ErrorState, LoadingState } from "../components/PageStates";
import { deleteItem, fetchItemById, fetchMyItemById } from "../api/client";
import useAuthStore from "../store/authStore";
import { isClaimableFoundItem, lifecycleStatusOf } from "../lib/itemLifecycle";

function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const token = useAuthStore((state) => state.token);

  const { data, isPending, isError, error } = useQuery<ApiItem>({
    queryKey: ["items", id, userId ?? "public"],
    queryFn: async () => {
      const publicItem = await fetchItemById(id!);
      if (token && userId && publicItem.ownerId === userId) return fetchMyItemById(id!);
      return publicItem;
    },
    enabled: id !== undefined,
  });

  const removeItem = useMutation({
    mutationFn: deleteItem,
    onSuccess: async (_result, itemId) => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.removeQueries({ queryKey: ["items", itemId] });
      navigate("/items");
    },
  });

  if (isPending) return <LoadingState label="Loading item..." />;

  if (isError) {
    return (
      <div className="max-w-3xl space-y-4">
        <ErrorState title="This report could not be loaded" description={error.message || "Please try again in a moment."} />
        <Link to="/items" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary underline decoration-primary/50 underline-offset-4 hover:bg-accent">
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to Items
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/items" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary underline decoration-primary/50 underline-offset-4 hover:bg-accent">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to Items
      </Link>

      <div className="max-w-3xl">
        <ItemCard item={data} headingLevel="page" />
      </div>

      {data.ownerId === userId && userId !== null && (
        <section aria-label="Manage your report" className="flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 sm:p-5">
          {lifecycleStatusOf(data) !== "open" ? (
            <p className="basis-full text-sm leading-relaxed text-muted-foreground">
              {lifecycleStatusOf(data) === "unknown"
                ? "This report’s type or lifecycle information is incomplete or inconsistent, so it cannot be changed until reviewed."
                : "Reports that have left the open state can no longer be edited."}
            </p>
          ) : data.hasActiveClaims !== false ? (
            <p className="basis-full text-sm leading-relaxed text-muted-foreground">Editing is paused while a Claim is active or its status could not be verified.</p>
          ) : (
            <Link to={`/items/${data.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Edit item
            </Link>
          )}
          {data.canArchive === true && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Archive this report? It will be hidden from public browsing, and its Claim and handover history will be kept.")) {
                  removeItem.mutate(data.id);
                }
              }}
              disabled={removeItem.isPending}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removeItem.isPending ? "Archiving..." : "Archive item"}
            </button>
          )}
          {removeItem.isError && <p role="alert" className="basis-full text-sm text-destructive">{removeItem.error.message}</p>}
        </section>
      )}

      {data.reportType === "found" && data.custodyStatus && (
        <p className="max-w-3xl rounded-xl border border-border bg-muted/70 p-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Custody information: </span>
          {data.custodyStatus === "finder_reported"
            ? "The finder reports still holding the item."
            : data.custodyStatus === "security_reported"
              ? "The report says the item was turned over to campus security."
              : "Campus security has confirmed custody."}
        </p>
      )}

      {isClaimableFoundItem(data, userId) && (
        <section className="max-w-3xl rounded-2xl border border-accent-foreground/20 bg-accent/50 p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Think this found item belongs to you?</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Submit private ownership proof for authorized staff to review. Approval does not confirm physical handover.</p>
          {token
            ? <Link to={`/claims?itemId=${encodeURIComponent(data.id)}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Submit a Claim</Link>
            : <Link to="/login" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Sign in to submit a Claim</Link>}
        </section>
      )}

      {data.reportType === "lost" && (
        <p className="max-w-3xl rounded-xl border border-border bg-muted/70 p-4 text-sm leading-relaxed text-muted-foreground">This is a lost-property report. Claims and pickup actions are available only for eligible found reports.</p>
      )}
    </div>
  );
}

export default ItemDetailPage;
