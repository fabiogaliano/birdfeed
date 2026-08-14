/**
 * Per-setting hook verification against live x.com.
 *
 * The probe run can only tell you a setting did nothing; it cannot tell you why.
 * This closes that gap by pulling the concrete selectors out of each setting's
 * own code and counting them against the live DOM, so a dead setting separates
 * into "its hooks no longer match anything" (X broke it - go fix the selector)
 * and "its hooks match fine, the content just wasn't there" (not broken).
 *
 * Cheap: no config toggling, no resets, one pass per surface.
 *
 * Run: node scripts/audit/verify.js
 */
const fs = require('fs')
const path = require('path')

const {ROOT} = require('./lib/default-config')
const {launch, openX} = require('./lib/browser')
const {ready, resolveContext, buildSurfaces} = require('./lib/surfaces')
const {STATES, closeOverlays} = require('./lib/states')
const {buildProbes} = require('./lib/probes')

const OUT_JSON = path.join(ROOT, 'audit-results', 'verify.json')

// Selector shapes worth testing. Anything else in these blocks is layout glue
// that cannot be counted meaningfully on its own.
const PATTERNS = [
  /\[data-testid[\^$*]?="([^"]+)"\]/g,
  /\[aria-label="([^"]+)"\]/g,
  /\[href[\^$*]?="([^"]+)"\]/g,
]

function readSource() {
  return fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8')
}

// Every top-level declaration, so a setting referenced anywhere is found.
function blocksByKey() {
  let lines = readSource().split('\n')
  let decl = /^(?:async )?function ([A-Za-z_$][\w$]*)|^const ([A-Za-z_$][\w$]*) = /
  let starts = []
  lines.forEach((l, i) => { if (decl.test(l)) starts.push(i) })

  let blocks = new Map()
  for (let i = 0; i < starts.length; i++) {
    let body = lines.slice(starts[i], starts[i + 1] ?? lines.length).join('\n')
    let refs = [...body.matchAll(/config\.([A-Za-z_$][\w$]*)/g)]
    refs.forEach((m, j) => {
      let key = m[1]
      let next = refs.slice(j + 1).find(r => r[1] != key)
      let end = Math.max(next ? next.index : body.length, m.index + 900)
      blocks.set(key, (blocks.get(key) || '') + '\n' + body.slice(m.index, end))
    })
  }
  return blocks
}

function selectorsFor(block) {
  let found = new Map()
  for (let re of PATTERNS) {
    for (let m of block.matchAll(re)) {
      let whole = m[0]
      // Attribute-prefix/suffix forms need to stay as written to match correctly
      if (!found.has(whole)) found.set(whole, whole)
    }
  }
  // The extension's own injected nodes: if these are missing, its DOM additions
  // are not landing, which is a different failure from X changing its markup.
  for (let m of block.matchAll(/#(cpft[A-Za-z]+)/g)) found.set('#' + m[1], '#' + m[1])
  return [...found.values()].slice(0, 12)
}

async function countOn(page, selectors) {
  return await page.evaluate((list) => list.map(sel => {
    try { return document.querySelectorAll(sel).length } catch (e) { return -1 }
  }), selectors)
}

async function run() {
  let blocks = blocksByKey()
  let probes = buildProbes()
  let plan = probes.map(p => ({key: p.key, selectors: selectorsFor(blocks.get(p.key) || '')}))
  let all = [...new Set(plan.flatMap(p => p.selectors))]
  console.log(`  ${plan.length} settings, ${all.length} distinct selectors`)

  let counts = new Map(all.map(s => [s, {}]))
  let {context} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()

  try {
    await openX(page)
    let ctx = await resolveContext(page)

    for (let surface of buildSurfaces(ctx)) {
      try {
        await page.goto(surface.url, {waitUntil: 'domcontentloaded'})
        await ready(page)
      } catch (e) {
        console.log(`  ${surface.name}: unavailable`)
        continue
      }
      let found = await countOn(page, all)
      all.forEach((s, i) => { counts.get(s)[surface.name] = found[i] })
      console.log(`  ${surface.name.padEnd(13)} ${found.filter(n => n > 0).length}/${all.length}`)

      if (surface.name == 'home') {
        for (let state of ['moreMenu', 'caretMenu']) {
          if (!await STATES[state].open(page)) continue
          let inState = await countOn(page, all)
          all.forEach((s, i) => {
            counts.get(s)[state] = Math.max(counts.get(s)[state] || 0, inState[i])
          })
          console.log(`  ${state.padEnd(13)} ${inState.filter(n => n > 0).length}/${all.length}`)
          await closeOverlays(page)
        }
      }
    }
  } finally {
    await context.close()
  }

  let report = plan.map(({key, selectors}) => {
    let detail = selectors.map(s => ({
      selector: s,
      total: Object.values(counts.get(s) || {}).reduce((a, b) => a + Math.max(0, b), 0),
    }))
    let live = detail.filter(d => d.total > 0)
    return {
      key,
      selectors: detail,
      verdict: !detail.length ? 'no-selectors'
             : live.length == 0 ? 'all-hooks-dead'
             : live.length < detail.length ? 'some-hooks-dead'
             : 'hooks-live',
    }
  })

  fs.writeFileSync(OUT_JSON, JSON.stringify({ranAt: new Date().toISOString(), report}, null, 2))

  let by = (v) => report.filter(r => r.verdict == v)
  console.log(`\n  hooks live:      ${by('hooks-live').length}`)
  console.log(`  some hooks dead: ${by('some-hooks-dead').length}`)
  console.log(`  ALL hooks dead:  ${by('all-hooks-dead').length}`)
  console.log(`  no selectors:    ${by('no-selectors').length}`)
  console.log(`\n  ALL DEAD (X changed markup under these):`)
  for (let r of by('all-hooks-dead')) {
    console.log(`    ${r.key.padEnd(34)} ${r.selectors.map(s => s.selector).slice(0, 2).join('  ')}`)
  }
  console.log(`\n  ${path.relative(ROOT, OUT_JSON)}`)
}

run().catch((e) => { console.error(e); process.exit(1) })
