import { expect, test, type Locator, type Page } from "@playwright/test";
import { logInAsSampleCreator } from "./helpers";

// Phone-only problems: iOS zoom on small inputs, focus hidden under sticky bars, and a colour pair on selected rows.

test.skip(({ isMobile }) => !isMobile, "Phone-sized checks");

/** iOS Safari zooms the page when an input's text is under 16px, and doesn't zoom back out. */
async function expectNoZoomOnFocus(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("input, textarea, select")]
      .filter((el) => !["radio", "checkbox", "hidden"].includes((el as HTMLInputElement).type))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => ({ id: el.id || el.getAttribute("name"), size: parseFloat(getComputedStyle(el).fontSize) }))
      .filter((field) => field.size < 16),
  );
  expect(small, "inputs that make iOS zoom in").toEqual([]);
}

/** The focused control's row must sit fully above the sticky bottom bar (WCAG 2.4.11 Focus Not Obscured). */
async function expectFocusAboveBar(page: Page, bar: Locator) {
  const barTop = (await bar.boundingBox())!.y;
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const box = (el.closest("label") ?? el).getBoundingClientRect();
    return { bottom: box.bottom, name: el.getAttribute("value") ?? el.id };
  });
  expect(focused.bottom, `focused ${focused.name} is under the sticky bar`).toBeLessThanOrEqual(barTop + 1);
}

test("the vote page: no input zoom, focus never hides under the Cast bar, readable selected rows", async ({ page }) => {
  // The guest vote page renders the same ballot and sticky bar, over sample data no other test can close.
  await page.goto("/guest/p/pizza-night");
  await expect(page.getByRole("heading", { name: "Who’s voting?" })).toBeVisible();
  await expectNoZoomOnFocus(page);

  const bar = page.locator(".sticky").filter({ has: page.getByRole("button", { name: /Cast my vote/ }) });
  // Keyboard onto the ballot: name, face group, background group, first option.
  await page.getByLabel("Your name").focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
  await expectFocusAboveBar(page, bar);
  // The case that hides focus: the next row is on screen, but under the bar. The browser
  // counts it as visible, so only scroll padding makes it scroll the row up.
  const rows = page.locator("fieldset label").filter({ has: page.locator('input[name="ballot"]') });
  const barTop = (await bar.boundingBox())!.y;
  const second = (await rows.nth(1).boundingBox())!;
  await page.evaluate((by) => window.scrollBy(0, by), second.y - barTop - 10);
  await page.keyboard.press("ArrowDown");
  await expectFocusAboveBar(page, bar);

  // A selected suggested option: its "Suggested by" line keeps AA contrast on the teal row.
  await page.getByRole("radio", { name: /Detroit-style/ }).check({ force: true });
  // The row's background fades in; measure the settled colours.
  await page.waitForTimeout(400);
  const ratio = await page.evaluate(() => {
    // The row's secondary line: avatar plus "Suggested by …", which carries the text colour.
    const line = [...document.querySelectorAll("label span")].find((el) => el.querySelector("img") && el.textContent?.trim() === "Suggested by Priya")!;
    const row = line.closest("label")!;
    const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const lum = (value: string) => {
      const [r, g, b] = rgb(value).map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [a, b] = [lum(getComputedStyle(line).color), lum(getComputedStyle(row).backgroundColor)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);

  await page.getByRole("button", { name: "Suggest something else" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoZoomOnFocus(page);
});

test("the create form: no input zoom, focus never hides under the Create bar", async ({ page }) => {
  await logInAsSampleCreator(page, "/polls/new");
  await expect(page.getByLabel("Question")).toBeVisible();
  await page.getByText("Pick a time").click();
  await expectNoZoomOnFocus(page);

  const bar = page.locator(".sticky").filter({ has: page.getByRole("button", { name: "Create poll" }) });
  await page.getByLabel("Question").focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  // Tab down the whole form; every stop must stay above the bar.
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    const inBar = await page.evaluate(() => !!document.activeElement?.closest(".sticky"));
    if (inBar) break;
    await expectFocusAboveBar(page, bar);
  }
});
