import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { askAi } from "../api/client";
import { reviewFormSchema } from "../schemas/reviewSchema";
import type { ReviewFormValues } from "../schemas/reviewSchema";
import type { AiItemReportReview } from "../types/index";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const READINESS_STYLE: Record<AiItemReportReview["readiness"], string> = {
  ready: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  almost:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  "not-yet": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

function ReviewPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const review = useMutation({
    mutationFn: askAi,
    retry: false,
  });

  const onSubmit = (values: ReviewFormValues): void => {
    review.mutate(values.prompt);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          AI Report Review
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Describe a lost or found item and get feedback on whether the report
          contains enough useful identifying details.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="prompt" className="text-foreground">
            Item report description
          </Label>
          <textarea
            id="prompt"
            rows={6}
            {...register("prompt")}
            aria-invalid={errors.prompt ? true : undefined}
            placeholder="Example: Black wallet lost near the library, with a silver zipper and a scratch on one corner..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.prompt && (
            <p className="text-sm text-red-600" role="alert">
              {errors.prompt.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={review.isPending}
          className="justify-self-start"
        >
          {review.isPending ? "Reviewing..." : "Review item report"}
        </Button>
      </form>

      {review.isError && (
        <p className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {review.error.message}
        </p>
      )}

      {review.data && (
        <section
          aria-live="polite"
          className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
        >
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Readiness
            </h3>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${READINESS_STYLE[review.data.readiness]}`}
            >
              {review.data.readiness}
            </span>
          </div>

          <div>
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
              Summary
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              {review.data.summary}
            </p>
          </div>

          <div>
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
              Key details detected
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
              {review.data.keyDetails.map((detail, index) => (
                <li key={`${detail}-${index}`}>{detail}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
              Suggestions to improve the report
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
              {review.data.suggestions.map((suggestion, index) => (
                <li key={`${suggestion}-${index}`}>{suggestion}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

export default ReviewPage;
