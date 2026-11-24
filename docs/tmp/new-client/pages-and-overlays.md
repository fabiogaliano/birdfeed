# New x.com client: pages and overlays

Checked live on 2026-11-24 in agent Helium (logged in, no extension, 1280×800 desktop). Every selector below was confirmed with `eval` against the live DOM unless marked otherwise. Other docs in this folder cover boot, timeline/post anatomy and nav/sidebar; this one covers page-specific features, menus, dialogs and hover cards.

## Stack facts that matter for these pages

- **Router: TanStack Router.** It is reachable from any fiber: walk up to the HostRoot (`fiber.return` until null), then search down for `memoizedProps.router` (found 4 levels down). Useful members:
  - `router.state.matches.at(-1).routeId` gives the page identity as a route pattern, e.g. `/$username/_followers/verified_followers`, `/$username/status/$id/`, `/i/history/`. This replaces URL regexes and `body.<Page>` guessing.
  - `router.navigate({...})` and `router.history.push/replace` replace `props.history.push`, which the old `History_push` and `patchHistory()` depended on.
  - `router.subscribe(...)` and `router.history.subscribe(...)` notify on page changes.
  - All 715 route ids are in `routes.txt`. Layout-only segments start with `_` (`_profile`, `_followers`, `_engagements`, `_full-width`, `_headerless`).
- **Data: Relay.** There is no Redux store, so `getState()` and `getTweetInfo()` (`script.js:2814`, `2910`) are dead.
  - Get the environment by walking `.return` from any `<article>` until a `memoizedProps.value` has `getStore` (about 300 levels up). Then `env.getStore().getSource().get(id)`.
  - A post is `Tweet` with `rest_id`. Linked records hang off `client:<TweetId>:counts|views|details|legacy|core|perspective`.
  - `counts` has `quote_count`, `retweet_count`, `favorite_count`, `reply_count` and `bookmark_count`. `views.count` is the view count.
  - **`source` / `source_name` is not in the store**: no record anywhere has it, because the client's queries don't request it.
- **Timeline entries.**
  - Every timeline is `div[id^="urt:"] > ul > li[data-index]`, inside `section`.
  - The container id names the timeline: `urt:conversation:<id>`, `urt:profile:<screen_name>`, `urt:notifications:All`, `urt:search:Top:<q>`, `urt:search:Top:quoted_tweet_id:<id> OR …` (the quotes page), `urt:verified-followers:<screen_name>`, `urt:bookmarks`, `urt:generic:<b64>` (Explore), and `urt:explore-sidebar:5` (the sidebar trends).
  - Entry identity comes from fiber: walk `.child` from the `li` until `memoizedProps.entry`, then read `entry.entry_id` (`tweet-…`, `who-to-follow-…`, `conversationthread-…`, `tweetdetailrelatedtweets-…`, `relevanceprompt-…`, `notification-…`, `profile-originals-conversation-…`, `stories-…`, `trend-…`).
  - `entry.__id` is a Relay record id. Its `content → content` chain resolves to `TimelineTweet` or `TimelineNotification`.
- **The list is virtualized** (TanStack Virtual, absolutely positioned `li` with `translateY`). **Hiding an `li` or its child with CSS leaves a gap.** The built-in ResizeObserver does not shrink the item to 0. Calling the virtualizer's `measureElement(li)` after hiding does close the gap: next item moved from 2311px to 1877px, and list height went from 4964px to 4530px.
  - Find the virtualizer by walking `.return` from the `ul` and scanning each fiber's hook chain (`memoizedState` → `.next`) for an object with `measureElement`. It was at 3 fibers up, hook 39.
  - Untested: whether a remount (scrolling away and back) keeps the 0 size. Hiding the *last* entry (for example "Discover more") needs no fix.
- **Icons carry names.**
  - Inline icons are `svg[data-icon="icon-…"]`.
  - The engagement-bar icons are sprite references (`<use href="#icon-reply|repost|heart|bookmark|share-ios|bar-chart|more-dots-hor">`). Badges use `#icon-verified-premium-color|business-color|government-color`.
  - These names don't change with the UI language, so they replace the old `path[d^=…]` matching.
