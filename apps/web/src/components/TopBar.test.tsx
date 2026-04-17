import { fireEvent, screen } from "@testing-library/react";
import { TopBar } from "./TopBar";
import { renderWithProviders } from "../test/renderWithProviders";

describe("TopBar", () => {
  it("calls logout when a session exists", () => {
    const handleLogout = vi.fn();

    renderWithProviders(
      <TopBar
        onAuthOpen={vi.fn()}
        onLogout={handleLogout}
        profile={{
          subjectId: "user-1",
          subjectType: "USER",
          planTier: "FREE",
          role: "USER",
          email: "analyst@example.com",
          simulationsRemaining: 2,
          unlimited: false,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Logout/i }));

    expect(handleLogout).toHaveBeenCalledTimes(1);
  });
});
