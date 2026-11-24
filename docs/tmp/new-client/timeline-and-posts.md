# New X web client: timelines & post anatomy

Probed 2026-11-24 on x.com/home (For you + Following) in agent Helium, no
extension loaded. `html[data-app-version=85bccbebc7d381b85a0568ea1b4d9493ef135745]`.
Everything below was verified with `eval` against the live DOM unless marked
**unobserved**.

## The big picture

- React Native Web is gone. Tailwind classes + Base UI (`base-ui-*` ids,
  `data-base-ui-*` attrs) + an "xds" design system (`data-slot="xds-…"`).
- `data-testid` is essentially gone (only `premium-signup-tab`,
  `SearchBox_Search_Input` remain). None of Birdfeed's 193 testid selectors match.
- **New stable hooks** to build on instead:
  - `svg[data-icon="icon-…"]` on inline icons, and `svg use[href="#icon-…"]`
    for sprite icons (action bar, verified badges, "More" dots). Icon names are
    language-independent and replace the old `path[d=…]` matching.
  - `data-engagement-action="reply|retweet|like|bookmark|share|media"`.
  - `data-slot` (`xds-menu-trigger`, `xds-menu-item`, `xds-button`,
    `embedded-tweet-frame`, `xds-modal-surface`, `xds-context-menu-trigger`…).
  - `data-pinned-timeline="for-you|following"` on home tabs.
  - `data-post-avatar` on the avatar column of every post.
  - Timeline containers have ids like `urt:home:for-you`,
    `urt:home:following:ranked` (sidebar uses `urt:explore-sidebar:5`).
- **Data layer is Relay.** Every timeline row's React fiber carries the
  timeline entry (`entry_id`), and the Relay store exposes full tweet/user
  records (promoted metadata, retweet/quote targets, verification, follower
  counts). This is far more reliable than DOM sniffing — see "Reading data".

## Timeline container & rows

```
main
  div.flex.grow.flex-col
    header[data-page-header][data-top-chrome]          ← sticky top bar
      … div[role=tablist] > button[role=tab][data-pinned-timeline=…]
      button[aria-label="Manage timelines"]  (svg[data-icon=icon-plus])
    div[data-media-upload-dropzone]                     ← home composer (FORM > textarea[placeholder="What's happening?"])
    div
      section
        h2.sr-only
        div[role=status][data-top-chrome-follow]       ← "show new posts" pill slot (h-0, empty when nothing new)
        div.relative.overflow-hidden > div
          div[role=status][aria-label=Loading]          ← pull-to-refresh spinner
          div#urt:home:for-you                           ← timeline (id varies per timeline)
            ul[style="height: …px; position: relative"]
              li[data-index=N][style="position:absolute; transform: translateY(…)"]
                div                                      ← row wrapper (no attrs)
                  div[role=link][data-href="/user/status/id"][data-navigation-stop]   ← clickable post
                    a[aria-hidden][href=permalink]
                    article
```

Selector for timeline rows: `[id^="urt:"] > ul > li[data-index]`
(the last `li` without `data-index` is the loader/footer).

### Virtualization — important for hiding

- The list is virtualized (TanStack-style). `li`s mount/unmount as you scroll;
  they are **not recycled** (an `li` keeps its `data-index` and entry for its
  lifetime). DOM order of `li`s is not visual order — sort by `data-index`.
- A `childList` MutationObserver on the `ul` sees every new row. The `ul`
  element itself survives scrolling; it is replaced on tab switch.
- Rows are absolutely positioned and re-measured with a ResizeObserver:
  - `li { display:none }` or collapsing a row to **0px** leaves a **gap** — the
    virtualizer ignores 0 measurements and keeps the old offset.
  - Collapsing the row to **1px** (e.g. `li > div { height:1px; overflow:hidden; padding:0; border:0 }`)
    makes the virtualizer reflow the rows below. Verified: a 99px row set to
    1px moved the next row up 98px.
  - So **hide = collapse to 1px**, never `display:none`. This applies to every
    "hide timeline item" feature.
