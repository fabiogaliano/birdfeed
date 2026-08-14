/**
 * Probes each setting on the surface + UI state its selectors actually target,
 * recording what changed and a cropped before/after pair for anything that acted.
 *
 * Routing comes from the code (lib/routing.js), never from previous results -
 * a polluted or under-covered run only ever produces false negatives, so its
 * zeros can't be used to prune.
 *
 * Run: node scripts/audit/record.js [--only a,b] [--skip-confirmed] [--all-surfaces]
 */
const fs = require('fs')
const path = require('path')

const {ROOT} = require('./lib/default-config')
const {launch, openX} = require('./lib/browser')
const {
  installHelpers, measureChange, measureApply, impactScore, freezeMotion,
  capturePair, warmUp,
} = require('./lib/measure')
const {ready, resolveContext, buildSurfaces} = require('./lib/surfaces')
const {buildProbes, inertBaseline} = require('./lib/probes')
const {deriveTargets, routeFor} = require('./lib/routing')
const {STATES, closeOverlays, setTheme, readTheme} = require('./lib/states')
const {mergeRoute} = require('./lib/merge')
const {anonymize} = require('./lib/anonymize')

const OUT_DIR = path.join(ROOT, 'audit-results')
const SHOT_DIR = path.join(OUT_DIR, 'shots')
const REPORT_JSON = path.join(OUT_DIR, 'report.json')
const HISTORY_DIR = path.join(OUT_DIR, 'history')

const MIN_IMPACT = 3

function parseArgs() {
  let args = process.argv.slice(2)
  let get = (f) => { let i = args.indexOf(f); return i == -1 ? null : args[i + 1] }
  return {
    only: get('--only')?.split(',').map(s => s.trim()).filter(Boolean) || null,
    skipConfirmed: args.includes('--skip-confirmed'),
  }
}

function loadReport() {
  if (!fs.existsSync(REPORT_JSON)) return {routes: {}}
  try {
    let old = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'))
    return {...old, routes: old.routes || old.surfaces || {}}
  } catch (e) {
    return {routes: {}}
  }
}

// Results accumulate across runs rather than replacing each other. A run that
// covers one route used to blow away every other route's findings - that is how
// the first census was lost.
function saveReport(report) {
  fs.mkdirSync(HISTORY_DIR, {recursive: true})
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2))
}

function archive(report) {
  let stamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.writeFileSync(path.join(HISTORY_DIR, `report-${stamp}.json`),
                   JSON.stringify(report, null, 2))
}

// Settings already proven to act. Worth skipping on a re-run: pollution and
// missing UI states cause false negatives, never false positives, so a past
// positive stays valid.
function confirmedIn(report) {
  let keys = new Set()
  for (let group of Object.values(report.routes || {})) {
    for (let r of group.results || []) if (r.acted) keys.add(r.key)
  }
  return keys
}

// Merged per setting rather than per route: a `--only` run touches whole routes
// while probing a handful of settings, and replacing the route would drop every
// other setting recorded on it.
function recordRoute(report, routeKey, data) {
  report.routes[routeKey] = mergeRoute(report.routes[routeKey], data)
}

