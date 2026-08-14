const {waitForQuiet} = require('./measure')
const {contentSurfaces} = require('./content')

// Readiness anchors deliberately avoid anything the extension manipulates - it
// hides tweets, nav items and tabs by design, so waiting on those would hang
// exactly when a probe is working correctly.
const PRIMARY = '[data-testid="primaryColumn"]'

// Raced rather than fixed: the DM and Grok surfaces don't lay out like a
// timeline, so insisting on primaryColumn stalls the whole route for 45s and
// throws away every probe in it.
const ANCHORS = [
  PRIMARY,
  '[data-testid="DmActivityContainer"]',
  '[data-testid="dm-inbox-tab-requests"]',
  'main [role="region"]',
  'main',
]

async function ready(page, {timeout = 30_000} = {}) {
  let hit = await Promise.any(
    ANCHORS.map(sel => page.waitForSelector(sel, {state: 'attached', timeout}))
  ).catch(() => null)

  if (!hit) throw new Error('no page anchor appeared - surface may be unavailable')
  await waitForQuiet(page)
}

// Resolved at run time from the logged-in session rather than hard-coded.
async function resolveContext(page) {
  await page.goto('https://x.com/home', {waitUntil: 'domcontentloaded'})
  await ready(page)

  let username = await page.evaluate(() => {
    let href = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href') ||
               document.querySelector('[data-testid="UserAvatar-Container-"]')?.closest('a')?.getAttribute('href')
    return href ? href.replace(/^\//, '') : null
  })

  // Wait for it rather than sampling once - tweets render after the anchor, and
  // without a tweet URL every tweetDetail route is silently skipped.
  await page.waitForSelector('article[data-testid="tweet"] a[href*="/status/"]',
                             {state: 'attached', timeout: 30_000}).catch(() => {})

  let tweetPath = await pickEngagedTweet(page)

  return {username, tweetPath}
}

// Several settings only render on a tweet that has the engagement they describe:
// restoreQuoteTweetsLink needs quote_count > 0, restoreOtherInteractionLinks
// needs retweets, the metrics settings need counts to hide. Taking the first
// tweet off a live timeline usually gets a seconds-old post with zeros, and all
// of those settings then measure as doing nothing.
// Counts are abbreviated in the DOM ("4.8K"), so a digits-only parse reads that
// as 48 and ranks it below a post with 60 real replies.
const SCORE_BEST = `(() => {
  let value = (text) => {
    let m = (text || '').trim().match(/([\\d.,]+)\\s*([KMkm]?)/)
    if (!m) return 0
    let n = parseFloat(m[1].replace(/,/g, '')) || 0
    return m[2] ? n * (/[Kk]/.test(m[2]) ? 1e3 : 1e6) : n
  }
  let best = null, bestScore = 0
  for (let $a of document.querySelectorAll('article[data-testid="tweet"] a[href*="/status/"]')) {
    if (!/\\/status\\/\\d+$/.test($a.href)) continue
    let $tweet = $a.closest('article')
    let n = 0
    for (let $btn of $tweet.querySelectorAll('[role="group"] [data-testid$="reply"], [role="group"] [data-testid$="retweet"], [role="group"] [data-testid$="like"]')) {
      n += value($btn.textContent)
    }
    if (n > bestScore) { bestScore = n; best = new URL($a.href).pathname }
  }
  return {path: best, score: bestScore}
})()`

// Several settings only render on a tweet that has the engagement they describe:
// restoreQuoteTweetsLink needs quote_count > 0, restoreOtherInteractionLinks
// needs retweets, the metrics settings need counts to hide.
//
// The bar is high on purpose. Quote count isn't visible in the timeline, so it
// can't be selected for directly - but a post with thousands of interactions
// has virtually always been quoted, while one with a few dozen often hasn't.
// Accepting a lightly-engaged post is how those settings read as dead despite
// being verifiably fine on a busy one.
const MIN_ENGAGEMENT = 5_000

async function pickEngagedTweet(page) {
  let engaged = await page.evaluate(SCORE_BEST)
  if (engaged.path && engaged.score >= MIN_ENGAGEMENT) return engaged.path

  // Nothing lively on the timeline - Top search reliably surfaces posts that
  // have been quoted and retweeted.
  try {
    await page.goto('https://x.com/search?q=news&f=top', {waitUntil: 'domcontentloaded'})
    await ready(page)
    await page.waitForSelector('article[data-testid="tweet"] a[href*="/status/"]',
                               {state: 'attached', timeout: 20_000})
    // Ranked, not first-found: taking whatever happened to be at the top of the
    // results is what made this fallback no better than the timeline.
    let fromSearch = await page.evaluate(SCORE_BEST)
    if (fromSearch.path && fromSearch.score >= engaged.score) return fromSearch.path
  } catch (e) { /* fall through to whatever the timeline gave us */ }

  return engaged.path
}

function buildSurfaces({username, tweetPath}) {
  let surfaces = [
    {name: 'home', url: 'https://x.com/home'},
    {name: 'explore', url: 'https://x.com/explore'},
    {name: 'search', url: 'https://x.com/search?q=news&src=typed_query'},
    {name: 'notifications', url: 'https://x.com/notifications'},
    {name: 'messages', url: 'https://x.com/messages'},
    {name: 'bookmarks', url: 'https://x.com/i/bookmarks'},
  ]

  if (username) surfaces.push({name: 'profile', url: `https://x.com/${username}`})
  if (tweetPath) surfaces.push({name: 'tweetDetail', url: `https://x.com${tweetPath}`})

  return surfaces.concat(contentSurfaces())
}

module.exports = {PRIMARY, ready, resolveContext, buildSurfaces}
