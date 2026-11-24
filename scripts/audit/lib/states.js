/**
 * UI states a passive page visit never reaches.
 *
 * The nav settings for Lists, Communities, Business, Ads and Spaces target
 * links inside the nav's "More" menu, so they can never match anything unless
 * the menu is open. Same story for the post "…" menu and user hover cards.
 */

// Every Base UI menu - nav More, post "…", account, trend - portals to the end
// of <body>, so which one opened is down to which trigger was clicked.
const MENU = '[data-base-ui-portal] [role="menu"]'
// The hover card has no marker of its own. Its Following and Followers links
// are what identify it - the same test script.js uses. Followers points at
// /verified_followers unless hideVerifiedNotificationsTab has rewritten it.
const HOVER_CARD = '[data-base-ui-portal] [role="presentation"]:has(a[href$="/following"]):has(a[href$="/verified_followers"], a[href$="/followers"])'
// Quoted posts are articles too, with their own "…" menu and author links.
const NOT_QUOTED = ':not([data-slot="embedded-tweet-frame"] *)'

async function closeOverlays(page) {
  await page.keyboard.press('Escape').catch(() => {})
  await page.mouse.move(2, 2)
  await page.waitForTimeout(150)
}

// Retried because a single missed click silently turns every probe on the route
// into a false negative - the expensive failure mode here.
async function openMoreMenu(page) {
  // The rail, not the mobile bottom bar - both are nav[aria-label="Primary"].
  // The icon is the fallback in case X wraps the button.
  const TRIGGERS = [
    'nav:not([data-bottom-bar]) > button[aria-haspopup="menu"]',
    'nav:not([data-bottom-bar]) button:has(svg[data-icon="icon-more-dots-hor-circle"])',
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
  let carets = page.locator(
    `article button[data-slot="xds-menu-trigger"]:has(use[href="#icon-more-dots-hor"], svg[data-icon="icon-more-dots-hor"])${NOT_QUOTED}`
  )

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
// is instantaneous, so without the dwell the card never appears. The avatar is
// hovered rather than the name: it is the one author link with a marker.
async function openHoverCard(page) {
  let links = page.locator(`article [data-post-avatar]${NOT_QUOTED} a[href^="/"]`)

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

// X keys its theme off the night_mode cookie: 0 light, 1 or 2 dark - Dim is
// gone, so both of those now render the same dark theme. X sets
// html[data-theme] from the cookie at load, so this has to be a real reload
// rather than an attribute poke.
async function setTheme(context, page, theme) {
  let value = {light: '0', dim: '1', lightsOut: '2'}[theme]
  await context.addCookies([{
    name: 'night_mode', value, domain: '.x.com', path: '/', secure: true, sameSite: 'Lax',
  }])
  await page.reload({waitUntil: 'domcontentloaded'})
}

async function readTheme(page) {
  // 'lightsOut' rather than 'dark' because routes and recorded results are
  // keyed by the old theme names.
  return await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme') == 'dark' ? 'lightsOut' : 'light'
  )
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
