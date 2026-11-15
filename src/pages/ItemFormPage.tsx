import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  if (id && item.isPending) {
    return <p className="animate-pulse text-gray-700 dark:text-gray-300">Loading report...</p>;
  }

  if (id && item.isError) {
    return <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{item.error.message}</p>;
  }

  if (id && item.data && item.data.ownerId !== userId) {
    return <p className="text-gray-700 dark:text-gray-300">Only the report creator can edit this report.</p>;
  }

  if (id && item.data && reportTypeOf(item.data) === "unknown") {
    return (
      <div className="max-w-xl space-y-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Historical report</h2>
        <p className="text-gray-700 dark:text-gray-300">
          This older report does not contain enough information to safely determine its type or lifecycle, so it cannot be edited here.
        </p>
        <Link to="/my-reports" className="text-blue-700 underline dark:text-blue-300">Back to My Reports</Link>
      </div>
    );
  }

  if (id && item.data && lifecycleStatusOf(item.data) !== "open") {
    return (
      <div className="max-w-xl space-y-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Report unavailable for editing</h2>
        <p className="text-gray-700 dark:text-gray-300">This report is no longer open and cannot be edited.</p>
        <Link to="/my-reports" className="text-blue-700 underline dark:text-blue-300">Back to My Reports</Link>
      </div>
    );
  }

  const editing = id !== undefined;
  const activeType = editing && item.data ? reportTypeOf(item.data) : reportType;
  if (!activeType || activeType === "unknown") {
    return (
      <div className="max-w-xl space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose a report</h2>
        <p className="text-gray-700 dark:text-gray-300">Choose whether you lost property or found an item on campus.</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/report/lost" className="rounded bg-blue-700 px-4 py-2 font-semibold text-white">Report lost property</Link>
          <Link to="/report/found" className="rounded border border-gray-300 px-4 py-2 font-semibold text-gray-900 dark:text-white">Report found property</Link>
        </div>
      </div>
    );
  }

  const isLost = activeType === "lost";

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        {editing ? "Edit report" : isLost ? "Report lost property" : "Report found property"}
      </h1>
      <p className="mb-5 text-gray-700 dark:text-gray-300">
        {isLost
          ? "Tell the campus community where and when you last saw the missing item. You can resolve this report if you recover it."
          : "Describe the item safely and where it was found. Please turn found property over to authorized campus security. Custody details below are reported by you until staff confirm them."}
      </p>

      <form onSubmit={handleSubmit((values) => saveItem.mutate(values))} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="title">Item title</Label>
          <Input id="title" autoComplete="off" {...register("title")} aria-invalid={Boolean(errors.title)} />
          {errors.title && <p className="text-sm text-red-600" role="alert">{errors.title.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="description">Safe public description</Label>
          <textarea
            id="description"
            {...register("description")}
            aria-invalid={Boolean(errors.description)}
            aria-describedby="description-help"
            className="min-h-28 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p id="description-help" className="text-sm text-gray-600 dark:text-gray-300">
            Share general identifying details. Keep private ownership proof, serial numbers, student IDs, and contact details out of the public description.
          </p>
          {errors.description && <p className="text-sm text-red-600" role="alert">{errors.description.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="category">General category (optional)</Label>
          <select id="category" {...register("category")} defaultValue="" className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
            <option value="">Choose a category</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="bags">Bags</option>
            <option value="keys">Keys</option>
            <option value="documents">Documents</option>
            <option value="accessories">Accessories</option>
            <option value="other">Other</option>
          </select>
          {errors.category && <p className="text-sm text-red-600" role="alert">{errors.category.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="location">{isLost ? "Last-seen campus location" : "Campus location where found"}</Label>
          <Input id="location" autoComplete="off" placeholder="Example: library, ground floor" {...register("location")} aria-invalid={Boolean(errors.location)} />
          {errors.location && <p className="text-sm text-red-600" role="alert">{errors.location.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="eventAt">{isLost ? "When was it last seen?" : "When was it found?"}</Label>
          <Input id="eventAt" type="datetime-local" max={localDateTime(new Date().toISOString())} {...register("eventAt")} aria-invalid={Boolean(errors.eventAt)} />
          {errors.eventAt && <p className="text-sm text-red-600" role="alert">{errors.eventAt.message}</p>}
        </div>

        {!isLost && item.data?.custodyStatus === "security_confirmed" ? (
          <div className="grid gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <h2 className="font-medium text-gray-900 dark:text-white">Campus security custody confirmed</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">Campus staff verified this custody state. It is preserved while you edit other report details.</p>
          </div>
        ) : !isLost && (
          <div className="grid gap-1.5">
            <Label htmlFor="custodyStatus">Current custody information</Label>
            <select id="custodyStatus" {...register("custodyStatus")} defaultValue="" aria-invalid={Boolean(errors.custodyStatus)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
              <option value="">Choose custody information</option>
              <option value="finder_reported">The item is still with the finder</option>
              <option value="security_reported">It has been reported as turned over to campus security</option>
            </select>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This is information you report. Only authorized staff can confirm that an item is in campus security custody.
            </p>
            {errors.custodyStatus && <p className="text-sm text-red-600" role="alert">{errors.custodyStatus.message}</p>}
          </div>
        )}

        {saveItem.isError && <p role="alert" className="text-sm text-red-700">{saveItem.error.message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saveItem.isPending}>
            {saveItem.isPending ? "Saving report..." : editing ? "Save changes" : "Submit report"}
          </Button>
          <Link to={editing ? `/items/${id}` : "/items"} className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export default ItemFormPage;
