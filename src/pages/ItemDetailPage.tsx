import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import type { ApiItem } from "../types/index";
import ItemCard from "../components/ItemCard";
import { fetchItemById } from "../api/client";

function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isPending, isError, error } = useQuery<ApiItem>({
    queryKey: ["items", id],
    queryFn: () => fetchItemById(id!),
    enabled: id !== undefined,
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
