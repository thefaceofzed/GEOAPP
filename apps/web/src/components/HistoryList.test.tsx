import { screen } from "@testing-library/react";
import { HistoryList } from "./HistoryList";
import { renderWithProviders } from "../test/renderWithProviders";

describe("HistoryList", () => {
  it("shows an empty state", () => {
    renderWithProviders(<HistoryList items={[]} />);

    expect(screen.getByText(/No saved scenarios yet/i)).toBeInTheDocument();
  });

  it("renders replay links when history items exist", () => {
    renderWithProviders(
      <HistoryList
        items={[
          {
            id: "sim-1",
            href: "/replay/local?state=test",
            countryCode: "MA",
            countryName: "Morocco",
            actionKey: "war",
            actionLabel: "War Escalation",
            severityScore: 84,
            createdAt: "2026-04-13T18:00:00Z",
            source: "local",
            note: "Encoded replay link",
          },
        ]}
      />,
    );

    expect(screen.getByText(/War Escalation/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open replay/i })).toHaveAttribute(
      "href",
      "/replay/local?state=test",
    );
  });
});
