import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createItem, fetchItemById, updateItem } from "../api/client";
import { itemSchema, type ItemFormValues } from "../schemas/itemSchema";
import useAuthStore from "../store/authStore";
import type { ApiItem } from "../types/index";

function ItemFormPage() {
  const { id } = useParams<{ id: string }>();
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
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      location: "",
      status: "lost",
    },
  });

  useEffect(() => {
    if (item.data) {
      reset({
        title: item.data.title,
        description: item.data.description,
        location: item.data.location,
        status: item.data.status,
      });
    }
  }, [item.data, reset]);

  const saveItem = useMutation({
    mutationFn: (values: ItemFormValues) =>
      id ? updateItem(id, values) : createItem(values),
    onSuccess: async (savedItem) => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      navigate(`/items/${savedItem.id}`);
    },
  });

  if (id && item.isPending) {
    return (
      <p className="animate-pulse text-gray-700 dark:text-gray-300">
        Loading item...
      </p>
    );
  }

  if (id && item.isError) {
    return (
      <p className="rounded-lg bg-red-50 p-4 text-red-700">
        {item.error.message}
      </p>
    );
  }

  if (id && item.data && item.data.ownerId !== userId) {
    return (
      <p className="text-gray-700 dark:text-gray-300">
        Only the item owner can edit this report.
      </p>
    );
  }

  const editing = id !== undefined;

  return (
    <div className="max-w-xl">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        {editing ? "Edit item" : "Report an item"}
      </h2>

      <form
        onSubmit={handleSubmit((values) => saveItem.mutate(values))}
        className="grid gap-4"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="title" className="text-foreground">
            Title
          </Label>
          <Input
            id="title"
            {...register("title")}
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="description" className="text-foreground">
            Description
          </Label>
          <textarea
            id="description"
            {...register("description")}
            aria-invalid={Boolean(errors.description)}
            className="min-h-28 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
          {errors.description && (
            <p className="text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="location" className="text-foreground">
            Location
          </Label>
          <Input
            id="location"
            {...register("location")}
            aria-invalid={Boolean(errors.location)}
          />
          {errors.location && (
            <p className="text-sm text-red-600">{errors.location.message}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="status" className="text-foreground">
            Status
          </Label>
          <select
            id="status"
            {...register("status")}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
          >
            <option value="lost">Lost</option>
            <option value="found">Found</option>
            <option value="claimed">Claimed</option>
          </select>
        </div>

        {saveItem.isError && (
          <p className="text-sm text-red-700">{saveItem.error.message}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={saveItem.isPending}>
            {saveItem.isPending
              ? "Saving..."
              : editing
                ? "Save changes"
                : "Create item"}
          </Button>
          <Link
            to={editing ? `/items/${id}` : "/items"}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default ItemFormPage;
