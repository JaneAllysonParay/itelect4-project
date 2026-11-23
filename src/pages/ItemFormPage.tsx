import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import { ErrorState, LoadingState } from "@/components/PageStates";
import PageHeader from "@/components/PageHeader";
import SectionCard from "@/components/SectionCard";
import FieldLabel from "@/components/FieldLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createItem, fetchItemById, updateItem } from "../api/client";
import { lifecycleStatusOf, reportTypeOf } from "../lib/itemLifecycle";
import { itemSchema, type ItemFormInput, type ItemFormValues } from "../schemas/itemSchema";
import useAuthStore from "../store/authStore";
import type { ApiItem } from "../types/index";

function localDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

const fieldClassName = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function FieldError({ id, children }: { id: string; children?: string }) {
  return children ? <p id={id} className="break-words text-sm text-destructive">{children}</p> : null;
}

function ItemFormPage() {
  const { id, reportType: routeReportType } = useParams<{ id: string; reportType: string }>();
  const reportType = routeReportType === "lost" || routeReportType === "found" ? routeReportType : undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  const item = useQuery<ApiItem>({
    queryKey: ["items", id],
    queryFn: () => fetchItemById(id!),
    enabled: id !== undefined,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormInput, unknown, ItemFormValues>({
    resolver: zodResolver(itemSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      location: "",
      reportType: reportType ?? "lost",
      eventAt: "",
      category: undefined,
      custodyStatus: undefined,
      isExistingReport: false,
    },
  });

  useEffect(() => {
    if (!item.data) return;
    const currentType = reportTypeOf(item.data);
    if (currentType === "unknown") return;
    reset({
      title: item.data.title,
      description: item.data.description,
      location: item.data.location,
      reportType: currentType,
      eventAt: localDateTime(item.data.eventAt),
      category: item.data.category ?? undefined,
      custodyStatus: item.data.custodyStatus === "finder_reported" || item.data.custodyStatus === "security_reported"
        ? item.data.custodyStatus
        : undefined,
      isExistingReport: true,
    });
  }, [item.data, reset]);

  const saveItem = useMutation({
    mutationFn: (values: ItemFormValues) => {
      const { reportType: submittedType, eventAt, category, custodyStatus, isExistingReport, ...details } = values;
      if (!id && isExistingReport) throw new Error("A report creation form cannot use legacy edit values.");
      const eventAtIso = eventAt ? new Date(eventAt).toISOString() : undefined;
      if (id) {
        return updateItem(id, {
          ...details,
          ...(eventAtIso ? { eventAt: eventAtIso } : {}),
          ...(category ? { category } : {}),
          ...(submittedType === "found" && custodyStatus ? { custodyStatus } : {}),
        });
      }
      if (submittedType === "lost") {
        return createItem({
          ...details,
          reportType: "lost",
          eventAt: eventAtIso!,
          ...(category ? { category } : {}),
        });
      }
      return createItem({
        ...details,
        reportType: "found",
        eventAt: eventAtIso!,
        custodyStatus: custodyStatus!,
        ...(category ? { category } : {}),
      });
    },
    onSuccess: async (savedItem) => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      navigate(`/items/${savedItem.id}`);
    },
  });

  if (id && item.isPending) return <LoadingState label="Loading report..." />;

  if (id && item.isError) {
    return (
      <div className="max-w-2xl space-y-4">
        <ErrorState title="This report could not be loaded" description={item.error.message || "Please try again in a moment."} />
        <Link to="/my-reports" className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-primary underline underline-offset-4 hover:bg-accent">Back to My Reports</Link>
      </div>
    );
  }

  if (id && item.data && item.data.ownerId !== userId) {
    return <ErrorState title="This report belongs to another user" description="Only the report creator can edit this report." />;
  }

  if (id && item.data && reportTypeOf(item.data) === "unknown") {
    return (
      <div className="max-w-2xl space-y-4">
        <PageHeader title="Historical report" description="This older report does not contain enough information to safely determine its type or lifecycle, so it cannot be edited here." />
        <Link to="/my-reports" className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-primary underline underline-offset-4 hover:bg-accent">Back to My Reports</Link>
      </div>
    );
  }

  if (id && item.data && lifecycleStatusOf(item.data) !== "open") {
    return (
      <div className="max-w-2xl space-y-4">
        <PageHeader title="Report unavailable for editing" description="This report is no longer open and cannot be edited." />
        <Link to="/my-reports" className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-primary underline underline-offset-4 hover:bg-accent">Back to My Reports</Link>
      </div>
    );
  }

  const editing = id !== undefined;
  const activeType = editing && item.data ? reportTypeOf(item.data) : reportType;
  if (!activeType || activeType === "unknown") {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Choose a report" description="Start with the kind of property report you need to make." eyebrow="Student reports" />
        <section aria-label="Choose a report type" className="grid gap-4 md:grid-cols-2">
          <Link to="/report/lost" className="group flex min-h-48 min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Search aria-hidden="true" className="size-5" /></span>
            <span className="mt-4 flex w-full items-center justify-between gap-3 text-lg font-semibold text-card-foreground">
              Report lost property <ArrowRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
            </span>
            <span className="mt-1 text-sm leading-relaxed text-muted-foreground">For property you cannot currently find. Share where and when you last saw it.</span>
          </Link>
          <Link to="/report/found" className="group flex min-h-48 min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground"><ShieldCheck aria-hidden="true" className="size-5" /></span>
            <span className="mt-4 flex w-full items-center justify-between gap-3 text-lg font-semibold text-card-foreground">
              Report found property <ArrowRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
            </span>
            <span className="mt-1 text-sm leading-relaxed text-muted-foreground">For an item you found. Share where it is and report its current custody accurately.</span>
          </Link>
        </section>
      </div>
    );
  }

  const isLost = activeType === "lost";
  const confirmedCustody = !isLost && item.data?.custodyStatus === "security_confirmed";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={editing ? "Edit report" : isLost ? "Report lost property" : "Report found property"}
        description={isLost
          ? "Tell the campus community where and when you last saw the missing item. You can resolve the report if you recover it."
          : "Describe the item safely and where it was found. Found property should be handed to authorized campus security."}
        eyebrow={editing ? "My reports" : "Student reports"}
      />

      <form onSubmit={handleSubmit((values) => saveItem.mutate(values))} className="grid min-w-0 gap-5" aria-busy={saveItem.isPending}>
        <SectionCard title="Report details" description="Add a concise title and general details that are safe for the campus community to see.">
          <div className="grid min-w-0 gap-5">
            <div className="grid min-w-0 gap-2">
              <FieldLabel htmlFor="title">Item title</FieldLabel>
              <Input id="title" autoComplete="off" {...register("title")} aria-required="true" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined} />
              <FieldError id="title-error">{errors.title?.message}</FieldError>
            </div>

            <div className="grid min-w-0 gap-2">
              <FieldLabel htmlFor="description">Safe public description</FieldLabel>
              <textarea
                id="description"
                {...register("description")}
                aria-required="true"
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "description-help description-error" : "description-help"}
                className={`${fieldClassName} min-h-32 resize-y`}
              />
              <p id="description-help" className="text-sm leading-relaxed text-muted-foreground">
                Share general identifying details. Keep private ownership proof, serial numbers, student IDs, and contact details out of the public description.
              </p>
              <FieldError id="description-error">{errors.description?.message}</FieldError>
            </div>

            <div className="grid min-w-0 gap-2">
              <FieldLabel htmlFor="category" requirement="Optional">General category</FieldLabel>
              <select id="category" {...register("category")} defaultValue="" aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? "category-error" : undefined} className={fieldClassName}>
                <option value="">Choose a category</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="bags">Bags</option>
                <option value="keys">Keys</option>
                <option value="documents">Documents</option>
                <option value="accessories">Accessories</option>
                <option value="other">Other</option>
              </select>
              <FieldError id="category-error">{errors.category?.message}</FieldError>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Where and when" description="Use the campus location and event time that best match what you know.">
          <div className="grid min-w-0 gap-5 sm:grid-cols-2">
            <div className="grid min-w-0 content-start gap-2">
              <FieldLabel htmlFor="location">{isLost ? "Last-seen campus location" : "Campus location where found"}</FieldLabel>
              <Input id="location" autoComplete="off" placeholder="Example: library, ground floor" {...register("location")} aria-required="true" aria-invalid={Boolean(errors.location)} aria-describedby={errors.location ? "location-error" : undefined} />
              <FieldError id="location-error">{errors.location?.message}</FieldError>
            </div>

            <div className="grid min-w-0 content-start gap-2">
              <FieldLabel htmlFor="eventAt" requirement={editing ? "Optional for historical reports" : "Required"}>{isLost ? "When was it last seen?" : "When was it found?"}</FieldLabel>
              <Input id="eventAt" type="datetime-local" max={localDateTime(new Date().toISOString())} {...register("eventAt")} aria-required={!editing} aria-invalid={Boolean(errors.eventAt)} aria-describedby={errors.eventAt ? "eventAt-help eventAt-error" : "eventAt-help"} />
              <p id="eventAt-help" className="text-sm leading-relaxed text-muted-foreground">Choose the time in your local time zone. New reports require an event date and time; a missing historical date may stay blank.</p>
              <FieldError id="eventAt-error">{errors.eventAt?.message}</FieldError>
            </div>
          </div>
        </SectionCard>

        {!isLost && (
          <SectionCard title="Custody information" description="Report who currently has the item. A report from the finder is not the same as campus staff verifying custody.">
            {confirmedCustody ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <h2 className="font-semibold text-foreground">Campus security custody confirmed</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Campus staff verified this custody state. It is preserved while you edit other report details.</p>
              </div>
            ) : (
              <div className="grid min-w-0 gap-2">
                <FieldLabel htmlFor="custodyStatus" requirement={editing ? "Optional for historical reports" : "Required"}>Current custody information</FieldLabel>
                <select id="custodyStatus" {...register("custodyStatus")} defaultValue="" aria-required={!editing} aria-invalid={Boolean(errors.custodyStatus)} aria-describedby={errors.custodyStatus ? "custody-help custody-error" : "custody-help"} className={fieldClassName}>
                  <option value="">Choose custody information</option>
                  <option value="finder_reported">The item is still with the finder</option>
                  <option value="security_reported">It has been reported as turned over to campus security</option>
                </select>
                <p id="custody-help" className="text-sm leading-relaxed text-muted-foreground">This is information you report. Only authorized staff can confirm that an item is in campus security custody. {editing && "You may leave missing legacy custody information blank."}</p>
                <FieldError id="custody-error">{errors.custodyStatus?.message}</FieldError>
              </div>
            )}
          </SectionCard>
        )}

        <SectionCard title="Review and submit" description="Review the public details before submitting. Staff can verify found-item custody, and staff review is required for any ownership Claim.">
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {editing
              ? "Saving updates the report details. Existing Claim, custody, and handover records remain governed by the campus workflow."
              : "Your report will appear in campus browsing after it is accepted. Never include private ownership proof in this public report."}
          </p>
          {saveItem.isError && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">The report could not be saved. {saveItem.error.message}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <Button type="submit" disabled={saveItem.isPending}>
              {saveItem.isPending ? "Saving report..." : editing ? "Save changes" : "Submit report"}
            </Button>
            <Link to={editing ? `/items/${id}` : "/items"} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Cancel
            </Link>
          </div>
        </SectionCard>
      </form>
    </div>
  );
}

export default ItemFormPage;
