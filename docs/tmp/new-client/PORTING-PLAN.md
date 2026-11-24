# Porting Birdfeed to X's new web client

Mapped 2026-11-24 in a clean agent Helium. Detail and verified selectors live in the four area notes beside this file:

- `boot-and-globals.md`: stack, fibers, router, theme, breakpoints, network
- `timeline-and-posts.md`: post anatomy, ads, action bar, menus, virtualizer
- `nav-and-sidebar.md`: rail, bottom bar, More menu, sidebar modules, dock
- `pages-and-overlays.md`: post detail, quotes, profile, notifications, explore/search, hover cards, block/mute
- `routes.txt`: route table pulled from the bundle

## What changed

X replaced the React Native Web app with TanStack Start/Router, React 19, Relay, Tailwind v4 and Base UI (`data-slot="xds-*"`). `#react-root`, `#layers`, the Redux store, the RNW stylesheet and nearly every `data-testid` are gone. Birdfeed's `main()` waits on `#layers + div` forever, so nothing runs at all. The old client cannot be reached: twitter.com and mobile.x.com redirect to it.

## New stable hooks

The replacements for `data-testid`, in order of preference:

1. **Data via fibers.** Each timeline `li`'s fiber carries `item.entry_id`, which tells you what it is: `promoted-tweet-…` is an ad, `who-to-follow-…`, `relevanceprompt-…`, `tweetdetailrelatedtweets-…` is "Discover more", `home-conversation-…`, `notification-…`. The Relay store (`environment.getStore().getSource()`) has the full tweet/user records: `promoted_metadata`, `retweeted_status_results`, `quoted_tweet_results`, `verification`, follower counts and `counts`.
2. **Icon names, which don't change with language.** `svg[data-icon="icon-…"]` and `use[href="#icon-…"]`.
3. **Semantic data attributes.** `data-engagement-action=reply|retweet|like|bookmark|share|media`, `data-pinned-timeline`, `data-slot`, `data-who-to-follow`, `data-bottom-bar`.
4. **Hrefs** for nav, sidebar modules and menu links.
5. **Timeline containers.** `div[id^="urt:<type>:…"] > ul > li`; the id names the timeline (home for-you/following, conversation, notifications, search, explore-sidebar…).

Avoid aria-labels and heading text: they are localised.

## Architecture for the port

1. **Boot.** Gate on the app shell (`body > div.mx-auto` / `main`). Find `router`, `environment` (Relay) and `client` by walking fibers from `document.__reactContainer$…`. Viewer: `window.__INITIAL_DATA__.viewerScreenName`.
2. **Page detection.** `router.subscribe('onResolved')` plus `router.state.matches.at(-1).routeId` sets Birdfeed's existing body classes (`Tweet`, `Profile`, `Notifications`, `Search`, `QuoteTweets`…). This replaces the `<title>`/path regexes and `patchHistory`. Redirects (`disableHomeTimeline`, `defaultToLatestSearch`, verified_followers → followers) use `router.navigate({…, replace: true})`.
3. **One timeline classifier.** A single observer on `[id^="urt:"] > ul` reads each `li`'s `entry_id` and Relay record and adds classes (`cpft-ad`, `cpft-wtf`, `cpft-prompt`, `cpft-discover`, `cpft-repost`, `cpft-quote`, …). CSS does the hiding. Most of the old per-feature DOM sniffing goes away.
4. **Collapsing items.** The timeline is virtualized: rows are absolutely positioned and measured, so `display:none` leaves a gap. Two ways that worked: collapse to 1px, or hide then call the virtualizer's `measureElement(li)`. Still to check: whether a hidden row stays collapsed when it is remounted.
5. **Ads, two layers.** (a) A `window.fetch` wrapper drops `promoted-*` entries from `api.x.com/graphql/…/HomeTimeline` (and other timeline) responses before they render, so the gap problem never arises. This was verified to see the responses even when installed after boot. (b) The DOM classifier as a fallback. A CSS-only selector also worked (0 false positives or misses over about 16 ads): an `li` whose article has no status-link timestamp outside an embedded quote.
6. **Static CSS for everything else.** Nav, sidebar modules, action-bar buttons, metrics, upsells, the dock (Grok/Chat) and menu items can now be hidden by CSS alone using the hooks above. Sidebar modules have to be matched by content (`aside section:has(a[href^="/i/premium"])` etc.); the old `nth-of-type` matching doesn't work because which modules appear, and in what order, varies by page. The `aside` stays in the DOM at every width (it is set to `display:none` below 1024px), so `body.Sidebar` becomes a media query.
7. **Theme.** Everything is CSS tokens (`--x-bg-*`, `--x-fg-*`, `--x-border-*`, `--x-fg-brand`, `--x-font-sans`, `--x-font-scale`). `html[data-theme]` is light or dark only (**Dim is gone**); accent is `html[data-accent]`. Dim, Twitter blue, font and font-size options become variable overrides.
8. **Account location.** `AboutAccountQuery` still answers with the old headers. Insert the label into the focal post's timestamp row and into hover cards (`[data-base-ui-portal]` popup containing `a[href$="/verified_followers"]`).

