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

### BDD (Gherkin) layer

The same journeys are also written as Cucumber-style feature files and run through
[playwright-bdd](https://github.com/vitalets/playwright-bdd), so they reuse the page objects,
fixtures, config, reports and traces instead of a separate Cucumber runner.

| Feature | Scenarios |
| --- | --- |
| `features/equipment-navigation.feature` | Open the catalogue; Scenario Outline for 4 equipment families; drill down to a sub-category |
| `features/site-pages.feature` | Financing and Merchandise pages (Scenario Outline); sign in hands off to Cat ID |

Step definitions live in `features/steps/navigation.steps.ts`. `features/steps/fixtures.ts`
extends playwright-bdd's `test` with the same `pageFixtures` used by the plain specs, plus a
small per-scenario state object for the current equipment family. `bddgen` compiles the
features into `.features-gen/` (git-ignored) before each run.

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
  fixtures/pageFixtures.ts      # page-object fixtures shared by specs and BDD steps
  fixtures/test.ts              # Playwright test extended with the fixtures
  data/equipment.ts             # data for the parameterised journeys
  config/paths.ts               # storage state location
tests/
  public/  authenticated/  auth.setup.ts
features/
  *.feature                     # Gherkin scenarios
  steps/                        # step definitions + BDD fixtures
playwright.config.ts            # projects: public, bdd, setup -> authenticated
```

## How to run the tests

### 1. Prerequisites

- Node.js 18 or later (tested on Node 24)
- Internet access to www.cat.com

### 2. First-time setup

Run these once, from the project folder:

```bash
cd cat-playwright-demo
npm install                          # installs Playwright, playwright-bdd, TypeScript
npx playwright install chromium      # downloads the Chromium browser
```

> **Windows PowerShell:** if you see *"running scripts is disabled on this system"*, use
> `npm.cmd` / `npx.cmd` instead of `npm` / `npx` in every command below
> (for example `npm.cmd run test:headed`), or run the commands from Command Prompt or Git Bash.
>
> **Windows PowerShell 5.1** does not support `&&`. Where a command below chains with `&&`,
> use `;` instead, e.g. `npx.cmd bddgen; npx.cmd playwright test --project=bdd`.
> The `npm run` scripts work unchanged in every shell.

### 3. Run the tests

| What | Command |
| --- | --- |
| Watch the tests in a visible browser (public + BDD, one at a time) | `npm run test:headed` |
| Public navigation specs only (headless) | `npm run test:public` |
| Cucumber / BDD scenarios only | `npm run test:bdd` |
| Everything (public + BDD + authenticated, if set up) | `npm test` |
| Signed-in tests only | `npm run test:auth` |
| Type-check the TypeScript | `npm run typecheck` |
| Open the HTML report from the last run | `npm run report` |

**Passing Playwright options through an npm script:** put `--` before them, otherwise npm keeps
the option for itself (and warns `Unknown cli config "--headed"`):

```bash
npm run test:bdd -- --headed
npm run test:public -- --headed --workers=1
npm run test:bdd -- --headed -g "Sign in hands off to Cat ID"
```

`npm run test:bdd`, `npm test` and `npm run test:headed` run `bddgen` first, which turns the
`.feature` files into Playwright specs in `.features-gen/`. If you call `npx playwright test`
directly for the `bdd` project, run `npx bddgen` before it.

### 4. Run a single test or scenario

```bash
# by test / scenario name (regex match)
npx playwright test --project=public -g "equipment -> dozers"
npx bddgen && npx playwright test --project=bdd -g "Sign in hands off to Cat ID"

# one Scenario Outline row (Examples are numbered)
npx bddgen && npx playwright test --project=bdd -g "Open an equipment family" -g "Example #4"

# one file
npx playwright test tests/public/navigation.spec.ts
```

Add `--headed` to watch any of these, or `--workers=1` to run them one at a time.

### 5. Debugging

```bash
npx playwright test --project=public --debug        # step through with the Playwright Inspector
npx playwright test --ui                             # UI mode: pick tests, time-travel, watch mode
npx playwright show-trace test-results/<test-folder>/trace.zip   # open a saved trace
```

Failed tests keep a screenshot, video and (on retry) a trace under `test-results/`, and the
HTML report (`npm run report`) links to all of them.

### 6. Authenticated (signed-in) tests

The signed-in tests reuse a saved browser session in `.auth/user.json` (Playwright *storage state*),
so they don't log in for every test. There are two ways to create that session.

**Option A - automatic sign-in with credentials in `.env`**

1. Copy the example file and add your own Cat ID:
   ```bash
   cp .env.example .env        # PowerShell / cmd: copy .env.example .env
   ```
   ```
   CAT_USERNAME=your-cws-id
   CAT_PASSWORD=your-password
   ```
2. Run the signed-in tests. The `setup` project signs in once through Cat ID, saves
   `.auth/user.json`, then the `authenticated` project reuses it:
   ```bash
   npm run test:auth           # add --headed to watch:  npx playwright test --project=authenticated --headed
   ```

**Option B - sign in by hand and save the session (no password stored)**

Use this if your account has MFA, a one-time code or a captcha.

1. Open a recorder browser that will save the session when you close it:
   ```bash
   npx playwright codegen --channel=chromium --save-storage=.auth/user.json https://www.cat.com/en_US.html
   ```
2. In that browser: accept the cookie banner, click **Sign In -> Sign In**, enter your CWS ID,
   **Continue**, your password, **Sign in** (tick *Keep me signed in* if offered).
3. **Wait until you are back on cat.com and signed in**, then close the window. The session is
   only saved when the window closes, so closing it on the sign-in page saves a logged-out session.
4. Run the signed-in tests without the setup step:
   ```bash
   npx playwright test --project=authenticated --no-deps --headed
   ```

**How it is wired**

| File | Role |
| --- | --- |
| `src/config/paths.ts` | `STORAGE_STATE` = `.auth/user.json` |
| `tests/auth.setup.ts` | signs in and calls `page.context().storageState({ path: STORAGE_STATE })` |
| `playwright.config.ts` | `authenticated` project uses `storageState: STORAGE_STATE`; it depends on `setup` when credentials are set, and runs on its own when only a saved session exists |

`.env` and `.auth/` are git-ignored, so credentials and session cookies are never committed.
Never share `.auth/user.json` - anyone holding it is signed in as you. If neither credentials nor
a saved session exist, the signed-in projects are simply not created.

### 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `running scripts is disabled on this system` | Use `npm.cmd` / `npx.cmd`, or run from cmd / Git Bash |
| `The token '&&' is not a valid statement separator` | Windows PowerShell 5.1: replace `&&` with `;` |
| `npm warn Unknown cli config "--headed"` | Add `--` before Playwright options: `npm run test:bdd -- --headed` |
| `Project(s) "authenticated" not found` | Create `.env` (Option A) or `.auth/user.json` (Option B) first |
| Signed-in tests land on `signin.cat.com` | The saved session is missing or expired: delete `.auth/user.json` and create it again |
| `page.goto` timeouts or `ERR_CONNECTION_RESET` | cat.com bot protection: keep `channel: 'chromium'` and the Desktop Chrome device profile, and avoid running many workers |
| `Missing step definition` in BDD | Run `npx bddgen` and check the step text matches `features/steps/navigation.steps.ts` |

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

Tested with Playwright 1.49, playwright-bdd 8.4, Node 24, Windows 11: 17/17 passing headed
(8 specs + 9 BDD scenarios).