- **Other markers.**
  - No `data-testid` is left on these surfaces.
  - Stable attributes: `data-slot="xds-…"` (design system parts), `data-engagement-action`, `data-post-avatar`, `data-href` on `[role=link]` post wrappers, and `data-base-ui-portal` for overlays.
  - Tabs are `[role=tablist] > [role=tab]` and have no per-tab wrapper `div`. The active tab has `[data-active]`. Most tabs are `a[href]`; the profile "Posts" tab is a `button` that opens a filter menu.

## Post detail page (`/$username/status/$id/`)

- Timeline: `urt:conversation:<focalId>`.
  - Ancestor posts and replies are wrapped in `li > div > div[role=link][data-href]`.
  - **The focal post has no `[role=link]` wrapper.** It is the only one whose text uses `.text-lead`, so `li:has(.text-lead)` matches it.
  - The fiber at `article` → `.return ×6–16` carries `isFocal: true` / `isMainEntity: true`.
- Focal post anatomy (order inside `article > div.@container/post-actions`):
  1. A header containing a "Subscribe" button `a[href$="/creator-subscriptions/subscribe"]`, a Grok button `button[aria-label="Explain this post"]`, and `button[aria-label="More"][data-slot="xds-menu-trigger"]`.
  2. The text, then the quoted post `div[role=link][data-slot="embedded-tweet-frame"]`.
  3. The timestamp row `div.text-secondary.flex.shrink.items-center`, holding the time link `a[href="/<user>/status/<id>"]` and the views link `a[href$="/status/<id>/analytics"]` ("103.2K Views").
  4. The engagement bar `div[role=group]` with children `div[data-engagement-action="reply|retweet|like|bookmark"]` and `button[data-engagement-action="share"]`.
  5. A row containing `button[aria-label^="Sort replies"][data-slot="xds-menu-trigger"]` (`svg[data-icon=icon-chevron-down-sm]`) and **a native `a[href$="/quotes"]` "View quotes" link**.
  6. The inline reply composer (`textarea[aria-label="Post your reply"]`).
- On **your own** focal post there is an analytics upsell card: `div.bg-secondary:has(a[href="/i/account_analytics"])`. It reads "Access your post analytics / Unlock advanced analytics with Plus / Learn more", with a "Dismiss" button.
- Reply ads: entry id `conversationthread-<id>`. In place of the timestamp the header has an `a[href="/<advertiser>"]` with the text "Ad".
  - Relay has a `TimelinePromotedMetadata` record for it.
  - Fiber props on the post components carry `promotion` (undefined for organic posts).
- "Show probable spam" is an `li > button` (it replaces "Show additional replies").
- **"Discover more"** is one `li` holding all its posts: `li:has(h2)`, entry id `tweetdetailrelatedtweets-<id>`. It is always the last entry.
- "Relevant people" appears only as an `h2` in the sidebar (see nav-and-sidebar.md).

## Quotes and engagements (`/$username/status/$id/_engagements/{quotes,retweets,likes}`)

- Header: `h2` "Post activity" and `button[aria-label="Sort engagements"]`. Tabs are `a[role=tab][href$="/quotes"|"/retweets"]` (Likes only appears on your own posts; not checked).
- Every quote shows the quoted post as `[data-slot="embedded-tweet-frame"][data-href="/<user>/status/<focalId>"]`. All 3 of 4 items checked pointed at the focal id.

## Profile (`/$username/_profile/…`)

- Timeline: `urt:profile:<screen_name>`.
- Tabs:
  - `button[role=tab]` "Posts". Its menu has `menuitemradio` items All / Posts / Highlights, plus `menuitem` "Sort by". The default is "Posts".
  - `a[role=tab]` links to `/with_replies`, `/reposts`, `/media` and `/articles`. `/highlights`, `/subs` and `/all` exist as routes.
- **Reposts now have their own tab**, and the default "Posts" filter's entries are `tweet-…` and `profile-originals-conversation-…`. So hiding retweets on a profile is what X now does by default; "All" includes them.
- Inline "Who to follow" is an `li` with `h2`, entry id `who-to-follow-<id>`.
- Header links:
  - Followers goes to `a[href$="/verified_followers"]`; following goes to `a[href$="/following"]`.
  - `a[href$="/followers_you_follow"]`; "Joined" goes to `a[href$="/about"]`.
  - `button[aria-label="Message"]`, `button[aria-label^="Follow @"]`, and the profile `button[aria-label="More"]`.
