import { test as base, type Page } from "@playwright/test";
import { BASE_URL, USERS } from "./env";

type Fixtures = { ownerPage: Page; matePage: Page };

async function signedIn(browser: import("@playwright/test").Browser, session: string) {
  const ctx = await browser.newContext({ baseURL: BASE_URL });
  await ctx.addCookies([{ name: "authjs.session-token", value: session, url: BASE_URL }]);
  return ctx.newPage();
}

export const test = base.extend<Fixtures>({
  ownerPage: async ({ browser }, use) => {
    const page = await signedIn(browser, USERS.owner.session);
    await use(page);
    await page.context().close();
  },
  matePage: async ({ browser }, use) => {
    const page = await signedIn(browser, USERS.teammate.session);
    await use(page);
    await page.context().close();
  },
});
export { expect } from "@playwright/test";
