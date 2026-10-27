import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router";
import type { ApiItem } from "../types/index";
import ItemCard from "../components/ItemCard";
import { deleteItem, fetchItemById } from "../api/client";
import useAuthStore from "../store/authStore";

function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  const { data, isPending, isError, error } = useQuery<ApiItem>({
    queryKey: ["items", id],
    queryFn: () => fetchItemById(id!),
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
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        {data.title}
      </h2>

      <div className="max-w-sm">
        <ItemCard item={data} />
      </div>

      {data.ownerId === userId && userId !== null && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            to={`/items/${data.id}/edit`}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Edit item
          </Link>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this item? This cannot be undone.")) {
                removeItem.mutate(data.id);
              }
            }}
            disabled={removeItem.isPending}
            className="rounded bg-red-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
          >
            {removeItem.isPending ? "Deleting..." : "Delete item"}
          </button>
          {removeItem.isError && (
            <p className="basis-full text-sm text-red-700">
              {removeItem.error.message}
            </p>
          )}
        </div>
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