- `Ub` component above the list takes a `hiddenEntryIds` prop — X's own
  mechanism for dismissing entries. Possibly usable to hide natively, not tested.

### Entry types seen (via fiber `item.entry_id`)

| entry_id prefix | content `__typename` | what |
|---|---|---|
| `tweet-<id>` | TimelineTimelineItem / TimelineTweet | normal post, repost, quote |
| `promoted-tweet-<id>-<hash>` | TimelineTimelineItem / TimelineTweet | **ad** |
| `home-conversation-<id>` | TimelineTimelineModule | reply thread; **one `li` holds the whole thread** (multiple `article`s) |

Over ~90 For you rows: 67 tweet, 20 promoted (~23%), 1 conversation module.
Following (ranked) had the same mix plus reposts. **Unobserved**: who-to-follow,
inline prompts, "Today's News"/topic modules inside the home timeline — none
appeared in either tab during this session (they may still exist; expect
`TimelineTimelineModule` with entry ids like `who-to-follow-…`). Detect them by
entry_id / typename, not by heading text.

## Post anatomy (`article`)

```
article.flex.flex-col.gap-1
  [repost only] div.flex.items-center.gap-2 > span > svg[data-icon=icon-repost-fill] + "<Name> reposted"
  div.flex.gap-2
    div (avatar column)
      div[data-post-avatar] > a[href="/user"] > img[alt="@user"]
      [threads] connector divs: div.w-0.5.bg-(--x-border-normal)
    div (content column)
      header row:
        a[href="/user"] > div[dir=auto] "Display Name"
          span[role=button][aria-label="Verified account"] > svg > use[href="#icon-verified-…-color"]
          a[aria-label="<Org>"][href="/org"] > img     ← affiliate badge
        a[href="/user"] > span "@handle"
        a[id][data-base-ui-tooltip-trigger][href="/user/status/id"] "20h"   ← timestamp/permalink (no <time> element!)
           — on ads this is replaced by a[href="/user"].text-secondary "Ad"
        button[aria-label="Explain this post"][data-slot=xds-button] > svg[data-icon=icon-logo-grok]   ← absent on ads
        button[data-slot=xds-menu-trigger][aria-label="More"]  ("…" menu)
      div[dir=auto][lang=…]   ← post text
        a[href="https://t.co/…"][title="<expanded url>"]  ← inline links keep the expanded URL in title
        div[role=link][data-slot=embedded-tweet-frame][data-href=…] > article   ← quoted post
      media / card
      div[role=group][aria-label="55 replies, 41 reposts, 2906 likes, 1368 bookmarks[, N views]"]
        div[data-engagement-action=reply]   > a|button[aria-label="55 Replies. Reply"]   (use #icon-reply)
        div[data-engagement-action=retweet] > button[data-slot=xds-menu-trigger][aria-label="41 reposts. Repost"] (#icon-repost)
        div[data-engagement-action=like]    > button[aria-label="2906 Likes. Like"]   (#icon-heart)
        a[aria-label="View count"][href$="/analytics"]   (#icon-bar-chart)
        span[data-engagement-action=bookmark] > button[aria-label=Bookmark]   (#icon-bookmark)
        button[data-engagement-action=share][aria-label=Share]   (#icon-share-ios)
      counts: span[dir=ltr] inside the action buttons ("2.9K")
```

Notes:
- Quoted posts are a nested `article` inside `[data-slot=embedded-tweet-frame]`.
  The old "visually-hidden 'Quote' text" heuristic is gone.
- Replies inside `home-conversation` modules: separate `div[role=link][data-href]`
  per post, all inside one `li`; avatar column has connector line divs.
- Translated posts show "Translated from X / Show original" with `icon-settings`.
- **No `<time>` element** anywhere in posts.

### Verified badges

Sprite `<use href>` inside `span[aria-label="Verified account"] > svg`:

| `use[href]` | meaning |
|---|---|
| `#icon-verified-premium-color` | blue (Premium) |
| `#icon-verified-business-color` | gold (business) |
| `#icon-verified-government-color` | grey (government) — symbol exists, not seen in a post |

