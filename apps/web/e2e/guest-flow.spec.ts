import { expect, test } from "@playwright/test";

const guestSession = {
  accessToken: "guest-access-token",
  subjectType: "GUEST",
  subjectId: "guest-1",
  planTier: "GUEST",
  role: null,
  email: null,
  simulationsRemaining: 3,
  unlimited: false,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "No active session" }),
    });
  });

  await page.route("**/api/auth/guest", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(guestSession),
    });
  });
});

test("guest can run a country simulation and open its local replay page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Enter as guest/i }).click();

  await expect(page).toHaveURL(/\/app$/);
  await page.getByPlaceholder(/Jump to any country/i).fill("Morocco");
  await page.getByRole("button", { name: /^Focus$/i }).click();
  await page.getByRole("button", { name: /^Simulate$/i }).click();
  await page.getByRole("button", { name: /Run scenario/i }).click();

  await expect(page.getByText(/War Escalation around Morocco/i)).toBeVisible();
  await expect(page.getByText(/Brent Oil/i)).toBeVisible();

  await page.getByRole("button", { name: /Open replay/i }).click();

  await expect(page).toHaveURL(/\/replay\/local\?state=/);
  await expect(page.getByText(/Replay surface/i)).toBeVisible();
  await expect(page.getByText(/Replay asset stream/i)).toBeVisible();
});

test("quota exhaustion opens the paywall modal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Enter as guest/i }).click();

  await expect(page).toHaveURL(/\/app$/);
  await page.getByPlaceholder(/Jump to any country/i).fill("Morocco");
  await page.getByRole("button", { name: /^Focus$/i }).click();
  await page.getByRole("button", { name: /^Simulate$/i }).click();

  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: /Run scenario/i }).click();
  }

  await expect(
    page.getByText(/Guests get 3 lifetime simulations\. Registered free users get 3 per day\./i),
  ).toBeVisible();
});
