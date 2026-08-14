/**
 * Drift detection: re-probes only the settings already proven to work, on the
 * one route each is known to work on, and reports any that stopped.
 *
 * This is the cheap recurring check. The expensive part - finding out where a
 * setting acts - is already done and recorded in settings-map.json, so this only
 * has to answer "does it still act there".
 *
 * The comparison is deliberately binary rather than an impact delta: impact
 * scales with how many tweets happen to be on screen, so an exact count would
 * cry wolf constantly. A setting going to zero is the signal that X changed
 * something under us.
 *
 * Run: node scripts/audit/watch.js
 * Exits non-zero if anything regressed, so it can drive a cron or CI job.
 */
const fs = require('fs')
const path = require('path')

const {ROOT} = require('./lib/default-config')
const {launch, openX} = require('./lib/browser')
const {installHelpers, measureChange, impactScore, freezeMotion} = require('./lib/measure')
const {ready, resolveContext, buildSurfaces} = require('./lib/surfaces')
const {buildProbes, inertBaseline} = require('./lib/probes')
const {STATES, closeOverlays, setTheme} = require('./lib/states')

const OUT_DIR = path.join(ROOT, 'audit-results')
const MAP_JSON = path.join(OUT_DIR, 'settings-map.json')
const DRIFT_JSON = path.join(OUT_DIR, 'drift.json')

const MIN_IMPACT = 3

function plan() {
  if (!fs.existsSync(MAP_JSON)) {
    throw new Error('settings-map.json missing - run record.js then report.js first')
  }
  let {confirmed} = JSON.parse(fs.readFileSync(MAP_JSON, 'utf8'))
  let probes = new Map(buildProbes().map(p => [p.key, p]))

  let groups = new Map()
  for (let entry of confirmed) {
    let probe = probes.get(entry.key)
    if (!probe) continue
    let routeKey = entry.where[0]
    if (!groups.has(routeKey)) groups.set(routeKey, [])
    groups.get(routeKey).push({probe, baseline: entry.impact})
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

async function run() {
  let groups = plan()
  let baseline = inertBaseline()
  let {context, guard} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()

  let checked = [], regressed = []

  try {
    await openX(page)
    let ctx = await resolveContext(page)
    let surfaces = new Map(buildSurfaces(ctx).map(s => [s.name, s]))
    let total = groups.reduce((n, [, g]) => n + g.length, 0)
    console.log(`  checking ${total} confirmed settings across ${groups.length} routes\n`)

    let currentTheme = null

    for (let [routeKey, entries] of groups) {
      let [surfaceName, stateName, themeName] = routeKey.split('/')
      let surface = surfaces.get(surfaceName)
      console.log(`\n=== ${routeKey}  (${entries.length}) ===`)

      if (!surface) {
        console.log('  skipped: surface unavailable')
        continue
      }

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
      let opened = await prepare()
      if (stateName != 'none' && !opened) {
        // A menu that won't open makes every setting here look broken, which is
        // exactly the false alarm this check exists to avoid.
        console.log(`  skipped: could not open ${stateName}`)
        continue
      }

      let noise = {hidden: 0, shown: 0, removed: 0, added: 0, restyled: 0}
      for (let i = 0; i < 2; i++) {
        await prepare()
        let sample = await measureChange(page, baseline, {hideViews: baseline.hideViews}, {guard, prepare})
        for (let k of Object.keys(noise)) noise[k] = Math.max(noise[k], sample[k])
      }
      let removeFloor = Math.max(MIN_IMPACT, (noise.hidden + noise.removed) * 2)
      let addFloor = Math.max(MIN_IMPACT, (noise.added + noise.shown) * 2)
      let styleFloor = Math.max(MIN_IMPACT, noise.restyled * 2)

      for (let {probe, baseline: was} of entries) {
        let from = {...baseline, ...(probe.requires || {}), [probe.key]: probe.from}
        let result
        try {
          result = await measureChange(page, from, {[probe.key]: probe.to}, {guard, prepare})
        } catch (e) {
          console.log(`  ${probe.key.padEnd(38)} ERROR`)
          continue
        }

        let acts = (result.hidden + result.removed) >= removeFloor ||
                   (result.added + result.shown) >= addFloor ||
                   result.restyled >= styleFloor
        let now = impactScore(result)
        let entry = {key: probe.key, route: routeKey, was, now, acts}
        checked.push(entry)
        if (!acts) regressed.push(entry)

        console.log(`  ${probe.key.padEnd(38)}${String(now).padStart(5)}` +
                    `  ${acts ? 'ok' : `REGRESSED (was ${was})`}`)
      }

      await closeOverlays(page)
    }
  } finally {
    await context.close()
  }

  fs.writeFileSync(DRIFT_JSON, JSON.stringify({
    ranAt: new Date().toISOString(), checked, regressed,
  }, null, 2))

  console.log(`\n\n=== drift ===`)
  console.log(`  checked:   ${checked.length}`)
  console.log(`  regressed: ${regressed.length}`)
  for (let r of regressed) console.log(`    ${r.key}  (${r.route}, was ${r.was})`)
  console.log(`\n  ${path.relative(ROOT, DRIFT_JSON)}`)

  if (regressed.length) process.exit(1)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
