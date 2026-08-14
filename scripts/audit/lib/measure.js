/**
 * The awkward part of diffing a page against itself is identifying "the same"
 * element across two snapshots - X's DOM has no stable ids and machine-generated
 * class names. So we don't identify them at all: the element references are
 * parked on `window` and re-read after the toggle. Same objects, no keys needed.
 */

const path = require('path')

const SETTLE_MS = 450

const PAGE_HELPERS = `
window.__birdfeedAudit = {
  els: [],
  before: [],
  beforeSet: null,
  beforeCss: [],

  // Visibility diffing is blind to settings that only restyle: replaceLogo
  // swaps the logo with a CSS d:path() override, so the element stays put and
  // the DOM attribute is unchanged while the rendered shape is different. These
  // properties are the ones the appearance settings actually touch.
  //
  // The layout properties are here because a setting can relayout without
  // showing or hiding anything: restorePhotoGrid turns a flex carousel into a
  // grid, which changes no element's visibility at all. Size changes alone
  // cannot stand in for it - those are counted as moved, which is excluded
  // from the score because reflow cascades make it far too noisy. Without
  // display in this signature such a setting scores exactly zero and is
  // indistinguishable from broken.
  //
  // Safe to compare because it is only read for elements visible in *both*
  // states: a display change to or from none is already counted as
  // hidden/shown and never reaches here.
  styleSignature(style) {
    return style.color + '|' + style.backgroundColor + '|' + style.fontFamily +
           '|' + style.fontWeight + '|' + style.fontSize + '|' + style.fill +
           '|' + style.d + '|' + style.borderRadius + '|' + style.padding +
           '|' + style.flexDirection + '|' + style.filter +
           '|' + style.display + '|' + style.gridTemplateColumns +
           '|' + style.aspectRatio + '|' + style.objectFit
  },

  state(el) {
    if (!el.isConnected) return {c: 0, v: 0, w: 0, h: 0, x: 0, y: 0, s: ''}
    let rect = el.getBoundingClientRect()
    let style = getComputedStyle(el)
    let visible = style.display != 'none' &&
                  style.visibility != 'hidden' &&
                  style.opacity != '0' &&
                  rect.width > 0 && rect.height > 0
    return {c: 1, v: visible ? 1 : 0, w: Math.round(rect.width), h: Math.round(rect.height),
            x: Math.round(rect.x), y: Math.round(rect.y), s: this.styleSignature(style)}
  },

  describe(el) {
    let testid = el.getAttribute('data-testid')
    let label = el.getAttribute('aria-label')
    let text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60)
    return [
      el.tagName.toLowerCase(),
      testid ? '[data-testid="' + testid + '"]' : '',
      label ? '[aria-label="' + label.slice(0, 40) + '"]' : '',
      text ? ' :: ' + text : '',
    ].join('')
  },

  cssSelectors() {
    let out = []
    for (let sheet of document.styleSheets) {
      let rules
      try { rules = sheet.cssRules } catch (e) { continue }
      for (let rule of rules) {
        if (rule.selectorText) out.push(rule.selectorText)
      }
    }
    return out
  },

  begin() {
    this.els = Array.from(document.body.querySelectorAll('*'))
    this.before = this.els.map(el => this.state(el))
    this.beforeSet = new Set(this.els)
    this.beforeCss = this.cssSelectors()
  },

  end() {
    let hidden = [], shown = [], removed = [], restyled = [], moved = 0
    // Union box of everything that changed, for a screenshot crop that frames
    // exactly what the setting did
    let box = null
    let grow = (r) => {
      if (!r || r.w <= 0 || r.h <= 0) return
      if (!box) box = {x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h}
      else {
        box.x0 = Math.min(box.x0, r.x); box.y0 = Math.min(box.y0, r.y)
        box.x1 = Math.max(box.x1, r.x + r.w); box.y1 = Math.max(box.y1, r.y + r.h)
      }
    }

    // Individual boxes as well as the union: the union spans the whole viewport
    // whenever a setting touches scattered elements, which makes a useless crop.
    let boxes = []
    let note = (r) => { if (r && r.w > 8 && r.h > 8) boxes.push({x: r.x, y: r.y, w: r.w, h: r.h}) }

    for (let i = 0; i < this.els.length; i++) {
      let el = this.els[i]
      let a = this.before[i]
      let b = this.state(el)

      if (a.c && !b.c) {
        if (a.v) { removed.push(this.describe(el)); grow(a); note(a) }
        continue
      }
      if (a.v && !b.v) { hidden.push(this.describe(el)); grow(a); note(a) }
      else if (!a.v && b.v) { shown.push(this.describe(el)); grow(b); note(b) }
      else if (a.v && b.v) {
        if (a.s !== b.s) { restyled.push(this.describe(el)); grow(b) }
        if (Math.abs(a.w - b.w) > 2 || Math.abs(a.h - b.h) > 2) moved++
      }
    }

    let added = []
    for (let el of document.body.querySelectorAll('*')) {
      if (this.beforeSet.has(el)) continue
      let s = this.state(el)
      if (s.v) { added.push(this.describe(el)); grow(s); note(s) }
    }

    let afterCss = this.cssSelectors()
    let beforeCssSet = new Set(this.beforeCss)
    let afterCssSet = new Set(afterCss)

    // Pad the crop a little so the change has visual context
    let clip = null
    if (box) {
      let pad = 12
      let x = Math.max(0, box.x0 - pad)
      let y = Math.max(0, box.y0 - pad)
      clip = {
        x, y,
        width: Math.min(window.innerWidth - x, box.x1 - box.x0 + pad * 2),
        height: Math.min(window.innerHeight - y, box.y1 - box.y0 + pad * 2),
      }
      if (clip.width <= 0 || clip.height <= 0) clip = null
    }

    return {
      hidden: hidden.length,
      shown: shown.length,
      removed: removed.length,
      added: added.length,
      restyled: restyled.length,
      moved,
      clip,
      boxes,
      viewport: {w: window.innerWidth, h: window.innerHeight},
      column: (() => {
        let el = document.querySelector('[data-testid="primaryColumn"]')
        if (!el) return null
        let r = el.getBoundingClientRect()
        return {x: Math.round(r.x), w: Math.round(r.width)}
      })(),
      cssAdded: afterCss.filter(s => !beforeCssSet.has(s)),
      cssRemoved: this.beforeCss.filter(s => !afterCssSet.has(s)),
      samples: {
        hidden: hidden.slice(0, 8),
        removed: removed.slice(0, 8),
        added: added.slice(0, 8),
        shown: shown.slice(0, 8),
        restyled: restyled.slice(0, 8),
      },
    }
  },
}
`

