/**
 * Splits the map's "probed, moved nothing" settings into broken vs blocked.
 *
 * The probe run can only say a setting changed nothing. It cannot say why, so
 * `hideJobsNav` (this account has no Jobs nav) and a setting X genuinely broke
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

const {ROOT} = require('./lib/default-config')
const {launch, openX} = require('./lib/browser')
const {ready, resolveContext, buildSurfaces} = require('./lib/surfaces')
const {STATES, closeOverlays} = require('./lib/states')
const {readFunctions, blocksFor, deriveTargets, routeFor} = require('./lib/routing')

const MAP_JSON = path.join(ROOT, 'audit-results', 'settings-map.json')
const OUT_JSON = path.join(ROOT, 'audit-results', 'hooks.json')
const OUT_MD = path.join(ROOT, 'audit-results', 'hooks.md')

// Paths the extension *writes*, not ones it looks for. They correctly match
// nothing on live X until the setting that injects them is on, so counting them
// as breakage is how the messages icon got misfiled as broken once already.
const INJECTED = /^(TWITTER_|BLUE_LOGO|MESSAGES_(ACTIVE|INACTIVE))/

// Tighter than routing's 800: a selector dragged in from the next function makes
// a dead setting look alive, which is the one verdict this must not get wrong.
const HOOK_BLOCK = 240

function readSource() {
  return fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8')
}

// The Selectors and Svgs tables, so a `Selectors.FOO` reference inside a block
// can be resolved to the string it actually stands for.
function readTables() {
  let source = readSource()
  let table = (start, pattern) => {
    let body = source.slice(source.indexOf(start))
    body = body.slice(0, body.indexOf('\n}'))
    return new Map([...body.matchAll(pattern)].map(m => [m[1], m[2]]))
  }
  return {
    selectors: table('const Selectors = {', /^\s*([A-Z_0-9]+):\s*'([^']+)'/gm),
    svgs: table('const Svgs = {', /^\s*([A-Z_0-9]+):\s*'(M[^']+)'/gm),
  }
}

// Everything in a block that could be a hook into X's DOM.
function hooksIn(block, tables) {
  let found = new Map()
  let add = (name, selector, kind) => {
    // `${` means a template literal was frozen mid-interpolation - that string
    // is not a selector and would match zero forever, reading as false breakage.
    if (!selector || selector.includes('${') || found.has(name)) return
    found.set(name, {name, selector, kind})
  }

  for (let m of block.matchAll(/Selectors\.([A-Z_0-9]+)/g)) {
    add(m[1], tables.selectors.get(m[1]), 'named')
  }
  for (let m of block.matchAll(/Svgs\.([A-Z_0-9]+)/g)) {
    if (INJECTED.test(m[1])) continue
    let d = tables.svgs.get(m[1])
    add(m[1], d && `svg path[d="${d}"]`, 'svgPath')
  }
  // Inline testids, including the ones written straight into CSS strings.
  for (let m of block.matchAll(/data-testid\^?\$?=\\?["']([^"'\\]+)\\?["']/g)) {
    add(`testid:${m[1]}`, `[data-testid="${m[1]}"]`, 'testid')
  }
  // href hooks - how several settings identify their subject. Suffix and
  // substring forms matter as much as prefix: hideChatNav's only real hook is
  // a[href$="/i/chat"], and reading just `^=` missed it entirely.
  for (let m of block.matchAll(/href([\^$*]?)=\\?["']([^"'\\]+)\\?["']/g)) {
    if (m[2].includes('${')) continue
    add(`href${m[1]}:${m[2]}`, `a[href${m[1]}="${m[2]}"]`, 'href')
  }
  // Bare aria/role hooks the extension leans on for menus.
  for (let m of block.matchAll(/\[(?:role|aria-label)=\\?["']([^"'\\]+)\\?["']\]/g)) {
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
  // to have resolved it.
  let inNav = /menuRole|PRIMARY_NAV|MORE_DIALOG|header nav|\[role="menu"\]|SIDEBAR/.test(block)
  for (let h of hooks) {
    h.family = h.kind == 'href' || h.kind == 'svgPath'
      ? (inNav ? 'chrome' : 'content')
      : 'chrome'
  }
  return hooks
}

// Six settings classify an item by comparing an SVG path *prefix* in JS rather
// than querying the DOM. No selector exists to count, so this method is blind
// to them by construction - icon-paths.js is the tool that covers these.
//
// Scanned around the reference rather than in the forward block: these read
// `if ($iconPath.startsWith(...)) { hideItem = config.x }`, so the tell sits on
// the line *before* the config mention and a forward-only window misses it.
function usesIconPath(source, key) {
  let pattern = new RegExp(`config\\.${key}\\b`, 'g')
  for (let m of source.matchAll(pattern)) {
    let around = source.slice(Math.max(0, m.index - 400), m.index + 200)
    if (/\$iconPath\.startsWith|iconPath\s*==/.test(around)) return true
  }
  return false
}

// A hook shared by many of the unresolved settings is structural, not
// diagnostic: [data-testid="tweet"] and [role="group"] are on every page, so
// letting them count would mark every setting alive regardless of breakage.
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
  let unresolved = map.unconfirmed
    .filter(u => u.hasRoutingEvidence && !u.subThreshold)
    .map(u => u.key)

  let tables = readTables()
  let source = readSource()
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
      hooks: hooksIn(block, tables),
      iconPath: usesIconPath(source, key),
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
    // hook is [data-testid="tweet"] has told us nothing about itself.
    let telling = hooks.filter(h => !h.generic)
    let live = telling.filter(h => h.count > 0)

    // "Broken" is the one verdict that must not be wrong, so it needs a chrome
    // hook that matched nothing. All-content zeros stay unresolved rather than
    // being upgraded into a breakage claim the evidence doesn't support.
    let verdict =
      s.iconPath ? 'icon-path' :
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
    `| Icon-path match — see icon-paths.js | ${of('icon-path').length} |`,
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

  if (of('icon-path').length) {
    md.push('', '## Matched by icon geometry — not visible to this method', '',
      'These classify an item by comparing an SVG path prefix in JavaScript, so',
      'there is no selector to count. `scripts/audit/icon-paths.js` covers them.', '',
      ...of('icon-path').map(r => `- \`${r.key}\``))
  }

  if (of('no-hooks').length) {
    md.push('', '## No DOM hook to check', '',
      'Nothing in these blocks queries the page, so this method cannot judge',
      'them either way - they need behavioural tests.', '',
      ...of('no-hooks').map(r => `- \`${r.key}\``))
  }

  fs.writeFileSync(OUT_MD, md.join('\n'))

  console.log(`\n  dead:            ${of('dead').length}`)
  console.log(`  alive:           ${of('alive').length}`)
  console.log(`  content-absent:  ${of('content-absent').length}`)
  console.log(`  icon-path:       ${of('icon-path').length}`)
  console.log(`  no-hooks:        ${of('no-hooks').length}`)
  console.log(`\n  ${path.relative(ROOT, OUT_MD)}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
