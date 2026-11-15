import type { ApiItem } from "../types/index";
import { lifecycleLabel, reportTypeLabel } from "../lib/itemLifecycle";

interface ItemCardProps {
  item: ApiItem;
}

function formatDate(value?: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function ItemCard({ item }: ItemCardProps) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-200">{reportTypeLabel(item)}</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{item.title}</h2>
      <p className="mt-1 text-gray-700 dark:text-gray-300">{item.description}</p>
      <dl className="mt-3 grid gap-1 text-sm text-gray-600 dark:text-gray-300">
        <div><dt className="inline font-medium">Location: </dt><dd className="inline">{item.location}</dd></div>
        <div><dt className="inline font-medium">Event date: </dt><dd className="inline">{formatDate(item.eventAt)}</dd></div>
        <div><dt className="inline font-medium">Status: </dt><dd className="inline">{lifecycleLabel(item)}</dd></div>
      </dl>
    </article>
  );
}

export default ItemCard;
