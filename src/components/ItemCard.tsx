import type { ApiItem } from "../types/index";

interface ItemCardProps {
  item: ApiItem;
}

function ItemCard({ item }: ItemCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        {item.title}
      </h3>

      <p className="text-gray-600 dark:text-gray-300">{item.description}</p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Location: {item.location}
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Status: {item.status}
      </p>
    </div>
  );
}

export default ItemCard;
