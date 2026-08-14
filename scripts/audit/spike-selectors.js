// Spike: can a setting's crop target be derived from the extension's own CSS
// instead of diffing the DOM?
//
// focusClip guesses from changed elements, which inverts for page-wide settings:
// when everything changes, the densest cluster is the whole viewport. But the
// extension declares what it targets - the selectors it adds when a setting goes
// on. This checks whether those selectors resolve to something on the page.
const {launch, openX, waitForTimeline} = require('./lib/browser')
const {readDefaultConfig} = require('./lib/default-config')
const {inertBaseline} = require('./lib/probes')
const {setConfig, resetTo, readOwnCss, waitForQuiet} = require('./lib/measure')

const SETTINGS = [
  'hideLikeMetrics', 'dontUseChirpFont', 'replaceLogo', 'navDensity',
  'twitterBlueChecks', 'restorePhotoGrid', 'hideComposeTweet', 'hideBusinessNav',
]

// Rules are matched whole so a selector list stays intact; `d: path(...)` blocks
// and font declarations are as much a target as a `display: none`.
function selectorsOf(css) {
  let rules = new Map()
  for (let match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    let selector = match[1].trim().replace(/\s+/g, ' ')
    if (selector && !selector.startsWith('@')) rules.set(selector, match[2].trim())
  }
  return rules
}

async function main() {
  let {context} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()
  await openX(page, 'https://x.com/home')
  await waitForTimeline(page)

  let defaults = readDefaultConfig()
  let baseline = inertBaseline(defaults)

  for (let name of SETTINGS) {
    let value = typeof defaults[name] == 'boolean' ? true : defaults[name]
    let offCss = await resetTo(page, baseline)
    await setConfig(page, {[name]: value})
    await waitForQuiet(page)
    let onCss = await readOwnCss(page)

    let off = selectorsOf(offCss)
    let added = [...selectorsOf(onCss)].filter(([sel, body]) => off.get(sel) != body)

    // A selector is only a usable crop target if it resolves to something with
    // area on the page right now.
    let resolved = await page.evaluate((sels) => sels.map((sel) => {
      let els
      try { els = [...document.querySelectorAll(sel)] } catch { return {sel, error: true} }
      let boxes = els.map(e => e.getBoundingClientRect())
                     .filter(r => r.width > 4 && r.height > 4)
      return {sel, count: boxes.length, w: Math.round(boxes[0]?.width || 0), h: Math.round(boxes[0]?.height || 0)}
    }), added.map(([sel]) => sel))

    let hits = resolved.filter(r => r.count > 0)
    console.log(`\n${name}: ${added.length} new rules, ${hits.length} resolve on page`)
    for (let hit of hits.slice(0, 6)) {
      console.log(`   ${hit.count}x ${hit.w}x${hit.h}  ${hit.sel.slice(0, 110)}`)
    }
    for (let miss of resolved.filter(r => !r.count).slice(0, 3)) {
      console.log(`   --  no match   ${miss.sel.slice(0, 110)}`)
    }
  }

  await context.close()
}

main().catch((error) => { console.error(error); process.exit(1) })
