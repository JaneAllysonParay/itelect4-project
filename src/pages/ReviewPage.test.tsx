import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ReviewPage from "./ReviewPage";

const apiMocks = vi.hoisted(() => ({
  askAi: vi.fn(),
}));

vi.mock("../api/client", () => apiMocks);

function renderReviewPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewPage />
    </QueryClientProvider>,
  );
}

describe("AI Report Review disclosure", () => {
  it("discloses Gemini processing before submission and calls the review API", async () => {
    apiMocks.askAi.mockResolvedValue({
      readiness: "ready",
      summary: "The description has useful identifying details.",
      keyDetails: [],
      suggestions: [],
    });
    renderReviewPage();

    const notice = screen.getByRole("note");
    const submit = screen.getByRole("button", { name: "Review item report" });

    expect(notice).toHaveTextContent(
      "Your description will be sent to Google Gemini for AI-powered feedback.",
    );
    expect(notice).toHaveTextContent(
      "Do not include personal IDs, passwords, payment details, or other sensitive information.",
    );
    expect(notice).toHaveTextContent(
      "AI suggestions do not verify ownership or approve Claims.",
    );
    expect(submit).toHaveAttribute("aria-describedby", "gemini-data-use-notice");

    const prompt =
      "A black wallet with a silver zipper and a small mark on its corner.";
    const user = userEvent.setup();
    await user.click(screen.getByRole("textbox", { name: "Item report description" }));
    await user.paste(prompt);
    await userEvent.click(submit);

    await waitFor(() => {
      expect(apiMocks.askAi).toHaveBeenCalledOnce();
      expect(apiMocks.askAi.mock.calls[0]?.[0]).toBe(prompt);
    });
  });
});
