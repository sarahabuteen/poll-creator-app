import { expect, test } from "@playwright/test";
import { expectAccessible, logInAsSampleCreator } from "./helpers";

test.use({ reducedMotion: "reduce" });

test.describe("404 pages are designed and never a dead end", () => {
  test("an unknown page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Nothing to settle here" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Try Tiebreak as a guest" })).toBeVisible();
    await expectAccessible(page, "root 404");
  });

  test("a vote link to a poll that doesn't exist", async ({ page }) => {
    await page.goto("/p/not-a-real-poll");
    await expect(page.getByRole("heading", { level: 1, name: "This poll isn’t here" })).toBeVisible();
    await expect(page.getByText("Ask whoever shared it in the group chat for a fresh link.")).toBeVisible();
    // Search engines are told not to index it, even though streaming sends a 200.
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    await expectAccessible(page, "vote 404");
  });

  test("a sample poll that doesn't exist, in guest mode", async ({ page }) => {
    const response = await page.goto("/guest/polls/nope");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "That sample poll doesn’t exist" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Guest mode" })).toBeVisible();
    await expectAccessible(page, "guest 404");
  });

  test("a creator poll that doesn't exist or isn't yours", async ({ page }) => {
    await logInAsSampleCreator(page);
    await page.goto("/polls/not-a-real-poll");
    await expect(page.getByRole("heading", { level: 1, name: "We couldn’t find that poll" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to my polls" })).toBeVisible();
    await expectAccessible(page, "creator 404");
  });
});

test("an empty suggestions queue says what will appear there", async ({ page }) => {
  await page.goto("/guest/polls/friday-film-club");
  await expect(page.getByText(/^No suggestions waiting\./)).toBeVisible();

  // And the pizza night queue empties into the same note once the only suggestion is handled.
  await page.goto("/guest/polls/pizza-night");
  await expect(page.getByText(/^No suggestions waiting\./)).toHaveCount(0);
  await page.getByRole("button", { name: "Not this time" }).click();
  await expect(page.getByText(/^No suggestions waiting\./)).toBeVisible();
});