async function installHelpers(page) {
  await page.evaluate(PAGE_HELPERS)
}

// Pushes changes through the same DOM channel content.js uses, so the extension
// applies them exactly as it would for a real settings change - and without
// touching the user's stored config.
async function setConfig(page, changes) {
  await page.evaluate((changes) => {
    let $settings = document.querySelector('script#cpftSettings')
    if (!$settings) throw new Error('#cpftSettings not found - is the extension loaded?')
    // innerText replaces child nodes, which is what the extension's
    // MutationObserver is listening for
    $settings.innerText = JSON.stringify(changes)
  }, changes)
  await page.waitForTimeout(SETTLE_MS)
}

// X streams content in continuously, so a snapshot taken mid-render diffs
// against elements that arrived on their own. Wait for the DOM to stop growing.
// Bounded: on a busy timeline the DOM may never fully settle, and this runs
// before every one of ~800 probes.
async function waitForQuiet(page, {stableMs = 600, timeoutMs = 6_000} = {}) {
  let deadline = Date.now() + timeoutMs
  let last = -1
  let stableSince = 0

  while (Date.now() < deadline) {
    let count = await page.evaluate(() => document.body.querySelectorAll('*').length)
    if (count == last) {
      if (!stableSince) stableSince = Date.now()
      if (Date.now() - stableSince >= stableMs) return true
    } else {
      last = count
      stableSince = 0
    }
    await page.waitForTimeout(150)
  }
  return false
}

// The extension's own stylesheet, as a proxy for "did the config write land".
// Its internal config object lives in a closure and can't be read directly.
const OWN_CSS = `(() => [...document.querySelectorAll('style')]
  .filter(s => /HiddenTweet|cpft_|SidebarContents|HiddenAd/.test(s.textContent || ''))
  .map(s => s.textContent).join('\\n')
)()`

async function readOwnCss(page) {
  return await page.evaluate(OWN_CSS)
}

