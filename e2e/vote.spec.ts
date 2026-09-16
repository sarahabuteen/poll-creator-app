import { expect, test } from "@playwright/test";

test("a voter can cast a vote using only the keyboard", async ({ page, browserName }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Keyboard flow runs on the desktop project");
  void browserName;
  await page.goto("/p/friday-film-club");
  await expect(page.getByRole("heading", { name: "Who’s voting?" })).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /^Theme:/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Your name")).toBeFocused();
  await page.keyboard.type("Kiki");

  // Radio groups: Tab in, arrows to choose.
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Face 2" })).toBeChecked();
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Peach" })).toBeChecked();

  // The ballot starts with nothing selected; Space picks the focused option.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: /Jaws/ })).toBeFocused();
  await expect(page.getByRole("radio", { name: /Jaws/ })).not.toBeChecked();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: /Jaws/ })).toBeChecked();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Suggest something else" })).toBeFocused();
  await page.keyboard.press("Tab");
  const cast = page.getByRole("button", { name: "Cast my vote for Jaws" });
  await expect(cast).toBeFocused();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Lock in Jaws?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Lock it in" })).toBeFocused();

  // Escape backs out and returns focus to the button that opened it.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(cast).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("button", { name: "Lock it in" })).toBeFocused();
  await page.keyboard.press("Enter");

  const confirmation = page.getByRole("heading", { name: "Counted, Kiki!" });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toBeFocused();
  await expect(page.getByText("You backed Jaws")).toBeVisible();

  // Returning: no second ballot, and the state is announced.
  await page.reload();
  await expect(page.getByRole("heading", { name: "You’re in, Kiki" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Jaws/ })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "You’ve already voted in this poll." })).toBeAttached();
});

test("the vote page keeps the cast button reachable on a phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "Phone layout only");
  await page.goto("/p/birthday-brunch");
  const cast = page.getByRole("button", { name: /^Cast my vote/ });
  await expect(cast).toBeInViewport();
  await page.mouse.wheel(0, 600);
  await expect(cast).toBeInViewport();
});
