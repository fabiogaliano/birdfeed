const fs = require('fs')
const path = require('path')

const {chromium} = require('playwright')

const {ROOT} = require('./default-config')
const {readAuth, authCookies} = require('./session')
const {installGuard} = require('./guard')

const PROFILE_DIR = path.join(ROOT, '.x-profile')

// Desktop and mobile are separate codepaths in script.js, selected by the app
// wrapper's flex-direction - so layout is a property of window width, not a
// setting. 1600 is comfortably past X's sidebar breakpoint.
const DESKTOP = {width: 1600, height: 1000}
const MOBILE = {width: 600, height: 900}

// The extension is loaded rather than hand-injected so what we measure is what
// ships - content.js's document_start logo swap included.
//
// launchPersistentContext is required for extensions and doesn't accept
// storageState, so the session is seeded with addCookies instead.
async function launch({headless = false, layout = 'desktop'} = {}) {
  let {width, height} = layout == 'mobile' ? MOBILE : DESKTOP

  if (!fs.existsSync(path.join(ROOT, 'manifest.json'))) {
    throw new Error('manifest.json is missing - run `pnpm run copy-mv3` first')
  }

  let auth = readAuth()

  let context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    // An explicit viewport, not viewport:null - with a persistent context
    // --window-size does not reliably reach the page, and a narrow viewport
    // makes X drop the sidebar entirely, which silently reads as "every
    // desktop-only setting is dead".
    viewport: {width, height},
    args: [
      `--window-size=${width},${height + 120}`,
      `--disable-extensions-except=${ROOT}`,
      `--load-extension=${ROOT}`,
    ],
  })

  await context.addCookies(authCookies(auth))

  // AUDIT_NO_GUARD isolates the guard when X misbehaves - a blocked request that
  // the app actually needs looks identical to X being broken.
  let guard = process.env.AUDIT_NO_GUARD
    ? {blocked: [], withMutations: (fn) => fn()}
    : installGuard(context, {
        onBlocked: (method, url) => {
          if (process.env.AUDIT_VERBOSE) console.log(`    blocked ${method} ${url.slice(0, 100)}`)
        },
      })

  return {context, guard}
}

async function openX(page, url = 'https://x.com/home', {layout = 'desktop'} = {}) {
  await page.goto(url, {waitUntil: 'domcontentloaded'})

  if (!await isLoggedIn(page)) {
    throw new Error(
      'Session cookies were rejected - auth_token/ct0 are probably stale.\n' +
      'Re-copy them from a logged-in X tab into .x-auth.json.'
    )
  }

  await assertLayout(page, layout)
}

// A too-narrow window makes every desktop-only setting read as dead, which is
// indistinguishable from X having broken it. Fail loudly instead.
//
// flex-direction alone is not enough: X only goes column below ~500px, so a
// 680px window reports "desktop" while still dropping the sidebar. The sidebar
// column is the signal that actually matters.
async function assertLayout(page, expected) {
  let state = await page.evaluate(() => {
    let $appWrapper = document.querySelector('#layers + div')
    return {
      layout: !$appWrapper ? 'unknown'
        : getComputedStyle($appWrapper).flexDirection == 'column' ? 'mobile' : 'desktop',
      width: window.innerWidth,
      sidebar: Boolean(document.querySelector('[data-testid="sidebarColumn"]')),
    }
  })

  if (state.layout != expected) {
    throw new Error(`Expected ${expected} layout but X rendered ${state.layout} (viewport ${state.width}px)`)
  }

  if (expected != 'desktop') return

  // The sidebar renders after the primary column, so sample it with a wait
  let sidebar = await page.locator('[data-testid="sidebarColumn"]')
                          .first()
                          .waitFor({state: 'attached', timeout: 20_000})
                          .then(() => true, () => false)
  if (!sidebar) {
    throw new Error(
      `Desktop layout has no sidebarColumn at ${state.width}px - probes for ` +
      `sidebar settings would read as dead. Widen the viewport.`
    )
  }
}

// Waits for tweets to be *attached*, not visible: the extension hides tweets by
// design (retweets:'separate', hideForYouTimeline), so a visibility check would
// hang whenever a probe is doing its job.
async function waitForTimeline(page, {timeout = 60_000} = {}) {
  await page.waitForSelector('[data-testid="tweet"]', {state: 'attached', timeout})
}

async function isLoggedIn(page) {
  return await page.locator('a[data-testid="AppTabBar_Home_Link"]')
                   .first()
                   .waitFor({state: 'visible', timeout: 30_000})
                   .then(() => true, () => false)
}

module.exports = {PROFILE_DIR, DESKTOP, MOBILE, launch, openX, isLoggedIn, assertLayout, waitForTimeline}
