/**
 * Selector inventory: every hook the extension relies on, counted against the
 * live DOM.
 *
 * This is the cheapest and bluntest form of drift detection. A setting can look
 * fine in the probe run simply because the content it targets wasn't on screen,
 * but a selector that matches zero elements on every surface is a hook that no
 * longer bites - and the icon names break silently the moment X renames an
 * icon, with no error anywhere.
 *
 * No config is toggled and nothing is reset, so this runs in a couple of minutes.
 *
 * Run: node scripts/audit/selectors.js
 */
const fs = require('fs')
const path = require('path')

const {ROOT} = require('./lib/default-config')
const {launch, openX} = require('./lib/browser')
const {ready, resolveContext, buildSurfaces} = require('./lib/surfaces')
const {STATES, closeOverlays} = require('./lib/states')
const {readSource, readConstants, iconNames, iconSelector, attrHooks} = require('./lib/extract')

const OUT_JSON = path.join(ROOT, 'audit-results', 'selectors.json')
const OUT_MD = path.join(ROOT, 'audit-results', 'selectors.md')

// Three families, because they rot for different reasons and at different rates.
// The Svgs table is not checked: every path left in it is one the extension
// draws, not one it looks for.
function collectSelectors() {
  let source = readSource()
  let out = []

  // The shared selector constants, whole: these are the hooks many settings
  // and the row processing depend on at once.
  for (let [name, selector] of readConstants(source)) {
    out.push({name, selector, family: 'named'})
  }

  // Icon names: the first thing to break when X redraws its icon set.
  for (let icon of iconNames(source)) {
    let selector = iconSelector(icon)
    out.push({name: selector, selector, family: 'icon'})
  }

  // Every semantic attribute the extension mentions anywhere, including the
  // few data-testids the new client kept.
  for (let hook of attrHooks(source).sort((a, b) => a.name.localeCompare(b.name))) {
    out.push({name: hook.name, selector: hook.selector, family: 'attr'})
  }

  return out
}

async function countAll(page, selectors) {
  return await page.evaluate((list) => list.map(sel => {
    try {
      return document.querySelectorAll(sel).length
    } catch (e) {
      return -1
    }
  }), selectors.map(s => s.selector))
}

async function run() {
  let selectors = collectSelectors()
  console.log(`  ${selectors.length} selectors from script.js`)

  let {context} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()
  let counts = new Map(selectors.map(s => [s.name, {}]))

  try {
    await openX(page)
    let ctx = await resolveContext(page)
    let surfaces = buildSurfaces(ctx)

    for (let surface of surfaces) {
      try {
        await page.goto(surface.url, {waitUntil: 'domcontentloaded'})
        await ready(page)
      } catch (e) {
        console.log(`  ${surface.name}: unavailable`)
        continue
      }

      let found = await countAll(page, selectors)
      selectors.forEach((s, i) => { counts.get(s.name)[surface.name] = found[i] })
      console.log(`  ${surface.name.padEnd(14)} ${found.filter(n => n > 0).length} of ${selectors.length} match`)

      // Menu-only hooks match nothing until the menu exists, so they'd read as
      // rotted on every surface otherwise.
      if (surface.name == 'home') {
        for (let state of ['moreMenu', 'caretMenu']) {
          if (!await STATES[state].open(page)) {
            console.log(`  ${state.padEnd(14)} could not open - skipped`)
            continue
          }
          let inState = await countAll(page, selectors)
          selectors.forEach((s, i) => { counts.get(s.name)[state] = inState[i] })
          console.log(`  ${state.padEnd(14)} ${inState.filter(n => n > 0).length} of ${selectors.length} match`)
          await closeOverlays(page)
        }
      }
    }
  } finally {
    await context.close()
  }

  let rows = selectors.map(s => {
    let per = counts.get(s.name)
    let total = Object.values(per).reduce((a, b) => a + Math.max(0, b), 0)
    return {...s, per, total, dead: total == 0}
  })

  fs.writeFileSync(OUT_JSON, JSON.stringify({ranAt: new Date().toISOString(), rows}, null, 2))

  let dead = rows.filter(r => r.dead)
  let byFamily = (f) => dead.filter(r => r.family == f)

  let md = ['# Selector inventory', '',
    `${rows.length} selectors checked against live x.com on ${new Date().toISOString().slice(0, 10)}.`,
    `**${dead.length} match nothing anywhere.**`, '',
    '## Matching nothing', '',
    'A selector here either targets something this account never sees (a product',
    'nav item, a menu that was not opened) or is a hook X has broken. The icon',
    'entries are the ones to check first: they match on icon names, so they fail',
    'silently whenever X renames an icon.', '',
    '| Family | Name | Selector |', '|---|---|---|']
  for (let f of ['icon', 'named', 'attr']) {
    for (let r of byFamily(f)) {
      md.push(`| ${r.family} | \`${r.name}\` | \`${r.selector.slice(0, 90)}\` |`)
    }
  }

  md.push('', '## Matching, by surface', '', '| Name | Total | Where |', '|---|---|---|')
  for (let r of rows.filter(r => !r.dead).sort((a, b) => b.total - a.total)) {
    let where = Object.entries(r.per).filter(([, n]) => n > 0)
      .map(([k, n]) => `${k}:${n}`).join(' ')
    md.push(`| \`${r.name}\` | ${r.total} | ${where} |`)
  }
  fs.writeFileSync(OUT_MD, md.join('\n'))

  console.log(`\n  ${dead.length} of ${rows.length} match nothing`)
  console.log(`    icons:      ${byFamily('icon').length}/${rows.filter(r => r.family == 'icon').length}`)
  console.log(`    named:      ${byFamily('named').length}/${rows.filter(r => r.family == 'named').length}`)
  console.log(`    attributes: ${byFamily('attr').length}/${rows.filter(r => r.family == 'attr').length}`)
  console.log(`\n  ${path.relative(ROOT, OUT_MD)}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