// An incremental config write does not reliably clear the previous probe's
// setting, which leaves the next probe measuring against a polluted baseline and
// reading as dead. Cycling `enabled` forces a full teardown and rebuild, which
// is deterministic.
//
// The baseline must be written *after* the cycle. `enabled: true` re-runs
// main(), which re-applies the **stored** config - so a baseline written before
// the cycle is thrown away by it, and the page starts the measurement at the
// user's real settings instead of the inert baseline.
//
// That silently broke every setting whose stored value is already `true`: the
// reset left it applied, the probe then wrote `true` over `true`, nothing moved,
// and it recorded as doing nothing. Traced on restorePhotoGrid, whose photo
// grids read `display: grid` immediately after a reset to a baseline holding
// `restorePhotoGrid: false`. It shows up in the results as 19 of 20 confirmed
// settings defaulting to `false`, against 6 of 8 unexplained zeros defaulting
// to `true`.
async function resetTo(page, config) {
  await setConfig(page, {enabled: false})
  await setConfig(page, {enabled: true})
  await setConfig(page, config)
  await waitForQuiet(page)
  return await readOwnCss(page)
}

// Applies a config and measures the result against the page as it stands, with
// no reset. On its own this is how the reverse of a probe gets measured: the
// page is already at `to`, so going back to `from` turns whatever the setting
// added into a removal.
//
// That matters because the axes are not equally quiet. X lazy-loads and
// virtualises, so ~100 elements gain visibility on their own during any
// measurement, which puts the `shown` floor around 200 - above the entire
// effect of most settings that reveal something. Removals are near-silent.
// Measuring backwards moves the expected effect onto the quiet axis.
async function measureApply(page, config, {guard} = {}) {
  let run = async () => {
    await page.evaluate(() => window.__birdfeedAudit.begin())
    await setConfig(page, config)
    return await page.evaluate(() => window.__birdfeedAudit.end())
  }
  return guard ? await guard.freeze(run) : await run()
}

// The extension hides tweets as it walks a freshly loaded timeline. That work
// changes visibility without changing element count, so waitForQuiet - which
// samples the count - returns while it is still running, and the remainder
// lands inside whichever measurement comes next as hundreds of spurious
// `hidden`. It only happens on the first reset after a page load: measured on
// /home the first cycle reads hidden=578 shown=147 and every cycle after it
// reads zero, while content-light /messages reads zero throughout.
//
// One throwaway cycle absorbs it. That matters because the noise sample takes
// the max across its samples, so a single dirty first read raises the floor for
// every probe on the route past any real signal.
async function warmUp(page, baseline, {guard, prepare} = {}) {
  await measureChange(page, baseline, {hideViews: baseline.hideViews}, {guard, prepare})
}

// `prepare` reopens the UI state under test. The reset cycles `enabled`, which
// tears down the extension and closes any menu with it, so the state has to be
// restored after the reset but before the baseline snapshot.
async function measureChange(page, from, to, {guard, prepare} = {}) {
  // A pointer resting over a profile link makes X pop a hover card mid-probe,
  // which reads as hundreds of added elements.
  if (!prepare) await page.mouse.move(2, 2)
  await resetTo(page, from)
  if (prepare) {
    await prepare()
    await waitForQuiet(page)
  }

  return await measureApply(page, to, {guard})
}

// `moved` is excluded: reflow cascades make it far too noisy on a live timeline
// to be part of the headline signal.
function impactScore(result) {
  return visualImpact(result) + result.restyled
}

// The two axes have very different noise characteristics - appearing/hiding is
// near-silent on a settled page, while computed styles drift on their own from
// hover states and media loading. Thresholding them together lets style noise
// bury a clean visibility signal, so they are scored apart.
function visualImpact(result) {
  return result.hidden + result.shown + result.removed + result.added
}

function styleImpact(result) {
  return result.restyled
}

// Freezes transitions and animations so computed styles stop moving under us.
// Applied before the baseline snapshot, so it is constant across the diff.
const FREEZE_MOTION = `
  let $s = document.createElement('style')
  $s.id = 'birdfeedAuditFreeze'
  $s.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }'
  document.head.appendChild($s)
`

async function freezeMotion(page) {
  await page.evaluate(`if (!document.getElementById('birdfeedAuditFreeze')) { ${FREEZE_MOTION} }`)
}

