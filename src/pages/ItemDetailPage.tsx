import { useParams, useNavigate } from "react-router";
import ItemCard from "../components/ItemCard";
import { allLostItems } from "../data/mockData";

function ItemDetailPage() {
  // Reads whatever is in the :id slot of the URL
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Convert the URL parameter from string to number
  const itemId = Number(id);

  // Turn that ID into a real Item object
  const item = allLostItems.find((i) => i.id === itemId);

  // The URL is user input -- they can type anything. Handle that.
  if (item === undefined) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        No item found with ID "{id}".
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        {item.title}
      </h2>

      <div className="max-w-sm">
        <ItemCard item={item} />
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
