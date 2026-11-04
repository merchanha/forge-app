import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function SampleButton({ label }: { label: string }) {
  return (
    <button type="button" className="bg-accent text-ground rounded-md">
      {label}
    </button>
  );
}

describe("Testing Library smoke", () => {
  it("renders a button label", () => {
    render(<SampleButton label="Start Workout" />);
    expect(
      screen.getByRole("button", { name: "Start Workout" }),
    ).toBeInTheDocument();
  });
});
