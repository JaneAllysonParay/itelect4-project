import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "./PageStates";

describe("EmptyState", () => {
  it("gives each instance a unique, correctly labelled heading and keeps its content usable", async () => {
    const onBrowse = vi.fn();
    const user = userEvent.setup();

    render(
      <>
        <EmptyState
          title="No Claims received"
          description="Claims submitted on your reports will appear here."
        />
        <EmptyState
          title="No pending Claims"
          description="There are no pending Claims in the staff review queue."
          action={<button type="button" onClick={onBrowse}>Browse reports</button>}
        />
        <EmptyState
          title="No Claim submissions yet"
          description="Submitted Claims and their status will appear here."
        />
      </>,
    );

    const sections = [
      screen.getByRole("region", { name: "No Claims received" }),
      screen.getByRole("region", { name: "No pending Claims" }),
      screen.getByRole("region", { name: "No Claim submissions yet" }),
    ];
    const headingIds = sections.map((section) => {
      const heading = section.querySelector("h2");
      expect(heading).not.toBeNull();
      expect(heading).toHaveAttribute("id");
      expect(section).toHaveAttribute("aria-labelledby", heading?.id);
      return heading!.id;
    });

    expect(new Set(headingIds).size).toBe(sections.length);
    expect(new Set(Array.from(document.querySelectorAll("[id]"), (element) => element.id)).size)
      .toBe(document.querySelectorAll("[id]").length);

    expect(sections[0]).toHaveTextContent("Claims submitted on your reports will appear here.");
    expect(sections[1]).toHaveTextContent("There are no pending Claims in the staff review queue.");
    expect(sections[2]).toHaveTextContent("Submitted Claims and their status will appear here.");

    await user.click(screen.getByRole("button", { name: "Browse reports" }));
    expect(onBrowse).toHaveBeenCalledOnce();
  });
});
