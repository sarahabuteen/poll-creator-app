import { expect, test } from "@playwright/test";

test("a guest vote link works, and the vote reaches the organiser's tab live", async ({ context, page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Runs once, on the desktop project");
  test.setTimeout(60_000);

  // The organiser's screen in one tab: the copied link is the guest vote page.
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/guest/polls/friday-film-club");
  const crew = page.getByText(/\d+ of your crew/).first();
  await expect(crew).toBeVisible();
  const before = Number((await crew.textContent())!.match(/\d+/)![0]);
  await page.getByRole("button", { name: "Copy link" }).first().click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).pathname).toBe("/guest/p/friday-film-club");

  // The link opened in another tab of the same browser: the real vote page.
  const voter = await context.newPage();
  await voter.goto(new URL(link).pathname);
  await expect(voter.getByRole("heading", { name: "Who’s voting?" })).toBeVisible();
  await voter.getByLabel("Your name").fill("Guest Gus");
  await voter.getByRole("radio", { name: /Heat/ }).check({ force: true });
  await voter.getByRole("button", { name: /Cast my vote/ }).click();
  await voter.getByRole("dialog").getByRole("button", { name: "Lock it in" }).click();
  await expect(voter.getByRole("heading", { name: "Counted, Guest Gus!" })).toBeVisible();

  // No reload in the organiser's tab.
  await expect(page.getByText(`${before + 1} of your crew`).first()).toBeVisible({ timeout: 10_000 });

  // Saved in this browser: a reload keeps the vote, and the voter is recognised.
  await voter.reload();
  await expect(voter.getByRole("heading", { name: "You’re in, Guest Gus" })).toBeVisible();

  // Start over brings back the untouched samples.
  await page.getByRole("button", { name: "Start over" }).click();
  await page.waitForURL("**/guest");
  await page.goto("/guest/polls/friday-film-club");
  await expect(page.getByText(`${before} of your crew`).first()).toBeVisible();
});