- Followers page (`/$username/_followers/…`): tabs `a[role=tab]` to `/verified_followers` (the default), `/followers_you_follow`, `/followers` and `/following`. Timeline: `urt:verified-followers:<name>`.

## Hover card

- Rendered in a Base UI portal: `[data-base-ui-portal] > div[role=presentation][data-open][data-side]`.
- No testid. Identify it with `:has(a[href$="/following"]):has(a[href$="/verified_followers"])`.
- Contents:
  - Banner, avatar `a[href="/<user>"]`, `button[aria-label="Message"]` and `button[aria-label^="Follow @"]`.
  - Name, badge, bio, and the Following and Followers links (Followers → `/verified_followers`).
  - "Followed by …" (`a[href$="/followers_you_follow"]`).
  - A Grok "Profile Summary" button: `data-slot="xds-button"` with no aria-label; match it by text.
- It appears after about 0.5 s of hovering over an avatar or name.

## Notifications (`/notifications`, `/notifications/mentions`)

- The tabs are **only** All and Mentions (`a[role=tab]`). There is **no Verified tab** in the UI, although `/notifications/verified` still exists as a route.
- Timeline: `urt:notifications:All`. Entries `notification-…`.
- Type comes from the first `svg[data-icon]` in the `li`:
  - `icon-heart-fill` = like
  - `icon-person-fill` = follow
  - `icon-sparkles` = recommendation
  - `icon-logo-x` = system message
  - `icon-logo-grok` sits on post-type entries (mentions/replies)
- Relay has the same fact without depending on the DOM: `TimelineNotification.icon` = `heart_icon` / `person_icon` / `recommendation_icon` / `bird_icon`.
- The repost icon name was **not seen**: this account had no repost notifications. It is probably `icon-repost-fill` / `retweet_icon`, but that needs confirming.

## Explore (`/explore`, `/explore/tabs/$tabId`)

- Tabs: `a[role=tab]` to `/explore/tabs/for_you|trending|news|sports|entertainment`. Timeline: `urt:generic:<b64>`.
- Entries: `stories-…` ("Today's News"), `trend-<name>`, `who-to-follow-…`, then `tweet-…` under "Posts For You".
- No event hero or ad block was seen. The page has a header search form `form[role=search]` and `a[aria-label="Settings"][href="/settings/explore"]`.

## Search (`/search?q=…`)

- Tabs: `a[role=tab]` whose hrefs differ only by `&f=live` (Latest), `&f=user`, `&f=media` and `&f=list`. Top has no `f`.
- Timeline: `urt:search:Top:<q>`.
- "Suggested" filler entries are `relevanceprompt-<n>` ("Is this post relevant to your search?").

## History and bookmarks

- `/i/bookmarks` **redirects to `/i/history/`**. It shows tabs "Bookmarks" (`button[role=tab]`) and `a[role=tab][href="/i/history/likes"]`. Timeline: `urt:bookmarks`.
- `/i/lists` rendered an empty `main` after 7 s. Lists live at `/$username/lists/` (the nav More menu links `/<me>/lists`); not dug further.

## Menus

- Every menu is a Base UI portal: `[data-base-ui-portal] div[role=menu][data-slot="xds-menu-content"]`, with items `[role=menuitem][data-slot="xds-menu-item"]` (`div` or `a`). Each item has `span > svg[data-icon]` plus `div` label text.
- **Post "More" menu** (trigger `article button[aria-label="More"][data-slot="xds-menu-trigger"]`):
  - Items are identified by icon:
    - `icon-person-follow` = Follow
    - `icon-lists` = Lists
    - `icon-sound-off` = Mute @user and Mute this conversation (same icon; the fiber component props differ, `mo(promotion,tweet)` vs `oo(tweet)`)
    - `icon-block` = Block
    - `icon-feather-scatter-plot` = **View post activity** (now a `div`, not `a[href$="/quotes"]`)
    - `icon-code` = Embed
    - `icon-flag` = Report
    - `icon-megaphone` = Request Community Note
  - The Block item's fiber (`menuitem` → `.return ×4`) has props `{confirmation: {title, message, confirmText}, onSelect}`.
