/**
 * Checks that the icon names script.js matches on still exist on live x.com.
 *
 * X's new client names its icons - inline svg[data-icon="icon-…"] or sprite
 * use[href="#icon-…"] - and those names are the language-independent hook a
 * lot of settings now lean on: the post "…" menu trigger, the Block and Mute
 * menu items, the Grok and Chat dock windows, the logo. They replaced the SVG
 * path prefixes the old client was matched by, and they fail the same way:
 * X renames an icon and the setting silently matches nothing.
 *
 * Two ways a name can break, reported separately:
 *   - renamed or removed: nothing on any visited page carries the name
 *   - changed form: the name is still rendered, but as a sprite where script.js
 *     looks for svg[data-icon], or the reverse, so its selector still misses
 *
 * Notification settings match a Relay value instead (TimelineNotification.icon,
 * e.g. heart_icon), which never reaches the DOM, so those are read from the
 * Relay store on /notifications.
 *
 * Run: node scripts/audit/icon-paths.js
 */
const {launch, openX} = require('./lib/browser')
const {ready, resolveContext} = require('./lib/surfaces')
const {STATES, closeOverlays} = require('./lib/states')
const {readSource, iconNames, iconSelector} = require('./lib/extract')

// Where each icon lives, and the element whose presence proves it should have
// been on screen. Without a carrier a miss means nothing - the false-negative
// trap the probe run has. `canProveDead` is false for content icons: a page of
// posts proves nothing about whether one of them had a Premium check.
// Names script.js gains later and that aren't listed here are still checked,
// but can only ever be reported live or unknown.
const CARRIERS = {
  'icon-logo-x': {place: 'home', carrier: 'a[href="/home"]', canProveDead: true},
  'icon-more-dots-hor': {place: 'home', carrier: 'article', canProveDead: true},
  'icon-chat': {place: 'home', carrier: '[data-slot="xds-dock"]', canProveDead: true},
  'icon-logo-grok': {place: 'home', carrier: '[data-slot="xds-dock"]', canProveDead: true},
  'icon-block': {place: 'caretMenu', carrier: '[data-base-ui-portal] [role="menu"]', canProveDead: true},
  'icon-sound-off': {place: 'caretMenu', carrier: '[data-base-ui-portal] [role="menu"]', canProveDead: true},
  'icon-feather-scatter-plot': {place: 'caretMenu', carrier: '[data-base-ui-portal] [role="menu"]', canProveDead: true},
  // The reply sort button exists only under the focal post
  'icon-chevron-down-sm': {place: 'tweetDetail', carrier: '[id^="urt:conversation:"] li:has(.text-lead)', canProveDead: true},
  // Carousel arrows only render on multi-photo posts
  'icon-chevron-': {place: 'home', carrier: '[class*="group/carousel"]', canProveDead: false},
  'icon-verified-premium-color': {place: 'home', carrier: 'article', canProveDead: false},
}

// `content.icon == 'heart_icon'` - the values notification settings compare.
function readRelayIcons(source) {
  return [...new Set([...source.matchAll(/\.icon == '([a-z_]+)'/g)].map(m => m[1]))]
}

// Every icon name rendered, in each form, plus the sprite's <symbol> ids. A
// symbol alone doesn't prove the icon is used anywhere, but it does prove the
// name still exists in X's icon set.
const COLLECT = (carriers) => ({
  dataIcon: [...document.querySelectorAll('svg[data-icon]')].map(el => el.getAttribute('data-icon')),
  sprite: [...document.querySelectorAll('use[href^="#"]')].map(el => el.getAttribute('href').slice(1)),
  symbols: [...document.querySelectorAll('symbol[id]')].map(el => el.id),
  carriers: Object.fromEntries(carriers.map(sel => [sel, document.querySelectorAll(sel).length])),
})

// Relay keeps every record it has seen, so this covers notifications that have
// scrolled out of the virtualized list as well as the server-rendered first page.
const RELAY_ICONS = () => {
  let fiberKey = (el) => Object.keys(el).find(k => k.startsWith('__reactFiber'))
  let $el = document.querySelector('[id^="urt:notifications"] li') || document.querySelector('main')
  let fiber = $el && $el[fiberKey($el)]
  let env = null
  for (let f = fiber, n = 0; f && n < 600 && !env; f = f.return, n++) {
    let p = f.memoizedProps
    env = p?.environment?.getStore ? p.environment : p?.value?.getStore ? p.value : null
  }
  if (!env) return null
  let source = env.getStore().getSource()
  let icons = []
  for (let id of source.getRecordIDs()) {
    let record = source.get(id)
    if (record?.__typename == 'TimelineNotification' && typeof record.icon == 'string') icons.push(record.icon)
  }
  return icons
}

async function scroll(page) {
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 1400)
    await page.waitForTimeout(700)
  }
}

