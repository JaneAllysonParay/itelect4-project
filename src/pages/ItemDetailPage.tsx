import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router";
import type { ApiItem } from "../types/index";
import ItemCard from "../components/ItemCard";
import { deleteItem, fetchItemById, fetchMyItemById } from "../api/client";
import useAuthStore from "../store/authStore";
import { isClaimableFoundItem, lifecycleLabel, lifecycleStatusOf, reportTypeLabel } from "../lib/itemLifecycle";

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

  if (isPending) {
    return (
      <div className="animate-pulse p-6 text-gray-900 dark:text-white">
        Loading item...
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
      <p className="mb-1 text-sm font-semibold text-blue-800 dark:text-blue-200">{reportTypeLabel(data)}</p>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        {data.title}
      </h1>
      <p className="mb-4 text-gray-700 dark:text-gray-300">{lifecycleLabel(data)}</p>

      <div className="max-w-sm">
        <ItemCard item={data} />
      </div>

      {data.ownerId === userId && userId !== null && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {lifecycleStatusOf(data) !== "open" ? (
            <p className="basis-full text-sm text-gray-600 dark:text-gray-300">
              {lifecycleStatusOf(data) === "unknown"
                ? "This report’s type or lifecycle information is incomplete or inconsistent, so it cannot be changed until reviewed."
                : "Reports that have left the open state can no longer be edited."}
            </p>
          ) : data.hasActiveClaims !== false ? (
            <p className="basis-full text-sm text-gray-600 dark:text-gray-300">Editing is paused while a Claim is active or its status could not be verified.</p>
          ) : (
            <Link
              to={`/items/${data.id}/edit`}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Edit item
            </Link>
          )}
          {data.canArchive === true && <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Archive this report? It will be hidden from public browsing, and its Claim and handover history will be kept.",
                )
              ) {
                removeItem.mutate(data.id);
              }
            }}
            disabled={removeItem.isPending}
            className="rounded bg-red-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
          >
            {removeItem.isPending ? "Archiving..." : "Archive item"}
          </button>}
          {removeItem.isError && (
            <p className="basis-full text-sm text-red-700">
              {removeItem.error.message}
            </p>
          )}
        </div>
      )}

      {data.reportType === "found" && data.custodyStatus && (
        <p className="mt-4 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
          Custody information: {data.custodyStatus === "finder_reported"
            ? "The finder reports still holding the item."
            : data.custodyStatus === "security_reported"
              ? "The report says the item was turned over to campus security."
              : "Campus security has confirmed custody."}
        </p>
      )}

      {isClaimableFoundItem(data, userId) && (
        <section className="mt-5 max-w-xl rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="font-semibold text-gray-900 dark:text-white">Think this found item belongs to you?</h2>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">Submit private ownership proof for authorized staff to review. Approval does not confirm physical handover.</p>
          {token
            ? <Link to={`/claims?itemId=${encodeURIComponent(data.id)}`} className="mt-3 inline-flex rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">Submit a Claim</Link>
            : <Link to="/login" className="mt-3 inline-flex rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">Sign in to submit a Claim</Link>}
        </section>
      )}

      {data.reportType === "lost" && (
        <p className="mt-4 max-w-xl text-sm text-gray-600 dark:text-gray-300">This is a lost-property report. Claims and pickup actions are available only for eligible found reports.</p>
      )}

      <button
        onClick={() => navigate("/items")}
        className="mt-4 rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Back to Items
      </button>
    </div>
  );
}

export default ItemDetailPage;
