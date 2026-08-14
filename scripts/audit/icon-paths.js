/**
 * Checks the SVG path prefixes the extension classifies items by.
 *
 * Some settings don't select elements by testid at all - they read an icon's
 * `d` attribute and match a hard-coded prefix to decide what a timeline or
 * notification item *is*. `selectors.js` cannot see these, because they are
 * string comparisons in JS rather than CSS selectors.
 *
 * They are the most brittle hooks in the codebase: X redraws an icon, the
 * prefix stops matching, and the setting silently classifies nothing. There is
 * no error and no visible failure other than the feature quietly not working -
 * which is exactly how the home and chat icons broke.
 *
 * This visits the surfaces those icons live on, collects every icon path
 * actually rendered, and reports which prefixes still match something.
 *
 * Run: node scripts/audit/icon-paths.js
 */
const fs = require('fs')
const path = require('path')

const {ROOT} = require('./lib/default-config')
const {launch, openX} = require('./lib/browser')
const {ready, resolveContext} = require('./lib/surfaces')

// Pulled from script.js rather than duplicated, so this cannot drift out of
// sync with the code it is checking.
function readPrefixes() {
  let source = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8')
  let lines = source.split('\n')
  let found = []

  lines.forEach((line, i) => {
    let m = line.match(/startsWith\('(M[^']+)'\)/)
    if (!m) return
    // The label is whatever the branch assigns - the next line names the type.
    let context = lines.slice(i, i + 3).join(' ')
    let name = context.match(/(?:return|notificationType =)\s*'(\w+)'/)
    found.push({prefix: m[1], name: name ? name[1] : `line ${i + 1}`, line: i + 1})
  })

  return found
}

// `carrier` is the element that would hold the icon. If none are on the page,
// the prefixes belonging to that surface cannot be judged at all - reporting
// them as dead would be the same false-negative trap the probe run has. This
// account, for instance, has an empty notifications page, which would otherwise
// condemn four live prefixes.
// `canProveDead` marks whether the carrier's presence actually proves the item
// type was on screen. Every notification carries `[data-testid="notification"]`,
// so if any are present and a prefix still doesn't match, the icon changed.
// `socialContext` is different: reposts, pinned and community posts all use it,
// so a page full of reposts proves nothing about the pinned icon. Those can only
// ever be reported live or unknown - never dead.
const SURFACES = [
  {
    name: 'notifications',
    url: 'https://x.com/notifications',
    carrier: '[data-testid="notification"]',
    covers: ['AD', 'LIKE', 'FOLLOW', 'RETWEET'],
    canProveDead: true,
  },
  {
    name: 'home',
    url: 'https://x.com/home',
    carrier: '[data-testid="socialContext"]',
    covers: ['COMMUNITY_TWEET'],
    canProveDead: false,
  },
  // Pinned posts live on profiles, not the timeline - checking only home is why
  // PINNED_TWEET looked dead.
  {
    name: 'profile',
    url: null,
    carrier: '[data-testid="socialContext"]',
    covers: ['PINNED_TWEET'],
    canProveDead: false,
  },
]

async function run() {
  let prefixes = readPrefixes()
  console.log(`  ${prefixes.length} icon-path prefixes in script.js\n`)

  let seen = new Set()
  let carriers = new Map()
  let {context} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()

  try {
    await openX(page)
    let {username} = await resolveContext(page)

    for (let surface of SURFACES) {
      let url = surface.url || (username ? `https://x.com/${username}` : null)
      if (!url) { console.log(`  ${surface.name}: no url`); continue }
      try {
        await page.goto(url, {waitUntil: 'domcontentloaded'})
        await ready(page)
        // Scroll: notification types are mixed, and the first screen is often
        // all one kind, which would read as every other prefix being dead.
        for (let i = 0; i < 6; i++) {
          await page.mouse.wheel(0, 1400)
          await page.waitForTimeout(700)
        }
      } catch (e) {
        console.log(`  ${surface.name}: unavailable`)
        continue
      }
      let found = await page.evaluate((carrier) => ({
        paths: [...document.querySelectorAll('svg path')].map(p => p.getAttribute('d') || ''),
        carriers: document.querySelectorAll(carrier).length,
      }), surface.carrier)

      found.paths.forEach(d => seen.add(d))
      carriers.set(surface.name, found.carriers)
      console.log(`  ${surface.name.padEnd(14)} ${found.paths.length} icon paths, ` +
                  `${found.carriers} ${surface.carrier}`)
    }
  } finally {
    await context.close()
  }

  console.log(`\n  ${seen.size} distinct paths collected\n`)

  let surfaceFor = (name) => SURFACES.find(s => s.covers.includes(name))
  let dead = []
  let unknown = []

  for (let {prefix, name, line} of prefixes) {
    let hit = [...seen].some(d => d.startsWith(prefix))
    let surface = surfaceFor(name)
    let judgeable = surface && surface.canProveDead && carriers.get(surface.name) > 0

    let verdict = hit ? 'live' : judgeable ? 'DEAD' : ' -- '
    console.log(`  ${verdict}  ${name.padEnd(16)} script.js:${line}`)
    if (hit) continue
    ;(judgeable ? dead : unknown).push({name, line, prefix, surface})
  }

  if (unknown.length) {
    console.log(`\n  ${unknown.length} prefix(es) could not be judged - the page had none of the`)
    console.log(`  items that carry them, so a non-match means nothing:`)
    for (let u of unknown) {
      console.log(`    ${u.name.padEnd(16)} needs a ${u.name.toLowerCase().replace('_', ' ')} on /${u.surface.name}`)
    }
  }

  if (dead.length) {
    console.log(`\n  ${dead.length} prefix(es) matched nothing on a page that did have the items`)
    console.log(`  carrying them - X most likely redrew the icon. Check by hand before`)
    console.log(`  changing anything:`)
    for (let d of dead) console.log(`    ${d.name.padEnd(16)} ${d.prefix.slice(0, 40)}...`)
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
