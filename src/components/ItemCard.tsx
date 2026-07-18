// src/components/CourseCard.tsx
import type { Item} from "../types/";
interface ItemCardProps {
    item: Item;
}
function ItemCard({ item }: ItemCardProps) {
  return (
    <div className="item-card">
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <p>Location: {item.location}</p>
      <p>Status: {item.status}</p>
    </div>
  );
}
export default ItemCard;
