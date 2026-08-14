/**
 * Turns audit screenshot pairs into the before/after examples shown in the
 * options page.
 *
 * The audit writes full-resolution crops into `audit-results/`, which is
 * gitignored and ~12MB - far too much to ship. This picks the single best pair
 * per setting, downscales it, and copies it into `examples/`, which *is* part
 * of the extension.
 *
 * Downscaling uses `sips`, which ships with macOS, rather than adding an image
 * dependency for a script that runs occasionally on one machine.
 *
 * Run: node scripts/build-examples.js
 */
const fs = require('fs')
const path = require('path')
const {execFileSync} = require('child_process')

const {ROOT} = require('./audit/lib/default-config')
const REPORT = path.join(ROOT, 'audit-results', 'report.json')
const SHOTS = path.join(ROOT, 'audit-results', 'shots')
const OUT = path.join(ROOT, 'examples')

// Bounds the *larger* dimension, not the width. Several crops are tall narrow
// strips of the sidebar, which stay heavy when only the width is capped.
const MAX_EDGE = 480

// JPEG rather than PNG: these are screenshots of a photographic UI, and at 480px
// wide in a popover the artefacts are invisible while the pairs go from ~4.9MB
// to well under half that. Size matters here because every byte ships in the
// extension. sips has no WebP encoder, which would otherwise be the better
// choice.
const QUALITY = 80

function bestPairs(report) {
  let best = new Map()

  for (let [routeKey, route] of Object.entries(report.routes || {})) {
    for (let result of route.results || []) {
      if (!result.acted || !result.shots) continue
      let current = best.get(result.key)
      // Highest impact wins: the same setting is probed on several routes and
      // the strongest one is the clearest illustration of what it does.
      if (!current || result.impact > current.impact) {
        best.set(result.key, {...result, routeKey})
      }
    }
  }

  return best
}

function convert(from, to) {
  execFileSync('sips', [
    from,
    '--resampleHeightWidthMax', String(MAX_EDGE),
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', String(QUALITY),
    '--out', to,
  ], {stdio: 'ignore'})
}

function run() {
  if (!fs.existsSync(REPORT)) {
    console.error(`  no report at ${path.relative(ROOT, REPORT)} - run the audit first`)
    process.exit(1)
  }

  let report = JSON.parse(fs.readFileSync(REPORT, 'utf8'))
  let pairs = bestPairs(report)

  fs.rmSync(OUT, {recursive: true, force: true})
  fs.mkdirSync(OUT, {recursive: true})

  let index = {}
  let missing = []

  for (let [key, result] of pairs) {
    let dir = path.join(SHOTS, result.routeKey.replace(/\//g, '_'))
    let before = path.join(dir, result.shots.before)
    let after = path.join(dir, result.shots.after)
    if (!fs.existsSync(before) || !fs.existsSync(after)) { missing.push(key); continue }

    convert(before, path.join(OUT, `${key}.before.jpg`))
    convert(after, path.join(OUT, `${key}.after.jpg`))
    index[key] = {route: result.routeKey, impact: result.impact}
  }

  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n')

  let bytes = fs.readdirSync(OUT)
    .reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0)

  console.log(`  ${Object.keys(index).length} examples, ${(bytes / 1024 / 1024).toFixed(2)}MB`)
  if (missing.length) console.log(`  pair files missing for: ${missing.join(', ')}`)
}

run()
