import React from "react";
import type { Item } from "../types";

interface ItemCardProps {
  item: Item;
  onSelect: (item: Item) => void;
  variant?: "default" | "compact";
}

const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onSelect,
  variant = "default",
}) => {
  const isCompact = variant === "compact";

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    onSelect(item);
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
        isCompact ? "p-3" : "p-5"
      }`}
    >
      <h3
        className={`font-bold text-gray-900 dark:text-white ${
          isCompact ? "text-sm" : "text-lg"
        }`}
      >
        {item.title}
      </h3>

      {!isCompact && (
        <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
      )}

      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        <p>Location: {item.location}</p>
        <p>Status: {item.status}</p>
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        View This Item
      </button>
    </div>
  );
};

export default ItemCard;
