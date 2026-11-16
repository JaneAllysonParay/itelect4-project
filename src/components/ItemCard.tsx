import { CalendarDays, MapPin, Package } from "lucide-react";
import type { ApiItem } from "../types/index";
import { lifecycleLabel, lifecycleStatusOf, reportTypeLabel, reportTypeOf } from "../lib/itemLifecycle";
import StatusBadge, { type StatusTone } from "./StatusBadge";

interface ItemCardProps {
  item: ApiItem;
  headingLevel?: "page" | "section";
}

function formatDate(value?: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function categoryLabel(category?: ApiItem["category"]): string | null {
  if (!category) return null;
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function ItemCard({ item, headingLevel = "section" }: ItemCardProps) {
  const reportType = reportTypeOf(item);
  const lifecycleStatus = lifecycleStatusOf(item);
  const category = categoryLabel(item.category);
  const statusTone: StatusTone = lifecycleStatus === "unknown" ? "unknown" : lifecycleStatus;
  const typeTone: StatusTone = reportType === "unknown" ? "unknown" : reportType;
  const Title = headingLevel === "page" ? "h1" : "h2";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors group-hover:border-primary/40 group-hover:shadow-md sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-primary">
          <Package className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={typeTone}>{reportTypeLabel(item)}</StatusBadge>
            <StatusBadge tone={statusTone} title={lifecycleLabel(item)}>{lifecycleLabel(item)}</StatusBadge>
          </div>
          {category && <p className="mt-2 text-xs font-medium text-muted-foreground">{category}</p>}
        </div>
      </div>

      <Title className="mt-4 text-lg leading-snug font-semibold tracking-tight text-card-foreground">{item.title}</Title>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.description}</p>

      <dl className="mt-auto grid gap-3 border-t border-border pt-4 text-sm">
        <div className="flex items-start gap-2.5">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs font-medium text-muted-foreground">Reported location</dt>
            <dd className="mt-0.5 break-words font-medium text-card-foreground">{item.location}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs font-medium text-muted-foreground">Event date</dt>
            <dd className="mt-0.5 font-medium text-card-foreground">{formatDate(item.eventAt)}</dd>
          </div>
        </div>
      </dl>
    </article>
  );
}

export default ItemCard;