- **Block confirmation**:
  - `div[role=dialog][data-slot="xds-modal-surface"]` with `h2` "Block @x?" and `p[data-slot="xds-modal-description"]`.
  - Buttons sit in `[data-slot="xds-modal-footer-actions"]`: Cancel, then Block (the confirm button is last). No testid.
  - Escape closes it.
- **Nav "More" menu** (`button[aria-label="More menu items"]`): links `a[role=menuitem]` to `/<me>/lists`, `/<me>/communities`, `/i/premium-business?referring_page=dash_menu`, `https://ads.x.com/…` and `/i/spaces/start`, plus `a[href="/settings"]` (`svg[data-icon=icon-settings]`) "Settings and privacy". The container is `div.min-h-0.overflow-y-auto.p-1`.
- Route `/settings/add_muted_keyword` still exists.

## Compose (`/compose/post`)

- Modal `div[role=dialog][data-slot="xds-modal-surface"]`, with a hidden `h2` "Create post" and `button[aria-label="Close"]`.
- The editor is a plain `textarea[aria-label="What's happening?"]` (no Draft.js).
- Toolbar buttons: Add media, Add GIF, Generate image (Grok), Add emoji, Add poll, plus `button[aria-label^="Who can reply"]`.
- The URL changes to `/compose/post`, and Escape goes back to the previous route.
- No Premium upsell was seen in the empty composer.

## Setting map

