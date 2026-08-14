/**
 * Proves the audit approach end to end on a live, logged-in X page:
 * establishes a noise floor, then measures a handful of settings against it.
 *
 * Run: node scripts/audit/spike.js
 */
const fs = require('fs')
const path = require('path')

const {ROOT, readDefaultConfig} = require('./lib/default-config')
const {launch, openX, waitForTimeline} = require('./lib/browser')
const {installHelpers, setConfig, measureChange, impactScore} = require('./lib/measure')

const OUT_DIR = path.join(ROOT, 'audit-results')

// A deliberate mix: pure-CSS hides, CSS+behaviour settings, and one that adds
// elements rather than removing them.
const PROBES = [
  {key: 'hideSidebarContent', from: false, to: true},
  {key: 'hideMetrics', from: false, to: true},
  {key: 'hideViews', from: false, to: true},
  {key: 'hideWhoToFollowEtc', from: false, to: true},
  {key: 'hideTimelineTweetBox', from: false, to: true},
  {key: 'replaceLogo', from: false, to: true},
]

async function run() {
  fs.mkdirSync(OUT_DIR, {recursive: true})

  let defaults = readDefaultConfig()
  // configChanged() short-circuits on `enabled`, so a reset payload containing
  // it would skip every other change in the same write.
  delete defaults.enabled

  let {context, guard} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()

  try {
    console.log('  Loading home timeline...')
    await openX(page)
    await waitForTimeline(page)
    // Let the timeline stop settling before we start measuring
    await page.waitForTimeout(3000)

    await installHelpers(page)

    let results = []

    // Noise floor: rewrite the identical config and measure. Anything this probe
    // reports is X re-rendering underneath us, not the extension.
    console.log('  Measuring noise floor (null probe)...')
    let baseConfig = {...defaults}
    let noise = await measureChange(page, baseConfig, {hideViews: defaults.hideViews}, {guard})
    results.push({key: '(null probe)', ...noise})

    for (let {key, from, to} of PROBES) {
      console.log(`  Probing ${key}...`)
      let result = await measureChange(page, {...defaults, [key]: from}, {[key]: to}, {guard})
      results.push({key, ...result})
    }

    // Screenshot pair for one setting, to confirm the artifact path works
    await setConfig(page, {...defaults, hideSidebarContent: false})
    await page.screenshot({path: path.join(OUT_DIR, 'hideSidebarContent.off.png')})
    await setConfig(page, {hideSidebarContent: true})
    await page.screenshot({path: path.join(OUT_DIR, 'hideSidebarContent.on.png')})

    report(results, impactScore(noise))
    fs.writeFileSync(path.join(OUT_DIR, 'spike.json'), JSON.stringify(results, null, 2))
    console.log(`\n  Artifacts written to ${path.relative(ROOT, OUT_DIR)}/`)
    if (guard.blocked.length) {
      console.log(`  Guard blocked ${guard.blocked.length} write request(s):`)
      for (let r of guard.blocked.slice(0, 5)) console.log(`    ${r}`)
    }
  } finally {
    await context.close()
  }
}

function report(results, noiseFloor) {
  console.log('\n  setting                  impact  hidden  shown  removed  added  cssRules')
  console.log('  ' + '-'.repeat(76))
  for (let r of results) {
    let impact = impactScore(r)
    let css = r.cssAdded.length + r.cssRemoved.length
    let verdict = r.key == '(null probe)' ? ''
                : impact > noiseFloor * 2 ? '  OK'
                : css > 0 ? '  CSS ONLY - nothing on this page matched'
                : '  NO EFFECT'
    console.log(
      '  ' + r.key.padEnd(24) +
      String(impact).padStart(6) +
      String(r.hidden).padStart(8) +
      String(r.shown).padStart(7) +
      String(r.removed).padStart(9) +
      String(r.added).padStart(7) +
      String(css).padStart(10) +
      verdict
    )
  }
  console.log(`\n  Noise floor: ${noiseFloor} elements`)

  for (let r of results) {
    let samples = [...r.samples.hidden, ...r.samples.removed]
    if (!samples.length || r.key == '(null probe)') continue
    console.log(`\n  ${r.key} hid:`)
    for (let s of samples.slice(0, 5)) console.log(`    ${s}`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
