// A setting can only be measured where its subject is actually on screen.
//
// The default surfaces are whatever this account's timeline happens to be
// showing, which for content-specific settings is usually nothing relevant.
// They then measure as doing nothing - which is indistinguishable from broken,
// and is exactly how restorePhotoGrid read as dead on /home while being
// verifiably correct on a page that had multi-photo posts on it.
//
// These searches put the subject on screen deterministically. Each becomes an
// extra named surface, so probes for these settings get their own route.
const CONTENT_SURFACES = {
  restorePhotoGrid: {name: 'photos', url: 'https://x.com/search?q=filter%3Aimages%20photos&f=top'},
  restoreLinkHeadlines: {name: 'links', url: 'https://x.com/search?q=filter%3Alinks%20news&f=top'},
  unwrapTcoLinks: {name: 'links', url: 'https://x.com/search?q=filter%3Alinks%20news&f=top'},
  hideGrokNav: {name: 'grok', url: 'https://x.com/search?q=grok&f=top'},
  // hideGrokTweets deliberately has no entry. It matches posts *sharing a Grok
  // conversation* (a[href^="/i/grok/share/"]), not posts mentioning Grok, and
  // X search cannot select for that link - a "grok" search returns posts about
  // Grok, which the setting correctly ignores. It needs a seeded post rather
  // than a search, so it stays an unmeasured setting rather than a false zero.
}

// Deduplicated: several settings share one page.
function contentSurfaces() {
  let byName = new Map()
  for (let s of Object.values(CONTENT_SURFACES)) byName.set(s.name, s)
  return [...byName.values()]
}

module.exports = {CONTENT_SURFACES, contentSurfaces}
