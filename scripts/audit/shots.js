/**
 * Rebuilds the before/after pair for every confirmed setting, anonymised.
 *
 * Separate from record.js because the measurements are already done and are not
 * what was wrong - only the screenshots were. This re-shoots them without
 * re-probing, reusing each setting's recorded route and crop.
 *
 * Run: node scripts/audit/shots.js [--only a,b]
 */
const fs = require('fs')
const path = require('path')

const {ROOT} = require('./lib/default-config')
const {launch, openX} = require('./lib/browser')
const {installHelpers, capturePair, freezeMotion, setConfig} = require('./lib/measure')
const {ready, resolveContext, buildSurfaces} = require('./lib/surfaces')
const {buildProbes} = require('./lib/probes')
const {STATES, closeOverlays, setTheme} = require('./lib/states')
const {anonymize} = require('./lib/anonymize')

const OUT_DIR = path.join(ROOT, 'audit-results')
const SHOT_DIR = path.join(OUT_DIR, 'shots')
const REPORT_JSON = path.join(OUT_DIR, 'report.json')

function plan(only) {
  let report = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'))
  let probes = new Map(buildProbes().map(p => [p.key, p]))
  let best = new Map()

  for (let [routeKey, group] of Object.entries(report.routes || {})) {
    for (let r of group.results || []) {
      if (!r.acted || (only && !only.includes(r.key))) continue
      // Highest impact wins: that is the route where the change is most visible.
      if (!best.has(r.key) || r.impact > best.get(r.key).impact) {
        best.set(r.key, {...r, routeKey})
      }
    }
  }

  let groups = new Map()
  for (let [key, r] of best) {
    let probe = probes.get(key)
    if (!probe) continue
    if (!groups.has(r.routeKey)) groups.set(r.routeKey, [])
    groups.get(r.routeKey).push({probe, clip: r.clip})
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

async function run() {
  let args = process.argv.slice(2)
  let i = args.indexOf('--only')
  let only = i == -1 ? null : args[i + 1].split(',').map(s => s.trim())

  let groups = plan(only)
  let total = groups.reduce((n, [, g]) => n + g.length, 0)
  console.log(`  ${total} settings across ${groups.length} routes`)

  let {context, guard} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()
  let done = {}

  try {
    await openX(page)
    await setConfig(page, {enabled: true})
    let ctx = await resolveContext(page)
    let surfaces = new Map(buildSurfaces(ctx).map(s => [s.name, s]))
    let currentTheme = null

    for (let [routeKey, entries] of groups) {
      let [surfaceName, stateName, themeName] = routeKey.split('/')
      let surface = surfaces.get(surfaceName)
      console.log(`\n=== ${routeKey} (${entries.length}) ===`)
      if (!surface) { console.log('  skipped: surface unavailable'); continue }

      try {
        await page.goto(surface.url, {waitUntil: 'domcontentloaded'})
        await ready(page)
        if (themeName != currentTheme) {
          await setTheme(context, page, themeName == 'light' ? 'light' : 'lightsOut')
          await ready(page)
          currentTheme = themeName
        }
        await freezeMotion(page)
        await installHelpers(page)
      } catch (e) {
        console.log(`  skipped: ${e.message.split('\n')[0]}`)
        continue
      }

      let prepare = async () => stateName == 'none' ? true : await STATES[stateName].open(page)
      if (!await prepare()) { console.log(`  skipped: could not open ${stateName}`); continue }

      let shotDir = path.join(SHOT_DIR, routeKey.replace(/\//g, '_'))
      fs.mkdirSync(shotDir, {recursive: true})

      for (let {probe} of entries) {
        // Only the setting under test, applied over the live config - see the
        // note in capturePair on why the inert baseline is not used here.
        let from = {...(probe.requires || {}), [probe.key]: probe.from}
        let to = {[probe.key]: probe.to}
        let shots = await capturePair(page, {
          from, to, dir: shotDir, name: probe.key,
          prepare, anonymise: anonymize,
        }).catch((e) => { console.log(`  ${probe.key} FAILED: ${e.message.split('\n')[0]}`); return null })

        if (shots) {
          done[probe.key] = {route: routeKey, dir: path.relative(OUT_DIR, shotDir), ...shots}
          console.log(`  ${probe.key}`)
        }

        // Undo it before the next one. These writes stack on the live config, so
        // without this each capture inherits every previous setting on the route
        // - which is how a shot ends up missing nav items it never touched.
        await setConfig(page, {[probe.key]: probe.from})

        // Some settings navigate (disableHomeTimeline redirects off Home), and
        // the rest of the route would then be shot on the wrong page.
        if (!page.url().startsWith(surface.url.split('?')[0])) {
          await page.goto(surface.url, {waitUntil: 'domcontentloaded'}).catch(() => {})
          await ready(page).catch(() => {})
          await freezeMotion(page).catch(() => {})
          await installHelpers(page).catch(() => {})
          await prepare()
        }
      }
      await closeOverlays(page)
    }
  } finally {
    await context.close()
  }

  fs.writeFileSync(path.join(OUT_DIR, 'shots.json'), JSON.stringify(done, null, 2))
  console.log(`\n  ${Object.keys(done).length} pairs rebuilt -> audit-results/shots.json`)
}

run().catch((e) => { console.error(e); process.exit(1) })
