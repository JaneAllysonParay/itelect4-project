import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ItemCard from "./ItemCard";
import type { ApiItem } from "../types/index";

const lostTumbler: ApiItem = {
  id: "item-blue-tumbler",
  title: "Blue Tumbler",
  description: "A blue insulated tumbler with a silver lid.",
  location: "E-Library",
  dateReported: "2026-10-24T08:00:00.000Z",
  status: "lost",
  ownerId: "user-jane",
};

describe("Campus Lost & Found ItemCard", () => {
  it("shows the status from the current item prop", () => {
    const { rerender } = render(<ItemCard item={lostTumbler} />);

    expect(screen.getByText("Blue Tumbler")).toBeInTheDocument();
    expect(screen.getByText("Status: lost")).toBeInTheDocument();

    rerender(<ItemCard item={{ ...lostTumbler, status: "found" }} />);

    expect(screen.getByText("Status: found")).toBeInTheDocument();
    expect(screen.queryByText("Status: lost")).not.toBeInTheDocument();
  });
});
