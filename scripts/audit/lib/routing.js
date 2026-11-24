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
//     surface outright (processFocusedTweet, processHoverCard).
//  2. The selectors and timeline contexts near the reference, for configureCss
//     and the timeline filter, whose names say nothing because many settings
//     live in the same function.
//
// Over-attribution costs one wasted probe; under-attribution loses a setting
// entirely, so both signals are deliberately generous.

// Matched against the enclosing function's name.
const FUNCTION_ROUTES = [
  // The timeline filter runs on every timeline. Which ones a given setting
  // applies to is read from the `context ==` checks beside it (below), so
  // this only needs to place it somewhere it renders.
  [/^shouldHideTweet$|^shouldRemoveEntry$|^isMutedQuote$/, {surface: 'home'}],
  // The focused post, its reply sort and its interaction links only exist on a
  // post's own page; Premium replies are only judged there.
  [/^processFocusedTweet$|^applyInitialRepliesSort$|^addInteractionLinks$|^patchRepliesSort$|^shouldHidePremiumReply$/, {surface: 'tweetDetail'}],
  [/^patchFollowingSort$|^processHomeTabs$|^processSidebar$/, {surface: 'home'}],
  // Per-post additions apply wherever posts render.
  [/^processArticle$|^unwrapTcoLinks$|^oneClick/, {surface: 'home'}, {surface: 'tweetDetail'}],
  // Static CSS applies on every page, and home has the nav, the sidebar and
  // posts. The selectors beside each rule add any page it is specific to.
  [/^configureCss$/, {surface: 'home'}],
  // The only page-specific CSS is the quotes page's
  [/^configureDynamicCss$/, {surface: 'quotes'}],
  [/^processHoverCard$/, {state: 'hoverCard'}],
  // processMenu serves both menus; the muted word item's own route is the
  // addAddMutedWordMenuItem( call beside its reference, below.
  [/^processMenu$|^addMuteQuotesMenuItems$/, {state: 'caretMenu'}],
]

// Matched against the selectors surrounding the reference.
// configureCss names its nav scopes `rail`, `anyNav` and `menus`, so the
// variable names stand in for the selectors they hold.
const SELECTOR_ROUTES = [
  // Nothing in script.js is theme-scoped today; kept so a dark-only rule
  // added later gets probed in the dark theme.
  [/data-theme="?dark/, {theme: 'lightsOut'}],
  // The nav's More menu holds Lists, Communities, Business, Ads and Spaces.
  [/\$\{menus\}|\$\{anyNav\}|\[role="menu"\]|addAddMutedWordMenuItem\(/, {state: 'moreMenu'}],
  // Menus and hover cards share the portal; a hover card is the
  // role=presentation popup with the Followers link in it.
  [/\[data-base-ui-portal\][^\n]*(?:\[role="presentation"\]|verified_followers)/, {state: 'hoverCard'}],
  [/POST_MENU_TRIGGER|\[role="menuitem"\]|icon-feather-scatter-plot|icon-sound-off|icon-block/, {state: 'caretMenu'}],
  [/body\.Profile|context == 'profile'|verified_followers/, {surface: 'profile'}],
  // #cpft*Count are injected onto the focused post, so they imply tweetDetail
  // even when the same setting also hides timeline metrics. .text-lead is the
  // focused post's text, which nothing else uses.
  [/body\.Tweet|\.text-lead|#cpft\w*Count|context == 'tweet'|tweetdetail/, {surface: 'tweetDetail'}],
  [/body\.Search|context == 'search'|path == '\/search'/, {surface: 'search'}],
  [/body\.Explore/, {surface: 'explore'}],
  [/body\.Bookmarks/, {surface: 'bookmarks'}],
  // Not the nav's /notifications link, which is on every page
  [/TimelineNotification|body\.Notifications|urt:notifications|'NOTIFICATION_/, {surface: 'notifications'}],
  [/body\.Messages/, {surface: 'messages'}],
  // The sidebar and the dock are on home, and so is everything the home
  // timeline filter and its tabs act on.
  [/\baside\b|xds-dock|body\.HomeTimeline|context == 'home'|data-pinned-timeline|path == '\/home'/, {surface: 'home'}],
]

// Top-level declarations. `let`s and assignments count too, so code that sits
// between functions - the window.fetch wrapper, the __INITIAL_DATA__ trap - is
// its own block rather than the tail of the function above it, which would
// route its settings to wherever that function acts.
function readFunctions() {
  let lines = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8').split('\n')
  let decl = /^(?:async )?function ([A-Za-z_$][\w$]*)|^(?:const|let) ([A-Za-z_$][\w$]*)\b|^([A-Za-z_$][\w$.]*) = /
  let found = []

  lines.forEach((line, i) => {
    let m = line.match(decl)
    if (m) found.push({name: m[1] || m[2] || m[3], line: i})
  })

  return found.map((f, i) => ({
    name: f.name,
    body: lines.slice(f.line, i + 1 < found.length ? found[i + 1].line : lines.length).join('\n'),
  }))
}

// The text a reference gets judged on. It starts at the beginning of the line,
// because the condition often sits in front of the reference -
// `context == 'profile' && config.hideProfileRetweets` - and runs to the next
// reference of a different setting, with a floor so that `config.a && config.b`
// - where the selectors come after both - doesn't truncate to nothing.
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
    let start = body.lastIndexOf('\n', m.index) + 1
    let end = Math.max(next ? next.index : body.length, m.index + minBlock)
    // The floor never crosses into the next //#region of configureCss: that is
    // a different area of the page, and its selectors would vouch for a
    // setting that has none of its own.
    let region = body.indexOf('//#', m.index)
    if (region != -1) end = Math.min(end, region)
    let text = body.slice(start, Math.min(end, body.length))
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
