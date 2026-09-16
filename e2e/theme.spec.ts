import { expect, test } from "@playwright/test";

const CREAM = "rgb(250, 242, 227)";
const LAMPLIT = "rgb(28, 19, 14)";
const background = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("follows the system theme until the viewer picks one", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-dark", "Runs with a dark system preference");
  await page.goto("/guest");
  expect(await background(page)).toBe(LAMPLIT);

  const toggle = page.getByRole("button", { name: /^Theme:/ });
  await expect(toggle).toHaveAccessibleName("Theme: System. Switch to Light");
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Theme: Light. Switch to Dark");
  expect(await background(page)).toBe(CREAM);

  // The choice is remembered across pages.
  await page.goto("/p/pizza-night");
  expect(await background(page)).toBe(CREAM);

  await page.getByRole("button", { name: /^Theme:/ }).click();
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await expect(page.getByRole("button", { name: /^Theme:/ })).toHaveAccessibleName("Theme: System. Switch to Light");
  expect(await background(page)).toBe(LAMPLIT);
});

test("a saved dark theme applies before the first paint, with no light flash", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-dark", "One run is enough");
  await page.emulateMedia({ colorScheme: "light" });
  await page.context().addCookies([{ name: "tiebreak-theme", value: "dark", url: "http://localhost:3100" }]);

  // Captured as soon as the document exists: the server already rendered the choice.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __themeAtLoad: string | undefined }).__themeAtLoad = document.documentElement.dataset.theme;
    });
  });
  await page.goto("/login");
  expect(await page.evaluate(() => (window as unknown as { __themeAtLoad: string | undefined }).__themeAtLoad)).toBe("dark");
  expect(await background(page)).toBe(LAMPLIT);
});
