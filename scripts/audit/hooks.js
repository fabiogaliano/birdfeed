/**
 * Splits the map's "probed, moved nothing" settings into broken vs blocked.
 *
 * The probe run can only say a setting changed nothing. It cannot say why, so
 * `hideAdsNav` (this account has no Ads item) and a setting X genuinely broke
 * land in the same bucket. That bucket is the one thing the map could never
 * answer, and it is the whole question: is this outdated, or just untested?
 *
 * This asks a different question of the same source. For each setting it pulls
 * the code guarded by `config.<setting>`, extracts every hook that code depends
 * on, and counts those hooks against live x.com:
 *
 *   DEAD     every hook matches nothing anywhere -> the setting cannot fire,
 *            X has moved out from under it
 *   ALIVE    at least one hook still matches -> the code can bite, so the
 *            probe's zero was missing content or state, not breakage
 *
 * Nothing is toggled and nothing is reset, so this runs in a few minutes.
 *
 * Run: node scripts/audit/hooks.js
 */
const fs = require('fs')
const path = require('path')

const {ROOT, readDefaultConfig} = require('./lib/default-config')
const {launch, openX} = require('./lib/browser')
const {ready, resolveContext, buildSurfaces} = require('./lib/surfaces')
const {STATES, closeOverlays} = require('./lib/states')
const {readFunctions, blocksFor, deriveTargets, routeFor} = require('./lib/routing')
const {readSource, readConstants, withConstants, iconNames, iconSelector, attrHooks} = require('./lib/extract')

const MAP_JSON = path.join(ROOT, 'audit-results', 'settings-map.json')
const OUT_JSON = path.join(ROOT, 'audit-results', 'hooks.json')
const OUT_MD = path.join(ROOT, 'audit-results', 'hooks.md')

// Tighter than routing's 800: a selector dragged in from the next function makes
// a dead setting look alive, which is the one verdict this must not get wrong.
const HOOK_BLOCK = 240

