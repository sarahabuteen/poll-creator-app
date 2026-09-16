import { expect, test } from "@playwright/test";
import { logInAsSampleCreator, overflowsHorizontally } from "./helpers";

const PUBLIC_PAGES = ["/login", "/guest", "/guest/polls/pizza-night", "/guest/polls/meal-out", "/p/pizza-night", "/p/meal-out"];

test.describe("reflow", () => {
  test.use({ viewport: { width: 320, height: 720 }, reducedMotion: "reduce" });

  for (const textScale of [1, 2]) {
    test(`public pages fit 320px with text at ${textScale * 100}%`, async ({ page }) => {
      for (const path of PUBLIC_PAGES) {
        await page.goto(path);
        await expect(page.locator("main:not([aria-busy]) h1").first()).toBeVisible();
        await page.evaluate((scale) => (document.documentElement.style.fontSize = `${scale * 100}%`), textScale);
        expect(await overflowsHorizontally(page), `${path} scrolls sideways`).toBe(false);
      }
    });

    test(`creator pages fit 320px with text at ${textScale * 100}%`, async ({ page }) => {
      await logInAsSampleCreator(page);
      for (const path of ["/", "/polls/new", "/polls/friday-film-club", "/polls/friday-film-club/share", "/polls/lake-weekend"]) {
        await page.goto(path);
        await expect(page.locator("main:not([aria-busy]) h1").first()).toBeVisible();
        await page.evaluate((scale) => (document.documentElement.style.fontSize = `${scale * 100}%`), textScale);
        expect(await overflowsHorizontally(page), `${path} scrolls sideways`).toBe(false);
      }
    });
  }
});
