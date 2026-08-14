const {readDefaultConfig, UNPROBEABLE} = require('./default-config')

// Enum settings need explicit endpoints. The `from` value is the inert one where
// there is one, so the probe measures the setting doing its thing.
const ENUMS = {
  darkModeTheme: ['lightsOut', 'dim'],
  disabledHomeTimelineRedirect: ['notifications', 'messages'],
  followButtonStyle: ['themed', 'monochrome'],
  hideNotifications: ['ignore', 'hide'],
  listRetweets: ['ignore', 'hide'],
  navDensity: ['default', 'compact'],
  quoteTweets: ['ignore', 'hide'],
  retweets: ['ignore', 'hide'],
  sortFollowing: ['ignore', 'mostRecent'],
  sortReplies: ['relevant', 'liked'],
  twitterBlueChecks: ['ignore', 'hide'],
  showBlueReplyFollowersCountAmount: ['1000000', '1000'],
}

// Only meaningful once the setting they qualify is on.
const REQUIRES = {
  showBookmarkButtonUnderFocusedTweets: {hideBookmarkButton: true},
  disabledHomeTimelineRedirect: {disableHomeTimeline: true},
  hideExploreNavWithSidebar: {hideExploreNav: true},
  showPremiumReplyBusiness: {hideTwitterBlueReplies: true},
  showPremiumReplyFollowedBy: {hideTwitterBlueReplies: true},
  showPremiumReplyFollowing: {hideTwitterBlueReplies: true},
  showPremiumReplyGovernment: {hideTwitterBlueReplies: true},
  showBlueReplyFollowersCount: {hideTwitterBlueReplies: true},
  showBlueReplyFollowersCountAmount: {hideTwitterBlueReplies: true, showBlueReplyFollowersCount: true},
  hideForYouTimeline: {alwaysUseLatestTweets: true},
  fullWidthMedia: {fullWidthContent: true},
  showRelevantPeople: {hideSidebarContent: true},
  // configureHideMetricsCss() is only called when hideMetrics is on, so with the
  // inert baseline every one of these sub-toggles is unreachable and reads dead
  // for a purely mechanical reason. They all showed up together in the
  // "no measurable effect" list, which is what gave it away.
  // hideAllMetrics is deliberately absent: it is a UI-only convenience control
  // in options.js that ticks the seven below, not a key script.js ever reads.
  hideReplyMetrics: {hideMetrics: true},
  hideRetweetMetrics: {hideMetrics: true},
  hideQuoteTweetMetrics: {hideMetrics: true},
  hideLikeMetrics: {hideMetrics: true},
  hideBookmarkMetrics: {hideMetrics: true},
  hideFollowingMetrics: {hideMetrics: true},
  hideTotalTweetsMetrics: {hideMetrics: true},
}

function buildProbes() {
  let defaults = readDefaultConfig()
  let probes = []

  for (let [key, value] of Object.entries(defaults)) {
    if (key in UNPROBEABLE) continue

    let from, to
    if (typeof value == 'boolean') {
      from = false
      to = true
    } else if (ENUMS[key]) {
      [from, to] = ENUMS[key]
    } else {
      continue
    }

    probes.push({key, from, to, requires: REQUIRES[key] || null})
  }

  return probes
}

// Everything at its inert value, so overlapping settings can't mask each other -
// a hide* setting whose target is already hidden by a neighbour reads as dead.
function inertBaseline() {
  let defaults = readDefaultConfig()
  let baseline = {}

  for (let [key, value] of Object.entries(defaults)) {
    // `debug` is excluded because a write containing it is dropped *whole*: the
    // settings observer short-circuits on `debug` and returns before it merges
    // anything or calls configChanged. Including it here meant every baseline
    // write silently did nothing, so each probe measured from the stored config
    // rather than the baseline - and any setting already `true` there was
    // measured as a no-op and recorded as doing nothing.
    // `enabled` is excluded because cycling it is how the reset works.
    if (key == 'enabled' || key == 'debug') continue
    if (typeof value == 'boolean') baseline[key] = false
    else if (ENUMS[key]) baseline[key] = ENUMS[key][0]
    else baseline[key] = value
  }

  return baseline
}

module.exports = {ENUMS, REQUIRES, buildProbes, inertBaseline}