| Setting | Old selector / mechanism | New selector / approach | Confidence |
|---|---|---|---|
| hideMoreTweets ("Discover more") | `.SuggestedContent`, heading text in conversation timeline | Hide the `li` whose entry id starts with `tweetdetailrelatedtweets-` (or `[id^="urt:conversation"] > ul > li:has(> div > div > div > h2)`). It is the last entry, so leaving a gap doesn't matter | High |
| hideSortRepliesMenu | `.SortRepliesMenu` (via `SORT_REPLIES_PATH`) | `button[aria-label^="Sort replies"]`. The label is English, so for other languages use the focal row's first `button[data-slot="xds-menu-trigger"]:has(svg[data-icon=icon-chevron-down-sm])` | High (label) / Medium (structural) |
| addFocusedTweetAccountLocation | `getAccountLocation()` GraphQL plus an inserted label | The `AboutAccountQuery` (`XRqGa7EeokUU5kppkh13EA`) with the old headers **still returns 200 with `about_profile.account_based_in`**. Insert into the focal timestamp row `li:has(.text-lead) div.text-secondary.flex.shrink.items-center` | High |
| addUserHoverCardAccountLocation | hover card testid | Watch `[data-base-ui-portal]` for a popup `:has(a[href$="/verified_followers"])`. Take the screen name from its avatar `a[href]` and insert after the Following/Followers row. Same API as above | High |
| restoreTweetSource | `getTweetInfo().source_name` from Redux | **Not available**: `source` is not in the Relay store. It would need a separate GraphQL call (TweetResultByRestId with the old fields) or capturing network responses | Low (no data source) |
| restoreQuoteTweetsLink | Inserted `#cpftInteractionLinks` | **Native now**: `a[href$="/quotes"]` "View quotes" is under the focal post. Counts, if wanted, are at Relay `client:<TweetId>:counts.quote_count` | High |
| restoreOtherInteractionLinks | Same | Native links are gone except quotes. Build them from Relay `counts` and link to `/retweets` and `/likes` (the engagement routes exist) | Medium |
| hideViewActivityLinks | `.ViewActivity`, `menuRole a[href$="/quotes"]` | Menu item `[role=menuitem]:has(svg[data-icon="icon-feather-scatter-plot"])`. On your own focal post, the upsell card `div.bg-secondary:has(> div > a[href="/i/account_analytics"])` | High |
| hideViews (focused post) | `.Views` | `li:has(.text-lead) a[href$="/analytics"]` and its preceding `·` span | High |
| tweakQuoteTweetsPage | `body.QuoteTweets [data-testid=tweet] [aria-labelledby] > div:last-child` | On route `/$username/status/$id/_engagements/quotes`, hide `[id^="urt:search"] [data-slot="embedded-tweet-frame"][data-href$="/status/<id>"]` | High |
| hideProfileRetweets | Social-context check on profile timeline | **Native default**: reposts live under the `/reposts` tab, and the default "Posts" filter excludes them. If the user picks "All", identify reposts by social context (not inspected) | Medium |
| hideVerifiedNotificationsTab (Verified Followers tab) | `.VerifiedFollowersTab`, history.push rewrite | Hide `a[role=tab][href$="/verified_followers"]`. Rewrite `a[href$="/verified_followers"]` → `/followers` in the profile header and hover card (both now point there by default). Redirect route `/$username/_followers/verified_followers` with `router.navigate`/`history.replace` | High |
| hideNotificationLikes | icon path `M20.884…` | `li:has(svg[data-icon="icon-heart-fill"])` in `urt:notifications:*`, or Relay `TimelineNotification.icon == "heart_icon"`. Needs the virtualizer gap fix | High (detect) / Medium (gap) |
| hideNotificationRetweets | icon path `M4.75 3.79…` | Probably `icon-repost-fill` / `retweet_icon`. **Not observed** | Low |
| hideExplorePageContents | Hide the Explore timeline, `eventHero` | Route `/explore` and `/explore/tabs/$tabId`: hide `[id^="urt:generic:"]`; keep the search form | High |
| defaultToLatestSearch | Click the 2nd tab | On route `/search` with no `f` search param, `router.navigate({to:'/search', search: {...search, f:'live'}, replace:true})`, or rewrite search links | High |
| hideSuggestedContentSearch | `hideHeadings` in `observeTimeline` | Hide entries `relevanceprompt-*`. Other modules (people and so on) weren't seen for this query | Medium |
| addAddMutedWordMenuItem | Clone the `a[href$="/settings"]` item in the More dropdown | Clone `[role=menu] a[role=menuitem][href="/settings"]` and set `href="/settings/add_muted_keyword"` and the icon. Navigate with `router.navigate` / `history.push` and close the menu with Escape | High |
| fastBlock | Watch `[data-testid=block]` click, then click `confirmationSheetConfirm` | After a click on `[role=menuitem]:has(svg[data-icon="icon-block"])`, click the last button in `[role=dialog] [data-slot="xds-modal-footer-actions"]`. Or call the fiber's `onSelect()` with the confirmation skipped (untested) | Medium |
| One-click mute/block | Menu items via testid / mute icon path | Same icon hooks: `icon-sound-off` (match on the fiber props or the label "Mute @…" to tell it apart from "Mute this conversation") and `icon-block` | Medium |
| reducedInteractionMode | `[data-testid=tweet] [role=group]` | `article [role=group]:has(> [data-engagement-action])` | High |
| hideWhoToFollowEtc (profile, inline) | `aside[role=complementary]` in the profile column | Entries `who-to-follow-*` in any `urt:` timeline (profile, explore); needs the gap fix | High (detect) |
| hideSubscriptions (focal) | `[data-testid$="-subscribe"]` | `a[href$="/creator-subscriptions/subscribe"]` | High |
| hideGrokNav (post/hover card bits) | `followups_`, `PROFILE_SUMMARY` label | `button[aria-label="Explain this post"]`, `button[aria-label="Generate image"]`, the hover card button with text "Profile Summary", and `svg[data-icon^="icon-logo-grok"]` | Medium (labels are English) |
| hideTwitterBlueUpsells (focal analytics) | `.ViewActivity` and the Premium status upsell | `div.bg-secondary:has(a[href="/i/account_analytics"])` | High |
| disableHomeTimeline redirect | Click the nav link | On route `/home`, `router.navigate({to: '/' + redirect, replace: true})` | High |
| Page detection (`body.Tweet`, `.Profile`, `.Notifications`, `.Search`, `.QuoteTweets`, …) | `currentPath` regexes | `router.state.matches.at(-1).routeId`, re-read on `router.subscribe('onResolved')` or `history.subscribe` | High |
| Premium / Creator Studio / History / Calls pages | Path checks | Routes: `/i/premium_sign_up`, `/i/premium`, `/i/history/`, `/_full-width/i/calls`, `/_full-width/i/chat/`, `/i/account_analytics/`. Creator Studio is not in the route table (probably external or not loaded) | Medium |

## Not verified

- The repost-notification icon, and how a profile "All" filter marks reposts.
- Whether a hidden entry's 0 size survives the virtualizer remounting it.
- Calling the Block item's `onSelect()` directly.
- Likes tab on your own post's engagements; mobile widths (the header renders both `.sm:hidden` and `.hidden.sm:grid` variants side by side).