function groupByRoute(probes, targets) {
  let groups = new Map()
  for (let probe of probes) {
    for (let route of routeFor(probe.key, targets)) {
      let key = `${route.surface}/${route.state}/${route.theme}`
      if (!groups.has(key)) groups.set(key, {route, probes: []})
      groups.get(key).probes.push(probe)
    }
  }
  // Group by surface+theme so navigation and reloads are shared
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

async function run() {
  let {only, skipConfirmed} = parseArgs()
  fs.mkdirSync(SHOT_DIR, {recursive: true})

  let previous = loadReport()
  let confirmed = skipConfirmed ? confirmedIn(previous) : new Set()
  let probes = buildProbes()
    .filter(p => !only || only.includes(p.key))
    .filter(p => !confirmed.has(p.key))

  let targets = deriveTargets()
  let groups = groupByRoute(probes, targets)
  let baseline = inertBaseline()

  let {context, guard} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()
  let report = {
    ...previous,
    startedAt: new Date().toISOString(),
    skipped: [...confirmed],
    routes: {...previous.routes},
  }

  try {
    await openX(page)
    let ctx = await resolveContext(page)
    let surfaces = new Map(buildSurfaces(ctx).map(s => [s.name, s]))
    console.log(`  account: @${ctx.username || '?'}   tweet: ${ctx.tweetPath || 'none'}`)
    if (confirmed.size) console.log(`  skipping ${confirmed.size} already-confirmed settings`)
    let total = groups.reduce((n, [, g]) => n + g.probes.length, 0)
    console.log(`  ${total} probes across ${groups.length} routes\n`)

    let currentTheme = null

    for (let [routeKey, {route, probes: routeProbes}] of groups) {
      let surface = surfaces.get(route.surface)
      console.log(`\n=== ${routeKey}  (${routeProbes.length}) ===`)

      if (!surface) {
        console.log(`  skipped: no such surface`)
        recordRoute(report, routeKey, {error: 'surface unavailable', results: []})
        continue
      }

      let results = []
      try {
        // Retried: a surface that fails to render once costs every probe on the
        // route, and those losses read as "the setting does nothing".
        for (let attempt = 0; ; attempt++) {
          try {
            await page.goto(surface.url, {waitUntil: 'domcontentloaded'})
            await ready(page)
            break
          } catch (e) {
            if (attempt >= 1) throw e
            console.log(`  ${surface.name} did not render, retrying`)
          }
        }

        if (route.theme != currentTheme) {
          await setTheme(context, page, route.theme == 'light' ? 'light' : 'lightsOut')
          await ready(page)
          currentTheme = route.theme
        }

        await freezeMotion(page)
        await installHelpers(page)
      } catch (e) {
        console.log(`  skipped: ${e.message.split('\n')[0]}`)
        recordRoute(report, routeKey, {error: e.message.split('\n')[0], results: []})
        continue
      }

      let theme = await readTheme(page)
      let opened = await STATES[route.state].open(page)
      if (route.state != 'none' && !opened) {
        // Every probe here would measure a closed menu and read as dead. Those
        // are known-false zeros, so record nothing rather than poison the map.
        console.log(`  skipped: could not open ${route.state}`)
        recordRoute(report, routeKey, {error: `could not open ${route.state}`, results: []})
        continue
      }

      // Reopening the UI state after every probe is what makes these routes
      // measurable at all; the reset tears the menu down with everything else.
      let prepare = async () => {
        if (route.state == 'none') return true
        return await STATES[route.state].open(page)
      }

      await prepare()
      await warmUp(page, baseline, {guard, prepare})

      let noise = {hidden: 0, shown: 0, removed: 0, added: 0, restyled: 0}
      for (let i = 0; i < 2; i++) {
        await prepare()
        let sample = await measureChange(page, baseline, {hideViews: baseline.hideViews}, {guard, prepare})
        for (let k of Object.keys(noise)) noise[k] = Math.max(noise[k], sample[k])
      }

      let removeFloor = Math.max(MIN_IMPACT, (noise.hidden + noise.removed) * 2)
      let addFloor = Math.max(MIN_IMPACT, (noise.added + noise.shown) * 2)
      let styleFloor = Math.max(MIN_IMPACT, noise.restyled * 2)
      console.log(`  theme=${theme} state=${route.state}${opened ? '' : '(FAILED)'}  ` +
                  `noise h=${noise.hidden} rm=${noise.removed} add=${noise.added} sh=${noise.shown} st=${noise.restyled}`)

      let shotDir = path.join(SHOT_DIR, routeKey.replace(/\//g, '_'))
      fs.mkdirSync(shotDir, {recursive: true})

      for (let probe of routeProbes) {
        let from = {...baseline, ...(probe.requires || {}), [probe.key]: probe.from}
        let to = {[probe.key]: probe.to}

        let result
        try {
          result = await measureChange(page, from, to, {guard, prepare})
        } catch (e) {
          results.push({key: probe.key, error: e.message.split('\n')[0]})
          console.log(`  ${probe.key.padEnd(38)} ERROR`)
          continue
        }

        let scores = (r) => (r.hidden + r.removed) >= removeFloor ||
                            (r.added + r.shown) >= addFloor ||
                            r.restyled >= styleFloor

        let acted = scores(result)
        let direction = 'forward'

        // A setting that reveals something lands on the `shown` axis, whose floor
        // is ~200 on a lazy-loading timeline - so it reads as dead however well it
        // works. Measured backwards the same effect is a removal, which is quiet.
        // The page is already at `to`, so this needs no reset.
        if (!acted) {
          let reverse = await measureApply(page, from, {guard}).catch(() => null)
          if (reverse && scores(reverse)) {
            result = reverse
            acted = true
            direction = 'reverse'
          }
        }

        let shots = null
        if (acted) {
          // capturePair resets to `from` itself, so it does not matter which
          // direction the measurement left the page in.
          shots = await capturePair(page, {
            from, to, clip: result.clip, dir: shotDir, name: probe.key,
            prepare, anonymise: anonymize,
          }).catch(() => null)
        }

        results.push({
          key: probe.key, route: routeKey, from: probe.from, to: probe.to,
          acted, direction, impact: impactScore(result),
          hidden: result.hidden, shown: result.shown, removed: result.removed,
          added: result.added, restyled: result.restyled,
          cssAdded: result.cssAdded.length, cssRemoved: result.cssRemoved.length,
          samples: result.samples, shots,
        })

        console.log(`  ${probe.key.padEnd(38)}${String(impactScore(result)).padStart(5)}` +
                    `${acted ? `  acted${direction == 'reverse' ? ' (reverse)' : ''}` : '  -'}` +
                    `${result.restyled ? `  (${result.restyled} restyled)` : ''}`)

        if (!page.url().startsWith(surface.url.split('?')[0])) {
          await page.goto(surface.url, {waitUntil: 'domcontentloaded'}).catch(() => {})
          await ready(page).catch(() => {})
          await freezeMotion(page).catch(() => {})
          await installHelpers(page).catch(() => {})
        }
      }

      await closeOverlays(page)
      recordRoute(report, routeKey, {
        url: surface.url, theme, state: route.state, stateOpened: opened,
        noise, thresholds: {remove: removeFloor, add: addFloor, style: styleFloor},
        results,
      })
      saveReport(report)
    }

    report.finishedAt = new Date().toISOString()
    report.guardBlocked = guard.blocked
    saveReport(report)
    archive(report)
    summarise(report, confirmed)
  } finally {
    await context.close()
  }
}

function summarise(report, confirmed) {
  let acted = new Map()
  let seen = new Set()

  for (let [routeKey, group] of Object.entries(report.routes)) {
    for (let r of group.results || []) {
      seen.add(r.key)
      if (r.acted) {
        if (!acted.has(r.key)) acted.set(r.key, [])
        acted.get(r.key).push(`${routeKey}(${r.impact})`)
      }
    }
  }

  // report.routes is cumulative, so these are totals across every run, not just
  // this one - which is the number that actually matters.
  let dead = [...seen].filter(k => !acted.has(k)).sort()
  console.log(`\n\n=== summary (all runs) ===`)
  console.log(`  confirmed: ${acted.size} of ${seen.size} probed`)
  if (confirmed.size) console.log(`  of which skipped this run: ${confirmed.size}`)
  console.log(`\n  still no measurable effect (${dead.length}):`)
  for (let k of dead) console.log(`    ${k}`)
  console.log(`\n  Report: ${path.relative(ROOT, REPORT_JSON)}`)
  for (let [key, where] of [...acted].sort()) {
    if (!confirmed.has(key)) console.log(`  + ${key.padEnd(38)} ${where.join(' ')}`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
