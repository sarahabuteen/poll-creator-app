import { expect, test } from "@playwright/test";
import { logInAsSampleCreator } from "./helpers";

test("a vote from a signed-out voter reaches the organiser's live results without a reload", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Runs once, on the desktop project");
  test.setTimeout(60_000);

  await logInAsSampleCreator(page, "/polls/friday-film-club");
  const crew = page.getByText(/\d+ of your crew/).first();
  await expect(crew).toBeVisible();
  const before = Number((await crew.textContent())!.match(/\d+/)![0]);

  // A voter in their own browser: no account, just the link.
  const voterContext = await browser.newContext();
  const voter = await voterContext.newPage();
  await voter.goto("/p/friday-film-club");
  await voter.getByLabel("Your name").fill("Live Lou");
  // The styled radio circle sits over the native input; the label click is what a person does.
  await voter.getByRole("radio", { name: /Jaws/ }).check({ force: true });
  await voter.getByRole("button", { name: /Cast my vote/ }).click();
  await voter.getByRole("dialog").getByRole("button", { name: "Lock it in" }).click();
  await expect(voter.getByRole("heading", { name: "Counted, Live Lou!" })).toBeVisible();

  await expect(page.getByText(`${before + 1} of your crew`).first()).toBeVisible({ timeout: 10_000 });
  await voterContext.close();
});