// Everything in a block that could be a hook into X's DOM.
function hooksIn(block, constants) {
  let found = new Map()
  let add = (name, selector, kind) => {
    // `${` means a template literal was frozen mid-interpolation - that string
    // is not a selector and would match zero forever, reading as false breakage.
    if (!selector || selector.includes('${') || found.has(name)) return
    found.set(name, {name, selector, kind})
  }

  // A block that names TIMELINE_ROW or POST_MENU_TRIGGER depends on their hooks
  // as much as on its own.
  let text = withConstants(block, constants)

  // Icon names, which X renames the way it used to redraw SVG paths.
  for (let icon of iconNames(text)) {
    add(`icon:${icon.name}${icon.prefix ? '*' : ''}`, iconSelector(icon), 'icon')
  }
  // X's semantic attributes - data-engagement-action, data-slot, urt: ids -
  // which stand in for the data-testids the old client had.
  for (let hook of attrHooks(text)) add(`attr:${hook.name}`, hook.selector, 'attr')
  // href hooks - how several settings identify their subject. Suffix and
  // substring forms matter as much as prefix: hideCreatorStudioNav's only real
  // hook is a[href$="/creators/studio"], and reading just `^=` misses it.
  // `#…` hrefs are sprite icons, already counted above.
  for (let m of text.matchAll(/href([\^$*]?)=\\?["']([^"'\\#][^"'\\]*)\\?["']/g)) {
    if (m[2].includes('${')) continue
    add(`href${m[1]}:${m[2]}`, `a[href${m[1]}="${m[2]}"]`, 'href')
  }
  // Bare aria/role hooks the extension leans on for menus.
  for (let m of text.matchAll(/\[(?:role|aria-label)=\\?["']([^"'\\]+)\\?["']\]/g)) {
    add(`role:${m[1]}`, `[role="${m[1]}"]`, 'role')
  }

  // #cpft* are the extension's own injected ids - present only once the setting
  // is on, so they say nothing about whether X moved.
  let hooks = [...found.values()].filter(h => !h.selector.includes('#cpft'))

  // Chrome vs content, because a zero means opposite things for each.
  //
  // Chrome (nav, menus, page structure) is on every load regardless of what
  // the account can see, so a chrome hook matching nothing is real breakage.
  // Content (a link inside a post, a specific post type) is absent whenever
  // that content isn't on screen, which is indistinguishable from breakage -
  // exactly the ambiguity this tool exists to remove, so it must not pretend
  // to have resolved it. configureCss's nav scopes are the `rail`, `anyNav`
  // and `menus` variables, so their names mark a nav block.
  let inNav = /\bnav\b|\$\{(?:rail|anyNav|menus)\}|\[role="menu"\]|\baside\b|xds-dock/.test(block)
  for (let h of hooks) {
    h.family = h.kind == 'href' || h.kind == 'icon'
      ? (inNav ? 'chrome' : 'content')
      : 'chrome'
  }
  return hooks
}

// Notification settings classify an item by comparing a Relay value -
// `content.icon == 'heart_icon'` - rather than querying the DOM. No selector
// exists to count, so this method is blind to them by construction -
// icon-paths.js reads those values from the Relay store instead.
//
// Scanned around the reference rather than in the forward block, so it
// doesn't depend on which side of the comparison the config mention is on.
function usesIconValue(source, key) {
  let pattern = new RegExp(`config\\.${key}\\b`, 'g')
  for (let m of source.matchAll(pattern)) {
    let around = source.slice(Math.max(0, m.index - 200), m.index + 200)
    if (/\.icon\s*==/.test(around)) return true
  }
  return false
}

// A hook shared by many of the unresolved settings is structural, not
// diagnostic: [id^="urt:"] and [role="group"] are on every page, so letting
// them count would mark every setting alive regardless of breakage.
// Measured rather than hand-listed, so it stays right as the code moves.
const SHARED_FRACTION = 0.25

function markGeneric(settings) {
  let uses = new Map()
  for (let s of settings) {
    for (let h of new Set(s.hooks.map(x => x.selector))) {
      uses.set(h, (uses.get(h) || 0) + 1)
    }
  }
  let limit = Math.max(2, Math.ceil(settings.length * SHARED_FRACTION))
  for (let s of settings) {
    for (let h of s.hooks) h.generic = uses.get(h.selector) >= limit
  }
  return settings
}

function collect() {
  let map = JSON.parse(fs.readFileSync(MAP_JSON, 'utf8'))
  // A map recorded before a setting was retired still lists it, and with no
  // code left it would read as unjudgeable rather than gone.
  let current = readDefaultConfig()
  let unresolved = map.unconfirmed
    .filter(u => u.hasRoutingEvidence && !u.subThreshold && u.key in current)
    .map(u => u.key)

  let source = readSource()
  let constants = readConstants(source)
  let blocks = new Map()
  for (let fn of readFunctions()) {
    for (let [key, block] of blocksFor(fn.body, HOOK_BLOCK)) {
      blocks.set(key, (blocks.get(key) || '') + '\n' + block)
    }
  }

  let targets = deriveTargets()
  return markGeneric(unresolved.map(key => {
    let block = blocks.get(key) || ''
    return {
      key,
      hooks: hooksIn(block, constants),
      iconValue: usesIconValue(source, key),
      routes: routeFor(key, targets),
    }
  }))
}

async function countAll(page, selectors) {
  return await page.evaluate((list) => list.map(sel => {
    try {
      return document.querySelectorAll(sel).length
    } catch {
      return -1
    }
  }), selectors)
}

async function run() {
  let settings = collect()
  let all = new Map()
  for (let s of settings) for (let h of s.hooks) all.set(h.selector, h)
  let selectors = [...all.keys()]

  console.log(`  ${settings.length} unresolved settings, ${selectors.length} distinct hooks`)
  let noHooks = settings.filter(s => !s.hooks.length)
  if (noHooks.length) {
    console.log(`  ${noHooks.length} have no DOM hook at all: ${noHooks.map(s => s.key).join(', ')}`)
  }

  // --dry checks the static half - which hooks each setting resolves to -
  // without spending a live run on a bad extraction.
  if (process.argv.includes('--dry')) {
    for (let s of settings) {
      console.log(`\n${s.key}  (${s.routes.map(r => r.surface).join(', ')})`)
      for (let h of s.hooks) console.log(`   ${h.kind.padEnd(7)} ${h.name.padEnd(30)} ${h.selector.slice(0, 70)}`)
    }
    return
  }

  let counts = new Map(selectors.map(s => [s, {}]))
  let {context} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()

  try {
    await openX(page)
    let wanted = new Set(settings.flatMap(s => s.routes.map(r => r.surface)))
    let surfaces = buildSurfaces(await resolveContext(page)).filter(s => wanted.has(s.name))

    for (let surface of surfaces) {
      try {
        await page.goto(surface.url, {waitUntil: 'domcontentloaded'})
        await ready(page)
      } catch {
        console.log(`  ${surface.name.padEnd(14)} unavailable`)
        continue
      }
      let found = await countAll(page, selectors)
      selectors.forEach((s, i) => { counts.get(s)[surface.name] = found[i] })
      console.log(`  ${surface.name.padEnd(14)} ${found.filter(n => n > 0).length}/${selectors.length} match`)

      // Menu-only hooks match nothing until the menu is open, so without this
      // every menu-item setting would read as dead.
      if (surface.name == 'home') {
        // hoverCard included: without it, every hover-card setting reads dead
        // because the card is not in the DOM until the pointer rests on a name.
        for (let state of ['moreMenu', 'caretMenu', 'hoverCard']) {
          if (!await STATES[state].open(page)) {
            console.log(`  ${state.padEnd(14)} could not open - skipped`)
            continue
          }
          let inState = await countAll(page, selectors)
          selectors.forEach((s, i) => { counts.get(s)[state] = inState[i] })
          console.log(`  ${state.padEnd(14)} ${inState.filter(n => n > 0).length}/${selectors.length} match`)
          await closeOverlays(page)
        }
      }
    }
  } finally {
    await context.close()
  }

  let total = (sel) => Object.values(counts.get(sel) || {}).reduce((a, b) => a + Math.max(0, b), 0)
  let where = (sel) => Object.entries(counts.get(sel) || {})
    .filter(([, n]) => n > 0).map(([k, n]) => `${k}:${n}`).join(' ')

  let rows = settings.map(s => {
    let hooks = s.hooks.map(h => ({...h, count: total(h.selector), where: where(h.selector)}))
    // Only distinctive hooks decide the verdict. A setting whose sole surviving
    // hook is [id^="urt:"] has told us nothing about itself.
    let telling = hooks.filter(h => !h.generic)
    let live = telling.filter(h => h.count > 0)

    // "Broken" is the one verdict that must not be wrong, so it needs a chrome
    // hook that matched nothing. All-content zeros stay unresolved rather than
    // being upgraded into a breakage claim the evidence doesn't support.
    let verdict =
      s.iconValue ? 'icon-value' :
      !telling.length ? 'no-hooks' :
      live.length ? 'alive' :
      telling.some(h => h.family == 'chrome') ? 'dead' : 'content-absent'

    return {key: s.key, verdict, hooks, telling: telling.length, live: live.length}
  })

  fs.writeFileSync(OUT_JSON, JSON.stringify({ranAt: new Date().toISOString(), rows}, null, 2))

  let of = (v) => rows.filter(r => r.verdict == v)
  let md = ['# Unresolved settings: broken or blocked?', '',
    `Generated ${new Date().toISOString().slice(0, 10)} against live x.com.`, '',
    'The probe run could only report that these changed nothing. This asks',
    'whether the hooks their code depends on still match anything, which',
    'separates "X broke it" from "the run had nothing to act on".', '',
    `| Verdict | Count |`, `|---|---|`,
    `| Dead — a chrome hook matches nothing | ${of('dead').length} |`,
    `| Alive — hooks match, so blocked on content | ${of('alive').length} |`,
    `| Content absent — cannot tell broken from untested | ${of('content-absent').length} |`,
    `| Relay icon value — see icon-paths.js | ${of('icon-value').length} |`,
    `| No DOM hook to check | ${of('no-hooks').length} |`, '']

  md.push('## Dead — every hook matches nothing', '',
    'These cannot fire on X as it renders today. Each row lists the hooks that',
    'no longer match, which is where a fix starts.', '',
    '| Setting | Hooks that match nothing |', '|---|---|')
  for (let r of of('dead')) {
    md.push(`| \`${r.key}\` | ${r.hooks.map(h => `\`${h.name}\``).join('<br>')} |`)
  }

  md.push('', '## Alive — blocked on content, not broken', '',
    'At least one hook still matches, so the code can act. The probe read zero',
    'because the subject was not on the page.', '',
    '| Setting | Live hooks | Where |', '|---|---|---|')
  for (let r of of('alive').sort((a, b) => b.live - a.live)) {
    let best = r.hooks.filter(h => h.count > 0).slice(0, 3)
    md.push(`| \`${r.key}\` | ${r.live}/${r.hooks.length} | ${best.map(h => `\`${h.name}\` ${h.where}`).join('<br>')} |`)
  }

  if (of('content-absent').length) {
    md.push('', '## Content absent — still unresolved', '',
      'Every hook these depend on matches content rather than page furniture -',
      'a link inside a post, a specific post type. Zero means that content was',
      'not on screen, which this method cannot tell apart from breakage. They',
      'need a page that is guaranteed to contain the subject.', '',
      '| Setting | Content hook |', '|---|---|')
    for (let r of of('content-absent')) {
      md.push(`| \`${r.key}\` | ${r.hooks.filter(h => !h.generic).map(h => `\`${h.selector}\``).join('<br>')} |`)
    }
  }

  if (of('icon-value').length) {
    md.push('', '## Matched by a Relay icon value — not visible to this method', '',
      'These classify a notification by its `icon` value in Relay, so there is',
      'no selector to count. `scripts/audit/icon-paths.js` covers them.', '',
      ...of('icon-value').map(r => `- \`${r.key}\``))
  }

  if (of('no-hooks').length) {
    md.push('', '## No DOM hook to check', '',
      'Nothing in these blocks queries the page - most act on GraphQL responses',
      'or Relay records - so this method cannot judge them either way. They',
      'need behavioural tests.', '',
      ...of('no-hooks').map(r => `- \`${r.key}\``))
  }

  fs.writeFileSync(OUT_MD, md.join('\n'))

  console.log(`\n  dead:            ${of('dead').length}`)
  console.log(`  alive:           ${of('alive').length}`)
  console.log(`  content-absent:  ${of('content-absent').length}`)
  console.log(`  icon-value:      ${of('icon-value').length}`)
  console.log(`  no-hooks:        ${of('no-hooks').length}`)
  console.log(`\n  ${path.relative(ROOT, OUT_MD)}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
