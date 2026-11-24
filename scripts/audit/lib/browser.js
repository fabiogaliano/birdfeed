const fs = require('fs')
const path = require('path')

const {chromium} = require('playwright')

const {ROOT} = require('./default-config')
const {readAuth, authCookies} = require('./session')
const {installGuard} = require('./guard')

const PROFILE_DIR = path.join(ROOT, '.x-profile')

// Desktop and mobile are separate codepaths in script.js, selected by a
// (max-width: 511px) media query - so layout is a property of window width, not
// a setting. 1600 is comfortably past X's 1024px sidebar breakpoint, and 400 is
// under the 512px one where the rail gives way to the bottom bar.
const DESKTOP = {width: 1600, height: 1000}
const MOBILE = {width: 400, height: 900}

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
// The mobile breakpoint alone is not enough: a 700px window is "desktop" to
// script.js while X still hides the sidebar below 1024px. The sidebar is the
// signal that actually matters.
async function assertLayout(page, expected) {
  let state = await page.evaluate(() => ({
    // The same query script.js picks its codepath by
    layout: matchMedia('(max-width: 511px)').matches ? 'mobile' : 'desktop',
    width: window.innerWidth,
  }))

  if (state.layout != expected) {
    throw new Error(`Expected ${expected} layout but X rendered ${state.layout} (viewport ${state.width}px)`)
  }

  if (expected != 'desktop') return

  // The aside stays in the DOM at every width and is only display:none below
  // the breakpoint, so its presence proves nothing - visibility does. Waited
  // for, because it renders after main.
  let sidebar = await page.locator('aside')
                          .first()
                          .waitFor({state: 'visible', timeout: 20_000})
                          .then(() => true, () => false)
  if (!sidebar) {
    throw new Error(
      `Desktop layout has no visible sidebar at ${state.width}px - probes for ` +
      `sidebar settings would read as dead. Widen the viewport.`
    )
  }
}

// Waits for posts to be *attached*, not visible: the extension collapses
// timeline rows by design (retweets:'separate', ads), so a visibility check
// would hang whenever a probe is doing its job.
async function waitForTimeline(page, {timeout = 60_000} = {}) {
  await page.waitForSelector('[id^="urt:"] > ul > li article', {state: 'attached', timeout})
}

// The viewer is in the server-rendered boot data, so this doesn't depend on
// any nav markup, which hide*Nav settings remove by design.
async function isLoggedIn(page) {
  return await page.waitForFunction(() => window.__INITIAL_DATA__?.viewerScreenName, null, {timeout: 30_000})
                   .then(() => true, () => false)
}

module.exports = {PROFILE_DIR, DESKTOP, MOBILE, launch, openX, isLoggedIn, assertLayout, waitForTimeline}