The `aria-label` is "Verified account" for all; distinguish by the `use` href.
For blue-check logic needing follower counts / legacy verification, read the
user record from Relay (`verification.is_blue_verified`, `verification.verified_type`,
`relationship_counts.followers`, `relationship_perspectives.following`).
The old `getVerifiedProps` (React props walk, "broken 6 times") has no equivalent.

### Media

- Images: `a[aria-label=Image][data-engagement-action=media][href="/user/status/id/…"] > img`.
- Multiple photos are now a **horizontal carousel** (`.group/carousel`, scroll
  container `div[data-scroll-fade]`, buttons `aria-label="Previous media"/"Next media"`
  with `icon-chevron-left-md`/`icon-chevron-right-md`). Each slide has inline
  `aspect-ratio`. The photo-grid feature must target this structure.
- Video: `video` + `button[aria-label=Play]` (`icon-player-play`), wrapped in
  `div[data-press-control]` / `[data-slot=xds-context-menu-trigger]`.

### Link cards

```
div > div
  a[href=t.co|advertiser url][target=_blank] > div[style=aspect-ratio] > img  + div "Headline"
  a[href=same] > div "From domain.com"
```
Cards already show the headline and "From domain" — `restoreLinkHeadlines`
may be unnecessary now. Card `href`s are bare `t.co` with **no title**; the
expanded URL is only in Relay (fiber props of the card show `vanity=cnbc.com`,
`url=https://t.co/…`). Inline text links keep `title="<expanded>"`, so
`unwrapTcoLinks` can still use `title` for those.

### Polls

**Unobserved** (none appeared). Composer has `icon-poll`, so expect a
`data-icon` hook in rendered polls too.

## Reading data (recommended primary mechanism)

Script must run in the page world (as script.js already does).

1. Row → entry: `li[__reactFiber$…].return.memoizedProps.item`
   - `item.entry_id` → `promoted-tweet-…` = ad, `home-conversation-…` = module, etc.
   - `item.__id` → Relay record id.
2. Relay store: walk any fiber up until `memoizedProps.environment.getStore`
   exists (found ~300 levels up from an article), then
   `source = environment.getStore().getSource()`; `source.get(id)` returns
   records with `{__ref}` / `{__refs}` links.
3. Useful record paths (verified on a repost):
   - `TimelineTimelineItem.content` (TimelineTweet): `display_type`,
     **`promoted_metadata`** (non-null on ads), `social_context`,
     `tweet_results.result` → Tweet
   - `Tweet.legacy.retweeted_status_results` → repost target (null otherwise)
   - `Tweet.quoted_tweet_results` → quote target (null otherwise; tombstones
     here mean "unavailable quote" — **unobserved**, expect a `TweetTombstone`/
     `TweetUnavailable` typename)
   - `Tweet.core.user_results.result` → User (`core.screen_name`, `core.name`,
     `verification.{is_blue_verified,verified_type}`,
     `relationship_counts.followers`, `relationship_perspectives.{following,muting,blocking}`,
     `identity_profile_labels_highlighted_label` for affiliate badges)
   - `Tweet.grok_analysis_button` (bool) — drives the "Explain this post" button
   - `Tweet.details.full_text`, `Tweet.legacy.entities` (expanded URLs)
   - `client_event_info.details.timelines_details.injection_type`
     (e.g. `RankedFollowing`) — tells why a post was injected.
4. Article-level fibers also expose `tweet` props with `__fragments` keys like
   `retweet_tweet`, `blockedAuthorGate_*`, `scribeItemPromotion_advertiser`.

## Menus

All menus portal to `body > div[data-base-ui-portal] > div.z-50[data-open] > div[role=menu][data-slot=xds-menu-content]`.
Items are `[role=menuitem][data-slot=xds-menu-item]` with an icon
`svg[data-icon]` (or sprite `use`). Escape closes them.

**Post "More" menu** (organic post, icons are the reliable key):

