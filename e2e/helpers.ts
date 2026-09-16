import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const SAMPLE_CREATOR = { email: "morgan@tiebreak.test", password: "playwright-sample-password" };

/** WCAG 2.2 AA plus axe best practices, with no violations allowed. */
export async function expectAccessible(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const summary = violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

export async function logInAsSampleCreator(page: Page, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(SAMPLE_CREATOR.email);
  await page.getByLabel("Password", { exact: true }).fill(SAMPLE_CREATOR.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(next);
}

/** True when the page scrolls sideways at the current viewport. */
export async function overflowsHorizontally(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}
