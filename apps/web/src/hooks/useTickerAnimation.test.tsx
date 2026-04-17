import { render, screen } from "@testing-library/react";
import { useTickerAnimation } from "./useTickerAnimation";

const testAssets = [
  {
    key: "oil",
    label: "Oil",
    unit: "USD",
    from: 100,
    to: 120,
    delta: 20,
  },
];

function Harness() {
  const assets = useTickerAnimation(testAssets);

  return <div>{assets[0]?.current}</div>;
}

describe("useTickerAnimation", () => {
  it("interpolates between the baseline and target price", async () => {
    let now = 0;
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      now = 10000;
      callback(now);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    render(<Harness />);

    expect(await screen.findByText("120")).toBeInTheDocument();
  });
});
