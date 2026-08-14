/**
 * UI states a passive page visit never reaches.
 *
 * 13 settings target `[role="menu"]` (script.js:4281) - the "More" menu popup -
 * so they can never match anything unless the menu is open. Same story for the
 * tweet caret menu, user hover cards, and anything gated on dark mode.
 */

const MENU = '[role="menu"]'
const HOVER_CARD = '[data-testid="HoverCard"]'

async function closeOverlays(page) {
  await page.keyboard.press('Escape').catch(() => {})
  await page.mouse.move(2, 2)
  await page.waitForTimeout(150)
}

// Retried because a single missed click silently turns every probe on the route
// into a false negative - the expensive failure mode here.
async function openMoreMenu(page) {
  const TRIGGERS = [
    '[data-testid="AppTabBar_More_Menu"]',
    'nav [aria-label="More menu items"]',
    '[aria-label="More menu items"]',
  ]

  for (let attempt = 0; attempt < 2; attempt++) {
    await closeOverlays(page)
    for (let selector of TRIGGERS) {
      let $more = page.locator(selector).first()
      if (!await $more.count()) continue
      await $more.click({timeout: 5000}).catch(() => {})
      let open = await page.locator(MENU).first()
        .waitFor({state: 'attached', timeout: 4000})
        .then(() => true, () => false)
      if (open) return true
    }
  }
  return false
}

async function menuOpen(page, timeout = 3000) {
  return await page.locator(MENU).first()
                   .waitFor({state: 'attached', timeout})
                   .then(() => true, () => false)
}

// The first tweet's caret often sits under the sticky header, where a real click
// lands on the header instead - hence scrolling it in, falling back to a
// synthetic click, and trying the next tweet down.
async function openTweetCaretMenu(page) {
  let carets = page.locator('article[data-testid="tweet"] [data-testid="caret"]')

  for (let attempt = 0; attempt < 2; attempt++) {
    await closeOverlays(page)
    let count = Math.min(await carets.count(), 3)
    for (let i = 0; i < count; i++) {
      let $caret = carets.nth(i)
      await $caret.scrollIntoViewIfNeeded({timeout: 2000}).catch(() => {})
      await $caret.click({timeout: 3000})
        .catch(() => $caret.evaluate(el => el.click()).catch(() => {}))
      if (await menuOpen(page)) return true
    }
  }
  return false
}

// X opens the card only after the pointer rests on the link; Playwright's hover
// is instantaneous, so without the dwell the card never appears.
async function openHoverCard(page) {
  let links = page.locator('article[data-testid="tweet"] [data-testid="User-Name"] a[href^="/"]')

  for (let attempt = 0; attempt < 2; attempt++) {
    await closeOverlays(page)
    let count = Math.min(await links.count(), 3)
    for (let i = 0; i < count; i++) {
      let $user = links.nth(i)
      await $user.scrollIntoViewIfNeeded({timeout: 2000}).catch(() => {})
      await $user.hover({timeout: 3000}).catch(() => {})
      await page.waitForTimeout(900)
      let open = await page.locator(HOVER_CARD).first()
        .waitFor({state: 'attached', timeout: 2500})
        .then(() => true, () => false)
      if (open) return true
    }
  }
  return false
}

// X keys its theme off the night_mode cookie: 0 light, 1 dim, 2 lights out.
// The extension's dark-mode CSS is scoped to the body.LightsOut/Dim classes X
// sets from it, so this has to be a real reload rather than a class poke.
async function setTheme(context, page, theme) {
  let value = {light: '0', dim: '1', lightsOut: '2'}[theme]
  await context.addCookies([{
    name: 'night_mode', value, domain: '.x.com', path: '/', secure: true, sameSite: 'Lax',
  }])
  await page.reload({waitUntil: 'domcontentloaded'})
}

async function readTheme(page) {
  return await page.evaluate(() => {
    let c = document.body.className
    return /LightsOut/.test(c) ? 'lightsOut' : /Dim/.test(c) ? 'dim' : 'light'
  })
}

// Named so probes can request one by key.
const STATES = {
  none: {name: 'none', open: async () => true},
  moreMenu: {name: 'moreMenu', open: openMoreMenu},
  caretMenu: {name: 'caretMenu', open: openTweetCaretMenu},
  hoverCard: {name: 'hoverCard', open: openHoverCard},
}

module.exports = {
  MENU, HOVER_CARD, STATES,
  closeOverlays, openMoreMenu, openTweetCaretMenu, openHoverCard,
  setTheme, readTheme,
}
