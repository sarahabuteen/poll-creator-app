import { expect, test } from "@playwright/test";
import { expectAccessible, logInAsSampleCreator } from "./helpers";

// Motion off, so axe never measures a half-faded element.
test.use({ reducedMotion: "reduce" });

test.describe("public pages", () => {
  for (const path of ["/login", "/signup", "/guest", "/guest/closed", "/guest/polls/pizza-night", "/guest/polls/meal-out", "/p/meal-out"]) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main:not([aria-busy])")).toBeVisible();
      await expect(page.locator("h1").first()).toBeVisible();
      await expectAccessible(page, path);
    });
  }

  test("the ballot, its errors and both dialogs have no axe violations", async ({ page }) => {
    await page.goto("/p/birthday-brunch");
    // Past the loading skeleton, onto the real ballot.
    await expect(page.getByRole("heading", { name: "Who’s voting?" })).toBeVisible();
    await expectAccessible(page, "ballot");

    // aria-disabled (not disabled): announced as unavailable, but still focusable and
    // clickable so it can explain what's missing. Playwright won't click it unforced.
    await page.getByRole("button", { name: /^Cast my vote/ }).click({ force: true });
    await expect(page.getByText("Add your name so the crew knows who voted.")).toBeVisible();
    await expect(page.getByLabel("Your name")).toBeFocused();
    await expectAccessible(page, "ballot with errors");

    await page.getByLabel("Your name").fill("Axe");
    // The real checkbox is visually hidden; people click its styled label.
    await page.locator("label", { hasText: "The Marlowe" }).click();
    await expect(page.getByRole("checkbox", { name: /The Marlowe/ })).toBeChecked();
    await page.getByRole("button", { name: /^Cast my vote for/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectAccessible(page, "confirm dialog");
    await page.getByRole("button", { name: "Go back" }).click();

    await page.getByRole("button", { name: "Suggest something else" }).click();
    await expect(page.getByRole("dialog", { name: "Suggest something else" })).toBeVisible();
    await expectAccessible(page, "suggest dialog");
  });

  test("every page has a unique, descriptive title", async ({ page }) => {
    const titles = new Map<string, string>();
    for (const path of ["/login", "/signup", "/guest", "/guest/closed", "/guest/polls/pizza-night", "/guest/polls/meal-out", "/p/pizza-night", "/p/meal-out"]) {
      await page.goto(path);
      titles.set(path, await page.title());
    }
    expect(new Set(titles.values()).size, JSON.stringify(Object.fromEntries(titles), null, 2)).toBe(titles.size);
  });
});

test.describe("creator pages", () => {
  test.beforeEach(async ({ page }) => logInAsSampleCreator(page));

  for (const path of ["/", "/closed", "/polls/new", "/polls/friday-film-club", "/polls/friday-film-club/share", "/polls/lake-weekend"]) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expectAccessible(page, path);
    });
  }
});