| item | icon |
|---|---|
| Not interested in this post | `icon-emoji-sad` |
| Unfollow @x | `icon-person-remove` |
| Add/remove from Lists | `icon-lists` |
| **Mute @x** | `icon-sound-off` (first one) |
| Mute this conversation | `icon-sound-off` (second one — same icon!) |
| **Block @x** | `icon-block` |
| View post activity | `icon-feather-scatter-plot` |
| Embed post | `icon-code` |
| Report post / Report EU illegal content | `icon-flag` |
| Request Community Note | `icon-megaphone` |

Mute-user vs mute-conversation share `icon-sound-off`; tell them apart by
position (user first) or by the item text containing `@`.

**Repost menu**: Repost (`#icon-repost`), Quote (`icon-edit-line`).
**Share menu**: Send via Chat (`icon-chat`), Copy link (`icon-link`),
Share post via… (`#icon-share-ios`), Post photo (`icon-edit-plus`).

## Home header

- Tabs: `[role=tablist] > button[role=tab][data-pinned-timeline=for-you|following]`,
  selected tab has `aria-selected=true` and `data-active`. Tablist is
  draggable (`cursor-grab`, edge-fade). Custom pinned timelines would appear as
  more tabs — **unobserved** (account has none pinned).
- **Following tab = sort menu**: clicking the active Following tab opens a menu
  of `menuitemradio`: Recent / Popular (`aria-checked`, `icon-checkmark`).
  Timeline id reflects it: `urt:home:following:ranked` for Popular (Recent's id
  not verified to avoid changing the account setting; likely `…:following` or
  `…:following:chronological`).
- `button[aria-label="Manage timelines"]` (+) opens a dialog
  `[role=dialog][data-slot=xds-modal-surface]`: Pinned / Topics / Lists / Communities.
- Composer: `main [data-media-upload-dropzone]:has(textarea)` directly after the
  page `header`; toolbar buttons by aria-label (Add media, Add GIF, Generate
  image (`icon-logo-grok`), Add emoji, Add poll, Schedule post, Who can reply…).
- New-posts pill slot: `section > div[role=status][data-top-chrome-follow]`
  (zero-height sticky; its children are the pill when present — pill content
  **unobserved**).

## Setting → selector map

Confidence: H = verified live, M = verified structure but edge cases unobserved,
L = inferred.

