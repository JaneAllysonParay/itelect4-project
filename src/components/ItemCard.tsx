import React from "react";
import type { Item } from "../types";

interface ItemCardProps {
  item: Item;
  onSelect: (item: Item) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onSelect }) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    onSelect(item);
  };

  return (
    <div className="item-card">
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <div className="item-details">
      <p>Location: {item.location}</p>
      <p>Status: {item.status}</p>
</div>
      <button type="button" onClick={handleClick}>
       View This Item
      </button>
    </div>
  );
};

export default ItemCard;
