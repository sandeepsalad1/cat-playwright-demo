# cat.com Playwright demo

A small Playwright + TypeScript suite that navigates the public Caterpillar website
(www.cat.com) using the **Page Object Model**, **custom fixtures** and a reusable
**Cat ID (Azure AD B2C) sign-in** saved as storage state.

Built by Sandeep Saladi as a sample of how I structure UI automation.

## What it covers

| Spec | What it checks |
| --- | --- |
| `tests/public/navigation.spec.ts` | Home page loads; Home -> Equipment catalogue (25 families rendered client-side); data-driven journeys into Excavators (and its Mini Excavators sub-category), Dozers, Off-Highway Trucks and Motor Graders; Financing and Merchandise pages; Sign In hands off to Cat ID |
| `tests/auth.setup.ts` | Signs in once through Cat ID and saves the session to `.auth/user.json` |
| `tests/authenticated/my-account.spec.ts` | Signed-in user can open My Account and its sections; session survives navigation |

## Structure

```
src/
  components/Header.ts          # global header (logo, account menu, Sign In)
  pages/BasePage.ts             # goto(), cookie banner, heading, load check
  pages/HomePage.ts
  pages/EquipmentPage.ts        # catalogue grid, waits for client-side render
  pages/EquipmentCategoryPage.ts
  pages/SimplePage.ts           # financing / merchandise
  pages/SignInPage.ts           # two-step Cat ID login
  pages/MyAccountPage.ts
  fixtures/test.ts              # page objects injected as fixtures
  data/equipment.ts             # data for the parameterised journeys
  config/paths.ts               # storage state location
tests/
  public/  authenticated/  auth.setup.ts
playwright.config.ts            # projects: public, setup -> authenticated
```

## Running

```bash
npm install
npx playwright install chromium
npm run test:public        # public navigation (no login needed)
npm run report             # open the HTML report
```

### Authenticated tests

1. Copy `.env.example` to `.env` and add your own Cat ID (CWS ID) and password.
2. `npm test` - the `setup` project signs in once, then `authenticated` reuses the session.

`.env` and `.auth/` are git-ignored, so credentials and session cookies are never committed.
If no credentials are set, the setup and authenticated projects are skipped automatically.

## Things worth knowing about cat.com

- **Bot protection.** The classic headless shell is dropped (connection hangs or is reset).
  The suite uses Chromium's *new headless* mode (`channel: 'chromium'`) with the Desktop Chrome
  device profile, which loads normally. Workers are kept low to be polite to a production site.
- **Client-side catalogue.** The equipment grid is empty at DOMContentLoaded and renders a few
  seconds later, so `EquipmentPage.waitForCatalogue()` waits for the first card.
- **Hidden duplicates.** The mega-menu contains hidden copies of most links; locators use
  `:visible` or scope to the page content.
- **Inconsistent URLs.** Most categories are `/equipment/<slug>.html`, but Motor Graders is
  `/content/catdotcom/.../equipment/motor-graders/motor-graders.html`, so links are matched on
  the slug segment.
- **`load` can be slow.** Navigation waits for `domcontentloaded` and then for specific elements.
- **OneTrust cookie banner** is dismissed in `BasePage.goto()`.

Tested with Playwright 1.49, Node 24, Windows 11.
