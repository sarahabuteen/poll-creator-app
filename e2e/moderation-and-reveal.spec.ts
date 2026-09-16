import { expect, test } from "@playwright/test";
import { logInAsSampleCreator } from "./helpers";

test("the organiser moderates, ends voting and sees the reveal", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only");
  await logInAsSampleCreator(page, "/polls/pizza-night");
  await expect(page.getByText("Sam suggested: “Just order salads”")).toBeVisible();

  await page.getByRole("button", { name: "Add it" }).click();
  // Announced, and focus lands on the new ballot row rather than dropping to the page.
  await expect(page.getByText("Just order salads added to the ballot with 0 votes. Undo is available.")).toBeAttached();
  await expect(page.locator("li[id^='option-']", { hasText: "Just order salads" })).toBeFocused();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Add it" })).toBeFocused();

  await page.getByRole("button", { name: "End voting" }).click();
  await expect(page.getByRole("heading", { name: "Detroit-style from Emmy's" })).toBeVisible();
  await expect(page.getByText("You ended voting")).toBeVisible();
  await expect(page.getByText("Priya, Ada, Kai + 2 more backed it").first()).toBeVisible();

  // Reopening is confirmed, and cancelling returns focus to the trigger.
  const reopen = page.getByRole("button", { name: "Reopen voting" });
  await reopen.click();
  await page.getByRole("button", { name: "Keep it settled" }).click();
  await expect(reopen).toBeFocused();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the reveal shows everything at once, with no confetti or running animation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop only");
    await page.goto("/guest/polls/pizza-night");
    await page.getByRole("button", { name: "End voting" }).click();

    await expect(page.getByRole("heading", { name: "Detroit-style from Emmy's" })).toBeVisible();
    await expect(page.locator("[style*='confetti-fall']")).toHaveCount(0);
    // The final number is there immediately, not counting up.
    await expect(page.locator(".text-num")).toHaveText("45");
    const running = await page.evaluate(
      () => document.getAnimations().filter((animation) => animation.playState === "running" && Number.isFinite(animation.effect?.getComputedTiming().endTime)).length,
    );
    expect(running).toBe(0);
  });
});
