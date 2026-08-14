const fs = require('fs')
const path = require('path')

const {ROOT} = require('./default-config')
const {CONTENT_SURFACES} = require('./content')

// Where a setting can act is derived from the code, never from previous results:
// a polluted or under-covered run only ever produces false negatives, so its
// zeros can't be used to prune.
//
// Two independent signals, unioned:
//  1. The function a setting is referenced in. Many of them name their own
//     surface outright (tweakExplorePage, shouldHideProfileTimelineItem).
//  2. The selectors near the reference, for the big CSS builders whose names
//     say nothing because every setting lives in the same function.
//
// Over-attribution costs one wasted probe; under-attribution loses a setting
// entirely, so both signals are deliberately generous.

// Matched against the enclosing function's name.
const FUNCTION_ROUTES = [
  [/^tweakExplorePage/, {surface: 'explore'}],
  [/^tweakBookmarksPage/, {surface: 'bookmarks'}],
  [/^shouldHideProfileTimelineItem|^tweakFollowListPage/, {surface: 'profile'}],
  [/^shouldHideHomeTimelineItem|^tweakDesktopLogo|^tweakHomeIcon|^tweakMessagesIcon/, {surface: 'home'}],
  // The focused tweet and its permalink bar only exist on a tweet's own page.
  [/^onIndividualTweetTimelineChange|^tweakIndividualTweetPage|^tweakFocusedTweet/, {surface: 'tweetDetail'}],
  [/^restoreTweetSource|^restoreTweetInteractionsLinks/, {surface: 'tweetDetail'}],
  // Per-tweet hiding in the observer applies to every timeline that renders tweets.
  [/^onTimelineChange|^restoreLinkHeadline|^unwrapTcoLinks/, {surface: 'home'}, {surface: 'tweetDetail'}],
  [/^handlePopup|^onPopup/, {state: 'caretMenu'}],
]

// Matched against the selectors surrounding the reference.
const SELECTOR_ROUTES = [
  [/body\.LightsOut|body\.Dim/, {theme: 'lightsOut'}],
  [/menuRole|\[role="menu"\]/, {state: 'moreMenu'}],
  [/HoverCard|#layers/, {state: 'hoverCard'}],
  [/data-testid="Dropdown"|sheetDialog|data-testid="caret"/, {state: 'caretMenu'}],
  [/body\.Profile|\.Profile /, {surface: 'profile'}],
  // #cpft*Count are injected onto the focused tweet, so they imply tweetDetail
  // even when the same setting also hides timeline metrics.
  [/\.Views|body\.Tweet|tabindex="-1"|#cpft\w*Count/, {surface: 'tweetDetail'}],
  [/body\.Search|SearchBox/, {surface: 'search'}],
  [/notification/i, {surface: 'notifications'}],
  [/dm-|DMDrawer|chat-drawer/, {surface: 'messages'}],
  [/SidebarContents|sidebarColumn|WhatsHappening|complementary|news_sidebar/, {surface: 'home'}],
]

// Top-level declarations, including the `const x = (() => {...})()` builders
// that hold replaceLogo and navBaseFontSize.
function readFunctions() {
  let lines = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8').split('\n')
  let decl = /^(?:async )?function ([A-Za-z_$][\w$]*)|^const ([A-Za-z_$][\w$]*) = /
  let found = []

  lines.forEach((line, i) => {
    let m = line.match(decl)
    if (m) found.push({name: m[1] || m[2], line: i})
  })

  return found.map((f, i) => ({
    name: f.name,
    body: lines.slice(f.line, i + 1 < found.length ? found[i + 1].line : lines.length).join('\n'),
  }))
}

// The text a reference gets judged on. It runs to the next reference of a
// different setting, with a floor so that `config.a && config.b` - where the
// selectors come after both - doesn't truncate to nothing.
const MIN_BLOCK = 800

// minBlock is a parameter because the two callers want opposite things.
// Routing is deliberately generous - over-attribution costs one wasted probe.
// hooks.js is deciding whether a setting is broken, where a selector dragged in
// from neighbouring code makes a dead setting look alive, so it reads tighter.
function blocksFor(body, minBlock = MIN_BLOCK) {
  let refs = [...body.matchAll(/config\.([A-Za-z_$][\w$]*)/g)]
  let blocks = new Map()

  refs.forEach((m, i) => {
    let key = m[1]
    let next = refs.slice(i + 1).find(r => r[1] != key)
    let end = Math.max(next ? next.index : body.length, m.index + minBlock)
    let text = body.slice(m.index, Math.min(end, body.length))
    blocks.set(key, (blocks.get(key) || '') + '\n' + text)
  })

  return blocks
}

function deriveTargets() {
  let targets = new Map()
  let add = (key, target) => {
    if (!targets.has(key)) targets.set(key, [])
    let list = targets.get(key)
    if (!list.some(t => JSON.stringify(t) == JSON.stringify(target))) list.push(target)
  }

  for (let fn of readFunctions()) {
    let nameRoutes = FUNCTION_ROUTES
      .filter(([pattern]) => pattern.test(fn.name))
      .flatMap(([, ...routes]) => routes)

    for (let [key, block] of blocksFor(fn.body)) {
      if (!targets.has(key)) targets.set(key, [])
      for (let target of nameRoutes) add(key, target)
      for (let [pattern, target] of SELECTOR_ROUTES) {
        if (pattern.test(block)) add(key, target)
      }
    }
  }

  return targets
}

// The More menu and hover cards are the same popup wherever they're opened, so
// they're always probed on home - which reliably has both a nav and tweets.
// Opening them on explore or search only adds ways for the probe to fail.
// The caret menu is not surface-independent: a focused tweet's menu has
// different items from a timeline tweet's, so it keeps its derived surface.
const SURFACE_INDEPENDENT = new Set(['moreMenu', 'hoverCard'])

function routeFor(key, targets) {
  let found = targets.get(key) || []

  let surfaces = [...new Set(found.filter(t => t.surface).map(t => t.surface))]
  let states = [...new Set(found.filter(t => t.state).map(t => t.state))]
  let theme = found.some(t => t.theme == 'lightsOut') ? 'lightsOut' : 'light'

  if (!surfaces.length) surfaces = ['home']
  // Overrides rather than adds: the derived surface is where the setting's code
  // runs, but if the subject isn't rendered there the probe can only ever read
  // zero. The content surface is the same kind of page with the subject on it.
  if (CONTENT_SURFACES[key]) surfaces = [CONTENT_SURFACES[key].name]

  let routes = states.map(state => ({
    surface: SURFACE_INDEPENDENT.has(state) ? 'home' : surfaces[0],
    state,
    theme,
  }))
  // Plain-CSS evidence as well as a state, or no state at all: probe the
  // surfaces directly too.
  if (!states.length || found.some(t => t.surface)) {
    for (let surface of surfaces) routes.push({surface, state: 'none', theme})
  }

  let seen = new Set()
  return routes.filter(r => {
    let k = `${r.surface}/${r.state}/${r.theme}`
    return seen.has(k) ? false : seen.add(k)
  })
}

// readFunctions/blocksFor are exported for hooks.js, which asks a different
// question of the same parse: not "where does this setting run" but "do the
// hooks inside its block still match anything on live X".
module.exports = {deriveTargets, routeFor, readFunctions, blocksFor}
