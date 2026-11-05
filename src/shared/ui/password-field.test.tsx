import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasswordField } from "@/shared/ui/password-field";

describe("PasswordField", () => {
  it("toggles password visibility", async () => {
    const user = userEvent.setup();

    render(
      <PasswordField
        id="password"
        name="password"
        label="Password"
        hint="At least 8 characters"
      />,
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