async function run() {
  let source = readSource()
  let icons = iconNames(source)
  let relayIcons = readRelayIcons(source)
  console.log(`  ${icons.length} icon hooks and ${relayIcons.length} notification icon values in script.js\n`)

  let carriers = [...new Set(Object.values(CARRIERS).map(c => c.carrier))]
  let seen = {dataIcon: new Set(), sprite: new Set(), symbols: new Set()}
  let carrierCounts = new Map()
  let notificationIcons = null

  let record = (place, found) => {
    for (let form of ['dataIcon', 'sprite', 'symbols']) found[form].forEach(n => seen[form].add(n))
    for (let [sel, n] of Object.entries(found.carriers)) {
      if (n > 0) carrierCounts.set(`${place}|${sel}`, n)
    }
    console.log(`  ${place.padEnd(14)} ${new Set([...found.dataIcon, ...found.sprite]).size} icon names rendered`)
  }

  let {context} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()

  try {
    await openX(page)
    let {tweetPath} = await resolveContext(page)

    await page.goto('https://x.com/home', {waitUntil: 'domcontentloaded'})
    await ready(page)
    record('home', await page.evaluate(COLLECT, carriers))
    if (await STATES.caretMenu.open(page)) {
      record('caretMenu', await page.evaluate(COLLECT, carriers))
    } else {
      console.log(`  caretMenu      could not open - skipped`)
    }
    await closeOverlays(page)

    if (tweetPath) {
      await page.goto(`https://x.com${tweetPath}`, {waitUntil: 'domcontentloaded'})
      await ready(page)
      record('tweetDetail', await page.evaluate(COLLECT, carriers))
    } else {
      console.log(`  tweetDetail    no post found - skipped`)
    }

    try {
      await page.goto('https://x.com/notifications', {waitUntil: 'domcontentloaded'})
      await ready(page)
      // Notification types are mixed, and the first screen is often all one
      // kind, which would read as every other value being gone.
      await scroll(page)
      notificationIcons = await page.evaluate(RELAY_ICONS)
      console.log(`  notifications  ${notificationIcons ? notificationIcons.length : 'no Relay store -'} notifications read`)
    } catch (e) {
      console.log(`  notifications  unavailable`)
    }
  } finally {
    await context.close()
  }

  let has = (set, {name, prefix}) => prefix ? [...set].some(n => n.startsWith(name)) : set.has(name)
  let dead = []
  let moved = []
  let unknown = []

  console.log('')
  for (let icon of icons) {
    let own = icon.form == 'sprite' ? seen.sprite : seen.dataIcon
    let other = icon.form == 'sprite' ? seen.dataIcon : seen.sprite
    let where = CARRIERS[icon.name]
    let judgeable = where?.canProveDead && carrierCounts.has(`${where.place}|${where.carrier}`)

    let verdict =
      has(own, icon) ? 'live' :
      has(other, icon) ? 'FORM' :
      judgeable ? 'DEAD' :
      has(seen.symbols, icon) ? 'sym ' : ' -- '
    console.log(`  ${verdict}  ${iconSelector(icon)}`)

    if (verdict == 'FORM') moved.push(icon)
    else if (verdict == 'DEAD') dead.push(icon)
    else if (verdict != 'live') unknown.push({icon, where, symbol: verdict == 'sym '})
  }

  if (notificationIcons) {
    let values = new Set(notificationIcons)
    for (let value of relayIcons) {
      // Which notification types arrive is up to the account, so a missing
      // value can't be told apart from a quiet account.
      console.log(`  ${values.has(value) ? 'live' : ' -- '}  TimelineNotification.icon == '${value}'`)
    }
    console.log(`  (seen: ${[...values].sort().join(', ') || 'none'})`)
  }

  if (unknown.length) {
    console.log(`\n  ${unknown.length} icon(s) could not be judged - nothing that carries them was on`)
    console.log(`  screen, so a non-match means nothing:`)
    for (let {icon, where, symbol} of unknown) {
      let need = where ? `needs ${where.carrier} on ${where.place}` : 'no carrier listed in CARRIERS'
      console.log(`    ${icon.name.padEnd(28)} ${need}${symbol ? ' (still in the sprite)' : ''}`)
    }
  }

  if (moved.length) {
    console.log(`\n  ${moved.length} icon(s) are rendered, but not in the form script.js matches -`)
    console.log(`  its selector misses them:`)
    for (let icon of moved) console.log(`    ${iconSelector(icon)}`)
  }

  if (dead.length) {
    console.log(`\n  ${dead.length} icon(s) matched nothing on a page that had what carries them -`)
    console.log(`  X most likely renamed the icon. Check by hand before changing anything:`)
    for (let icon of dead) console.log(`    ${iconSelector(icon)}`)
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
