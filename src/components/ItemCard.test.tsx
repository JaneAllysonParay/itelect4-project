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
  it("labels the report type and distinguishes legacy claimed items from handover", () => {
    const { rerender } = render(<ItemCard item={lostTumbler} />);

    expect(screen.getByText("Blue Tumbler")).toBeInTheDocument();
    expect(screen.getByText("Lost report")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();

    rerender(<ItemCard item={{ ...lostTumbler, status: "found" }} />);

    expect(screen.getByText("Found report")).toBeInTheDocument();

    rerender(<ItemCard item={{ ...lostTumbler, status: "claimed" }} />);

    expect(screen.getByText("Historical report · type unknown")).toBeInTheDocument();
    expect(screen.getByText("Unavailable · historical status unknown")).toBeInTheDocument();
    expect(screen.queryByText(/returned|handed over|approved/i)).not.toBeInTheDocument();
  });

  it("shows event location and local event time while distinguishing invalid dates", () => {
    const { rerender } = render(<ItemCard item={{ ...lostTumbler, reportType: "lost", lifecycleStatus: "open", eventAt: "2026-10-24T08:00:00.000Z" }} />);

    expect(screen.getByText("Reported location")).toBeInTheDocument();
    expect(screen.getByText("E-Library")).toBeInTheDocument();
    expect(screen.getByText("Event date")).toBeInTheDocument();
    expect(screen.queryByText("Date unavailable")).not.toBeInTheDocument();

    rerender(<ItemCard item={{ ...lostTumbler, eventAt: "not-a-date" }} />);
    expect(screen.getByText("Date unavailable")).toBeInTheDocument();
  });

  it("shows an approved Claim reservation without calling it returned", () => {
    render(<ItemCard item={{
      ...lostTumbler,
      status: "claimed",
      reportType: "found",
      lifecycleStatus: "reserved",
    }} />);

    expect(screen.getByText("Reserved for an approved Claim")).toBeInTheDocument();
    expect(screen.queryByText(/returned|handover confirmed/i)).not.toBeInTheDocument();
  });
});