// Captures the before/after pair for a setting, cropped to the region that
// actually changed. Doubles as the illustration for the options page.
//
// Captured in the order before -> after so there is no revert step. The previous
// version shot `after` first and reverted with a bare setConfig, which is the
// write that does not reliably clear state - that is what resetTo exists to work
// around. So the "before" images were not actually at baseline: they showed the
// extension still acting, which makes them worthless as examples.
// The union of every changed element covers the whole viewport as soon as a
// setting touches scattered things, so the crop is built around the single
// biggest change instead, plus anything sitting near it. That is what a reader
// needs to see: one clear place where the page differs.
function focusClip(boxes, viewport, {pad = 24, min = {w: 420, h: 260}, max = {w: 900, h: 620}, column = null} = {}) {
  if (!boxes?.length) return null

  // Densest cluster, not the largest box. Settings like hideMetrics change many
  // small spans sitting inside one big unchanged container; picking the biggest
  // box frames the container and can land on a tweet that has no metrics at all,
  // making before and after look identical.
  let centre = (b) => ({x: b.x + b.w / 2, y: b.y + b.h / 2})
  let within = (a, b, r) => {
    let ca = centre(a), cb = centre(b)
    return Math.abs(ca.x - cb.x) < r && Math.abs(ca.y - cb.y) < r
  }

  let seed = boxes.reduce((best, b) => {
    let n = boxes.filter(o => within(b, o, 160)).length
    return n > best.n ? {box: b, n} : best
  }, {box: boxes[0], n: 0}).box

  let group = boxes.filter(b => within(seed, b, 200))
  let x0 = Math.min(...group.map(b => b.x))
  let y0 = Math.min(...group.map(b => b.y))
  let x1 = Math.max(...group.map(b => b.x + b.w))
  let y1 = Math.max(...group.map(b => b.y + b.h))

  let w = Math.min(max.w, Math.max(min.w, x1 - x0 + pad * 2))
  let h = Math.min(max.h, Math.max(min.h, y1 - y0 + pad * 2))
  // Centre the crop on the change rather than anchoring top-left, so a small
  // change does not end up hard against the edge of a padded-out box.
  let cx = (x0 + x1) / 2
  let cy = (y0 + y1) / 2
  let x = Math.max(0, Math.min(viewport.w - w, cx - w / 2))
  let y = Math.max(0, Math.min(viewport.h - h, cy - h / 2))

  // Snap horizontally to the content column when the change sits inside it.
  // Centring on a few small spans slices the tweet they belong to down the
  // middle, which reads as a broken screenshot rather than an example.
  if (column && cx > column.x && cx < column.x + column.w) {
    w = Math.min(max.w, column.w + pad * 2)
    x = Math.max(0, Math.min(viewport.w - w, column.x - pad))
  }

  return {x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h)}
}

// Captures the before/after pair, cropped to where the page actually differs.
//
// The diff runs with anonymisation held off: rewriting names and avatars is
// itself a DOM change, and doing it mid-diff would register as the setting's
// effect and drag the crop somewhere meaningless.
async function capturePair(page, {from, to, dir, name, prepare, anonymise}) {
  let shot = async (suffix, clip) => {
    let file = path.join(dir, `${name}.${suffix}.png`)
    await page.screenshot({path: file, clip: clip || undefined})
    return path.basename(file)
  }

  // Each page load re-injects the stored config, which has the extension off in
  // this profile - without asserting it both shots come out identical.
  await setConfig(page, {enabled: true})
  await setConfig(page, from)
  if (prepare) await prepare()

  await installHelpers(page)
  await page.evaluate(() => window.__birdfeedAudit.begin())
  await setConfig(page, to)
  if (prepare) await prepare()
  let result = await page.evaluate(() => window.__birdfeedAudit.end())
  let clip = focusClip(result.boxes, result.viewport, {column: result.column})

  if (anonymise) await anonymise(page)
  let after = await shot('after', clip)

  await setConfig(page, from)
  if (prepare) await prepare()
  if (anonymise) await anonymise(page)
  let before = await shot('before', clip)

  return {before, after, clip, changed: result.boxes.length}
}

module.exports = {
  SETTLE_MS, installHelpers, setConfig, measureChange, measureApply, waitForQuiet, warmUp,
  impactScore, visualImpact, styleImpact, freezeMotion, capturePair, focusClip,
  readOwnCss, resetTo,
}