## Risks

- `responsive_web_extension_compatibility_hide` / `_impression_guard` / `_override_param` feature flags exist. The impression guard skips logging an ad impression when the ad element is 50px tall or less. Nothing reads the hide flag yet, but X is preparing for extensions. Filtering ads at the data layer is the least visible approach.
- Fiber key names and the Relay record shapes are internal and minified-adjacent, so expect drift. The audit tooling (`scripts/audit/*`) also uses `data-testid`s and needs porting so it can detect that drift again.

## Settings: what happens to each

**Retire** (add to `RETIRED_CONFIG_KEYS`; other stored settings stay as they are):

- `hideJobsNav`: no Jobs item anywhere.
- `hideConnectNav`: not in nav; it only survives as the Who to follow "Show more" link.
- `restoreTweetSource`: `source` is no longer in client data.
- `restoreLinkHeadlines`: cards show the headline natively.
- Dim-specific theme handling: Dim no longer exists. It could come back as a Birdfeed-made "Dim" via token overrides; this is your call.

**Now native, keep the option but it may be redundant:**

- `restoreQuoteTweetsLink`: "View quotes" is back under the focal post.
- `hideProfileRetweets`: reposts moved to a `/reposts` tab, and the default Posts filter excludes them.

**Decide:**

- `hideBookmarksNav`: Bookmarks is now inside History (`/i/history`, Bookmarks + Likes tabs). Remap to "hide History", or retire.
- `fullWidthContent`: via `--x-main-column-width` on the page container. Not yet tested.
- `restoreOtherInteractionLinks`: rebuildable from Relay `counts` (link to `/retweets`, `/likes`).

**Ports cleanly (high confidence).** Ads, hideSidebarContent and each sidebar module, hideExploreNav(+WithSidebar), hideGrokNav and the dock, hideCalls/Chat/CreatorStudio/Lists/Communities/Business/Ads/Spaces nav, hideMessagesDrawer (now the dock Chat window), hideComposeTweet, replaceLogo, hideMetrics, hideViews, hideBookmarkButton, hideShareTweetButton, reducedInteractionMode, retweets/quotes classification, mutableQuoteTweets, hideMoreTweets, hideViewActivityLinks, hideVerifiedNotificationsTab, hideNotificationLikes, hideExplorePageContents, defaultToLatestSearch, addAddMutedWordMenuItem, hideForYouTimeline, hideTimelineTweetBox, verified-check handling, account-location labels, photo grid (the carousel needs a rewrite).

**Medium or unverified.** fastBlock and one-click mute/block: Block has its own icon, but "Mute @x" and "Mute this conversation" share `icon-sound-off`, so mute is told apart by the `@` in its label; the confirm dialog was seen only once. sortFollowing (menuitemradio). hideSeeNewTweets. hideAccountSwitcher. hideNotificationRetweets (icon not observed). hideUnavailableQuoteTweets. Who to follow and inline prompts on home (not seen this session). Live on X and promoted trends in the sidebar (not seen). Separated/custom timeline tabs (React owns the Base UI tablist).

## Suggested order

1. **Boot, router page classes, ads (fetch + DOM fallback), sidebar modules, nav items.** This fixes what is visibly broken.
2. **Timeline classifier and the per-post features:** retweets/quotes, metrics, buttons, verified checks, who-to-follow/prompts.
3. **Pages and overlays:** post detail, notifications, explore/search, menus (muted word, fastBlock, one-click), hover cards, account location.
4. **Theme and fonts** via tokens, Dim decision.
5. **Port `scripts/audit`** to the new hooks so drift is detected again.
6. Delete dead RNW code paths (`checkReactNativeStylesheet`, `getTopLevelProps`, Redux readers, testid constants).