| Setting | Old selector / approach | New selector / approach | Conf |
|---|---|---|---|
| Hide ads (promoted) | `[data-testid=placementTracking]` | JS: `item.entry_id.startsWith('promoted-')` or Relay `content.promoted_metadata != null`. CSS-only fallback (no flash): `[id^="urt:"] > ul > li:has(article):not(:has(article a[data-base-ui-tooltip-trigger][href*="/status/"]:not([data-slot="embedded-tweet-frame"] *)))` — 0 false +/− over ~16 ads. Collapse to 1px. | H |
| Promoted trends | `[data-testid=trend]:has(path[d=PROMOTED_PATH])` | sidebar area, not covered here | – |
| retweets / listRetweets | `[data-testid=socialContext]` + svg path | `article > div:first-child svg[data-icon=icon-repost-fill]`, or Relay `legacy.retweeted_status_results` | H |
| quoteTweets / mutableQuoteTweets | hidden "Quote" text | `[data-slot=embedded-tweet-frame]` inside outer article, or Relay `quoted_tweet_results`; quoter handle = outer header `a[href^="/"] > span` (or Relay user `core.screen_name`) | H |
| hideUnavailableQuoteTweets | nested `article` w/o tweet | Relay `quoted_tweet_results.result.__typename` (tombstone) | L |
| Community / pinned post types | svg path prefix in socialContext | social-context row icon `data-icon` (names unobserved on home) | L |
| isReplyToPreviousTweet (hide replies with parent) | sibling cell heuristics | conversation = single `li` (`home-conversation-…`); hide the whole `li` | H |
| hideForYouTimeline / alwaysUseLatestTweets | tab index | `button[role=tab][data-pinned-timeline=for-you]`; select via `[data-pinned-timeline=following]`.click() | H |
| sortFollowing (popular/recent) | — | click active Following tab → `[role=menuitemradio]` Recent/Popular | M |
| Separated tweets / custom tabs | injected tab into RNW tablist | Base UI tablist; injection must coexist with React (tab buttons are React-owned) | L |
| hideSeeNewTweets | `primaryColumn > div > div:first-child > div[style^=transform]` | `section > [role=status][data-top-chrome-follow]` | M |
| hideTimelineTweetBox | `.TweetBox` class added by script | `main > div > header + [data-media-upload-dropzone]` (home only) | H |
| hideMetrics | various count spans | `[data-engagement-action] span[dir=ltr]`; group `aria-label` also contains counts | H |
| hideViews | `.Views` / analytics link | `a[href$="/analytics"]` (`aria-label="View count"`, `use[href="#icon-bar-chart"]`) | H |
| hideBookmarkButton | `button[data-testid$=ookmark]` | `[data-engagement-action=bookmark]` | H |
| hideShareTweetButton | `[role=group] > div[style]` | `[data-engagement-action=share]` | H |
| reducedInteractionMode | `[data-testid=tweet] [role=group]` | `article [role=group]` (exclude nested quote: quotes have no action bar) | H |
| Grok "Explain this post" buttons | — | `button:has(svg[data-icon=icon-logo-grok])` in post header (`aria-label="Explain this post"`) | H |
| hideGrokTweets | `a[href^="/i/grok/share/"]` | probably unchanged; Relay `grok_share_attachment` non-null | L |
| twitterBlueChecks / verified | `svg[data-testid=icon-verified]` + React props | `span[aria-label="Verified account"] use[href^="#icon-verified-"]`; data from Relay user `verification` + `relationship_counts.followers` | H (DOM) / H (data) |
| showBlueReplyFollowersCount | React props followersCount | Relay `relationship_counts.followers` | H |
| Affiliate badge | — | `a[aria-label] > img` beside name | H |
| Photo grid | `[data-testid=tweetPhoto]` / ScrollSnap | carousel `.group/carousel` → `div[data-scroll-fade]` > slides with `a[data-engagement-action=media]` | H |
| unwrapTcoLinks | `a[href^="https://t.co"]` + title | inline: `title` still holds expanded URL (H); cards: no title, needs Relay `legacy.entities`/card data (M) | H/M |
| restoreLinkHeadlines | `[data-testid=card]` | cards now show headline + "From domain" natively; likely retire | M |
| One-click mute/block | `MUTE_MENU_ITEM` path / `[data-testid=block]` | `[role=menuitem]:has(svg[data-icon=icon-sound-off])` (first) / `:has(svg[data-icon=icon-block])`; confirm dialog **unobserved** | M |
| Quote menu item / hide quotes | `[data-testid=…]` | repost menu: `[role=menuitem]:has([data-icon=icon-edit-line])` | H |
| restoreQuoteTweetsLink / interaction links | focused-tweet DOM + React tweetInfo | not on home; Relay `counts` record has quote/retweet counts | L |
| hideWhoToFollowEtc / hideInlinePrompts / hideMoreTweets | `inlinePrompt` testid, `h2[role=heading]` headings | **unobserved on home**; detect by `entry_id` prefix / `TimelineTimelineModule` typename | L |
| Menus generally | `[data-testid=Dropdown]` / `sheetDialog` | `[role=menu][data-slot=xds-menu-content]` in `[data-base-ui-portal]` | H |

## Not covered / follow-ups

- Polls, who-to-follow, inline prompts, unavailable quotes, pinned/community
  social contexts, the new-posts pill contents, Recent-sort timeline id, and
  custom pinned tabs were not observed in this session.
- Mobile layout (`sm:` breakpoints) not probed — the `sm:hidden` account
  button in the header suggests a single responsive app rather than a separate
  mobile tree; the old `#layers + div` flexDirection mobile/desktop detection
  needs a new signal.
